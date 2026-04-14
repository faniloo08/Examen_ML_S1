export type SentimentResult = 'Positif' | 'Négatif' | 'Neutre';

// Mini dictionnaire basique
const POSITIVE_WORDS = [
  "tsara", "matsiro", "kanto", "manga", "soa", "mety", "mahay", "finaritra", "mahagaga", "mahafaly", "mahafinaritra", "tiana", "fitiavana", "faly", "sambatra"
];

const NEGATIVE_WORDS = [
  "ratsy", "mahamenatra", "loza", "kilema", "zava-doza", "kamo", "adaladala", "adala", "vendrana", "fopla", "marary", "sahirana", "sosotra", "malahelo", "ory", "fahafatesana"
];

export const analyzeSentiment = (text: string): { sentiment: SentimentResult, score: number } => {
  if (!text.trim()) return { sentiment: 'Neutre', score: 0 };
  
  const words = text.toLowerCase().split(/[\s,.;!?()]+/);
  let score = 0;

  words.forEach((word) => {
    if (POSITIVE_WORDS.includes(word)) score += 1;
    if (NEGATIVE_WORDS.includes(word)) score -= 1;
  });

  let sentiment: SentimentResult = 'Neutre';
  if (score > 0) sentiment = 'Positif';
  else if (score < 0) sentiment = 'Négatif';

  return { sentiment, score };
};
