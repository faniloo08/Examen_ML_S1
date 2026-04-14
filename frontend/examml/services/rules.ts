export interface LinguisticRuleError {
  id: string;
  word: string;
  issue: string;
  description: string;
  suggestion?: string;
}

export const checkLinguisticRules = (text: string): LinguisticRuleError[] => {
  const errors: LinguisticRuleError[] = [];
  if (!text) return errors;

  const words = text.split(/[\s,.;!?()]+/);

  const FORBIDDEN_LETTERS = ['c', 'w', 'x', 'u'];
  const FORBIDDEN_PATTERNS = ['nb', 'mk', 'dt', 'bp', 'sz'];

  let idCounter = 1;

  words.forEach((word) => {
    if (!word) return;
    
    const lowerWord = word.toLowerCase();

    // Check forbidden letters
    for (const letter of FORBIDDEN_LETTERS) {
      if (lowerWord.includes(letter)) {
        // Exception classique en malgache pour les mots empruntés ou noms propres s'ils existent (simplifié ici)
        errors.push({
          id: `rule_letter_${idCounter++}`,
          word,
          issue: `Lettre interdite "${letter}"`,
          description: `La lettre "${letter}" n'existe pas dans l'alphabet malagasy classique.`,
        });
      }
    }

    // Check forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (lowerWord.includes(pattern)) {
         let suggestion = "";
         if (pattern === "nb") suggestion = "mb";
         
         errors.push({
          id: `rule_pattern_${idCounter++}`,
          word,
          issue: `Combinaison interdite "${pattern}"`,
          description: `La combinaison "${pattern}" est interdite en malgache.${suggestion ? ` Utilisez plutôt "${suggestion}".` : ''}`,
          suggestion
        });
      }
    }
  });

  return errors;
};
