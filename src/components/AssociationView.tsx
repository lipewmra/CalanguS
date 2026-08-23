import React, { useState, useEffect } from "react";
import { CollaboratorInfo, BuildingInfo } from "../types";
import { 
  Users, UserCheck, Search, Filter, Sparkles, CheckCircle, Check,
  HelpCircle, ShieldAlert, ArrowRight, RotateCcw, AlertCircle,
  Save, ChevronDown, ChevronUp, Plus, Minus, Banknote, DollarSign,
  Award, Shield, Bath, Footprints, FileText, Building2
} from "lucide-react";
import { ENEM_ROLES } from "./CollaboratorManager";
import FiscalAvatar from "./FiscalAvatar";
import ImageLightboxModal, { LightboxData } from "./ImageLightboxModal";

export const ROLE_PAYMENTS: Record<string, string> = {
  "Chefe de Sala": "R$ 240,00",
  "Representante do Local": "R$ 272,20",
  "Representante da Local": "R$ 272,20",
  "Ledor ou Transcritor (inglês ou espanhol)": "R$ 361,91",
  "Ledor/Transcritor": "R$ 361,91",
  "Ledor ou Transcritor": "R$ 361,91",
  "Apenas Ledor": "R$ 361,91",
  "Leitor transcritor espanhol": "R$ 361,91",
  "Leitor transcritor inglês": "R$ 361,91",
  "Apenas leitor espanhol": "R$ 361,91",
  "Apenas leitor inglês": "R$ 361,91",
  "Interprete de Libras": "R$ 361,91",
  "Aplicador": "R$ 180,00",
  "Aplicador (Fiscal de Sala)": "R$ 180,00",
  "Fiscal Volante": "R$ 180,00",
  "Fiscal de Banheiro": "R$ 180,00",
  "Auxiliar de Limpeza": "R$ 170,00",
  "Porteiro": "R$ 170,00",
  "Tecnico Informática": "R$ 240,00",
  "Auxiliar de Acessibilidade": "R$ 180,00",
};

export const OFFICIAL_PAYMENT_LIST = [
  { role: "Chefe de Sala", value: "R$ 240,00", rawValue: 240, desc: "Abertura de malotes, ata e cronometragem oficial" },
  { role: "Representante do Local", value: "R$ 272,20", rawValue: 272.20, desc: "Apoio de infraestrutura predial e ligação operacional" },
  { role: "Ledor ou Transcritor (inglês ou espanhol)", value: "R$ 361,91", rawValue: 361.91, desc: "Atendimento especializado a candidatos PCD e idiomas" },
  { role: "Aplicador", value: "R$ 180,00", rawValue: 180, desc: "Distribuição e fiscalização direta em sala de prova" },
  { role: "Fiscal Volante", value: "R$ 180,00", rawValue: 180, desc: "Circulação em corredores e suporte de trânsito" },
  { role: "Fiscal de Banheiro", value: "R$ 180,00", rawValue: 180, desc: "Inspeção e controle nos sanitários com detector" },
  { role: "Auxiliar de Limpeza", value: "R$ 170,00", rawValue: 170, desc: "Higienização contínua de salas e banheiros" },
  { role: "Porteiro", value: "R$ 170,00", rawValue: 170, desc: "Controle de acesso e fechamento pontual de portões" },
];

export function getRolePayment(roleName: string): string {
  if (!roleName) return "—";
  if (ROLE_PAYMENTS[roleName]) return ROLE_PAYMENTS[roleName];
  
  const lower = roleName.toLowerCase();
  if (lower.includes("chefe")) return "R$ 240,00";
  if (lower.includes("representante")) return "R$ 272,20";
  if (lower.includes("ledor") || lower.includes("leitor") || lower.includes("transcritor") || lower.includes("libras")) return "R$ 361,91";
  if (lower.includes("aplicador")) return "R$ 180,00";
  if (lower.includes("volante")) return "R$ 180,00";
  if (lower.includes("banheiro")) return "R$ 180,00";
  if (lower.includes("limpeza")) return "R$ 170,00";
  if (lower.includes("porteiro") || lower.includes("portão")) return "R$ 170,00";
  if (lower.includes("informática") || lower.includes("tecnico")) return "R$ 240,00";
  
  return "—";
}

