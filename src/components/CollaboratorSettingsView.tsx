import React, { useState, useEffect } from "react";
import { BuildingInfo, CollaboratorScheduleItem, ClaCustomRole } from "../types";
import { ENEM_ROLES } from "./CollaboratorManager";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Info, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Users,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  Layers,
  AlertTriangle,
  Coins
} from "lucide-react";

interface CollaboratorSettingsViewProps {
  building: BuildingInfo | null;
  onSaveBuilding: (updated: BuildingInfo) => Promise<void>;
  readOnly?: boolean;
}

export const DEFAULT_ENEM_SCHEDULE: CollaboratorScheduleItem[] = [
  { 
    id: "sched-1", 
    time: "11:00h - 11:30h", 
    title: "Chegada Obrigatória & Identificação", 
    desc: "Apresente-se à coordenação (CLA) no prédio com documento oficial físico com foto para assinatura da ata de presença de fiscais e entrega do crachá." 
  },
  { 
    id: "sched-2", 
    time: "11:30h - 12:00h", 
    title: "Reunião de Alinhamento & Vistoria", 
    desc: "Briefing operacional comandado pelo CLA. Inspeção física das salas de prova, contagem de carteiras e verificação de ventilação/ar-condicionado." 
  },
  { 
    id: "sched-3", 
    time: "12:00h", 
    title: "Abertura dos Portões", 
    desc: "Entrada dos candidatos no local de aplicação. Fiscais posicionados orientando o fluxo de forma calma e organizada." 
  },
  { 
    id: "sched-4", 
    time: "13:00h", 
    title: "Fechamento dos Portões", 
    desc: "Fechamento irrevogável e pontual dos portões de acesso às 13h00 (horário oficial de Brasília)." 
  },
  { 
    id: "sched-5", 
    time: "13:00h - 13:30h", 
    title: "Procedimentos Iniciais em Sala", 
    desc: "Conferência do documento com foto do candidato, guarda de pertences nos envelopes porta-objetos lacrados e leitura das instruções gerais." 
  },
  { 
    id: "sched-6", 
    time: "13:30h", 
    title: "Início Oficial das Provas", 
    desc: "Abertura dos pacotes de cadernos de questões na presença das 2 testemunhas de sala e autorização de início do exame." 
  },
  { 
    id: "sched-7", 
    time: "15:30h", 
    title: "Lanche dos Fiscais", 
    desc: "Revezamento assistido com os fiscais de reserva para alimentação e hidratação nas salas de apoio." 
  },
  { 
    id: "sched-8", 
    time: "18:30h / 19:00h", 
    title: "Término das Provas Regulares", 
    desc: "Coleta dos cartões-resposta dos 3 últimos candidatos juntos na sala, conferência das atas e lacre dos envelopes de segurança." 
  },
  { 
    id: "sched-9", 
    time: "19:30h / 20:00h", 
    title: "Término de Acessibilidade & Devolução ao CLA", 
    desc: "Encerramento das salas de tempo adicional (+60min) e entrega de todo o material lacrado à coordenação." 
  }
];

export const getDefaultRolesList = (): ClaCustomRole[] => {
  return ENEM_ROLES.map((r, index) => ({
    id: `role-default-${index + 1}`,
    name: r.name,
    desc: r.desc,
    hidden: false,
    targetQuantity: 0,
    isDefault: true
  }));
};

