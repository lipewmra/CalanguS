import { BuildingInfo, RoomDetails, CollaboratorMetricsConfig } from "../types";
import { canonicalizeRoleName, isChefeDeSalaRole, isAplicadorRole } from "./collaborator-utils";

export interface OfficialMetricSpecification {
  funcao: string;
  aliases: string[];
  participantes: string;
  salas: string;
  predio: string;
  colaboradores: string;
  requisitos: string;
  remuneracao: string;
  remuneracaoNum: number;
}

/**
 * Tabela Oficial de Especificações e Regras Cebraspe / INEP
 */
export const OFFICIAL_METRICS_SPECS: OfficialMetricSpecification[] = [
  {
    funcao: "Chefe de Sala",
    aliases: ["Chefe de Sala", "Chefe"],
    participantes: "De acordo com a capacidade planejada da sala",
    salas: "1 por sala",
    predio: "1 por sala de aplicação (Regular ou Especializada)",
    colaboradores: "1 por sala",
    requisitos: "Ensino Médio completo; experiência de 0 a 4+ exames; capacitação de 1h30min; responsável por vistorias de materiais, lanches e identificação.",
    remuneracao: "R$ 240,00",
    remuneracaoNum: 240.00
  },
  {
    funcao: "Aplicador",
    aliases: ["Aplicador", "Aplicador (Fiscal de Sala)", "Fiscal de Sala"],
    participantes: "1 a 60 participantes (Regular); 61 a 100 participantes (Dupla)",
    salas: "1 por sala",
    predio: "1 por sala regular; atua em conjunto com o Chefe de Sala",
    colaboradores: "1 a 2 conforme o número de inscritos",
    requisitos: "Ensino Médio completo; experiência de 0 a 4+ exames; capacitação de 1h30min; auxilia na fiscalização e vistoria com detector de metais.",
    remuneracao: "R$ 180,00",
    remuneracaoNum: 180.00
  },
  {
    funcao: "Tradutor-Intérprete de Libras",
    aliases: ["Tradutor-Intérprete de Libras", "Interprete de Libras", "Intérprete de Libras", "Libras"],
    participantes: "Participantes usuários de Libras / Deficiência Auditiva",
    salas: "Salas de atendimento especializado",
    predio: "Atuação em dupla por demanda de acessibilidade",
    colaboradores: "2 por sala com este recurso",
    requisitos: "Profissional capacitado com certificação em Libras; experiência em exames; uso de camisa preta; capacitação específica.",
    remuneracao: "R$ 448,91",
    remuneracaoNum: 448.91
  },
  {
    funcao: "Guia-Intérprete de Surdocegos",
    aliases: ["Guia-Intérprete de Surdocegos", "Guia-Intérprete", "Guia-Interprete", "Guia Intérprete"],
    participantes: "Para participantes surdocegos",
    salas: "Salas de atendimento especializado",
    predio: "Atuação em trio por demanda de acessibilidade",
    colaboradores: "3 por sala com este recurso",
    requisitos: "Profissional capacitado em Tadoma ou Libras Tátil; domínio de língua estrangeira; experiência em exames.",
    remuneracao: "R$ 535,91",
    remuneracaoNum: 535.91
  },
  {
    funcao: "Ledor (Aplicador Especializado)",
    aliases: ["Ledor (Aplicador Especializado)", "Ledor", "Apenas Ledor", "Ledor/Transcritor", "Ledor ou Transcritor", "Leitor transcritor espanhol", "Leitor transcritor inglês", "Apenas leitor espanhol", "Apenas leitor inglês"],
    participantes: "Para participantes com deficiência visual, dislexia ou outras",
    salas: "Salas de atendimento especializado",
    predio: "Atuação em dupla por demanda de acessibilidade",
    colaboradores: "2 por sala com este recurso",
    requisitos: "Profissional capacitado; domínio de leitura (inclusive língua estrangeira); curso específico de 12h.",
    remuneracao: "R$ 361,91",
    remuneracaoNum: 361.91
  },
  {
    funcao: "Transcritor (Aplicador Especializado)",
    aliases: ["Transcritor (Aplicador Especializado)", "Transcritor", "Apenas Transcritor"],
    participantes: "Para participantes impossibilitados de escrever",
    salas: "Salas de atendimento especializado",
    predio: "Atuação individual por demanda de acessibilidade",
    colaboradores: "1 por participante com este recurso",
    requisitos: "Profissional capacitado; curso específico (12h); experiência em exames; transcreve respostas e redação.",
    remuneracao: "R$ 361,91",
    remuneracaoNum: 361.91
  },
  {
    funcao: "Fiscal de Banheiro",
    aliases: ["Fiscal de Banheiro", "Fiscal Banheiro"],
    participantes: "Métrica por prédio/coordenação",
    salas: "Áreas comuns",
    predio: "1 por banheiro (masculino e feminino); 01-15 salas (2); 16-30 (4); 31-45 (6); 46-52 (8); 53-59 (10); 60-66 (12)",
    colaboradores: "2 a 12 (mínimo 1 por sexo)",
    requisitos: "Ensino Fundamental ou Médio; preferencialmente com experiência; realiza vistoria eletrônica (detector de metais).",
    remuneracao: "R$ 180,00",
    remuneracaoNum: 180.00
  },
  {
    funcao: "Fiscal Volante / Corredor",
    aliases: ["Fiscal Volante / Corredor", "Fiscal Volante", "Fiscal de Corredor", "Volante"],
    participantes: "Métrica por prédio/coordenação",
    salas: "Circulação e áreas comuns",
    predio: "01-15 salas (2); 16-30 (4); 31-45 (6); 46-52 (8); 53-59 (10); 60-66 (12)",
    colaboradores: "2 a 12 conforme necessidade",
    requisitos: "Ensino Fundamental ou Médio; conduz participantes ao banheiro ou coordenação; manuseio de detector de metais.",
    remuneracao: "R$ 180,00",
    remuneracaoNum: 180.00
  },
  {
    funcao: "Técnico de Informática",
    aliases: ["Técnico de Informática", "Tecnico Informática", "Técnico Informática", "TI"],
    participantes: "Salas com Videoprova em Libras ou Leitor de Tela",
    salas: "1 por sala com atendimento específico",
    predio: "Salas com demanda tecnológica (computador)",
    colaboradores: "1 por sala com este recurso",
    requisitos: "Ensino Médio completo; conhecimento específico em informática; treinamento via manual.",
    remuneracao: "R$ 240,00",
    remuneracaoNum: 240.00
  }
];

