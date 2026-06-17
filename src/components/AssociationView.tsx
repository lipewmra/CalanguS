import React, { useState } from "react";
import { CollaboratorInfo } from "../types";
import { 
  Users, UserCheck, Search, Filter, Sparkles, CheckCircle, 
  HelpCircle, ShieldAlert, ArrowRight, RotateCcw, AlertCircle
} from "lucide-react";
import { ENEM_ROLES } from "./CollaboratorManager";

interface AssociationViewProps {
  collaborators: CollaboratorInfo[];
  onUpdate: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  readOnly?: boolean;
}

export default function AssociationView({ collaborators, onUpdate, readOnly = false }: AssociationViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all"); // "all" | "associated" | "unassociated" | specific role
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Compute metrics
  const totalCollabs = collaborators.length;
  const associatedCollabs = collaborators.filter(c => c.assignedRole && c.assignedRole !== "");
  const unassociatedCollabs = collaborators.filter(c => !c.assignedRole || c.assignedRole === "");

  // Counting for each role
  const roleCounts = ENEM_ROLES.reduce((acc, current) => {
    acc[current.name] = collaborators.filter(c => c.assignedRole === current.name).length;
    return acc;
  }, {} as Record<string, number>);

  // Handle role setting
  const handleAssignRole = async (collabId: string, roleName: string) => {
    setIsUpdatingId(collabId);
    try {
      const isReserve = roleName === ""; // unassociated is reserve
      const collab = collaborators.find(c => c.id === collabId);
      if (collab) {
        await onUpdate(collabId, {
          assignedRole: roleName,
          isReserve,
          // If moving to reserve or different role, let's also preserve their classroom unless they are unallocated
          assignedRoom: isReserve ? "" : (collab.assignedRoom || "")
        });
        setSuccessMsg(`Função de ${collab.name} atualizada com sucesso!`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Filtered Collaborators
  const filtered = collaborators.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterRole === "associated") {
      return c.assignedRole && c.assignedRole !== "";
    }
    if (filterRole === "unassociated") {
      return !c.assignedRole || c.assignedRole === "";
    }
    if (filterRole !== "all") {
      return c.assignedRole === filterRole;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/20 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <UserCheck className="w-48 h-48 text-indigo-400 stroke-1" />
        </div>
        <div className="relative z-10">
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
            Menu Associação Oficial
          </span>
          <h2 className="text-xl font-display font-black tracking-tight text-white mt-2">
            Designação de Funções ENEM
          </h2>
          <p className="text-xs text-indigo-200 mt-2 max-w-xl font-medium leading-relaxed">
            Aqui você gerencia o quadro de colaboradores associados. Defina a função oficial de cada fiscal elegível. Aqueles sem função definida permanecerão automaticamente na <strong>Equipe Reserva</strong> para substituições rápidas.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#101726]/80 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[2px_2px_px_0px_rgba(0,0,0,0.3)]">
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-1">Total Cadastro</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-slate-800 dark:text-white">{totalCollabs}</span>
            <span className="text-slate-400 text-xs font-bold font-mono">fiscais</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#101726]/80 p-5 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.1)]">
          <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 block mb-1">Funções Associadas</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-405">{associatedCollabs.length}</span>
            <span className="text-emerald-600/70 dark:text-emerald-400/70 text-xs font-bold font-mono">
              e-Fiscais ({totalCollabs > 0 ? Math.round((associatedCollabs.length / totalCollabs) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#101726]/80 p-5 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.1)]">
          <span className="text-[9px] uppercase font-black tracking-widest text-amber-600 dark:text-amber-400 block mb-1">Candidatos na Reserva</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-amber-605 dark:text-amber-400">{unassociatedCollabs.length}</span>
            <span className="text-amber-605/75 dark:text-amber-400/75 text-xs font-bold font-mono">
              no banco ({totalCollabs > 0 ? Math.round((unassociatedCollabs.length / totalCollabs) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Role breakdown grid */}
      <details className="bg-slate-50 dark:bg-[#070b13]/40 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 cursor-pointer group">
        <summary className="font-extrabold text-xs text-indigo-700 dark:text-indigo-400 select-none flex items-center justify-between focus:outline-hidden hover:text-indigo-600">
          <div className="flex items-center gap-2">
            <span>📊</span>
            <span>Ver Gráfico de Cobertura de Cargos do Prédio</span>
          </div>
          <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full group-open:hidden">Abrir Resumo</span>
          <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full hidden group-open:inline-block">Fechar Resumo</span>
        </summary>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 cursor-default">
          {ENEM_ROLES.map(role => {
            const count = roleCounts[role.name] || 0;
            return (
              <div key={role.name} className={`p-3 rounded-xl border-2 text-center transition ${count > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white dark:bg-[#101726]/40 border-slate-200 dark:border-slate-800"}`}>
                <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-300 truncate" title={role.name}>
                  {role.name}
                </h4>
                <div className="text-xl font-black mt-1 font-mono text-slate-900 dark:text-white">
                  {count}
                </div>
                <p className="text-[8px] text-slate-400 font-bold mt-0.5 truncate" title={role.desc}>{role.desc}</p>
              </div>
            );
          })}
        </div>
      </details>

      {/* Database Search & Association Matrix */}
      <div className="bg-white dark:bg-[#101726]/80 border-2 border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador por nome, CPF ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-805 dark:text-white font-bold cursor-pointer focus:outline-hidden"
            >
              <option value="all">Todas as Funções</option>
              <option value="associated">Apenas Associados</option>
              <option value="unassociated">Apenas Reservas (Não Associados)</option>
              {ENEM_ROLES.map(role => (
                <option key={role.name} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Matrix - Grid Cards */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 font-bold space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto animate-bounce" />
            <p className="text-xs">Nenhum colaborador encontrado com as definições de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((collab) => {
              const isAssigned = collab.assignedRole && collab.assignedRole !== "";
              return (
                <div 
                  key={collab.id}
                  className={`p-4 border-2 rounded-2xl transition-all duration-150 flex flex-col justify-between ${
                    isAssigned 
                      ? "bg-slate-50/50 dark:bg-[#101726]/40 border-slate-200 dark:border-slate-800 shadow-xs" 
                      : "border-amber-400/30 bg-amber-500/[0.02] shadow-[2px_2px_0px_0px_rgba(245,158,11,0.05)]"
                  } ${isUpdatingId === collab.id ? "opacity-50 scale-95" : ""}`}
                >
                  <div>
                    {/* Header: Name and badges */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="truncate">
                        <h4 className="font-extrabold text-[#111827] dark:text-white text-sm truncate" title={collab.name}>
                          {collab.name}
                        </h4>
                        <p className="text-[10px] text-slate-405 font-mono font-bold mt-0.5">{collab.cpf} • {collab.whatsapp}</p>
                      </div>
                      
                      {isAssigned ? (
                        <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-505/10 shrink-0">
                          Associado
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-505/10 shrink-0">
                          Reserva
                        </span>
                      )}
                    </div>

                    {/* Metadata attributes */}
                    <div className="mt-2.5 space-y-1 bg-slate-50 dark:bg-[#070b13]/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Escolaridade:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={collab.education}>{collab.education}</span>
                      </div>
                      
                      {collab.disability && collab.disability !== "Nenhuma" && (
                        <div className="flex justify-between font-bold">
                          <span className="text-indigo-400">PCD:</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{collab.disability}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Exp. ENEM:</span>
                        <span className="text-slate-700 dark:text-slate-200">
                          {collab.hasWorkedEnem ? `Sim, ${collab.pastEditions.length} edições` : "Nenhum histórico"}
                        </span>
                      </div>

                      {collab.specialRole && collab.specialRole !== "Nenhuma" && (
                        <div className="flex justify-between font-bold">
                          <span className="text-indigo-400">Perfil Especial:</span>
                          <span className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 px-1 py-0.2 rounded text-[9px]">
                            {collab.specialRole}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Association Action Block */}
                  <div className="mt-4 pt-3.5 border-t border-slate-150 dark:border-slate-800">
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-1.5 tracking-wider">
                      Designar Função do ENEM:
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={collab.assignedRole || ""}
                        disabled={readOnly}
                        onChange={(e) => handleAssignRole(collab.id!, e.target.value)}
                        className="flex-1 bg-white dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:outline-hidden disabled:bg-slate-100 disabled:cursor-not-allowed text-ellipsis"
                      >
                        <option value="">-- Mover p/ Reserva --</option>
                        {ENEM_ROLES.map(role => (
                          <option key={role.name} value={role.name}>{role.name}</option>
                        ))}
                      </select>

                      {collab.assignedRole && (
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleAssignRole(collab.id!, "")}
                          title="Voltar Colaborador para Reserva"
                          className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl hover:bg-rose-550/20 border border-transparent hover:border-rose-500/25 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {collab.assignedRoom ? (
                      <p className="text-[9px] text-emerald-500 mt-1.5 font-bold flex items-center gap-1">
                        <span>🚪</span> Alocado na <strong>{collab.assignedRoom}</strong> (Para trocar sala, vá em Alocações)
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
