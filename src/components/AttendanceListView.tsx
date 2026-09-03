import React, { useState, useMemo } from "react";
import { CollaboratorInfo, BuildingInfo, EventConfigInfo } from "../types";
import FiscalAvatar from "./FiscalAvatar";
import CollaboratorAuditLogModal from "./CollaboratorAuditLogModal";
import { appendCollaboratorLog } from "../lib/collaborator-logger";
import { 
  ClipboardCheck, 
  Calendar, 
  CheckCircle2, 
  Search, 
  Printer, 
  Check, 
  Filter, 
  RefreshCw, 
  CheckSquare, 
  MapPin, 
  UserCheck, 
  UserX, 
  Users, 
  Clock, 
  ShieldAlert,
  Sparkles,
  ChevronRight,
  History
} from "lucide-react";

interface AttendanceListViewProps {
  collaborators: CollaboratorInfo[];
  building: BuildingInfo | null;
  eventConfig?: EventConfigInfo | null;
  onUpdateCollaborator: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  readOnly?: boolean;
}

export default function AttendanceListView({
  collaborators,
  building,
  eventConfig,
  onUpdateCollaborator,
  readOnly = false
}: AttendanceListViewProps) {
  // Selected Exam Day (Dia 1 ou Dia 2)
  const [activeDay, setActiveDay] = useState<"day1" | "day2">("day1");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedAuditCollab, setSelectedAuditCollab] = useState<CollaboratorInfo | null>(null);

  // Exam Dates & Themes
  const rawDay1 = eventConfig?.examDates?.[0];
  const rawDay2 = eventConfig?.examDates?.[1];
  const examDay1Label = (rawDay1 && rawDay1 !== "01/11/2026" && rawDay1 !== "03/11/2024" && rawDay1 !== "03/11/2026") ? rawDay1 : "08/11/2026";
  const examDay2Label = (rawDay2 && rawDay2 !== "08/11/2026" && rawDay2 !== "10/11/2024") ? rawDay2 : "15/11/2026";

  // Filter ONLY allocated collaborators (allocated to a role or room) and sort alphabetically
  const allocatedCollaborators = useMemo(() => {
    return (collaborators || [])
      .filter(c => {
        if (c.status === "Recusado" || c.status === "Cancelado") return false;
        const hasRole = Boolean(c.assignedRole && c.assignedRole.trim() !== "");
        const hasRoom = Boolean(c.assignedRoom && c.assignedRoom.trim() !== "");
        return hasRole || hasRoom;
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

  // Statistics for the active day
  const totalAllocated = allocatedCollaborators.length;
  
  const presentCount = useMemo(() => {
    return allocatedCollaborators.filter(c => isCollaboratorPresentOnActiveDay(c)).length;
  }, [allocatedCollaborators, activeDay]);

  const absentCount = totalAllocated - presentCount;
  const presencePercentage = totalAllocated > 0 ? Math.round((presentCount / totalAllocated) * 100) : 0;

  // Filtered List based on search and role filter
  const filteredList = useMemo(() => {
    return allocatedCollaborators.filter(c => {
      // Role Filter
      if (roleFilter !== "all" && c.assignedRole !== roleFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const cpfMatch = (c.cpf || "").toLowerCase().includes(q);
        const roleMatch = (c.assignedRole || "").toLowerCase().includes(q);
        const roomMatch = (c.assignedRoom || "").toLowerCase().includes(q);
        if (!nameMatch && !cpfMatch && !roleMatch && !roomMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allocatedCollaborators, roleFilter, searchQuery]);

  // Toggle single presence on active day
  const handleTogglePresence = async (collaborator: CollaboratorInfo) => {
    if (readOnly || !collaborator.id) return;
    setUpdatingId(collaborator.id);

    try {
      const isCurrentlyPresent = isCollaboratorPresentOnActiveDay(collaborator);
      const newPresenceState = !isCurrentlyPresent;
      const now = new Date().toISOString();
      const dayName = activeDay === "day1" ? "1º Dia" : "2º Dia";

      const updatedLogs = appendCollaboratorLog(
        collaborator,
        "confirmacao_presenca",
        newPresenceState ? `Presença Registrada (${dayName})` : `Presença Desmarcada (${dayName})`,
        newPresenceState 
          ? `Presença física confirmada no local de aplicação (${dayName}) na sala ${collaborator.assignedRoom || "Coordenação"}.`
          : `Registro de presença desmarcado pela coordenação (${dayName}).`,
        {
          performedBy: building?.claId || "Coordenação CLA",
          performedByRole: "CLA",
          details: { dia: dayName, presente: newPresenceState, horario: now }
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
    if (readOnly || batchLoading || filteredList.length === 0) return;
    const confirmAction = window.confirm(
      `Deseja confirmar a presença de TODOS os ${filteredList.length} colaboradores listados para o ${activeDay === "day1" ? "1º Dia" : "2º Dia"} do ENEM?`
    );
    if (!confirmAction) return;

    setBatchLoading(true);
    try {
      const now = new Date().toISOString();
      for (const c of filteredList) {
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

  // Print attendance sheet
  const handlePrintAttendance = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. TOP HEADER */}
      <div className="no-print bg-white dark:bg-[#0c1220]/95 p-5 sm:p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-display font-black text-slate-900 dark:text-white">
                Lista de Presença
              </h1>
              <span className="text-[11px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Menu 5 • ENEM 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Selecione o dia do exame e confirme a presença dos colaboradores alocados em ordem alfabética.
            </p>
          </div>
        </div>

        {/* Global Print & Batch Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleMarkAllPresent}
            disabled={readOnly || batchLoading || filteredList.length === 0}
            className="px-3.5 py-2.5 rounded-xl border-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Confirmar presença de todos os listados"
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>{batchLoading ? "Salvando..." : "Confirmar Todos"}</span>
          </button>

          <button
            onClick={handleClearAllPresence}
            disabled={readOnly || batchLoading || presentCount === 0}
            className="px-3 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Desmarcar todas as presenças deste dia"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Desmarcar Todos</span>
          </button>

          <button
            onClick={handlePrintAttendance}
            className="px-4 py-2.5 rounded-xl border-2 border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="Imprimir lista oficial para assinatura física"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Imprimir Folha</span>
          </button>
        </div>
      </div>

      {/* 2. ENEM DAYS SELECTOR (MOSTRARÁ OS DIAS DO ENEM) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Dia 1 Card / Button */}
        <button
          onClick={() => setActiveDay("day1")}
          className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
            activeDay === "day1"
              ? "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-500 shadow-[4px_4px_0px_0px_#10b981] dark:shadow-[4px_4px_0px_0px_#10b981]/50"
              : "bg-white dark:bg-[#0c1220]/80 border-slate-200 dark:border-slate-800 hover:border-emerald-400/60 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                activeDay === "day1"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                1º
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 block">
                  Primeiro Domingo de Prova
                </span>
                <h2 className="text-base font-display font-black text-slate-900 dark:text-white">
                  Dia 1 — {examDay1Label}
                </h2>
              </div>
            </div>
            {activeDay === "day1" && (
              <span className="text-[10px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                Ativo
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Linguagens, Códigos e suas Tecnologias • Redação • Ciências Humanas e suas Tecnologias
          </p>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500 dark:text-slate-400">
              Chamada: <strong className="text-emerald-600 dark:text-emerald-400">{activeDay === "day1" ? presentCount : allocatedCollaborators.filter(c => Boolean(c.isPresentDay1 !== undefined ? c.isPresentDay1 : c.isPresent)).length} de {totalAllocated}</strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
              {totalAllocated > 0 ? Math.round(((activeDay === "day1" ? presentCount : allocatedCollaborators.filter(c => Boolean(c.isPresentDay1 !== undefined ? c.isPresentDay1 : c.isPresent)).length) / totalAllocated) * 100) : 0}% Confirmado
            </span>
          </div>
        </button>

        {/* Dia 2 Card / Button */}
        <button
          onClick={() => setActiveDay("day2")}
          className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
            activeDay === "day2"
              ? "bg-gradient-to-br from-indigo-500/15 via-teal-500/10 to-transparent border-indigo-500 shadow-[4px_4px_0px_0px_#6366f1] dark:shadow-[4px_4px_0px_0px_#6366f1]/50"
              : "bg-white dark:bg-[#0c1220]/80 border-slate-200 dark:border-slate-800 hover:border-indigo-400/60 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                activeDay === "day2"
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                2º
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 block">
                  Segundo Domingo de Prova
                </span>
                <h2 className="text-base font-display font-black text-slate-900 dark:text-white">
                  Dia 2 — {examDay2Label}
                </h2>
              </div>
            </div>
            {activeDay === "day2" && (
              <span className="text-[10px] font-black uppercase bg-indigo-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                Ativo
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Ciências da Natureza e suas Tecnologias • Matemática e suas Tecnologias
          </p>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500 dark:text-slate-400">
              Chamada: <strong className="text-indigo-600 dark:text-indigo-400">{activeDay === "day2" ? presentCount : allocatedCollaborators.filter(c => Boolean(c.isPresentDay2)).length} de {totalAllocated}</strong>
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono">
              {totalAllocated > 0 ? Math.round(((activeDay === "day2" ? presentCount : allocatedCollaborators.filter(c => Boolean(c.isPresentDay2)).length) / totalAllocated) * 100) : 0}% Confirmado
            </span>
          </div>
        </button>

      </div>

      {/* 3. FILTROS: BUSCA E FILTRO POR FUNÇÃO */}
      <div className="no-print bg-white dark:bg-[#0c1220]/90 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search by Name / CPF */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar fiscal por nome ou CPF..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter by Role & Counters */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* Role Filter Select */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Todas as Funções ({allocatedCollaborators.length})</option>
              {uniqueRoles.map(r => (
                <option key={r} value={r}>
                  {r} ({allocatedCollaborators.filter(c => c.assignedRole === r).length})
                </option>
              ))}
            </select>
          </div>

          {/* Stat Pill */}
          <div className="flex items-center gap-2 text-xs font-bold font-mono">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              Presentes: {presentCount} / {totalAllocated}
            </span>
            {absentCount > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                Faltam: {absentCount}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 4. LISTA DE COLABORADORES ALOCADOS POR ORDEM ALFABÉTICA (APENAS BOTÃO DE CONFIRMAR PRESENÇA) */}
      <div className="no-print bg-white dark:bg-[#0c1220]/95 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="p-4 sm:px-6 border-b-2 border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {activeDay === "day1" ? `1º Dia (${examDay1Label})` : `2º Dia (${examDay2Label})`} — Ordem Alfabética
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono font-bold">
            Exibindo {filteredList.length} de {totalAllocated} colaboradores alocados
          </span>
        </div>

        {/* Empty State */}
        {allocatedCollaborators.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-base font-display font-black text-slate-800 dark:text-white">
              Nenhum Colaborador Alocado no Momento
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              A lista de presença exibe exclusivamente os colaboradores que foram <strong>alocados em função ou sala</strong> (Menu 3 e Menu 4). Realize as alocações para iniciar a chamada.
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum colaborador encontrado com os filtros informados.
            </p>
            <p className="text-xs text-slate-400">
              Tente redefinir o campo de busca ou selecionar outra função.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 text-center w-12 font-mono">Nº</th>
                  <th className="py-3.5 px-4">Nome do Colaborador (Ordem Alfabética)</th>
                  <th className="py-3.5 px-4">Função Alocada</th>
                  <th className="py-3.5 px-4">Sala / Posto</th>
                  <th className="py-3.5 px-4 text-right">Confirmação de Presença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredList.map((collab, index) => {
                  const isPresent = isCollaboratorPresentOnActiveDay(collab);
                  const presenceTime = getPresenceTimestampOnActiveDay(collab);
                  const isUpdating = updatingId === collab.id;

                  return (
                    <tr
                      key={collab.id || collab.cpf}
                      className={`transition-colors duration-150 ${
                        isPresent 
                          ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      }`}
                    >
                      {/* Alphabetical Order Number */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 text-[11px]">
                        {String(index + 1).padStart(2, "0")}
                      </td>

                      {/* Colaborador Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <FiscalAvatar
                            photoUrl={collab.photoUrl}
                            name={collab.name}
                            role={collab.assignedRole || "Fiscal"}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-900 dark:text-white block truncate text-sm">
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

                      {/* Função Alocada */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {collab.assignedRole || "Não associada"}
                        </span>
                      </td>

                      {/* Sala / Posto */}
                      <td className="py-3.5 px-4">
                        {collab.assignedRoom ? (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-xs">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {collab.assignedRoom}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[11px] italic">
                            Coordenação
                          </span>
                        )}
                      </td>

                      {/* APENAS O BOTÃO DE CONFIRMA PRESENÇA E LOGS */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAuditCollab(collab)}
                            title="Ver histórico e auditoria completa do colaborador (Logs)"
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
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

      {/* ========================================================================= */}
      {/* 5. IMPRESSÃO OFICIAL DA LISTA DE PRESENÇA (MANTÉM O MESMO PADRÃO OFICIAL) */}
      {/* ========================================================================= */}
      <div className="hidden print:block print:w-full print:p-6 print:m-0 bg-white text-black font-sans text-xs">
        {/* Print Header */}
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">ENEM 2026 — LISTA OFICIAL DE PRESENÇA</h1>
            <p className="text-xs font-bold uppercase mt-0.5">
              INSTITUTO NACIONAL DE ESTUDOS E PESQUISAS EDUCACIONAIS ANÍSIO TEIXEIRA (INEP) • CEBRASPE
            </p>
            <div className="mt-2 text-xs flex gap-4 font-semibold">
              <span><strong>Local de Aplicação:</strong> {building?.name || "Local de Aplicação"}</span>
              <span><strong>Coordenação:</strong> {building?.coordRoom || "—"}</span>
              <span><strong>Exame:</strong> {activeDay === "day1" ? `1º Dia (${examDay1Label})` : `2º Dia (${examDay2Label})`}</span>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] border-2 border-black p-2 rounded">
            <span className="block font-black text-xs">CALANGUS v2.8</span>
            <span className="block">Emissão: {new Date().toLocaleDateString("pt-BR")}</span>
            <span className="block font-bold">Total: {allocatedCollaborators.length} fiscais</span>
          </div>
        </div>

        {/* Printable Table sorted alphabetically */}
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

              return (
                <tr key={collab.id || collab.cpf} className="border-b border-black">
                  <td className="border border-black p-1.5 text-center font-mono font-bold">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-bold uppercase">{collab.name}</td>
                  <td className="border border-black p-1.5 font-mono">{collab.cpf}</td>
                  <td className="border border-black p-1.5 font-semibold">{collab.assignedRole || "Fiscal"}</td>
                  <td className="border border-black p-1.5 font-bold">{collab.assignedRoom || "Coordenação"}</td>
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

        {/* Print Sign-off block */}
        <div className="mt-8 pt-6 border-t-2 border-black flex justify-between items-end text-xs">
          <div>
            <p className="font-bold">Coordenação de Local de Aplicação (CLA)</p>
            <p className="text-[10px] text-gray-600 mt-1">Declaro para os devidos fins que a lista acima reflete fielmente a presença dos colaboradores.</p>
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
