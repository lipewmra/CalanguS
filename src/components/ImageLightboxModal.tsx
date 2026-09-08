import React, { useEffect, useState, useMemo } from "react";
import { 
  X, ZoomIn, Download, User, Shield, Building2, Award, Sparkles, 
  Clock, CheckCircle2, Phone, Mail, CreditCard, UserCheck, 
  AlertCircle, Check, DoorOpen, History, Layers, MessageCircle, BookOpen,
  CheckSquare, Square, RefreshCw, ArrowRightLeft, UserX,
  Star, ThumbsUp, ThumbsDown, AlertOctagon, AlertTriangle
} from "lucide-react";
import { getInitials } from "../lib/image-utils";
import { PastEdition, MaterialAccessLog, CollaboratorInfo, RoomDetails, BuildingInfo, ClaEvaluation } from "../types";
import { checkMultipleRegistrations, canonicalizeRoleName } from "../lib/collaborator-utils";
import { ENEM_ROLES } from "./CollaboratorManager";
import ClaEvaluationModal from "./ClaEvaluationModal";

export interface LightboxData {
  id?: string;
  imageUrl: string;
  name: string;
  role?: string;
  cpf?: string;
  claName?: string;
  originalClaName?: string;
  education?: string;
  specialRole?: string;
  hasWorkedEnem?: boolean;
  pastEditions?: PastEdition[];
  email?: string;
  whatsapp?: string;
  birthDate?: string;
  disability?: string;
  languages?: string[];
  pixKey?: string;
  referencePerson?: string;
  assignedRoom?: string;
  status?: string;
  isReserve?: boolean;
  isOrionAssociated?: boolean;
  orionStatus?: "Ok" | "Erro";
  orionErrors?: string[];
  attendanceStatus?: string;
  refusedRole?: string;
  refusalTag?: string;
  refusalReason?: string;
  createdAt?: string;
  isExternalRecruit?: boolean;
  paymentValue?: string;
  materialsAccessed?: MaterialAccessLog[];
  transferHistory?: Array<{
    fromClaId: string;
    fromClaName: string;
    toClaId: string;
    toClaName: string;
    date: string;
    approvedBy?: string;
  }>;
}

export interface ImageLightboxModalProps {
  data: LightboxData | null;
  onClose: () => void;
  collaborator?: CollaboratorInfo | null;
  allCollaborators?: CollaboratorInfo[];
  allBuildings?: BuildingInfo[];
  currentUserName?: string;
  claName?: string;
  rooms?: RoomDetails[];
  availableRooms?: RoomDetails[];
  availableRoles?: string[];
  onUpdateCollaborator?: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  onMoveAllocation?: (id: string, isReserve: boolean, assignedRoom: string, updatedRole?: string) => void;
  onApproveCollaborator?: (id: string, roleName?: string) => Promise<void>;
  onSaveEvaluation?: (collaboratorId: string, evaluation: ClaEvaluation | null) => Promise<void>;
}

