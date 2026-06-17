import React, { useState, useEffect } from "react";
import { EventConfigInfo, UserProfile, UserRole, BuildingInfo, CollaboratorInfo, ClaActivities } from "../types";
import { saveEventConfig, subscribeToUsers, updateUserRole, updateUserRoles, createPreRegisteredUser, masterResetDatabase, subscribeToAllBuildings, subscribeToAllClaActivities, subscribeToAllCollaborators } from "../lib/db-services";
import { ShieldCheck, Calendar, Settings, CheckCircle, Save, Users, RefreshCw, AlertCircle, PlusCircle, Trash2, AlertTriangle, Building, Activity, CheckSquare, Server, Layers } from "lucide-react";

interface SuperAdminProps {
  initialConfig: EventConfigInfo | null;
  onSaveConfig: (cfg: Omit<EventConfigInfo, "id"> & { id?: string }) => Promise<any>;
}

export default function SuperAdminDash({ initialConfig, onSaveConfig }: SuperAdminProps) {
  // Config states
  const [year, setYear] = useState(2026);
  const [examDate1, setExamDate1] = useState("08/11/2026");
  const [examDate2, setExamDate2] = useState("15/11/2026");
  const [trainingDate, setTrainingDate] = useState("07/11/2026");
  const [generalInstructions, setGeneralInstructions] = useState("Garantir rigidez na abertura e fechamento dos portões exatamente às 13:00h.");
  const [tasks, setTasks] = useState<string>("Conferir lacre das salas;Ativar placa de sinalização de salas;Alocar fiscais de reserva;Auditar chegada dos fardos de lanche");
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // New CLA Pre-registration states
  const [claName, setClaName] = useState("");
  const [claEmail, setClaEmail] = useState("");
  const [claCode, setClaCode] = useState("");
  const [claError, setClaError] = useState("");
  const [claSuccess, setClaSuccess] = useState("");
  const [claSubmitting, setClaSubmitting] = useState(false);
  const [registerRole, setRegisterRole] = useState<"CLA" | "SuperAdmin">("CLA");

  // Master Reset states
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setYear(initialConfig.year || 2026);
      setExamDate1(initialConfig.examDates?.[0] || "");
      setExamDate2(initialConfig.examDates?.[1] || "");
      setTrainingDate(initialConfig.trainingDates?.[0] || "");
      setGeneralInstructions(initialConfig.generalInstructions || "");
      setTasks(initialConfig.initialClaTasks?.join(";") || "");
    }
  }, [initialConfig]);

  // States for DB Statistics Dashboard
  const [allBuildings, setAllBuildings] = useState<BuildingInfo[]>([]);
  const [allCollaborators, setAllCollaborators] = useState<CollaboratorInfo[]>([]);
  const [allClaActivities, setAllClaActivities] = useState<ClaActivities[]>([]);

  // Sync users list
  useEffect(() => {
    const unsub = subscribeToUsers((usersList) => {
      setUsers(usersList);
    }, (err) => {
      console.error(err);
    });
    return () => unsub();
  }, []);

  // Sync buildings list for stats
  useEffect(() => {
    const unsub = subscribeToAllBuildings((list) => {
      setAllBuildings(list);
    });
    return () => unsub();
  }, []);

  // Sync collaborators list for stats
  useEffect(() => {
    const unsub = subscribeToAllCollaborators((list) => {
      setAllCollaborators(list);
    });
    return () => unsub();
  }, []);

  // Sync CLA activities list for stats
  useEffect(() => {
    const unsub = subscribeToAllClaActivities((list) => {
      setAllClaActivities(list);
    });
    return () => unsub();
  }, []);

  const handleSaveConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setConfigSuccess(false);

    const configData: Omit<EventConfigInfo, "id"> & { id?: string } = {
      id: initialConfig?.id,
      year: Number(year),
      examDates: [examDate1, examDate2],
      trainingDates: [trainingDate],
      generalInstructions,
      initialClaTasks: tasks.split(";").map(t => t.trim()).filter(Boolean)
    };

    try {
      await onSaveConfig(configData);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (profile: UserProfile, toggledRole: UserRole) => {
    let currentRoles = profile.roles || [profile.role];
    if (!currentRoles.includes(profile.role)) {
      currentRoles = [...currentRoles, profile.role];
    }
    
    let nextRoles: UserRole[];
    if (currentRoles.includes(toggledRole)) {
      if (currentRoles.length > 1) {
        nextRoles = currentRoles.filter(r => r !== toggledRole);
      } else {
        nextRoles = currentRoles;
      }
    } else {
      nextRoles = [...currentRoles, toggledRole];
    }
    
    let nextPrimary = profile.role;
    if (!nextRoles.includes(nextPrimary)) {
      nextPrimary = nextRoles[0];
    }
    
    try {
      await updateUserRoles(profile.uid, nextPrimary, nextRoles);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrimaryRoleChange = async (profile: UserProfile, newPrimary: UserRole) => {
    const currentRoles = profile.roles || [profile.role];
    let nextRoles = [...currentRoles];
    if (!nextRoles.includes(newPrimary)) {
      nextRoles.push(newPrimary);
    }
    try {
      await updateUserRoles(profile.uid, newPrimary, nextRoles);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaError("");
    setClaSuccess("");

    if (!claName.trim()) {
      setClaError("Insira o nome completo.");
      return;
    }
    if (!claEmail.trim()) {
      setClaError("Insira o e-mail.");
      return;
    }
    if (!claEmail.toLowerCase().endsWith("@gmail.com")) {
      setClaError("O e-mail deve ser obrigatoriamente do Gmail (@gmail.com).");
      return;
    }
    if (registerRole === "CLA") {
      if (!claCode.trim() || !/^\d+$/.test(claCode)) {
        setClaError("O código de coordenação deve conter apenas números.");
        return;
      }
    }

    setClaSubmitting(true);
    try {
      if (registerRole === "SuperAdmin") {
        await createPreRegisteredUser({
          name: claName.trim(),
          email: claEmail.trim().toLowerCase(),
          role: "SuperAdmin",
          roles: ["SuperAdmin"]
        });
        setClaSuccess(`Super Administrador ${claName} cadastrado com sucesso!`);
      } else {
        await createPreRegisteredUser({
          name: claName.trim(),
          email: claEmail.trim().toLowerCase(),
          role: "CLA",
          roles: ["CLA"],
          coordinationCode: claCode.trim()
        });
        setClaSuccess(`Coordenador (CLA) ${claName} cadastrado com sucesso!`);
      }
      setClaName("");
      setClaEmail("");
      setClaCode("");
      setTimeout(() => setClaSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setClaError("Erro ao registrar. Tente de novo.");
    } finally {
      setClaSubmitting(false);
    }
  };

  const handleMasterReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmText.trim() !== "EXCLUIR TUDO") {
      setResetError("Por favor, digite 'EXCLUIR TUDO' exatamente como indicado para prosseguir.");
      return;
    }

    setIsResetting(true);
    setResetError("");
    setResetSuccess("");

    try {
      await masterResetDatabase();
      setResetSuccess("MASTER RESET REALIZADO! Todos os dados de usuários, alocações, escolas, fotos e atividades foram completamente removidos do Firestore. O sistema será reiniciado em instantes.");
      setResetConfirmText("");
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setResetError("Ocorreu um erro ao realizar o Master Reset: " + (err.message || String(err)));
    } finally {
      setIsResetting(false);
    }
  };

  // Calculations for Admin Dashboard Stats
  const totalClasCount = users.filter(u => (u.roles || [u.role]).includes("CLA")).length;
  const totalAlasCount = users.filter(u => (u.roles || [u.role]).includes("ALA")).length;
  
  const totalCollabsCount = allCollaborators.length;
  const allocatedCollabsCount = allCollaborators.filter(c => c.assignedRoom && c.assignedRoom.trim() !== "").length;
  const confirmedCollabsCount = allCollaborators.filter(c => c.status === "Confirmado").length;
  
  const totalBuildingsCount = allBuildings.length;
  const totalRoomsCount = allBuildings.reduce((sum, b) => sum + (Number(b.roomsCount) || 0), 0);
  const totalCapacityConfigured = allBuildings.reduce((sum, b) => sum + (Number(b.realCapacity) || 0), 0);

  // Milestone activity counters
  let countVisitation = 0;
  let countAlaDefined = 0;
  let countTraining = 0;
  let countReceivedMaterial = 0;
  let countCheckedMaterial = 0;
  let countFilledOrion = 0;

  allClaActivities.forEach(act => {
    if (act.visitation?.checked) countVisitation++;
    if (act.alaDefined?.checked) countAlaDefined++;
    if (act.training?.checked) countTraining++;
    if (act.receivedMaterial?.checked) countReceivedMaterial++;
    if (act.checkedMaterial?.checked) countCheckedMaterial++;
    if (act.filledOrion?.checked) countFilledOrion++;
  });

  const totalPossibleChecks = (allClaActivities.length || totalClasCount || 1) * 6;
  const actualChecksCompleted = countVisitation + countAlaDefined + countTraining + countReceivedMaterial + countCheckedMaterial + countFilledOrion;
  const overallActivitiesProgressPct = totalPossibleChecks > 0 ? Math.round((actualChecksCompleted / totalPossibleChecks) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in" id="super-admin-root-dashboard">
      
      {/* HEADER BAR */}
      <div className="p-6 bg-[#0c1220]/90 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#1e293b] shadow-[6px_6px_0px_0px_#10b981]/25">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-display font-black tracking-wider flex items-center gap-2">
              <span>Painel do Super Administrador (Cebraspe Central)</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Configure diretrizes unificadas do ENEM, escopos de exames e perfis de acessibilidade.</p>
          </div>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 border-2 border-emerald-500/25 rounded-xl font-black uppercase tracking-widest font-mono select-none self-start md:self-center">
          ⚡ ACESSO TOTAL
        </div>
      </div>

      {/* DASHBOARD DE MONITORAMENTO OPERACIONAL (STATISTICS) */}
      <div className="bg-white dark:bg-[#0c1220]/90 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/15">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div>
            <h2 className="text-xs font-display font-black text-slate-700 dark:text-slate-350 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Painel de Estatísticas e Indicadores Operacionais</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold">Atualização em tempo real de alocações, capacidades e metas das equipes regionais.</p>
          </div>
          <div className="text-[10px] bg-slate-100 dark:bg-slate-800 font-mono font-bold px-2 rounded-lg py-1 border dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
            {allClaActivities.length} CLAs Respondendo
          </div>
        </div>

        {/* 4 MAIN STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Coordenadores */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-450 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Coordenação (CLA/ALA)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-black text-slate-850 dark:text-white">{totalClasCount}</span>
                <span className="text-[10px] font-bold text-slate-400">CLAs / {totalAlasCount} ALAs</span>
              </div>
            </div>
          </div>

          {/* Card 2: Alocações */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Alocações de Fiscais</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-black text-slate-850 dark:text-white">{totalCollabsCount}</span>
                <span className="text-[10px] font-bold text-slate-400">({allocatedCollabsCount} alocados • {confirmedCollabsCount} conf.)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Capacidade Física */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Capacidade de Locais</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-black text-slate-850 dark:text-white">{totalCapacityConfigured.toLocaleString("pt-BR")}</span>
                <span className="text-[10px] font-bold text-slate-400">vagas em {totalBuildingsCount} locais</span>
              </div>
            </div>
          </div>

          {/* Card 4: Tarefas Concluídas */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Progresso de Atividades</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-mono font-black text-slate-855 dark:text-white">{overallActivitiesProgressPct}%</span>
                <span className="text-[10px] font-bold text-slate-400">({actualChecksCompleted}/{totalPossibleChecks} tarefas)</span>
              </div>
            </div>
          </div>

        </div>

        {/* DETAILED STATS OF INDIVIDUAL TASK COMPLETION PROGRESS */}
        <div className="mt-5 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-950/5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450">Progresso dos Marcos Críticos do ENEM</span>
            <div className="flex items-center gap-3 font-mono text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Concluído</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800"></span> Pendente</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1. Visitação */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">1. Visitação</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countVisitation} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countVisitation / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countVisitation / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 2. Indicação de ALA */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">2. Escolha de ALA</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countAlaDefined} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countAlaDefined / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countAlaDefined / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 3. Treinamento */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">3. Treinamento</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countTraining} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countTraining / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countTraining / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 4. Recebimento Malote */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">4. Rec. Malote</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countReceivedMaterial} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countReceivedMaterial / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countReceivedMaterial / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 5. Conferência Material */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">5. Conf. Malote</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countCheckedMaterial} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countCheckedMaterial / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countCheckedMaterial / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 6. Orion Preenchido */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">6. Integrar Orion</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countFilledOrion} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countFilledOrion / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countFilledOrion / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PARTE 1: EVENT METADATA CONFIG */}
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20">
          <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-4 pb-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Configurações Gerais do Evento</span>
          </h2>

          {configSuccess && (
            <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-bounce">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Diretivas nacionais propagadas com sucesso para todos os CLAs!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfigSubmit} className="space-y-4 text-sm font-semibold">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Ano de Aplicação</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Data de Alinhamento</label>
                <input
                  type="text"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  placeholder="07/11/2026"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Dia 1 de Provas (Humanas)</label>
                <input
                  type="text"
                  value={examDate1}
                  onChange={(e) => setExamDate1(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Dia 2 de Provas (Exatas)</label>
                <input
                  type="text"
                  value={examDate2}
                  onChange={(e) => setExamDate2(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Diretivas Oficiais Cebraspe / INEP</label>
              <textarea
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                rows={2}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-800 dark:text-white text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Checklist Obrigatório para Lote CLA (divididos por ';')</label>
              <textarea
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
                rows={3}
                placeholder="Ex tarefas: Arrumar salas;Confirmar lanche"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-800 dark:text-white text-xs font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-primary rounded-xl w-full py-3 flex items-center justify-center gap-1.5 font-black text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "CONFIGURANDO SERVIDOR..." : "PROPORGACIONAR DIRETIVAS DE EVENTO"}</span>
            </button>
          </form>
        </div>

        {/* PARTE 2: USER PROFILE CONFIGURE */}
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-4 pb-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Controle de Perfis Multi-Usuários</span>
            </h2>

            <div className="p-3 bg-indigo-500/[0.04] dark:bg-[#070b13]/65 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-indigo-500/10 dark:border-slate-800 flex items-center gap-3 mb-4 text-xs font-bold leading-relaxed">
              <AlertCircle className="w-5 h-5 text-[#10b981] shrink-0" />
              <span>Administre funções. Quando novas contas acessarem o app, promova-as a CLA (Coordenador Local) ou ALA (Assistente Local) para gerenciar escolas de aplicação.</span>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {users.length === 0 ? (
                <p className="text-xs text-slate-450 dark:text-slate-400 text-center py-10 font-bold">Nenhum perfil de conta registrado no firestore.</p>
              ) : (
                users.map((profile) => {
                  const currentRoles = profile.roles || [profile.role];
                  const allAvailableRoles: UserRole[] = ["SuperAdmin", "CLA", "ALA", "Colaborador"];

                  return (
                    <div
                      key={profile.uid}
                      className="p-3.5 border-2 border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#101726]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-[#10b981]/30 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-[#111827] dark:text-white block truncate">{profile.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono font-bold truncate mb-2">{profile.email}</span>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[9px] uppercase font-extrabold text-slate-450 dark:text-slate-500 mr-1">Perfis:</span>
                          {allAvailableRoles.map((roleOpt) => {
                            const hasRole = currentRoles.includes(roleOpt);
                            return (
                              <button
                                key={roleOpt}
                                type="button"
                                onClick={() => handleRoleToggle(profile, roleOpt)}
                                className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold transition border cursor-pointer ${
                                  hasRole
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/40"
                                    : "bg-slate-100 dark:bg-[#070b13] text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                                }`}
                              >
                                {roleOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                        <span className="text-[9px] uppercase font-extrabold text-[#475569] dark:text-slate-400">Ativo / Principal:</span>
                        <select
                          value={profile.role}
                          onChange={(e) => handlePrimaryRoleChange(profile, e.target.value as UserRole)}
                          className="bg-white dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-extrabold text-slate-705 dark:text-white cursor-pointer focus:outline-hidden"
                        >
                          {currentRoles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t-2 border-slate-100 dark:border-slate-800 text-[10px] text-slate-450 dark:text-slate-500 font-mono font-bold flex items-center justify-between">
            <span>CALANGUS INTEGRATOR ENGINE</span>
            <span>v2.4 - ONLINE</span>
          </div>
        </div>

        {/* PARTE 3: REGISTRO DE NOVO CLA OU SUPERADMIN */}
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 lg:col-span-2">
          <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-4 pb-2">
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Cadastrar Novo Coordenador (CLA) ou Super Administrador</span>
          </h2>

          <form onSubmit={handleClaRegisterSubmit} className="space-y-4">
            {claSuccess && (
              <div className="p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20">
                {claSuccess}
              </div>
            )}
            {claError && (
              <div className="p-3 bg-rose-500/10 text-rose-800 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20">
                {claError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Perfil de Acesso</label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as "CLA" | "SuperAdmin")}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="CLA">Coordenador (CLA)</option>
                  <option value="SuperAdmin">Super Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Dr. Carlos Silva"
                  value={claName}
                  onChange={(e) => setClaName(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">E-mail do Gmail</label>
                <input
                  type="email"
                  placeholder="nome@gmail.com"
                  value={claEmail}
                  onChange={(e) => setClaEmail(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Código de Coordenação (Numérico)</label>
                {registerRole === "CLA" ? (
                  <input
                    type="text"
                    placeholder="Ex: 8520"
                    value={claCode}
                    onChange={(e) => setClaCode(e.target.value)}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono"
                    required
                  />
                ) : (
                  <div className="w-full border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-[#101726]/40 text-slate-400 dark:text-slate-500 font-mono text-[11px] leading-relaxed select-none">
                    Não Aplicável para SuperAdmin
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={claSubmitting}
              className="btn-3d btn-3d-primary rounded-xl px-6 py-3 flex items-center justify-center gap-1.5 font-black text-xs shadow-md cursor-pointer ml-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{claSubmitting ? "CADASTRANDO..." : registerRole === "SuperAdmin" ? "CADASTRAR SUPER ADMINISTRADOR" : "CADASTRAR NOVO CLA"}</span>
            </button>
          </form>
        </div>

        {/* PARTE 4: MASTER RESET DE TODO O BANCO DE DADOS */}
        <div className="bg-rose-500/5 dark:bg-rose-950/15 p-6 rounded-2xl border-2 border-rose-300 dark:border-rose-900 shadow-[6px_6px_0px_0px_rgba(244,63,94,0.15)] lg:col-span-2">
          <h2 className="text-sm font-display font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest pl-1 border-l-4 border-rose-500 flex items-center gap-2 mb-4 pb-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>Master Reset - Restauração de Fábrica do Sistema</span>
          </h2>

          <div className="text-xs text-rose-800 dark:text-rose-300 font-semibold leading-relaxed mb-4 space-y-2">
            <p>
              ⚠️ <strong className="font-black text-rose-600 dark:text-rose-400">ATENÇÃO EXTREMA:</strong> Esta é uma ação administrativa altamente destrutiva e irrevogável! 
              Ao efetuar o Master Reset, todas as informações do Firestore do ENEM serão eliminadas permanentemente.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Exclusão de todos os usuários pré-registrados e sincronizados (você precisará logar de novo para restaurar seu acesso principal).</li>
              <li>Limpeza completa de escolas/prédios de aplicação configurados (buildings).</li>
              <li>Exclusão de listas de fiscais de apoio (collaborators) e todos os check-ins.</li>
              <li>Limpeza de dados de fornecimento de lanches e fotos de relatórios de auditoria.</li>
            </ul>
          </div>

          <form onSubmit={handleMasterReset} className="space-y-4">
            {resetSuccess && (
              <div className="p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl border-2 border-emerald-500/20 animate-pulse">
                {resetSuccess}
              </div>
            )}
            {resetError && (
              <div className="p-4 bg-rose-500/10 text-rose-800 dark:text-rose-400 text-xs font-bold rounded-xl border-2 border-rose-500/20">
                {resetError}
              </div>
            )}

            <div className="p-4 bg-white dark:bg-[#0c1220]/75 rounded-xl border border-rose-300/30 dark:border-rose-900/30 font-sans">
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-rose-400 mb-2">
                Confirmação de Segurança
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 font-semibold">
                Escreva exatamente as palavras <span className="font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-black">EXCLUIR TUDO</span> no campo abaixo para habilitar o comando de limpeza:
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="EXCLUIR TUDO"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  disabled={isResetting}
                  className="flex-1 border-2 border-rose-200 dark:border-rose-950 rounded-xl px-4 py-2.5 bg-white dark:bg-[#101726]/80 text-rose-600 dark:text-rose-400 font-mono font-black placeholder:text-slate-300 tracking-wider text-xs focus:ring-2 focus:ring-rose-500/30 focus:outline-hidden"
                  required
                />
                
                <button
                  type="submit"
                  disabled={isResetting || resetConfirmText !== "EXCLUIR TUDO"}
                  className={`px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs shadow-md transition-all text-white border-b-4 border-rose-900 ${
                    resetConfirmText === "EXCLUIR TUDO" && !isResetting
                      ? "bg-rose-600 hover:bg-rose-700 cursor-pointer"
                      : "bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-50 border-slate-400"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isResetting ? "RESETANDO FIRESTORE..." : "EXECUTAR MASTER RESET"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
