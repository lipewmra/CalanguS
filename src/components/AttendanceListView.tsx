import React, { useState, useMemo } from "react";
import { CollaboratorInfo, BuildingInfo, UserProfile } from "../types";
import FiscalAvatar from "./FiscalAvatar";
import { 
  ClipboardCheck, Users, CheckCircle2, XCircle, AlertTriangle, 
  Search, Phone, MessageSquare, Printer, Check, X, 
  Sparkles, Clock, MapPin, UserCheck, UserX, ShieldAlert,
  ArrowRightLeft, Filter, RefreshCw, Send, CheckSquare, Layers, Download
} from "lucide-react";

interface AttendanceListViewProps {
  collaborators: CollaboratorInfo[];
  building: BuildingInfo | null;
  onUpdateCollaborator: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  readOnly?: boolean;
}

export default function AttendanceListView({
  collaborators,
  building,
  onUpdateCollaborator,
  readOnly = false
}: AttendanceListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent" | "reserves">("all");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [activeExamDay, setActiveExamDay] = useState<"day1" | "day2">("day1");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Filter only collaborators who are associated / allocated for the exam
  // (having an assignedRole, assignedRoom, or status === "Confirmado", or active reserves)
  const allocatedCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      // Must be confirmed in the system
      if (c.status === "Recusado" || c.status === "Cancelado") return false;
      // Allocated if they have assigned role, assigned room, or are designated reserve/effective
      return Boolean(c.assignedRole || c.assignedRoom || !c.isReserve || c.status === "Confirmado");
    });
  }, [collaborators]);

  // Extract list of all unique assigned rooms for filter dropdown
  const uniqueRooms = useMemo(() => {
    const rooms = new Set<string>();
    allocatedCollaborators.forEach(c => {
      if (c.assignedRoom) rooms.add(c.assignedRoom);
    });
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allocatedCollaborators]);

  // Quantitative stats calculation
  const totalAllocated = allocatedCollaborators.length;
  
  const presentCollaborators = useMemo(() => {
    return allocatedCollaborators.filter(c => Boolean(c.isPresent));
  }, [allocatedCollaborators]);

  const absentCollaborators = useMemo(() => {
    return allocatedCollaborators.filter(c => !c.isPresent);
  }, [allocatedCollaborators]);

  const totalPresent = presentCollaborators.length;
  const totalAbsent = absentCollaborators.length;
  const presencePercentage = totalAllocated > 0 ? Math.round((totalPresent / totalAllocated) * 100) : 0;

  // Available reserves for quick dispatch
  const availableReserves = useMemo(() => {
    return collaborators.filter(c => c.isReserve && c.isPresent && !c.assignedRoom);
  }, [collaborators]);

  // Filtered list based on active filters and search query
  const filteredCollaborators = useMemo(() => {
    return allocatedCollaborators.filter(c => {
      // Status filter
      if (statusFilter === "present" && !c.isPresent) return false;
      if (statusFilter === "absent" && c.isPresent) return false;
      if (statusFilter === "reserves" && !c.isReserve) return false;

      // Room filter
      if (roomFilter !== "all" && c.assignedRoom !== roomFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const cpfMatch = (c.cpf || "").toLowerCase().includes(q);
        const roomMatch = (c.assignedRoom || "").toLowerCase().includes(q);
        const roleMatch = (c.assignedRole || "").toLowerCase().includes(q);
        const phoneMatch = (c.whatsapp || "").toLowerCase().includes(q);
        if (!nameMatch && !cpfMatch && !roomMatch && !roleMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allocatedCollaborators, statusFilter, roomFilter, searchQuery]);

  // Toggle single presence
  const handleTogglePresence = async (collaborator: CollaboratorInfo) => {
    if (readOnly || !collaborator.id) return;
    setUpdatingId(collaborator.id);
    try {
      const newPresenceState = !collaborator.isPresent;
      await onUpdateCollaborator(collaborator.id, {
        isPresent: newPresenceState,
        presenceCheckedAt: newPresenceState ? new Date().toISOString() : undefined
      });
    } catch (err) {
      console.error("Erro ao alternar presença:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Batch action: Mark all as present
  const handleMarkAllPresent = async () => {
    if (readOnly || batchLoading) return;
    const confirmAction = window.confirm(`Deseja marcar a presença de TODOS os ${allocatedCollaborators.length} colaboradores alocados?`);
    if (!confirmAction) return;

    setBatchLoading(true);
    try {
      const now = new Date().toISOString();
      for (const c of allocatedCollaborators) {
        if (!c.isPresent && c.id) {
          await onUpdateCollaborator(c.id, {
            isPresent: true,
            presenceCheckedAt: now
          });
        }
      }
    } catch (err) {
      console.error("Erro ao marcar todos como presentes:", err);
    } finally {
      setBatchLoading(false);
    }
  };

  // Batch action: Clear all presence marks
  const handleClearAllPresence = async () => {
    if (readOnly || batchLoading) return;
    const confirmAction = window.confirm("Deseja desmarcar a presença de todos os colaboradores alocados?");
    if (!confirmAction) return;

    setBatchLoading(true);
    try {
      for (const c of allocatedCollaborators) {
        if (c.isPresent && c.id) {
          await onUpdateCollaborator(c.id, {
            isPresent: false,
            presenceCheckedAt: undefined
          });
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

  // Format WhatsApp Link
  const getWhatsAppLink = (phone: string, name: string, role?: string, room?: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${name}, aqui é da Coordenação do ENEM (${building?.name || "Local de Aplicação"}). Estamos iniciando o credenciamento para o exame hoje. Você está alocado como *${role || "Fiscal"}* na *${room || "Coordenação"}*. Favor confirmar sua chegada ao local!`
    );
    return `https://wa.me/${formattedPhone}?text=${text}`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* 1. TOP HEADER & DIRECT ACTIONS */}
      <div className="no-print bg-white dark:bg-[#0c1220]/95 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/25 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                Lista de Presença
                <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  ENEM 2026
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Controle de chamada em tempo real, validação de presença e gestão imediata de ausências e faltosos.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons cluster */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleMarkAllPresent}
            disabled={readOnly || batchLoading || totalAllocated === 0}
            className="px-3.5 py-2.5 rounded-xl border-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] transition cursor-pointer disabled:opacity-50"
            title="Marcar presença para todos os alocados"
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>{batchLoading ? "Atualizando..." : "Marcar Todos Presentes"}</span>
          </button>

          <button
            onClick={handleClearAllPresence}
            disabled={readOnly || batchLoading || totalPresent === 0}
            className="px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            title="Limpar todas as confirmações de presença"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Limpar Presenças</span>
          </button>

          <button
            onClick={handlePrintAttendance}
            className="px-3.5 py-2.5 rounded-xl border-2 border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="Imprimir folha de presença para assinatura física"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Imprimir Folha</span>
          </button>
        </div>
      </div>

      {/* 2. QUANTITATIVE STATS METRICS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1: Total Alocados */}
        <div 
          onClick={() => setStatusFilter("all")}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
            statusFilter === "all"
              ? "bg-sky-500/10 border-sky-500 shadow-[4px_4px_0px_0px_#0284c7]"
              : "bg-white dark:bg-[#0c1220]/80 border-slate-200 dark:border-slate-800 hover:border-sky-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Alocados
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">
              {totalAllocated}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              colaboradores
            </span>
          </div>
          <div className="mt-3 text-[11px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
            <span>Escola:</span>
            <strong className="truncate">{building?.name || "Local não configurado"}</strong>
          </div>
        </div>

        {/* Metric 2: Presentes */}
        <div 
          onClick={() => setStatusFilter("present")}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
            statusFilter === "present"
              ? "bg-emerald-500/10 border-emerald-500 shadow-[4px_4px_0px_0px_#10b981]"
              : "bg-white dark:bg-[#0c1220]/80 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Presentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {totalPresent}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                validados
              </span>
            </div>
            <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {presencePercentage}%
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${presencePercentage}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Faltosos */}
        <div 
          onClick={() => setStatusFilter("absent")}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
            statusFilter === "absent"
              ? "bg-rose-500/10 border-rose-500 shadow-[4px_4px_0px_0px_#f43f5e]"
              : "bg-white dark:bg-[#0c1220]/80 border-slate-200 dark:border-slate-800 hover:border-rose-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Faltosos / Ausentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-rose-600 dark:text-rose-400">
                {totalAbsent}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                pendentes
              </span>
            </div>
            {totalAbsent > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 animate-pulse">
                Atenção
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                Completo
              </span>
            )}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {totalAbsent > 0 
              ? `${totalAbsent} vaga(s) necessitam de fiscal ou substituição.` 
              : "Nenhuma falta registrada no momento."}
          </div>
        </div>

      </div>

      {/* 3. FILTERS, SEARCH AND ROOM SELECTOR */}
      <div className="no-print bg-white dark:bg-[#0c1220]/80 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, CPF, sala ou função..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Badges & Room Select */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Todos ({totalAllocated})
            </button>
            <button
              onClick={() => setStatusFilter("present")}
              className={`px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer ${
                statusFilter === "present"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-500 hover:text-emerald-500"
              }`}
            >
              Presentes ({totalPresent})
            </button>
            <button
              onClick={() => setStatusFilter("absent")}
              className={`px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer ${
                statusFilter === "absent"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-slate-500 hover:text-rose-500"
              }`}
            >
              Faltosos ({totalAbsent})
            </button>
          </div>

          {/* Room filter select */}
          {uniqueRooms.length > 0 && (
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Todas as Salas</option>
              {uniqueRooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. MAIN ATTENDANCE TABLE / ROSTER */}
      <div className="bg-white dark:bg-[#0c1220]/95 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="p-4 sm:px-6 border-b-2 border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Chamada e Validação de Presença
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono font-bold">
            Exibindo {filteredCollaborators.length} de {totalAllocated}
          </span>
        </div>

        {/* Table / List */}
        {filteredCollaborators.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum colaborador encontrado com os filtros selecionados.
            </p>
            <p className="text-xs text-slate-400">
              Tente redefinir a busca ou alternar os filtros de status e sala.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <th className="py-3 px-4 text-center w-16">Presença</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Função Alocada</th>
                  <th className="py-3 px-4">Sala</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right no-print">Contato / Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredCollaborators.map((c) => {
                  const isChecked = Boolean(c.isPresent);
                  const isUpdating = updatingId === c.id;

                  return (
                    <tr
                      key={c.id || c.cpf}
                      className={`transition-colors duration-150 ${
                        isChecked 
                          ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.08]" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      }`}
                    >
                      {/* Checkbox Presença */}
                      <td className="py-3 px-4 text-center">
                        <label className="relative flex items-center justify-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={readOnly || isUpdating}
                            onChange={() => handleTogglePresence(c)}
                            className="sr-only"
                          />
                          <div
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                              isChecked
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-xs scale-105"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-emerald-500"
                            } ${isUpdating ? "opacity-50 animate-pulse" : ""}`}
                          >
                            {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                          </div>
                        </label>
                      </td>

                      {/* Colaborador Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FiscalAvatar
                            photoUrl={c.photoUrl}
                            name={c.name}
                            role={c.assignedRole || "Fiscal"}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-900 dark:text-white block truncate">
                              {c.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span>CPF: {c.cpf}</span>
                              {c.whatsapp && (
                                <span className="hidden sm:inline">• {c.whatsapp}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Função Alocada */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {c.assignedRole || "Não associada"}
                        </span>
                        {c.isReserve && (
                          <span className="ml-1.5 inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            Reserva
                          </span>
                        )}
                      </td>

                      {/* Sala */}
                      <td className="py-3 px-4">
                        {c.assignedRoom ? (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {c.assignedRoom}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[11px] italic">
                            Coordenação / Geral
                          </span>
                        )}
                      </td>

                      {/* Status de Presença */}
                      <td className="py-3 px-4">
                        {isChecked ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Presente</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Faltoso</span>
                          </div>
                        )}
                        {c.presenceCheckedAt && (
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                            {new Date(c.presenceCheckedAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>

                      {/* Contato / Ações */}
                      <td className="py-3 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.whatsapp && (
                            <a
                              href={getWhatsAppLink(c.whatsapp, c.name, c.assignedRole, c.assignedRoom)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                              title={`Enviar WhatsApp para ${c.name}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}
                          {c.whatsapp && (
                            <a
                              href={`tel:${c.whatsapp.replace(/\D/g, "")}`}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                              title={`Ligar para ${c.name}`}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
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

      {/* 5. MANDATORY BOTTOM SECTION: QUADRO DE FALTOSOS */}
      <div className="bg-white dark:bg-[#0c1220]/95 p-6 rounded-2xl border-2 border-rose-300/80 dark:border-rose-900/60 shadow-[4px_4px_0px_0px_#f43f5e]/30 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-rose-100 dark:border-rose-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                Quadro de Faltosos / Ausentes para o Exame
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold">
                  {totalAbsent}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lista detalhada dos colaboradores alocados que ainda não validaram presença no local de prova.
              </p>
            </div>
          </div>

          {availableReserves.length > 0 && totalAbsent > 0 && (
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 flex items-center gap-1.5 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{availableReserves.length} Fiscais de Reserva disponíveis para substituição</span>
            </div>
          )}
        </div>

        {/* Absent List Content */}
        {absentCollaborators.length === 0 ? (
          <div className="p-6 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 font-black text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>100% DE PRESENÇA CONFIRMADA</span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Todos os {totalAllocated} colaboradores associados e alocados já tiveram a presença validada!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {absentCollaborators.map((absent) => (
              <div
                key={absent.id || absent.cpf}
                className="p-4 rounded-xl border-2 border-rose-200 dark:border-rose-900/40 bg-rose-500/[0.03] dark:bg-rose-500/[0.06] hover:bg-rose-500/[0.08] transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FiscalAvatar
                      photoUrl={absent.photoUrl}
                      name={absent.name}
                      role={absent.assignedRole || "Fiscal"}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">
                        {absent.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 block">
                        CPF: {absent.cpf}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                    Ausente
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 font-semibold">Função:</span>
                    <strong className="text-slate-900 dark:text-white">{absent.assignedRole || "Não atribuída"}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 font-semibold">Sala Designada:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{absent.assignedRoom || "Coordenação"}</strong>
                  </div>
                  {absent.whatsapp && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 font-semibold">Telefone:</span>
                      <span className="font-mono text-[10px]">{absent.whatsapp}</span>
                    </div>
                  )}
                </div>

                {/* Quick actions for absent fiscal */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleTogglePresence(absent)}
                    disabled={readOnly}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Validar Agora</span>
                  </button>

                  {absent.whatsapp && (
                    <a
                      href={getWhatsAppLink(absent.whatsapp, absent.name, absent.assignedRole, absent.assignedRoom)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-500/20 transition cursor-pointer"
                      title="Contatar no WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Cobrar</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
