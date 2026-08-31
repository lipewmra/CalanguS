import React, { useState, useMemo } from "react";
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase, 
  FileText, 
  ArrowRightLeft, 
  Camera, 
  Download, 
  Plus, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Printer,
  X,
  Building2,
  RefreshCw
} from "lucide-react";
import { CollaboratorInfo, CollaboratorLogEntry } from "../types";
import { getCollaboratorSynthesizedLogs, getLogActionStyle } from "../lib/collaborator-logger";
import CollaboratorAuditLogModal from "./CollaboratorAuditLogModal";

interface BuildingAuditTrailViewProps {
  collaborators: CollaboratorInfo[];
  buildingName?: string;
  onUpdateCollaborator?: (updatedCollab: CollaboratorInfo) => Promise<void> | void;
  operatorName?: string;
}

export default function BuildingAuditTrailView({
  collaborators,
  buildingName = "Local de Aplicação",
  onUpdateCollaborator,
  operatorName = "Coordenação CLA"
}: BuildingAuditTrailViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");
  const [selectedCollabId, setSelectedCollabId] = useState<string>("all");
  const [activeModalCollab, setActiveModalCollab] = useState<CollaboratorInfo | null>(null);
  const [expandedDetailsIds, setExpandedDetailsIds] = useState<Record<string, boolean>>({});

  // Combine and synthesize logs from all collaborators in this building
  const allBuildingLogs = useMemo(() => {
    const combined: CollaboratorLogEntry[] = [];
    collaborators.forEach(collab => {
      const logs = getCollaboratorSynthesizedLogs(collab);
      combined.push(...logs);
    });

    // Deduplicate and sort descending
    const seen = new Set<string>();
    const deduplicated = combined.filter(l => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });

    return deduplicated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [collaborators]);

  // Filter logs based on search, action, and selected collaborator
  const filteredLogs = useMemo(() => {
    return allBuildingLogs.filter(log => {
      // Collaborator filter
      if (selectedCollabId !== "all" && log.collaboratorId !== selectedCollabId) {
        return false;
      }

      // Category filter
      if (selectedActionFilter !== "all") {
        if (selectedActionFilter === "alocacao") {
          if (!["alocacao_funcao", "alocacao_sala", "desalocacao_funcao", "desalocacao_sala", "designacao_reserva"].includes(log.action)) return false;
        } else if (selectedActionFilter === "presenca") {
          if (!["confirmacao_presenca", "recusa_funcao", "substituicao"].includes(log.action)) return false;
        } else if (selectedActionFilter === "transferencia") {
          if (log.action !== "transferencia") return false;
        } else if (selectedActionFilter === "observacao") {
          if (log.action !== "observacao_auditoria") return false;
        } else if (log.action !== selectedActionFilter) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesCollab = (log.collaboratorName || "").toLowerCase().includes(query);
        const matchesCpf = (log.collaboratorCpf || "").toLowerCase().includes(query);
        const matchesTitle = (log.title || "").toLowerCase().includes(query);
        const matchesDesc = (log.description || "").toLowerCase().includes(query);
        const matchesPerf = (log.performedBy || "").toLowerCase().includes(query);
        return matchesCollab || matchesCpf || matchesTitle || matchesDesc || matchesPerf;
      }

      return true;
    });
  }, [allBuildingLogs, selectedActionFilter, selectedCollabId, searchTerm]);

  const toggleDetails = (id: string) => {
    setExpandedDetailsIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleExportCsv = () => {
    const headers = ["Data e Hora", "Colaborador", "CPF", "Ação", "Título", "Descrição", "Operador"];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.timestamp).toLocaleString("pt-BR")}"`,
      `"${l.collaboratorName || ""}"`,
      `"${l.collaboratorCpf || ""}"`,
      `"${l.action}"`,
      `"${(l.title || "").replace(/"/g, '""')}"`,
      `"${(l.description || "").replace(/"/g, '""')}"`,
      `"${l.performedBy || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `auditoria_colaboradores_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auditoria Oficial & Rastreabilidade</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Histórico de Auditoria de Colaboradores</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Rastreie todos os cadastros, alocações de salas e funções, confirmações de presença, transferências, recusas e ocorrências do local <strong>{buildingName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-3d flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 bg-white dark:bg-[#101726] rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Text search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF, sala, função, ocorrência ou operador..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Collab dropdown */}
          <div>
            <select
              value={selectedCollabId}
              onChange={(e) => setSelectedCollabId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Colaboradores ({collaborators.length})</option>
              {collaborators.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.assignedRole || "Reserva"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: `Todos os Eventos (${allBuildingLogs.length})` },
            { id: "alocacao", label: "Alocações & Salas" },
            { id: "presenca", label: "Presença & Recusa" },
            { id: "transferencia", label: "Transferências" },
            { id: "observacao", label: "Ocorrências Registradas" },
            { id: "acesso_material", label: "Materiais Didáticos" },
            { id: "cadastro", label: "Cadastros Iniciais" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedActionFilter(tab.id)}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                selectedActionFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* AUDIT LOG LIST */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#101726] rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-2">
            <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum registro de auditoria encontrado</h4>
            <p className="text-xs text-slate-400">Tente ajustar os filtros ou a busca acima.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const style = getLogActionStyle(log.action);
            const isExpanded = expandedDetailsIds[log.id];
            const originalCollab = collaborators.find(c => c.id === log.collaboratorId);
            const dateObj = new Date(log.timestamp);
            const formattedDate = dateObj.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            });
            const formattedTime = dateObj.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div 
                key={log.id} 
                className="p-4 bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-500/40 transition space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                      {style.label}
                    </span>

                    {/* Collab Name Badge with click to open modal */}
                    <button
                      type="button"
                      onClick={() => {
                        if (originalCollab) setActiveModalCollab(originalCollab);
                      }}
                      className="text-xs font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{log.collaboratorName || "Colaborador"}</span>
                    </button>

                    {log.collaboratorCpf && (
                      <span className="text-[10px] font-mono text-slate-400">
                        ({log.collaboratorCpf})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{formattedDate} às {formattedTime}</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {log.title}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {log.description}
                    </p>
                  </div>

                  {originalCollab && (
                    <button
                      type="button"
                      onClick={() => setActiveModalCollab(originalCollab)}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold hover:bg-indigo-100 transition cursor-pointer"
                    >
                      Ver Histórico Completo
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>
                    Operador: <strong className="text-slate-600 dark:text-slate-300">{log.performedBy || "Sistema"}</strong>
                    {log.performedByRole && <span className="ml-1 text-[10px]">({log.performedByRole})</span>}
                  </span>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleDetails(log.id)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isExpanded ? "Ocultar Detalhes" : "Ver Detalhes"}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {isExpanded && log.details && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1 animate-fade-in">
                    <div className="text-[9px] uppercase font-bold text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800">
                      Metadados Registrados
                    </div>
                    {Object.entries(log.details).map(([key, val]) => (
                      <div key={key} className="flex items-start justify-between gap-2">
                        <span className="text-slate-500">{key}:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold break-all text-right">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* INDIVIDUAL COLLABORATOR AUDIT MODAL */}
      {activeModalCollab && (
        <CollaboratorAuditLogModal
          collaborator={activeModalCollab}
          isOpen={!!activeModalCollab}
          onClose={() => setActiveModalCollab(null)}
          onUpdateCollaborator={onUpdateCollaborator}
          operatorName={operatorName}
        />
      )}
    </div>
  );
}
