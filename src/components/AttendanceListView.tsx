import React, { useState, useMemo } from "react";
import { CollaboratorInfo, BuildingInfo, EventConfigInfo, RoomDetails } from "../types";
import FiscalAvatar from "./FiscalAvatar";
import CollaboratorAuditLogModal from "./CollaboratorAuditLogModal";
import { appendCollaboratorLog } from "../lib/collaborator-logger";
import { isChefeDeSalaRole, isAplicadorRole } from "../lib/collaborator-utils";
import { 
  ClipboardCheck, 
  Calendar,
  DoorOpen,
  Shuffle,
  Users, 
  Search, 
  Printer, 
  Check, 
  Filter, 
  RefreshCw, 
  CheckSquare, 
  MapPin, 
  UserCheck, 
  UserX, 
  Clock, 
  ShieldAlert,
  Sparkles,
  ChevronRight,
  History,
  ArrowRight,
  ArrowLeftRight,
  Copy,
  RotateCcw,
  Building2,
  Phone,
  AlertCircle,
  CheckCircle2,
  Share2,
  X
} from "lucide-react";

interface AttendanceListViewProps {
  collaborators: CollaboratorInfo[];
  building: BuildingInfo | null;
  eventConfig?: EventConfigInfo | null;
  onUpdateCollaborator: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  readOnly?: boolean;
}

type Menu4Tab = "ensalamento1" | "ensalamento2" | "presenca";

