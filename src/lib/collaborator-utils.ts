import { CollaboratorInfo, BuildingInfo, MultiRegistrationInfo, MultiRegistrationLocation } from "../types";

/**
 * Verifica se um colaborador (CPF) está cadastrado em mais de um local de aplicação
 */
export function checkMultipleRegistrations(
  cpf: string | undefined,
  allCollaborators: CollaboratorInfo[] = [],
  allBuildings: BuildingInfo[] = []
): MultiRegistrationInfo {
  if (!cpf) {
    return { isMultiRegistered: false, count: 0, locations: [] };
  }

  const cleanCpf = cpf.replace(/\D/g, "");
  if (cleanCpf.length < 9) {
    return { isMultiRegistered: false, count: 0, locations: [] };
  }

  // Encontra todos os colaboradores com este mesmo CPF
  const matches = allCollaborators.filter(c => {
    const cCpf = (c.cpf || "").replace(/\D/g, "");
    return cCpf === cleanCpf;
  });

  if (matches.length <= 1) {
    return { isMultiRegistered: false, count: matches.length, locations: [] };
  }

  // Agrupa os locais distintos (por claId ou claName)
  const locMap = new Map<string, MultiRegistrationLocation>();
  for (const m of matches) {
    const key = m.claId || m.claName || m.originalClaName || "local-desconhecido";
    if (!locMap.has(key)) {
      const bld = allBuildings.find(b => b.claId === m.claId || b.name === m.claName || b.name === m.originalClaName);
      locMap.set(key, {
        claId: m.claId || "",
        claName: m.claName || bld?.name || m.originalClaName || "Local de Aplicação",
        buildingName: bld?.name,
        status: m.status,
        assignedRole: m.assignedRole || (m.isReserve ? "Reserva" : undefined),
        assignedRoom: m.assignedRoom,
        isReserve: m.isReserve
      });
    }
  }

  const locations = Array.from(locMap.values());
  return {
    isMultiRegistered: locations.length > 1,
    count: locations.length,
    locations
  };
}

/**
 * Normaliza e consolida nomes de funções para o padrão único oficial do ENEM (INEP),
 * eliminando duplicidades, grafias variantes, acentuações ausentes ou termos redundantes.
 */
