import React, { useState, useMemo } from "react";
import { 
  X, 
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
  BookOpen, 
  Download, 
  Plus, 
  Send,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  Printer
} from "lucide-react";
import { CollaboratorInfo, CollaboratorLogEntry, CollaboratorLogActionType } from "../types";
import { getCollaboratorSynthesizedLogs, getLogActionStyle, appendCollaboratorLog } from "../lib/collaborator-logger";

interface CollaboratorAuditLogModalProps {
  collaborator: CollaboratorInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCollaborator?: (updatedCollab: CollaboratorInfo) => Promise<void> | void;
  operatorName?: string;
  operatorRole?: string;
}

export default function CollaboratorAuditLogModal({
  collaborator,
  isOpen,
  onClose,
  onUpdateCollaborator,
  operatorName = "Coordenação CLA",
  operatorRole = "CLA"
}: CollaboratorAuditLogModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [expandedDetailsIds, setExpandedDetailsIds] = useState<Record<string, boolean>>({});

  // Generate complete synthesized activity logs
  const allLogs = useMemo(() => {
    if (!collaborator) return [];
    return getCollaboratorSynthesizedLogs(collaborator);
  }, [collaborator]);

  // Filter logs based on search and category
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
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

      // Search term filter
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesTitle = (log.title || "").toLowerCase().includes(query);
        const matchesDesc = (log.description || "").toLowerCase().includes(query);
        const matchesPerf = (log.performedBy || "").toLowerCase().includes(query);
        const matchesAction = (log.action || "").toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesPerf || matchesAction;
      }

      return true;
    });
  }, [allLogs, selectedActionFilter, searchTerm]);

  if (!isOpen || !collaborator) return null;

  const toggleDetails = (id: string) => {
    setExpandedDetailsIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSaveManualNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteDescription.trim()) return;

    setIsSavingNote(true);
    try {
      const updatedLogs = appendCollaboratorLog(
        collaborator,
        "observacao_auditoria",
        noteTitle.trim(),
        noteDescription.trim(),
        {
          performedBy: operatorName,
          performedByRole: operatorRole,
          timestamp: new Date().toISOString()
        }
      );

      const updatedCollaborator: CollaboratorInfo = {
        ...collaborator,
        activityLogs: updatedLogs
      };

      if (onUpdateCollaborator) {
        await onUpdateCollaborator(updatedCollaborator);
      }

      setNoteTitle("");
      setNoteDescription("");
      setShowAddNoteForm(false);
    } catch (err) {
      console.error("Erro ao salvar anotação de auditoria:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePrintAuditTrail = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0c1220] rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/20 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {collaborator.photoUrl ? (
                <img 
                  src={collaborator.photoUrl} 
                  alt={collaborator.name} 
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-indigo-400/40 shadow-md shrink-0" 
                />
              ) : (
                <div className="w-13 h-13 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/30 flex items-center justify-center text-indigo-300 font-black text-lg shrink-0">
                  {collaborator.name.charAt(0)}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                    {collaborator.name}
                  </h2>
                  <span className="text-[10px] font-mono bg-indigo-500/20 border border-indigo-400/30 px-2 py-0.5 rounded-full text-indigo-300">
                    CPF: {collaborator.cpf}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1 font-bold text-amber-300">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{collaborator.assignedRole || "Não Atribuído (Reserva)"}</span>
                  </span>
                  {collaborator.assignedRoom && (
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[11px] font-bold text-slate-200 border border-slate-700">
                      Sala: {collaborator.assignedRoom}
                    </span>
                  )}
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300">{collaborator.claName || "CLA Local"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintAuditTrail}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition cursor-pointer"
                title="Imprimir / Exportar Histórico"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* QUICK SUMMARY METRICS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Eventos</span>
              <span className="text-sm font-black text-white flex items-center gap-1 mt-0.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>{allLogs.length} registros</span>
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Status de Presença</span>
              <span className={`text-xs font-black flex items-center gap-1 mt-0.5 ${
                collaborator.attendanceStatus === "Confirmado" && collaborator.assignedRoom && !collaborator.isReserve
                  ? "text-emerald-400"
                  : collaborator.status === "Recusado" || collaborator.attendanceStatus === "Recusado" || collaborator.status === "Impedido"
                  ? "text-rose-400"
                  : (!collaborator.assignedRoom || collaborator.isReserve)
                  ? "text-indigo-400"
                  : "text-amber-400"
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {collaborator.status === "Impedido"
                    ? "Impedido"
                    : collaborator.attendanceStatus === "Recusado" || collaborator.refusedRole
                    ? "Recusou Função"
                    : (collaborator.isReserve || !collaborator.assignedRoom || collaborator.assignedRoom.trim() === "")
                    ? (collaborator.assignedRole ? "Reserva c/ Função" : "Reserva Técnica")
                    : collaborator.attendanceStatus === "Confirmado"
                    ? "Presença Confirmada"
                    : "Aguardando Fiscal"}
                </span>
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Data de Cadastro</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block truncate">
                {collaborator.createdAt ? new Date(collaborator.createdAt).toLocaleDateString("pt-BR") : "Início do Evento"}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Último Registro</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block truncate">
                {allLogs[0] ? new Date(allLogs[0].timestamp).toLocaleDateString("pt-BR") : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH, FILTERS & ADD NOTE */}
        <div className="p-4 bg-slate-50 dark:bg-[#070b13] border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Live Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar no histórico (ação, operador, sala, motivo)..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                className="btn-3d flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Ocorrência</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: `Todos (${allLogs.length})` },
              { id: "alocacao", label: "Alocações & Salas" },
              { id: "presenca", label: "Presença & Recusa" },
              { id: "transferencia", label: "Transferências" },
              { id: "observacao", label: "Ocorrências" },
              { id: "acesso_material", label: "Materiais" }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedActionFilter(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                  selectedActionFilter === tab.id
                    ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs"
                    : "bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-750"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* COLLAPSIBLE ADD NOTE FORM */}
          {showAddNoteForm && (
            <form onSubmit={handleSaveManualNote} className="p-4 bg-white dark:bg-[#101726] rounded-2xl border-2 border-indigo-500/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Nova Ocorrência / Registro Oficial de Auditoria</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddNoteForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Título da ocorrência (ex: Atestado entregue, Troca autorizada de sala, Advertência verbal)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 font-bold focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <textarea
                  rows={2}
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  placeholder="Descreva detalhadamente o fato ocorrido, justificativa ou anotação para fins de auditoria do INEP/Cebraspe..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-medium">
                  Registrado por: <strong>{operatorName}</strong> ({operatorRole})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddNoteForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingNote || !noteTitle.trim() || !noteDescription.trim()}
                    className="btn-3d px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSavingNote ? "Gravando..." : "Salvar no Histórico"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* TIMELINE LIST BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum evento localizado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não foram encontrados registros para o filtro ou termo pesquisado.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {filteredLogs.map((log, index) => {
                const style = getLogActionStyle(log.action);
                const isExpanded = expandedDetailsIds[log.id];
                const dateObj = new Date(log.timestamp);
                const formattedDate = dateObj.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                });
                const formattedTime = dateObj.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                });

                return (
                  <div key={log.id || index} className="relative group">
                    {/* TIMELINE BULLET */}
                    <div className={`absolute -left-6 sm:-left-8 top-1.5 w-3.5 h-3.5 rounded-full ${style.dotBg} ring-4 ring-white dark:ring-[#0c1220] shadow-sm transition-transform group-hover:scale-125`} />

                    {/* CARD CONTENT */}
                    <div className="p-4 bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-500/40 transition-all space-y-2">
                      {/* CARD TOP LINE */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                            {style.label}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {log.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formattedDate} às {formattedTime}</span>
                        </div>
                      </div>

                      {/* DESCRIPTION */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                        {log.description}
                      </p>

                      {/* OPERATOR & DETAILS FOOTER */}
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Operador: <strong className="text-slate-700 dark:text-slate-200">{log.performedBy || "Sistema"}</strong>
                            {log.performedByRole && <span className="text-[10px] ml-1 opacity-75 font-mono">({log.performedByRole})</span>}
                          </span>
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleDetails(log.id)}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>{isExpanded ? "Ocultar Dados" : "Ver Detalhes"}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {/* EXPANDED TECHNICAL DETAILS */}
                      {isExpanded && log.details && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1 animate-fade-in">
                          <div className="text-[9px] uppercase font-bold text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800">
                            Metadados da Ação
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-[#070b13] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Exibindo <strong>{filteredLogs.length}</strong> de <strong>{allLogs.length}</strong> eventos de auditoria.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="btn-3d px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
