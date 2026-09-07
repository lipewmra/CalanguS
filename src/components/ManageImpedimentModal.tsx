import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Ban,
  X,
  Check,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  History,
  Sparkles
} from "lucide-react";
import { CollaboratorInfo } from "../types";

export interface ManageImpedimentModalProps {
  isOpen: boolean;
  collaborator: CollaboratorInfo | null;
  onClose: () => void;
  onConfirmRevert: (
    collab: CollaboratorInfo,
    options: {
      targetStatus: "Confirmado" | "Pendente";
      restoreRole: boolean;
      restoreRoom: boolean;
      justification: string;
    }
  ) => Promise<void>;
  onUpdateReason: (collab: CollaboratorInfo, newReason: string) => Promise<void>;
  currentUserName?: string;
  buildingName?: string;
}

const COMMON_REVERT_JUSTIFICATIONS = [
  "Situação regularizada junto à coordenação CLA",
  "Erro no registro anterior de impedimento",
  "Justificativa de ausência acolhida pela coordenação",
  "Colaborador apto e reintegrado à equipe de aplicação",
  "Revisão cadastral autorizada pela Coordenação Local"
];

const COMMON_IMPEDIMENT_REASONS = [
  "Ausência não justificada na capacitação presencial",
  "Desistência expressa comunicada pelo colaborador",
  "Conduta incompatível com as diretrizes do exame",
  "Incompatibilidade de turno ou indisponibilidade de horário",
  "Inconsistência cadastral ou documentação pendente",
  "Substituição emergencial realizada pela coordenação"
];

