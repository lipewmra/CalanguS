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