export function canonicalizeRoleName(role?: string | null): string {
  if (!role) return "";
  const trimmed = role.trim();
  const lower = trimmed.toLowerCase();

  // Fiscais Volantes / Corredor
  if (
    lower === "fiscal volante" ||
    lower === "volante" ||
    lower === "fiscal volante / corredor" ||
    lower === "fiscal volante (corredores)" ||
    lower === "fiscal corredor" ||
    lower === "corredor"
  ) {
    return "Fiscal Volante / Corredor";
  }

  // Libras
  if (
    lower === "interprete de libras" ||
    lower === "intérprete de libras" ||
    lower === "tradutor e intérprete de libras" ||
    lower === "tradutor-intérprete de libras" ||
    lower === "tradutor / intérprete de libras" ||
    lower === "libras"
  ) {
    return "Tradutor-Intérprete de Libras";
  }

  // Surdocegos
  if (
    lower === "guia-interprete" ||
    lower === "guia-intérprete" ||
    lower === "guia-intérprete de surdocegos" ||
    lower === "guia intérprete de surdocegos" ||
    lower === "guia interprete de surdocegos" ||
    lower === "surdocegos"
  ) {
    return "Guia-Intérprete de Surdocegos";
  }

  // Ledor
  if (
    lower === "apenas ledor" ||
    lower === "ledor" ||
    lower === "ledor (aplicador especializado)" ||
    lower === "leitor"
  ) {
    return "Ledor (Aplicador Especializado)";
  }

  // Transcritor
  if (
    lower === "transcritor" ||
    lower === "transcritor (aplicador especializado)"
  ) {
    return "Transcritor (Aplicador Especializado)";
  }

  // Ledor/Transcritor Inglês
  if (
    lower === "ledor/transcritor inglês" ||
    lower === "ledor/transcritor ingles" ||
    lower === "ledor / transcritor inglês" ||
    lower === "ledor / transcritor ingles" ||
    lower === "ledor ou transcritor inglês" ||
    lower === "ledor ou transcritor ingles" ||
    lower === "leitor transcritor inglês" ||
    lower === "leitor transcritor ingles" ||
    lower === "ledor inglês" ||
    lower === "ledor ingles"
  ) {
    return "Ledor/Transcritor Inglês";
  }

  // Ledor/Transcritor Espanhol
  if (
    lower === "ledor/transcritor espanhol" ||
    lower === "ledor / transcritor espanhol" ||
    lower === "ledor ou transcritor espanhol" ||
    lower === "leitor transcritor espanhol" ||
    lower === "ledor espanhol"
  ) {
    return "Ledor/Transcritor Espanhol";
  }

  // Ledor/Transcritor
  if (
    lower === "ledor/transcritor" ||
    lower === "ledor / transcritor" ||
    lower === "ledor ou transcritor" ||
    lower === "fiscal especializado (ledor/transcritor)"
  ) {
    return "Ledor/Transcritor";
  }

  // Técnico de Informática
  if (
    lower === "tecnico informática" ||
    lower === "técnico informática" ||
    lower === "técnico de informática" ||
    lower === "tecnico de informatica" ||
    lower === "tecnico em informática" ||
    lower === "técnico em informática" ||
    lower === "ti"
  ) {
    return "Técnico de Informática";
  }

  // Representante do Local
  if (
    lower === "representante da local" ||
    lower === "representante do local" ||
    lower === "representante local"
  ) {
    return "Representante do Local";
  }

  // Aplicador
  if (
    lower === "aplicador" ||
    lower === "aplicador (fiscal de sala)" ||
    lower === "fiscal de sala" ||
    lower.includes("aplicador") ||
    lower.includes("fiscal de sala") ||
    lower === "fiscal de aplicação" ||
    lower === "fiscal aplicador" ||
    lower === "fiscal de prova" ||
    lower === "fiscal comum" ||
    lower === "fiscal"
  ) {
    if (!lower.includes("ledor") && !lower.includes("transcritor") && !lower.includes("chefe") && !lower.includes("banheiro") && !lower.includes("volante")) {
      return "Aplicador";
    }
  }

  // Fiscal de Banheiro
  if (
    lower === "fiscal de banheiro" ||
    lower === "fiscal de banheiro (sanitários)" ||
    lower === "banheiro"
  ) {
    return "Fiscal de Banheiro";
  }

  // Auxiliar de Limpeza
  if (lower === "auxiliar de limpeza" || lower === "limpeza") {
    return "Auxiliar de Limpeza";
  }

  // Chefe de Sala
  if (lower === "chefe de sala" || lower === "chefe") {
    return "Chefe de Sala";
  }

  // Porteiro
  if (
    lower === "porteiro" ||
    lower === "porteiro / controle de portões" ||
    lower === "portaria"
  ) {
    return "Porteiro";
  }

  return trimmed;
}

/**
 * Extrai o ano de nascimento de 4 dígitos a partir de birthYear ou birthDate.
 */
export function extractBirthYear(birthDate?: string | null, birthYear?: number | string | null): string {
  if (birthYear !== undefined && birthYear !== null && String(birthYear).trim() !== "") {
    const cleanY = String(birthYear).replace(/\D/g, "");
    if (cleanY.length === 4) return cleanY;
    if (cleanY.length > 4) return cleanY.slice(0, 4);
  }

  if (birthDate && typeof birthDate === "string") {
    const trimmed = birthDate.trim();
    // Padrão DD/MM/AAAA
    const ptMatch = trimmed.match(/\b\d{1,2}\/\d{1,2}\/(\d{4})\b/);
    if (ptMatch && ptMatch[1]) return ptMatch[1];

    // Padrão AAAA-MM-DD
    const isoMatch = trimmed.match(/\b(\d{4})-\d{1,2}-\d{1,2}\b/);
    if (isoMatch && isoMatch[1]) return isoMatch[1];

    // Qualquer número de 4 dígitos entre 1920 e o ano corrente
    const yearMatch = trimmed.match(/\b(19\d{2}|20[0-2]\d)\b/);
    if (yearMatch && yearMatch[1]) return yearMatch[1];
  }

  return "";
}