interface AssociationViewProps {
  collaborators: CollaboratorInfo[];
  onUpdate: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  readOnly?: boolean;
  building?: BuildingInfo | null;
  onSaveBuilding?: (building: BuildingInfo) => Promise<void>;
}

export default function AssociationView({ 
  collaborators, 
  onUpdate, 
  readOnly = false,
  building = null,
  onSaveBuilding
}: AssociationViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all"); // "all" | "associated" | "unassociated" | specific role
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [lightboxData, setLightboxData] = useState<LightboxData | null>(null);

  // Collapse state for target quantities
  const [showTargetQuantitiesForm, setShowTargetQuantitiesForm] = useState(true);

  // Dynamic active roles from building configuration or fallback to standard ENEM_ROLES
  const activeRoles = React.useMemo(() => {
    if (building?.customRoles && building.customRoles.length > 0) {
      return building.customRoles.filter(r => !r.hidden);
    }
    return ENEM_ROLES.map((r, i) => ({
      id: `default-${i}`,
      name: r.name,
      desc: r.desc,
      hidden: false,
      targetQuantity: building?.rolesTargetQuantities?.[r.name] || 0
    }));
  }, [building]);

  // Target quantities for each role
  const [targetQuantities, setTargetQuantities] = useState<Record<string, number>>({});
  const [savingTargets, setSavingTargets] = useState(false);

  // Initialize target quantities from building data
  useEffect(() => {
    const initial: Record<string, number> = {};
    activeRoles.forEach(r => {
      initial[r.name] = (r.targetQuantity !== undefined ? r.targetQuantity : (building?.rolesTargetQuantities?.[r.name] || 0));
    });
    setTargetQuantities(initial);
  }, [building, activeRoles]);

  // Handle safe input changes
  const handleQuantityChange = (roleName: string, value: number) => {
    const val = Math.max(0, value);
    setTargetQuantities(prev => ({
      ...prev,
      [roleName]: val
    }));
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building || !onSaveBuilding) return;
    setSavingTargets(true);
    try {
      await onSaveBuilding({
        ...building,
        rolesTargetQuantities: targetQuantities
      });
      setSuccessMsg("Quantitativo necessário de funções salvo com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowTargetQuantitiesForm(false);
    } catch (err) {
      console.error("Error saving target quantities:", err);
    } finally {
      setSavingTargets(false);
    }
  };

  // Filter only approved/confirmed collaborators (c.status === "Confirmado")
  const approvedCollaborators = collaborators.filter(c => c.status === "Confirmado");
  const pendingCount = collaborators.filter(c => c.status === "Pendente").length;

  // Compute metrics from approved collaborators
  const totalCollabs = approvedCollaborators.length;
  const associatedCollabs = approvedCollaborators.filter(c => c.assignedRole && c.assignedRole !== "");
  const unassociatedCollabs = approvedCollaborators.filter(c => !c.assignedRole || c.assignedRole === "");

  // Counting for each role
  const roleCounts = activeRoles.reduce((acc, current) => {
    acc[current.name] = approvedCollaborators.filter(c => c.assignedRole === current.name).length;
    return acc;
  }, {} as Record<string, number>);

  // Compute estimated total payment
  const totalEstimatedPayment = associatedCollabs.reduce((sum, c) => {
    const paymentStr = getRolePayment(c.assignedRole || "");
    if (paymentStr && paymentStr.startsWith("R$")) {
      const numeric = parseFloat(paymentStr.replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;
      return sum + numeric;
    }
    return sum;
  }, 0);

  // Handle role setting
  const handleAssignRole = async (collabId: string, roleName: string) => {
    setIsUpdatingId(collabId);
    try {
      const isReserve = roleName === ""; // unassociated is reserve
      const collab = approvedCollaborators.find(c => c.id === collabId);
      if (collab) {
        await onUpdate(collabId, {
          assignedRole: roleName,
          isReserve,
          // When a new role is assigned by the CLA, reset attendanceStatus to "Pendente" so collaborator can confirm presence for this new role
          attendanceStatus: roleName !== "" ? "Pendente" : undefined,
          // Clear any previous refusal tags when assigning a new role or moving
          refusalTag: undefined,
          refusedRole: undefined,
          refusedRoleDate: undefined,
          // If moving to reserve, clear room; otherwise preserve room if already set
          assignedRoom: isReserve ? "" : (collab.assignedRoom || "")
        });
        setSuccessMsg(roleName !== "" ? `Função de ${collab.name} associada para "${roleName}" (${getRolePayment(roleName)}) com sucesso!` : `${collab.name} movido(a) para a equipe de Reserva com sucesso!`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Filtered Collaborators from approved list
  const filtered = approvedCollaborators.filter(c => {
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
            Menu 3 • Associação Oficial & Remuneração
          </span>
          <h2 className="text-xl font-display font-black tracking-tight text-white mt-2">
            Designação de Funções & Valores ENEM 2026
          </h2>
          <p className="text-xs text-indigo-200 mt-2 max-w-xl font-medium leading-relaxed">
            Aqui você gerencia o quadro de colaboradores associados e confere a <strong>remuneração oficial</strong> de cada função. Defina a função de cada fiscal elegível. Aqueles sem função definida permanecerão automaticamente na <strong>Equipe Reserva</strong>.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABELA OFICIAL DE REMUNERAÇÃO POR CARGO (DESTAQUE VISUAL SOLICITADO) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#101726]/90 border-2 border-emerald-500/30 rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.15)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b-2 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
                <span>Valores Oficiais de Remuneração por Cargo</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                  ENEM 2026
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Tabela de diária/honorários por função para colaboradores de aplicação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-right">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Folha Estimada:</span>
              <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                R$ {totalEstimatedPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Official Role Values Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {OFFICIAL_PAYMENT_LIST.map((item) => (
            <div
              key={item.role}
              className="p-3 bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800/80 rounded-2xl hover:border-emerald-500/50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-black text-slate-850 dark:text-white truncate" title={item.role}>
                    {item.role}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium line-clamp-2 leading-tight">
                  {item.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Valor:</span>
                <span className="font-mono font-black text-xs bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Approval Notice */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              Há <strong>{pendingCount} fiscal(is) pendente(s) de aprovação</strong> no <strong>Menu 2 (Fiscais)</strong>. O CLA deve realizar o filtro primário de aprovação antes que o fiscal fique disponível para associação de funções.
            </span>
          </div>
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

      {/* Planning of Target Quantities Card with Value of each role */}
      <div className="bg-white dark:bg-[#101726]/80 rounded-2xl border-2 border-slate-150 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setShowTargetQuantitiesForm(!showTargetQuantitiesForm)}>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                📋 Planejamento de Metas de Contratação por Função & Valores
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Defina o quantitativo necessário para cada cargo e confira o valor unitário
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="p-1 px-3 rounded-lg text-xs font-black transition flex items-center gap-1 shadow-sm hover:brightness-105 cursor-pointer"
            style={{ backgroundColor: "#fcff05", color: "#0062fe" }}
          >
            {showTargetQuantitiesForm ? (
              <>Ocultar <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Configurar Metas <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>

        {showTargetQuantitiesForm && (
          <form onSubmit={handleSaveTargets} className="mt-5 pt-4 border-t border-slate-150 dark:border-slate-850 space-y-4 animate-fade-in">
            {!building && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                ⚠️ Nenhum Prédio/Local de Aplicação associado ao seu perfil ou no banco de dados ativo. Cadastre e ative um prédio no Menu 1 primeiro para persistir as metas.
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeRoles.map((role) => {
                const currentQty = targetQuantities[role.name] || 0;
                const rolePayment = getRolePayment(role.name);
                return (
                  <div 
                    key={role.id || role.name} 
                    className="p-3.5 bg-slate-50 dark:bg-[#070b13]/40 border-2 border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 flex flex-col justify-between hover:border-indigo-400 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] font-mono uppercase font-black text-slate-800 dark:text-slate-200 block tracking-wider truncate" title={role.name}>
                          {role.name}
                        </span>
                        <span className="font-mono font-black text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                          {rolePayment}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-tight line-clamp-2 mt-1" title={role.desc}>
                        {role.desc}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                        <span>Meta de Fiscais:</span>
                        {currentQty > 0 && rolePayment !== "—" && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                            Subtotal: R$ {(parseFloat(rolePayment.replace("R$", "").replace(".", "").replace(",", ".").trim()) * currentQty).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={readOnly || !building}
                          onClick={() => handleQuantityChange(role.name, currentQty - 1)}
                          className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          disabled={readOnly || !building}
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(role.name, parseInt(e.target.value) || 0)}
                          className="w-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-1.5 text-center text-xs font-black text-slate-850 dark:text-slate-200 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          disabled={readOnly || !building}
                          onClick={() => handleQuantityChange(role.name, currentQty + 1)}
                          className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={readOnly || !building || savingTargets}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{savingTargets ? "Salvando..." : "Salvar Metas / Quantitativos"}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Role breakdown grid with role payment */}
      <details open className="bg-slate-50 dark:bg-[#070b13]/40 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 cursor-pointer group">
        <summary className="font-extrabold text-xs text-indigo-700 dark:text-indigo-400 select-none flex items-center justify-between focus:outline-hidden hover:text-indigo-600">
          <div className="flex items-center gap-2">
            <span>📊</span>
            <span>Ver Cobertura de Cargos e Valores do Prédio</span>
          </div>
          <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full group-open:hidden">Abrir Resumo</span>
          <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full hidden group-open:inline-block">Fechar Resumo</span>
        </summary>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 cursor-default">
          {activeRoles.map(role => {
            const count = roleCounts[role.name] || 0;
            const target = targetQuantities[role.name] || 0;
            const pct = target > 0 ? Math.min(Math.round((count / target) * 100), 100) : 0;
            const isComplete = target > 0 && count >= target;
            const hasUnder = target > 0 && count < target;
            const rolePayment = getRolePayment(role.name);

            return (
              <div 
                key={role.id || role.name} 
                className={`p-3 rounded-xl border-2 text-center transition flex flex-col justify-between ${
                  isComplete 
                    ? "bg-emerald-500/5 border-emerald-500/30" 
                    : hasUnder 
                      ? "bg-amber-500/[0.02] border-amber-500/25"
                      : count > 0 
                        ? "bg-indigo-500/5 border-indigo-500/15" 
                        : "bg-white dark:bg-[#101726]/40 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  <h4 className="text-[10px] font-black text-slate-850 dark:text-slate-300 truncate" title={role.name}>
                    {role.name}
                  </h4>
                  <span className="inline-block text-[9px] font-mono font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {rolePayment}
                  </span>
                  <div className="text-xl font-black mt-1 font-mono text-slate-900 dark:text-white">
                    {count}
                    {target > 0 && (
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        /{target}
                      </span>
                    )}
                  </div>
                </div>

                {target > 0 ? (
                  <div className="space-y-1 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-900">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          isComplete ? "bg-emerald-500" : pct > 50 ? "bg-amber-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[7.5px] font-black">
                      <span className={isComplete ? "text-emerald-500" : hasUnder ? "text-amber-500" : "text-slate-400"}>
                        {pct}%
                      </span>
                      <span className="text-[7.5px] font-semibold text-slate-450">
                        {isComplete ? "Completo" : `${target - count} faltam`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[8px] text-slate-400 font-bold mt-1.5 truncate" title={role.desc}>{role.desc}</p>
                )}
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
                <option key={role.name} value={role.name}>
                  {role.name} — ({getRolePayment(role.name)})
                </option>
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
              const currentPayment = isAssigned ? getRolePayment(collab.assignedRole!) : null;

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
                    {/* Header: Name, photo and badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FiscalAvatar
                          photoUrl={collab.photoUrl}
                          name={collab.name}
                          size="sm"
                          onClick={() => setLightboxData({
                            imageUrl: collab.photoUrl || "",
                            name: collab.name,
                            role: collab.assignedRole || "Fiscal Reserva",
                            cpf: collab.cpf,
                            education: collab.education,
                            specialRole: collab.specialRole,
                            hasWorkedEnem: collab.hasWorkedEnem,
                            pastEditions: collab.pastEditions,
                            email: collab.email,
                            whatsapp: collab.whatsapp,
                            birthDate: collab.birthDate,
                            disability: collab.disability,
                            languages: collab.languages,
                            pixKey: collab.pixKey,
                            referencePerson: collab.referencePerson,
                            assignedRoom: collab.assignedRoom,
                            status: collab.status,
                            attendanceStatus: collab.attendanceStatus,
                            refusedRole: collab.refusedRole,
                            refusalTag: collab.refusalTag,
                            createdAt: collab.createdAt,
                            isExternalRecruit: collab.isExternalRecruit,
                            paymentValue: currentPayment || undefined,
                            claName: collab.claName || building?.name,
                            originalClaName: collab.originalClaName,
                            transferHistory: collab.transferHistory
                          })}
                        />
                        <div className="truncate min-w-0 flex-1">
                          <h4 className="font-extrabold text-[#111827] dark:text-white text-sm truncate" title={collab.name}>
                            {collab.name}
                          </h4>
                          <p className="text-[10px] text-slate-405 font-mono font-bold mt-0.5 truncate">
                            {collab.cpf} • {collab.whatsapp}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isAssigned ? (
                          <>
                            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-505/10">
                              Associado
                            </span>
                            {currentPayment && (
                              <span className="text-[9px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                {currentPayment}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-505/10">
                            Reserva
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata attributes */}
                    <div className="mt-2.5 space-y-1 bg-slate-50 dark:bg-[#070b13]/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Escolaridade:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={collab.education}>{collab.education}</span>
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
                          {collab.hasWorkedEnem ? `Sim, ${collab.pastEditions?.length || 1} edições` : "Nenhum histórico"}
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

                      {/* Refusal Tag Display */}
                      {(collab.refusedRole || collab.refusalTag) && (
                        <div className="mt-1 p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-extrabold text-[9.5px]">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{collab.refusalTag || `Recusa de trabalho na função ${collab.refusedRole}`}</span>
                        </div>
                      )}

                      {/* Presence Confirmation Status for Assigned Collaborators */}
                      {isAssigned && (
                        <div className="mt-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between font-bold text-[9.5px]">
                          <span className="text-slate-400">Presença Fiscal:</span>
                          {collab.attendanceStatus === "Confirmado" ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" /> Confirmado
                            </span>
                          ) : (collab.attendanceStatus === "Recusado" || collab.refusedRole) ? (
                            <span className="text-rose-600 dark:text-rose-400 font-black flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> Recusou Função
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              ⏳ Aguardando Fiscal
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Association Action Block */}
                  <div className="mt-4 pt-3.5 border-t border-slate-150 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                        Designar Função do ENEM:
                      </label>
                      {collab.assignedRole && (
                        <span className="text-[9.5px] font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {getRolePayment(collab.assignedRole)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={collab.assignedRole || ""}
                        disabled={readOnly}
                        onChange={(e) => handleAssignRole(collab.id!, e.target.value)}
                        className="flex-1 bg-white dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:outline-hidden disabled:bg-slate-100 disabled:cursor-not-allowed text-ellipsis"
                      >
                        <option value="">-- Mover p/ Reserva --</option>
                        {activeRoles.map(role => (
                          <option key={role.id || role.name} value={role.name}>
                            {role.name} ({getRolePayment(role.name)})
                          </option>
                        ))}
                      </select>

                      {collab.assignedRole && (
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleAssignRole(collab.id!, "")}
                          title="Voltar Colaborador para Reserva"
                          className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl hover:bg-rose-500/20 border border-transparent hover:border-rose-500/25 transition cursor-pointer"
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

      <ImageLightboxModal
        data={lightboxData}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
}
