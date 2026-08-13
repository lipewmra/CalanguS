import React, { useState } from "react";
import { CollaboratorInfo, TransferRequestInfo, BuildingInfo, UserProfile } from "../types";
import { 
  ShieldAlert, CheckCircle, XCircle, Clock, ArrowRight, 
  Building2, UserCheck, Mail, Phone, MessageSquare, AlertCircle, X
} from "lucide-react";

interface TransferRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: CollaboratorInfo[];
  allCollaborators: CollaboratorInfo[];
  claId: string;
  currentUserName?: string;
  allBuildings?: BuildingInfo[];
  allUsers?: UserProfile[];
  onApproveTransfer: (collab: CollaboratorInfo, approvedByName?: string) => Promise<void>;
  onRejectTransfer: (collab: CollaboratorInfo) => Promise<void>;
  onCancelTransfer?: (collab: CollaboratorInfo) => Promise<void>;
}

export default function TransferRequestsModal({
  isOpen,
  onClose,
  collaborators,
  allCollaborators,
  claId,
  currentUserName,
  allBuildings = [],
  allUsers = [],
  onApproveTransfer,
  onRejectTransfer,
  onCancelTransfer
}: TransferRequestsModalProps) {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  // Incoming requests: collaborators of current CLA where transferRequest is "Pendente"
  const incomingRequests = collaborators.filter(
    c => c.transferRequest && c.transferRequest.status === "Pendente"
  );

  // Outgoing requests: collaborators across the network requested by our CLA
  const outgoingRequests = allCollaborators.filter(
    c => c.transferRequest && c.transferRequest.targetClaId === claId
  );

  const getClaDisplayName = (targetClaId: string, customName?: string) => {
    if (customName && customName.trim()) return customName;
    const user = allUsers.find(u => u.uid === targetClaId);
    const b = allBuildings.find(item => item.claId === targetClaId);
    if (b?.name) return `${b.name}${user?.name ? ` (${user.name})` : ""}`;
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    return `CLA ${targetClaId.slice(0, 6)}`;
  };

  const handleApprove = async (collab: CollaboratorInfo) => {
    setProcessingId(collab.id || "proc");
    try {
      await onApproveTransfer(collab, currentUserName || "CLA Mantenedor");
      setFeedbackMsg({
        text: `Fiscal ${collab.name} foi liberado e transferido com sucesso para ${collab.transferRequest?.targetClaName}!`,
        type: "success"
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: "Erro ao aprovar liberação. Tente novamente.", type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (collab: CollaboratorInfo) => {
    setProcessingId(collab.id || "proc");
    try {
      await onRejectTransfer(collab);
      setFeedbackMsg({
        text: `Solicitação recusada. O fiscal ${collab.name} permanece no seu quadro de reservas.`,
        type: "success"
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: "Erro ao recusar solicitação.", type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (collab: CollaboratorInfo) => {
    if (!onCancelTransfer) return;
    setProcessingId(collab.id || "proc");
    try {
      await onCancelTransfer(collab);
      setFeedbackMsg({
        text: `Solicitação cancelada com sucesso.`,
        type: "success"
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: "Erro ao cancelar solicitação.", type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#101726]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Gestão de Liberação de Fiscais Reservas</span>
                {incomingRequests.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {incomingRequests.length} pendente{incomingRequests.length > 1 ? "s" : ""}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aprove ou recuse a transferência de reservas solicitados por outros locais de aplicação.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-3 bg-slate-50/50 dark:bg-[#0a0f1d]">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "incoming"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span>📥 Pedidos Recebidos ({incomingRequests.length})</span>
            {incomingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("outgoing")}
            className={`pb-3 px-3 text-xs font-black border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "outgoing"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span>📤 Meus Pedidos Enviados ({outgoingRequests.length})</span>
          </button>
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div className={`m-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedbackMsg.type === "success" 
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
          }`}>
            {feedbackMsg.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          {activeTab === "incoming" && (
            <>
              {incomingRequests.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-bold space-y-2">
                  <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs">Nenhum pedido de liberação de fiscal reserva pendente no momento.</p>
                  <p className="text-[10px] text-slate-400">Quando outro CLA solicitar a transferência de um fiscal seu, ele aparecerá aqui para sua autorização.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((collab) => {
                    const req = collab.transferRequest!;
                    const isProcessing = processingId === collab.id;

                    return (
                      <div
                        key={collab.id}
                        className="p-4 bg-slate-50 dark:bg-[#101726]/80 border-2 border-amber-500/30 rounded-2xl space-y-3 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-500/20">
                                Pedido de Transferência
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(req.requestedAt).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                              {collab.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              CPF: {collab.cpf} • {collab.whatsapp}
                            </p>
                          </div>

                          <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-right">
                            <span className="text-[10px] uppercase font-black text-slate-400 block">Solicitante:</span>
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block">
                              {req.targetClaName}
                            </span>
                            {req.targetBuildingName && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                {req.targetBuildingName}
                              </span>
                            )}
                            {req.targetUserEmail && (
                              <span className="text-[9px] text-slate-400 font-mono block">
                                {req.targetUserEmail}
                              </span>
                            )}
                          </div>
                        </div>

                        {req.notes && (
                          <div className="p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Justificativa do Solicitante: </span>
                              <span>{req.notes}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-bold text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {collab.education}
                            </span>
                            {collab.specialRole && collab.specialRole !== "Nenhuma" && (
                              <span className="font-bold text-[10px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded">
                                {collab.specialRole}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleReject(collab)}
                              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              ✕ Recusar / Manter no Meu Local
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() => handleApprove(collab)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>✓ Aprovar e Liberar Fiscal</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "outgoing" && (
            <>
              {outgoingRequests.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-bold space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs">Você não enviou pedidos de liberação de fiscais para outros CLAs.</p>
                  <p className="text-[10px] text-slate-400">Você pode solicitar fiscais no "Banco Geral de Reservas" quando necessitar de contingente extra.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {outgoingRequests.map((collab) => {
                    const req = collab.transferRequest!;
                    const originName = getClaDisplayName(collab.claId, collab.originalClaName || collab.claName);

                    return (
                      <div
                        key={collab.id}
                        className="p-4 bg-slate-50 dark:bg-[#101726]/80 border-2 border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                req.status === "Aprovado"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                  : req.status === "Recusado"
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 animate-pulse"
                              }`}>
                                {req.status === "Aprovado" ? "✓ Aprovado e Transferido" : req.status === "Recusado" ? "✕ Recusado pelo CLA" : "⏳ Aguardando Liberação"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Solicitado em {new Date(req.requestedAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>

                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                              {collab.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              CPF: {collab.cpf}
                            </p>
                          </div>

                          <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-right">
                            <span className="text-[10px] uppercase font-black text-slate-400 block">CLA Mantenedor:</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                              {originName}
                            </span>
                          </div>
                        </div>

                        {req.status === "Pendente" && onCancelTransfer && (
                          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                              onClick={() => handleCancel(collab)}
                              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                            >
                              Cancelar Solicitação
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#101726]/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
