import React, { useState, useMemo } from "react";
import { CollaboratorInfo, RoomDetails, BuildingInfo } from "../types";
import CollaboratorFailureModal from "./CollaboratorFailureModal";
import FiscalAvatar from "./FiscalAvatar";
import ImageLightboxModal, { LightboxData } from "./ImageLightboxModal";
import { 
  Users, ShieldAlert, BadgeInfo, HelpCircle, CornerDownRight, 
  Check, MoveRight, ArrowRight, UserCheck, Inbox, RefreshCw, Building2, 
  AlertCircle, Printer, Download, Sparkles, X, UserPlus, ArrowRightLeft,
  FileSpreadsheet, FileText, CheckCircle2, ChevronRight, Search, Shield,
  ExternalLink, Copy, CheckCheck, Eye, Filter, Footprints, Bath, Award,
  ChevronDown, ChevronUp, Layers, SlidersHorizontal
} from "lucide-react";
import { ENEM_ROLES } from "./CollaboratorManager";

interface DragAndDropProps {
  collaborators: CollaboratorInfo[];
  rooms: RoomDetails[];
  building?: BuildingInfo | null;
  claName?: string;
  onMove: (collabId: string, isReserve: boolean, assignedRoom: string, updatedRole?: string) => void;
  onUpdateCollaborator?: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  onSubstitute?: (replacedId: string, replacementId: string, roomNumber: string, targetRole?: string) => Promise<void>;
}

