import { CollaboratorInfo, CollaboratorLogEntry, CollaboratorLogActionType } from "../types";
import { getLocalCache, setLocalCache } from "./db-services";

/**
 * Cria uma nova entrada de log padronizada para o colaborador
 */
export function createCollaboratorLogEntry(
  collaboratorId: string,
  action: CollaboratorLogActionType,
  title: string,
  description: string,
  options?: {
    collaboratorName?: string;
    collaboratorCpf?: string;
    claId?: string;
    claName?: string;
    details?: Record<string, any>;
    performedBy?: string;
    performedByRole?: string;
    timestamp?: string;
  }
): CollaboratorLogEntry {
  const entryId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: entryId,
    collaboratorId,
    collaboratorName: options?.collaboratorName || "",
    collaboratorCpf: options?.collaboratorCpf || "",
    claId: options?.claId || "",
    claName: options?.claName || "",
    action,
    title,
    description,
    details: options?.details,
    performedBy: options?.performedBy || "Sistema",
    performedByRole: options?.performedByRole || "Sistema",
    timestamp: options?.timestamp || new Date().toISOString()
  };
}

/**
 * Registra um log de atividade e anexa ao histórico do colaborador (e ao cache geral de logs)
 */
export function appendCollaboratorLog(
  collab: CollaboratorInfo,
  action: CollaboratorLogActionType,
  title: string,
  description: string,
  options?: {
    details?: Record<string, any>;
    performedBy?: string;
    performedByRole?: string;
    timestamp?: string;
  }
): CollaboratorLogEntry[] {
  const newEntry = createCollaboratorLogEntry(
    collab.id || "",
    action,
    title,
    description,
    {
      collaboratorName: collab.name,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      details: options?.details,
      performedBy: options?.performedBy || "CLA / Sistema",
      performedByRole: options?.performedByRole || "CLA",
      timestamp: options?.timestamp
    }
  );

  const existingLogs = Array.isArray(collab.activityLogs) ? collab.activityLogs : [];
  const updatedLogs = [newEntry, ...existingLogs];

  // Also sync global logs cache for fast CLA cross-collaborator search
  try {
    const globalLogs = getLocalCache<CollaboratorLogEntry[]>("all_collaborator_activity_logs", []);
    const deduplicated = [newEntry, ...globalLogs.filter(l => l.id !== newEntry.id)].slice(0, 1000);
    setLocalCache("all_collaborator_activity_logs", deduplicated);
  } catch (e) {
    console.warn("Could not save to global activity logs cache:", e);
  }

  return updatedLogs;
}

/**
 * Sintetiza o histórico completo do colaborador combinando logs explícitos
 * e marcos históricos derivados de dados estruturados (cadastros, alocações, confirmações, transferências, materiais).
 * Isso garante que colaboradores antigos ou recém-migrados tenham um histórico 100% completo e rico.
 */
