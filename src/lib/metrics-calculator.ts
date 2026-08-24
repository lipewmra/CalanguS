import { BuildingInfo, RoomDetails, CollaboratorMetricsConfig } from "../types";

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

  // Salas Extras / Contingência
  chefesPerExtraRoom: 1,
  aplicadoresPerExtraRoom: 1,

  // Apoio e Circulação por Prédio / Coordenação
  useOfficialTiersForCorredorAndBanheiro: true,
  fiscaisCorredorPerRoomsRatio: 4,     // fallback se desativado tier
  fiscaisBanheiroPerBuilding: 2,       // fallback se desativado tier
  porteirosPerBuilding: 2,             // 2 porteiros por local
  auxiliaresLimpezaPerBuilding: 2,     // 2 auxiliares de limpeza por local
  tecnicosInformaticaPerBuilding: 1,   // 1 técnico de TI por prédio (suporte geral)
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

  if (isExtra || room.type === "extra") {
    return {
      targetChefes: hasCustomChefes ? room.targetChefes! : metricsConfig.chefesPerExtraRoom,
      targetAplicadores: hasCustomAplicadores ? room.targetAplicadores! : (isDuplaAplicador ? 2 : metricsConfig.aplicadoresPerExtraRoom),
      targetLedores: hasCustomLedores ? room.targetLedores! : 0,
      targetTranscritores: 0,
      targetLibras: hasCustomLibras ? room.targetLibras! : 0,
      targetGuiaInterprete: 0,
      targetTecnicoInfo: 0,
      targetAcessibilidade: hasCustomAcess ? room.targetAcessibilidade! : 0,
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

  // 1. Chefe de Sala: 1 por sala (Regular, Especializada ou Extra)
  const regularChefes = regularRoomsCount * (metricsConfig.chefesPerRegularRoom || 1);
  const specialChefes = specialRoomsCount * (metricsConfig.chefesPerSpecialRoom || 1);
  const extraChefes = extraRoomsCount * (metricsConfig.chefesPerExtraRoom || 1);
  const totalChefes = regularChefes + specialChefes + extraChefes;

  // 2. Aplicador: 1 a 60 participantes (1 por sala); 61 a 100 (2 por sala)
  // Verifica capacidade das salas se disponíveis
  let calculatedRegularAplicadores = 0;
  if (building.rooms && building.rooms.length > 0) {
    building.rooms.forEach(r => {
      const cap = Number(r.capacity) || building.virtualCapacity || 30;
      calculatedRegularAplicadores += (cap > 60 ? 2 : (metricsConfig.aplicadoresPerRegularRoom || 1));
    });
  } else {
    calculatedRegularAplicadores = regularRoomsCount * (metricsConfig.aplicadoresPerRegularRoom || 1);
  }

  const specialAplicadores = specialRoomsCount * (metricsConfig.aplicadoresPerSpecialRoom || 0);
  const extraAplicadores = extraRoomsCount * (metricsConfig.aplicadoresPerExtraRoom || 1);
  const totalAplicadores = calculatedRegularAplicadores + specialAplicadores + extraAplicadores;

  // 3. Tradutor-Intérprete de Libras: 2 por sala especializada com demanda
  const librasPerSpecial = metricsConfig.tradutoresLibrasPerSpecialRoom ?? metricsConfig.interpreteLibrasPerSpecialRoom ?? 2;
  const totalLibras = specialRoomsCount * librasPerSpecial;

  // 4. Guia-Intérprete de Surdocegos: 3 por sala especializada com demanda
  const guiaPerSpecial = metricsConfig.guiaInterpretesPerSpecialRoom ?? 3;
  const totalGuia = specialRoomsCount > 0 ? specialRoomsCount * guiaPerSpecial : 0;

  // 5. Ledor (Aplicador Especializado): 2 por sala especializada com demanda
  const ledoresPerSpecial = metricsConfig.ledoresPerSpecialRoom ?? metricsConfig.ledorTranscritorPerSpecialRoom ?? 2;
  const totalLedores = specialRoomsCount * ledoresPerSpecial;

  // 6. Transcritor (Aplicador Especializado): 1 por participante/sala especializada com demanda
  const transcritoresPerSpecial = metricsConfig.transcritoresPerSpecialRoom ?? 1;
  const totalTranscritores = specialRoomsCount * transcritoresPerSpecial;

  // 7. Fiscal de Banheiro: 01-15 (2); 16-30 (4); 31-45 (6); 46-52 (8); 53-59 (10); 60-66 (12)
  let totalBanheiro = 0;
  if (metricsConfig.useOfficialTiersForCorredorAndBanheiro !== false) {
    totalBanheiro = calculateOfficialTier(totalRoomsCount);
  } else {
    totalBanheiro = totalRoomsCount > 0 ? Math.max(1, metricsConfig.fiscaisBanheiroPerBuilding || 2) : 0;
  }

  // 8. Fiscal Volante / Corredor: 01-15 (2); 16-30 (4); 31-45 (6); 46-52 (8); 53-59 (10); 60-66 (12)
  let totalVolantes = 0;
  if (metricsConfig.useOfficialTiersForCorredorAndBanheiro !== false) {
    totalVolantes = calculateOfficialTier(totalRoomsCount);
  } else {
    const ratio = Math.max(1, metricsConfig.fiscaisCorredorPerRoomsRatio || 4);
    totalVolantes = totalRoomsCount > 0 ? Math.max(1, Math.ceil(totalRoomsCount / ratio)) : 0;
  }

  // 9. Técnico de Informática: 1 por sala tecnológica (ou suporte geral do prédio)
  const totalInformatica = totalRoomsCount > 0 
    ? Math.max(1, (specialRoomsCount * (metricsConfig.tecnicosInformaticaPerTechRoom || 1)) + (metricsConfig.tecnicosInformaticaPerBuilding || 0))
    : 0;

  // 10. Porteiros
  const totalPorteiros = totalRoomsCount > 0 ? (metricsConfig.porteirosPerBuilding ?? 2) : 0;

  // 11. Auxiliares de Limpeza
  const totalLimpeza = totalRoomsCount > 0 ? (metricsConfig.auxiliaresLimpezaPerBuilding ?? 2) : 0;

  // 12. Representante do Local
  const totalRepresentante = totalRoomsCount > 0 ? (metricsConfig.representanteLocalPerBuilding ?? 1) : 0;

  return {
    "Chefe de Sala": totalChefes,
    "Aplicador": totalAplicadores,
    "Aplicador (Fiscal de Sala)": totalAplicadores,
    "Tradutor-Intérprete de Libras": totalLibras,
    "Interprete de Libras": totalLibras,
    "Guia-Intérprete de Surdocegos": totalGuia,
    "Guia-Intérprete": totalGuia,
    "Ledor (Aplicador Especializado)": totalLedores,
    "Ledor/Transcritor": totalLedores,
    "Apenas Ledor": totalLedores,
    "Transcritor (Aplicador Especializado)": totalTranscritores,
    "Transcritor": totalTranscritores,
    "Fiscal de Banheiro": totalBanheiro,
    "Fiscal Volante": totalVolantes,
    "Fiscal Volante / Corredor": totalVolantes,
    "Tecnico Informática": totalInformatica,
    "Técnico de Informática": totalInformatica,
    "Porteiro": totalPorteiros,
    "Auxiliar de Limpeza": totalLimpeza,
    "Representante do Local": totalRepresentante,
    "Representante da Local": totalRepresentante,
    "Auxiliar de Acessibilidade": specialRoomsCount * (metricsConfig.auxiliarAcessibilidadePerSpecialRoom || 0)
  };
}