export const DEFAULT_COLLABORATOR_METRICS: CollaboratorMetricsConfig = {
  // Salas Regulares
  chefesPerRegularRoom: 1,
  aplicadoresPerRegularRoom: 1,
  aplicadoresDuplaThreshold: 60,
  
  // Salas de Atendimento Especializado (PCD / Acessibilidade)
  chefesPerSpecialRoom: 1,
  aplicadoresPerSpecialRoom: 0,
  ledoresPerSpecialRoom: 2,           // Atuação em dupla por demanda de acessibilidade
  transcritoresPerSpecialRoom: 1,      // Atuação individual
  tradutoresLibrasPerSpecialRoom: 2,   // Atuação em dupla por demanda de acessibilidade
  guiaInterpretesPerSpecialRoom: 3,    // Atuação em trio por demanda de acessibilidade
  tecnicosInformaticaPerTechRoom: 1,   // 1 por sala com videoprova/computador
  auxiliarAcessibilidadePerSpecialRoom: 0,
  ledorTranscritorPerSpecialRoom: 2,   // legacy alias (default 2 ledores)
  interpreteLibrasPerSpecialRoom: 2,   // legacy alias (default 2 libras)

  // Salas Extras / Contingência (Apenas 01 Chefe de Sala e SEM aplicadores em nenhum caso)
  chefesPerExtraRoom: 1,
  aplicadoresPerExtraRoom: 0,

  // Apoio e Circulação por Prédio / Coordenação
  useOfficialTiersForCorredorAndBanheiro: true,
  fiscaisCorredorPerRoomsRatio: 4,     // fallback se desativado tier
  fiscaisBanheiroPerBuilding: 2,       // fallback se desativado tier
  porteirosPerBuilding: 2,             // 2 porteiros por local
  auxiliaresLimpezaPerBuilding: 2,     // 2 auxiliares de limpeza por local
  tecnicosInformaticaPerBuilding: 0,   // Técnico de Informática só existe em caso que o local tenha Técnico em Libras
  representanteLocalPerBuilding: 1,     // 1 representante da escola/local

  // Reserva Técnica (%)
  reservaPercentage: 10,

  notes: "Regras Oficiais Cebraspe/INEP para Dimensionamento e Remuneração de Equipes de Aplicação - ENEM 2026."
};