/**
 * Retorna o ano de nascimento formatado com cálculo de idade estimada.
 * Exemplo: "1995 (31 anos)"
 */
export function formatBirthYearAndAge(birthDate?: string | null, birthYear?: number | string | null): string {
  const yearStr = extractBirthYear(birthDate, birthYear);
  if (!yearStr) return "";
  const y = parseInt(yearStr, 10);
  if (isNaN(y) || y < 1920 || y > 2026) return yearStr;
  const currentYear = new Date().getFullYear() || 2026;
  const age = currentYear - y;
  return age > 0 ? `${yearStr} (~${age} anos)` : yearStr;
}

/**
 * Normaliza o sexo para os padrões oficiais reconhecidos ("Feminino", "Masculino", "Outro", "Não informado").
 */
export function canonicalizeGender(gender?: string | null): "Feminino" | "Masculino" | "Outro" | "Não informado" | "" {
  if (!gender) return "";
  const lower = gender.trim().toLowerCase();
  if (lower === "f" || lower.startsWith("fem") || lower === "mulher") return "Feminino";
  if (lower === "m" || lower.startsWith("masc") || lower === "homem") return "Masculino";
  if (lower === "outro" || lower === "outros" || lower.includes("binario") || lower.includes("binário")) return "Outro";
  if (lower.includes("não informado") || lower.includes("nao informado") || lower.includes("prefiro")) return "Não informado";
  return gender.trim() as any;
}

/**
 * Verifica se a função de Técnico de Informática deve aparecer para alocação no Menu 3.
 * Regra estrita: só deve aparecer para o CLA que marcou Video Prova no Menu 1.
 * Jamais deve aparecer sem essa opção estar marcada.
 */
export function isTecnicoInformaticaInformed(building?: any | null): boolean {
  if (!building) return false;

  // Só deve aparecer se o CLA marcou a opção de "Video Prova" no Menu 1
  return Boolean(
    building.hasVideoProva === true ||
    (building.hasSpecializedAttendance && (
      building.specializedRoles?.includes("Video Prova") ||
      building.specializedRoles?.some((r: string) => /video\s*prova/i.test(r))
    ))
  );
}

/**
 * Helper para testar se uma função é de atendimento especializado (Ledor, Transcritor, Libras, Surdocegos, etc.)
 */
export function isSpecializedRole(role?: string | null): boolean {
  if (!role) return false;
  const lower = role.toLowerCase().trim();
  if (
    lower === "nenhuma" || 
    lower === "nenhum" || 
    lower === "não" || 
    lower === "nao" || 
    lower === "sem função" || 
    lower === "regular" ||
    lower === "aplicador" ||
    lower === "fiscal de sala" ||
    lower === "chefe de sala" ||
    lower === "chefe"
  ) {
    return false;
  }
  if (lower.includes("libras")) return true;
  if (lower.includes("surdocego") || lower.includes("surdo-cego") || lower.includes("tadoma")) return true;
  if (lower.includes("ledor") || lower.includes("transcritor") || lower.includes("leitor")) return true;
  if (lower.includes("videoprova") || lower.includes("video prova") || lower.includes("vídeo prova")) return true;
  return false;
}

/**
 * Helper para testar se uma função é Chefe de Sala
 */
export function isChefeDeSalaRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r.includes("chefe de sala") || r === "chefe";
}

/**
 * Helper para testar se uma função é Aplicador / Fiscal de Sala (excluindo Chefe de Sala e Funções Especializadas)
 */
export function isAplicadorRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  if (r.includes("chefe de sala") || r === "chefe") return false;
  if (isSpecializedRole(r)) return false;
  return (
    r.includes("aplicador") || 
    r.includes("fiscal de sala") || 
    r === "fiscal" ||
    r === "fiscal de aplicação" ||
    r === "fiscal aplicador" ||
    r === "fiscal de prova" ||
    r === "fiscal comum"
  );
}