export default function AttendanceListView({
  collaborators,
  building,
  eventConfig,
  onUpdateCollaborator,
  readOnly = false
}: AttendanceListViewProps) {
  // Menu 4 Sub-Tabs
  const [activeTab, setActiveTab] = useState<Menu4Tab>("ensalamento1");

  // Presença: Selected Exam Day (Dia 1 ou Dia 2)
  const [activeDay, setActiveDay] = useState<"day1" | "day2">("day1");

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roomFilterStatus, setRoomFilterStatus] = useState<"all" | "complete" | "incomplete">("all");
  const [presenceStatusFilter, setPresenceStatusFilter] = useState<"all" | "present" | "absent">("all");

  // UI state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleAlert, setShuffleAlert] = useState<{ message: string; count: number } | null>(null);
  const [copiedRoom, setCopiedRoom] = useState<string | null>(null);
  const [selectedAuditCollab, setSelectedAuditCollab] = useState<CollaboratorInfo | null>(null);

  // Day 2 Substitution / Swap Modal State
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapSourceCollab, setSwapSourceCollab] = useState<CollaboratorInfo | null>(null);
  const [swapTargetCollabId, setSwapTargetCollabId] = useState<string>("");
  const [swapMode, setSwapMode] = useState<"swap_allocated" | "replace_reserve">("swap_allocated");
  const [swapLoading, setSwapLoading] = useState(false);

  // Exam Dates & Themes
  const rawDay1 = eventConfig?.examDates?.[0];
  const rawDay2 = eventConfig?.examDates?.[1];
  const examDay1Label = (rawDay1 && rawDay1 !== "01/11/2026" && rawDay1 !== "03/11/2024" && rawDay1 !== "03/11/2026") ? rawDay1 : "08/11/2026";
  const examDay2Label = (rawDay2 && rawDay2 !== "08/11/2026" && rawDay2 !== "10/11/2024") ? rawDay2 : "15/11/2026";

  // 1. Gather all rooms configured or derived from building
  const rooms: RoomDetails[] = useMemo(() => {
    if (building?.rooms && building.rooms.length > 0) {
      return [...building.rooms].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    }
    const count = building?.roomsCount || 0;
    if (count > 0) {
      return Array.from({ length: count }, (_, i) => ({
        number: `${101 + i}`,
        capacity: building?.virtualCapacity || 30,
        floor: i < 5 ? "Térreo" : "1º Andar",
        type: "normal" as const
      }));
    }
    // Fallback: extract distinct rooms from collaborators' assigned rooms
    const assignedNums = Array.from(
      new Set(
        (collaborators || [])
          .map(c => c.assignedRoom)
          .filter((r): r is string => Boolean(r && r.trim() !== "" && !r.toLowerCase().startsWith("setor")))
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (assignedNums.length > 0) {
      return assignedNums.map(num => ({
        number: num,
        capacity: 30,
        floor: "Térreo",
        type: "normal" as const
      }));
    }

    return [];
  }, [building, collaborators]);

  // 2. Filter active allocated collaborators (status Confirmado, not Cancelado/Recusado)
  const allocatedCollaborators = useMemo(() => {
    return (collaborators || [])
      .filter(c => {
        if (c.status === "Recusado" || c.status === "Cancelado" || c.status === "Impedido") return false;
        const hasRole = Boolean(c.assignedRole && c.assignedRole.trim() !== "");
        const hasRoom = Boolean(c.assignedRoom && c.assignedRoom.trim() !== "");
        return hasRole || hasRoom;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
  }, [collaborators]);

  // Available reserves (for Day 2 substitution)
  const availableReserves = useMemo(() => {
    return (collaborators || [])
      .filter(c => {
        if (c.status === "Recusado" || c.status === "Cancelado" || c.status === "Impedido") return false;
        return c.isReserve || !c.assignedRoom || c.assignedRoom.trim() === "";
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
  }, [collaborators]);

  // Extract unique roles for the filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    allocatedCollaborators.forEach(c => {
      if (c.assignedRole && c.assignedRole.trim() !== "") {
        roles.add(c.assignedRole);
      }
    });
    return Array.from(roles).sort();
  }, [allocatedCollaborators]);

  // Helper to check if collaborator is present on active day
  const isCollaboratorPresentOnActiveDay = (c: CollaboratorInfo): boolean => {
    if (activeDay === "day1") {
      return Boolean(c.isPresentDay1 !== undefined ? c.isPresentDay1 : c.isPresent);
    } else {
      return Boolean(c.isPresentDay2);
    }
  };

  // Helper to get presence timestamp on active day
  const getPresenceTimestampOnActiveDay = (c: CollaboratorInfo): string | undefined => {
    if (activeDay === "day1") {
      return c.presenceCheckedAtDay1 || c.presenceCheckedAt;
    } else {
      return c.presenceCheckedAtDay2;
    }
  };

  // Statistics for the active day Presence
  const totalAllocated = allocatedCollaborators.length;
  const presentCount = useMemo(() => {
    return allocatedCollaborators.filter(c => isCollaboratorPresentOnActiveDay(c)).length;
  }, [allocatedCollaborators, activeDay]);
  const absentCount = totalAllocated - presentCount;
  const presencePercentage = totalAllocated > 0 ? Math.round((presentCount / totalAllocated) * 100) : 0;

  // --------------------------------------------------------------------------
  // DAY 1 ROOM ASSIGNMENT DATA STRUCTURE
  // --------------------------------------------------------------------------
  const roomsDay1Data = useMemo(() => {
    return rooms.map(room => {
      const collabsInRoom = allocatedCollaborators.filter(c => 
        !c.isReserve && c.assignedRoom === room.number
      );
      const chefes = collabsInRoom.filter(c => isChefeDeSalaRole(c.assignedRole));
      const aplicadores = collabsInRoom.filter(c => isAplicadorRole(c.assignedRole));
      const especializados = collabsInRoom.filter(c => !isChefeDeSalaRole(c.assignedRole) && !isAplicadorRole(c.assignedRole));
      const isComplete = chefes.length >= 1 && aplicadores.length >= 1;

      return {
        room,
        collabsInRoom,
        chefes,
        aplicadores,
        especializados,
        isComplete
      };
    });
  }, [rooms, allocatedCollaborators]);

  // --------------------------------------------------------------------------
  // DAY 2 ROOM ASSIGNMENT DATA STRUCTURE (WITH ROTATION / SHUFFLE)
  // --------------------------------------------------------------------------
  const roomsDay2Data = useMemo(() => {
    return rooms.map(room => {
      const collabsInRoom = allocatedCollaborators.filter(c => {
        if (c.isReserve) return false;
        // On Day 2, check assignedRoomDay2; if not defined, fallback to assignedRoom
        const day2Room = c.assignedRoomDay2 && c.assignedRoomDay2.trim() !== "" 
          ? c.assignedRoomDay2 
          : c.assignedRoom;
        return day2Room === room.number;
      });

      // Chefes de Sala stay in their room
      const chefes = collabsInRoom.filter(c => {
        const role = c.assignedRoleDay2 || c.assignedRole;
        return isChefeDeSalaRole(role);
      });

      // Aplicadores for Day 2
      const aplicadores = collabsInRoom.filter(c => {
        const role = c.assignedRoleDay2 || c.assignedRole;
        return isAplicadorRole(role);
      });

      // Especializados
      const especializados = collabsInRoom.filter(c => {
        const role = c.assignedRoleDay2 || c.assignedRole;
        return !isChefeDeSalaRole(role) && !isAplicadorRole(role);
      });

      const isComplete = chefes.length >= 1 && aplicadores.length >= 1;

      return {
        room,
        collabsInRoom,
        chefes,
        aplicadores,
        especializados,
        isComplete
      };
    });
  }, [rooms, allocatedCollaborators]);

  // Filtered Day 1 Rooms
  const filteredRoomsDay1 = useMemo(() => {
    return roomsDay1Data.filter(item => {
      if (roomFilterStatus === "complete" && !item.isComplete) return false;
      if (roomFilterStatus === "incomplete" && item.isComplete) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roomMatch = item.room.number.toLowerCase().includes(q);
        const personMatch = item.collabsInRoom.some(c => 
          (c.name || "").toLowerCase().includes(q) || 
          (c.cpf || "").toLowerCase().includes(q) ||
          (c.assignedRole || "").toLowerCase().includes(q)
        );
        if (!roomMatch && !personMatch) return false;
      }
      return true;
    });
  }, [roomsDay1Data, roomFilterStatus, searchQuery]);

  // Filtered Day 2 Rooms
  const filteredRoomsDay2 = useMemo(() => {
    return roomsDay2Data.filter(item => {
      if (roomFilterStatus === "complete" && !item.isComplete) return false;
      if (roomFilterStatus === "incomplete" && item.isComplete) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roomMatch = item.room.number.toLowerCase().includes(q);
        const personMatch = item.collabsInRoom.some(c => 
          (c.name || "").toLowerCase().includes(q) || 
          (c.cpf || "").toLowerCase().includes(q) ||
          (c.assignedRole || "").toLowerCase().includes(q)
        );
        if (!roomMatch && !personMatch) return false;
      }
      return true;
    });
  }, [roomsDay2Data, roomFilterStatus, searchQuery]);

  // Filtered Presence List
  const filteredPresenceList = useMemo(() => {
    return allocatedCollaborators.filter(c => {
      // Role Filter
      if (roleFilter !== "all" && c.assignedRole !== roleFilter) {
        return false;
      }

      // Presence Status Filter
      const isPresent = isCollaboratorPresentOnActiveDay(c);
      if (presenceStatusFilter === "present" && !isPresent) return false;
      if (presenceStatusFilter === "absent" && isPresent) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const cpfMatch = (c.cpf || "").toLowerCase().includes(q);
        const roleMatch = (c.assignedRole || "").toLowerCase().includes(q);
        const room1Match = (c.assignedRoom || "").toLowerCase().includes(q);
        const room2Match = (c.assignedRoomDay2 || "").toLowerCase().includes(q);
        if (!nameMatch && !cpfMatch && !roleMatch && !room1Match && !room2Match) {
          return false;
        }
      }

      return true;
    });
  }, [allocatedCollaborators, roleFilter, presenceStatusFilter, searchQuery, activeDay]);

  // --------------------------------------------------------------------------
  // SHUFFLE ALGORITHM: RODÍZIO DE APLICADORES NO 2º DIA
  // Regra estrita:
  // - Embaralha APENAS os Aplicadores alocados nas salas
  // - Mantém os Chefes de Sala em suas salas originais
  // - Preserva a quantidade exata de aplicadores por sala
  // - Evita que um aplicador fique na mesma sala se houver 2 ou mais salas
  // --------------------------------------------------------------------------
  const handleShuffleAplicadoresDay2 = async () => {
    if (readOnly || isShuffling) return;

    // 1. Gather all aplicadores allocated to rooms on Day 1
    const aplicadores = allocatedCollaborators.filter(c => 
      !c.isReserve && 
      Boolean(c.assignedRoom && c.assignedRoom.trim() !== "") &&
      isAplicadorRole(c.assignedRole)
    );

    if (aplicadores.length < 2) {
      alert("É necessário ter pelo menos 2 aplicadores alocados em salas para realizar o rodízio do 2º Dia.");
      return;
    }

    const confirmShuffle = window.confirm(
      `Deseja embaralhar os ${aplicadores.length} Aplicadores de sala para o 2º Dia do ENEM?\n\n` +
      `• Os Chefes de Sala permanecerão FIXOS em suas salas.\n` +
      `• Cada sala receberá um novo aplicador mantendo o quantitativo exato de fiscais por sala.\n` +
      `• A alocação original do 1º Dia será preservada.`
    );
    if (!confirmShuffle) return;

    setIsShuffling(true);
    try {
      // 2. Collect room slots (an array of room numbers matching initial aplicador distribution)
      const roomSlots = aplicadores.map(a => a.assignedRoom!);

      // 3. Shuffle with derangement (attempt to assign different rooms)
      let bestShuffle: string[] = [];
      let maxDifferent = -1;

      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = [...roomSlots].sort(() => Math.random() - 0.5);
        let diffCount = 0;
        for (let i = 0; i < aplicadores.length; i++) {
          if (aplicadores[i].assignedRoom !== candidate[i]) {
            diffCount++;
          }
        }
        if (diffCount > maxDifferent) {
          maxDifferent = diffCount;
          bestShuffle = candidate;
          if (diffCount === aplicadores.length) break; // Perfect derangement
        }
      }

      // 4. Update all aplicadores with their new assignedRoomDay2
      for (let i = 0; i < aplicadores.length; i++) {
        const collab = aplicadores[i];
        const newRoomDay2 = bestShuffle[i];

        if (collab.id) {
          const updatedLogs = appendCollaboratorLog(
            collab,
            "alocacao_sala",
            "Rodízio 2º Dia Aplicado",
            `Embaralhado automaticamente para o 2º Dia: Sala ${collab.assignedRoom} ➔ Sala ${newRoomDay2}.`,
            {
              performedBy: building?.claId || "Coordenação CLA",
              performedByRole: "CLA",
              details: { day1Room: collab.assignedRoom, day2Room: newRoomDay2 }
            }
          );

          await onUpdateCollaborator(collab.id, {
            assignedRoomDay2: newRoomDay2,
            assignedRoleDay2: collab.assignedRole || "Aplicador",
            activityLogs: updatedLogs
          });
        }
      }

      setShuffleAlert({
        message: `Rodízio concluído com sucesso! ${aplicadores.length} aplicadores foram redistribuídos em novas salas para o 2º Dia.`,
        count: aplicadores.length
      });
      setTimeout(() => setShuffleAlert(null), 7000);
    } catch (err) {
      console.error("Erro ao embaralhar aplicadores:", err);
      alert("Ocorreu um erro ao processar o rodízio. Tente novamente.");
    } finally {
      setIsShuffling(false);
    }
  };

  // Reset Day 2 rooms back to Day 1 rooms
  const handleResetDay2ToDay1 = async () => {
    if (readOnly || isShuffling) return;
    const confirmReset = window.confirm(
      "Deseja redefinir o ensalamento do 2º Dia para ficar idêntico ao do 1º Dia? Quaisquer rodízios ou substituições do 2º Dia serão desfeitos."
    );
    if (!confirmReset) return;

    setIsShuffling(true);
    try {
      for (const c of allocatedCollaborators) {
        if (c.id && (c.assignedRoomDay2 !== undefined || c.assignedRoleDay2 !== undefined)) {
          await onUpdateCollaborator(c.id, {
            assignedRoomDay2: c.assignedRoom,
            assignedRoleDay2: c.assignedRole
          });
        }
      }
      setShuffleAlert({
        message: "O ensalamento do 2º Dia foi sincronizado com o 1º Dia com sucesso.",
        count: 0
      });
      setTimeout(() => setShuffleAlert(null), 5000);
    } catch (err) {
      console.error("Erro ao resetar 2º dia:", err);
    } finally {
      setIsShuffling(false);
    }
  };

  // Open Swap Modal for a collaborator
  const handleOpenSwapModal = (collab: CollaboratorInfo) => {
    setSwapSourceCollab(collab);
    setSwapTargetCollabId("");
    setSwapMode("swap_allocated");
    setSwapModalOpen(true);
  };

  // Execute Swap or Substitution for Day 2
  const handleExecuteDay2Swap = async () => {
    if (!swapSourceCollab?.id || !swapTargetCollabId || readOnly || swapLoading) return;
    setSwapLoading(true);

    try {
      const sourceDay2Room = swapSourceCollab.assignedRoomDay2 || swapSourceCollab.assignedRoom || "";
      const sourceRole = swapSourceCollab.assignedRoleDay2 || swapSourceCollab.assignedRole || "Aplicador";

      if (swapMode === "swap_allocated") {
        // Swap between 2 allocated collaborators on Day 2
        const targetCollab = allocatedCollaborators.find(c => c.id === swapTargetCollabId);
        if (!targetCollab || !targetCollab.id) return;

        const targetDay2Room = targetCollab.assignedRoomDay2 || targetCollab.assignedRoom || "";
        const targetRole = targetCollab.assignedRoleDay2 || targetCollab.assignedRole || "Aplicador";

        // Source gets target's room; target gets source's room
        await onUpdateCollaborator(swapSourceCollab.id, {
          assignedRoomDay2: targetDay2Room,
          assignedRoleDay2: targetRole
        });

        await onUpdateCollaborator(targetCollab.id, {
          assignedRoomDay2: sourceDay2Room,
          assignedRoleDay2: sourceRole
        });

        alert(`Troca realizada com sucesso entre ${swapSourceCollab.name} (agora na ${targetDay2Room}) e ${targetCollab.name} (agora na ${sourceDay2Room}) para o 2º Dia!`);
      } else {
        // Replace with reserve on Day 2
        const reserveCollab = availableReserves.find(c => c.id === swapTargetCollabId);
        if (!reserveCollab || !reserveCollab.id) return;

        // Reserve gets source's Day 2 room
        await onUpdateCollaborator(reserveCollab.id, {
          assignedRoomDay2: sourceDay2Room,
          assignedRoleDay2: sourceRole,
          substitutedFor: swapSourceCollab.name,
          substitutedAt: new Date().toISOString()
        });

        // Source becomes unassigned on Day 2
        await onUpdateCollaborator(swapSourceCollab.id, {
          assignedRoomDay2: "",
          substitutedBy: reserveCollab.name,
          isSubstituted: true
        });

        alert(`Substituição concluída! ${reserveCollab.name} assume a ${sourceDay2Room} no 2º Dia no lugar de ${swapSourceCollab.name}.`);
      }

      setSwapModalOpen(false);
      setSwapSourceCollab(null);
      setSwapTargetCollabId("");
    } catch (err) {
      console.error("Erro ao executar troca/substituição:", err);
      alert("Ocorreu um erro ao salvar a alteração.");
    } finally {
      setSwapLoading(false);
    }
  };

  // Toggle Presence on active day
  const handleTogglePresence = async (collaborator: CollaboratorInfo) => {
    if (readOnly || !collaborator.id) return;
    setUpdatingId(collaborator.id);

    try {
      const isCurrentlyPresent = isCollaboratorPresentOnActiveDay(collaborator);
      const newPresenceState = !isCurrentlyPresent;
      const now = new Date().toISOString();
      const dayName = activeDay === "day1" ? "1º Dia" : "2º Dia";
      const currentRoom = activeDay === "day1" 
        ? collaborator.assignedRoom 
        : (collaborator.assignedRoomDay2 || collaborator.assignedRoom);

      const updatedLogs = appendCollaboratorLog(
        collaborator,
        "confirmacao_presenca",
        newPresenceState ? `Presença Registrada (${dayName})` : `Presença Desmarcada (${dayName})`,
        newPresenceState 
          ? `Presença física confirmada no local de aplicação (${dayName}) na sala ${currentRoom || "Coordenação"}.`
          : `Registro de presença desmarcado pela coordenação (${dayName}).`,
        {
          performedBy: building?.claId || "Coordenação CLA",
          performedByRole: "CLA",
          details: { dia: dayName, presente: newPresenceState, horario: now, sala: currentRoom }
        }
      );

      if (activeDay === "day1") {
        await onUpdateCollaborator(collaborator.id, {
          isPresent: newPresenceState,
          presenceCheckedAt: newPresenceState ? now : undefined,
          isPresentDay1: newPresenceState,
          presenceCheckedAtDay1: newPresenceState ? now : undefined,
          activityLogs: updatedLogs
        });
      } else {
        await onUpdateCollaborator(collaborator.id, {
          isPresentDay2: newPresenceState,
          presenceCheckedAtDay2: newPresenceState ? now : undefined,
          activityLogs: updatedLogs
        });
      }
    } catch (err) {
      console.error("Erro ao registrar presença:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Batch action: Mark all filtered as present on active day
  const handleMarkAllPresent = async () => {
    if (readOnly || batchLoading || filteredPresenceList.length === 0) return;
    const confirmAction = window.confirm(
      `Deseja confirmar a presença de TODOS os ${filteredPresenceList.length} colaboradores listados para o ${activeDay === "day1" ? "1º Dia" : "2º Dia"} do ENEM?`
    );
    if (!confirmAction) return;

    setBatchLoading(true);
    try {
      const now = new Date().toISOString();
      for (const c of filteredPresenceList) {
        if (!isCollaboratorPresentOnActiveDay(c) && c.id) {
          if (activeDay === "day1") {
            await onUpdateCollaborator(c.id, {
              isPresent: true,
              presenceCheckedAt: now,
              isPresentDay1: true,
              presenceCheckedAtDay1: now
            });
          } else {
            await onUpdateCollaborator(c.id, {
              isPresentDay2: true,
              presenceCheckedAtDay2: now
            });
          }
        }
      }
    } catch (err) {
      console.error("Erro ao marcar presenças em lote:", err);
    } finally {
      setBatchLoading(false);
    }
  };

  // Batch action: Clear all presence on active day
  const handleClearAllPresence = async () => {
    if (readOnly || batchLoading || presentCount === 0) return;
    const confirmAction = window.confirm(
      `Deseja desmarcar todas as presenças do ${activeDay === "day1" ? "1º Dia" : "2º Dia"} do ENEM?`
    );
    if (!confirmAction) return;

    setBatchLoading(true);
    try {
      for (const c of allocatedCollaborators) {
        if (isCollaboratorPresentOnActiveDay(c) && c.id) {
          if (activeDay === "day1") {
            await onUpdateCollaborator(c.id, {
              isPresent: false,
              presenceCheckedAt: undefined,
              isPresentDay1: false,
              presenceCheckedAtDay1: undefined
            });
          } else {
            await onUpdateCollaborator(c.id, {
              isPresentDay2: false,
              presenceCheckedAtDay2: undefined
            });
          }
        }
      }
    } catch (err) {
      console.error("Erro ao limpar presenças:", err);
    } finally {
      setBatchLoading(false);
    }
  };

  // Copy room allocation to clipboard
  const handleCopyRoomInfo = (roomNumber: string, chefes: CollaboratorInfo[], aplicadores: CollaboratorInfo[], diaLabel: string) => {
    const chefeText = chefes.map(c => `• Chefe de Sala: ${c.name} (${c.whatsapp || "Sem tel"})`).join("\n");
    const aplicadoresText = aplicadores.map(c => `• Aplicador: ${c.name} (${c.whatsapp || "Sem tel"})`).join("\n");
    const text = `📋 *ENEM 2026 - ${building?.name || "Local de Aplicação"}*\n🏛️ *Sala ${roomNumber} (${diaLabel})*\n${chefeText || "• Chefe: Pendente"}\n${aplicadoresText || "• Aplicador: Pendente"}\nHorário de apresentação: 07h00`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedRoom(roomNumber);
      setTimeout(() => setCopiedRoom(null), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN MENU 4 NAVIGATION TABS                               */}
      {/* ========================================================================= */}
      <div className="no-print bg-white dark:bg-[#0c1220]/95 p-5 sm:p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/25 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 via-emerald-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-display font-black text-slate-900 dark:text-white">
                Menu 4 • Ensalamento & Presença
              </h1>
              <span className="text-[11px] font-mono bg-teal-500/15 text-teal-700 dark:text-teal-300 font-extrabold px-2.5 py-0.5 rounded-full border border-teal-500/30">
                ENEM 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Gerencie a distribuição de Chefes e Aplicadores por sala, realize o rodízio do 2º dia e controle a frequência oficial.
            </p>
          </div>
        </div>

        {/* Global Print Action */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl border-2 border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              {activeTab === "ensalamento1" && "Imprimir Ensalamento (1º Dia)"}
              {activeTab === "ensalamento2" && "Imprimir Ensalamento (2º Dia)"}
              {activeTab === "presenca" && `Imprimir Lista de Presença (${activeDay === "day1" ? "1º Dia" : "2º Dia"})`}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-NAVIGATION TABS (1º DIA, 2º DIA, PRESENÇA)                         */}
      {/* ========================================================================= */}
      <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* TAB 1: Ensalamento 1º Dia */}
        <button
          type="button"
          onClick={() => setActiveTab("ensalamento1")}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
            activeTab === "ensalamento1"
              ? "bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 shadow-md ring-2 ring-teal-500/30"
              : "bg-white dark:bg-[#0c1220] border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${
            activeTab === "ensalamento1"
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}>
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                OPÇÃO 1
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {roomsDay1Data.length} Salas
              </span>
            </div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              Ensalamento 1º Dia
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Chefes de Sala e Aplicadores alocados por sala no 1º domingo.
            </p>
          </div>
        </button>

        {/* TAB 2: Ensalamento 2º Dia (Shuffle & Substitutions) */}
        <button
          type="button"
          onClick={() => setActiveTab("ensalamento2")}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
            activeTab === "ensalamento2"
              ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/30"
              : "bg-white dark:bg-[#0c1220] border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${
            activeTab === "ensalamento2"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}>
            <Shuffle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                OPÇÃO 2
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                Rodízio Aplicadores
              </span>
            </div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              Ensalamento 2º Dia
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Embaralhar aplicadores mantendo chefes fixos e quantitativos.
            </p>
          </div>
        </button>

        {/* TAB 3: Presença (1º e 2º Dia em Ordem Alfabética) */}
        <button
          type="button"
          onClick={() => setActiveTab("presenca")}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
            activeTab === "presenca"
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/30"
              : "bg-white dark:bg-[#0c1220] border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${
            activeTab === "presenca"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          }`}>
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                OPÇÃO 3
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                {presentCount}/{totalAllocated} Presentes
              </span>
            </div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              Frequência & Presença
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Lista alfabética oficial (1º e 2º dia) com confirmação instantânea.
            </p>
          </div>
        </button>
      </div>

      {/* Alert banner if shuffle was executed */}
      {shuffleAlert && (
        <div className="no-print p-4 bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-black">{shuffleAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setShuffleAlert(null)}
            className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW 1: ENSALAMENTO 1º DIA                                             */}
      {/* ========================================================================= */}
      {activeTab === "ensalamento1" && (
        <div className="space-y-6">
          {/* Summary Strip & Quick Filters */}
          <div className="no-print bg-white dark:bg-[#0c1220] p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Filtrar Salas:</span>
              <button
                type="button"
                onClick={() => setRoomFilterStatus("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  roomFilterStatus === "all"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Todas ({roomsDay1Data.length})
              </button>
              <button
                type="button"
                onClick={() => setRoomFilterStatus("complete")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  roomFilterStatus === "complete"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                }`}
              >
                Equipe Completa ({roomsDay1Data.filter(r => r.isComplete).length})
              </button>
              <button
                type="button"
                onClick={() => setRoomFilterStatus("incomplete")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  roomFilterStatus === "incomplete"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                }`}
              >
                Incompletas ({roomsDay1Data.filter(r => !r.isComplete).length})
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar sala ou colaborador..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredRoomsDay1.map(({ room, chefes, aplicadores, especializados, isComplete }) => (
              <div
                key={room.number}
                className="bg-white dark:bg-[#0c1220] rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500/50 transition-all flex flex-col overflow-hidden"
              >
                {/* Room Header */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-mono font-black text-sm shadow-xs">
                      {room.number}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Sala {room.number}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {room.floor || "Térreo"} • Cap: {room.capacity || 30}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      isComplete 
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" 
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                    }`}>
                      {isComplete ? "COMPLETA (2/2)" : "INCOMPLETA"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyRoomInfo(room.number, chefes, aplicadores, "1º Dia")}
                      title="Copiar escala desta sala para WhatsApp"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-500/10 transition cursor-pointer"
                    >
                      {copiedRoom === room.number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Room Content: Chefe & Aplicador Slots */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Chefe de Sala Slot */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Chefe de Sala</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">1º DIA</span>
                    </div>

                    {chefes.length > 0 ? (
                      chefes.map(chefe => (
                        <div key={chefe.id} className="p-2.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FiscalAvatar name={chefe.name} photoUrl={chefe.photoUrl} size="sm" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                {chefe.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                CPF: {chefe.cpf}
                              </span>
                            </div>
                          </div>
                          {chefe.whatsapp && (
                            <a
                              href={`https://wa.me/55${chefe.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition shrink-0"
                              title="Enviar WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 border-2 border-dashed border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-500/5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Chefe de Sala não alocado</span>
                      </div>
                    )}
                  </div>

                  {/* Aplicadores Slot */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Aplicador(es)</span>
                      <span className="text-teal-600 dark:text-teal-400 font-mono">1º DIA</span>
                    </div>

                    {aplicadores.length > 0 ? (
                      aplicadores.map(aplicador => (
                        <div key={aplicador.id} className="p-2.5 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FiscalAvatar name={aplicador.name} photoUrl={aplicador.photoUrl} size="sm" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                {aplicador.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                CPF: {aplicador.cpf}
                              </span>
                            </div>
                          </div>
                          {aplicador.whatsapp && (
                            <a
                              href={`https://wa.me/55${aplicador.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition shrink-0"
                              title="Enviar WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 border-2 border-dashed border-teal-500/30 rounded-xl flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold bg-teal-500/5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Aplicador não alocado</span>
                      </div>
                    )}
                  </div>

                  {/* Especializados (if any) */}
                  {especializados.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                        Atendimento Especializado ({especializados.length})
                      </span>
                      {especializados.map(esp => (
                        <div key={esp.id} className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between text-xs">
                          <span className="font-bold text-purple-900 dark:text-purple-300 truncate">{esp.name}</span>
                          <span className="text-[9px] font-mono bg-purple-500/20 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded shrink-0">
                            {esp.assignedRole || "Especializado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW 2: ENSALAMENTO 2º DIA (SHUFFLE & SUBSTITUTION)                     */}
      {/* ========================================================================= */}
      {activeTab === "ensalamento2" && (
        <div className="space-y-6">
          {/* Action Bar & Rules */}
          <div className="no-print p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/10 border-2 border-indigo-500/30 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Shuffle className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Rodízio de Aplicadores para o 2º Dia do ENEM
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  De acordo com as diretrizes do ENEM, os <strong>Chefes de Sala permanecem em suas salas de origem</strong>, enquanto os <strong>Aplicadores são rotacionados/embaralhados</strong> entre as salas para o 2º domingo.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleShuffleAplicadoresDay2}
                  disabled={readOnly || isShuffling}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                  title="Embaralha todos os aplicadores entre as salas mantendo os quantitativos"
                >
                  <Shuffle className={`w-4 h-4 ${isShuffling ? "animate-spin" : ""}`} />
                  <span>{isShuffling ? "Embaralhando..." : "Embaralhar Aplicadores (2º Dia)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDay2ToDay1}
                  disabled={readOnly || isShuffling}
                  className="px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 active:scale-95 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Restaura a escala do 2º dia para ficar igual ao 1º dia"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar 1º Dia</span>
                </button>
              </div>
            </div>

            {/* Quick Filter & Search Bar */}
            <div className="pt-3 border-t border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Filtrar:</span>
                <button
                  type="button"
                  onClick={() => setRoomFilterStatus("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    roomFilterStatus === "all"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Todas ({roomsDay2Data.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoomFilterStatus("complete")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    roomFilterStatus === "complete"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
                  }`}
                >
                  Completas ({roomsDay2Data.filter(r => r.isComplete).length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoomFilterStatus("incomplete")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    roomFilterStatus === "incomplete"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                  }`}
                >
                  Incompletas ({roomsDay2Data.filter(r => !r.isComplete).length})
                </button>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar sala ou colaborador..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Rooms Grid for Day 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredRoomsDay2.map(({ room, chefes, aplicadores, especializados, isComplete }) => (
              <div
                key={room.number}
                className="bg-white dark:bg-[#0c1220] rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-500/50 transition-all flex flex-col overflow-hidden"
              >
                {/* Room Header */}
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-mono font-black text-sm shadow-xs">
                      {room.number}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Sala {room.number}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {room.floor || "Térreo"} • 2º DIA
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      isComplete 
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" 
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                    }`}>
                      {isComplete ? "COMPLETA (2/2)" : "INCOMPLETA"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyRoomInfo(room.number, chefes, aplicadores, "2º Dia")}
                      title="Copiar escala desta sala para WhatsApp"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/10 transition cursor-pointer"
                    >
                      {copiedRoom === room.number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content: Chefe & Aplicadores */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Chefe de Sala Slot */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Chefe de Sala</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-black text-[9px] bg-amber-500/15 px-1.5 py-0.2 rounded">
                        CHEFE FIXO
                      </span>
                    </div>

                    {chefes.length > 0 ? (
                      chefes.map(chefe => (
                        <div key={chefe.id} className="p-2.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FiscalAvatar name={chefe.name} photoUrl={chefe.photoUrl} size="sm" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                {chefe.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                CPF: {chefe.cpf}
                              </span>
                            </div>
                          </div>
                          {chefe.whatsapp && (
                            <a
                              href={`https://wa.me/55${chefe.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition shrink-0"
                              title="Enviar WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 border-2 border-dashed border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-500/5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Chefe de Sala não alocado</span>
                      </div>
                    )}
                  </div>

                  {/* Aplicadores do 2º Dia Slot */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Aplicador(es) 2º Dia</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black text-[9px] bg-indigo-500/15 px-1.5 py-0.2 rounded">
                        ROTACIONADO
                      </span>
                    </div>

                    {aplicadores.length > 0 ? (
                      aplicadores.map(aplicador => {
                        const hasRotated = aplicador.assignedRoomDay2 && aplicador.assignedRoomDay2 !== aplicador.assignedRoom;

                        return (
                          <div key={aplicador.id} className="p-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FiscalAvatar name={aplicador.name} photoUrl={aplicador.photoUrl} size="sm" />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                    {aplicador.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                    CPF: {aplicador.cpf}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {aplicador.whatsapp && (
                                  <a
                                    href={`https://wa.me/55${aplicador.whatsapp.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition"
                                    title="Enviar WhatsApp"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenSwapModal(aplicador)}
                                  disabled={readOnly}
                                  className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer"
                                  title="Trocar com outro colaborador alocado ou substituir por reserva"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>Trocar</span>
                                </button>
                              </div>
                            </div>

                            {/* Rotation Badge Indicator */}
                            {hasRotated ? (
                              <div className="text-[9.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Shuffle className="w-3 h-3" />
                                <span>1º Dia: Sala {aplicador.assignedRoom} ➔ 2º Dia: Sala {aplicador.assignedRoomDay2}</span>
                              </div>
                            ) : (
                              <div className="text-[9.5px] text-slate-400 font-semibold italic flex items-center gap-1">
                                <span>Mesma sala do 1º Dia</span>
                              </div>
                            )}

                            {aplicador.substitutedFor && (
                              <div className="text-[9px] text-emerald-700 dark:text-emerald-300 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                                Substituto(a) de: {aplicador.substitutedFor}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2.5 border-2 border-dashed border-indigo-500/30 rounded-xl flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold bg-indigo-500/5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Aplicador não alocado no 2º Dia</span>
                      </div>
                    )}
                  </div>

                  {/* Especializados (if any) */}
                  {especializados.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                        Atendimento Especializado ({especializados.length})
                      </span>
                      {especializados.map(esp => (
                        <div key={esp.id} className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between text-xs">
                          <span className="font-bold text-purple-900 dark:text-purple-300 truncate">{esp.name}</span>
                          <span className="text-[9px] font-mono bg-purple-500/20 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded shrink-0">
                            {esp.assignedRoleDay2 || esp.assignedRole || "Especializado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW 3: FREQUÊNCIA & PRESENÇA (ORDEM ALFABÉTICA)                       */}
      {/* ========================================================================= */}
      {activeTab === "presenca" && (
        <div className="space-y-6">
          {/* Day Selector & Presence Metrics */}
          <div className="no-print bg-white dark:bg-[#0c1220] p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Day Selector Pill Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Dia do ENEM:</span>
              <button
                type="button"
                onClick={() => setActiveDay("day1")}
                className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer ${
                  activeDay === "day1"
                    ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>1º Dia ({examDay1Label})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDay("day2")}
                className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer ${
                  activeDay === "day2"
                    ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>2º Dia ({examDay2Label})</span>
              </button>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleMarkAllPresent}
                disabled={readOnly || batchLoading || filteredPresenceList.length === 0}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                title="Confirmar presença de todos os colaboradores listados"
              >
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span>{batchLoading ? "Salvando..." : "Confirmar Todos"}</span>
              </button>

              <button
                onClick={handleClearAllPresence}
                disabled={readOnly || batchLoading || presentCount === 0}
                className="px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:scale-95 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Desmarcar todas as presenças deste dia"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Desmarcar Todos</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards for Presence */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#0c1220] p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Alocados</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-display font-black text-slate-900 dark:text-white">
                  {totalAllocated}
                </span>
                <span className="text-xs text-slate-400 font-medium">fiscais</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0c1220] p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Presentes</span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-display font-black text-emerald-600 dark:text-emerald-400">
                  {presentCount}
                </span>
                <span className="text-xs text-emerald-600/70 font-bold">({presencePercentage}%)</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0c1220] p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">Ausentes / Pendentes</span>
                <UserX className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-display font-black text-amber-600 dark:text-amber-400">
                  {absentCount}
                </span>
                <span className="text-xs text-amber-600/70 font-bold">({100 - presencePercentage}%)</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0c1220] p-4 rounded-xl border-2 border-indigo-500/30 bg-indigo-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Quorum</span>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-display font-black text-indigo-600 dark:text-indigo-400">
                  {presencePercentage}%
                </span>
                <span className="text-[10px] text-indigo-500 font-bold uppercase">{activeDay === "day1" ? "1º Domingo" : "2º Domingo"}</span>
              </div>
            </div>
          </div>

          {/* Search, Role and Status Filters */}
          <div className="no-print bg-white dark:bg-[#0c1220] p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome (alfabético), CPF, função ou sala..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Role Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Todas as Funções ({uniqueRoles.length})</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Presence Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                <select
                  value={presenceStatusFilter}
                  onChange={e => setPresenceStatusFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Todos os Status</option>
                  <option value="present">Apenas Presentes</option>
                  <option value="absent">Apenas Ausentes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alphabetical Table of Allocated Collaborators */}
          <div className="no-print bg-white dark:bg-[#0c1220] rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {filteredPresenceList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-extrabold text-sm text-slate-600 dark:text-slate-300">Nenhum colaborador encontrado</p>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de busca ou função para visualizar a equipe.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-4 w-12 text-center">Nº</th>
                      <th className="py-3.5 px-4">Nome do Colaborador (Ordem Alfabética)</th>
                      <th className="py-3.5 px-4">Função Oficial</th>
                      <th className="py-3.5 px-4">Sala / Posto</th>
                      <th className="py-3.5 px-4 text-right">Confirmação de Presença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                    {filteredPresenceList.map((collab, idx) => {
                      const isPresent = isCollaboratorPresentOnActiveDay(collab);
                      const presenceTime = getPresenceTimestampOnActiveDay(collab);
                      const isUpdating = updatingId === collab.id;

                      const assignedRole = activeDay === "day1" 
                        ? (collab.assignedRole || "Não informada")
                        : (collab.assignedRoleDay2 || collab.assignedRole || "Não informada");

                      const assignedRoom = activeDay === "day1"
                        ? (collab.assignedRoom || "Coordenação / Geral")
                        : (collab.assignedRoomDay2 || collab.assignedRoom || "Coordenação / Geral");

                      const isRotatedRoom = activeDay === "day2" && collab.assignedRoomDay2 && collab.assignedRoomDay2 !== collab.assignedRoom;

                      return (
                        <tr 
                          key={collab.id || collab.cpf}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isPresent ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-[11px] font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Nome e CPF */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <FiscalAvatar name={collab.name} photoUrl={collab.photoUrl} size="md" />
                              <div className="min-w-0">
                                <span className="font-black text-slate-900 dark:text-white block truncate text-sm uppercase">
                                  {collab.name}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                                  <span>CPF: {collab.cpf}</span>
                                  {collab.whatsapp && (
                                    <span className="hidden sm:inline">• Tel: {collab.whatsapp}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Função Oficial */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {assignedRole}
                            </span>
                          </td>

                          {/* Sala / Posto */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 font-black text-slate-900 dark:text-white bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/20 text-xs w-fit">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>{assignedRoom}</span>
                              </span>
                              {isRotatedRoom && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                  (1º Dia: {collab.assignedRoom})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Botão de Confirmação de Presença */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedAuditCollab(collab)}
                                title="Histórico e auditoria (Logs)"
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              >
                                <History className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTogglePresence(collab)}
                                disabled={readOnly || isUpdating}
                                className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                                  isPresent
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-700"
                                    : "bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                                } ${isUpdating ? "opacity-50 animate-pulse" : ""}`}
                                title={isPresent ? "Clique para desmarcar presença" : "Clique para confirmar presença do fiscal"}
                              >
                                {isPresent ? (
                                  <>
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    <span>Presença Confirmada</span>
                                    {presenceTime && (
                                      <span className="text-[10px] font-mono opacity-90 ml-1">
                                        ({new Date(presenceTime).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <CheckSquare className="w-4 h-4" />
                                    <span>Confirmar Presença</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL DE TROCA / SUBSTITUIÇÃO NO 2º DIA                                */}
      {/* ========================================================================= */}
      {swapModalOpen && swapSourceCollab && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-lg rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase">Troca ou Substituição no 2º Dia</h3>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">
                  Colaborador Selecionado:
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {swapSourceCollab.name}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Função: {swapSourceCollab.assignedRoleDay2 || swapSourceCollab.assignedRole || "Aplicador"} • Sala 2º Dia: {swapSourceCollab.assignedRoomDay2 || swapSourceCollab.assignedRoom || "Não definida"}
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                  Tipo de Operação:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSwapMode("swap_allocated");
                      setSwapTargetCollabId("");
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer text-xs font-extrabold ${
                      swapMode === "swap_allocated"
                        ? "bg-indigo-500/15 border-indigo-600 text-indigo-800 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600"
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4 mb-1 text-indigo-600" />
                    <span>Trocar com outro Alocado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSwapMode("replace_reserve");
                      setSwapTargetCollabId("");
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer text-xs font-extrabold ${
                      swapMode === "replace_reserve"
                        ? "bg-indigo-500/15 border-indigo-600 text-indigo-800 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600"
                    }`}
                  >
                    <Users className="w-4 h-4 mb-1 text-indigo-600" />
                    <span>Substituir por Reserva</span>
                  </button>
                </div>
              </div>

              {/* Target Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                  {swapMode === "swap_allocated" 
                    ? "Escolha o colaborador alocado para permutar sala:" 
                    : "Escolha o fiscal reserva que assumirá a sala no 2º Dia:"}
                </label>

                {swapMode === "swap_allocated" ? (
                  <select
                    value={swapTargetCollabId}
                    onChange={e => setSwapTargetCollabId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione outro colaborador alocado...</option>
                    {allocatedCollaborators
                      .filter(c => c.id !== swapSourceCollab.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} — Sala 2º Dia: {c.assignedRoomDay2 || c.assignedRoom || "Geral"} ({c.assignedRoleDay2 || c.assignedRole})
                        </option>
                      ))}
                  </select>
                ) : (
                  <select
                    value={swapTargetCollabId}
                    onChange={e => setSwapTargetCollabId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione um fiscal da reserva...</option>
                    {availableReserves.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Reserva ({c.assignedRole || "Sem função vinculada"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSwapModalOpen(false)}
                  disabled={swapLoading}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDay2Swap}
                  disabled={!swapTargetCollabId || swapLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {swapLoading ? "Processando..." : "Confirmar Alteração"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. IMPRESSÃO OFICIAL PARA MAPAS DE ENSALAMENTO E PRESENÇA                 */}
      {/* ========================================================================= */}
      <div className="hidden print:block print:w-full print:p-6 print:m-0 bg-white text-black font-sans text-xs">
        {/* Print Header */}
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">
              {activeTab === "ensalamento1" && "ENEM 2026 — MAPA OFICIAL DE ENSALAMENTO (1º DIA)"}
              {activeTab === "ensalamento2" && "ENEM 2026 — MAPA OFICIAL DE ENSALAMENTO (2º DIA)"}
              {activeTab === "presenca" && `ENEM 2026 — LISTA OFICIAL DE PRESENÇA (${activeDay === "day1" ? "1º DIA" : "2º DIA"})`}
            </h1>
            <p className="text-xs font-bold uppercase mt-0.5">
              INSTITUTO NACIONAL DE ESTUDOS E PESQUISAS EDUCACIONAIS ANÍSIO TEIXEIRA (INEP) • CEBRASPE
            </p>
            <div className="mt-2 text-xs flex gap-4 font-semibold">
              <span><strong>Local de Aplicação:</strong> {building?.name || "Local de Aplicação"}</span>
              <span><strong>Coordenação:</strong> {building?.coordRoom || "—"}</span>
              <span><strong>Data:</strong> {activeTab === "ensalamento2" ? examDay2Label : examDay1Label}</span>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] border-2 border-black p-2 rounded">
            <span className="block font-black text-xs">CALANGUS v3.2</span>
            <span className="block">Emissão: {new Date().toLocaleDateString("pt-BR")}</span>
            <span className="block font-bold">Total: {allocatedCollaborators.length} fiscais</span>
          </div>
        </div>

        {/* Printable Table for Ensalamento 1 or 2 */}
        {(activeTab === "ensalamento1" || activeTab === "ensalamento2") && (
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-left font-black uppercase">
                <th className="border border-black p-2 w-20 text-center">Sala</th>
                <th className="border border-black p-2 w-32">Andar / Bloco</th>
                <th className="border border-black p-2">Chefe de Sala</th>
                <th className="border border-black p-2">Aplicador(es)</th>
                <th className="border border-black p-2 w-36">Especializado</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "ensalamento1" ? roomsDay1Data : roomsDay2Data).map(({ room, chefes, aplicadores, especializados }) => (
                <tr key={room.number} className="border-b border-black">
                  <td className="border border-black p-2 text-center font-black font-mono text-sm">
                    {room.number}
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {room.floor || "Térreo"}
                  </td>
                  <td className="border border-black p-2 font-bold uppercase">
                    {chefes.map(c => c.name).join(", ") || "—"}
                  </td>
                  <td className="border border-black p-2 font-semibold uppercase">
                    {aplicadores.map(c => c.name).join(", ") || "—"}
                  </td>
                  <td className="border border-black p-2 font-mono text-[10px]">
                    {especializados.map(c => `${c.name} (${c.assignedRole})`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Printable Table for Presença */}
        {activeTab === "presenca" && (
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-left font-black uppercase">
                <th className="border border-black p-1.5 text-center w-8">Nº</th>
                <th className="border border-black p-1.5">Nome do Colaborador</th>
                <th className="border border-black p-1.5 w-28">CPF</th>
                <th className="border border-black p-1.5 w-32">Função</th>
                <th className="border border-black p-1.5 w-24">Sala</th>
                <th className="border border-black p-1.5 w-20 text-center">Chegada</th>
                <th className="border border-black p-1.5 w-44">Assinatura do Fiscal</th>
              </tr>
            </thead>
            <tbody>
              {allocatedCollaborators.map((collab, idx) => {
                const isPresent = isCollaboratorPresentOnActiveDay(collab);
                const pTime = getPresenceTimestampOnActiveDay(collab);
                const assignedRole = activeDay === "day1" 
                  ? collab.assignedRole 
                  : (collab.assignedRoleDay2 || collab.assignedRole);
                const assignedRoom = activeDay === "day1" 
                  ? collab.assignedRoom 
                  : (collab.assignedRoomDay2 || collab.assignedRoom);

                return (
                  <tr key={collab.id || collab.cpf} className="border-b border-black">
                    <td className="border border-black p-1.5 text-center font-mono font-bold">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-bold uppercase">{collab.name}</td>
                    <td className="border border-black p-1.5 font-mono">{collab.cpf}</td>
                    <td className="border border-black p-1.5 font-semibold">{assignedRole || "Fiscal"}</td>
                    <td className="border border-black p-1.5 font-bold">{assignedRoom || "Coordenação"}</td>
                    <td className="border border-black p-1.5 text-center font-mono text-[10px]">
                      {isPresent && pTime ? new Date(pTime).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) : "____:____"}
                    </td>
                    <td className="border border-black p-1.5 text-center">
                      <div className="w-full border-b border-gray-400 mt-3"></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Print Sign-off block */}
        <div className="mt-8 pt-6 border-t-2 border-black flex justify-between items-end text-xs">
          <div>
            <p className="font-bold">Coordenação de Local de Aplicação (CLA)</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Declaro para os devidos fins que o documento acima reflete fielmente o planejamento e execução operacional.
            </p>
          </div>
          <div className="text-center w-64">
            <div className="border-b border-black w-full mb-1"></div>
            <p className="font-black uppercase text-[10px]">{building?.claId || "Assinatura do Coordenador CLA"}</p>
          </div>
        </div>
      </div>

      {/* Individual Collaborator Audit Log Modal */}
      <CollaboratorAuditLogModal
        collaborator={selectedAuditCollab}
        isOpen={!!selectedAuditCollab}
        onClose={() => setSelectedAuditCollab(null)}
        onUpdateCollaborator={async (updated) => {
          if (updated.id) {
            await onUpdateCollaborator(updated.id, updated);
            setSelectedAuditCollab(updated);
          }
        }}
        operatorName={building?.claId || "Coordenação CLA"}
        operatorRole="CLA"
      />

    </div>
  );
}