export default function CollaboratorSettingsView({
  building,
  onSaveBuilding,
  readOnly = false
}: CollaboratorSettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"roles" | "schedule" | "instructions" | "reserves">("roles");
  
  // Custom roles state
  const [roles, setRoles] = useState<ClaCustomRole[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleForm, setEditRoleForm] = useState<Partial<ClaCustomRole>>({});
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState<Omit<ClaCustomRole, "id">>({
    name: "",
    desc: "",
    hidden: false,
    targetQuantity: 0,
    remuneration: 0
  });

  // Schedule & instructions state
  const [schedule, setSchedule] = useState<CollaboratorScheduleItem[]>([]);
  const [instructions, setInstructions] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Sync state from building info
  useEffect(() => {
    if (building) {
      // 1. Roles
      if (building.customRoles && building.customRoles.length > 0) {
        setRoles(building.customRoles);
      } else {
        // Initialize with default ENEM roles and match existing target quantities
        const defaults = getDefaultRolesList();
        if (building.rolesTargetQuantities) {
          defaults.forEach(r => {
            if (building.rolesTargetQuantities && building.rolesTargetQuantities[r.name] !== undefined) {
              r.targetQuantity = building.rolesTargetQuantities[r.name];
            }
          });
        }
        setRoles(defaults);
      }

      // 2. Schedule
      if (building.collaboratorSchedule && building.collaboratorSchedule.length > 0) {
        setSchedule(building.collaboratorSchedule);
      } else {
        setSchedule(DEFAULT_ENEM_SCHEDULE);
      }

      // 3. Instructions
      setInstructions(building.collaboratorInstructions || "");
    } else {
      setRoles(getDefaultRolesList());
      setSchedule(DEFAULT_ENEM_SCHEDULE);
    }
  }, [building]);

  // Handle Role Operations
  const handleToggleHideRole = (id: string) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, hidden: !r.hidden } : r));
  };

  const handleStartEditRole = (role: ClaCustomRole) => {
    setEditingRoleId(role.id);
    setEditRoleForm({
      name: role.name,
      desc: role.desc,
      targetQuantity: role.targetQuantity || 0,
      remuneration: role.remuneration || 0,
      hidden: role.hidden
    });
  };

  const handleSaveRoleEdit = () => {
    if (!editingRoleId || !editRoleForm.name?.trim()) return;
    setRoles(prev => prev.map(r => {
      if (r.id === editingRoleId) {
        return {
          ...r,
          name: editRoleForm.name?.trim() || r.name,
          desc: editRoleForm.desc?.trim() || r.desc,
          targetQuantity: Number(editRoleForm.targetQuantity) || 0,
          remuneration: Number(editRoleForm.remuneration) || 0,
          hidden: Boolean(editRoleForm.hidden)
        };
      }
      return r;
    }));
    setEditingRoleId(null);
    setEditRoleForm({});
  };

  const handleCancelRoleEdit = () => {
    setEditingRoleId(null);
    setEditRoleForm({});
  };

  const handleDeleteRole = (id: string) => {
    const roleToDelete = roles.find(r => r.id === id);
    if (!roleToDelete) return;
    if (window.confirm(`Tem certeza que deseja remover a função "${roleToDelete.name}"?`)) {
      setRoles(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleCreateNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) return;

    const newRole: ClaCustomRole = {
      id: `role-custom-${Date.now()}`,
      name: newRoleForm.name.trim(),
      desc: newRoleForm.desc.trim() || "Função personalizada cadastrada pelo CLA.",
      hidden: false,
      targetQuantity: Number(newRoleForm.targetQuantity) || 0,
      remuneration: Number(newRoleForm.remuneration) || 0,
      isDefault: false
    };

    setRoles(prev => [...prev, newRole]);
    setNewRoleForm({
      name: "",
      desc: "",
      hidden: false,
      targetQuantity: 0,
      remuneration: 0
    });
    setIsAddingRole(false);
  };

  const handleResetRolesToDefault = () => {
    if (window.confirm("Deseja restaurar a lista de funções para as 11 funções oficiais padrão do ENEM? Funções customizadas serão excluídas.")) {
      setRoles(getDefaultRolesList());
    }
  };

  // Schedule functions
  const handleAddScheduleItem = () => {
    const newItem: CollaboratorScheduleItem = {
      id: `sched-${Date.now()}`,
      time: "12:00h",
      title: "Nova Atividade / Marco",
      desc: "Instruções específicas para os colaboradores e fiscais."
    };
    setSchedule([...schedule, newItem]);
  };

  const handleUpdateScheduleItem = (index: number, field: keyof CollaboratorScheduleItem, value: string) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  const handleDeleteScheduleItem = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const handleMoveUpSchedule = (index: number) => {
    if (index === 0) return;
    const updated = [...schedule];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setSchedule(updated);
  };

  const handleMoveDownSchedule = (index: number) => {
    if (index === schedule.length - 1) return;
    const updated = [...schedule];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setSchedule(updated);
  };

  const handleResetScheduleToDefault = () => {
    if (window.confirm("Deseja restaurar a agenda para o cronograma oficial padrão do ENEM?")) {
      setSchedule(DEFAULT_ENEM_SCHEDULE);
    }
  };

  // Save All
  const handleSave = async () => {
    if (!building) return;
    setIsSaving(true);
    try {
      // Build roles target quantities map for backwards compatibility
      const targetMap: Record<string, number> = {};
      roles.forEach(r => {
        targetMap[r.name] = r.targetQuantity || 0;
      });

      await onSaveBuilding({
        ...building,
        customRoles: roles,
        rolesTargetQuantities: targetMap,
        collaboratorSchedule: schedule,
        collaboratorInstructions: instructions
      });
      setSuccessMsg("Configurações do ambiente de colaboradores salvas com sucesso!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro ao salvar configurações dos colaboradores:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeRolesCount = roles.filter(r => !r.hidden).length;
  const hiddenRolesCount = roles.filter(r => r.hidden).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border-2 border-emerald-500/30 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-500/30">
                  MENU 9 DO CLA
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  {activeRolesCount} funções ativas • {hiddenRolesCount} ocultas
                </span>
              </div>
              <h2 className="text-base font-display font-black text-slate-850 dark:text-white mt-1">
                Configuração de Dados dos Colaboradores & Funções
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gerencie as funções disponíveis para associação, edite, oculte ou inclua novas funções, defina a agenda e os avisos do ambiente dos colaboradores.
              </p>
            </div>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-3d py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer shadow-md flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Salvando..." : "Salvar Configurações"}</span>
            </button>
          )}
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-500/20">
          <button
            type="button"
            onClick={() => setActiveSubTab("roles")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "roles"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Funções & Cargos ({roles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("schedule")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "schedule"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>2. Agenda & Horários ({schedule.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("instructions")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "instructions"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Avisos da Coordenação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("reserves")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "reserves"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Diretrizes de Reserva & Presença</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 1: ROLES MANAGEMENT (EDITAR, OCULTAR E INCLUIR FUNÇÕES)            */}
      {/* ========================================================================= */}
      {activeSubTab === "roles" && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                    Funções de Trabalho do Local de Aplicação
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aqui você pode <strong>incluir novas funções</strong>, <strong>editar atribuições/metas</strong> e <strong>ocultar funções</strong> que não serão utilizadas no seu prédio.
                </p>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetRolesToDefault}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Restaurar lista de funções oficiais do ENEM"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Padrão ENEM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingRole(!isAddingRole)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{isAddingRole ? "Cancelar Inclusão" : "Incluir Nova Função"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* FORM: INCLUIR NOVA FUNÇÃO */}
            {isAddingRole && !readOnly && (
              <form onSubmit={handleCreateNewRole} className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cadastrar Nova Função para este CLA</span>
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingRole(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Nome da Função / Cargo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRoleForm.name}
                      onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                      placeholder="Ex: Fiscal de Pátio / Segurança Eletrônica"
                      className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold rounded-lg focus:outline-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Meta de Vagas (Quantidade)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newRoleForm.targetQuantity || ""}
                      onChange={(e) => setNewRoleForm({ ...newRoleForm, targetQuantity: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold rounded-lg focus:outline-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Descrição das Atribuições e Responsabilidades
                  </label>
                  <textarea
                    rows={2}
                    value={newRoleForm.desc}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, desc: e.target.value })}
                    placeholder="Descreva detalhadamente o que o fiscal ou colaborador irá executar nesta função."
                    className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 p-2.5 text-xs rounded-lg focus:outline-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingRole(false)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Salvar e Adicionar Função</span>
                  </button>
                </div>
              </form>
            )}

            {/* ROLES LIST */}
            <div className="grid grid-cols-1 gap-3">
              {roles.map((role, idx) => {
                const isEditing = editingRoleId === role.id;

                return (
                  <div
                    key={role.id || idx}
                    className={`p-4 rounded-xl border-2 transition ${
                      role.hidden
                        ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-65"
                        : "bg-slate-50 dark:bg-[#070b13]/70 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 shadow-xs"
                    }`}
                  >
                    {isEditing ? (
                      /* EDITING FORM FOR A ROLE */
                      <div className="space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                            Editando Função: {role.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {role.id}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                              Nome da Função
                            </label>
                            <input
                              type="text"
                              value={editRoleForm.name || ""}
                              onChange={(e) => setEditRoleForm({ ...editRoleForm, name: e.target.value })}
                              className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold rounded-lg focus:outline-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                              Meta de Vagas
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editRoleForm.targetQuantity ?? 0}
                              onChange={(e) => setEditRoleForm({ ...editRoleForm, targetQuantity: Number(e.target.value) })}
                              className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-emerald-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                            Descrição das Atribuições
                          </label>
                          <textarea
                            rows={2}
                            value={editRoleForm.desc || ""}
                            onChange={(e) => setEditRoleForm({ ...editRoleForm, desc: e.target.value })}
                            className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 p-2 text-xs rounded-lg focus:outline-emerald-500"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelRoleEdit}
                            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveRoleEdit}
                            className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Confirmar Alterações</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* DISPLAY ROW FOR A ROLE */
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-display font-black text-slate-850 dark:text-white">
                              {role.name}
                            </span>
                            {role.isDefault ? (
                              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                Padrão ENEM
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-500/30">
                                Personalizada CLA
                              </span>
                            )}

                            {role.hidden ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-400 rounded-full flex items-center gap-1 border border-rose-500/20">
                                <EyeOff className="w-3 h-3" />
                                <span>Oculta na Associação</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1 border border-emerald-500/20">
                                <Eye className="w-3 h-3" />
                                <span>Ativa</span>
                              </span>
                            )}

                            {(role.targetQuantity || 0) > 0 && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded border border-amber-500/30">
                                Meta: {role.targetQuantity} vagas
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {role.desc}
                          </p>
                        </div>

                        {!readOnly && (
                          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                            {/* Toggle Hide / Show */}
                            <button
                              type="button"
                              onClick={() => handleToggleHideRole(role.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                                role.hidden
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-600 dark:text-slate-300"
                              }`}
                              title={role.hidden ? "Exibir função na associação" : "Ocultar função na associação"}
                            >
                              {role.hidden ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Exibir</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Ocultar</span>
                                </>
                              )}
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleStartEditRole(role)}
                              className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer transition"
                              title="Editar nome e atribuições"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete custom role */}
                            {!role.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role.id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-lg cursor-pointer transition"
                                title="Excluir função personalizada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: SCHEDULE & TIMELINE (AGENDA DOS COLABORADORES)                  */}
      {/* ========================================================================= */}
      {activeSubTab === "schedule" && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                    Cronograma & Horários da Agenda do Fiscal
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Estes horários e etapas serão sincronizados em tempo real na aba <strong>"Agenda"</strong> no painel de cada colaborador.
                </p>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetScheduleToDefault}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Restaurar horários padrão do ENEM"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Padrão ENEM</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddScheduleItem}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Adicionar Horário</span>
                  </button>
                </div>
              )}
            </div>

            {/* Schedule list items */}
            <div className="space-y-3.5">
              {schedule.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className="p-4 bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl space-y-3 transition hover:border-emerald-500/40 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-full sm:w-44">
                        <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-0.5">
                          Horário
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.time}
                          onChange={(e) => handleUpdateScheduleItem(idx, "time", e.target.value)}
                          placeholder="Ex: 11:00h"
                          className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 rounded-lg focus:outline-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="w-full sm:flex-1">
                      <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-0.5">
                        Título da Etapa / Procedimento
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.title}
                        onChange={(e) => handleUpdateScheduleItem(idx, "title", e.target.value)}
                        placeholder="Ex: Abertura dos Portões"
                        className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-850 dark:text-white rounded-lg focus:outline-emerald-500"
                      />
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleMoveUpSchedule(idx)}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDownSchedule(idx)}
                          disabled={idx === schedule.length - 1}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteScheduleItem(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer transition"
                          title="Excluir horário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-0.5">
                      Descrição & Instruções aos Fiscais
                    </label>
                    <textarea
                      rows={2}
                      disabled={readOnly}
                      value={item.desc}
                      onChange={(e) => handleUpdateScheduleItem(idx, "desc", e.target.value)}
                      placeholder="Instruções claras sobre o que o colaborador deve realizar neste horário."
                      className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-700 p-2 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-lg focus:outline-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: COORDINATION NOTICES                                            */}
      {/* ========================================================================= */}
      {activeSubTab === "instructions" && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                Instruções & Avisos Gerais da Coordenação (CLA)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mensagem personalizada da sua coordenação sobre o local de aplicação (ex: acesso a estacionamento, ponto de encontro da equipe, orientações de vestimentas, contatos de urgência).
            </p>

            <textarea
              rows={6}
              disabled={readOnly}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Sejam todos bem-vindos à nossa escola de aplicação! Solicitamos pontualidade absoluta às 11h na Sala da Coordenação. O estacionamento interno estará liberado para fiscais pelo portão dos fundos. Lembramos da obrigatoriedade do calçado fechado e documento oficial com foto."
              className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-4 text-xs rounded-xl font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
            />

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Este aviso é apresentado em destaque para todos os colaboradores conectados a este prédio.</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: RESERVES & PRESENCE POLICIES                                    */}
      {/* ========================================================================= */}
      {activeSubTab === "reserves" && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                Diretrizes de Fiscais Reservas & Fluxo de Presença
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500/20 rounded-xl space-y-2">
                <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🛡️</span> Colaborador em Reserva
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Enquanto o colaborador estiver aprovado mas permanecer como reserva ou sem cargo associado, ele <strong>não visualiza botão de confirmação de presença</strong>. Ele permanece de prontidão na lista do CLA para suprir eventuais faltas ou necessidades adicionais.
                </p>
              </div>

              <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-xl space-y-2">
                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📋</span> Colaborador com Cargo Associado
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Assim que o CLA associar a função no <strong>Menu 3 (Associação de Função)</strong>, a div de convocação oficial se torna visível imediatamente no painel do colaborador para que ele possa <strong>Confirmar Presença</strong> ou <strong>Recusar a Função</strong> (retornando à reserva com a TAG de recusa).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button Footer */}
      {!readOnly && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-3d py-3 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Salvando Configurações..." : "SALVAR TODAS AS CONFIGURAÇÕES"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