export default function ImageLightboxModal({ 
  data, 
  onClose,
  collaborator,
  allCollaborators = [],
  allBuildings = [],
  currentUserName,
  claName,
  rooms = [],
  availableRooms,
  availableRoles,
  onUpdateCollaborator,
  onMoveAllocation,
  onApproveCollaborator,
  onSaveEvaluation
}: ImageLightboxModalProps) {
  const allRooms = availableRooms || rooms;
  const rolesList = useMemo(() => {
    const raw = availableRoles && availableRoles.length > 0 ? availableRoles : ENEM_ROLES.map(r => r.name);
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of raw) {
      const canonical = canonicalizeRoleName(r);
      if (canonical && !seen.has(canonical)) {
        seen.add(canonical);
        list.push(canonical);
      }
    }
    return list;
  }, [availableRoles]);
  const collabId = collaborator?.id || data?.id;
  
  // Local state initialized from collaborator or data
  const initialRole = canonicalizeRoleName(collaborator?.assignedRole || data?.role || "");
  const [localRole, setLocalRole] = useState<string>(initialRole);
  const [localRoom, setLocalRoom] = useState<string>(collaborator?.assignedRoom || data?.assignedRoom || "");
  const [localStatus, setLocalStatus] = useState<string>(collaborator?.status || data?.status || "Confirmado");
  const [localIsOrion, setLocalIsOrion] = useState<boolean>(
    collaborator?.isOrionAssociated ?? data?.isOrionAssociated ?? false
  );
  const [localEvaluation, setLocalEvaluation] = useState<ClaEvaluation | undefined>(
    collaborator?.claEvaluation
  );
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedRoleToApprove, setSelectedRoleToApprove] = useState<string>(initialRole);
  const [selectedRoomToAssign, setSelectedRoomToAssign] = useState<string>(localRoom || "");
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data || collaborator) {
      const canonical = canonicalizeRoleName(collaborator?.assignedRole || data?.role || "");
      setLocalRole(canonical);
      setLocalRoom(collaborator?.assignedRoom || data?.assignedRoom || "");
      setLocalStatus(collaborator?.status || data?.status || "Confirmado");
      setLocalIsOrion(collaborator?.isOrionAssociated ?? data?.isOrionAssociated ?? false);
      setLocalEvaluation(collaborator?.claEvaluation);
      setSelectedRoleToApprove(canonical);
      setSelectedRoomToAssign(collaborator?.assignedRoom || data?.assignedRoom || "");
      setActionSuccessMsg(null);
    }
  }, [data, collaborator]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (data) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [data, onClose]);

  if (!data) return null;

  const handleDownload = () => {
    if (!data.imageUrl) return;
    const a = document.createElement("a");
    a.href = data.imageUrl;
    a.download = `foto_${(data.name || "fiscal").replace(/\s+/g, "_").toLowerCase()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cleanPhone = data.whatsapp ? data.whatsapp.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone.length <= 11 ? cleanPhone : cleanPhone}` : null;

  // Toggle Orion status directly
  const handleToggleOrion = async () => {
    if (!collabId || !onUpdateCollaborator) return;
    const nextVal = !localIsOrion;
    setIsExecutingAction(true);
    try {
      await onUpdateCollaborator(collabId, { isOrionAssociated: nextVal });
      setLocalIsOrion(nextVal);
      setActionSuccessMsg(nextVal ? "Marcado como Associado ao Orion!" : "Desmarcado do Orion.");
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Approve collaborator with role
  const handleApprove = async () => {
    if (!collabId) return;
    setIsExecutingAction(true);
    try {
      const isRoleDefined = !!selectedRoleToApprove && selectedRoleToApprove.trim() !== "" && selectedRoleToApprove !== "reserva";
      const updates: Partial<CollaboratorInfo> = {
        status: "Confirmado",
        assignedRole: isRoleDefined ? selectedRoleToApprove : undefined,
        isReserve: !isRoleDefined,
        attendanceStatus: "Confirmado"
      };

      if (onApproveCollaborator) {
        await onApproveCollaborator(collabId, isRoleDefined ? selectedRoleToApprove : undefined);
      } else if (onUpdateCollaborator) {
        await onUpdateCollaborator(collabId, updates);
      }
      setLocalStatus("Confirmado");
      setLocalRole(isRoleDefined ? selectedRoleToApprove : "");
      setActionSuccessMsg("Colaborador aprovado com sucesso!");
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Change assigned role
  const handleChangeRole = async (newRole: string) => {
    if (!collabId || !onUpdateCollaborator) return;
    setIsExecutingAction(true);
    try {
      const isRes = !newRole || newRole.toLowerCase() === "reserva";
      await onUpdateCollaborator(collabId, {
        assignedRole: isRes ? undefined : newRole,
        isReserve: isRes
      });
      setLocalRole(isRes ? "" : newRole);
      setActionSuccessMsg(`Função alterada para: ${newRole || "Reserva"}!`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Change room allocation
  const handleAssignRoom = async (newRoom: string) => {
    if (!collabId) return;
    setIsExecutingAction(true);
    try {
      if (onMoveAllocation) {
        onMoveAllocation(collabId, !newRoom, newRoom, localRole || undefined);
      } else if (onUpdateCollaborator) {
        await onUpdateCollaborator(collabId, {
          assignedRoom: newRoom || undefined,
          isReserve: !newRoom
        });
      }
      setLocalRoom(newRoom);
      setActionSuccessMsg(newRoom ? `Alocado na ${newRoom} com sucesso!` : "Colaborador desalocado da sala.");
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080d1a]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <span>Ficha Completa & Associação do Colaborador</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">Dados cadastrais, alocação operacional e controle Orion</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {actionSuccessMsg && (
          <div className="px-5 py-2.5 bg-emerald-500 text-white font-bold text-xs flex items-center justify-between animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setActionSuccessMsg(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* 1. Header Row: Photo + Main Header Summary */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800/80 rounded-2xl">
            {/* Photo Avatar / Full photo */}
            <div className="relative group shrink-0">
              {data.imageUrl ? (
                <img
                  src={data.imageUrl}
                  alt={data.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl border-4 border-white dark:border-slate-800 shadow-lg ring-2 ring-indigo-500/30"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex flex-col items-center justify-center font-black text-2xl shadow-lg ring-2 ring-indigo-500/30">
                  <span>{getInitials(data.name)}</span>
                  <span className="text-[9px] uppercase font-medium mt-0.5 opacity-75">Sem foto</span>
                </div>
              )}
            </div>

            {/* Name + Key Badges */}
            <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                  {localRole || (collaborator?.isReserve || data.isReserve ? "Fiscal Reserva" : "Sem Função Definida")}
                </span>

                {data.paymentValue && (
                  <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {data.paymentValue}
                  </span>
                )}

                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                  localStatus === "Confirmado" 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : localStatus === "Pendente" 
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                }`}>
                  {localStatus.toUpperCase()}
                </span>

                {data.isExternalRecruit && (
                  <span className="text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono font-black border border-teal-500/20 px-2 py-0.5 rounded-md">
                    RECRUTAMENTO EXTERNO
                  </span>
                )}
              </div>

              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {data.name}
              </h2>

              {data.cpf && (
                <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  CPF: {data.cpf}
                </p>
              )}

              {localRoom && (
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Alocado na {localRoom}</span>
                </div>
              )}

              {(localStatus === "Impedido" || data.refusalReason) && (
                <div className="p-2.5 bg-rose-500/10 border-2 border-rose-500/30 rounded-xl space-y-0.5 text-left">
                  <div className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Colaborador Impedido / Recusado</span>
                  </div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    <strong>Motivo:</strong> {data.refusalReason || data.refusalTag || "Marcado como impedido."}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ALERTA DE CADASTRO EM MÚLTIPLOS LOCAIS (CPF DUPLICADO EM OUTROS CLAS) */}
          {(() => {
            const multiReg = checkMultipleRegistrations(data.cpf, allCollaborators, allBuildings);
            if (!multiReg.isMultiRegistered) return null;
            return (
              <div className="p-3.5 bg-amber-500/15 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-xs uppercase">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Alerta: Colaborador com cadastro em múltiplos locais ({multiReg.count} locais de aplicação)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  Este CPF (<strong className="font-mono">{data.cpf}</strong>) foi identificado com cadastros simultâneos nas seguintes coordenações:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {multiReg.locations.map((loc, idx) => (
                    <div key={idx} className="p-2.5 bg-white dark:bg-[#070b13] rounded-xl border border-amber-300 dark:border-amber-700/60 text-xs flex flex-col justify-between">
                      <div className="font-black text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{loc.claName || loc.buildingName || "Coordenação CLA"}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>Função: <strong className="text-indigo-600 dark:text-indigo-400">{loc.assignedRole || "Reserva"}</strong></span>
                        {loc.assignedRoom && <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sala {loc.assignedRoom}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* SISTEMA DE AVALIAÇÃO DO CLA (SELO DE RECOMENDAÇÃO / AVALIAÇÃO NEGATIVA) */}
          <div className="p-4 bg-white dark:bg-[#0c1220] rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                {localEvaluation?.rating === "positive" ? (
                  <Award className="w-4 h-4 text-emerald-500" />
                ) : localEvaluation?.rating === "negative" ? (
                  <AlertOctagon className="w-4 h-4 text-rose-500" />
                ) : (
                  <UserCheck className="w-4 h-4 text-amber-500" />
                )}
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Avaliação de Desempenho do CLA
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEvalModalOpen(true)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{localEvaluation ? "Editar Avaliação" : "Avaliar Desempenho"}</span>
              </button>
            </div>

            {localEvaluation ? (
              <div className={`p-3.5 rounded-xl border-2 space-y-2.5 ${
                localEvaluation.rating === "positive"
                  ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700/80"
                  : localEvaluation.rating === "negative"
                  ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700/80"
                  : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700/80"
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {localEvaluation.rating === "positive" ? "⭐" : localEvaluation.rating === "negative" ? "⛔" : "⚖️"}
                    </span>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-wider ${
                        localEvaluation.rating === "positive"
                          ? "text-emerald-800 dark:text-emerald-200"
                          : localEvaluation.rating === "negative"
                          ? "text-rose-800 dark:text-rose-200"
                          : "text-amber-800 dark:text-amber-200"
                      }`}>
                        {localEvaluation.rating === "positive" 
                          ? "Selo de Recomendação do CLA" 
                          : localEvaluation.rating === "negative" 
                          ? "Avaliação Negativa / Alerta de Conduta" 
                          : "Desempenho Regular / Neutro"}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-3.5 h-3.5 ${
                              star <= (localEvaluation.score || (localEvaluation.rating === "negative" ? 1 : 5))
                                ? (localEvaluation.rating === "negative" ? "text-rose-500 fill-rose-500" : "text-amber-400 fill-amber-400")
                                : "text-slate-300 dark:text-slate-600"
                            }`} 
                          />
                        ))}
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 ml-1">
                          ({localEvaluation.score || (localEvaluation.rating === "negative" ? 1 : 5)}/5)
                        </span>
                      </div>
                    </div>
                  </div>

                  {localEvaluation.evaluatedBy && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Avaliado por: <strong>{localEvaluation.evaluatedBy}</strong>
                    </span>
                  )}
                </div>

                {/* Tags */}
                {localEvaluation.tags && localEvaluation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {localEvaluation.tags.map((t, idx) => (
                      <span 
                        key={idx} 
                        className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${
                          localEvaluation.rating === "positive"
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
                            : localEvaluation.rating === "negative"
                            ? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30"
                            : "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Feedback / Relato */}
                {localEvaluation.feedback && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                    "{localEvaluation.feedback}"
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">
                  Nenhuma avaliação de desempenho ou recomendação do CLA registrada para este colaborador.
                </p>
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + Avaliar Agora
                </button>
              </div>
            )}
          </div>

          {/* 2. AREA DE ASSOCIAÇÃO & CONTROLE OPERACIONAL (EM DESTAQUE MÁXIMO) */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-purple-50/80 dark:from-indigo-950/40 dark:via-[#0c1222] dark:to-purple-950/30 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700/60 shadow-md space-y-3.5">
            <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/60 pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                  Dados de Associação & Alocação
                </h4>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                Controle Operacional CLA
              </span>
            </div>

            {/* Grid with Current Association Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200/70 dark:border-indigo-900/50">
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">Função Associada</span>
                <span className="font-black text-slate-850 dark:text-white">
                  {localRole || "Fiscal Reserva (Sem Função)"}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200/70 dark:border-indigo-900/50">
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">Sala / Posto</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {localRoom ? localRoom : "Aguardando Sala (Reserva)"}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200/70 dark:border-indigo-900/50">
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">Status Cadastro</span>
                <span className={`font-black ${localStatus === "Confirmado" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {localStatus}
                </span>
              </div>
            </div>

            {/* INDICADOR ORION EM DESTAQUE */}
            <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border-2 border-indigo-400 dark:border-indigo-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${localIsOrion ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                  {localIsOrion ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">
                      Sistema Orion (Cebraspe)
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      localIsOrion 
                        ? "bg-emerald-500 text-white" 
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}>
                      {localIsOrion ? "✓ Associado no Orion" : "⚠ Não Associado"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {localIsOrion 
                      ? "Colaborador inserido e certificado no sistema oficial Orion."
                      : "Pendente de inclusão/vinculação na plataforma oficial Orion."}
                  </p>
                </div>
              </div>

              {onUpdateCollaborator && (
                <button
                  type="button"
                  disabled={isExecutingAction}
                  onClick={handleToggleOrion}
                  className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-black transition active:scale-95 shrink-0 flex items-center gap-1.5 shadow-xs ${
                    localIsOrion
                      ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                  }`}
                >
                  {localIsOrion ? (
                    <span>Desmarcar do Orion</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Marcar como Associado ao Orion</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* AÇÕES DE APROVAÇÃO E ALOCAÇÃO SEM PRECISAR MUDAR DE MENU */}
            {localStatus === "Pendente" ? (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300 uppercase">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Inscrição Pendente de Aprovação</span>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                    Aprove diretamente aqui sem sair da tela
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">Selecione a Função para Atribuir:</label>
                    <select
                      value={selectedRoleToApprove}
                      onChange={(e) => setSelectedRoleToApprove(e.target.value)}
                      className="w-full bg-white dark:bg-[#070b13] border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="">🛡️ Aprovar como Fiscal Reserva (Sem Função Inicial)</option>
                      {rolesList.map(r => (
                        <option key={r} value={r}>⭐ {r}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={isExecutingAction}
                    onClick={handleApprove}
                    className="cursor-pointer sm:self-end px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Aprovar Colaborador Agora</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Ações para Colaborador já Confirmado: Trocar Função ou Alocar em Sala */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Trocar Função */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-[10px] uppercase font-extrabold text-slate-400">
                    Alterar Função / Associação:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={localRole}
                      disabled={isExecutingAction || !onUpdateCollaborator}
                      onChange={(e) => handleChangeRole(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="">🛡️ Reserva (Sem Função Fixa)</option>
                      {rolesList.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Alocar em Sala */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] uppercase font-extrabold text-slate-400">
                      Alocar / Remanejar Sala:
                    </label>
                    {localRoom && (
                      <button
                        type="button"
                        onClick={() => handleAssignRoom("")}
                        className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Desalocar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={localRoom}
                      disabled={isExecutingAction || (!onMoveAllocation && !onUpdateCollaborator)}
                      onChange={(e) => handleAssignRoom(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="">Apenas Reserva (Sem Sala)</option>
                      {allRooms && allRooms.length > 0 ? (
                        allRooms.map(room => (
                          <option key={room.number} value={room.number}>
                            {room.number} {room.floor ? `(${room.floor})` : ""}
                          </option>
                        ))
                      ) : (
                        Array.from({ length: 30 }, (_, i) => `Sala ${String(i + 1).padStart(2, "0")}`).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Key Attribute Grid (Dados Pessoais e Cadastrais) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Indicação / Referência */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Indicação / Pessoa de Referência</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                {data.referencePerson || <span className="text-slate-400 font-normal">Nenhuma indicação informada (Inscrição direta)</span>}
              </div>
            </div>

            {/* Escolaridade & PCD */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Escolaridade & Acessibilidade</span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {data.education || "Ensino Médio"}
                {data.disability && data.disability !== "Nenhuma" && (
                  <span className="block text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-0.5">
                    PCD: {data.disability}
                  </span>
                )}
              </div>
            </div>

            {/* Contatos */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
              <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-500" />
                <span>Contatos & Comunicação</span>
              </div>
              <div className="space-y-1 text-xs font-medium">
                {data.whatsapp ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{data.whatsapp}</span>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Conversar no WhatsApp</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">Telefone não informado</span>
                )}
                {data.email && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate" title={data.email}>
                    {data.email}
                  </div>
                )}
              </div>
            </div>

            {/* Pagamento / Chave PIX */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Chave PIX Cadastrada</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                {data.pixKey ? data.pixKey : <span className="text-slate-400 font-sans font-normal">Chave PIX não cadastrada</span>}
              </div>
            </div>
          </div>

          {/* Perfil Especial e Idiomas */}
          {(data.specialRole && data.specialRole !== "Nenhuma") && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>Perfil Especial / Idiomas</span>
              </div>
              <div className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                {data.specialRole}
                {data.languages && data.languages.length > 0 && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 block font-bold mt-0.5">
                    Idiomas: {data.languages.join(", ")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Atuação Anterior no ENEM */}
          <div className="p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Histórico de Atuação no ENEM</span>
              </div>
              {data.pastEditions && data.pastEditions.length > 0 && (
                <span className="text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {data.pastEditions.length} {data.pastEditions.length === 1 ? "edição realizada" : "edições realizadas"}
                </span>
              )}
            </div>

            {data.pastEditions && data.pastEditions.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {data.pastEditions.map((pe, idx) => (
                  <div 
                    key={idx}
                    className="p-2 bg-white dark:bg-[#101726] rounded-xl border border-amber-500/30 flex items-center gap-2"
                  >
                    <span className="font-black font-mono text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded text-xs">
                      {pe.year}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {pe.role || "Fiscal"}
                    </span>
                  </div>
                ))}
              </div>
            ) : data.hasWorkedEnem ? (
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ✓ Possui experiência prévia em edições anteriores do ENEM.
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                Primeira participação / Sem histórico de edições anteriores no ENEM.
              </p>
            )}
          </div>

          {/* Local de Origem / Histórico de Transferência de CLA */}
          <div className="p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Origem e Histórico de Transferências</span>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">CLA Atual:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{data.claName || "Coordenação Local"}</span>
              </div>
              {data.originalClaName && data.originalClaName !== data.claName && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">CLA de Cadastro Inicial:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{data.originalClaName}</span>
                </div>
              )}
            </div>

            {data.transferHistory && data.transferHistory.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Registros de Transferência entre Locais:</span>
                {data.transferHistory.map((th, i) => (
                  <div key={i} className="text-[11px] p-2 bg-indigo-500/10 rounded-lg text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2 font-medium">
                    <span>De <strong>{th.fromClaName}</strong> ➔ Para <strong>{th.toClaName}</strong></span>
                    <span className="text-[10px] font-mono text-slate-400">{new Date(th.date).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materiais Didáticos e de Apoio Acessados */}
          <div className="p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Material de Apoio e Capacitação Acessado</span>
              </div>
              {data.materialsAccessed && data.materialsAccessed.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {data.materialsAccessed.length} acessado(s)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500">
                  Nenhum registro ainda
                </span>
              )}
            </div>

            {data.materialsAccessed && data.materialsAccessed.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {data.materialsAccessed.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-white truncate">{item.materialTitle}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {new Date(item.accessedAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                O colaborador ainda não registrou o acesso aos materiais didáticos de apoio nesta edição.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080d1a]/70 shrink-0">
          {data.imageUrl ? (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-2 rounded-xl hover:bg-indigo-500/10 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Foto</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="btn-3d px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-black cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>

      {/* CLA Evaluation Modal Overlay */}
      {isEvalModalOpen && (
        <ClaEvaluationModal
          collaborator={collaborator || (data ? {
            id: data.id,
            name: data.name,
            cpf: data.cpf,
            assignedRole: localRole,
            assignedRoom: localRoom,
            isReserve: !localRole,
            photoUrl: data.imageUrl,
            claId: data.originalClaName || data.claName,
            claName: claName || data.claName,
            status: localStatus,
            claEvaluation: localEvaluation
          } as CollaboratorInfo : null)}
          currentUserName={currentUserName}
          claName={claName || data.claName}
          onSaveEvaluation={async (collaboratorId, evaluation) => {
            if (onSaveEvaluation) {
              await onSaveEvaluation(collaboratorId, evaluation);
            } else if (onUpdateCollaborator) {
              await onUpdateCollaborator(collaboratorId, { claEvaluation: evaluation || undefined });
            }
            setLocalEvaluation(evaluation || undefined);
            setActionSuccessMsg("Avaliação do CLA registrada com sucesso!");
            setTimeout(() => setActionSuccessMsg(null), 3000);
          }}
          onClose={() => setIsEvalModalOpen(false)}
        />
      )}
    </div>
  );
}
