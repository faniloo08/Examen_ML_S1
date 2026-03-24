import pandas as pd
from collections import Counter, defaultdict
import re
import pickle

# 1. Charger et extraire tous les mots (comme avant)
df = pd.read_csv('Datasetvrai.csv')
word_columns = ['data', 'data2', 'data3', 'data4', 'data5']

all_words = []
for col in word_columns:
    words = df[col].dropna().astype(str).str.strip()
    words = words[(words != '') & (words != '-') & (~words.str.startswith('-'))]
    all_words.extend(words.tolist())


def clean_word(w):
    return re.sub(r'\s+', ' ', str(w).strip().lower())


vocabulary = [clean_word(w) for w in all_words if len(clean_word(w)) > 1]
vocabulary = list(dict.fromkeys(vocabulary))  # unique

word_freq = Counter(vocabulary)

print(f"Vocabulaire extrait : {len(vocabulary)} mots")

# Sauvegarde du vocabulaire
vocab_df = pd.DataFrame({'mot': vocabulary, 'frequence': [word_freq[w] for w in vocabulary]})
vocab_df.to_csv('malagasy_vocab.csv', index=False)

# 2. Entraînement du modèle bigram (mot suivant)
bigram_model = defaultdict(Counter)

for idx, row in df.iterrows():
    words_in_row = []
    for col in word_columns:
        w = clean_word(row[col])
        if len(w) > 1:
            words_in_row.append(w)

    for i in range(len(words_in_row) - 1):
        w1 = words_in_row[i]
        w2 = words_in_row[i + 1]
        bigram_model[w1][w2] += 1

# Sauvegarde du modèle n-gram
with open('malagasy_bigram_model.pkl', 'wb') as f:
    pickle.dump(dict(bigram_model), f)

print("Modèle bigram entraîné et sauvegardé !")