export default function ManageImpedimentModal({
  isOpen,
  collaborator,
  onClose,
  onConfirmRevert,
  onUpdateReason,
  currentUserName,
  buildingName
}: ManageImpedimentModalProps) {
  if (!isOpen || !collaborator) return null;

  const [activeTab, setActiveTab] = useState<"revert" | "edit_reason">("revert");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect previous state details
  const prevData = collaborator.previousStateBeforeImpediment;
  
  // Also check logs if available for previous role/room/status
  const lastRefusalLog = collaborator.activityLogs?.slice().reverse().find(
    log => log.action === "recusa_funcao" || log.action === "impedimento" || (log.details as any)?.statusAnterior
  );
  const logDetails = (lastRefusalLog?.details as any) || {};

  const detectedPrevStatus: "Confirmado" | "Pendente" = 
    prevData?.status || 
    (logDetails.statusAnterior === "Pendente" ? "Pendente" : "Confirmado");

  const detectedPrevRole = 
    prevData?.assignedRole || 
    logDetails.funcaoAnterior || 
    (collaborator.refusedRole && collaborator.refusedRole !== "Não associada" ? collaborator.refusedRole : "");

  const detectedPrevRoom = 
    prevData?.assignedRoom || 
    logDetails.salaAnterior || 
    "";

  // Revert form state
  const [targetStatus, setTargetStatus] = useState<"Confirmado" | "Pendente">(detectedPrevStatus);
  const [restoreRole, setRestoreRole] = useState<boolean>(Boolean(detectedPrevRole));
  const [restoreRoom, setRestoreRoom] = useState<boolean>(false);
  const [justification, setJustification] = useState<string>("");

  // Edit reason state
  const [editReasonText, setEditReasonText] = useState<string>(
    collaborator.refusalReason || (collaborator.refusalTag ? collaborator.refusalTag.replace(/^Impedido:\s*/i, "") : "")
  );

  useEffect(() => {
    if (collaborator) {
      setTargetStatus(detectedPrevStatus);
      setRestoreRole(Boolean(detectedPrevRole));
      setRestoreRoom(false);
      setJustification("");
      setEditReasonText(
        collaborator.refusalReason || (collaborator.refusalTag ? collaborator.refusalTag.replace(/^Impedido:\s*/i, "") : "")
      );
      setIsSubmitting(false);
    }
  }, [collaborator, detectedPrevStatus, detectedPrevRole]);

  const handleRevertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      alert("Por favor, forneça uma justificativa para a revogação do impedimento.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmRevert(collaborator, {
        targetStatus,
        restoreRole,
        restoreRoom,
        justification: justification.trim()
      });
      onClose();
    } catch (err) {
      console.error("Erro ao reverter impedimento:", err);
      alert("Ocorreu um erro ao reverter o impedimento. Verifique o console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReasonText.trim()) {
      alert("Por favor, informe o motivo do impedimento.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateReason(collaborator, editReasonText.trim());
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar motivo de impedimento:", err);
      alert("Ocorreu um erro ao atualizar o motivo. Verifique o console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white dark:bg-[#0d1526] border-2 border-indigo-500/30 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-black text-slate-900 dark:text-white">
                  Gerenciar Impedimento do Colaborador
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                  IMPEDIDO
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Altere os dados do impedimento ou reverta-o voltando ao estado anterior de aprovação.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collaborator Quick Info */}
        <div className="p-4 bg-slate-50 dark:bg-[#070b13] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            {collaborator.photoUrl ? (
              <img
                src={collaborator.photoUrl}
                alt={collaborator.name}
                className="w-12 h-12 rounded-xl object-cover border-2 border-rose-500/30 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 shrink-0">
                {collaborator.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-display font-black text-sm text-slate-900 dark:text-white truncate">
                {collaborator.name}
              </h4>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                CPF: {collaborator.cpf} {collaborator.whatsapp ? `• ${collaborator.whatsapp}` : ""}
              </div>
            </div>
          </div>

          {/* Current registered impediment info box */}
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs space-y-1">
            <div className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Motivo Registrado Atualmente</span>
            </div>
            <p className="text-rose-950 dark:text-rose-200 font-bold leading-snug">
              {collaborator.refusalReason || (collaborator.refusalTag ? collaborator.refusalTag.replace(/^Impedido:\s*/i, "") : "Nenhum motivo detalhado informado.")}
            </p>
            {collaborator.refusedRoleDate && (
              <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 font-mono mt-0.5">
                Registrado em: {collaborator.refusedRoleDate}
              </p>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b-2 border-slate-100 dark:border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("revert")}
            className={`pb-2.5 px-3 text-xs font-black cursor-pointer transition flex items-center gap-1.5 border-b-2 -mb-0.5 ${
              activeTab === "revert"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>1. Reverter Impedimento (Voltar ao Estado Anterior)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit_reason")}
            className={`pb-2.5 px-3 text-xs font-black cursor-pointer transition flex items-center gap-1.5 border-b-2 -mb-0.5 ${
              activeTab === "edit_reason"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Alterar Motivo do Impedimento</span>
          </button>
        </div>

        {/* TAB 1: REVERT IMPEDIMENT */}
        {activeTab === "revert" && (
          <form onSubmit={handleRevertSubmit} className="space-y-4">
            <div className="p-3.5 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Restauração Cadastral e Desimpedimento</span>
              </div>
              <p className="text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                Esta ação revoga formalmente o impedimento do colaborador, desbloqueando seu acesso ao sistema de confirmação e retornando-o ao estado anterior de aprovação.
              </p>
            </div>

            {/* Target Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Status que será restaurado:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetStatus("Confirmado")}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    targetStatus === "Confirmado"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Confirmado (Aprovado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetStatus("Pendente")}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    targetStatus === "Pendente"
                      ? "bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <span>⏳ Pendente de Aprovação</span>
                </button>
              </div>
            </div>

            {/* Restoration Toggles */}
            <div className="space-y-2 pt-1">
              {detectedPrevRole && (
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition">
                  <input
                    type="checkbox"
                    checked={restoreRole}
                    onChange={(e) => setRestoreRole(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Restaurar função anterior: <strong>{detectedPrevRole}</strong>
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Se desmarcado, o colaborador será reintegrado como Reserva Geral sem função específica.
                    </p>
                  </div>
                </label>
              )}

              {detectedPrevRoom && (
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition">
                  <input
                    type="checkbox"
                    checked={restoreRoom}
                    onChange={(e) => setRestoreRoom(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Tentar realocar na sala anterior: <strong>{detectedPrevRoom}</strong>
                    </span>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      Atenção: Verifique no Menu 3 se a sala não foi ocupada por outro fiscal após a desalocação.
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Justification input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Justificativa da Revogação do Impedimento <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-mono">Registro de auditoria</span>
              </label>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 mb-1.5">
                {COMMON_REVERT_JUSTIFICATIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setJustification(item)}
                    className="text-[9.5px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  >
                    + {item}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Descreva a razão pela qual o impedimento está sendo cancelado e o colaborador está retornando ao estado anterior..."
                className="w-full text-xs font-medium p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !justification.trim()}
                className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                  !isSubmitting && justification.trim()
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                }`}
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSubmitting ? "Processando Restauração..." : "Confirmar Desimpedimento & Voltar ao Estado Anterior"}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: EDIT IMPEDIMENT REASON */}
        {activeTab === "edit_reason" && (
          <form onSubmit={handleReasonSubmit} className="space-y-4">
            <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Atualização do Motivo Registrado</span>
              </div>
              <p className="text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
                O colaborador permanecerá marcado como <strong>Impedido</strong>, mas o motivo oficial cadastrado será retificado para refletir a situação exata no relatório de auditoria e segurança.
              </p>
            </div>

            {/* Reason input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Novo Motivo do Impedimento <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-mono">Ficha oficial do colaborador</span>
              </label>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 mb-1.5">
                {COMMON_IMPEDIMENT_REASONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditReasonText(item)}
                    className="text-[9.5px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  >
                    + {item}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                value={editReasonText}
                onChange={(e) => setEditReasonText(e.target.value)}
                placeholder="Descreva detalhadamente o novo motivo do impedimento..."
                className="w-full text-xs font-medium p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !editReasonText.trim()}
                className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                  !isSubmitting && editReasonText.trim()
                    ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>
                  {isSubmitting ? "Atualizando..." : "Salvar Novo Motivo do Impedimento"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