export default function DragAndDropReserves({ 
  collaborators, 
  rooms, 
  building, 
  claName, 
  onMove,
  onUpdateCollaborator,
  onSubstitute
}: DragAndDropProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [diagnoseCollab, setDiagnoseCollab] = useState<CollaboratorInfo | null>(null);
  const [lightboxData, setLightboxData] = useState<LightboxData | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Selected filter: "all" | "reserva" | specific role name
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [showAllocatedInFilter, setShowAllocatedInFilter] = useState<boolean>(true);

  // Modals state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [allocatingCollab, setAllocatingCollab] = useState<CollaboratorInfo | null>(null);
  const [substitutingTarget, setSubstitutingTarget] = useState<{ collab: CollaboratorInfo; roomNumber: string } | null>(null);

  // Form states for Allocation modal
  const [selectedTargetRoom, setSelectedTargetRoom] = useState<string>("");
  const [selectedTargetRole, setSelectedTargetRole] = useState<string>("Aplicador (Fiscal de Sala)");

  // Form states for Substitution modal
  const [substituteCandidateId, setSubstituteCandidateId] = useState<string>("");
  const [substituteSearchQuery, setSubstituteSearchQuery] = useState<string>("");
  const [substituteRole, setSubstituteRole] = useState<string>("Aplicador (Fiscal de Sala)");

  // Approved collaborators
  const approvedCollaborators = useMemo(() => {
    return collaborators.filter(c => c.status === "Confirmado");
  }, [collaborators]);

  const pendingCount = useMemo(() => {
    return collaborators.filter(c => c.status === "Pendente").length;
  }, [collaborators]);

  // Unallocated are those who do not have an assignedRoom
  const unallocated = useMemo(() => {
    return approvedCollaborators.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "");
  }, [approvedCollaborators]);
  
  // Reserves: unallocated AND (isReserve === true OR no assignedRole)
  const unallocatedReservas = useMemo(() => {
    return unallocated.filter(c => c.isReserve || !c.assignedRole || c.assignedRole.trim() === "");
  }, [unallocated]);

  // Total allocated across all rooms
  const totalAllocated = useMemo(() => {
    return approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "").length;
  }, [approvedCollaborators]);

  // Dynamic active roles list mapped with Menu 3 Quantitativo & Collaborators Count
  const activeRolesList = useMemo(() => {
    const baseRoles = (building?.customRoles && building.customRoles.length > 0)
      ? building.customRoles.filter(r => !r.hidden)
      : ENEM_ROLES.map(r => ({ name: r.name, desc: r.desc }));

    return baseRoles.map(r => {
      const targetQty = building?.rolesTargetQuantities?.[r.name] || 0;
      const allAssigned = approvedCollaborators.filter(c => c.assignedRole === r.name);
      const unallocatedMembers = allAssigned.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "");
      const allocatedMembers = allAssigned.filter(c => c.assignedRoom && c.assignedRoom.trim() !== "");
      
      return {
        name: r.name,
        desc: r.desc,
        targetQty,
        totalAssigned: allAssigned.length,
        unallocatedCount: unallocatedMembers.length,
        allocatedCount: allocatedMembers.length,
        allMembers: allAssigned,
        unallocatedMembers,
        allocatedMembers
      };
    });
  }, [building, approvedCollaborators]);

  // Functions that have > 0 assigned in Menu 3 OR target quantity > 0 in Menu 3
  const rolesWithQuantity = useMemo(() => {
    return activeRolesList.filter(r => r.totalAssigned > 0 || r.targetQty > 0);
  }, [activeRolesList]);

  // List of collaborators to display on the left panel based on active filter
  const displayedCollaborators = useMemo(() => {
    let list: CollaboratorInfo[] = [];

    if (selectedRoleFilter === "all") {
      list = unallocated;
    } else if (selectedRoleFilter === "reserva") {
      list = unallocatedReservas;
    } else {
      // Specific role selected: show members of that role
      const roleData = activeRolesList.find(r => r.name === selectedRoleFilter);
      if (roleData) {
        list = showAllocatedInFilter ? roleData.allMembers : roleData.unallocatedMembers;
      } else {
        list = approvedCollaborators.filter(c => c.assignedRole === selectedRoleFilter);
      }
    }

    // Apply text search
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(c => {
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchCpf = (c.cpf || "").toLowerCase().includes(q);
        const matchRole = (c.assignedRole || "").toLowerCase().includes(q);
        const matchRoom = (c.assignedRoom || "").toLowerCase().includes(q);
        return matchName || matchCpf || matchRole || matchRoom;
      });
    }

    return list;
  }, [selectedRoleFilter, unallocated, unallocatedReservas, activeRolesList, showAllocatedInFilter, approvedCollaborators, searchFilter]);

  // Helper to pick a clean icon for each role
  const getRoleIcon = (roleName: string) => {
    const r = roleName.toLowerCase();
    if (r.includes("volante")) return <Footprints className="w-3.5 h-3.5 text-indigo-500" />;
    if (r.includes("banheiro")) return <Bath className="w-3.5 h-3.5 text-cyan-500" />;
    if (r.includes("chefe")) return <Award className="w-3.5 h-3.5 text-emerald-500" />;
    if (r.includes("aplicador")) return <UserCheck className="w-3.5 h-3.5 text-teal-500" />;
    if (r.includes("libras") || r.includes("ledor") || r.includes("transcritor") || r.includes("acessibilidade")) {
      return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
    }
    if (r.includes("porteiro") || r.includes("portaria")) return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    if (r.includes("limpeza")) return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
    if (r.includes("informática") || r.includes("tecnico")) return <Building2 className="w-3.5 h-3.5 text-sky-500" />;
    return <UserCheck className="w-3.5 h-3.5 text-slate-500" />;
  };

  // Drag handles
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Drop to a specific classroom
  const handleDropToRoom = (e: React.DragEvent, roomName: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;
    
    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      const role = targetCollab.assignedRole && targetCollab.assignedRole.trim() !== "" 
        ? targetCollab.assignedRole 
        : "Aplicador (Fiscal de Sala)";
      
      onMove(id, false, roomName, role);
      setSuccessMsg(`Colaborador ${targetCollab.name} alocado na ${roomName} como ${role}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Drop to the Reserva (Unassociated) quadro
  const handleDropToReserves = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      onMove(id, true, "", "");
      setSuccessMsg(`${targetCollab.name} movido para Reservas.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Quick Action
  const quickAssignMobile = (collabId: string, dest: string) => {
    const targetCollab = collaborators.find(c => c.id === collabId);
    if (targetCollab) {
      if (dest === "RESERVA") {
        onMove(collabId, true, "", "");
        setSuccessMsg(`Movido para Reserva: ${targetCollab.name}`);
      } else if (dest === "DESALOCAR") {
        onMove(collabId, false, "", targetCollab.assignedRole || "Aplicador (Fiscal de Sala)");
        setSuccessMsg(`Desalocado para Quadros Associados: ${targetCollab.name}`);
      } else {
        const role = targetCollab.assignedRole || "Aplicador (Fiscal de Sala)";
        onMove(collabId, false, dest, role);
        setSuccessMsg(`Alocado: ${targetCollab.name} na ${dest}`);
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Open Click-to-Allocate Modal for a collaborator
  const handleOpenAllocateModal = (collab: CollaboratorInfo) => {
    setAllocatingCollab(collab);
    setSelectedTargetRoom(rooms[0]?.number || "Sala 01");
    if (collab.isReserve || !collab.assignedRole) {
      setSelectedTargetRole("Aplicador (Fiscal de Sala)");
    } else {
      setSelectedTargetRole(collab.assignedRole);
    }
  };

  // Confirm Click-to-Allocate
  const handleConfirmAllocation = () => {
    if (!allocatingCollab || !allocatingCollab.id || !selectedTargetRoom) return;

    onMove(allocatingCollab.id, false, selectedTargetRoom, selectedTargetRole);
    setSuccessMsg(`${allocatingCollab.name} alocado na ${selectedTargetRoom} como ${selectedTargetRole}!`);
    setTimeout(() => setSuccessMsg(null), 3500);
    setAllocatingCollab(null);
  };

  // Open Substitution Modal for an allocated collaborator in a room
  const handleOpenSubstituteModal = (collab: CollaboratorInfo, roomNumber: string) => {
    setSubstitutingTarget({ collab, roomNumber });
    setSubstituteSearchQuery("");
    setSubstituteCandidateId(unallocated[0]?.id || "");
    setSubstituteRole(collab.assignedRole || "Aplicador (Fiscal de Sala)");
  };

  // Confirm Substitution
  const handleConfirmSubstitution = async () => {
    if (!substitutingTarget || !substitutingTarget.collab.id || !substituteCandidateId) return;

    const replacedCollab = substitutingTarget.collab;
    const replacementCollab = collaborators.find(c => c.id === substituteCandidateId);

    if (!replacementCollab || !replacementCollab.id) return;

    try {
      if (onSubstitute) {
        await onSubstitute(
          replacedCollab.id, 
          replacementCollab.id, 
          substitutingTarget.roomNumber, 
          substituteRole
        );
      } else if (onUpdateCollaborator) {
        const now = new Date().toISOString();
        await onUpdateCollaborator(replacedCollab.id, {
          assignedRoom: "",
          isReserve: true,
          isSubstituted: true,
          substitutedBy: replacementCollab.name,
          substitutedById: replacementCollab.id,
          substitutedAt: now,
          substitutionTag: `Substituído por ${replacementCollab.name}`
        });

        await onUpdateCollaborator(replacementCollab.id, {
          assignedRoom: substitutingTarget.roomNumber,
          isReserve: false,
          assignedRole: substituteRole,
          substitutedFor: replacedCollab.name,
          isSubstituted: false,
          substitutionTag: `Substituto de ${replacedCollab.name}`
        });
      } else {
        onMove(replacedCollab.id, true, "", "");
        onMove(replacementCollab.id, false, substitutingTarget.roomNumber, substituteRole);
      }

      setSuccessMsg(
        `${replacedCollab.name} foi substituído por ${replacementCollab.name} e retornou à Reserva com a tag "Substituído".`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      setSubstitutingTarget(null);
    } catch (err) {
      console.error("Erro na substituição:", err);
    }
  };

  // Filter available candidates for substitution
  const availableCandidates = useMemo(() => {
    return unallocated.filter(c => {
      if (!c.id) return false;
      if (substitutingTarget && c.id === substitutingTarget.collab.id) return false;
      if (substituteSearchQuery.trim()) {
        const q = substituteSearchQuery.toLowerCase().trim();
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchCpf = (c.cpf || "").toLowerCase().includes(q);
        const matchRole = (c.assignedRole || "").toLowerCase().includes(q);
        return matchName || matchCpf || matchRole;
      }
      return true;
    });
  }, [unallocated, substitutingTarget, substituteSearchQuery]);

  // Download printable HTML report
  const handleDownloadHtmlReport = () => {
    const html = generatePrintableHtml(building, claName, rooms, approvedCollaborators, rolesWithQuantity);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Relatorio_Ensalamento_ENEM2026_${building?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Local"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    setSuccessMsg("Relatório exportado com sucesso! Arquivo HTML pronto para impressão ou salvamento em PDF.");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open printable view in new window/tab
  const handleOpenPrintWindow = () => {
    const html = generatePrintableHtml(building, claName, rooms, approvedCollaborators, rolesWithQuantity);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      handleDownloadHtmlReport();
    }
  };

  // Copy textual summary to clipboard
  const handleCopyReportText = () => {
    let text = `========================================================\n`;
    text += `EXAME NACIONAL DO ENSINO MÉDIO - ENEM 2026\n`;
    text += `MAPA DE ENSALAMENTO E ALOCAÇÃO DE FISCAIS\n`;
    text += `Local: ${building?.name || "Local de Aplicação"}\n`;
    text += `CLA: ${claName || "Coordenação"}\n`;
    text += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    text += `========================================================\n\n`;

    rooms.forEach(room => {
      const roomFiscais = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === room.number);
      text += `🚪 SALA: ${room.number} (${room.floor}) - CAP: ${room.capacity} cand.\n`;
      if (roomFiscais.length === 0) {
        text += `   (Nenhum fiscal alocado)\n`;
      } else {
        roomFiscais.forEach((f, idx) => {
          text += `   ${idx + 1}. ${f.name} | CPF: ${f.cpf} | Função: ${f.assignedRole || "Aplicador"} ${f.substitutionTag ? `[${f.substitutionTag}]` : ""}\n`;
        });
      }
      text += `\n`;
    });

    rolesWithQuantity.forEach(role => {
      if (role.allMembers.length > 0) {
        text += `👥 ${role.name.toUpperCase()} (${role.allMembers.length}):\n`;
        role.allMembers.forEach((m, idx) => {
          text += `   ${idx + 1}. ${m.name} | CPF: ${m.cpf} | ${m.assignedRoom ? `Alocado: ${m.assignedRoom}` : "Disponível"}\n`;
        });
        text += `\n`;
      }
    });

    if (unallocatedReservas.length > 0) {
      text += `📥 BANCO DE RESERVAS (${unallocatedReservas.length}):\n`;
      unallocatedReservas.forEach((r, idx) => {
        text += `   ${idx + 1}. ${r.name} | CPF: ${r.cpf} | Tel: ${r.whatsapp || "—"}\n`;
      });
      text += `\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="drag-drop-reserves-container">
      
      {/* Informative Header Banner with PDF Export Button */}
      <div className="mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
            <span>🏷️ Organização de Fiscais e Ensalamento</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
              DRAG-N-DROP & CLIQUE
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
            Exibindo todas as funções atribuídas e necessárias definidas no <strong>Menu 3 (Associação de Funções)</strong>. Clique nos botões para filtrar e alocar.
          </p>
        </div>

        {/* Action Buttons: PDF Export & Print */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="cursor-pointer px-4 py-2.5 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all duration-200 active:scale-95 shadow-[3px_3px_0px_0px_#065f46] flex items-center gap-2"
            title="Abrir visualização e opções de exportação em PDF e impressão oficial"
          >
            <Printer className="w-4 h-4" />
            <span>Exportar Relatório PDF</span>
          </button>
          <button
            onClick={handleDownloadHtmlReport}
            className="cursor-pointer px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 transition active:scale-95 flex items-center gap-1.5"
            title="Baixar diretamente arquivo HTML formatado para impressão"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar HTML</span>
          </button>
        </div>
      </div>

      {/* Success Notification ticker */}
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Notice */}
      {pendingCount > 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              Há <strong>{pendingCount} fiscal(is) pendente(s) de aprovação</strong> no <strong>Menu 2 (Fiscais)</strong>. Apenas fiscais aprovados pelo CLA aparecem para alocação nas salas de provas.
            </span>
          </div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* LEFT COLUMNS (2 Columns): THE ALLOCATION LANES & DYNAMIC FUNÇÕES ATRIBUÍDAS NO MENU 3 */}
        <div className="xl:col-span-2 space-y-4">
          
          {/* Header & Dynamic Filter Pills for all functions with > 0 */}
          <div className="pb-3 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-display font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                  <span>Funções Atribuídas (Menu 3)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {rolesWithQuantity.length} funções ativas com fiscais ou meta &gt; 0
                </p>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-black px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {unallocated.length} Disponíveis
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filtrar por nome, CPF ou função..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* DYNAMIC FUNCTION PILLS: ALL ROLES WITH > 0 IN MENU 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>Clique para filtrar por função:</span>
                {selectedRoleFilter !== "all" && (
                  <button
                    onClick={() => setSelectedRoleFilter("all")}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-extrabold"
                  >
                    Ver Todos
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {/* 1. All Button */}
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRoleFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <span>Todos Disponíveis</span>
                  <span className="font-mono text-[9px] opacity-80">({unallocated.length})</span>
                </button>

                {/* 2. Reserva Geral Button */}
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter("reserva")}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRoleFilter === "reserva"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                  }`}
                  title="Fiscais sem função específica"
                >
                  <Inbox className="w-3 h-3" />
                  <span>Reserva</span>
                  <span className="font-mono text-[9px]">({unallocatedReservas.length})</span>
                </button>

                {/* 3. DYNAMICALLY RENDER ALL FUNCTIONS WITH > 0 ATTRIBUTED OR TARGET > 0 */}
                {rolesWithQuantity.map((role) => {
                  const isSelected = selectedRoleFilter === role.name;
                  return (
                    <button
                      key={role.name}
                      type="button"
                      onClick={() => setSelectedRoleFilter(role.name)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/50"
                          : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20"
                      }`}
                      title={`${role.name}: ${role.totalAssigned} associados (${role.unallocatedCount} disp. / ${role.allocatedCount} alocados)${role.targetQty > 0 ? ` - Meta: ${role.targetQty}` : ''}`}
                    >
                      {getRoleIcon(role.name)}
                      <span className="truncate max-w-[130px]">{role.name}</span>
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10">
                        {role.totalAssigned}
                        {role.targetQty > 0 ? `/${role.targetQty}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle to show already allocated staff when filtering by a specific function */}
            {selectedRoleFilter !== "all" && selectedRoleFilter !== "reserva" && (
              <div className="flex items-center justify-between pt-1 text-[10.5px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  Exibindo fiscais da função: <strong className="text-indigo-600 dark:text-indigo-400">{selectedRoleFilter}</strong>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={showAllocatedInFilter}
                    onChange={(e) => setShowAllocatedInFilter(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mostrar também já alocados</span>
                </label>
              </div>
            )}

          </div>

          {/* List of collaborators matching the active filter */}
          <div 
            className="grid grid-cols-1 gap-3 max-h-[750px] overflow-y-auto pr-1"
            style={{ minHeight: "420px" }}
          >
            {displayedCollaborators.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Nenhum fiscal encontrado para a função selecionada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleFilter("all");
                    setSearchFilter("");
                  }}
                  className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Ver todos os fiscais disponíveis
                </button>
              </div>
            ) : (
              displayedCollaborators.map(collab => {
                const isAlreadyAllocated = Boolean(!collab.isReserve && collab.assignedRoom && collab.assignedRoom.trim() !== "");

                return (
                  <div
                    key={collab.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, collab.id!)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleOpenAllocateModal(collab)}
                    className={`p-3 bg-white dark:bg-[#101726]/80 border-2 rounded-xl shadow-xs transition cursor-pointer group relative ${
                      isAlreadyAllocated 
                        ? "border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20" 
                        : "border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-md"
                    } ${draggedId === collab.id ? 'opacity-45' : ''}`}
                    title="Clique para alocar em uma sala ou definir função"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FiscalAvatar 
                          photoUrl={collab.photoUrl} 
                          name={collab.name} 
                          size="sm"
                          onClick={(e) => {
                            e?.stopPropagation();
                            setLightboxData({
                              imageUrl: collab.photoUrl || '',
                              name: collab.name,
                              role: collab.assignedRole || (collab.isReserve ? 'Reserva Geral' : 'Disponível'),
                              cpf: collab.cpf,
                              claName: collab.originalClaName || collab.claName,
                              specialRole: collab.specialRole,
                              hasWorkedEnem: collab.hasWorkedEnem,
                              pastEditions: collab.pastEditions
                            });
                          }}
                        />
                        <div className="truncate min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-extrabold text-slate-800 dark:text-white text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" title={collab.name}>
                              {collab.name}
                            </h5>
                            <span className="opacity-0 group-hover:opacity-100 transition text-[9px] text-emerald-500 font-bold flex items-center shrink-0">
                              ⚡ Alocar
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-400 font-mono font-bold mt-0.5">{collab.cpf}</p>
                          
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {/* Role Badge */}
                            {collab.assignedRole ? (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/20">
                                {getRoleIcon(collab.assignedRole)}
                                <span>{collab.assignedRole}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20">
                                <Inbox className="w-2.5 h-2.5 text-amber-500" />
                                <span>Reserva Geral</span>
                              </span>
                            )}

                            {/* Room Badge if Allocated */}
                            {isAlreadyAllocated && (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                🚪 Alocado: {collab.assignedRoom}
                              </span>
                            )}

                            {/* TAG SUBSTITUÍDO / SUBSTITUTO */}
                            {(collab.isSubstituted || collab.substitutionTag || collab.substitutedBy) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[8px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded"
                                title={collab.substitutionTag || `Substituído por ${collab.substitutedBy}`}
                              >
                                <ArrowRightLeft className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>{collab.substitutionTag || `Substituído (${collab.substitutedBy})`}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAllocateModal(collab);
                        }}
                        className="px-2 py-1 text-[9px] font-extrabold uppercase rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition cursor-pointer shrink-0"
                      >
                        {isAlreadyRemapped(collab) ? "Remanejar" : "Alocar"}
                      </button>
                    </div>
                    
                    {collaboratorWarnings(collab, setDiagnoseCollab)}

                    {/* Fast Mobile Action */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 block lg:hidden" onClick={e => e.stopPropagation()}>
                      <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Alocar em:</label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            quickAssignMobile(collab.id!, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full text-[10px] bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-bold"
                      >
                        <option value="">-- Escolha Sala --</option>
                        {rooms.map(r => (
                          <option key={r.number} value={r.number}>{r.number}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMNS (3 Columns): THE CLASSROOM TESTING LABS */}
        <div className="xl:col-span-3">
          <div className="mb-4 flex items-center justify-between pb-2 border-b-2 border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-display font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-extrabold flex items-center gap-2">
                <span>🏢 Salas do Bloco de Provas</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full">
                  {totalAllocated} fiscais alocados
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Arraste fiscais para as salas ou use o botão de substituição direta
              </p>
            </div>
            <span className="text-[10.5px] text-slate-400 font-bold font-sans">
              Total: {rooms.length} Salas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map((room) => {
              // Fiscais associated with room
              const assignedCollabs = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === room.number);
              
              return (
                <div
                  key={room.number}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToRoom(e, room.number)}
                  className="bg-slate-50 dark:bg-[#070b13]/55 border-2 border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-500/5 transition min-h-[220px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.02)]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800/60 pb-2">
                      <div className="flex flex-col">
                        <span className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                          🚪 {room.number}
                        </span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold font-sans mt-0.5">
                          📍 {room.floor}
                        </span>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        {assignedCollabs.length} Alocados
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[110px] max-h-[260px] overflow-y-auto pr-1">
                      {assignedCollabs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-1">
                          <p className="text-[10px] italic font-medium">Sem equipe alocada</p>
                          <p className="text-[8px] font-black uppercase text-slate-400 dark:text-emerald-400/60">Arraste ou clique para alocar</p>
                        </div>
                      ) : (
                        assignedCollabs.map((collab) => (
                          <div 
                            key={collab.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, collab.id!)}
                            onDragEnd={handleDragEnd}
                            className="bg-white dark:bg-[#101726]/80 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-2.5 flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-500/20 transition shadow-xs pr-2.5 text-xs font-bold gap-2 cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                              <FiscalAvatar 
                                photoUrl={collab.photoUrl} 
                                name={collab.name} 
                                size="xs"
                                onClick={(e) => {
                                  e?.stopPropagation();
                                  setLightboxData({
                                    imageUrl: collab.photoUrl || '',
                                    name: collab.name,
                                    role: collab.assignedRole || 'Fiscal de Sala',
                                    cpf: collab.cpf,
                                    claName: collab.originalClaName || collab.claName,
                                    specialRole: collab.specialRole,
                                    hasWorkedEnem: collab.hasWorkedEnem,
                                    pastEditions: collab.pastEditions
                                  });
                                }}
                              />
                              <div className="truncate min-w-0 flex-1">
                                <span className="font-extrabold text-slate-800 dark:text-white block truncate text-xs" title={collab.name}>{collab.name}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {collab.assignedRole ? (
                                    <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-1 rounded truncate max-w-[100px]" title={collab.assignedRole}>
                                      {collab.assignedRole}
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1 rounded">
                                      Reserva
                                    </span>
                                  )}

                                  {/* TAG SUBSTITUTO */}
                                  {collab.substitutionTag && (
                                    <span 
                                      className="text-[8px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1 rounded truncate max-w-[110px]"
                                      title={collab.substitutionTag}
                                    >
                                      {collab.substitutionTag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions: Substituir & Desalocar */}
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenSubstituteModal(collab, room.number)}
                                title="Substituir este colaborador por outro fiscal"
                                className="text-[8.5px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded transition uppercase cursor-pointer flex items-center gap-1 active:scale-95"
                              >
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                <span>Substituir</span>
                              </button>
                              <button
                                onClick={() => quickAssignMobile(collab.id!, "DESALOCAR")}
                                title="Desalocar para o seu quadro de função"
                                className="text-[8px] font-black text-indigo-650 dark:text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded transition uppercase cursor-pointer text-center"
                              >
                                Desalocar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {assignedCollabs.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 font-mono">
                        FUNÇÕES NA SALA:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(
                          assignedCollabs.reduce((acc, current) => {
                            const role = current.assignedRole || "Aplicador";
                            acc[role] = (acc[role] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([role, count]) => (
                          <span 
                            key={role} 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20"
                          >
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{count}x</span>
                            <span className="truncate max-w-[125px]" title={role}>{role}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-[8.5px] text-slate-400 dark:text-slate-500 flex items-center justify-between font-mono font-bold">
                    <span>ZONA DE SOLTURA</span>
                    <span>CAP: {room.capacity} CAND.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CLICK-TO-ALLOCATE MODAL (CHOOSE ROOM & ROLE) */}
      {/* ========================================================================= */}
      {allocatingCollab && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-lg rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                  ⚡
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 dark:text-white text-base">
                    Alocar Fiscal na Sala de Prova
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina a sala de aplicação e o cargo do colaborador
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllocatingCollab(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              
              {/* Collab Info Card */}
              <div className="p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                <FiscalAvatar
                  photoUrl={allocatingCollab.photoUrl}
                  name={allocatingCollab.name}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {allocatingCollab.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>CPF: {allocatingCollab.cpf}</span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {allocatingCollab.isReserve ? "Banco de Reserva" : (allocatingCollab.assignedRole || "Disponível")}
                    </span>
                  </div>
                  {allocatingCollab.substitutionTag && (
                    <div className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {allocatingCollab.substitutionTag}
                    </div>
                  )}
                </div>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  1. Selecione a Sala de Destino:
                </label>
                <select
                  value={selectedTargetRoom}
                  onChange={(e) => setSelectedTargetRoom(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  {rooms.map((r) => {
                    const currentCount = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === r.number).length;
                    return (
                      <option key={r.number} value={r.number}>
                        {r.number} — {r.floor} (Cap: {r.capacity} cand. | {currentCount} fiscais alocados)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Role Selection (Highlight functions with > 0) */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  2. Cargo / Função na Sala:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTargetRole("Chefe de Sala")}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                      selectedTargetRole === "Chefe de Sala"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">Chefe de Sala</span>
                      {selectedTargetRole === "Chefe de Sala" && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">
                      Responsável pela abertura de malote e cronômetro
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTargetRole("Aplicador (Fiscal de Sala)")}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                      selectedTargetRole === "Aplicador (Fiscal de Sala)"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">Aplicador (Fiscal)</span>
                      {selectedTargetRole === "Aplicador (Fiscal de Sala)" && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">
                      Fiscalização presencial e preenchimento de ata
                    </span>
                  </button>
                </div>

                {/* Secondary Roles Selector with all roles that have > 0 */}
                <div className="mt-2.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Ou selecione outra função associada:
                  </label>
                  <select
                    value={selectedTargetRole}
                    onChange={(e) => setSelectedTargetRole(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Chefe de Sala">Chefe de Sala</option>
                    <option value="Aplicador (Fiscal de Sala)">Aplicador (Fiscal de Sala)</option>
                    {rolesWithQuantity
                      .filter(r => r.name !== "Chefe de Sala" && r.name !== "Aplicador (Fiscal de Sala)" && r.name !== "Aplicador")
                      .map(r => (
                        <option key={r.name} value={r.name}>
                          {r.name} ({r.totalAssigned} associados)
                        </option>
                      ))}
                    <option value="Fiscal Volante">Fiscal Volante (Corredores)</option>
                    <option value="Fiscal de Banheiro">Fiscal de Banheiro (Sanitários)</option>
                    <option value="Auxiliar de Acessibilidade">Auxiliar de Acessibilidade</option>
                    <option value="Interprete de Libras">Tradutor / Intérprete de Libras</option>
                    <option value="Ledor/Transcritor">Fiscal Especializado (Ledor/Transcritor)</option>
                    <option value="Porteiro">Porteiro / Controle de Portões</option>
                    <option value="Auxiliar de Limpeza">Auxiliar de Limpeza</option>
                    <option value="Tecnico Informática">Técnico em Informática</option>
                    <option value="Fiscal de Apoio / Recepção">Fiscal de Apoio / Recepção</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-[#070b13] border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAllocatingCollab(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAllocation}
                className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Alocação</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COLLABORATOR SUBSTITUTION MODAL */}
      {/* ========================================================================= */}
      {substitutingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-xl rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span>Substituição de Fiscal</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {substitutingTarget.roomNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O fiscal atual retornará à Reserva com a tag "Substituído"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubstitutingTarget(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              
              {/* Fiscal to be replaced */}
              <div className="p-3.5 rounded-xl border-2 border-rose-200 dark:border-rose-900/40 bg-rose-500/[0.04] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FiscalAvatar
                    photoUrl={substitutingTarget.collab.photoUrl}
                    name={substitutingTarget.collab.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400 block">
                      Fiscal Sendo Substituído:
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                      {substitutingTarget.collab.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      CPF: {substitutingTarget.collab.cpf} • {substitutingTarget.collab.assignedRole || "Aplicador"}
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0">
                  Vai p/ Reserva
                </span>
              </div>

              {/* Choose Replacement Candidate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Selecione o Fiscal Substituto:
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {availableCandidates.length} disponíveis
                  </span>
                </div>

                {/* Candidate Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={substituteSearchQuery}
                    onChange={(e) => setSubstituteSearchQuery(e.target.value)}
                    placeholder="Buscar substituto por nome ou CPF..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Candidate List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 border-2 border-slate-100 dark:border-slate-800 rounded-xl">
                  {availableCandidates.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">
                      Nenhum fiscal disponível na reserva para substituição imediata.
                    </div>
                  ) : (
                    availableCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        onClick={() => setSubstituteCandidateId(candidate.id || "")}
                        className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-2 ${
                          substituteCandidateId === candidate.id
                            ? "bg-amber-500/15 border-amber-500 shadow-xs"
                            : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FiscalAvatar
                            photoUrl={candidate.photoUrl}
                            name={candidate.name}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">
                              {candidate.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              CPF: {candidate.cpf} • {candidate.assignedRole || "Reserva"}
                            </span>
                          </div>
                        </div>

                        {substituteCandidateId === candidate.id && (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Function for the new fiscal */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Função do Novo Fiscal na Sala:
                </label>
                <select
                  value={substituteRole}
                  onChange={(e) => setSubstituteRole(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="Chefe de Sala">Chefe de Sala</option>
                  <option value="Aplicador (Fiscal de Sala)">Aplicador (Fiscal de Sala)</option>
                  <option value="Fiscal Volante">Fiscal Volante</option>
                  <option value="Fiscal de Banheiro">Fiscal de Banheiro</option>
                  <option value="Auxiliar de Acessibilidade">Auxiliar de Acessibilidade</option>
                  <option value="Interprete de Libras">Tradutor e Intérprete de Libras</option>
                  <option value="Ledor/Transcritor">Fiscal Especializado (Ledor/Transcritor)</option>
                </select>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-[#070b13] border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubstitutingTarget(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubstitution}
                disabled={!substituteCandidateId}
                className="px-5 py-2.5 text-xs font-extrabold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Efetuar Substituição</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: OFFICIAL PDF / PRINT EXPORT MODAL & IMMEDIATE ACTIONS */}
      {/* ========================================================================= */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Action Bar */}
            <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg">
                    Relatório Oficial de Ensalamento e Fiscais
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium">
                    Salas, andares, fiscais alocados, volantes, banheiros e reservas (com CPF)
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadHtmlReport}
                  className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                  title="Baixar arquivo HTML/PDF para abrir e imprimir diretamente"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Relatório (HTML/PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPrintWindow}
                  className="cursor-pointer px-3 py-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                  title="Abrir relatório formatado em nova aba do navegador"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span>Nova Aba</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReportText}
                  className="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  title="Copiar dados formatados para colar no Excel ou WhatsApp"
                >
                  {copiedSuccess ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSuccess ? "Copiado!" : "Copiar"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-6">
              
              {/* Document Official Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-700">
                    EXAME NACIONAL DO ENSINO MÉDIO — ENEM 2026
                  </span>
                  <h2 className="text-xl font-display font-black uppercase text-slate-900 mt-0.5">
                    MAPA DE ENSALAMENTO E ALOCAÇÃO DE FISCAIS
                  </h2>
                  <div className="text-xs text-slate-600 font-semibold mt-1">
                    <span>Prédio / Local de Prova: <strong>{building?.name || "Local de Aplicação Não Definido"}</strong></span>
                    <span className="mx-2">•</span>
                    <span>Coordenação: <strong>{claName || building?.claId || "CLA"}</strong></span>
                  </div>
                </div>

                <div className="text-right text-xs font-mono font-bold text-slate-500 shrink-0">
                  <div>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
                  <div>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total de Salas:</span>
                  <strong className="text-base font-mono text-slate-900">{rooms.length} Salas</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Fiscais em Salas:</span>
                  <strong className="text-base font-mono text-emerald-700">{totalAllocated} Alocados</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Associados:</span>
                  <strong className="text-base font-mono text-indigo-700">{approvedCollaborators.filter(c => c.assignedRole).length} Fiscais</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Fiscais na Reserva:</span>
                  <strong className="text-base font-mono text-amber-700">{unallocatedReservas.length} Fiscais</strong>
                </div>
              </div>

              {/* Rooms and Allocated People */}
              <div className="space-y-5">
                <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                  1. Distribuição de Fiscais por Sala de Aplicação
                </h4>
                
                {rooms.map((room) => {
                  const roomFiscais = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === room.number);
                  return (
                    <div 
                      key={room.number}
                      className="border-2 border-slate-300 rounded-xl overflow-hidden"
                    >
                      {/* Room Header */}
                      <div className="bg-slate-100 px-4 py-2 border-b-2 border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-display font-black text-sm text-slate-900 uppercase">
                            🚪 {room.number}
                          </span>
                          <span className="text-xs font-bold text-emerald-800">
                            Pavimento / Andar: {room.floor}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-600">
                          Capacidade: {room.capacity} candidatos • {roomFiscais.length} fiscal(is)
                        </div>
                      </div>

                      {/* Room Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                            <th className="py-2 px-3 w-10">#</th>
                            <th className="py-2 px-3">Nome do Colaborador</th>
                            <th className="py-2 px-3 w-36">CPF</th>
                            <th className="py-2 px-3 w-48">Cargo / Função</th>
                            <th className="py-2 px-3 w-36">Status / Histórico</th>
                            <th className="py-2 px-3 w-44">Assinatura do Fiscal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {roomFiscais.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-3 px-3 text-center text-slate-400 italic text-[11px]">
                                Nenhum colaborador alocado para esta sala.
                              </td>
                            </tr>
                          ) : (
                            roomFiscais.map((fiscal, fIdx) => (
                              <tr key={fiscal.id || fiscal.cpf} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{fIdx + 1}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {fiscal.name}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                  {fiscal.cpf}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-indigo-800">
                                  {fiscal.assignedRole || "Aplicador"}
                                </td>
                                <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-600">
                                  {fiscal.substitutionTag || "Efetivo"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="h-4 border-b border-slate-400"></div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              {/* Functions from Menu 3 in the Report */}
              {rolesWithQuantity.filter(r => r.allMembers.length > 0).map(role => (
                <div key={role.name} className="space-y-4 pt-2">
                  <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                    Equipe de {role.name} ({role.allMembers.length} Fiscais)
                  </h4>
                  <div className="border-2 border-indigo-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-50 border-b border-indigo-200 text-[10px] font-extrabold uppercase text-indigo-900">
                          <th className="py-2 px-3 w-10">#</th>
                          <th className="py-2 px-3">Nome Completo</th>
                          <th className="py-2 px-3 w-36">CPF</th>
                          <th className="py-2 px-3 w-48">Função</th>
                          <th className="py-2 px-3 w-36">Alocação Atual</th>
                          <th className="py-2 px-3 w-44">Assinatura</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100">
                        {role.allMembers.map((fiscal, fIdx) => (
                          <tr key={fiscal.id || fiscal.cpf}>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{fIdx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{fiscal.name}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{fiscal.cpf}</td>
                            <td className="py-2.5 px-3 font-bold text-indigo-800">{fiscal.assignedRole}</td>
                            <td className="py-2.5 px-3 text-[10px] font-bold text-slate-600">
                              {fiscal.assignedRoom ? `Sala ${fiscal.assignedRoom}` : "Circulação / Apoio"}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="h-4 border-b border-slate-400"></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Reserves Section in the Report */}
              {unallocatedReservas.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                    Banco de Fiscais de Reserva Geral ({unallocatedReservas.length} Fiscais)
                  </h4>
                  <div className="border-2 border-amber-300 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-amber-50 border-b border-amber-200 text-[10px] font-extrabold uppercase text-amber-900">
                          <th className="py-2 px-3 w-10">#</th>
                          <th className="py-2 px-3">Nome</th>
                          <th className="py-2 px-3 w-36">CPF</th>
                          <th className="py-2 px-3 w-36">Telefone</th>
                          <th className="py-2 px-3">Observação / Histórico de Substituição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {unallocatedReservas.map((res, rIdx) => (
                          <tr key={res.id || res.cpf}>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{rIdx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{res.name}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{res.cpf}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">{res.whatsapp || "—"}</td>
                            <td className="py-2.5 px-3 text-[10px] text-amber-900 font-semibold">
                              {res.substitutionTag || "Reserva Geral (Pronto para substituição)"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Signatures at bottom */}
              <div className="pt-8 border-t-2 border-slate-400 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="h-10 border-b-2 border-slate-700 max-w-xs mx-auto mb-2"></div>
                  <strong className="block text-slate-900 uppercase font-display">
                    {claName || "Coordenador de Local de Aplicação (CLA)"}
                  </strong>
                  <span className="text-[10px] text-slate-500">Responsável pelo Local de Aplicação</span>
                </div>
                <div>
                  <div className="h-10 border-b-2 border-slate-700 max-w-xs mx-auto mb-2"></div>
                  <strong className="block text-slate-900 uppercase font-display">
                    Supervisão Geral ENEM 2026
                  </strong>
                  <span className="text-[10px] text-slate-500">Validação e Encerramento de Ensalamento</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* DIAGNOSTIC FAILURE MODAL */}
      <CollaboratorFailureModal
        isOpen={!!diagnoseCollab}
        collaborator={diagnoseCollab}
        onClose={() => setDiagnoseCollab(null)}
      />

      {/* IMAGE LIGHTBOX MODAL */}
      <ImageLightboxModal
        data={lightboxData}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
}

function isAlreadyRemapped(collab: CollaboratorInfo): boolean {
  return Boolean(!collab.isReserve && collab.assignedRoom && collab.assignedRoom.trim() !== "");
}

function collaboratorWarnings(collab: CollaboratorInfo, onDiagnose?: (c: CollaboratorInfo) => void) {
  if (collab.orionStatus === "Erro") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDiagnose?.(collab);
        }}
        title="Clique para abrir detalhes da falha cadastral"
        className="mt-2 w-full text-left text-[9px] text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 dark:text-rose-400 p-1.5 rounded-lg flex items-center justify-between gap-1 border border-rose-500/30 cursor-pointer group active:scale-95 transition"
      >
        <div className="flex items-center gap-1 min-w-0">
          <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0 group-hover:animate-bounce" />
          <span className="font-extrabold text-[8.5px] text-rose-600 dark:text-rose-400 truncate">{collab.orionErrors[0] || "Inconsistência Orion"}</span>
        </div>
        <span className="text-[8px] bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1 py-0.2 rounded font-mono font-bold shrink-0">Ver</span>
      </button>
    );
  }
  return null;
}

/**
 * Generates a complete, self-contained, printable HTML document with styling
 */
function generatePrintableHtml(
  building: BuildingInfo | null | undefined,
  claName: string | undefined,
  rooms: RoomDetails[],
  collaborators: CollaboratorInfo[],
  rolesWithQuantity: any[]
): string {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const totalAllocated = collaborators.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "").length;
  const reservas = collaborators.filter(c => c.isReserve || !c.assignedRole || c.assignedRole.trim() === "");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Mapa de Ensalamento ENEM 2026 - ${building?.name || 'Local'}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.35; color: #111827; background: #fff; margin: 0; padding: 20px; }
    .header { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .tag { font-family: monospace; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #047857; }
    h1 { margin: 4px 0 6px; font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .sub { font-size: 11px; color: #374151; font-weight: 600; }
    .meta { font-family: monospace; font-size: 10px; font-weight: 700; text-align: right; color: #4b5563; }
    .stats { display: flex; gap: 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; }
    .stat-box { flex: 1; }
    .stat-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #6b7280; display: block; }
    .stat-val { font-family: monospace; font-size: 13px; font-weight: 800; color: #111827; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #9ca3af; padding-bottom: 4px; margin: 18px 0 10px; color: #1f2937; }
    .room-card { border: 1.5px solid #9ca3af; border-radius: 6px; margin-bottom: 14px; page-break-inside: avoid; overflow: hidden; }
    .room-hdr { background: #e5e7eb; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #9ca3af; font-weight: 800; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 10.5px; }
    th { background: #f9fafb; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 5px 8px; border-bottom: 1px solid #d1d5db; color: #4b5563; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
    .sig-line { border-bottom: 1px solid #9ca3af; height: 16px; width: 100%; }
    .sig-grid { display: flex; gap: 30px; margin-top: 35px; padding-top: 15px; border-top: 1.5px solid #9ca3af; page-break-inside: avoid; }
    .sig-block { flex: 1; text-align: center; font-size: 10px; }
    .sig-box-line { border-bottom: 1.5px solid #111827; height: 28px; margin: 0 auto 6px; max-width: 220px; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; background: #e0e7ff; color: #3730a3; }
    .print-btn-bar { margin-bottom: 20px; text-align: right; }
    .btn { background: #059669; color: white; border: none; padding: 8px 16px; font-weight: 800; border-radius: 6px; cursor: pointer; font-size: 12px; }
    @media print { .print-btn-bar { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Imprimir Agora / Salvar PDF</button>
  </div>

  <div class="header">
    <div>
      <span class="tag">EXAME NACIONAL DO ENSINO MÉDIO — ENEM 2026</span>
      <h1>MAPA DE ENSALAMENTO E ALOCAÇÃO DE FISCAIS</h1>
      <div class="sub">
        Local de Prova: <strong>${building?.name || 'Local Não Definido'}</strong> | Coordenação: <strong>${claName || 'CLA'}</strong>
      </div>
    </div>
    <div class="meta">
      <div>Data: ${dateStr}</div>
      <div>Hora: ${timeStr}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat-box"><span class="stat-label">Total de Salas:</span><span class="stat-val">${rooms.length}</span></div>
    <div class="stat-box"><span class="stat-label">Fiscais em Sala:</span><span class="stat-val">${totalAllocated}</span></div>
    <div class="stat-box"><span class="stat-label">Total Associados:</span><span class="stat-val">${collaborators.filter(c => c.assignedRole).length}</span></div>
    <div class="stat-box"><span class="stat-label">Banco de Reservas:</span><span class="stat-val">${reservas.length}</span></div>
  </div>

  <div class="section-title">1. Distribuição de Fiscais por Sala de Aplicação</div>
  ${rooms.map(room => {
    const rFiscais = collaborators.filter(c => !c.isReserve && c.assignedRoom === room.number);
    return `
    <div class="room-card">
      <div class="room-hdr">
        <span>🚪 ${room.number} — Pavimento / Andar: ${room.floor}</span>
        <span>Capacidade: ${room.capacity} candidatos | ${rFiscais.length} fiscal(is)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Nome do Colaborador</th>
            <th style="width: 120px;">CPF</th>
            <th style="width: 150px;">Cargo / Função</th>
            <th style="width: 120px;">Obs / Substituição</th>
            <th style="width: 140px;">Assinatura do Fiscal</th>
          </tr>
        </thead>
        <tbody>
          ${rFiscais.length === 0 ? `
            <tr><td colspan="6" style="text-align: center; color: #9ca3af; font-style: italic; padding: 8px;">Nenhum fiscal alocado para esta sala</td></tr>
          ` : rFiscais.map((f, i) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold; color: #6b7280;">${i + 1}</td>
              <td style="font-weight: bold;">${f.name}</td>
              <td style="font-family: monospace; font-weight: bold;">${f.cpf}</td>
              <td><span class="badge">${f.assignedRole || 'Aplicador'}</span></td>
              <td style="font-size: 9px; color: #4b5563;">${f.substitutionTag || 'Efetivo'}</td>
              <td><div class="sig-line"></div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `;
  }).join('')}

  ${rolesWithQuantity.filter(r => r.allMembers.length > 0).map(role => `
    <div class="section-title">Equipe de ${role.name} (${role.allMembers.length} Fiscais)</div>
    <div class="room-card">
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Nome Completo</th>
            <th style="width: 120px;">CPF</th>
            <th style="width: 150px;">Função</th>
            <th style="width: 120px;">Alocação</th>
            <th style="width: 140px;">Assinatura</th>
          </tr>
        </thead>
        <tbody>
          ${role.allMembers.map((f: any, i: number) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold; color: #6b7280;">${i + 1}</td>
              <td style="font-weight: bold;">${f.name}</td>
              <td style="font-family: monospace; font-weight: bold;">${f.cpf}</td>
              <td><span class="badge">${f.assignedRole}</span></td>
              <td style="font-size: 9px;">${f.assignedRoom ? `Sala ${f.assignedRoom}` : 'Circulação Geral'}</td>
              <td><div class="sig-line"></div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}

  ${reservas.length > 0 ? `
    <div class="section-title">Banco de Fiscais de Reserva (${reservas.length})</div>
    <div class="room-card">
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Nome</th>
            <th style="width: 120px;">CPF</th>
            <th style="width: 120px;">Telefone</th>
            <th>Histórico / Observação</th>
          </tr>
        </thead>
        <tbody>
          ${reservas.map((r, i) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold; color: #6b7280;">${i + 1}</td>
              <td style="font-weight: bold;">${r.name}</td>
              <td style="font-family: monospace;">${r.cpf}</td>
              <td style="font-family: monospace;">${r.whatsapp || '—'}</td>
              <td style="font-size: 9px; color: #92400e;">${r.substitutionTag || 'Reserva Geral'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-box-line"></div>
      <strong>${claName || 'Coordenador de Local de Aplicação (CLA)'}</strong><br>
      <span style="color: #6b7280;">Responsável pelo Local de Aplicação</span>
    </div>
    <div class="sig-block">
      <div class="sig-box-line"></div>
      <strong>Supervisão Geral ENEM 2026</strong><br>
      <span style="color: #6b7280;">Validação e Encerramento de Ensalamento</span>
    </div>
  </div>
</body>
</html>`;
}