/**
 * Calcula a quantidade oficial escalonada de Fiscais de Banheiro ou Fiscais Volantes/Corredor
 * com base na régua oficial do Cebraspe/INEP:
 * 01-15 salas: 2
 * 16-30 salas: 4
 * 31-45 salas: 6
 * 46-52 salas: 8
 * 53-59 salas: 10
 * 60-66 salas: 12
 * > 66 salas: 12 + proporcional (+2 a cada 7 salas)
 */
export function calculateOfficialTier(roomsCount: number): number {
  if (roomsCount <= 0) return 0;
  if (roomsCount <= 15) return 2;
  if (roomsCount <= 30) return 4;
  if (roomsCount <= 45) return 6;
  if (roomsCount <= 52) return 8;
  if (roomsCount <= 59) return 10;
  if (roomsCount <= 66) return 12;
  // Acima de 66 salas, adiciona 2 fiscais a cada bloco de 7 salas
  const extraBlocks = Math.ceil((roomsCount - 66) / 7);
  return 12 + (extraBlocks * 2);
}

/**
 * Retorna as faixas oficiais para exibição didática na UI
 */
export const OFFICIAL_TIERS_RANGES = [
  { min: 1, max: 15, label: "01 a 15 salas", count: 2 },
  { min: 16, max: 30, label: "16 a 30 salas", count: 4 },
  { min: 31, max: 45, label: "31 a 45 salas", count: 6 },
  { min: 46, max: 52, label: "46 a 52 salas", count: 8 },
  { min: 53, max: 59, label: "53 a 59 salas", count: 10 },
  { min: 60, max: 66, label: "60 a 66 salas", count: 12 },
  { min: 67, max: 999, label: "Acima de 66 salas", count: "12 + 2 a cada 7 salas" }
];

/**
 * Calcula requisitos individuais de alocação para uma sala
 */
