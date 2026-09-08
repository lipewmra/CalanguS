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

  // Ledor/Transcritor
  if (
    lower === "ledor/transcritor" ||
    lower === "ledor / transcritor" ||
    lower === "ledor ou transcritor" ||
    lower === "fiscal especializado (ledor/transcritor)"
  ) {
    return "Ledor (Aplicador Especializado)";
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
    lower === "fiscal de sala"
  ) {
    return "Aplicador";
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

