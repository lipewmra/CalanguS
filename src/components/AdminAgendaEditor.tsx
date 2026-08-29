import React, { useState, useEffect } from "react";
import { EventConfigInfo, CollaboratorScheduleItem, BuildingInfo } from "../types";
import { DEFAULT_ENEM_SCHEDULE } from "./CollaboratorSettingsView";
import { saveBuilding } from "../lib/db-services";
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Send, 
  Check, 
  X, 
  Eye, 
  Layers,
  HelpCircle,
  RefreshCw
} from "lucide-react";

interface AdminAgendaEditorProps {
  initialConfig: EventConfigInfo | null;
  onSaveConfig: (cfg: Omit<EventConfigInfo, "id"> & { id?: string }) => Promise<any>;
  allBuildings?: BuildingInfo[];
}

export default function AdminAgendaEditor({ 
  initialConfig, 
  onSaveConfig, 
  allBuildings = [] 
}: AdminAgendaEditorProps) {
  const [schedule, setSchedule] = useState<CollaboratorScheduleItem[]>(() => {
    if (initialConfig?.collaboratorSchedule && initialConfig.collaboratorSchedule.length > 0) {
      return initialConfig.collaboratorSchedule;
    }
    return DEFAULT_ENEM_SCHEDULE;
  });

  const [instructions, setInstructions] = useState<string>(
    initialConfig?.collaboratorInstructions || ""
  );

  // Editing modal / inline state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // New item modal
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Status and feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isPropagating, setIsPropagating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmPropagate, setShowConfirmPropagate] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (initialConfig?.collaboratorSchedule && initialConfig.collaboratorSchedule.length > 0) {
      setSchedule(initialConfig.collaboratorSchedule);
    }
    if (initialConfig?.collaboratorInstructions !== undefined) {
      setInstructions(initialConfig.collaboratorInstructions);
    }
  }, [initialConfig]);

  // Open item edit
  const handleStartEdit = (index: number) => {
    const item = schedule[index];
    setEditingIndex(index);
    setEditTime(item.time);
    setEditTitle(item.title);
    setEditDesc(item.desc);
  };

  // Save item edit
  const handleSaveItemEdit = () => {
    if (editingIndex === null) return;
    if (!editTime.trim() || !editTitle.trim()) {
      setErrorMsg("Preencha ao menos o Horário e o Título do evento da agenda.");
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    const updated = [...schedule];
    updated[editingIndex] = {
      ...updated[editingIndex],
      time: editTime.trim(),
      title: editTitle.trim(),
      desc: editDesc.trim()
    };

    setSchedule(updated);
    setEditingIndex(null);
    setEditTime("");
    setEditTitle("");
    setEditDesc("");
  };

  // Cancel item edit
  const handleCancelItemEdit = () => {
    setEditingIndex(null);
    setEditTime("");
    setEditTitle("");
    setEditDesc("");
  };

  // Add new item
  const handleAddNewItem = () => {
    if (!newTime.trim() || !newTitle.trim()) {
      setErrorMsg("Preencha ao menos o Horário e o Título do novo item da agenda.");
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    const newItem: CollaboratorScheduleItem = {
      id: `sched-admin-${Date.now()}`,
      time: newTime.trim(),
      title: newTitle.trim(),
      desc: newDesc.trim()
    };

    setSchedule([...schedule, newItem]);
    setIsAddingNew(false);
    setNewTime("");
    setNewTitle("");
    setNewDesc("");
    setSuccessMsg("✓ Item adicionado à lista da agenda!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const updated = schedule.filter((_, i) => i !== index);
    setSchedule(updated);
  };

  // Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...schedule];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSchedule(updated);
  };

  // Move Down
  const handleMoveDown = (index: number) => {
    if (index >= schedule.length - 1) return;
    const updated = [...schedule];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSchedule(updated);
  };

  // Reset to default
  const handleResetToDefault = () => {
    setSchedule(DEFAULT_ENEM_SCHEDULE);
    setShowConfirmReset(false);
    setSuccessMsg("✓ Agenda restaurada para o padrão oficial do Cebraspe/INEP.");
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Save global configuration to eventConfig
  const handleSaveGlobalConfig = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const configData: Omit<EventConfigInfo, "id"> & { id?: string } = {
        ...(initialConfig || {
          year: 2026,
          examDates: ["08/11/2026", "15/11/2026"],
          trainingDates: ["07/11/2026"],
          generalInstructions: "Garantir rigidez na abertura e fechamento dos portões às 13:00h.",
          initialClaTasks: []
        }),
        id: initialConfig?.id,
        collaboratorSchedule: schedule,
        collaboratorInstructions: instructions
      };

      await onSaveConfig(configData);
      setSuccessMsg("✓ Diretivas da Agenda e Itinerário salvas no servidor global com sucesso!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao salvar configuração global: " + (err?.message || "Tente novamente"));
    } finally {
      setIsSaving(false);
    }
  };

  // Propagate to all registered buildings
  const handlePropagateToAllBuildings = async () => {
    if (!allBuildings || allBuildings.length === 0) {
      setErrorMsg("Nenhum local de aplicação registrado para propagação.");
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    setIsPropagating(true);
    setErrorMsg(null);
    setShowConfirmPropagate(false);

    try {
      // 1. First save global eventConfig
      const configData: Omit<EventConfigInfo, "id"> & { id?: string } = {
        ...(initialConfig || {
          year: 2026,
          examDates: ["08/11/2026", "15/11/2026"],
          trainingDates: ["07/11/2026"],
          generalInstructions: "Garantir rigidez na abertura e fechamento dos portões às 13:00h.",
          initialClaTasks: []
        }),
        id: initialConfig?.id,
        collaboratorSchedule: schedule,
        collaboratorInstructions: instructions
      };
      await onSaveConfig(configData);

      // 2. Propagate to all buildings
      let successCount = 0;
      for (const b of allBuildings) {
        try {
          const updatedBuilding: BuildingInfo = {
            ...b,
            collaboratorSchedule: schedule,
            collaboratorInstructions: instructions
          };
          await saveBuilding(updatedBuilding);
          successCount++;
        } catch (err) {
          console.warn("Failed syncing building:", b.name, err);
        }
      }

      setSuccessMsg(`✓ Agenda e Itinerário propagados com sucesso para ${successCount} de ${allBuildings.length} locais de aplicação!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro durante a propagação: " + (err?.message || "Tente novamente"));
    } finally {
      setIsPropagating(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border-2 border-indigo-500/30 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>SuperAdmin • Ambiente do Colaborador</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Gestão da Agenda & Itinerário dos Colaboradores</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed font-medium">
              Configure, adicione, edite e sincronize todos os horários táticos, etapas e avisos oficiais exibidos na aba <strong>"Agenda & Itinerário"</strong> no painel de cada fiscal e aplicador do ENEM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowConfirmReset(true)}
              type="button"
              className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Restaurar lista de horários para o padrão oficial Cebraspe"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Padrão Cebraspe</span>
            </button>

            <button
              onClick={() => setIsAddingNew(true)}
              type="button"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Horário</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK MESSAGES */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-850 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="flex-1">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/15 border-2 border-rose-500/30 text-rose-850 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {/* CONFIRM RESET MODAL */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101726] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-black text-slate-850 dark:text-white">Restaurar Padrão Oficial?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Isso substituirá os horários atuais pelos 9 marcos canônicos do ENEM.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs cursor-pointer active:scale-95 shadow-md"
              >
                Confirmar Restauração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PROPAGATION MODAL */}
      {showConfirmPropagate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101726] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-black text-slate-850 dark:text-white">Propagar para Todos os Prédios?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação atualizará a agenda e avisos de <strong>{allBuildings.length} locais de aplicação</strong> cadastrados no sistema.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
              💡 Os colaboradores alocados em qualquer escola verão esta nova grade de horários instantaneamente ao abrir a aba Agenda.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmPropagate(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handlePropagateToAllBuildings}
                disabled={isPropagating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer active:scale-95 shadow-md flex items-center gap-2"
              >
                {isPropagating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isPropagating ? "Propagando..." : "Sim, Propagar em Massa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW AGENDA ITEM */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101726] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-display font-black text-slate-850 dark:text-white">Novo Marco da Agenda</h3>
              </div>
              <button
                onClick={() => setIsAddingNew(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Horário / Período * (ex: 11:00h - 11:30h ou 13:00h)
                </label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Ex: 11:00h - 11:30h"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#070b13] text-slate-850 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Título da Etapa * (ex: Chegada Obrigatória & Identificação)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Chegada Obrigatória & Identificação"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#070b13] text-slate-850 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Descrição & Instruções Detalhadas
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descreva o procedimento operacional esperado dos fiscais nesta etapa..."
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#070b13] text-slate-850 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer active:scale-95 shadow-md"
              >
                Adicionar à Agenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL INSTRUCTIONS SECTION */}
      <div className="bg-white dark:bg-[#101726] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-display font-black text-slate-850 dark:text-white uppercase tracking-wider">
            Avisos & Instruções Gerais da Coordenação para a Agenda
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Este comunicado será exibido no topo da aba Agenda no aplicativo do colaborador, servindo como mural de avisos obrigatórios ou recados de urgência.
        </p>
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ex: Atenção a todos os fiscais: é proibido o porte de aparelhos eletrônicos ligados. Tragam documento oficial com foto e garrafa de água transparente sem rótulo."
          className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-[#070b13] text-slate-850 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden leading-relaxed"
        />
      </div>

      {/* AGENDA ITEMS LIST & LIVE PREVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / MAIN COLUMN: AGENDA ITEMS EDITOR (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-850 dark:text-white">
                Itens da Agenda ({schedule.length} etapas)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono font-bold">Arraste / Ordene</span>
          </div>

          <div className="space-y-3">
            {schedule.map((item, index) => {
              const isEditing = editingIndex === index;

              if (isEditing) {
                return (
                  <div 
                    key={item.id || index}
                    className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-500 rounded-2xl space-y-3 shadow-md animate-fade-in"
                  >
                    <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-800/40 pb-2">
                      <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                        Editando Item #{index + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveItemEdit}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelItemEdit}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Horário</label>
                        <input
                          type="text"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-[#070b13] text-slate-850 dark:text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Título</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-[#070b13] text-slate-850 dark:text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Descrição</label>
                        <textarea
                          rows={3}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-[#070b13] text-slate-850 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={item.id || index}
                  className="p-4 bg-white dark:bg-[#101726] border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 rounded-2xl shadow-xs transition group space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {item.time}
                      </span>
                    </div>

                    {/* Action buttons: Reorder, Edit, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === schedule.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(index)}
                        className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 cursor-pointer"
                        title="Editar item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Excluir item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-black text-xs text-slate-850 dark:text-white leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Novo Horário à Agenda</span>
          </button>
        </div>

        {/* RIGHT COLUMN: LIVE COLLABORATOR PREVIEW (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" />
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-850 dark:text-white">
                Prévia ao Vivo no App do Fiscal
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold">
              Tempo Real
            </span>
          </div>

          {/* SIMULATED PHONE / CARD FRAME */}
          <div className="bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-inner space-y-4 max-h-[600px] overflow-y-auto">
            <div>
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1.5">
                Agenda & Itinerário Tático do Fiscal
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Observe a contagem rigorosa de horários regulada pela coordenação.
              </p>
            </div>

            {/* Instruction Notice Preview */}
            {instructions && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300 font-extrabold text-[10px] uppercase">
                  <Info className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>Avisos da Coordenação</span>
                </div>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                  {instructions}
                </p>
              </div>
            )}

            {/* Timeline Preview */}
            <div className="relative border-l-2 border-slate-300 dark:border-slate-800 pl-4 space-y-4 ml-2">
              {schedule.map((item, idx) => (
                <div key={item.id || idx} className="relative font-sans">
                  <div className="absolute -left-[21px] top-1 bg-white dark:bg-[#070b13] border-2 border-emerald-500 rounded-full w-3 h-3 flex items-center justify-center">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                  </div>

                  <div className="bg-white dark:bg-[#101726] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                    <span className="text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                      {item.time}
                    </span>
                    <h5 className="text-[11px] font-bold text-slate-850 dark:text-white leading-tight">
                      {item.title}
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BAR AT BOTTOM */}
      <div className="sticky bottom-4 z-20 bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-2 border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Salve as diretivas globais ou propague para todas as escolas cadastradas.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {allBuildings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmPropagate(true)}
              disabled={isPropagating || isSaving}
              className="px-4 py-3 rounded-xl border-2 border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 flex-1 sm:flex-none"
              title="Atualizar a agenda de todos os prédios cadastrados"
            >
              <Send className="w-4 h-4" />
              <span>Propagar p/ Todos ({allBuildings.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveGlobalConfig}
            disabled={isSaving || isPropagating}
            className="btn-3d px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg flex-1 sm:flex-none"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? "SALVANDO NO SERVIDOR..." : "SALVAR DIRETIVAS DA AGENDA"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
