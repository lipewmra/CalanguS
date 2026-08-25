import React, { useState, useMemo } from "react";
import { 
  X, 
  Search, 
  Eye, 
  Users, 
  MapPin, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  UserCheck, 
  Filter,
  ShieldAlert
} from "lucide-react";
import { CollaboratorInfo, BuildingInfo } from "../types";
import FiscalAvatar from "./FiscalAvatar";

interface SimulateCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: CollaboratorInfo[];
  building: BuildingInfo | null;
  onSelectCollaborator: (collaborator: CollaboratorInfo) => void;
}

export default function SimulateCollaboratorModal({
  isOpen,
  onClose,
  collaborators,
  building,
  onSelectCollaborator
}: SimulateCollaboratorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

  // Filter ONLY collaborators who are allocated to a function or room
  const allocatedCollaborators = useMemo(() => {
    return (collaborators || []).filter(c => {
      if (c.status === "Recusado" || c.status === "Cancelado") return false;
      const hasRole = Boolean(c.assignedRole && c.assignedRole.trim() !== "");
      const hasRoom = Boolean(c.assignedRoom && c.assignedRoom.trim() !== "");
      return hasRole || hasRoom;
    }).sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));
  }, [collaborators]);

  // Extract unique roles from allocated collaborators
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    allocatedCollaborators.forEach(c => {
      if (c.assignedRole && c.assignedRole.trim() !== "") {
        roles.add(c.assignedRole);
      }
    });
    return Array.from(roles).sort();
  }, [allocatedCollaborators]);

  // Filtered allocated collaborators according to search and role filter
  const filteredList = useMemo(() => {
    return allocatedCollaborators.filter(c => {
      if (selectedRoleFilter !== "all" && c.assignedRole !== selectedRoleFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const cpfMatch = (c.cpf || "").toLowerCase().includes(q);
        const roleMatch = (c.assignedRole || "").toLowerCase().includes(q);
        const roomMatch = (c.assignedRoom || "").toLowerCase().includes(q);
        return nameMatch || cpfMatch || roleMatch || roomMatch;
      }
      return true;
    });
  }, [allocatedCollaborators, selectedRoleFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-[#0c1220] border-2 border-emerald-500/40 w-full max-w-3xl rounded-2xl shadow-[8px_8px_0px_0px_rgba(16,185,129,0.3)] overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-start justify-between gap-4 border-b-2 border-emerald-500/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <Eye className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-display font-black tracking-tight text-white">
                  Simular Ambiente do Colaborador
                </h2>
                <span className="text-[10px] font-mono uppercase bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-xs">
                  Modo Tático CLA
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium mt-1">
                Selecione um colaborador alocado em função ou sala para navegar exatamente pelo ambiente que ele vê no sistema.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/20 shrink-0"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and search bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar fiscal alocado por nome, CPF, sala ou função..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
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

            {/* Role Filter */}
            {uniqueRoles.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">Todas as Funções ({allocatedCollaborators.length})</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>
              Mostrando <strong>{filteredList.length}</strong> de <strong>{allocatedCollaborators.length}</strong> colaboradores alocados
            </span>
            {building?.name && (
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-xs">
                Local: {building.name}
              </span>
            )}
          </div>
        </div>

        {/* Collaborators List Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {allocatedCollaborators.length === 0 ? (
            <div className="p-8 text-center space-y-4 rounded-2xl bg-amber-500/5 border-2 border-dashed border-amber-500/30">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-display font-black text-slate-900 dark:text-white">
                  Nenhum Colaborador Alocado Encontrado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Apenas colaboradores que foram <strong>associados a uma função (Menu 3)</strong> ou <strong>alocados em uma sala (Menu 4)</strong> podem ter seu ambiente simulado pelo CLA.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Fechar e Alocar Colaboradores
                </button>
              </div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum colaborador alocado corresponde à sua busca.
              </p>
              <p className="text-xs text-slate-400">
                Tente limpar a busca ou selecionar outra função no filtro acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((collab, index) => (
                <div
                  key={collab.id || collab.cpf}
                  className="p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-emerald-500/60 dark:hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <FiscalAvatar
                      photoUrl={collab.photoUrl}
                      name={collab.name}
                      role={collab.assignedRole || "Fiscal"}
                      size="md"
                      className="shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                          {collab.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">
                          #{index + 1}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                        CPF: {collab.cpf}
                      </span>
                      
                      {/* Role & Room Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {collab.assignedRole ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 truncate max-w-[150px]">
                            {collab.assignedRole}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Função Pendente
                          </span>
                        )}

                        {collab.assignedRoom ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {collab.assignedRoom}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 italic">
                            Coordenação
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Status: <strong className={collab.status === "Confirmado" ? "text-emerald-500" : "text-amber-500"}>{collab.status || "Pendente"}</strong>
                    </span>
                    <button
                      onClick={() => onSelectCollaborator(collab)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      title={`Simular ambiente de ${collab.name}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Simular Ambiente</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            💡 Você poderá retornar ao painel CLA a qualquer momento clicando no banner superior.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
