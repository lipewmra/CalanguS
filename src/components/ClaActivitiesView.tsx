import React, { useState, useEffect } from "react";
import { 
  ClipboardCheck, 
  Calendar, 
  Users, 
  Award, 
  Package, 
  Database, 
  CheckCircle2, 
  Save, 
  Info, 
  CheckSquare, 
  AlertTriangle 
} from "lucide-react";
import { ClaActivities } from "../types";
import { saveClaActivities } from "../lib/db-services";

interface ClaActivitiesViewProps {
  activeClaId: string;
  activities: ClaActivities | null;
  readOnly: boolean;
}

export default function ClaActivitiesView({ activeClaId, activities, readOnly }: ClaActivitiesViewProps) {
  const [localActivities, setLocalActivities] = useState<ClaActivities>({
    claId: activeClaId,
    visitation: { checked: false, date: "", notes: "" },
    alaDefined: { checked: false, name: "", contact: "" },
    training: { checked: false, date: "", format: "" },
    receivedMaterial: { checked: false, receiverName: "", receivedDate: "" },
    checkedMaterial: { checked: false, checkedDate: "", checkNotes: "" },
    filledOrion: { checked: false, fillDate: "", orionCode: "" }
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (activities) {
      setLocalActivities({
        ...activities,
        // Ensure defaults if any nested fields are missing
        visitation: activities.visitation || { checked: false, date: "", notes: "" },
        alaDefined: activities.alaDefined || { checked: false, name: "", contact: "" },
        training: activities.training || { checked: false, date: "", format: "" },
        receivedMaterial: activities.receivedMaterial || { checked: false, receiverName: "", receivedDate: "" },
        checkedMaterial: activities.checkedMaterial || { checked: false, checkedDate: "", checkNotes: "" },
        filledOrion: activities.filledOrion || { checked: false, fillDate: "", orionCode: "" }
      });
    } else {
      setLocalActivities({
        claId: activeClaId,
        visitation: { checked: false, date: "", notes: "" },
        alaDefined: { checked: false, name: "", contact: "" },
        training: { checked: false, date: "", format: "" },
        receivedMaterial: { checked: false, receiverName: "", receivedDate: "" },
        checkedMaterial: { checked: false, checkedDate: "", checkNotes: "" },
        filledOrion: { checked: false, fillDate: "", orionCode: "" }
      });
    }
  }, [activities, activeClaId]);

  const handleToggle = (key: keyof Omit<ClaActivities, "id" | "claId" | "updatedAt">) => {
    if (readOnly) return;
    setLocalActivities(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: !prev[key].checked
      }
    }));
  };

  const handleFieldChange = (
    section: keyof Omit<ClaActivities, "id" | "claId" | "updatedAt">,
    field: string,
    value: string
  ) => {
    if (readOnly) return;
    setLocalActivities(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Calculate overall tasks completed
  const totalTasks = 6;
  const completedTasks = [
    localActivities.visitation.checked,
    localActivities.alaDefined.checked,
    localActivities.training.checked,
    localActivities.receivedMaterial.checked,
    localActivities.checkedMaterial.checked,
    localActivities.filledOrion.checked,
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload: ClaActivities = {
        ...localActivities,
        claId: activeClaId,
        updatedAt: new Date().toISOString()
      };
      
      await saveClaActivities(payload);
      setSuccessMsg("Atividades do CLA salvas no Firebase com sucesso!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao salvar as atividades. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="cla-activities-view" className="space-y-6">
      
      {/* Banner / Cabeçalho Principal */}
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-display font-black text-slate-855 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-emerald-500" />
              <span>Atividades do CLA</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-sans font-medium">
              Acompanhamento e registro oficial dos prazos regulamentares, visitas técnicas, conformidade de suprimentos e trâmites com sistemas de monitoramento oficiais do ENEM.
            </p>
          </div>

          {/* Progresso de Tarefas com 3D styling */}
          <div className="bg-slate-50 dark:bg-[#0f172a] border-2 border-slate-100 dark:border-slate-800 px-4 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[150px] shadow-inner">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Progresso Geral</span>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {completedTasks} / {totalTasks}
            </div>
            <span className="text-[9px] font-bold text-slate-500">{progressPercent}% Concluído</span>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden border border-slate-150 dark:border-slate-850">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Read-only Alert Banner for ALA */}
        {readOnly && (
          <div className="mt-4 p-3 bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs flex items-center gap-2.5 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Você está visualizando este menu em Modo de Leitura. Apenas o perfil CLA pode atualizar ou editar estas tarefas.</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Notificações */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold font-sans flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}
        
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border-2 border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold font-sans flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Grade de Atividades (As 6 tarefas solicitadas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ITEM 1: Visitação do Local de Prova */}
          <div className={`p-5 rounded-2xl border-2 transition-all duration-200 bg-white dark:bg-[#0c1220]/90 shadow-sm ${localActivities.visitation.checked ? "border-emerald-500/40 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${localActivities.visitation.checked ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    1. Visitação do local de prova
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Checklist obrigatório de reconhecimento de salas, acessos e fiação.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localActivities.visitation.checked}
                  onChange={() => handleToggle("visitation")}
                  disabled={readOnly}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-[#070b13] dark:after:border-slate-700 peer-checked:bg-emerald-500 select-none" />
              </label>
            </div>

            {localActivities.visitation.checked && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Data da Visita Técnica</label>
                  <input 
                    type="date"
                    value={localActivities.visitation.date}
                    onChange={(e) => handleFieldChange("visitation", "date", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-550/40 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Relatório / Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Prédio verificado, banheiros OK, salas amplas, acessibilidade total."
                    value={localActivities.visitation.notes}
                    onChange={(e) => handleFieldChange("visitation", "notes", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-medium text-slate-850 dark:text-white focus:ring-1 focus:ring-emerald-550/40 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ITEM 2: Definido o ALA */}
          <div className={`p-5 rounded-2xl border-2 transition-all duration-200 bg-white dark:bg-[#0c1220]/90 shadow-sm ${localActivities.alaDefined.checked ? "border-emerald-500/40 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${localActivities.alaDefined.checked ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    2. Definido o ALA
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Escolha de Assistente de Local de Aplicação (ALA) designado para apoio.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localActivities.alaDefined.checked}
                  onChange={() => handleToggle("alaDefined")}
                  disabled={readOnly}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-[#070b13] dark:after:border-slate-700 peer-checked:bg-emerald-500 select-none" />
              </label>
            </div>

            {localActivities.alaDefined.checked && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Nome Completo do ALA</label>
                  <input 
                    type="text"
                    placeholder="Ex: João da Silva Lima"
                    value={localActivities.alaDefined.name}
                    onChange={(e) => handleFieldChange("alaDefined", "name", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Contato / Telefone</label>
                  <input 
                    type="text"
                    placeholder="Ex: (84) 99999-8888"
                    value={localActivities.alaDefined.contact}
                    onChange={(e) => handleFieldChange("alaDefined", "contact", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ITEM 3: Capacitação com a Coordenação Municipal */}
          <div className={`p-5 rounded-2xl border-2 transition-all duration-200 bg-white dark:bg-[#0c1220]/90 shadow-sm ${localActivities.training.checked ? "border-emerald-500/40 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${localActivities.training.checked ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    3. Capacitação de Coordenação
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Frequência / Presença confirmada no treinamento da Coordenação Municipal.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localActivities.training.checked}
                  onChange={() => handleToggle("training")}
                  disabled={readOnly}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-[#070b13] dark:after:border-slate-700 peer-checked:bg-emerald-500 select-none" />
              </label>
            </div>

            {localActivities.training.checked && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Data da Capacitação</label>
                    <input 
                      type="date"
                      value={localActivities.training.date}
                      onChange={(e) => handleFieldChange("training", "date", e.target.value)}
                      disabled={readOnly}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Formato do Evento</label>
                    <select 
                      value={localActivities.training.format}
                      onChange={(e) => handleFieldChange("training", "format", e.target.value as any)}
                      disabled={readOnly}
                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-[9px] text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60"
                    >
                      <option value="">Selecione...</option>
                      <option value="Presencial">Presencial (Sede Regional)</option>
                      <option value="Online">Online / Videoconferência</option>
                      <option value="Não Participou">Não Participou</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ITEM 4: Recebeu material */}
          <div className={`p-5 rounded-2xl border-2 transition-all duration-200 bg-white dark:bg-[#0c1220]/90 shadow-sm ${localActivities.receivedMaterial.checked ? "border-emerald-500/40 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${localActivities.receivedMaterial.checked ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    4. Recebeu material?
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Check-in de recepção física de envelopes de provas, crachás e Atas.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localActivities.receivedMaterial.checked}
                  onChange={() => handleToggle("receivedMaterial")}
                  disabled={readOnly}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-[#070b13] dark:after:border-slate-700 peer-checked:bg-emerald-500 select-none" />
              </label>
            </div>

            {localActivities.receivedMaterial.checked && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Nome do Recebedor Oficial</label>
                  <input 
                    type="text"
                    placeholder="Ex: Coordenador CLA"
                    value={localActivities.receivedMaterial.receiverName}
                    onChange={(e) => handleFieldChange("receivedMaterial", "receiverName", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Data / Horário do Recebimento</label>
                  <input 
                    type="datetime-local"
                    value={localActivities.receivedMaterial.receivedDate}
                    onChange={(e) => handleFieldChange("receivedMaterial", "receivedDate", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ITEM 5: Conferido o material? */}
          <div className={`p-5 rounded-2xl border-2 transition-all duration-200 bg-white dark:bg-[#0c1220]/90 shadow-sm ${localActivities.checkedMaterial.checked ? "border-emerald-500/40 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${localActivities.checkedMaterial.checked ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    5. Conferido o material?
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Conferência minuciosa de itens recebidos para validação de discrepâncias.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localActivities.checkedMaterial.checked}
                  onChange={() => handleToggle("checkedMaterial")}
                  disabled={readOnly}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-[#070b13] dark:after:border-slate-700 peer-checked:bg-emerald-500 select-none" />
              </label>
            </div>

            {localActivities.checkedMaterial.checked && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Data / Horário da Conferência</label>
                  <input 
                    type="datetime-local"
                    value={localActivities.checkedMaterial.checkedDate}
                    onChange={(e) => handleFieldChange("checkedMaterial", "checkedDate", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Inconsistências ou Notas</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Quantitativo de canetas e crachás batendo com o lacre inicial."
                    value={localActivities.checkedMaterial.checkNotes}
                    onChange={(e) => handleFieldChange("checkedMaterial", "checkNotes", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-medium text-slate-850 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ITEM 6: Preencheu os dados no Orion? */}
          <div className={`p-5 rounded-2xl border-2 transition-all duration-200 bg-white dark:bg-[#0c1220]/90 shadow-sm ${localActivities.filledOrion.checked ? "border-emerald-500/40 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${localActivities.filledOrion.checked ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    6. Preencheu os dados no Orion?
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Sincronização cadastral dos colaboradores e equipe interna no Orion oficial.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localActivities.filledOrion.checked}
                  onChange={() => handleToggle("filledOrion")}
                  disabled={readOnly}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-[#070b13] dark:after:border-slate-700 peer-checked:bg-emerald-500 select-none" />
              </label>
            </div>

            {localActivities.filledOrion.checked && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Data da Sincronização Orion</label>
                  <input 
                    type="date"
                    value={localActivities.filledOrion.fillDate}
                    onChange={(e) => handleFieldChange("filledOrion", "fillDate", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400 mb-1">Código de Confirmação Orion</label>
                  <input 
                    type="text"
                    placeholder="Ex: ORION-ENEM-9941X"
                    value={localActivities.filledOrion.orionCode}
                    onChange={(e) => handleFieldChange("filledOrion", "orionCode", e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs rounded-xl font-extrabold text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-555/40 focus:outline-hidden disabled:opacity-60 font-mono tracking-wider placeholder:font-normal placeholder:font-sans"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Rodapé do Form com Botão de Salvar */}
        {!readOnly && (
          <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl flex items-center justify-between border-2 border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-extrabold font-mono pl-1">
              <Info className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Sempre salve após fazer alterações para atualizar na base centralizada.</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-3d btn-3d-primary rounded-xl px-6 py-3 flex items-center gap-2 font-black text-xs cursor-pointer select-none"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "SALVANDO NO FIREBASE..." : "SALVAR ATIVIDADES"}</span>
            </button>
          </div>
        )}

      </form>

    </div>
  );
}