export function getRoomTargetRequirements(
  room: RoomDetails,
  metricsConfig: CollaboratorMetricsConfig = DEFAULT_COLLABORATOR_METRICS,
  isSpecial: boolean = false,
  isExtra: boolean = false
): {
  targetChefes: number;
  targetAplicadores: number;
  targetLedores: number;
  targetTranscritores: number;
  targetLibras: number;
  targetGuiaInterprete: number;
  targetTecnicoInfo: number;
  targetAcessibilidade: number;
} {
  // If the CLA has custom overrides defined directly on this room, respect them
  const hasCustomChefes = room.targetChefes !== undefined;
  const hasCustomAplicadores = room.targetAplicadores !== undefined;
  const hasCustomLedores = room.targetLedores !== undefined;
  const hasCustomLibras = room.targetLibras !== undefined;
  const hasCustomAcess = room.targetAcessibilidade !== undefined;

  const roomCapacity = Number(room.capacity) || 30;
  const isDuplaAplicador = roomCapacity > (metricsConfig.aplicadoresDuplaThreshold || 60);

  if (isSpecial || room.type === "special") {
    // If room has explicitly configured specializedRoles (from Menu 1/Room details), calculate directly
    if (room.specializedRoles && room.specializedRoles.length > 0) {
      const ledorCount = room.specializedRoles.filter(r => r.toLowerCase().includes("ledor")).length;
      const transcritorCount = room.specializedRoles.filter(r => r.toLowerCase().includes("transcritor") && !r.toLowerCase().includes("ledor")).length;
      const librasCount = room.specializedRoles.filter(r => r.toLowerCase().includes("libras")).length;
      const techCount = room.specializedRoles.filter(r => r.toLowerCase().includes("informática") || r.toLowerCase().includes("informatica") || r.toLowerCase().includes("video prova")).length;
      const otherSpecialCount = room.specializedRoles.length - (ledorCount + transcritorCount + librasCount + techCount);

      return {
        targetChefes: hasCustomChefes ? room.targetChefes! : (metricsConfig.chefesPerSpecialRoom ?? 1),
        targetAplicadores: hasCustomAplicadores ? room.targetAplicadores! : (isDuplaAplicador ? 2 : (metricsConfig.aplicadoresPerSpecialRoom ?? 0)),
        targetLedores: hasCustomLedores ? room.targetLedores! : ledorCount,
        targetTranscritores: transcritorCount,
        targetLibras: hasCustomLibras ? room.targetLibras! : librasCount,
        targetGuiaInterprete: 0,
        targetTecnicoInfo: techCount,
        targetAcessibilidade: hasCustomAcess ? room.targetAcessibilidade! : Math.max(0, otherSpecialCount),
      };
    }

    const ledorTarget = metricsConfig.ledoresPerSpecialRoom ?? metricsConfig.ledorTranscritorPerSpecialRoom ?? 2;
    const transcritorTarget = metricsConfig.transcritoresPerSpecialRoom ?? 1;
    const librasTarget = metricsConfig.tradutoresLibrasPerSpecialRoom ?? metricsConfig.interpreteLibrasPerSpecialRoom ?? 2;
    const guiaTarget = metricsConfig.guiaInterpretesPerSpecialRoom ?? 3;
    const techTarget = metricsConfig.tecnicosInformaticaPerTechRoom ?? 1;

    return {
      targetChefes: hasCustomChefes ? room.targetChefes! : metricsConfig.chefesPerSpecialRoom,
      targetAplicadores: hasCustomAplicadores ? room.targetAplicadores! : (isDuplaAplicador ? 2 : metricsConfig.aplicadoresPerSpecialRoom),
      targetLedores: hasCustomLedores ? room.targetLedores! : ledorTarget,
      targetTranscritores: transcritorTarget,
      targetLibras: hasCustomLibras ? room.targetLibras! : librasTarget,
      targetGuiaInterprete: guiaTarget,
      targetTecnicoInfo: techTarget,
      targetAcessibilidade: hasCustomAcess ? room.targetAcessibilidade! : (metricsConfig.auxiliarAcessibilidadePerSpecialRoom || 0),
    };
  }

  const roomNumberLower = (room.number || "").toLowerCase();
  const isExtraRoom = isExtra || room.type === "extra" || roomNumberLower.includes("extra") || roomNumberLower.includes("contingência");

  if (isExtraRoom) {
    return {
      targetChefes: hasCustomChefes ? room.targetChefes! : (metricsConfig.chefesPerExtraRoom || 1),
      targetAplicadores: 0, // Regra Estrita: A sala extra só tem Chefe de Sala, NÃO possui em nenhum caso aplicador
      targetLedores: 0,
      targetTranscritores: 0,
      targetLibras: 0,
      targetGuiaInterprete: 0,
      targetTecnicoInfo: 0,
      targetAcessibilidade: 0,
    };
  }

  // Regular room
  const regularAplicadores = isDuplaAplicador ? 2 : metricsConfig.aplicadoresPerRegularRoom;

  return {
    targetChefes: hasCustomChefes ? room.targetChefes! : metricsConfig.chefesPerRegularRoom,
    targetAplicadores: hasCustomAplicadores ? room.targetAplicadores! : regularAplicadores,
    targetLedores: hasCustomLedores ? room.targetLedores! : 0,
    targetTranscritores: 0,
    targetLibras: hasCustomLibras ? room.targetLibras! : 0,
    targetGuiaInterprete: 0,
    targetTecnicoInfo: 0,
    targetAcessibilidade: hasCustomAcess ? room.targetAcessibilidade! : 0,
  };
}

/**
 * Calcula os quantitativos recomendados para todos os cargos de um prédio
 * de acordo com o inventário de salas e as diretrizes do SuperAdmin
 */
