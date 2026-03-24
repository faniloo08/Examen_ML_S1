/**
 * Service de communication avec le Backend NLP Malgache (FastAPI / Render)
 */

const BASE_URL = "https://fastapi-for-malagasyeditor-2.onrender.com";

export interface AutocompleteResponse {
  query: string;
  suggestions: {
    word: string;
    score: number;
  }[];
}

export interface CorrectionAnomaly {
  id: string;
  original: string;    // Le mot erroné
  suggestion: string;  // La proposition du modèle ML
  context: string;     // La phrase avec le contexte
  type: "spell" | "grammar"; 
  confidence: number;
}

export interface SpellCheckResponse {
  text: string;
  corrections: CorrectionAnomaly[];
}

export const mlAPI = {
  
  /**
   * 1. Service d'autocomplétion
   * Appelle l'endpoint /suggest avec le fragment actuel et le mot précédent
   */
  async getAutocomplete(query: string, previous: string = ""): Promise<AutocompleteResponse> {
    try {
      const response = await fetch(`${BASE_URL}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, previous })
      });

      if (!response.ok) throw new Error("Erreur Backend Suggest");
      
      const data = await response.json();
      
      // Adaptation du format de réponse de l'API vers notre interface Frontend
      // Si l'API renvoie directement une liste de mots
      if (Array.isArray(data.suggestions)) {
        return {
          query,
          suggestions: data.suggestions.map((s: any) => ({
            word: typeof s === 'string' ? s : s.word,
            score: s.score || 1.0
          }))
        };
      }

      // Fallback si l'API renvoie un objet différent
      return {
        query,
        suggestions: data.result ? [{ word: data.result, score: 1.0 }] : []
      };
    } catch (e) {
      console.error("Autocomplete API Error:", e);
      return { query, suggestions: [] };
    }
  },

  /**
   * 2. Service de correction
   * Analyse le texte et identifie les erreurs via l'endpoint /correct (mot par mot pour le MVP)
   */
  async checkText(text: string): Promise<SpellCheckResponse> {
    const anomalies: CorrectionAnomaly[] = [];
    const words = text.split(/[\s,.;!?]+/);
    
    // Pour le MVP, on vérifie les mots de 2 lettres ou plus
    const targetWords = words.filter(w => w.length >= 2).slice(0, 40);

    try {
      console.log(`ML-API: Checking ${targetWords.length} words for corrections...`);
      
      const promises = targetWords.map(async (word, index) => {
        try {
          console.log(`ML-API: [DEBUG] Requesting /correct for word: "${word}"`);
          const res = await fetch(`${BASE_URL}/correct`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word })
          });
          
          if (!res.ok) {
            console.error(`ML-API: [ERROR] /correct failed for "${word}" - Status: ${res.status}`);
            return null;
          }

          const data = await res.json();
          console.log(`ML-API: [DATA] Response for "${word}":`, data);
          
          const suggested = data.correction || data.result;

          if (suggested && suggested.toLowerCase() !== word.toLowerCase()) {
            console.log(`ML-API: [HIT] Error detected: "${word}" -> "${suggested}"`);
            return {
              id: `err_${Date.now()}_${index}`,
              original: word,
              suggestion: suggested,
              context: `... ${word} ...`,
              type: "spell" as const,
              confidence: data.confidence || 0.9
            };
          }
        } catch (e) {
          console.error(`ML-API: [FATAL] Fetch error for word "${word}":`, e);
          return null;
        }
        return null;
      });

      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res) anomalies.push(res);
      });

      console.log(`ML-API: Found ${anomalies.length} potential corrections.`);
    } catch (e) {
      console.error("Correction API Global Error:", e);
    }

    return {
      text,
      corrections: anomalies,
    };
  }
};
