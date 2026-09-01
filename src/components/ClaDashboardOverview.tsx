import React, { useState, useMemo } from "react";
import { 
  CollaboratorInfo, 
  BuildingInfo, 
  EventConfigInfo, 
  CateringInfo, 
  ClaActivities,
  UserProfile
} from "../types";
import { calculateBuildingTargetQuantities } from "../lib/metrics-calculator";
import { findDuplicateCollaborators, DuplicateGroup } from "./DuplicateCollaboratorsModal";
import { ROLE_PAYMENTS, getRolePayment } from "./AssociationView";
import { ENEM_ROLES } from "./CollaboratorManager";
import FiscalAvatar from "./FiscalAvatar";
import { 
  Users, UserCheck, AlertTriangle, CheckCircle2, XCircle, Clock, 
  Building2, Layers, MapPin, Coffee, CheckSquare, MessageSquare, 
  Printer, ArrowRight, ShieldAlert, Sparkles, TrendingUp, UserPlus, 
  HelpCircle, ChevronRight, RefreshCw, Eye, ThumbsDown, UserX,
  PlusCircle, Search, Filter, Shield, Award, Banknote, Calendar,
  SlidersHorizontal, Check, AlertCircle, Copy, BarChart3
} from "lucide-react";

interface ClaDashboardOverviewProps {
  building: BuildingInfo | null;
  collaborators: CollaboratorInfo[];
  allCollaborators?: CollaboratorInfo[];
  eventConfig?: EventConfigInfo | null;
  catering?: CateringInfo | null;
  claActivities?: ClaActivities | null;
  currentUser?: UserProfile | null;
  claName?: string;
  claId?: string;
  onNavigateTab: (tabId: string) => void;
  onApproveCollaborator?: (id: string, roleName?: string) => Promise<void>;
  onUpdateCollaborator: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  onOpenDuplicateModal?: () => void;
  onSimulateCollaborator?: (collab: CollaboratorInfo) => void;
}

