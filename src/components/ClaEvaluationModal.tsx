import React, { useState } from "react";
import { CollaboratorInfo, ClaEvaluation } from "../types";
import { 
  Star, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown, 
  MinusCircle, 
  Trash2, 
  Award, 
  UserCheck, 
  AlertOctagon,
  MessageSquare
} from "lucide-react";

interface ClaEvaluationModalProps {
  collaborator: CollaboratorInfo | null;
  currentUserName?: string;
  claName?: string;
  onSaveEvaluation: (collaboratorId: string, evaluation: ClaEvaluation | null) => Promise<void>;
  onClose: () => void;
}

const POSITIVE_TAGS = [
  "Pontualidade britânica",
  "Excelente postura e conduta",
  "Liderança exemplar na sala",
  "Domínio de atas e malotes",
  "Muito prestativo e cooperativo",
  "Recomendado para Chefe de Sala",
  "Atendimento humanizado e calmo",
  "Excelente no detector de metais"
];

const NEGATIVE_TAGS = [
  "Atraso no horário de chegada",
  "Falta no dia da prova sem justificativa",
  "Uso indevido de celular em sala/posto",
  "Desatenção durante a aplicação",
  "Problema ou atrito com participante",
  "Abandono temporário do posto",
  "Insubordinação à Coordenação",
  "Preenchimento incorreto de ata/malote",
  "Recusa injustificada de instrução"
];

const NEUTRAL_TAGS = [
  "Cumpriu as atribuições",
  "Desempenho padrão",
  "Sem ocorrências registradas"
];

