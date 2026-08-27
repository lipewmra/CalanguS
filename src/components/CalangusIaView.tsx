import React from "react";
import { 
  Sparkles, 
  ExternalLink, 
  Bot, 
  BookOpen, 
  HelpCircle, 
  ShieldCheck, 
  Zap, 
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2
} from "lucide-react";

interface CalangusIaViewProps {
  notebookUrl?: string;
}

const NOTEBOOK_LM_URL = "https://notebook.google.com/notebook/c3e64642-72e2-4ced-9d2c-685fcb910084";

export default function CalangusIaView({ notebookUrl = NOTEBOOK_LM_URL }: CalangusIaViewProps) {
  const handleOpenNotebook = () => {
    window.open(notebookUrl, "_blank", "noopener,noreferrer");
  };

  const sampleQuestions = [
    {
      topic: "Procedimentos em Sala",
      question: "Qual o procedimento quando um candidato solicita ida ao banheiro durante a prova?",
      category: "Segurança & Fiscalização"
    },
    {
      topic: "Atendimento Especializado",
      question: "Quais são as regras para tempo adicional de 60 minutos e fiscal ledor?",
      category: "Acessibilidade"
    },
    {
      topic: "Ocorrências & Atas",
      question: "Como preencher o termo de eliminação e a ata da sala para envelope violado?",
      category: "Documentação Oficial"
    },
    {
      topic: "Materiais & Malotes",
      question: "Qual o protocolo de abertura e lacre dos malotes de prova e cartão-resposta?",
      category: "Logística CLA"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-950 border-2 border-indigo-500/30 p-6 sm:p-8 shadow-2xl text-white">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>CalangusIA • NotebookLM Integrado</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              Assistente de Inteligência Artificial do CLA
            </h2>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              Tire dúvidas instantâneas sobre editais, manuais do INEP/Cebraspe, procedimentos de sala, diretrizes de fiscalização e resolução de contingências em tempo real.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={handleOpenNotebook}
              className="btn-3d w-full md:w-auto px-6 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white rounded-2xl font-display font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-3 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <Bot className="w-5 h-5 text-amber-300" />
              <span>ACESSAR CHAT NOTEBOOKLM</span>
              <ExternalLink className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#101726] border-2 border-indigo-500/20 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-display font-black text-slate-850 dark:text-white text-base">
            Manuais Oficiais Sincronizados
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            O CalangusIA é treinado com a documentação oficial do ENEM, instruções normativas e guias operacionais de aplicação.
          </p>
        </div>

        <div className="bg-white dark:bg-[#101726] border-2 border-emerald-500/20 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-display font-black text-slate-850 dark:text-white text-base">
            Respostas Rápidas & Confiáveis
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Consulte diretrizes no dia do exame para tomar decisões com segurança e respaldo das normas vigentes.
          </p>
        </div>

        <div className="bg-white dark:bg-[#101726] border-2 border-amber-500/20 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-display font-black text-slate-850 dark:text-white text-base">
            Ambiente Google NotebookLM
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Ambiente de chat interativo direto com citações de fontes e notas estruturadas pelo Google AI.
          </p>
        </div>
      </div>

      {/* SAMPLE PROMPTS / QUESTIONS */}
      <div className="bg-slate-50 dark:bg-[#0c1220]/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <h3 className="font-display font-black text-slate-850 dark:text-white text-sm uppercase tracking-wider">
              Exemplos de Perguntas para o Chat
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">NotebookLM</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sampleQuestions.map((item, idx) => (
            <div 
              key={idx}
              onClick={handleOpenNotebook}
              className="p-4 bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 cursor-pointer transition hover:shadow-md group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.category}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug">
                "{item.question}"
              </p>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            Link direto sincronizado: <code className="text-[11px] font-mono text-indigo-500 truncate max-w-[280px] sm:max-w-xs">{notebookUrl}</code>
          </span>
          <button
            onClick={handleOpenNotebook}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Abrir NotebookLM em nova aba</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
