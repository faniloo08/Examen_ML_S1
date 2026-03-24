from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import pandas as pd
import pickle
import re
from collections import Counter
from difflib import get_close_matches
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="NLP Malgache Auto-completion & Correction",
    description="API pour suggestions et correction orthographique en malgache",
    version="1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins= {'*'}, #adresse du frontend
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

# ====================== CHARGEMENT DES MODÈLES ======================
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.freq = 0
        self.word = ""

class MalagasyTrie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str, freq: int = 1):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True
        node.freq = max(node.freq, freq)
        node.word = word

    def search_prefix(self, prefix: str, top_k: int = 10):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        results = []
        self._collect(node, results, prefix)
        results.sort(key=lambda x: (-x[1], x[0]))
        return [(w, f) for w, f in results[:top_k]]

    def _collect(self, node, results, current):
        if node.is_end:
            results.append((node.word, node.freq))
        for ch, child in node.children.items():
            self._collect(child, results, current + ch)


def load_models():
    df = pd.read_csv('malagasy_vocab.csv')
    trie = MalagasyTrie()
    word_freq = Counter()

    for _, row in df.iterrows():
        w = str(row['mot']).strip().lower()
        f = int(row.get('frequence', 1))
        if len(w) > 1:
            trie.insert(w, f)
            word_freq[w] = f

    with open('malagasy_bigram_model.pkl', 'rb') as f:
        bigram_model = pickle.load(f)

    vocabulary = set(word_freq.keys())

    print(f"✅ Modèles chargés : {len(vocabulary)} mots malgaches")
    return trie, bigram_model, word_freq, vocabulary


trie, bigram_model, word_freq, vocabulary = load_models()


# ====================== MODÈLES PYDANTIC ======================
class SuggestionRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Le préfixe ou mot à compléter")
    previous: Optional[str] = Field("", description="Mot précédent pour contexte (bigram)")
    top_k: int = Field(8, ge=1, le=20)


class CorrectionRequest(BaseModel):
    word: str = Field(..., min_length=1)


class SuggestionResponse(BaseModel):
    query: str
    suggestions: List[dict]   # [{"word": "...", "score": 0.95}, ...]


class CorrectionResponse(BaseModel):
    query: str
    corrections: List[dict]


# ====================== ENDPOINTS ======================
@app.post("/suggest", response_model=SuggestionResponse)
async def suggest(request: SuggestionRequest):
    query = request.query.strip().lower()
    previous = (request.previous or "").strip().lower()

    # Suggestions par préfixe (Trie)
    prefix_sugs = trie.search_prefix(query, top_k=request.top_k * 2)

    # Suggestions contextuelles (Bigram)
    context_sugs = []
    if previous and previous in bigram_model:
        counter = bigram_model[previous]
        total = sum(counter.values())
        context_sugs = [(w, count / total) for w, count in counter.most_common(request.top_k)]

    # Fusion et calcul du score
    combined = {}
    max_freq = max(word_freq.values()) if word_freq else 1

    for word, freq in prefix_sugs:
        score = 0.65 + (freq / max_freq * 0.35)
        combined[word] = max(combined.get(word, 0), score)

    for word, prob in context_sugs:
        combined[word] = max(combined.get(word, 0), 0.6 + prob * 0.4)

    # Tri final
    sorted_sugs = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:request.top_k]

    suggestions = [{"word": word, "score": round(score, 3)} for word, score in sorted_sugs]

    return {"query": query, "suggestions": suggestions}


@app.post("/correct", response_model=CorrectionResponse)
async def correct(request: CorrectionRequest):
    word = request.word.strip().lower()

    if word in vocabulary:
        return {"query": word, "corrections": [{"word": word, "score": 1.0}]}

    # Correction avec difflib
    candidates = get_close_matches(word, vocabulary, n=10, cutoff=0.7)
    candidates.sort(key=lambda w: word_freq.get(w, 0), reverse=True)

    corrections = []
    max_freq = max(word_freq.values()) if word_freq else 1
    for w in candidates[:8]:
        score = round(word_freq.get(w, 1) / max_freq, 3)
        corrections.append({"word": w, "score": score})

    return {"query": word, "corrections": corrections}


# Endpoint de test
@app.get("/")
async def root():
    return {
        "message": "API NLP Malgache prête !",
        "endpoints": ["/suggest", "/correct"],
        "example": {
            "suggest": {"query": "ma", "previous": "te"},
            "correct": {"word": "manaoa"}
        }
    }


# ====================== LANCEMENT ======================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)