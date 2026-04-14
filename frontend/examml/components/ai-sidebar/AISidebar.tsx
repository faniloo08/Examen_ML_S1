"use client";

import { useState } from "react";
import { Sparkles, Languages, CheckCircle, MessageSquare, GraduationCap, X } from "lucide-react";
import { AIWidgetCard } from "./AIWidgetCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mlAPI, type CorrectionAnomaly } from "@/services/ml-api";
import { checkLinguisticRules, type LinguisticRuleError } from "@/services/rules";
import { analyzeSentiment, type SentimentResult } from "@/services/sentiment";
import { type Editor } from "@tiptap/react";
import { HeartPulse } from "lucide-react";

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export function AISidebar({ isOpen, onClose, editor }: AISidebarProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [anomalies, setAnomalies] = useState<CorrectionAnomaly[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Manao ahoana ! Azoko hanampiana anao ve ?" }
  ]);

  // Lemmatization States
  const [lemmaWord, setLemmaWord] = useState("");
  const [isLemmatizing, setIsLemmatizing] = useState(false);
  const [lemmaResult, setLemmaResult] = useState<{root: string, prefix: string, suffix: string, source: string} | null>(null);

  // Rule States
  const [ruleErrors, setRuleErrors] = useState<LinguisticRuleError[]>([]);
  const [isCheckingRules, setIsCheckingRules] = useState(false);

  // Sentiment State
  const [sentiment, setSentiment] = useState<{result: SentimentResult, score: number} | null>(null);

  const handleAnalysis = async () => {
    if (!editor) return toast.error("Éditeur non initialisé");
    setIsAnalyzing(true);
    toast.info("Analyse du texte avec le modèle ML...");
    
    try {
      const text = editor.getText();
      if (!text.trim()) {
        toast.warning("Le document est vide.");
        return;
      }
      const result = await mlAPI.checkText(text);
      setAnomalies(result.corrections);
      if (result.corrections.length > 0) {
        toast.warning(`${result.corrections.length} correction(s) suggérée(s)`);
      } else {
        toast.success("Aucune faute détectée !");
      }
    } catch (e) {
      toast.error("Erreur serveur lors de l'analyse ML");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyCorrection = (anomaly: CorrectionAnomaly) => {
    if (!editor) return;
    // Approche simplifiée pour le MVP : on remplace la première occurrence avec une balise Tailwind colorée
    const oldHtml = editor.getHTML();
    const highlightSpan = `<span class="bg-green-500/20 text-green-700 dark:text-green-400 rounded px-1 transition-colors" data-ml-corrected="true">${anomaly.suggestion}</span>`;
    
    // Fallback simple search & replace
    const newHtml = oldHtml.replace(anomaly.original, highlightSpan);
    if (newHtml !== oldHtml) {
      editor.commands.setContent(newHtml);
      setAnomalies((prev) => prev.filter((a) => a.id !== anomaly.id));
      toast.success("Correction appliquée");
    } else {
      toast.error("Impossible de cibler ce mot dans l'éditeur riche");
    }
  };

  const handleRuleCheck = () => {
    if (!editor) return;
    setIsCheckingRules(true);
    const text = editor.getText();
    const errors = checkLinguisticRules(text);
    setRuleErrors(errors);
    setIsCheckingRules(false);
    
    if (errors.length > 0) {
      toast.warning(`${errors.length} erreur(s) linguistique(s) listée(s)`);
    } else {
      toast.success("Aucune faute de lettre ou syllabe !");
    }
  };

  const handleSentimentCheck = () => {
    if (!editor) return;
    const text = editor.getText();
    const result = analyzeSentiment(text);
    setSentiment({ result: result.sentiment, score: result.score });
    toast.success("Analyse de sentiment terminée");
  };

  const handleLemmatize = async () => {
    if (!lemmaWord.trim()) return;
    setIsLemmatizing(true);
    try {
      const res = await fetch("/api/lemmatize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: lemmaWord })
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setLemmaResult(data);
      if (data.source === 'llm') {
        toast.info("Lemmatisation générée par l'IA");
      }
    } catch (e) {
      toast.error("Erreur de lemmatisation");
    } finally {
      setIsLemmatizing(false);
    }
  };

  const [isChatting, setIsChatting] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isChatting) return;

    const newMessage = { role: "user", content: chatMessage.trim() };
    const updatedHistory = [...chatHistory, newMessage];
    
    setChatHistory(updatedHistory);
    setChatMessage("");
    setIsChatting(true);
    
    try {
      const res = await fetch("/api/chat", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ messages: updatedHistory })
      });
      
      if (!res.ok) throw new Error("Erreur chat");
      
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch (e) {
       toast.error("Le chatbot est indisponible pour le moment.");
    } finally {
       setIsChatting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 lg:w-96 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-[calc(100vh-4rem)] sticky top-16 right-0 overflow-hidden transform transition-all duration-300">
      
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Sparkles size={20} />
          <h2 className="font-bold text-lg text-neutral-900 dark:text-white">Assistant IA</h2>
        </div>
        <button onClick={onClose} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Spell Check Widget */}
        <AIWidgetCard 
          title="Correction du texte" 
          icon={<CheckCircle size={18} />}
          actionButton={
            <button 
              onClick={handleAnalysis}
              disabled={isAnalyzing}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow-sm disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? "..." : "Analyser"}
            </button>
          }
        >
          {isAnalyzing ? (
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-sm text-neutral-500 italic text-center py-2">
              Cliquez sur Analyser pour vérifier le texte actuel avec notre modèle ML.
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((item) => (
                <div key={item.id} className="bg-neutral-50 dark:bg-neutral-950 border border-red-200 dark:border-red-900/30 rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 italic">"{item.context}"</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 dark:text-red-400 font-medium line-through text-sm">{item.original}</span>
                      <span className="text-neutral-400 dark:text-neutral-500">→</span>
                      <span className="text-green-600 dark:text-green-400 font-medium text-sm">{item.suggestion}</span>
                    </div>
                    <button 
                      onClick={() => applyCorrection(item)}
                      className="text-xs bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 px-2 py-1 rounded text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AIWidgetCard>

        {/* Grammar / Linguistic Rules Widget */}
        <AIWidgetCard 
          title="Règles Linguistiques" 
          icon={<GraduationCap size={18} />} 
          defaultOpen={false}
          actionButton={
             <button 
               onClick={handleRuleCheck}
               className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow-sm disabled:opacity-50 transition-colors"
             >
               Vérifier
             </button>
          }
        >
          {ruleErrors.length === 0 ? (
             <div className="text-sm text-neutral-500 italic text-center py-2">
               Cliquez sur Vérifier pour chercher les lettres et associations invalides.
             </div>
          ) : (
            <div className="space-y-3">
              {ruleErrors.map((rule) => (
                <div key={rule.id} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider block mb-1">
                      {rule.issue}
                    </span>
                    <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-xs">
                      {rule.word}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">{rule.description}</p>
                </div>
              ))}
            </div>
          )}
        </AIWidgetCard>

        {/* Sentiment Analysis Widget */}
        <AIWidgetCard 
          title="Analyse de Sentiment" 
          icon={<HeartPulse size={18} />} 
          defaultOpen={false}
          actionButton={
             <button 
               onClick={handleSentimentCheck}
               className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow-sm transition-colors"
             >
               Analyser
             </button>
          }
        >
          {!sentiment ? (
             <div className="text-sm text-neutral-500 italic text-center py-2">
               Appuyez sur Analyser pour évaluer le ton global de votre document.
             </div>
          ) : (
             <div className="flex flex-col items-center gap-3 p-2 animate-in zoom-in-95 duration-200">
               <div className={cn(
                  "px-4 py-2 rounded-full font-bold text-lg border",
                  sentiment.result === 'Positif' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  sentiment.result === 'Négatif' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  'bg-neutral-800 text-neutral-300 border-neutral-700'
               )}>
                 {sentiment.result}
               </div>
               <div className="text-xs text-neutral-500">
                 Score de polarité : {sentiment.score}
               </div>
             </div>
          )}
        </AIWidgetCard>

        {/* Lemmatization Widget */}
        <AIWidgetCard title="Lemmatisation" icon={<Languages size={18} />} defaultOpen={false}>
           <div className="flex gap-2 mb-3">
             <input 
               type="text" 
               placeholder="Entrez un mot..." 
               className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" 
               value={lemmaWord}
               onChange={(e) => setLemmaWord(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleLemmatize()}
             />
             <button 
               onClick={handleLemmatize}
               disabled={isLemmatizing}
               className="bg-neutral-800 hover:bg-neutral-700 px-3 rounded text-sm font-medium transition-colors disabled:opacity-50"
             >
               {isLemmatizing ? "..." : "Chercher"}
             </button>
           </div>
           
           {lemmaResult && (
             <div className="bg-neutral-950 border border-neutral-800 rounded p-3 animate-in fade-in duration-200">
                <p className="text-xs text-neutral-500 mb-1 flex justify-between">
                   Racine identifiée :
                   {lemmaResult.source === 'llm' && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">IA</span>}
                </p>
                <p className="font-mono text-blue-400 font-medium tracking-wide">{lemmaResult.root || '-'}</p>
                <div className="mt-2 text-xs text-neutral-400 bg-neutral-900 p-2 rounded flex flex-col gap-1">
                   <div>Préfixe: <span className="text-emerald-400">{lemmaResult.prefix || 'aucun'}</span></div>
                   <div>Suffixe: <span className="text-emerald-400">{lemmaResult.suffix || 'aucun'}</span></div>
                </div>
             </div>
           )}
        </AIWidgetCard>
        
        {/* Chatbot Widget */}
        <AIWidgetCard title="Assistant Chatbot" icon={<MessageSquare size={18} />}>
          <div className="flex flex-col h-64 bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    msg.role === 'user' ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-200"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="border-t border-neutral-800 p-2 flex gap-2">
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Posez une question..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded flex items-center justify-center transition-colors">
                <MessageSquare size={14} />
              </button>
            </form>
          </div>
        </AIWidgetCard>

      </div>
    </aside>
  );
}
