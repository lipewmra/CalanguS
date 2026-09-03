import React, { useState } from "react";
import { CollaboratorInfo, BuildingInfo, UserProfile } from "../types";
import { 
  Users, Search, Filter, Building2, UserPlus, CheckCircle, 
  Clock, ShieldAlert, ArrowRight, Sparkles, MessageSquare, AlertCircle, X
} from "lucide-react";
import { ENEM_ROLES } from "./CollaboratorManager";
import FiscalAvatar from "./FiscalAvatar";
import { LightboxData } from "./ImageLightboxModal";

interface NetworkReservesPoolProps {
  allCollaborators: CollaboratorInfo[];
  currentClaId: string;
  currentUserName?: string;
  currentUserEmail?: string;
  buildingName?: string;
  allBuildings?: BuildingInfo[];
  allUsers?: UserProfile[];
  onRequestTransfer: (
    collab: CollaboratorInfo,
    targetCla: { uid: string; name: string; buildingName?: string; email?: string; phone?: string },
    notes?: string
  ) => Promise<void>;
  onViewPhoto?: (data: LightboxData) => void;
}

export default function NetworkReservesPool({
  allCollaborators,
  currentClaId,
  currentUserName,
  currentUserEmail,
  buildingName,
  allBuildings = [],
  allUsers = [],
  onRequestTransfer,
  onViewPhoto
}: NetworkReservesPoolProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialRole, setFilterSpecialRole] = useState<string>("all");
  const [filterExperience, setFilterExperience] = useState<string>("all");
  const [requestModalCollab, setRequestModalCollab] = useState<CollaboratorInfo | null>(null);
  const [requestNotes, setRequestNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filter reserve collaborators registered in OTHER CLAs who are approved/confirmed
  const otherReserves = allCollaborators.filter(
    c => (c.isReserve || !c.assignedRoom) && c.claId !== currentClaId && c.status === "Confirmado"
  );

  const getClaDisplayName = (targetClaId: string, customName?: string) => {
    const user = allUsers.find(u => u.uid === targetClaId);
    const b = allBuildings.find(item => item.claId === targetClaId);
    if (b?.name) return `${b.name}${user?.name ? ` (${user.name})` : ""}`;
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    if (customName && customName.trim()) return customName;
    return `CLA ${targetClaId.slice(0, 6)}`;
  };

  const filteredReserves = otherReserves.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm) ||
      (c.specialRole && c.specialRole.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSpecial = filterSpecialRole === "all" || c.specialRole === filterSpecialRole;
    const matchesExp = 
      filterExperience === "all" || 
      (filterExperience === "com_experiencia" && c.hasWorkedEnem) ||
      (filterExperience === "sem_experiencia" && !c.hasWorkedEnem);

    return matchesSearch && matchesSpecial && matchesExp;
  });

  const handleOpenRequestModal = (collab: CollaboratorInfo) => {
    setRequestModalCollab(collab);
    setRequestNotes("");
  };

  const handleConfirmRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalCollab) return;

    setIsSubmitting(true);
    try {
      await onRequestTransfer(
        requestModalCollab,
        {
          uid: currentClaId,
          name: currentUserName || "CLA Solicitante",
          buildingName: buildingName || "Local de Aplicação",
          email: currentUserEmail
        },
        requestNotes
      );

      setFeedback({
        text: `Pedido de liberação enviado para o CLA mantenedor de ${requestModalCollab.name}. Aguardando liberação!`,
        type: "success"
      });
      setRequestModalCollab(null);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error(err);
      setFeedback({ text: "Erro ao enviar solicitação de liberação.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner info */}
      <div className="p-5 bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border-2 border-indigo-500/20 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Banco Geral de Fiscais Reservas (Rede Compartilhada)</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {otherReserves.length} Disponíveis
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Consulte e solicite a liberação de fiscais reservas cadastrados em outras escolas para reforçar sua equipe no ENEM.
                O CLA mantenedor receberá uma solicitação imediata para autorizar a transferência.
              </p>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border-2 ${
          feedback.type === "success" 
            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" 
            : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30"
        }`}>
          {feedback.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#101726]/60 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF ou perfil especial..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterSpecialRole}
            onChange={(e) => setFilterSpecialRole(e.target.value)}
            className="bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-hidden"
          >
            <option value="all">Todas as Funções Especiais</option>
            <option value="Libras">Intérprete de Libras</option>
            <option value="Tradutor e Intérprete">Tradutor e Intérprete</option>
            <option value="Técnico de Informática">Técnico de Informática</option>
            <option value="Auxiliar de Acessibilidade">Auxiliar de Acessibilidade</option>
            <option value="Ledor/Transcritor">Ledor / Transcritor</option>
            <option value="Ledora de Gestante">Ledora de Gestante</option>
          </select>

          <select
            value={filterExperience}
            onChange={(e) => setFilterExperience(e.target.value)}
            className="bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-hidden"
          >
            <option value="all">Toda Experiência</option>
            <option value="com_experiencia">Com Experiência Anterior</option>
            <option value="sem_experiencia">Primeira Vez no ENEM</option>
          </select>
        </div>
      </div>

      {/* Grid of Available Reserves */}
      {filteredReserves.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400 font-bold space-y-2">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs">Nenhum fiscal reserva de outros locais encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReserves.map((collab) => {
            const originName = getClaDisplayName(collab.claId, collab.originalClaName || collab.claName);
            const isRequestedByMe = collab.transferRequest && collab.transferRequest.targetClaId === currentClaId;
            const isPendingOther = collab.transferRequest && collab.transferRequest.status === "Pendente" && collab.transferRequest.targetClaId !== currentClaId;

            return (
              <div
                key={collab.id}
                className="p-5 bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs hover:border-indigo-500/40 transition-all group"
              >
                <div className="space-y-3">
                  {/* Top: Name and Origin Tag */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FiscalAvatar
                          photoUrl={collab.photoUrl}
                          name={collab.name}
                          size="sm"
                          onClick={() => onViewPhoto?.({
                            imageUrl: collab.photoUrl || "",
                            name: collab.name,
                            role: "Fiscal Reserva",
                            cpf: collab.cpf,
                            claName: originName,
                            education: collab.education,
                            specialRole: collab.specialRole,
                            hasWorkedEnem: collab.hasWorkedEnem,
                            pastEditions: collab.pastEditions
                          })}
                        />
                        <button
                          type="button"
                          onClick={() => onViewPhoto?.({
                            imageUrl: collab.photoUrl || "",
                            name: collab.name,
                            role: "Fiscal Reserva",
                            cpf: collab.cpf,
                            claName: originName,
                            education: collab.education,
                            specialRole: collab.specialRole,
                            hasWorkedEnem: collab.hasWorkedEnem,
                            pastEditions: collab.pastEditions
                          })}
                          className="font-extrabold text-slate-900 dark:text-white text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate cursor-pointer text-left hover:underline"
                          title={`Ver detalhamento de ${collab.name}`}
                        >
                          {collab.name}
                        </button>
                      </div>
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                        Reserva
                      </span>
                    </div>
                    
                    {/* Origin CLA TAG */}
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 truncate" title={`Cadastrado no CLA: ${originName}`}>
                        <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="truncate">CLA: {originName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="bg-slate-50 dark:bg-[#070b13]/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[10px]">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">Escolaridade:</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{collab.education}</span>
                    </div>

                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">Exp. ENEM:</span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {collab.hasWorkedEnem ? `Sim, ${collab.pastEditions.length} edições` : "Primeira edição"}
                      </span>
                    </div>

                    {collab.specialRole && collab.specialRole !== "Nenhuma" && (
                      <div className="flex justify-between font-bold">
                        <span className="text-indigo-500">Função Especial:</span>
                        <span className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-extrabold">
                          {collab.specialRole}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {isRequestedByMe ? (
                    <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-center text-xs font-black border border-amber-500/20 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Solicitação Enviada (Aguardando CLA)</span>
                    </div>
                  ) : isPendingOther ? (
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-center text-xs font-bold">
                      <span>Em negociação com outro CLA</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenRequestModal(collab)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Solicitar Liberação / Transferir</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Request Modal */}
      {requestModalCollab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-black text-slate-900 dark:text-white">
                    Solicitar Fiscal Reserva
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O CLA mantenedor receberá este pedido para autorizar a transferência.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setRequestModalCollab(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#070b13] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                {requestModalCollab.name}
              </div>
              <div className="text-slate-500 font-mono">
                CPF: {requestModalCollab.cpf}
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-slate-700 dark:text-slate-300 font-bold">
                <span>CLA Mantenedor:</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {getClaDisplayName(requestModalCollab.claId, requestModalCollab.originalClaName || requestModalCollab.claName)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmRequest} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 mb-1">
                  Justificativa / Mensagem para o CLA (Opcional)
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Ex.: Precisamos de reforço para fiscais volantes ou atendimento especializado no prédio..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalCollab(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? "Enviando..." : "Enviar Solicitação"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