export const ClaEvaluationModal: React.FC<ClaEvaluationModalProps> = ({
  collaborator,
  currentUserName,
  claName,
  onSaveEvaluation,
  onClose
}) => {
  if (!collaborator) return null;

  const existingEval = collaborator.claEvaluation;

  const [rating, setRating] = useState<"positive" | "neutral" | "negative">(
    existingEval?.rating || "positive"
  );
  const [score, setScore] = useState<number>(existingEval?.score || (existingEval?.rating === "negative" ? 1 : 5));
  const [selectedTags, setSelectedTags] = useState<string[]>(existingEval?.tags || []);
  const [feedback, setFeedback] = useState<string>(existingEval?.feedback || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectRating = (newRating: "positive" | "neutral" | "negative") => {
    setRating(newRating);
    if (newRating === "positive") {
      setScore(5);
      // Clean tags that don't match
      setSelectedTags(prev => prev.filter(t => POSITIVE_TAGS.includes(t)));
    } else if (newRating === "negative") {
      setScore(1);
      setSelectedTags(prev => prev.filter(t => NEGATIVE_TAGS.includes(t)));
    } else {
      setScore(3);
      setSelectedTags(prev => prev.filter(t => NEUTRAL_TAGS.includes(t)));
    }
  };

  const handleSave = async () => {
    if (!collaborator.id) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const evaluation: ClaEvaluation = {
        rating,
        score,
        badge: rating === "positive" ? "recommended" : rating === "negative" ? "problem" : "satisfactory",
        tags: selectedTags,
        feedback: feedback.trim(),
        evaluatedBy: currentUserName || "Coordenação CLA",
        evaluatedAt: new Date().toISOString(),
        claId: collaborator.claId,
        claName: claName || collaborator.claName || "Coordenação do Local"
      };

      await onSaveEvaluation(collaborator.id, evaluation);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao registrar avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!collaborator.id) return;
    if (!window.confirm("Deseja realmente remover o registro de avaliação deste colaborador?")) return;
    
    setIsSubmitting(true);
    try {
      await onSaveEvaluation(collaborator.id, null);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao remover avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTagList = rating === "positive" ? POSITIVE_TAGS : rating === "negative" ? NEGATIVE_TAGS : NEUTRAL_TAGS;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-xl w-full bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080d1a]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${rating === "positive" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : rating === "negative" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
              {rating === "positive" ? <Award className="w-5 h-5" /> : rating === "negative" ? <AlertOctagon className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-2">
                <span>Avaliação de Desempenho do CLA</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Registro permanente de conduta, recomendação ou ocorrência</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Collaborator Identification Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 dark:bg-[#070b13] rounded-2xl border border-slate-200 dark:border-slate-800">
            {collaborator.photoUrl ? (
              <img 
                src={collaborator.photoUrl} 
                alt={collaborator.name} 
                className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0" 
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                {collaborator.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{collaborator.name}</h4>
              <p className="text-[11px] font-mono text-slate-400 font-bold">CPF: {collaborator.cpf}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9.5px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                  {collaborator.assignedRole || (collaborator.isReserve ? "Fiscal Reserva" : "Sem Função")}
                </span>
                {collaborator.assignedRoom && (
                  <span className="text-[9.5px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                    {collaborator.assignedRoom}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating Choice: Positivo vs Neutro vs Negativo */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Tipo de Avaliação / Conduta:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Positive Button */}
              <button
                type="button"
                onClick={() => handleSelectRating("positive")}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  rating === "positive"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-md ring-2 ring-emerald-500/20"
                    : "bg-white dark:bg-[#070b13] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">⭐</span>
                  <ThumbsUp className={`w-4 h-4 ${rating === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                </div>
                <div>
                  <strong className="block text-xs font-black text-emerald-700 dark:text-emerald-300">Positivo (Recomendado)</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                    Gera o <strong>Selo de Recomendação ⭐</strong> para futuras edições.
                  </span>
                </div>
              </button>

              {/* Neutral Button */}
              <button
                type="button"
                onClick={() => handleSelectRating("neutral")}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  rating === "neutral"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-md ring-2 ring-amber-500/20"
                    : "bg-white dark:bg-[#070b13] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">⚖️</span>
                  <MinusCircle className={`w-4 h-4 ${rating === "neutral" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                </div>
                <div>
                  <strong className="block text-xs font-black text-amber-700 dark:text-amber-300">Neutro / Regular</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                    Desempenho dentro do padrão, sem ressalvas ou destaques.
                  </span>
                </div>
              </button>

              {/* Negative Button */}
              <button
                type="button"
                onClick={() => handleSelectRating("negative")}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  rating === "negative"
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 shadow-md ring-2 ring-rose-500/20"
                    : "bg-white dark:bg-[#070b13] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">⛔</span>
                  <ThumbsDown className={`w-4 h-4 ${rating === "negative" ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`} />
                </div>
                <div>
                  <strong className="block text-xs font-black text-rose-700 dark:text-rose-300">Negativo / Alerta</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                    Gera <strong>Alerta de Desempenho ⛔</strong> visível para a coordenação.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Star Rating */}
          <div className="p-3 bg-slate-50 dark:bg-[#070b13] rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Nota de Desempenho (1 a 5 estrelas)</span>
              <span className="text-[10px] text-slate-400">Classificação atribuída pelo CLA</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  className="p-1 cursor-pointer transition hover:scale-110 active:scale-95"
                  title={`${star} estrela${star > 1 ? "s" : ""}`}
                >
                  <Star 
                    className={`w-6 h-6 ${
                      star <= score 
                        ? (rating === "negative" ? "text-rose-500 fill-rose-500" : "text-amber-400 fill-amber-400") 
                        : "text-slate-300 dark:text-slate-600"
                    }`} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Tags Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Marcadores de Conduta ({rating === "positive" ? "Pontos Fortes" : rating === "negative" ? "Ocorrências / Problemas" : "Características"}):
              </label>
              <span className="text-[10px] text-slate-400">Selecione uma ou mais</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentTagList.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? rating === "positive"
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                          : rating === "negative"
                          ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                          : "bg-amber-600 text-white border-amber-700 shadow-xs"
                        : "bg-white dark:bg-[#070b13] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{isSelected ? "✓" : "+"}</span>
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Observation Textarea */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Observação Detalhada / Parecer do CLA:</span>
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                rating === "positive"
                  ? "Ex: Colaborador com excelente postura, pontualidade rigorosa e ótimo domínio de procedimentos na sala..."
                  : rating === "negative"
                  ? "Ex: Apresentou atraso de 40 minutos, desatento ao uso de celular e apresentou resistência às orientações do CLA..."
                  : "Observações gerais sobre a atuação do fiscal..."
              }
              className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-[#070b13] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/40 focus:outline-hidden"
            />
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Existing Evaluation Info if previously saved */}
          {existingEval?.evaluatedAt && (
            <div className="text-[10px] text-slate-400 text-right font-mono">
              Última avaliação por <strong>{existingEval.evaluatedBy || "CLA"}</strong> em {new Date(existingEval.evaluatedAt).toLocaleDateString("pt-BR")} às {new Date(existingEval.evaluatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080d1a]/80 flex items-center justify-between gap-3 shrink-0">
          <div>
            {existingEval && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRemove}
                className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Avaliação</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 ${
                rating === "positive" 
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30" 
                  : rating === "negative"
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Salvando..." : "Confirmar Avaliação"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ClaEvaluationModal;
