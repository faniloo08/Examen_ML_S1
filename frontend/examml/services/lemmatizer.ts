import fs from 'fs';
import path from 'path';
import { callLLM } from './llm';

// Cached data
let dictionary: Map<string, { root: string; prefix: string; suffix: string }> | null = null;

// Paths to the dataset
const getDataPath = (filename: string) => {
  // En local, process.cwd() est généralement le dossier 'examml'
  // Les données sont stockées dans ../../data
  const devPath = path.join(process.cwd(), '../../data', filename);
  const prodPath = path.join(process.cwd(), 'data', filename);
  
  if (fs.existsSync(prodPath)) return prodPath;
  return devPath;
};

// Lazy loading to not block the server at startup
function loadDictionary() {
  if (dictionary) return dictionary;
  
  dictionary = new Map();
  try {
    const datasetPath = getDataPath('Datasetvrai.csv');
    if (!fs.existsSync(datasetPath)) {
      console.warn("Datasetvrai.csv introuvable à", datasetPath);
      return dictionary;
    }

    const content = fs.readFileSync(datasetPath, 'utf8');
    const lines = content.split('\n');

    // On skip l'en-tête (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Split with some basic handling of quotes if needed, 
        // normally doing a simple split for the first 3 columns is sufficient.
        const cols = line.split(',');
        if (cols.length >= 3) {
            const word = cols[0].trim();
            const root = cols[2].trim();
            // Prefix et Suffix (à améliorer via d'autres approches si c'est absent)
            const prefixRegex = new RegExp(`^(.*)${root}`);
            const match = word.match(prefixRegex);
            
            let prefix = "";
            let suffix = "";
            
            if (word.includes(root) && root.length > 0) {
               const parts = word.split(root);
               prefix = parts[0] || "";
               suffix = parts.slice(1).join(root) || "";
            }

            if (word && root) {
                // On met en minuscule pour des recherches case-insensitive
                dictionary.set(word.toLowerCase(), { root, prefix, suffix });
            }
        }
    }
    console.log(`Dictionnaire chargé avec ${dictionary.size} entrées.`);
  } catch (error) {
    console.error("Erreur lors du chargement du dictionnaire:", error);
  }
  
  return dictionary;
}

export async function getLemmatization(word: string) {
  const dict = loadDictionary();
  const lowerWord = word.toLowerCase();

  if (dict.has(lowerWord)) {
    return {
       word,
       source: 'csv',
       ...dict.get(lowerWord)
    };
  }

  // Fallback to LLM if not found
  try {
    const prompt = `Lemmatisation malgache: trouve la racine, le préfixe et le suffixe du mot "${word}". 
    Réponds uniquement sous format JSON strict avec les clés: root, prefix, suffix. Par exemple: {"root": "ome", "prefix": "fan-", "suffix": "-zana"}`;
    
    const response = await callLLM(prompt);
    
    // Parse json
    try {
        // Extraction au cas où le LLM ajoute du texte autour
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                word,
                source: 'llm',
                root: result.root || word,
                prefix: result.prefix || "",
                suffix: result.suffix || ""
            };
        }
    } catch (e) {
        console.error("Failed to parse LLM JSON", response);
    }
  } catch (e) {
     console.error("LLM Fallback failed", e);
  }

  return {
      word,
      source: 'unknown',
      root: word,
      prefix: "",
      suffix: ""
  };
}