export function calculateBuildingTargetQuantities(
  building: BuildingInfo | null,
  metricsConfig: CollaboratorMetricsConfig = DEFAULT_COLLABORATOR_METRICS
): Record<string, number> {
  if (!building) {
    return {};
  }

  const regularRoomsCount = Math.max(0, building.roomsCount || (building.rooms ? building.rooms.length : 0));
  const specialRoomsCount = Math.max(0, building.specialRoomsCount || (building.specialRooms ? building.specialRooms.length : 0));
  const extraRoomsCount = Math.max(0, building.extraRoomsCount || (building.extraRooms ? building.extraRooms.length : 0));
  const totalRoomsCount = regularRoomsCount + specialRoomsCount + extraRoomsCount;

  // 1. Chefe de Sala: calculado sala a sala (se especificado) ou pelo padrão das métricas
  let totalChefes = 0;
  if (building.rooms && building.rooms.length > 0) {
    building.rooms.forEach(r => {
      const target = r.targetChefes !== undefined ? Number(r.targetChefes) : (metricsConfig.chefesPerRegularRoom || 1);
      totalChefes += Math.max(0, target);
    });
  } else {
    totalChefes += regularRoomsCount * (metricsConfig.chefesPerRegularRoom || 1);
  }

  if (building.specialRooms && building.specialRooms.length > 0) {
    building.specialRooms.forEach(sr => {
      const target = sr.targetChefes !== undefined ? Number(sr.targetChefes) : (metricsConfig.chefesPerSpecialRoom || 1);
      totalChefes += Math.max(0, target);
    });
  } else {
    totalChefes += specialRoomsCount * (metricsConfig.chefesPerSpecialRoom || 1);
  }

  if (building.extraRooms && building.extraRooms.length > 0) {
    building.extraRooms.forEach(er => {
      const target = er.targetChefes !== undefined ? Number(er.targetChefes) : (metricsConfig.chefesPerExtraRoom || 1);
      totalChefes += Math.max(0, target);
    });
  } else {
    totalChefes += extraRoomsCount * (metricsConfig.chefesPerExtraRoom || 1);
  }

  // 2. Aplicador: calculado sala a sala (se especificado) ou pela regra de capacidade / métrica
  // REGRA DO ENEM: Salas Reserva/Contingência/Extra NÃO possuem Aplicadores pré-alocados!
  let totalAplicadores = 0;
  if (building.rooms && building.rooms.length > 0) {
    building.rooms.forEach(r => {
      const isReserveOrExtra = 
        Boolean(r.number && /reserva|extra|conting[êe]ncia/i.test(r.number)) ||
        Boolean(r.details && /reserva|conting[êe]ncia/i.test(r.details));
      
      // Salas de reserva/contingência não têm aplicador pré-alocado
      if (isReserveOrExtra) return;

      if (r.targetAplicadores !== undefined) {
        totalAplicadores += Math.max(0, Number(r.targetAplicadores));
      } else {
        const cap = Number(r.capacity) || building.virtualCapacity || 30;
        totalAplicadores += (cap > 60 ? 2 : (metricsConfig.aplicadoresPerRegularRoom || 1));
      }
    });
  } else {
    totalAplicadores += regularRoomsCount * (metricsConfig.aplicadoresPerRegularRoom || 1);
  }

  if (building.specialRooms && building.specialRooms.length > 0) {
    building.specialRooms.forEach(sr => {
      if (sr.targetAplicadores !== undefined) {
        totalAplicadores += Math.max(0, Number(sr.targetAplicadores));
      } else {
        totalAplicadores += (metricsConfig.aplicadoresPerSpecialRoom || 0);
      }
    });
  } else {
    totalAplicadores += specialRoomsCount * (metricsConfig.aplicadoresPerSpecialRoom || 0);
  }

  if (building.extraRooms && building.extraRooms.length > 0) {
    building.extraRooms.forEach(er => {
      // Apenas adiciona se explicitamente configurado pelo usuário para aquela sala extra
      if (er.targetAplicadores !== undefined && Number(er.targetAplicadores) > 0) {
        totalAplicadores += Math.max(0, Number(er.targetAplicadores));
      }
    });
  }

  // REGRA CRÍTICA: Se o CLA definiu o quantitativo oficial no Menu 2 (rolesTargetQuantities),
  // esses valores têm prevalência oficial!
  const customRoleTargets = building.rolesTargetQuantities || {};
  if (customRoleTargets["Aplicador"] !== undefined && Number(customRoleTargets["Aplicador"]) >= 0) {
    totalAplicadores = Number(customRoleTargets["Aplicador"]);
  } else if (customRoleTargets["Aplicador (Fiscal de Sala)"] !== undefined && Number(customRoleTargets["Aplicador (Fiscal de Sala)"]) >= 0) {
    totalAplicadores = Number(customRoleTargets["Aplicador (Fiscal de Sala)"]);
  }

  if (customRoleTargets["Chefe de Sala"] !== undefined && Number(customRoleTargets["Chefe de Sala"]) >= 0) {
    totalChefes = Number(customRoleTargets["Chefe de Sala"]);
  }

  // 3. Funções em Locais com Atendimento Especializado:
  // Regra Estrita: deve ser calculado estritamente os números indicados no Menu 1
  const hasSpecialized = Boolean(building.hasSpecializedAttendance);
  const specializedCounts: Record<string, number> = {};

  if (hasSpecialized) {
    if (building.specialRooms && building.specialRooms.length > 0) {
      building.specialRooms.forEach(sr => {
        const roles = sr.specializedRoles || (sr.details ? sr.details.split(",").map(s => s.trim()).filter(Boolean) : []);
        roles.forEach(roleName => {
          const trimmed = roleName.trim();
          if (trimmed) {
            specializedCounts[trimmed] = (specializedCounts[trimmed] || 0) + 1;
          }
        });
        if (sr.customRoleTargets) {
          Object.entries(sr.customRoleTargets).forEach(([cRole, count]) => {
            specializedCounts[cRole] = (specializedCounts[cRole] || 0) + Number(count || 0);
          });
        }
      });
    } else if (building.specializedRoles && building.specializedRoles.length > 0 && specialRoomsCount > 0) {
      // Se apenas foram selecionadas funções no menu 1 sem detalhamento sala a sala
      building.specializedRoles.forEach(rName => {
        specializedCounts[rName] = specialRoomsCount;
      });
    }
  }

  // 4. Fiscal de Banheiro: definido no Menu 1 ou pelas faixas oficiais (01-15: 2; 16-30: 4; ...)
  let totalBanheiro = 0;
  if (customRoleTargets["Fiscal de Banheiro"] !== undefined) {
    totalBanheiro = Math.max(0, Number(customRoleTargets["Fiscal de Banheiro"]));
  } else if (metricsConfig.useOfficialTiersForCorredorAndBanheiro !== false) {
    totalBanheiro = calculateOfficialTier(totalRoomsCount);
  } else {
    totalBanheiro = totalRoomsCount > 0 ? Math.max(1, metricsConfig.fiscaisBanheiroPerBuilding || 2) : 0;
  }

  // 5. Fiscal Volante / Corredor: definido no Menu 1 ou pelas faixas oficiais
  let totalVolantes = 0;
  if (customRoleTargets["Fiscal Volante"] !== undefined) {
    totalVolantes = Math.max(0, Number(customRoleTargets["Fiscal Volante"]));
  } else if (customRoleTargets["Fiscal Volante / Corredor"] !== undefined) {
    totalVolantes = Math.max(0, Number(customRoleTargets["Fiscal Volante / Corredor"]));
  } else if (metricsConfig.useOfficialTiersForCorredorAndBanheiro !== false) {
    totalVolantes = calculateOfficialTier(totalRoomsCount);
  } else {
    const ratio = Math.max(1, metricsConfig.fiscaisCorredorPerRoomsRatio || 4);
    totalVolantes = totalRoomsCount > 0 ? Math.max(1, Math.ceil(totalRoomsCount / ratio)) : 0;
  }

  // 6. Porteiros: definido no Menu 1 ou métrica do Super Admin
  let totalPorteiros = 0;
  if (customRoleTargets["Porteiro"] !== undefined) {
    totalPorteiros = Math.max(0, Number(customRoleTargets["Porteiro"]));
  } else {
    totalPorteiros = totalRoomsCount > 0 ? (metricsConfig.porteirosPerBuilding ?? 2) : 0;
  }

  // 7. Auxiliares de Limpeza: definido no Menu 1 ou métrica do Super Admin
  let totalLimpeza = 0;
  if (customRoleTargets["Auxiliar de Limpeza"] !== undefined) {
    totalLimpeza = Math.max(0, Number(customRoleTargets["Auxiliar de Limpeza"]));
  } else {
    totalLimpeza = totalRoomsCount > 0 ? (metricsConfig.auxiliaresLimpezaPerBuilding ?? 2) : 0;
  }

  // 8. Representante do Local: definido no Menu 1 ou métrica do Super Admin
  let totalRepresentante = 0;
  if (customRoleTargets["Representante do Local"] !== undefined) {
    totalRepresentante = Math.max(0, Number(customRoleTargets["Representante do Local"]));
  } else if (customRoleTargets["Representante da Local"] !== undefined) {
    totalRepresentante = Math.max(0, Number(customRoleTargets["Representante da Local"]));
  } else {
    totalRepresentante = totalRoomsCount > 0 ? (metricsConfig.representanteLocalPerBuilding ?? 1) : 0;
  }

  // 9. Técnico de Informática: SÓ EXISTE QUANDO HOUVER INDICADO NO MENU 1 QUE TERÁ VIDEO PROVA OU SE O CLA DEFINIU
  const hasVideoProva = Boolean(
    hasSpecialized && (
      (building.specializedRoles && building.specializedRoles.includes("Video Prova")) ||
      (specializedCounts["Video Prova"] && specializedCounts["Video Prova"] > 0) ||
      Boolean((building as any).hasVideoProva) ||
      Boolean(building.specialDetails && /video\s*prova/i.test(building.specialDetails)) ||
      Boolean(building.specialRooms && building.specialRooms.some(r => 
        (r.specializedRoles && r.specializedRoles.includes("Video Prova")) ||
        /video\s*prova/i.test(r.details || "")
      ))
    )
  );

  let totalInformatica = 0;
  if (customRoleTargets["Técnico de Informática"] !== undefined) {
    totalInformatica = Math.max(0, Number(customRoleTargets["Técnico de Informática"]));
  } else if (customRoleTargets["Tecnico Informática"] !== undefined) {
    totalInformatica = Math.max(0, Number(customRoleTargets["Tecnico Informática"]));
  } else if (hasVideoProva && totalRoomsCount > 0) {
    totalInformatica = Math.max(1, (specialRoomsCount * (metricsConfig.tecnicosInformaticaPerTechRoom || 1)) + (metricsConfig.tecnicosInformaticaPerBuilding || 0));
  }

  // Construção do Mapa Consolidado de Metas - Apenas CHAVES CANÔNICAS ÚNICAS
  // (JAMAIS duplicar funções com aliases, para não inflar a contagem de vagas oficiais)
  const result: Record<string, number> = {
    "Chefe de Sala": totalChefes,
    "Aplicador": totalAplicadores,
    "Fiscal Volante / Corredor": totalVolantes,
    "Fiscal de Banheiro": totalBanheiro,
    "Porteiro": totalPorteiros,
    "Auxiliar de Limpeza": totalLimpeza,
    "Representante do Local": totalRepresentante,
  };

  if (totalInformatica > 0) {
    result["Técnico de Informática"] = totalInformatica;
  }

  // Se o prédio tem Atendimento Especializado, adiciona as funções especificadas com nomes canônicos
  if (hasSpecialized) {
    Object.entries(specializedCounts).forEach(([roleName, count]) => {
      const canonical = canonicalizeRoleName(roleName);
      if (canonical && count > 0) {
        result[canonical] = (result[canonical] || 0) + count;
      }
    });
  }

  // Adiciona quaisquer outras funções customizadas definidas pelo CLA em customRoleTargets
  // REGRA CRÍTICA: Ignorar funções de Reserva ou Chefe/Aplicador (que já são calculadas pelas salas)
  Object.entries(customRoleTargets).forEach(([k, v]) => {
    const trimmed = k.trim();
    if (/reserva/i.test(trimmed)) return;
    if (isAplicadorRole(trimmed) || isChefeDeSalaRole(trimmed)) return;
    const canonical = canonicalizeRoleName(trimmed);
    if (!result[canonical]) {
      result[canonical] = Math.max(0, Number(v) || 0);
    }
  });

  return result;
}

/**
 * Busca a quantidade meta para uma dada função, aceitando aliases ou nomes canônicos.
 */
export function getTargetQuantityForRole(roleName: string, targetQuantities: Record<string, number>): number {
  if (!roleName) return 0;
  if (targetQuantities[roleName] !== undefined) return targetQuantities[roleName];
  const canonical = canonicalizeRoleName(roleName);
  if (targetQuantities[canonical] !== undefined) return targetQuantities[canonical];
  return 0;
}