/**
 * Retorna a função REAL/EFETIVA de um colaborador considerando estritamente a ALOCAÇÃO (Menu 3).
 * REGRA CRÍTICA DO SISTEMA:
 * O que vale é a ALOCAÇÃO: Se um colaborador foi aceito com uma função inicial (ex: Aplicador),
 * mas o CLA no Menu 3 o alocou em uma nova função ou setor (ex: Representante do Local, Banheiro, Volante, Porteiro, Limpeza, TI),
 * o sistema DEVE ignorar a função inicial de cadastro e associar ele à nova função ALOCADA.
 * 
 * E vice-versa: se o colaborador foi aceito com outra função (ex: Fiscal Volante, Fiscal, Colaborador)
 * mas o CLA o alocou em uma sala de prova regular (Menu 3), sua função efetiva de alocação no prédio é APLICADOR
 * (a não ser que tenha sido alocado explicitamente como Chefe de Sala ou função Especializada).
 * 
 * Se o colaborador NÃO está alocado (isReserve === true ou sem assignedRoom),
 * ele NÃO possui função alocada válida para preenchimento de vagas e JAMAIS deve ser contado
 * em cálculos de alocação ou pendências.
 */
export function getEffectiveAllocatedRole(collab?: {
  isReserve?: boolean;
  assignedRoom?: string;
  assignedRole?: string;
  specialRole?: string;
} | null): string {
  if (!collab) return "";
  if (collab.isReserve === true || String(collab.isReserve) === "true" || !collab.assignedRoom || collab.assignedRoom.trim() === "") {
    return "";
  }

  const room = collab.assignedRoom.trim();
  const roomLower = room.toLowerCase();

  // 1. Setores Operacionais / Postos de Apoio (A Alocação no setor define a função prioritariamente)
  if (roomLower === "representante" || roomLower === "representante do local" || roomLower.includes("representante")) {
    return "Representante do Local";
  }
  if (roomLower === "banheiro" || roomLower === "fiscal de banheiro" || roomLower.includes("banheiro") || roomLower.includes("sanitário") || roomLower.includes("sanitario")) {
    return "Fiscal de Banheiro";
  }
  if (roomLower === "volante" || roomLower === "volantes" || roomLower === "fiscal volante" || roomLower.includes("volante") || roomLower.includes("corredor")) {
    return "Fiscal Volante / Corredor";
  }
  if (roomLower === "limpeza" || roomLower === "auxiliar de limpeza" || roomLower.includes("limpeza")) {
    return "Auxiliar de Limpeza";
  }
  if (roomLower === "porteiro" || roomLower === "portaria" || roomLower.includes("porteiro") || roomLower.includes("portão") || roomLower.includes("portao")) {
    return "Porteiro";
  }
  if (
    roomLower === "ti" || 
    roomLower === "tecnico de informatica" || 
    roomLower === "técnico de informática" || 
    roomLower === "informática" || 
    roomLower === "informatica" ||
    ((roomLower.includes("informática") || roomLower.includes("informatica")) && !roomLower.includes("sala") && !roomLower.includes("lab"))
  ) {
    return "Técnico de Informática";
  }

  // 2. Salas de Prova ou ambientes de aplicação (Salas 01, 02, etc.)
  // Se estiver explicitamente alocado como Chefe de Sala
  if (isChefeDeSalaRole(collab.assignedRole)) {
    return "Chefe de Sala";
  }

  // Se tiver função especializada (Ledor, Transcritor, Libras, etc.) - IGNORA marcadores como "Nenhuma"
  const spec = collab.specialRole?.trim();
  if (spec && spec !== "" && isSpecializedRole(spec)) {
    return canonicalizeRoleName(spec);
  }
  if (isSpecializedRole(collab.assignedRole)) {
    return canonicalizeRoleName(collab.assignedRole);
  }

  // Se alocado em sala de prova regular e não for chefe ou especializado:
  // SUA FUNÇÃO EFETIVA DE ALOCAÇÃO É APLICADOR!
  return "Aplicador";
}