export default function ClaDashboardOverview({
  building,
  collaborators,
  allCollaborators = [],
  eventConfig,
  catering,
  claActivities,
  currentUser,
  claName,
  claId,
  onNavigateTab,
  onApproveCollaborator,
  onUpdateCollaborator,
  onOpenDuplicateModal,
  onSimulateCollaborator
}: ClaDashboardOverviewProps) {
  const [quickApproveModalCollab, setQuickApproveModalCollab] = useState<CollaboratorInfo | null>(null);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string>("");
  const [isApproving, setIsApproving] = useState(false);
  const [searchRecusados, setSearchRecusados] = useState("");
  const [searchPendentes, setSearchPendentes] = useState("");

  // 1. Calculate Target Quantities for each role based on building configuration or auto-calculator
  const targetQuantities = useMemo(() => {
    if (building?.rolesTargetQuantities && Object.values(building.rolesTargetQuantities).some(q => Number(q) > 0)) {
      return building.rolesTargetQuantities;
    }
    if (building) {
      return calculateBuildingTargetQuantities(building, eventConfig?.collaboratorMetrics);
    }
    return {};
  }, [building, eventConfig?.collaboratorMetrics]);

  // 2. Compute total required target slots
  const totalTargetSlots = useMemo(() => {
    const sum = Object.values(targetQuantities).reduce((acc: number, q: unknown) => acc + (Number(q) || 0), 0);
    // Fallback: if no roles are explicitly configured, standard calculation based on rooms
    if (sum === 0 && building?.roomsCount) {
      // 1 Chefe + 1 Aplicador per room + 2 Banheiro + 2 Volante + 1 Porteiro + 1 Limpeza
      return (building.roomsCount * 2) + 6;
    }
    return sum || 1;
  }, [targetQuantities, building?.roomsCount]);

  // 3. Count Collaborators in each category
  const activeCollabs = useMemo(() => {
    return collaborators.filter(c => c.status !== "Recusado" && c.status !== "Cancelado");
  }, [collaborators]);

  // Collaborators with assigned official roles (excluding pure unassigned reserves)
  const associatedCollaborators = useMemo(() => {
    return activeCollabs.filter(c => c.assignedRole && c.assignedRole.trim() !== "");
  }, [activeCollabs]);

  // Allocated into a specific room
  const allocatedInRooms = useMemo(() => {
    return activeCollabs.filter(c => c.assignedRoom && c.assignedRoom.trim() !== "" && !c.isReserve);
  }, [activeCollabs]);

  // Reserves available
  const availableReserves = useMemo(() => {
    return activeCollabs.filter(c => c.isReserve || (!c.assignedRole && !c.assignedRoom));
  }, [activeCollabs]);

  // Pending approval by CLA
  const pendingApprovalCollabs = useMemo(() => {
    return collaborators.filter(c => c.status === "Pendente");
  }, [collaborators]);

  // Confirmed collaborators count (presence confirmed or CLA confirmed)
  const presenceConfirmedCollabs = useMemo(() => {
    return collaborators.filter(c => c.status === "Confirmado");
  }, [collaborators]);

  // Not confirmed yet (attendance is pending or absent)
  const presenceUnconfirmedCollabs = useMemo(() => {
    return collaborators.filter(c => c.status === "Pendente");
  }, [collaborators]);

  // Recused Collaborators (with details on what role or room was rejected)
  const recusedCollabs = useMemo(() => {
    return collaborators.filter(c => 
      c.status === "Recusado" || !!c.refusedRole || !!c.refusalTag
    );
  }, [collaborators]);

  // 4. Duplicate Collaborators detection
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    return findDuplicateCollaborators(collaborators);
  }, [collaborators]);

  const totalDuplicateRecords = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + g.collaborators.length, 0);
  }, [duplicateGroups]);

  // 5. Allocation Percentage Calculation
  const allocationPercentage = useMemo(() => {
    if (totalTargetSlots <= 0) return 0;
    const pct = Math.min(100, Math.round((associatedCollaborators.length / totalTargetSlots) * 100));
    return isNaN(pct) ? 0 : pct;
  }, [associatedCollaborators.length, totalTargetSlots]);

  // 6. Role-by-Role Allocation breakdown and Incomplete Roles
  const roleBreakdown = useMemo(() => {
    const rolesList = building?.customRoles && building.customRoles.length > 0 
      ? building.customRoles.map(r => r.name)
      : ENEM_ROLES.map(r => r.name);

    // Merge any custom roles present in targetQuantities
    const allUniqueRoles = Array.from(new Set([...rolesList, ...Object.keys(targetQuantities)]));

    return allUniqueRoles.map(roleName => {
      const target = Number(targetQuantities[roleName]) || 0;
      const filled = activeCollabs.filter(c => c.assignedRole === roleName).length;
      const deficit = Math.max(0, target - filled);
      const surplus = Math.max(0, filled - target);
      const percent = target > 0 ? Math.min(100, Math.round((filled / target) * 100)) : (filled > 0 ? 100 : 0);
      const payment = getRolePayment(roleName);

      return {
        roleName,
        target,
        filled,
        deficit,
        surplus,
        percent,
        payment,
        isComplete: target > 0 ? filled >= target : true
      };
    }).filter(item => item.target > 0 || item.filled > 0);
  }, [building, targetQuantities, activeCollabs]);

  // Incomplete roles with deficit > 0
  const incompleteRoles = useMemo(() => {
    return roleBreakdown.filter(r => r.target > 0 && r.deficit > 0);
  }, [roleBreakdown]);

  // Total deficits across all roles
  const totalDeficitCount = useMemo(() => {
    return incompleteRoles.reduce((acc, r) => acc + r.deficit, 0);
  }, [incompleteRoles]);

  // 7. Catering / Snack Metrics
  const cateringMetrics = useMemo(() => {
    const requestedSnacks = activeCollabs.filter(c => c.snackOption && c.snackOption !== "Nenhum").length;
    const dietaryRestrictions = activeCollabs.filter(c => c.dietaryRestrictions && c.dietaryRestrictions !== "Nenhuma" && c.dietaryRestrictions.trim() !== "").length;
    return { requestedSnacks, dietaryRestrictions };
  }, [activeCollabs]);

  // 8. Handle Quick Approve with Role Selection
  const handleExecuteQuickApprove = async () => {
    if (!quickApproveModalCollab?.id) return;
    setIsApproving(true);
    try {
      const isRoleDefined = !!selectedRoleToAssign && selectedRoleToAssign.trim() !== "" && selectedRoleToAssign !== "reserva";
      await onUpdateCollaborator(quickApproveModalCollab.id, {
        status: "Confirmado",
        assignedRole: isRoleDefined ? selectedRoleToAssign : undefined,
        isReserve: !isRoleDefined,
        attendanceStatus: "Confirmado"
      });
      setQuickApproveModalCollab(null);
      setSelectedRoleToAssign("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  // Filtered lists for quick views
  const filteredRecusados = useMemo(() => {
    if (!searchRecusados.trim()) return recusedCollabs;
    const query = searchRecusados.toLowerCase();
    return recusedCollabs.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.assignedRole && c.assignedRole.toLowerCase().includes(query)) ||
      (c.refusedRole && c.refusedRole.toLowerCase().includes(query)) ||
      (c.assignedRoom && c.assignedRoom.toLowerCase().includes(query))
    );
  }, [recusedCollabs, searchRecusados]);

  const filteredPendentes = useMemo(() => {
    if (!searchPendentes.trim()) return pendingApprovalCollabs;
    const query = searchPendentes.toLowerCase();
    return pendingApprovalCollabs.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.cpf && c.cpf.includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }, [pendingApprovalCollabs, searchPendentes]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. TOP EXECUTIVE HEADER BANNER */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0c1427] to-slate-950 text-white border-2 border-slate-800 shadow-[6px_6px_0px_0px_#047857] relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 shadow-xs">
                <Shield className="w-3.5 h-3.5" />
                <span>Painel de Controle do CLA</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                Coordenação: {building?.coordRoom || currentUser?.coordinationCode || "Padrão"}
              </span>
              {building?.name && (
                <span className="text-[10px] font-sans font-extrabold text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                  {building.name}
                </span>
              )}
            </div>

            <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2.5">
              <span>Visão Geral Operacional do Local</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h1>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Acompanhe em tempo real as confirmações de fiscais, alocações de salas, pendências de aprovação e substituições do ENEM {eventConfig?.year || new Date().getFullYear()}.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab("staff")}
              className="btn-3d btn-3d-primary px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer text-white shadow-md active:scale-95 transition"
            >
              <Users className="w-4 h-4" />
              <span>Gerenciar Equipe & Funções</span>
            </button>
            <button
              onClick={() => onNavigateTab("alloc")}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Alocação de Salas</span>
            </button>
            <button
              onClick={() => onNavigateTab("plates")}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-pink-400" />
              <span>Placas & Crachás</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CRITICAL ALERTS BAR (DUPLICATES & PENDENCIES NOTIFICATION) */}
      {(duplicateGroups.length > 0 || pendingApprovalCollabs.length > 0 || recusedCollabs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Alert: Pending Approvals */}
          {pendingApprovalCollabs.length > 0 ? (
            <div 
              onClick={() => onNavigateTab("staff")}
              className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-500/40 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/15 transition shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 font-black">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                      {pendingApprovalCollabs.length} {pendingApprovalCollabs.length === 1 ? "Pendente de Aprovação" : "Pendentes de Aprovação"}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Clique para revisar cadastros e definir funções.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition" />
            </div>
          ) : null}

          {/* Alert: Duplicates Found */}
          {duplicateGroups.length > 0 ? (
            <div 
              onClick={() => onOpenDuplicateModal ? onOpenDuplicateModal() : onNavigateTab("staff")}
              className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 dark:bg-rose-950/20 dark:border-rose-500/40 flex items-center justify-between gap-3 cursor-pointer hover:bg-rose-500/15 transition shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 font-black">
                  <Copy className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                      {duplicateGroups.length} {duplicateGroups.length === 1 ? "Grupo Duplicado" : "Grupos Duplicados"}
                    </span>
                    <span className="text-[9px] bg-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                      {totalDuplicateRecords} registros
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Mesmo CPF/E-mail duplicado. Clique para unificar.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition" />
            </div>
          ) : null}

          {/* Alert: Recusados */}
          {recusedCollabs.length > 0 ? (
            <div 
              onClick={() => {
                const el = document.getElementById("recusados-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 dark:bg-red-950/20 dark:border-red-500/40 flex items-center justify-between gap-3 cursor-pointer hover:bg-red-500/15 transition shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 font-black">
                  <ThumbsDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wide">
                      {recusedCollabs.length} {recusedCollabs.length === 1 ? "Recusa de Fiscal" : "Recusas de Fiscais"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Fiscais que não participarão. Substitua com reservas.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-red-500 group-hover:translate-x-1 transition" />
            </div>
          ) : null}
        </div>
      )}

      {/* 3. MAIN ANALYTICAL KPI GRID + ALLOCATION GAUGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / TOP: 100% ALLOCATION GRAPHIC PROGRESS CARD (5 COLS) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0c1220]/95 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">
                  Progresso Geral de Alocação
                </h3>
              </div>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                allocationPercentage === 100 
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}>
                {allocationPercentage === 100 ? "100% Completo" : "Em Andamento"}
              </span>
            </div>

            {/* Radial SVG Circular Gauge */}
            <div className="flex flex-col items-center justify-center py-4 relative">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  {/* Background Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Animated Foreground Progress Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="stroke-emerald-500 transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - allocationPercentage / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                    {allocationPercentage}%
                  </span>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mt-0.5">
                    Meta do Prédio
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    {associatedCollaborators.length} de {totalTargetSlots} vagas
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <div className="mt-3 text-center px-4">
                {totalDeficitCount > 0 ? (
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Faltam <span className="font-black underline">{totalDeficitCount} colaboradores</span> para atingir 100% das vagas oficiais.
                  </p>
                ) : (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Todas as {totalTargetSlots} vagas oficiais foram preenchidas!</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Breakdown stats */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-850 text-center">
            <div className="p-2.5 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">Associados</span>
              <span className="text-base font-black text-slate-850 dark:text-white font-mono">
                {associatedCollaborators.length}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">Reservas</span>
              <span className="text-base font-black text-indigo-500 font-mono">
                {availableReserves.length}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">Meta Total</span>
              <span className="text-base font-black text-slate-850 dark:text-white font-mono">
                {totalTargetSlots}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: 6 DETAILED KPI TILES (7 COLS) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: Presenças Confirmadas */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220]/95 border-2 border-slate-200 dark:border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_#10b981]/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {collaborators.length > 0 ? Math.round((presenceConfirmedCollabs.length / collaborators.length) * 100) : 0}% Confirmação
              </span>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-slate-850 dark:text-white font-display">
                {presenceConfirmedCollabs.length} <span className="text-xs font-bold text-slate-400">fiscais</span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Confirmaram Presença no Exame
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{presenceUnconfirmedCollabs.length} pendentes de confirmação</span>
              <button 
                onClick={() => onNavigateTab("attendance")}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Ver Lista →
              </button>
            </div>
          </div>

          {/* Card 2: Colaboradores Pendentes */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220]/95 border-2 border-slate-200 dark:border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_#10b981]/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                Aprovação CLA
              </span>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-amber-500 font-display">
                {pendingApprovalCollabs.length} <span className="text-xs font-bold text-slate-400">aguardando</span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Inscrições Pendentes de Validação
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Inscritos pelo link público ou ALA</span>
              <button 
                onClick={() => onNavigateTab("staff")}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
              >
                Revisar Inscrições →
              </button>
            </div>
          </div>

          {/* Card 3: Salas & Alocações Efetivas */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220]/95 border-2 border-slate-200 dark:border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_#10b981]/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                {building?.roomsCount || 0} Salas Cadastradas
              </span>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-slate-850 dark:text-white font-display">
                {allocatedInRooms.length} <span className="text-xs font-bold text-slate-400">em salas</span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Fiscais com Sala Definida
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{availableReserves.length} reservas aguardando sala</span>
              <button 
                onClick={() => onNavigateTab("alloc")}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Alocar Salas →
              </button>
            </div>
          </div>

          {/* Card 4: Recusas de Participação */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220]/95 border-2 border-slate-200 dark:border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_#10b981]/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-black">
                <UserX className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                recusedCollabs.length > 0 ? "bg-rose-500/20 text-rose-500" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }`}>
                {recusedCollabs.length > 0 ? "Requer Substituição" : "Zero Recusas"}
              </span>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-rose-500 font-display">
                {recusedCollabs.length} <span className="text-xs font-bold text-slate-400">recusas</span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Fiscais que Recusaram Convocação
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{availableReserves.length} reservas para substituir</span>
              <button 
                onClick={() => {
                  const el = document.getElementById("recusados-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
              >
                Ver Detalhes ↓
              </button>
            </div>
          </div>

          {/* Card 5: Alimentação & Restrições */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220]/95 border-2 border-slate-200 dark:border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_#10b981]/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                <Coffee className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                Cardápio & Lanche
              </span>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-slate-850 dark:text-white font-display">
                {cateringMetrics.requestedSnacks} <span className="text-xs font-bold text-slate-400">lanches</span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Opções de Cardápio Escolhidas
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {cateringMetrics.dietaryRestrictions} restrições alimentares
              </span>
              <button 
                onClick={() => onNavigateTab("catering")}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
              >
                Cardápio →
              </button>
            </div>
          </div>

          {/* Card 6: Atividades do CLA */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220]/95 border-2 border-slate-200 dark:border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_#10b981]/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center font-black">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400">
                Cronograma Tático
              </span>
            </div>
            <div className="mt-3">
              <span className="block text-2xl font-black text-slate-850 dark:text-white font-display">
                {(() => {
                  if (!claActivities) return 0;
                  let count = 0;
                  if (claActivities.visitation?.checked) count++;
                  if (claActivities.alaDefined?.checked) count++;
                  if (claActivities.training?.checked) count++;
                  if (claActivities.receivedMaterial?.checked) count++;
                  if (claActivities.checkedMaterial?.checked) count++;
                  if (claActivities.filledOrion?.checked) count++;
                  return count;
                })()} / 6 <span className="text-xs font-bold text-slate-400">feitas</span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Tarefas do Cronograma Concluídas
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Etapas do Sábado e Domingo</span>
              <button 
                onClick={() => onNavigateTab("activities")}
                className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
              >
                Atividades →
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 4. ROLES & INCOMPLETE ALLOCATIONS DETAILED PROGRESS */}
      <div className="bg-white dark:bg-[#0c1220]/95 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Status de Preenchimento das Funções & Metas</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Identifique cargos com déficit de fiscais e acompanhe as vagas preenchidas vs necessárias no prédio.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("staff")}
            className="btn-3d btn-3d-primary px-3.5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Associar Fiscais às Funções</span>
          </button>
        </div>

        {/* Highlight Incomplete Roles if any */}
        {incompleteRoles.length > 0 && (
          <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-extrabold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Atenção: Existem {incompleteRoles.length} funções com vagas incompletas no momento!</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {incompleteRoles.map((role) => (
                <span 
                  key={role.roleName}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#070b13] border border-amber-500/40 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-xs"
                >
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{role.roleName}:</span>
                  <span className="font-mono text-rose-500 font-black">Faltam {role.deficit}</span>
                  <span className="text-[10px] text-slate-400">({role.filled}/{role.target})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Roles Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {roleBreakdown.map((role) => {
            const isDeficit = role.target > 0 && role.deficit > 0;
            return (
              <div 
                key={role.roleName}
                className={`p-4 rounded-xl border-2 transition ${
                  isDeficit 
                    ? "bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/10" 
                    : "bg-slate-50 dark:bg-[#070b13] border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-black text-xs text-slate-850 dark:text-white block line-clamp-1">
                      {role.roleName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {role.payment} / dia
                    </span>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    role.target === 0 
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500" 
                      : isDeficit 
                      ? "bg-rose-500/20 text-rose-500 font-black animate-pulse" 
                      : "bg-emerald-500/20 text-emerald-500 font-black"
                  }`}>
                    {role.target === 0 ? "Livre" : isDeficit ? `Faltam ${role.deficit}` : "Completo"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      isDeficit ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${role.percent}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400">
                    Alocados: <strong className="text-slate-900 dark:text-white">{role.filled}</strong>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Meta: <strong className="text-slate-900 dark:text-white">{role.target}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. RECUSED COLLABORATORS SECTION WITH REPLACEMENT ACTIONS */}
      <div id="recusados-section" className="bg-white dark:bg-[#0c1220]/95 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-black shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Fiscais que Recusaram Participação</span>
                <span className="text-xs bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full">
                  {recusedCollabs.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Veja qual função ou sala foi recusada para convocar e alocar um fiscal de reserva imediatamente.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchRecusados}
              onChange={(e) => setSearchRecusados(e.target.value)}
              placeholder="Buscar nas recusas..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/50"
            />
          </div>
        </div>

        {recusedCollabs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200/60 dark:border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Nenhuma recusa registrada!</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Todos os colaboradores convocados aceitaram ou estão aguardando confirmação regular.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredRecusados.map((collab) => {
              const refusedFunction = collab.refusedRole || collab.assignedRole || "Fiscal de Sala";
              const refusedRoom = collab.assignedRoom || "Sem Sala Definida";

              return (
                <div 
                  key={collab.id || collab.cpf}
                  className="p-4 rounded-xl bg-rose-500/5 border-2 border-rose-500/20 dark:bg-rose-950/10 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FiscalAvatar
                        name={collab.name}
                        photoUrl={collab.photoUrl}
                        size="md"
                      />
                      <div>
                        <span className="font-black text-xs text-slate-850 dark:text-white block line-clamp-1">
                          {collab.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          CPF: {collab.cpf} {collab.whatsapp ? `• WhatsApp: ${collab.whatsapp}` : ""}
                        </span>
                        {collab.email && (
                          <span className="text-[10px] text-slate-400 truncate block max-w-[200px]">
                            {collab.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white shrink-0 shadow-xs">
                      RECUSADO
                    </span>
                  </div>

                  {/* Information on What Was Refused */}
                  <div className="p-2.5 bg-white dark:bg-[#070b13] rounded-lg border border-rose-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Função Recusada:</span>
                      <span className="font-black text-rose-600 dark:text-rose-400 font-sans">
                        {refusedFunction}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Local / Sala:</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        {refusedRoom}
                      </span>
                    </div>
                    {collab.refusalTag && (
                      <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                        Motivo: {collab.refusalTag}
                      </div>
                    )}
                  </div>

                  {/* Substitution Action Button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      {availableReserves.length > 0 ? `${availableReserves.length} reservas disponíveis` : "Sem reservas no momento"}
                    </span>

                    <button
                      onClick={() => onNavigateTab("alloc")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Substituir com Reserva</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. PENDING COLLABORATORS REVIEW TABLE */}
      {pendingApprovalCollabs.length > 0 && (
        <div className="bg-white dark:bg-[#0c1220]/95 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-850 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Colaboradores Aguardando Aprovação</span>
                  <span className="text-xs bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full">
                    {pendingApprovalCollabs.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Aprove e já defina a função do fiscal (ou aprove como Reserva se não selecionar cargo).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchPendentes}
                  onChange={(e) => setSearchPendentes(e.target.value)}
                  placeholder="Buscar pendentes..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <button
                onClick={() => onNavigateTab("staff")}
                className="btn-3d btn-3d-primary px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Ver Todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPendentes.slice(0, 6).map((collab) => (
              <div 
                key={collab.id || collab.cpf}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-amber-500/40 transition"
              >
                <div className="flex items-start gap-3">
                  <FiscalAvatar
                    name={collab.name}
                    photoUrl={collab.photoUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-black text-xs text-slate-850 dark:text-white block truncate">
                      {collab.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      CPF: {collab.cpf}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {collab.email || collab.whatsapp || "Sem contato informado"}
                    </span>
                    {collab.specialRole && collab.specialRole !== "Nenhuma" && (
                      <span className="inline-block mt-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        {collab.specialRole}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setQuickApproveModalCollab(collab);
                      setSelectedRoleToAssign(collab.specialRole && collab.specialRole !== "Nenhuma" ? collab.specialRole : "");
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprovar & Função</span>
                  </button>

                  {onSimulateCollaborator && (
                    <button
                      onClick={() => onSimulateCollaborator(collab)}
                      title="Simular visualização deste fiscal"
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. QUICK APPROVE MODAL WITH ROLE SELECTOR */}
      {quickApproveModalCollab && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-md rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-slate-850 dark:text-white uppercase tracking-wider">
                    Aprovar Colaborador
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Defina a função ou aprove como reserva</p>
                </div>
              </div>

              <button
                onClick={() => setQuickApproveModalCollab(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Collaborator Brief Details */}
            <div className="p-3 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <FiscalAvatar
                name={quickApproveModalCollab.name}
                photoUrl={quickApproveModalCollab.photoUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <span className="font-black text-xs text-slate-900 dark:text-white block truncate">
                  {quickApproveModalCollab.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  CPF: {quickApproveModalCollab.cpf}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                  {quickApproveModalCollab.specialRole && quickApproveModalCollab.specialRole !== "Nenhuma" 
                    ? `Função de preferência: ${quickApproveModalCollab.specialRole}`
                    : "Sem preferência informada"}
                </span>
              </div>
            </div>

            {/* Role Selection Field */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                Selecione a Função Oficial do Fiscal:
              </label>
              <select
                value={selectedRoleToAssign}
                onChange={(e) => setSelectedRoleToAssign(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b13] text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Aprovar como Reserva (Sem Função Específica) --</option>
                {ENEM_ROLES.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name} — ({getRolePayment(r.name)})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-tight">
                💡 Caso você não selecione uma função específica agora, o fiscal será aprovado automaticamente no status de <strong>Fiscal de Reserva</strong>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setQuickApproveModalCollab(null)}
                className="w-1/3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isApproving}
                onClick={handleExecuteQuickApprove}
                className="w-2/3 btn-3d btn-3d-primary py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition"
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Aprovando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{selectedRoleToAssign ? `Aprovar como ${selectedRoleToAssign}` : "Aprovar como Reserva"}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
