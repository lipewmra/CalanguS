import React, { useState, useMemo } from "react";
import { EventConfigInfo, CollaboratorMetricsConfig } from "../types";
import { 
  DEFAULT_COLLABORATOR_METRICS, 
  calculateBuildingTargetQuantities,
  OFFICIAL_METRICS_SPECS,
  OFFICIAL_TIERS_RANGES,
  calculateOfficialTier
} from "../lib/metrics-calculator";
import { getRolePayment } from "./AssociationView";
import { 
  SlidersHorizontal, CheckCircle, Save, RotateCcw, Building, Users, 
  Award, UserCheck, Shield, Bath, Footprints, FileText, Sparkles, 
  HelpCircle, AlertCircle, Calculator, DollarSign, Info, ChevronDown, 
  ChevronUp, Check, BookOpen, Monitor, Glasses, HeartHandshake,
  Layers, Volume2, ShieldCheck, Scale
} from "lucide-react";

interface CollaboratorMetricsAdminViewProps {
  initialConfig: EventConfigInfo | null;
  onSaveConfig: (cfg: Omit<EventConfigInfo, "id"> & { id?: string }) => Promise<any>;
}

export default function CollaboratorMetricsAdminView({
  initialConfig,
  onSaveConfig
}: CollaboratorMetricsAdminViewProps) {
  const [metrics, setMetrics] = useState<CollaboratorMetricsConfig>(() => {
    return {
      ...DEFAULT_COLLABORATOR_METRICS,
      ...(initialConfig?.collaboratorMetrics || {})
    };
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showOfficialTable, setShowOfficialTable] = useState(true);

  // Live Simulator States
  const [simRegularRooms, setSimRegularRooms] = useState<number>(12);
  const [simParticipantsPerRoom, setSimParticipantsPerRoom] = useState<number>(40);
  const [simSpecialRooms, setSimSpecialRooms] = useState<number>(2);
  const [simExtraRooms, setSimExtraRooms] = useState<number>(1);

  // Quick field updates helper
  const updateMetric = <K extends keyof CollaboratorMetricsConfig>(field: K, value: CollaboratorMetricsConfig[K]) => {
    setMetrics(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResetToDefaults = () => {
    if (window.confirm("Deseja restaurar todas as métricas para o padrão rigoroso oficial INEP/Cebraspe?")) {
      setMetrics(DEFAULT_COLLABORATOR_METRICS);
      setSuccessMsg("Métricas restauradas para o padrão oficial INEP/Cebraspe!");
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveConfig({
        ...(initialConfig || {
          year: 2026,
          examDates: ["08/11/2026", "15/11/2026"],
          trainingDates: ["07/11/2026"],
          generalInstructions: "Garantir rigidez na abertura e fechamento dos portões exatamente às 13:00h.",
          initialClaTasks: ["Conferir lacre das salas", "Ativar placa de sinalização de salas"],
        }),
        id: initialConfig?.id,
        collaboratorMetrics: metrics,
      });
      setSuccessMsg("Métricas de colaborador salvas e propagadas com sucesso para todos os CLAs do sistema!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Error saving collaborator metrics:", err);
    } finally {
      setSaving(false);
    }
  };

  // Calculate simulation result for a mock building
  const simulationData = useMemo(() => {
    const totalSimRooms = simRegularRooms + simSpecialRooms + simExtraRooms;
    const isDuplaRegular = simParticipantsPerRoom > (metrics.aplicadoresDuplaThreshold || 60);

    const mockBuilding = {
      claId: "sim",
      name: "Escola Modelo (Simulação)",
      address: "Simulação",
      roomsCount: simRegularRooms,
      virtualCapacity: simParticipantsPerRoom,
      realCapacity: totalSimRooms * simParticipantsPerRoom,
      coordRoom: "101",
      specialRoomsCount: simSpecialRooms,
      specialDetails: "",
      extraRoomsCount: simExtraRooms,
      rooms: Array.from({ length: simRegularRooms }, (_, i) => ({
        number: `Sala ${(i + 1).toString().padStart(2, '0')}`,
        floor: "1º Andar",
        capacity: simParticipantsPerRoom,
        type: "regular" as const
      }))
    };

    const calculated = calculateBuildingTargetQuantities(mockBuilding, metrics);

    // Sum estimated costs
    let totalCollaboratorsWithoutReserve = 0;
    let totalPayrollEstimated = 0;

    const breakdown = [
      { 
        role: "Chefe de Sala", 
        count: calculated["Chefe de Sala"] || 0, 
        desc: `${simRegularRooms} reg. + ${simSpecialRooms} esp. + ${simExtraRooms} ext. (1 por sala)`,
        payment: "R$ 240,00",
        rawVal: 240.00
      },
      { 
        role: "Aplicador", 
        count: calculated["Aplicador"] || 0, 
        desc: isDuplaRegular 
          ? `Dupla por sala (>60 inscritos): ${simRegularRooms * 2} aplicadores` 
          : `1 por sala regular (${simRegularRooms}) + ${simExtraRooms} em extras`,
        payment: "R$ 180,00",
        rawVal: 180.00
      },
      { 
        role: "Tradutor-Intérprete de Libras", 
        count: calculated["Tradutor-Intérprete de Libras"] || 0, 
        desc: `Atuação em dupla (${metrics.tradutoresLibrasPerSpecialRoom || 2} por sala especializada)`,
        payment: "R$ 448,91",
        rawVal: 448.91
      },
      { 
        role: "Guia-Intérprete de Surdocegos", 
        count: calculated["Guia-Intérprete de Surdocegos"] || 0, 
        desc: `Atuação em trio (${metrics.guiaInterpretesPerSpecialRoom || 3} por sala especializada)`,
        payment: "R$ 535,91",
        rawVal: 535.91
      },
      { 
        role: "Ledor (Aplicador Especializado)", 
        count: calculated["Ledor (Aplicador Especializado)"] || 0, 
        desc: `Atuação em dupla (${metrics.ledoresPerSpecialRoom || 2} por sala especializada)`,
        payment: "R$ 361,91",
        rawVal: 361.91
      },
      { 
        role: "Transcritor (Aplicador Especializado)", 
        count: calculated["Transcritor (Aplicador Especializado)"] || 0, 
        desc: `Atuação individual (${metrics.transcritoresPerSpecialRoom || 1} por participante)`,
        payment: "R$ 361,91",
        rawVal: 361.91
      },
      { 
        role: "Fiscal de Banheiro", 
        count: calculated["Fiscal de Banheiro"] || 0, 
        desc: `Tabela Cebraspe para ${totalSimRooms} salas (mín. 1 masc/1 fem)`,
        payment: "R$ 180,00",
        rawVal: 180.00
      },
      { 
        role: "Fiscal Volante / Corredor", 
        count: calculated["Fiscal Volante / Corredor"] || calculated["Fiscal Volante"] || 0, 
        desc: `Tabela Cebraspe para ${totalSimRooms} salas (circulação/detector)`,
        payment: "R$ 180,00",
        rawVal: 180.00
      },
      { 
        role: "Técnico de Informática", 
        count: calculated["Técnico de Informática"] || calculated["Tecnico Informática"] || 0, 
        desc: `Videoprova, Leitor de tela e suporte predial`,
        payment: "R$ 240,00",
        rawVal: 240.00
      },
      { 
        role: "Porteiro", 
        count: calculated["Porteiro"] || 0, 
        desc: `Controle de portão e fechamento pontual`,
        payment: "R$ 170,00",
        rawVal: 170.00
      },
      { 
        role: "Auxiliar de Limpeza", 
        count: calculated["Auxiliar de Limpeza"] || 0, 
        desc: `Higienização contínua de salas e sanitários`,
        payment: "R$ 170,00",
        rawVal: 170.00
      },
      { 
        role: "Representante do Local", 
        count: calculated["Representante do Local"] || 0, 
        desc: `Ligação com direção da escola/infraestrutura`,
        payment: "R$ 272,20",
        rawVal: 272.20
      },
    ].filter(item => item.count > 0);

    breakdown.forEach(item => {
      totalCollaboratorsWithoutReserve += item.count;
      totalPayrollEstimated += item.rawVal * item.count;
    });

    const reserveCount = Math.ceil(totalCollaboratorsWithoutReserve * ((metrics.reservaPercentage || 10) / 100));
    const grandTotal = totalCollaboratorsWithoutReserve + reserveCount;

    return {
      breakdown,
      totalRooms: totalSimRooms,
      totalWithoutReserve: totalCollaboratorsWithoutReserve,
      reserveCount,
      grandTotal,
      totalPayrollEstimated,
      activeTierCount: calculateOfficialTier(totalSimRooms)
    };
  }, [simRegularRooms, simParticipantsPerRoom, simSpecialRooms, simExtraRooms, metrics]);

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/15 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-display font-black text-slate-850 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-1.5 pb-0.5">
            <Scale className="w-5 h-5 text-emerald-500" />
            <span>Diretrizes e Métricas Oficiais Cebraspe/INEP — Dimensionamento ENEM 2026</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-3xl">
            Configure as regras de dimensionamento, capacidade e remuneração da equipe de aplicação. 
            Os cálculos alimentam automaticamente as metas do <strong>Menu 3 (Associação de Função)</strong> e <strong>Menu 4 (Alocação em Salas)</strong> para cada CLA.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowOfficialTable(!showOfficialTable)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>{showOfficialTable ? "Ocultar Tabela de Referência" : "Ver Tabela Oficial"}</span>
            {showOfficialTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Restaurar valores de referência oficiais"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão Oficial</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. TABELA OFICIAL CEBRASPE/INEP DE REFERÊNCIA */}
      {showOfficialTable && (
        <div className="p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-500/[0.04] to-slate-50 dark:from-[#0d1424] dark:to-[#070b13] space-y-4 animate-fade-in shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 dark:border-indigo-900/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-black text-xs text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                  Matriz Oficial de Funções, Capacidades e Requisitos
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Especificação rigorosa Cebraspe/INEP para exames nacionais
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-full w-fit">
              9 Funções Estruturantes Mapeadas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-indigo-200/80 dark:border-indigo-900/80 bg-indigo-100/40 dark:bg-indigo-950/40 text-[10px] uppercase font-black text-indigo-900 dark:text-indigo-300 tracking-wider">
                  <th className="py-2.5 px-3 rounded-l-lg">Função</th>
                  <th className="py-2.5 px-3">Participantes (Capacidade)</th>
                  <th className="py-2.5 px-3">Salas (Quantidade)</th>
                  <th className="py-2.5 px-3">Prédio / Coordenação</th>
                  <th className="py-2.5 px-3 text-center">Colaboradores</th>
                  <th className="py-2.5 px-3">Requisitos da Função</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Remuneração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {OFFICIAL_METRICS_SPECS.map((spec) => (
                  <tr key={spec.funcao} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {spec.funcao}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-[170px]">
                      {spec.participantes}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap">
                      {spec.salas}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-[200px]">
                      {spec.predio}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 whitespace-nowrap">
                      {spec.colaboradores}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[10px] leading-relaxed max-w-[260px]">
                      {spec.requisitos}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {spec.remuneracao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Settings Grid */}
      <form onSubmit={handleSave} className="space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1 & 2: CONFIGURATION CARDS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Salas Regulares */}
            <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726]/40 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                      Salas Regulares de Aplicação
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">1 Chefe de Sala (R$ 240,00) e 1 a 2 Aplicadores (R$ 180,00) conforme capacidade</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  Por Sala Regular
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Chefe de Sala</span>
                    <span className="text-[10px] text-slate-400">1 por sala (R$ 240,00)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateMetric("chefesPerRegularRoom", Math.max(0, (metrics.chefesPerRegularRoom || 1) - 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={metrics.chefesPerRegularRoom}
                      onChange={(e) => updateMetric("chefesPerRegularRoom", Math.max(0, Number(e.target.value)))}
                      className="w-10 text-center font-mono font-black text-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => updateMetric("chefesPerRegularRoom", (metrics.chefesPerRegularRoom || 1) + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Aplicador (Fiscal de Sala)</span>
                    <span className="text-[10px] text-slate-400">1 (até 60 inscritos) / 2 (61-100)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateMetric("aplicadoresPerRegularRoom", Math.max(0, (metrics.aplicadoresPerRegularRoom || 1) - 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={metrics.aplicadoresPerRegularRoom}
                      onChange={(e) => updateMetric("aplicadoresPerRegularRoom", Math.max(0, Number(e.target.value)))}
                      className="w-10 text-center font-mono font-black text-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1"
                    />
                    <button
                      type="button"
                      onClick={() => updateMetric("aplicadoresPerRegularRoom", (metrics.aplicadoresPerRegularRoom || 1) + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Salas de Atendimento Especializado (PCD / Acessibilidade) */}
            <div className="p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-[#101726]/40 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-900/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xs text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                      Salas Especiais (Atendimento Especializado & Acessibilidade)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Libras (Dupla - R$ 448,91), Guia (Trio - R$ 535,91), Ledor (Dupla - R$ 361,91), Transcritor (Individual - R$ 361,91), TI (R$ 240,00)</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                  PCD / Recursos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                
                {/* Tradutor-Intérprete de Libras (Dupla) */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-300">Intérprete de Libras</span>
                    <span className="text-[10px] text-slate-400">Atuação em Dupla (R$ 448,91)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("tradutoresLibrasPerSpecialRoom", Math.max(0, (metrics.tradutoresLibrasPerSpecialRoom || 2) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs text-indigo-600 dark:text-indigo-300">{metrics.tradutoresLibrasPerSpecialRoom ?? 2}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("tradutoresLibrasPerSpecialRoom", (metrics.tradutoresLibrasPerSpecialRoom ?? 2) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Guia-Intérprete de Surdocegos (Trio) */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-300">Guia-Intérprete</span>
                    <span className="text-[10px] text-slate-400">Atuação em Trio (R$ 535,91)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("guiaInterpretesPerSpecialRoom", Math.max(0, (metrics.guiaInterpretesPerSpecialRoom || 3) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs text-indigo-600 dark:text-indigo-300">{metrics.guiaInterpretesPerSpecialRoom ?? 3}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("guiaInterpretesPerSpecialRoom", (metrics.guiaInterpretesPerSpecialRoom ?? 3) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Ledor (Dupla) */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-300">Ledor (Especializado)</span>
                    <span className="text-[10px] text-slate-400">Atuação em Dupla (R$ 361,91)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("ledoresPerSpecialRoom", Math.max(0, (metrics.ledoresPerSpecialRoom || 2) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs text-indigo-600 dark:text-indigo-300">{metrics.ledoresPerSpecialRoom ?? 2}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("ledoresPerSpecialRoom", (metrics.ledoresPerSpecialRoom ?? 2) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Transcritor (Individual) */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-300">Transcritor</span>
                    <span className="text-[10px] text-slate-400">Individual (R$ 361,91)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("transcritoresPerSpecialRoom", Math.max(0, (metrics.transcritoresPerSpecialRoom || 1) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs text-indigo-600 dark:text-indigo-300">{metrics.transcritoresPerSpecialRoom ?? 1}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("transcritoresPerSpecialRoom", (metrics.transcritoresPerSpecialRoom ?? 1) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Técnico de Informática (Videoprova / TI) */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-300">TI / Videoprova</span>
                    <span className="text-[10px] text-slate-400">1 por sala com TI (R$ 240,00)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("tecnicosInformaticaPerTechRoom", Math.max(0, (metrics.tecnicosInformaticaPerTechRoom || 1) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs text-indigo-600 dark:text-indigo-300">{metrics.tecnicosInformaticaPerTechRoom ?? 1}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("tecnicosInformaticaPerTechRoom", (metrics.tecnicosInformaticaPerTechRoom ?? 1) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Chefe de Sala Especial */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Chefe de Sala Especial</span>
                    <span className="text-[10px] text-slate-400">1 por sala (R$ 240,00)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("chefesPerSpecialRoom", Math.max(0, (metrics.chefesPerSpecialRoom || 1) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs">{metrics.chefesPerSpecialRoom}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("chefesPerSpecialRoom", (metrics.chefesPerSpecialRoom || 1) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* 3. Apoio, Circulação e Sanitários (Régua Cebraspe 01-15: 2; 16-30: 4; 31-45: 6; 46-52: 8; 53-59: 10; 60-66: 12) */}
            <div className="p-5 rounded-2xl border-2 border-teal-200 dark:border-teal-900/50 bg-teal-50/30 dark:bg-[#101726]/40 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 dark:border-teal-900/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xs text-teal-950 dark:text-teal-200 uppercase tracking-wider">
                      Circulação, Banheiros & Apoio Predial
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Fiscais de Banheiro e Volantes seguem a régua progressiva Cebraspe</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metrics.useOfficialTiersForCorredorAndBanheiro !== false}
                      onChange={(e) => updateMetric("useOfficialTiersForCorredorAndBanheiro", e.target.checked)}
                      className="rounded accent-teal-600"
                    />
                    <span>Régua Oficial Cebraspe Ativa</span>
                  </label>
                </div>
              </div>

              {/* Tiers Visualizer */}
              <div className="p-3 bg-white/80 dark:bg-[#070b13]/80 rounded-xl border border-teal-200/60 dark:border-teal-900/60 space-y-2">
                <span className="block text-[10px] font-mono uppercase font-black tracking-wider text-teal-800 dark:text-teal-300">
                  Régua Escalonada para Fiscal de Banheiro e Fiscal Volante (R$ 180,00):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-[10px]">
                  {OFFICIAL_TIERS_RANGES.slice(0, 6).map((tier) => (
                    <div key={tier.label} className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                      <span className="block font-bold text-slate-700 dark:text-slate-300">{tier.label}</span>
                      <span className="block font-mono font-black text-xs text-teal-700 dark:text-teal-400 mt-0.5">{tier.count} fiscais</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                  * Fiscais de Banheiro atuam com mínimo de 1 por sexo (masculino e feminino). Fiscais Volantes realizam condução de participantes e manuseio de detector de metais.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                
                {/* Porteiro */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Porteiro</span>
                    <span className="text-[10px] text-slate-400">R$ 170,00</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("porteirosPerBuilding", Math.max(0, (metrics.porteirosPerBuilding ?? 2) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs">{metrics.porteirosPerBuilding}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("porteirosPerBuilding", (metrics.porteirosPerBuilding ?? 2) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Auxiliar de Limpeza */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Aux. Limpeza</span>
                    <span className="text-[10px] text-slate-400">R$ 170,00</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("auxiliaresLimpezaPerBuilding", Math.max(0, (metrics.auxiliaresLimpezaPerBuilding ?? 2) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs">{metrics.auxiliaresLimpezaPerBuilding}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("auxiliaresLimpezaPerBuilding", (metrics.auxiliaresLimpezaPerBuilding ?? 2) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Técnico TI Geral */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">TI Geral Prédio</span>
                    <span className="text-[10px] text-slate-400">R$ 240,00</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("tecnicosInformaticaPerBuilding", Math.max(0, (metrics.tecnicosInformaticaPerBuilding ?? 1) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs">{metrics.tecnicosInformaticaPerBuilding}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("tecnicosInformaticaPerBuilding", (metrics.tecnicosInformaticaPerBuilding ?? 1) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Representante do Local */}
                <div className="p-3 bg-white dark:bg-[#070b13] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Rep. do Local</span>
                    <span className="text-[10px] text-slate-400">R$ 272,20</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric("representanteLocalPerBuilding", Math.max(0, (metrics.representanteLocalPerBuilding ?? 1) - 1))}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-xs">{metrics.representanteLocalPerBuilding}</span>
                    <button
                      type="button"
                      onClick={() => updateMetric("representanteLocalPerBuilding", (metrics.representanteLocalPerBuilding ?? 1) + 1)}
                      className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* 4. Reserva Técnica e Observações */}
            <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#101726]/40 space-y-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Reserva Técnica Geral (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={metrics.reservaPercentage}
                      onChange={(e) => updateMetric("reservaPercentage", Math.max(0, Number(e.target.value)))}
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold text-sm"
                    />
                    <span className="font-bold text-slate-500">%</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">Margem de segurança para ausências (padrão oficial 10%)</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Diretrizes e Orientações aos Coordenadores (CLAs)
                  </label>
                  <textarea
                    rows={2}
                    value={metrics.notes || ""}
                    onChange={(e) => updateMetric("notes", e.target.value)}
                    placeholder="Instruções para os CLAs sobre dimensionamento e flexibilidade de alocação..."
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-850 dark:text-white text-xs"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* COLUMN 3: INTERACTIVE LIVE SIMULATOR & OFFICIAL PAYROLL PREVIEW */}
          <div className="space-y-4">
            
            <div className="p-5 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] to-teal-500/[0.04] dark:from-emerald-950/20 dark:to-[#070b13] space-y-4 sticky top-6 shadow-md">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="font-display font-black text-xs uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                      Simulador em Tempo Real
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Teste as regras e régua Cebraspe para um prédio</p>
                  </div>
                </div>
                <span className="text-[9px] bg-emerald-600 text-white font-mono font-bold px-2 py-0.5 rounded-full">
                  {simulationData.totalRooms} Salas Totais
                </span>
              </div>

              {/* Simulation Inputs */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Salas Regulares:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{simRegularRooms} salas</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={simRegularRooms}
                    onChange={(e) => setSimRegularRooms(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Inscritos por Sala Regular:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300">
                      {simParticipantsPerRoom} participantes {simParticipantsPerRoom > 60 ? "(Dupla de Aplicadores)" : "(1 Aplicador)"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={simParticipantsPerRoom}
                    onChange={(e) => setSimParticipantsPerRoom(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Salas Especiais (PCD / Libras / Ledor):</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{simSpecialRooms} salas</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={simSpecialRooms}
                    onChange={(e) => setSimSpecialRooms(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Salas Extras (Contingência):</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">{simExtraRooms} salas</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    value={simExtraRooms}
                    onChange={(e) => setSimExtraRooms(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Active Tier Notice */}
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[10px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between">
                <span>Faixa Cebraspe Ativa ({simulationData.totalRooms} salas):</span>
                <span className="font-mono">{simulationData.activeTierCount} Volantes / {simulationData.activeTierCount} Banheiros</span>
              </div>

              {/* Breakdown List */}
              <div className="p-3 bg-white/90 dark:bg-[#070b13]/80 rounded-xl border border-emerald-500/20 space-y-2 max-h-60 overflow-y-auto pr-1">
                <span className="block text-[9px] font-mono uppercase font-black tracking-wider text-slate-400">
                  Distribuição de Fiscais Calculada:
                </span>
                
                {simulationData.breakdown.map((item) => (
                  <div key={item.role} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-[11px]">{item.role}</span>
                      <span className="text-[9px] text-slate-400 block">{item.desc}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">{item.count}</span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-mono font-bold">{item.payment}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Total Badge */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Efetivo Operacional:</span>
                  <span className="font-mono font-bold">{simulationData.totalWithoutReserve} fiscais</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold">Reserva Técnica ({metrics.reservaPercentage}%):</span>
                  <span className="font-mono font-bold text-amber-400">+{simulationData.reserveCount} fiscais</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-display font-black text-xs uppercase tracking-wider text-emerald-400">
                    Total Convocados:
                  </span>
                  <span className="text-lg font-mono font-black text-emerald-400">
                    {simulationData.grandTotal} colaboradores
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/60 text-right">
                  <span className="text-[10px] text-slate-400 block">Folha Estimada (Fiscais Efetivos):</span>
                  <span className="text-sm font-mono font-black text-teal-300">
                    R$ {simulationData.totalPayrollEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 font-medium leading-tight">
                <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Ao salvar, essas diretrizes oficiais serão aplicadas automaticamente no cálculo inicial das metas de todos os CLAs do ENEM.
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t-2 border-slate-150 dark:border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-4 py-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Restaurar Valores Padrão Cebraspe
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn-3d btn-3d-primary py-3.5 px-8 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "PROPAGANDO DIRETRIZES..." : "SALVAR E PROPAGAR MÉTRICAS PARA TODOS OS CLAS"}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