export function getCollaboratorSynthesizedLogs(collab: CollaboratorInfo): CollaboratorLogEntry[] {
  if (!collab) return [];

  const explicitLogs = Array.isArray(collab.activityLogs) ? [...collab.activityLogs] : [];
  const generatedLogs: CollaboratorLogEntry[] = [];
  const existingActionTitles = new Set(explicitLogs.map(l => `${l.action}_${l.title}`));

  const baseCreatedAt = collab.createdAt || new Date(Date.now() - 86400000 * 7).toISOString();
  const collabName = collab.name || "Colaborador";
  const collabId = collab.id || "temp";

  // 1. Marco de Inscrição / Cadastro Inicial
  if (!existingActionTitles.has("cadastro_Cadastro Inicial")) {
    generatedLogs.push({
      id: `gen_reg_${collabId}`,
      collaboratorId: collabId,
      collaboratorName: collabName,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      action: "cadastro",
      title: "Inscrição / Cadastro no Sistema",
      description: `Colaborador cadastrado no sistema para o local ${collab.claName || (collab as any).assignedBuilding || "Coordenação Local"}.`,
      details: {
        cpf: collab.cpf,
        email: collab.email,
        phone: collab.whatsapp || (collab as any).phone,
        pix: collab.pixKey || (collab as any).pix,
        bank: (collab as any).bankName,
        experienceEnem: collab.hasWorkedEnem
      },
      performedBy: (collab as any).registeredBy || "Inscrição Direta / Importação",
      performedByRole: "Sistema",
      timestamp: baseCreatedAt
    });
  }

  // 2. Marco de Alocação de Função
  if (collab.assignedRole && !existingActionTitles.has("alocacao_funcao_Atribuição de Função")) {
    generatedLogs.push({
      id: `gen_role_${collabId}`,
      collaboratorId: collabId,
      collaboratorName: collabName,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      action: "alocacao_funcao",
      title: "Atribuição de Função Oficial",
      description: `Designado para a função de "${collab.assignedRole}"${collab.assignedRoom ? ` na sala ${collab.assignedRoom}` : ""}.`,
      details: {
        funcao: collab.assignedRole,
        sala: collab.assignedRoom,
        turno: (collab as any).assignedShift
      },
      performedBy: "Coordenação CLA",
      performedByRole: "CLA",
      timestamp: (collab as any).allocatedAt || new Date(new Date(baseCreatedAt).getTime() + 3600000).toISOString()
    });
  }

  // 3. Marco de Alocação de Sala
  if (collab.assignedRoom && !existingActionTitles.has("alocacao_sala_Alocação em Sala")) {
    generatedLogs.push({
      id: `gen_room_${collabId}`,
      collaboratorId: collabId,
      collaboratorName: collabName,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      action: "alocacao_sala",
      title: "Alocação em Sala de Prova",
      description: `Alocado na Sala "${collab.assignedRoom}" do prédio ${collab.claName || ""}.`,
      details: {
        sala: collab.assignedRoom,
        funcao: collab.assignedRole
      },
      performedBy: "Coordenação CLA",
      performedByRole: "CLA",
      timestamp: (collab as any).allocatedAt || new Date(new Date(baseCreatedAt).getTime() + 7200000).toISOString()
    });
  }

  // 4. Marco de Reserva Técnica
  if (collab.isReserve && !existingActionTitles.has("designacao_reserva_Reserva Técnica")) {
    generatedLogs.push({
      id: `gen_res_${collabId}`,
      collaboratorId: collabId,
      collaboratorName: collabName,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      action: "designacao_reserva",
      title: "Designado como Reserva Técnica",
      description: "Disponibilizado no contingente de Reserva Técnica para contingências e substituições imediatas.",
      details: {
        isReserve: true
      },
      performedBy: "Coordenação CLA",
      performedByRole: "CLA",
      timestamp: new Date(new Date(baseCreatedAt).getTime() + 5400000).toISOString()
    });
  }

  // 5. Marco de Confirmação de Presença
  if ((collab.attendanceStatus === "Confirmado" || collab.status === "Confirmado" || collab.attendanceConfirmedAt) && !existingActionTitles.has("confirmacao_presenca_Confirmação de Presença")) {
    generatedLogs.push({
      id: `gen_conf_${collabId}`,
      collaboratorId: collabId,
      collaboratorName: collabName,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      action: "confirmacao_presenca",
      title: "Confirmação de Presença",
      description: `Presença confirmada pelo colaborador ou registrada pela coordenação.`,
      details: {
        status: collab.attendanceStatus || collab.status,
        origem: (collab as any).attendanceConfirmedBy || "Portal do Colaborador"
      },
      performedBy: (collab as any).attendanceConfirmedBy || collabName,
      performedByRole: "Colaborador",
      timestamp: collab.attendanceConfirmedAt || new Date().toISOString()
    });
  }

  // 6. Marco de Recusa de Função
  if (collab.refusedRole && !existingActionTitles.has("recusa_funcao_Recusa de Função")) {
    generatedLogs.push({
      id: `gen_ref_${collabId}`,
      collaboratorId: collabId,
      collaboratorName: collabName,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      action: "recusa_funcao",
      title: "Recusa de Função Registrada",
      description: `Colaborador manifestou recusa para a função de "${collab.refusedRole}". Retornado para a lista de reserva/dispensa.`,
      details: {
        refusedRole: collab.refusedRole,
        refusalTag: collab.refusalTag,
        refusedAt: collab.refusedRoleDate || (collab as any).refusedAt
      },
      performedBy: collabName,
      performedByRole: "Colaborador",
      timestamp: collab.refusedRoleDate || (collab as any).refusedAt || new Date().toISOString()
    });
  }

  // 7. Marco de Substituição
  if (collab.substitutedFor || collab.substitutedBy) {
    if (collab.substitutedFor && !existingActionTitles.has("substituicao_Substituição Realizada")) {
      generatedLogs.push({
        id: `gen_sub_for_${collabId}`,
        collaboratorId: collabId,
        collaboratorName: collabName,
        collaboratorCpf: collab.cpf,
        claId: collab.claId,
        claName: collab.claName,
        action: "substituicao",
        title: "Substituição Realizada",
        description: `Assumiu a vaga de "${collab.substitutedFor}" na sala ${collab.assignedRoom || "-"}.`,
        details: {
          substituiu: collab.substitutedFor,
          data: collab.substitutedAt
        },
        performedBy: "Coordenação CLA",
        performedByRole: "CLA",
        timestamp: collab.substitutedAt || new Date().toISOString()
      });
    }
    if (collab.substitutedBy && !existingActionTitles.has("substituicao_Substituído por Reserva")) {
      generatedLogs.push({
        id: `gen_sub_by_${collabId}`,
        collaboratorId: collabId,
        collaboratorName: collabName,
        collaboratorCpf: collab.cpf,
        claId: collab.claId,
        claName: collab.claName,
        action: "substituicao",
        title: "Substituído por Reserva",
        description: `Substituído pelo fiscal reserva "${collab.substitutedBy}".`,
        details: {
          substituidoPor: collab.substitutedBy,
          data: collab.substitutedAt
        },
        performedBy: "Coordenação CLA",
        performedByRole: "CLA",
        timestamp: collab.substitutedAt || new Date().toISOString()
      });
    }
  }

  // 8. Histórico de Transferências
  if (collab.transferHistory && collab.transferHistory.length > 0) {
    collab.transferHistory.forEach((th, idx) => {
      generatedLogs.push({
        id: `gen_trans_${collabId}_${idx}`,
        collaboratorId: collabId,
        collaboratorName: collabName,
        collaboratorCpf: collab.cpf,
        claId: collab.claId,
        claName: collab.claName,
        action: "transferencia",
        title: "Transferência Entre Coordenações (CLAs)",
        description: `Transferido de "${th.fromClaName || th.fromClaId}" para "${th.toClaName || th.toClaId}".`,
        details: th,
        performedBy: th.approvedBy || "Coordenação Mantenedora",
        performedByRole: "CLA",
        timestamp: th.date || new Date().toISOString()
      });
    });
  }

  // 9. Acessos a Material Didático
  if (collab.materialsAccessed && collab.materialsAccessed.length > 0) {
    collab.materialsAccessed.forEach((mat, idx) => {
      generatedLogs.push({
        id: `gen_mat_${collabId}_${idx}`,
        collaboratorId: collabId,
        collaboratorName: collabName,
        collaboratorCpf: collab.cpf,
        claId: collab.claId,
        claName: collab.claName,
        action: "acesso_material",
        title: "Acesso a Material Didático",
        description: `Acessou e visualizou o guia oficial: "${mat.materialTitle}".`,
        details: mat,
        performedBy: collabName,
        performedByRole: "Colaborador",
        timestamp: mat.accessedAt || new Date().toISOString()
      });
    });
  }

  // 10. Foto do crachá
  if (collab.photoUrl && !existingActionTitles.has("foto_atualizada_Foto do Crachá Atualizada")) {
    generatedLogs.push({
      id: `gen_photo_${collabId}`,
      collaboratorId: collabId,
      collaboratorName: collabName,
      collaboratorCpf: collab.cpf,
      claId: collab.claId,
      claName: collab.claName,
      action: "foto_atualizada",
      title: "Foto do Crachá Atualizada",
      description: "Foto oficial de identificação biométrica/crachá enviada com sucesso.",
      performedBy: collabName,
      performedByRole: "Colaborador",
      timestamp: baseCreatedAt
    });
  }

  // Combina todos e ordena do mais recente para o mais antigo
  const combined = [...explicitLogs, ...generatedLogs];
  
  // Deduplica por ID caso haja repetições
  const seenIds = new Set<string>();
  const deduplicated = combined.filter(entry => {
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  });

  return deduplicated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Retorna configurações de estilo e ícones para cada tipo de ação
 */
export function getLogActionStyle(action: CollaboratorLogActionType): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotBg: string;
  label: string;
} {
  switch (action) {
    case "cadastro":
      return {
        badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        badgeText: "text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-500/30",
        dotBg: "bg-emerald-500",
        label: "Cadastro & Inscrição"
      };
    case "alocacao_funcao":
    case "alocacao_sala":
      return {
        badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
        badgeText: "text-indigo-700 dark:text-indigo-300",
        badgeBorder: "border-indigo-500/30",
        dotBg: "bg-indigo-500",
        label: "Alocação Oficial"
      };
    case "desalocacao_funcao":
    case "desalocacao_sala":
      return {
        badgeBg: "bg-rose-500/10 dark:bg-rose-500/20",
        badgeText: "text-rose-700 dark:text-rose-300",
        badgeBorder: "border-rose-500/30",
        dotBg: "bg-rose-500",
        label: "Desalocação"
      };
    case "confirmacao_presenca":
      return {
        badgeBg: "bg-teal-500/10 dark:bg-teal-500/20",
        badgeText: "text-teal-700 dark:text-teal-300",
        badgeBorder: "border-teal-500/30",
        dotBg: "bg-teal-500",
        label: "Presença Confirmada"
      };
    case "designacao_reserva":
      return {
        badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
        badgeText: "text-amber-700 dark:text-amber-300",
        badgeBorder: "border-amber-500/30",
        dotBg: "bg-amber-500",
        label: "Reserva Técnica"
      };
    case "recusa_funcao":
      return {
        badgeBg: "bg-red-500/10 dark:bg-red-500/20",
        badgeText: "text-red-700 dark:text-red-300",
        badgeBorder: "border-red-500/30",
        dotBg: "bg-red-500",
        label: "Recusa de Função"
      };
    case "substituicao":
      return {
        badgeBg: "bg-orange-500/10 dark:bg-orange-500/20",
        badgeText: "text-orange-700 dark:text-orange-300",
        badgeBorder: "border-orange-500/30",
        dotBg: "bg-orange-500",
        label: "Substituição"
      };
    case "transferencia":
      return {
        badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
        badgeText: "text-purple-700 dark:text-purple-300",
        badgeBorder: "border-purple-500/30",
        dotBg: "bg-purple-500",
        label: "Transferência"
      };
    case "acesso_material":
      return {
        badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
        badgeText: "text-cyan-700 dark:text-cyan-300",
        badgeBorder: "border-cyan-500/30",
        dotBg: "bg-cyan-500",
        label: "Material Didático"
      };
    case "foto_atualizada":
      return {
        badgeBg: "bg-violet-500/10 dark:bg-violet-500/20",
        badgeText: "text-violet-700 dark:text-violet-300",
        badgeBorder: "border-violet-500/30",
        dotBg: "bg-violet-500",
        label: "Foto de Crachá"
      };
    case "observacao_auditoria":
      return {
        badgeBg: "bg-slate-700/10 dark:bg-slate-300/20",
        badgeText: "text-slate-800 dark:text-slate-200 font-bold",
        badgeBorder: "border-slate-400/40",
        dotBg: "bg-slate-600",
        label: "Ocorrência / Auditoria"
      };
    default:
      return {
        badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
        badgeText: "text-blue-700 dark:text-blue-300",
        badgeBorder: "border-blue-500/30",
        dotBg: "bg-blue-500",
        label: "Atualização"
      };
  }
}
