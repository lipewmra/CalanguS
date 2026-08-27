import React, { useState, useRef, useMemo } from "react";
import { CollaboratorInfo, PastEdition, BuildingInfo, UserProfile } from "../types";
import { downloadCsvTemplate } from "./CsvTemplate";
import { auditCollaborator } from "../lib/data-validator";
import CollaboratorFailureModal from "./CollaboratorFailureModal";
import TransferRequestsModal from "./TransferRequestsModal";
import NetworkReservesPool from "./NetworkReservesPool";
import FiscalAvatar from "./FiscalAvatar";
import ImageLightboxModal, { LightboxData } from "./ImageLightboxModal";
import PhotoUploader from "./PhotoUploader";
import DuplicateCollaboratorsModal, { findDuplicateCollaborators } from "./DuplicateCollaboratorsModal";
import { 
  Users, UserPlus, Upload, ShieldAlert, BadgeInfo, Trash, Mail, 
  MapPin, Check, X, FileText, Download, HelpCircle, AlertTriangle, Pencil,
  Building2, Globe, Clock, ArrowRightLeft, Sparkles, Search, Filter,
  Calendar, ArrowUpDown, FileSpreadsheet, RotateCcw, Send, MessageSquare, BookOpen
} from "lucide-react";

export function exportCollaboratorsToCSV(collabs: CollaboratorInfo[], title = "colaboradores_enem_calangus") {
  const headers = [
    "Nome Completo",
    "CPF",
    "Data de Nascimento",
    "E-mail",
    "WhatsApp",
    "Chave PIX",
    "Escolaridade",
    "Deficiência / PCD",
    "Função Especial",
    "Função Atribuída",
    "Sala Alocada",
    "Condição",
    "Status Cadastro CLA",
    "Confirmação de Presença",
    "Recusa de Função",
    "Pessoa de Referência",
    "Histórico Edições ENEM",
    "Status Auditoria Orion",
    "Data de Submissão",
    "CLA Origem / Mantenedor"
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = collabs.map(c => {
    const formattedDate = c.createdAt ? new Date(c.createdAt).toLocaleString("pt-BR") : "Não informada";
    const condition = c.isReserve ? "Reserva" : (c.assignedRole ? `Associado (${c.assignedRole})` : "Efetivo");
    const pastExp = c.pastEditions && c.pastEditions.length > 0 
      ? c.pastEditions.map(p => `${p.year}:${p.role}`).join(" | ") 
      : (c.hasWorkedEnem ? "Sim" : "Novo no ENEM");

    return [
      escapeCSV(c.name),
      escapeCSV(c.cpf),
      escapeCSV(c.birthDate || ""),
      escapeCSV(c.email || ""),
      escapeCSV(c.whatsapp || ""),
      escapeCSV(c.pixKey || ""),
      escapeCSV(c.education || ""),
      escapeCSV(c.disability || "Nenhuma"),
      escapeCSV(c.specialRole || "Nenhuma"),
      escapeCSV(c.assignedRole || "Não Atribuída"),
      escapeCSV(c.assignedRoom || "Sem Sala"),
      escapeCSV(condition),
      escapeCSV(c.status),
      escapeCSV(c.attendanceStatus || (c.assignedRole ? "Pendente" : "N/A")),
      escapeCSV(c.refusedRole ? `Recusou ${c.refusedRole}` : (c.refusalTag || "Nenhuma")),
      escapeCSV(c.referencePerson || ""),
      escapeCSV(pastExp),
      escapeCSV(c.orionStatus || "Ok"),
      escapeCSV(formattedDate),
      escapeCSV(c.originalClaName || c.claName || "")
    ].join(";");
  });

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${title}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ENEM_ROLES = [
  { name: "Chefe de Sala", desc: "Coordenador direto da sala de prova (1 por sala). Responsável por vistorias de materiais, lanches, identificação e atas oficiais." },
  { name: "Aplicador", desc: "Auxilia na fiscalização e vistoria com detector de metais. 1 aplicador (1-60 participantes) ou 2 aplicadores em dupla (61-100 participantes)." },
  { name: "Tradutor-Intérprete de Libras", desc: "Atendimento especializado a participantes usuários de Libras/deficiência auditiva. Atuação em dupla (2 por sala com este recurso)." },
  { name: "Guia-Intérprete de Surdocegos", desc: "Atendimento especializado a participantes surdocegos (Tadoma/Libras Tátil). Atuação em trio (3 por sala com este recurso)." },
  { name: "Ledor (Aplicador Especializado)", desc: "Atendimento especializado a participantes com deficiência visual/dislexia. Atuação em dupla (2 por sala com este recurso)." },
  { name: "Transcritor (Aplicador Especializado)", desc: "Atendimento especializado para transcrição de respostas e redação. Atuação individual (1 por participante/sala)." },
  { name: "Fiscal de Banheiro", desc: "Inspeção e vistoria eletrônica com detector de metais nas áreas comuns sanitárias (2 a 12 fiscais por prédio, mín. 1 por sexo)." },
  { name: "Fiscal Volante / Corredor", desc: "Circulação nas áreas comuns, suporte logístico e condução de participantes com detector de metais (2 a 12 fiscais por prédio)." },
  { name: "Técnico de Informática", desc: "Suporte especializado a computadores, videoprova em Libras ou leitor de tela (1 por sala com atendimento específico)." },
  { name: "Fiscal Volante", desc: "Circulação e áreas comuns, condução de participantes e manuseio de detector de metais." },
  { name: "Interprete de Libras", desc: "Suporte especializado a candidatos surdos, traduzindo instruções para a Língua de Sinais (em dupla)." },
  { name: "Ledor/Transcritor", desc: "Auxílio especializado para leitura de provas ou transcrição de respostas para candidatos PCD." },
  { name: "Apenas Ledor", desc: "Atendimento especializado exclusivamente para leitura de prova e enunciados para candidatos." },
  { name: "Transcritor", desc: "Atendimento especializado para transcrição de respostas de prova e redação." },
  { name: "Tecnico Informática", desc: "Suporte aos computadores, videoprovas e conectividade do prédio." },
  { name: "Auxiliar de Limpeza", desc: "Responsável pela higienização periódica dos banheiros, salas e corredores do local." },
  { name: "Porteiro", desc: "Responsável pelo controle de abertura e fechamento de portões e filtragem de acessos." },
  { name: "Representante do Local", desc: "Responsável oficial de ligação operacional e suporte de infraestrutura predial do local de aplicação." },
  { name: "Representante da Local", desc: "Responsável oficial de ligação operacional e suporte de infraestrutura predial do local de aplicação." },
  { name: "OUTROS", desc: "Compreende fiscais reservas ativados de última hora ou outras tarefas gerais não mapeadas." }
];

interface CollaboratorManagerProps {
  collaborators: CollaboratorInfo[];
  allCollaborators?: CollaboratorInfo[];
  claId: string;
  currentUserName?: string;
  currentUserEmail?: string;
  buildingName?: string;
  allBuildings?: BuildingInfo[];
  allUsers?: UserProfile[];
  onAdd: (collab: Omit<CollaboratorInfo, "id">) => Promise<string>;
  onUpdate: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRequestTransfer?: (
    collab: CollaboratorInfo,
    targetCla: { uid: string; name: string; buildingName?: string; email?: string; phone?: string },
    notes?: string
  ) => Promise<void>;
  onApproveTransfer?: (collab: CollaboratorInfo, approvedByName?: string) => Promise<void>;
  onRejectTransfer?: (collab: CollaboratorInfo) => Promise<void>;
  onCancelTransfer?: (collab: CollaboratorInfo) => Promise<void>;
  onSimulatePublicRecruit?: () => void;
}

export default function CollaboratorManager({ 
  collaborators, 
  allCollaborators = [],
  claId, 
  currentUserName,
  currentUserEmail,
  buildingName,
  allBuildings = [],
  allUsers = [],
  onAdd, 
  onUpdate, 
  onDelete,
  onRequestTransfer,
  onApproveTransfer,
  onRejectTransfer,
  onCancelTransfer,
  onSimulatePublicRecruit
}: CollaboratorManagerProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<"list" | "network_reserves" | "add" | "import" | "edit">("list");
  const [filterType, setFilterType] = useState<
    | "todos"
    | "com_funcao_sem_sala"
    | "sem_funcao"
    | "confirmados"
    | "pendentes"
    | "efetivos"
    | "reservas"
    | "recusados"
    | "com_erro"
  >("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<
    | "all"
    | "name"
    | "cpf"
    | "email"
    | "whatsapp"
    | "pixKey"
    | "referencePerson"
    | "education"
    | "specialRole"
    | "disability"
    | "assignedRole"
    | "assignedRoom"
  >("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "name_asc" | "name_desc">("created_desc");

  // Transfer requests modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Duplicate finder modal state
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Edit State
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);

  // Diagnostic / Failure modal state
  const [diagnoseCollab, setDiagnoseCollab] = useState<CollaboratorInfo | null>(null);

  // Identify duplicate groups in current CLA collaborators
  const duplicateGroups = useMemo(() => {
    return findDuplicateCollaborators(collaborators);
  }, [collaborators]);

  // Count incoming pending release requests for current CLA
  const pendingIncomingCount = collaborators.filter(
    c => c.transferRequest && c.transferRequest.status === "Pendente"
  ).length;

  // Count reserve collaborators in other CLAs who are approved/confirmed
  const otherReservesCount = allCollaborators.filter(
    c => (c.isReserve || !c.assignedRoom) && c.claId !== claId && c.status === "Confirmado"
  ).length;

  // Form states
  const [photoUrl, setPhotoUrl] = useState("");
  const [lightboxData, setLightboxData] = useState<LightboxData | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [education, setEducation] = useState<any>("Ensino Superior Completo");
  const [disability, setDisability] = useState("Nenhuma");
  const [hasWorkedEnem, setHasWorkedEnem] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [referencePerson, setReferencePerson] = useState("");
  const [specialRole, setSpecialRole] = useState<any>("Nenhuma");
  const [languages, setLanguages] = useState<string>("");
  const [isReserve, setIsReserve] = useState(false);
  
  // Past Editions checklist helper (ENEM 1998 to 2025)
  const [pastEditionsSelected, setPastEditionsSelected] = useState<Record<number, boolean>>({});
  const [pastEditionsRoles, setPastEditionsRoles] = useState<Record<number, string>>({});
  
  // Custom states
  const [showPastYears, setShowPastYears] = useState(false);
  const [showRolesHelp, setShowRolesHelp] = useState(false);
  const [localSuccessMsg, setLocalSuccessMsg] = useState<string | null>(null);
  const [mailDispatchResult, setMailDispatchResult] = useState<string | null>(null);

  // Import file states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseErrors, setParseErrors] = useState<{ row: number; name: string; message: string }[]>([]);
  const [parseStatus, setParseStatus] = useState<"idle" | "success" | "rejected">("idle");

  const availableYears = Array.from({ length: 2025 - 1998 + 1 }, (_, i) => 2025 - i); // [2025, 2024, ..., 1998]

  // Form auto formatter as typed
  const handleCpfChange = (val: string) => {
    let value = val.replace(/\D/g, "");
    if (value.length <= 11) {
      value = value
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      setCpf(value);
    }
  };

  const handlePhoneChange = (val: string) => {
    let value = val.replace(/\D/g, "");
    if (value.length <= 11) {
      if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
      } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
      } else if (value.length > 0) {
        value = value.replace(/^(\d{0,2})$/, "($1");
      }
      setWhatsapp(value);
    }
  };

  const handleBirthDateChange = (val: string) => {
    let value = val.replace(/\D/g, "");
    if (value.length <= 8) {
      value = value
        .replace(/(\d{2})(\d)/, "$1/$2")
        .replace(/(\d{2})(\d)/, "$1/$2");
      setBirthDate(value);
    }
  };

  const handleStartEdit = (collab: CollaboratorInfo) => {
    setEditingCollabId(collab.id || null);
    setPhotoUrl(collab.photoUrl || "");
    setName(collab.name || "");
    setBirthDate(collab.birthDate || "");
    setCpf(collab.cpf || "");
    setWhatsapp(collab.whatsapp || "");
    setEmail(collab.email || "");
    setEducation(collab.education || "Ensino Superior Completo");
    setDisability(collab.disability || "Nenhuma");
    setHasWorkedEnem(collab.hasWorkedEnem || false);
    setPixKey(collab.pixKey || "");
    setReferencePerson(collab.referencePerson || "");
    setSpecialRole(collab.specialRole || "Nenhuma");
    setLanguages(collab.languages ? collab.languages.join("; ") : "");
    setIsReserve(collab.isReserve ?? false);
    
    // Fill past editions
    const selected: Record<number, boolean> = {};
    const roles: Record<number, string> = {};
    if (collab.pastEditions) {
      collab.pastEditions.forEach(ed => {
        selected[ed.year] = true;
        roles[ed.year] = ed.role;
      });
    }
    setPastEditionsSelected(selected);
    setPastEditionsRoles(roles);
    
    setParseStatus("idle");
    setActiveSubTab("edit");
  };

  const handleEditCollaboratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollabId) return;

    setLocalSuccessMsg(null);

    // Build past exam list
    const finalPastEditions: PastEdition[] = [];
    Object.keys(pastEditionsSelected).forEach(yearStr => {
      const y = Number(yearStr);
      if (pastEditionsSelected[y]) {
        finalPastEditions.push({
          year: y,
          role: pastEditionsRoles[y] || "Fiscal de Sala"
        });
      }
    });

    // Run audits first as requested by the user parameters:
    const validations = auditCollaborator({ name, cpf, whatsapp, email, education, pixKey });
    const hasAuditError = validations.length > 0;
    const errorsList = validations.map(v => v.message);

    const edits: Partial<CollaboratorInfo> = {
      name,
      birthDate,
      cpf,
      whatsapp,
      email,
      photoUrl,
      education,
      disability,
      hasWorkedEnem: finalPastEditions.length > 0,
      pastEditions: finalPastEditions,
      pixKey,
      referencePerson,
      specialRole,
      languages: languages.split(";").map(l => l.trim()).filter(Boolean),
      isReserve,
      orionStatus: hasAuditError ? "Erro" : "Ok",
      orionErrors: errorsList,
      orionSynced: !hasAuditError,
    };

    try {
      await onUpdate(editingCollabId, edits);
      setLocalSuccessMsg(`Cadastro de "${name}" atualizado com sucesso!`);
      
      // Reset form fields
      setEditingCollabId(null);
      setPhotoUrl("");
      setName("");
      setBirthDate("");
      setCpf("");
      setWhatsapp("");
      setEmail("");
      setPixKey("");
      setReferencePerson("");
      setHasWorkedEnem(false);
      setLanguages("");
      setIsReserve(false);
      setSpecialRole("Nenhuma");
      setPastEditionsSelected({});
      setPastEditionsRoles({});
      setActiveSubTab("list");
      setTimeout(() => setLocalSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCollaboratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalSuccessMsg(null);

    // Build past exam list
    const finalPastEditions: PastEdition[] = [];
    Object.keys(pastEditionsSelected).forEach(yearStr => {
      const y = Number(yearStr);
      if (pastEditionsSelected[y]) {
        finalPastEditions.push({
          year: y,
          role: pastEditionsRoles[y] || "Fiscal de Sala"
        });
      }
    });

    // Run audits first as requested by the user parameters:
    const validations = auditCollaborator({ name, cpf, whatsapp, email, education, pixKey });
    const hasAuditError = validations.length > 0;
    const errorsList = validations.map(v => v.message);

    const collab: Omit<CollaboratorInfo, "claId"> = {
      name,
      birthDate,
      cpf,
      whatsapp,
      email,
      photoUrl,
      education,
      disability,
      hasWorkedEnem: finalPastEditions.length > 0,
      pastEditions: finalPastEditions,
      pixKey,
      referencePerson,
      specialRole,
      languages: languages.split(";").map(l => l.trim()).filter(Boolean),
      isReserve: true, // CLA registering a fiscal directly -> automatically reserve
      status: "Confirmado", // CLA registering a fiscal directly -> automatically approved
      originalClaId: claId,
      originalClaName: currentUserName || buildingName || "CLA Cadastrador",
      claName: currentUserName || buildingName || "CLA Cadastrador",
      orionStatus: hasAuditError ? "Erro" : "Ok",
      orionErrors: errorsList,
      orionSynced: !hasAuditError,
    };

    try {
      await onAdd({ claId, ...collab });
      setLocalSuccessMsg(`Colaborador "${name}" adicionado com sucesso!`);
      
      // Reset form fields
      setPhotoUrl("");
      setName("");
      setBirthDate("");
      setCpf("");
      setWhatsapp("");
      setEmail("");
      setPixKey("");
      setReferencePerson("");
      setHasWorkedEnem(false);
      setLanguages("");
      setIsReserve(false);
      setSpecialRole("Nenhuma");
      setPastEditionsSelected({});
      setPastEditionsRoles({});
      setActiveSubTab("list");
      setTimeout(() => setLocalSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Dispatch Email alert (Cebraspe candidates coordination) via express API
  const sendEmailNotification = async (collab: CollaboratorInfo) => {
    setMailDispatchResult(null);
    const bodyStr = `Olá ${collab.name},\n\n` +
      `Sua participação oficial no ENEM ${new Date().getFullYear()} foi solicitada pelo Coordenador (CLA) de seu prédio.\n\n` +
      `DETALHES DA ALOCAÇÃO:\n` +
      `- Função especial: ${collab.specialRole}\n` +
      `- Regime de Equipe: ${collab.isReserve ? "COLABORADOR RESERVA" : "COLABORADOR EFETIVO (" + (collab.assignedRoom || "A designar") + ")"}\n\n` +
      `AÇÃO IMPORTANTE REQUERIDA:\n` +
      `Pedimos que confirme sua presença e valide se seus dados cadastrais estão alinhados com o sistema Orion Cebraspe.\n` +
      `Se houver erros no CPF ou Nome, seu Coordenador CLA será notificado para recusa no sistema.\n\n` +
      `Atenciosamente, Equipe de Coordenação CalanguS.`;

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: collab.email,
          subject: `[ENEM CalanguS] Confirmação de Equipe de Aplicação`,
          body: bodyStr,
          collaboratorName: collab.name
        })
      });

      const parsed = await response.json();
      if (parsed.success) {
        setMailDispatchResult(`Notificação enviada com sucesso para ${collab.name}!`);
        // update database status to verify email sent
        await onUpdate(collab.id!, { status: "Pendente" });
        setTimeout(() => setMailDispatchResult(null), 4000);
      }
    } catch (e) {
      console.error(e);
      setMailDispatchResult("Erro no envio de e-mails do servidor.");
    }
  };

  // Toggle Confirm / Approve
  const confirmStaff = async (id: string) => {
    const target = collaborators.find(c => c.id === id);
    const updates: Partial<CollaboratorInfo> = { status: "Confirmado" };
    if (target) {
      if (!target.originalClaId) {
        updates.originalClaId = claId;
      }
      if (!target.originalClaName) {
        updates.originalClaName = currentUserName || buildingName || "CLA";
      }
      if (!target.claName) {
        updates.claName = currentUserName || buildingName || "CLA";
      }
      if (!target.assignedRoom) {
        updates.isReserve = true;
      }
    }
    await onUpdate(id, updates);
  };

  // Toggle Recused
  const refuseStaff = async (id: string) => {
    await onUpdate(id, { status: "Recusado" });
  };

  // Batch Accept All Pending Collaborators
  const handleAcceptAllPending = async () => {
    const pendingCollabs = collaborators.filter(c => c.status === "Pendente" && c.id);
    if (pendingCollabs.length === 0) {
      alert("Não há colaboradores com aprovação pendente no momento.");
      return;
    }
    const confirmed = window.confirm(`Deseja aprovar e aceitar TODOS os ${pendingCollabs.length} colaboradores que aguardam aprovação?`);
    if (!confirmed) return;

    for (const collab of pendingCollabs) {
      const updates: Partial<CollaboratorInfo> = { status: "Confirmado" };
      if (!collab.originalClaId) {
        updates.originalClaId = claId;
      }
      if (!collab.originalClaName) {
        updates.originalClaName = currentUserName || buildingName || "CLA";
      }
      if (!collab.claName) {
        updates.claName = currentUserName || buildingName || "CLA";
      }
      if (!collab.assignedRoom) {
        updates.isReserve = true;
      }
      await onUpdate(collab.id!, updates);
    }
    setLocalSuccessMsg(`${pendingCollabs.length} colaboradores aprovados e confirmados com sucesso!`);
    setTimeout(() => setLocalSuccessMsg(null), 3500);
  };

  // File CSV Spreadsheet parsing implementation
  const handleSpreadsheetImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert("O arquivo não possui dados suficientes.");
        return;
      }

      // Headers skip, process lines
      const tempErrors: { row: number; name: string; message: string }[] = [];
      const parsedCollabs: Omit<CollaboratorInfo, "claId">[] = [];

      // Helper to parse CSV line with either ; or , separator supporting quotes
      const parseCSVLine = (line: string): string[] => {
        const semiCount = (line.match(/;/g) || []).length;
        const commaCount = (line.match(/,/g) || []).length;
        const separator = semiCount > commaCount ? ";" : ",";

        const result: string[] = [];
        let current = "";
        let insideQuotes = false;

        for (let idx = 0; idx < line.length; idx++) {
          const char = line[idx];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === separator && !insideQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const getSpecialRole = (roleStr: string): any => {
        const norm = (roleStr || "").trim().toLowerCase();
        if (norm.includes("libras")) return "Libras";
        if (norm.includes("tradutor") || norm.includes("interprete") || norm.includes("intérprete")) return "Tradutor e Intérprete";
        if (norm.includes("informática") || norm.includes("informatica") || norm.includes("técnico") || norm.includes("tecnico")) return "Técnico de Informática";
        if (norm.includes("acessibilidade") || norm.includes("auxiliar")) return "Auxiliar de Acessibilidade";
        if (norm.includes("ledor") || norm.includes("transcritor")) return "Ledor/Transcritor";
        if (norm.includes("gestante")) return "Ledora de Gestante";
        return "Nenhuma";
      };

      const getEducation = (educationStr: string): any => {
        const norm = (educationStr || "").trim().toLowerCase();
        if (norm.includes("fundamental") || norm.includes("alfabetizado")) return "Ensino Fundamental (Alfabetizado)";
        if (norm.includes("médio") || norm.includes("medio")) return "Ensino Médio";
        if (norm.includes("técnico") || norm.includes("tecnico")) return "Ensino Técnico";
        if (norm.includes("superior cursando") || norm.includes("faculdade cursando")) return "Ensino Superior Cursando";
        if (norm.includes("superior completo") || norm.includes("superior") || norm.includes("completo")) return "Ensino Superior Completo";
        if (norm.includes("pós") || norm.includes("pos") || norm.includes("especialização")) return "Pós-Graduação";
        if (norm.includes("mestrado")) return "Mestrado";
        if (norm.includes("doutorado")) return "Doutorado";
        return "Ensino Superior Completo";
      };

      for (let i = 1; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);

        if (columns.length < 5) continue; // Skip malformed rows

        const itemCollab = {
          name: columns[0] || "",
          cpf: columns[1] || "",
          birthDate: columns[2] || "",
          assignedRoom: undefined, // "Sala Real" removed from spreadsheet; will be allocated in standard dashboard
          specialRole: "Nenhuma" as const, // "Função" column removed from spreadsheet template
          whatsapp: columns[3] || "",
          email: columns[4] || "",
          education: getEducation(columns[5] || "Ensino Superior Completo"),
          referencePerson: columns[6] || "",
        };

        // Run audit checks
        const audits = auditCollaborator({
          name: itemCollab.name,
          cpf: itemCollab.cpf,
          whatsapp: itemCollab.whatsapp,
          email: itemCollab.email,
          education: itemCollab.education,
          pixKey: itemCollab.cpf // default pix key to CPF for easy setup
        });

        if (audits.length > 0) {
          audits.forEach(err => {
            tempErrors.push({
              row: i + 1,
              name: itemCollab.name || `Coluna Desconhecida`,
              message: err.message
            });
          });
        }

        // Setup parsed records
        parsedCollabs.push({
          name: itemCollab.name,
          birthDate: itemCollab.birthDate,
          cpf: itemCollab.cpf,
          assignedRoom: itemCollab.assignedRoom || undefined,
          whatsapp: itemCollab.whatsapp,
          email: itemCollab.email,
          education: itemCollab.education,
          referencePerson: itemCollab.referencePerson,
          disability: "Nenhuma",
          hasWorkedEnem: false,
          pastEditions: [],
          pixKey: itemCollab.cpf, // set pix key as CPF
          specialRole: itemCollab.specialRole,
          languages: [],
          isReserve: true,
          status: "Confirmado",
          originalClaId: claId,
          originalClaName: currentUserName || buildingName || "CLA Cadastrador",
          claName: currentUserName || buildingName || "CLA Cadastrador",
          orionStatus: audits.length > 0 ? "Erro" : "Ok",
          orionErrors: audits.map(a => a.message),
          orionSynced: audits.length === 0,
        });
      }

      // RULING TRUTH REDIRECT
      if (tempErrors.length > 0) {
        setParseErrors(tempErrors);
        setParseStatus("rejected");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setParseErrors([]);
        setParseStatus("success");
        for (const c of parsedCollabs) {
          await onAdd({ claId, ...c });
        }
        setLocalSuccessMsg(`Planilha importada com sucesso: ${parsedCollabs.length} colaboradores salvos!`);
        setTimeout(() => setLocalSuccessMsg(null), 3000);
        setActiveSubTab("list");
      }
    };
    reader.readAsText(file);
  };

  // List filters and search helper
  const filteredCollaborators = useMemo(() => {
    let result = [...collaborators];

    // 1. Status Filter
    if (filterType === "confirmados") {
      result = result.filter(c => c.status === "Confirmado");
    } else if (filterType === "com_funcao_sem_sala") {
      // Tem função mas não está associado a sala/posto
      result = result.filter(c => c.status === "Confirmado" && c.assignedRole && c.assignedRole.trim() !== "" && (!c.assignedRoom || c.assignedRoom.trim() === ""));
    } else if (filterType === "sem_funcao") {
      // Não tem função atribuída
      result = result.filter(c => c.status === "Confirmado" && (!c.assignedRole || c.assignedRole.trim() === ""));
    } else if (filterType === "pendentes") {
      result = result.filter(c => c.status === "Pendente");
    } else if (filterType === "efetivos") {
      result = result.filter(c => !c.isReserve && c.status === "Confirmado" && c.assignedRoom && c.assignedRoom.trim() !== "");
    } else if (filterType === "reservas") {
      result = result.filter(c => c.isReserve && c.status === "Confirmado");
    } else if (filterType === "recusados") {
      result = result.filter(c => c.status === "Recusado" || c.refusedRole || c.refusalTag || c.attendanceStatus === "Recusado");
    } else if (filterType === "com_erro") {
      result = result.filter(c => c.orionStatus === "Erro");
    }

    // 2. Text Search Query - Realtime multi-field search across any available field
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qDigits = searchQuery.replace(/\D/g, "");

      result = result.filter(c => {
        const matchesName = c.name ? c.name.toLowerCase().includes(q) : false;
        const matchesEmail = c.email ? c.email.toLowerCase().includes(q) : false;
        const matchesCpf = c.cpf 
          ? (c.cpf.toLowerCase().includes(q) || (qDigits.length > 0 && c.cpf.replace(/\D/g, "").includes(qDigits))) 
          : false;
        const matchesWhatsapp = c.whatsapp 
          ? (c.whatsapp.toLowerCase().includes(q) || (qDigits.length > 0 && c.whatsapp.replace(/\D/g, "").includes(qDigits))) 
          : false;
        const matchesPixKey = c.pixKey ? c.pixKey.toLowerCase().includes(q) : false;
        const matchesReference = c.referencePerson ? c.referencePerson.toLowerCase().includes(q) : false;
        const matchesEducation = c.education ? c.education.toLowerCase().includes(q) : false;
        const matchesSpecialRole = c.specialRole ? c.specialRole.toLowerCase().includes(q) : false;
        const matchesDisability = c.disability ? c.disability.toLowerCase().includes(q) : false;
        const matchesLanguages = c.languages ? c.languages.some(l => l.toLowerCase().includes(q)) : false;
        const matchesAssignedRole = c.assignedRole ? c.assignedRole.toLowerCase().includes(q) : false;
        const matchesAssignedRoom = c.assignedRoom ? c.assignedRoom.toLowerCase().includes(q) : false;
        const matchesBirthDate = c.birthDate ? c.birthDate.toLowerCase().includes(q) : false;
        const matchesStatus = c.status ? c.status.toLowerCase().includes(q) : false;
        const matchesAttendance = c.attendanceStatus ? c.attendanceStatus.toLowerCase().includes(q) : false;
        const matchesCla = (c.claName && c.claName.toLowerCase().includes(q)) || (c.originalClaName && c.originalClaName.toLowerCase().includes(q));
        const matchesPastEditions = c.pastEditions ? c.pastEditions.some(ed => String(ed.year).includes(q) || ed.role.toLowerCase().includes(q)) : false;
        const matchesRefusal = (c.refusedRole && c.refusedRole.toLowerCase().includes(q)) || (c.refusalTag && c.refusalTag.toLowerCase().includes(q));

        if (searchField === "name") return matchesName;
        if (searchField === "cpf") return matchesCpf;
        if (searchField === "email") return matchesEmail;
        if (searchField === "whatsapp") return matchesWhatsapp;
        if (searchField === "pixKey") return matchesPixKey;
        if (searchField === "referencePerson") return matchesReference;
        if (searchField === "education") return matchesEducation;
        if (searchField === "specialRole") return matchesSpecialRole;
        if (searchField === "disability") return matchesDisability;
        if (searchField === "assignedRole") return matchesAssignedRole;
        if (searchField === "assignedRoom") return matchesAssignedRoom;

        // "all" - matches ANY available field
        return (
          matchesName ||
          matchesCpf ||
          matchesEmail ||
          matchesWhatsapp ||
          matchesPixKey ||
          matchesReference ||
          matchesEducation ||
          matchesSpecialRole ||
          matchesDisability ||
          matchesLanguages ||
          matchesAssignedRole ||
          matchesAssignedRoom ||
          matchesBirthDate ||
          matchesStatus ||
          matchesAttendance ||
          matchesCla ||
          matchesPastEditions ||
          matchesRefusal
        );
      });
    }

    // 3. Submission Date Filter (createdAt)
    if (dateStart) {
      const start = new Date(dateStart).getTime();
      result = result.filter(c => {
        if (!c.createdAt) return false;
        return new Date(c.createdAt).getTime() >= start;
      });
    }
    if (dateEnd) {
      // end of day
      const end = new Date(dateEnd).getTime() + (24 * 60 * 60 * 1000 - 1);
      result = result.filter(c => {
        if (!c.createdAt) return false;
        return new Date(c.createdAt).getTime() <= end;
      });
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === "created_desc") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === "created_asc") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name, "pt-BR");
      }
      return 0;
    });

    return result;
  }, [collaborators, filterType, searchQuery, searchField, dateStart, dateEnd, sortBy]);

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="collaborator-management-panel">
      
      {/* TABS CONTROLLER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <span>Colaboradores e Fiscais de Apoio</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">CEBRASPE ACTIVE</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inscreva individualmente, busque reservas em outros locais ou envie links de pré-cadastro público.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setActiveSubTab("list"); setParseStatus("idle"); setEditingCollabId(null); }}
            className={`btn-3d py-2.5 px-3.5 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeSubTab === "list" ? "btn-3d-primary" : "bg-slate-150 dark:bg-slate-800/80 text-slate-705 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            <span>👥 Minha Equipe ({collaborators.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubTab("network_reserves"); setParseStatus("idle"); setEditingCollabId(null); }}
            className={`btn-3d py-2.5 px-3.5 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeSubTab === "network_reserves" ? "bg-indigo-600 text-white border-indigo-800 shadow-md" : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20"}`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌐 Banco Geral de Reservas ({otherReservesCount})</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className={`py-2.5 px-3.5 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 border-2 ${
              pendingIncomingCount > 0
                ? "bg-amber-500 text-white border-amber-600 animate-pulse shadow-md"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>⚡ Pedidos de Liberação</span>
            {pendingIncomingCount > 0 && (
              <span className="bg-white text-amber-700 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingIncomingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsDuplicateModalOpen(true)}
            className={`py-2.5 px-3.5 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 border-2 ${
              duplicateGroups.length > 0
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
            }`}
            title="Localizar cadastros duplicados (CPF, e-mail, nome) e mesclar ou excluir mantendo fotos"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>🔍 Localizar Duplicados</span>
            {duplicateGroups.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-bounce">
                {duplicateGroups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab("add"); setParseStatus("idle"); setEditingCollabId(null); }}
            className={`btn-3d py-2.5 px-3.5 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeSubTab === "add" ? "btn-3d-secondary" : "bg-slate-150 dark:bg-slate-800/80 text-slate-705 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            <span>➕ Novo Cadastro</span>
          </button>

          {activeSubTab === "edit" && (
            <span className="btn-3d bg-indigo-650 text-white border-indigo-900 py-2.5 px-4 text-xs font-black rounded-xl cursor-default flex items-center gap-1.5">
              <span>📝 Editando Cadastro</span>
            </span>
          )}
        </div>
      </div>

      {/* Prominent Alert for Incoming Transfer / Release Requests */}
      {pendingIncomingCount > 0 && (
        <div className="mb-5 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Aviso de Transferência de Fiscais Reservas
              </h4>
              <p className="text-xs text-amber-900/80 dark:text-amber-200">
                Há <strong>{pendingIncomingCount} fiscal(is) reserva(s)</strong> do seu local com solicitação de liberação/associação enviada por outro CLA.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer active:scale-95 shrink-0"
          >
            Revisar e Liberar Fiscais ({pendingIncomingCount}) ➔
          </button>
        </div>
      )}

      {localSuccessMsg && (
        <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1 border-2 border-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{localSuccessMsg}</span>
        </div>
      )}

      {mailDispatchResult && (
        <div className="mb-4 p-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl flex items-center gap-1.5 border-2 border-indigo-500/20">
          <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{mailDispatchResult}</span>
        </div>
      )}

      {/* SUBTAB 1: COLLABORATORS LIST */}
      {activeTabSubList(
        activeSubTab, filterType, setFilterType, filteredCollaborators, collaborators,
        sendEmailNotification, confirmStaff, refuseStaff, onDelete, handleStartEdit, 
        claId, onSimulatePublicRecruit, setDiagnoseCollab, () => setIsTransferModalOpen(true),
        (data) => setLightboxData(data),
        searchQuery, setSearchQuery,
        searchField, setSearchField,
        dateStart, setDateStart,
        dateEnd, setDateEnd,
        sortBy, setSortBy,
        buildingName,
        () => setIsDuplicateModalOpen(true),
        duplicateGroups.length,
        handleAcceptAllPending,
        collaborators.filter(c => c.status === "Pendente").length
      )}

      {/* SUBTAB 2: NETWORK RESERVES POOL (BANCO GERAL DE RESERVAS) */}
      {activeSubTab === "network_reserves" && (
        <NetworkReservesPool
          allCollaborators={allCollaborators}
          currentClaId={claId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          buildingName={buildingName}
          allBuildings={allBuildings}
          allUsers={allUsers}
          onRequestTransfer={onRequestTransfer || (async () => {})}
          onViewPhoto={(data) => setLightboxData(data)}
        />
      )}

      {/* SUBTAB 3: ADD FORM */}
      {activeTabSubAddForm(
        activeSubTab, name, setName, photoUrl, setPhotoUrl, birthDate, setBirthDate, cpf, setCpf, whatsapp, setWhatsapp, email, setEmail,
        education, setEducation, disability, setDisability, hasWorkedEnem, setHasWorkedEnem, pixKey, setPixKey,
        referencePerson, setReferencePerson, specialRole, setSpecialRole, languages, setLanguages, isReserve, setIsReserve,
        showPastYears, setShowPastYears, availableYears, pastEditionsSelected, setPastEditionsSelected, pastEditionsRoles, setPastEditionsRoles,
        handleCreateCollaboratorSubmit, handleCpfChange, handlePhoneChange, handleBirthDateChange
      )}

      {/* SUBTAB 4: EDIT FORM */}
      {activeSubTab === "edit" && (
        <form onSubmit={handleEditCollaboratorSubmit} className="space-y-6 text-sm bg-slate-50 dark:bg-[#070b13]/60 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#1e293b]">
          <h3 className="text-base font-display font-black text-indigo-500 border-b pb-2 dark:border-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>📝</span> Editar Cadastro de Fiscal (Orion Sync)
          </h3>
          
          <PhotoUploader
            photoUrl={photoUrl}
            onChange={setPhotoUrl}
            name={name || "Fiscal"}
            label="Foto de Identificação do Fiscal"
            helpText="Atualize a foto de identificação do colaborador para visualização no sistema e confecção de crachás."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Carlos Costa Neto"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Data Nascimento</label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => handleBirthDateChange(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="403.401.503-12"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white font-mono text-xs font-bold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden align-middle"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(87) 98123-4567"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white font-mono text-xs font-bold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@email.com"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Chave PIX</label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF ou e-mail"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Pessoa de Referência</label>
              <input
                type="text"
                value={referencePerson}
                onChange={(e) => setReferencePerson(e.target.value)}
                placeholder="Ex: MARIA"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 font-medium leading-relaxed">
                Informe aqui o nome da pessoa (amigo, parente ou familiar) que lhe indicou para esse CLA. Exemplo: Minha amiga MARIA conversou com o CLA para me indicar para os trabalhos desse ano, então na referência eu digito MARIA.
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Escolaridade</label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value as any)}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-800 dark:text-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
              >
                <option value="Ensino Fundamental (Alfabetizado)">Ensino Fundamental (Alfabetizado)</option>
                <option value="Ensino Médio">Ensino Médio</option>
                <option value="Ensino Técnico">Ensino Técnico</option>
                <option value="Ensino Superior Cursando">Ensino Superior Cursando</option>
                <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                <option value="Pós-Graduação">Pós-Graduação</option>
                <option value="Mestrado">Mestrado</option>
                <option value="Doutorado">Doutorado</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">PCD</label>
              <input
                type="text"
                value={disability}
                onChange={(e) => setDisability(e.target.value)}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
              />
            </div>


          </div>

          <div className="pt-2">
            <div className="p-4 bg-white dark:bg-[#101726]/40 border-2 border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Histórico em edições anteriores do ENEM (1998 a 2025)</span>
                  <button
                    type="button"
                    onClick={() => setShowRolesHelp(!showRolesHelp)}
                    className="text-[10px] bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded hover:bg-indigo-500/20 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    {showRolesHelp ? "Fechar Guia de Funções" : "Ver Guia de Funções"}
                  </button>
                </div>
              </div>

              {showRolesHelp && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-[220px] overflow-y-auto">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Funções Oficiais do ENEM para preenchimento:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ENEM_ROLES.map((role) => (
                      <div key={role.name} className="p-2 bg-white dark:bg-[#101726] border border-slate-150 dark:border-slate-800 rounded-lg text-[11px]">
                        <div className="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400 gap-1.5 flex-wrap">
                          <span>{role.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedRoles = { ...pastEditionsRoles };
                              Object.keys(pastEditionsSelected).forEach((yr) => {
                                if (pastEditionsSelected[parseInt(yr)]) {
                                  updatedRoles[parseInt(yr)] = role.name;
                                }
                              });
                              setPastEditionsRoles(updatedRoles);
                            }}
                            className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded hover:bg-emerald-500/20 cursor-pointer font-bold"
                            title="Preencher nos anos marcados"
                          >
                            Aplicar aos marcados
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{role.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {availableYears.map((yr) => (
                  <div key={yr} className={`flex flex-col p-2 border-2 rounded-xl transition ${pastEditionsSelected[yr] ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={!!pastEditionsSelected[yr]}
                        onChange={(e) => setPastEditionsSelected({
                          ...pastEditionsSelected,
                          [yr]: e.target.checked
                        })}
                        className="rounded text-emerald-500 w-3.5 h-3.5"
                      />
                      <span className="font-mono text-slate-900 dark:text-white font-black">{yr}</span>
                    </label>
                    {pastEditionsSelected[yr] && (
                      <input
                        type="text"
                        placeholder="Cargo"
                        list="enem-roles-list"
                        value={pastEditionsRoles[yr] || ""}
                        onChange={(e) => setPastEditionsRoles({
                          ...pastEditionsRoles,
                          [yr]: e.target.value
                        })}
                        className="mt-1 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[10px] bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-hidden"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveSubTab("list"); setEditingCollabId(null); }}
              className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-800 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="btn-3d btn-3d-secondary rounded-xl px-6 py-2.5 font-extrabold text-xs shadow-lg cursor-pointer text-white font-black"
            >
              SALVAR ALTERAÇÕES
            </button>
          </div>
        </form>
      )}

      <datalist id="enem-roles-list">
        {ENEM_ROLES.map((r) => (
          <option key={r.name} value={r.name} />
        ))}
      </datalist>

      {/* Failure / Inconsistency Diagnostic Modal */}
      <CollaboratorFailureModal
        isOpen={!!diagnoseCollab}
        collaborator={diagnoseCollab}
        onClose={() => setDiagnoseCollab(null)}
        onEdit={(c) => {
          setDiagnoseCollab(null);
          handleStartEdit(c);
        }}
      />

      {/* Transfer / Association Requests Modal */}
      <TransferRequestsModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        collaborators={collaborators}
        allCollaborators={allCollaborators}
        claId={claId}
        currentUserName={currentUserName}
        allBuildings={allBuildings}
        allUsers={allUsers}
        onApproveTransfer={onApproveTransfer || (async () => {})}
        onRejectTransfer={onRejectTransfer || (async () => {})}
        onCancelTransfer={onCancelTransfer}
      />

      {/* Expanded Photo Lightbox Modal */}
      <ImageLightboxModal
        data={lightboxData}
        onClose={() => setLightboxData(null)}
      />

      {/* Duplicate Collaborators Finder & Merge Modal */}
      <DuplicateCollaboratorsModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        collaborators={collaborators}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onViewPhoto={(data) => setLightboxData(data)}
      />
    </div>
  );
}

function activeTabSubList(
  activeSubTab: string,
  filterType: "todos" | "confirmados" | "pendentes" | "efetivos" | "reservas" | "recusados" | "com_erro",
  setFilterType: (f: "todos" | "confirmados" | "pendentes" | "efetivos" | "reservas" | "recusados" | "com_erro") => void,
  filteredCollaborators: CollaboratorInfo[],
  allCollaborators: CollaboratorInfo[],
  sendEmailNotification: any,
  confirmStaff: any,
  refuseStaff: any,
  onDelete: any,
  onStartEdit: (c: CollaboratorInfo) => void,
  claId: string,
  onSimulatePublicRecruit?: () => void,
  onOpenDiagnostic?: (c: CollaboratorInfo) => void,
  onOpenTransferRequests?: () => void,
  onOpenPhotoLightbox?: (data: LightboxData) => void,
  searchQuery: string = "",
  setSearchQuery?: (q: string) => void,
  searchField: "all" | "name" | "email" | "cpf" = "all",
  setSearchField?: (f: "all" | "name" | "email" | "cpf") => void,
  dateStart: string = "",
  setDateStart?: (d: string) => void,
  dateEnd: string = "",
  setDateEnd?: (d: string) => void,
  sortBy: "created_desc" | "created_asc" | "name_asc" | "name_desc" = "created_desc",
  setSortBy?: (s: "created_desc" | "created_asc" | "name_asc" | "name_desc") => void,
  buildingName: string = "Local de Aplicação",
  onOpenDuplicateFinder?: () => void,
  duplicateGroupsCount: number = 0,
  onAcceptAllPending?: () => void,
  pendingCount: number = 0
) {
  if (activeSubTab !== "list") return null;

  // Track pending recruitment requests
  const recruitmentRequestsCount = allCollaborators.filter(c => c.isExternalRecruit && c.status === "Pendente").length;
  const refusedCollabs = allCollaborators.filter(c => c.refusedRole || c.refusalTag || c.status === "Recusado" || c.attendanceStatus === "Recusado");

  return (
    <div className="space-y-4">
      {/* Prominent Alert for Detected Duplicates */}
      {duplicateGroupsCount > 0 && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Cadastros Duplicados Detectados ({duplicateGroupsCount} grupos)
              </h4>
              <p className="text-xs text-amber-900/80 dark:text-amber-200">
                Foram identificados registros com mesmo CPF, e-mail ou dados coincidentes. Você pode mesclar os registros ou excluir redundâncias preservando sempre todas as fotos.
              </p>
            </div>
          </div>
          {onOpenDuplicateFinder && (
            <button
              type="button"
              onClick={onOpenDuplicateFinder}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer active:scale-95 shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Revisar e Mesclar ({duplicateGroupsCount}) ➔</span>
            </button>
          )}
        </div>
      )}

      {/* Prominent Alert for Role Refusals */}
      {refusedCollabs.length > 0 && (
        <div className="p-4 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                Aviso de Recusa de Função ({refusedCollabs.length})
              </h4>
              <p className="text-xs text-rose-900/80 dark:text-rose-200">
                {refusedCollabs.length} colaborador(es) recusaram a função atribuída e retornaram à equipe de <strong>Reserva</strong> com TAG de recusa para nova designação. O cargo associado voltou a ficar vago.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3D Glass Recruitment Link Info Card */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border-2 border-emerald-500/20 dark:border-indigo-500/20 rounded-2xl p-5 space-y-4 shadow-[#10b981]/5 shadow-lg animate-fade-in">
        <div className="space-y-1">
          <h4 className="text-sm font-display font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>🔗</span> Link de Recrutamento para Novos Fiscais
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
            Deseja coletar pré-inscrições de novos colaboradores/fiscais diretamente para seu local de aplicação? Compartilhe o link oficial abaixo. Quando um colaborador finaliza a inscrição, todos os seus dados pessoais e de participação são sincronizados e listados automaticamente com status <span className="text-amber-500 font-bold">Pendente</span> para avaliação.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-[#070b13]/60 rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-black uppercase tracking-widest px-2.5 py-0.5 rounded font-mono border border-emerald-550/10">LINK OFICIAL VERÍDICO (VERCEL)</span>
            </div>
            <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold p-3 bg-emerald-500/5 rounded-xl border border-emerald-550/10 select-all break-all shadow-inner">
              {`https://calangus.vercel.app/#/cadastro?cla=${claId}`}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 shrink-0 justify-end">
            <button
              onClick={() => {
                const url = `https://calangus.vercel.app/#/cadastro?cla=${claId}`;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(url);
                  alert("Link oficial do Vercel copiado com sucesso! Compartilhe com os colaboradores voluntários.");
                } else {
                  alert(`Copie o seguinte link oficial:\n${url}`);
                }
              }}
              className="btn-3d py-3 px-5 bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-800 font-extrabold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              📋 COPIAR LINK OFICIAL
            </button>
            {onSimulatePublicRecruit && (
              <button
                onClick={onSimulatePublicRecruit}
                className="btn-3d py-3 px-5 bg-teal-600 text-white hover:bg-teal-500 border-teal-800 font-extrabold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                🚀 SIMULAR INSCRIÇÃO
              </button>
            )}
          </div>
        </div>
      </div>

      {recruitmentRequestsCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Alerta CalanguS: Existem <strong>{recruitmentRequestsCount}</strong> inscrições pendentes realizadas pelo link externo de recrutamento público!</span>
          </span>
          {onAcceptAllPending && (
            <button
              type="button"
              onClick={onAcceptAllPending}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>ACEITAR TODOS ({recruitmentRequestsCount})</span>
            </button>
          )}
        </div>
      )}

      {/* ADVANCED FILTER & SEARCH TOOLBAR */}
      <div className="bg-slate-50/80 dark:bg-[#070b13]/80 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm backdrop-blur-xs">
        
        {/* Tier 1: Primary Search Input + Scope Selector + Quick Action Buttons */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          
          {/* Search Box & Field Dropdown Container */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
            {/* Input Search Field */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery?.(e.target.value)}
                placeholder="Pesquisar por nome, CPF, e-mail, WhatsApp, PIX, função, sala, PCD..."
                className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden focus:border-emerald-500 transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery?.("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Field Dropdown */}
            <div className="sm:w-56 shrink-0">
              <select
                value={searchField}
                onChange={(e) => setSearchField?.(e.target.value as any)}
                className="w-full bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-700/80 px-3 py-2.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-hidden focus:border-emerald-500 transition shadow-2xs"
              >
                <option value="all">🔍 Todos os Campos</option>
                <option value="name">Por Nome</option>
                <option value="cpf">Por CPF</option>
                <option value="email">Por E-mail</option>
                <option value="whatsapp">Por WhatsApp / Telefone</option>
                <option value="pixKey">Por Chave PIX</option>
                <option value="referencePerson">Por Indicação / Referência</option>
                <option value="education">Por Escolaridade</option>
                <option value="specialRole">Por Perfil Especial</option>
                <option value="disability">Por PCD / Deficiência</option>
                <option value="assignedRole">Por Função</option>
                <option value="assignedRoom">Por Sala Alocada</option>
              </select>
            </div>
          </div>

          {/* Action Buttons Cluster */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            {/* Aceitar Todos Button */}
            {onAcceptAllPending && pendingCount > 0 && (
              <button
                type="button"
                onClick={onAcceptAllPending}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse transition cursor-pointer shadow-sm active:scale-95 shrink-0"
                title={`Aprovar e aceitar todos os ${pendingCount} colaboradores aguardando aprovação`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>ACEITAR TODOS ({pendingCount})</span>
              </button>
            )}

            {/* Find Duplicates Button */}
            {onOpenDuplicateFinder && (
              <button
                type="button"
                onClick={onOpenDuplicateFinder}
                className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
                  duplicateGroupsCount > 0
                    ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                    : "bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Localizar dados duplicados e mesclar ou remover registros redundantes"
              >
                <Sparkles className={`w-4 h-4 ${duplicateGroupsCount > 0 ? "text-amber-200" : "text-amber-500"}`} />
                <span>Duplicados {duplicateGroupsCount > 0 ? `(${duplicateGroupsCount})` : ""}</span>
              </button>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={() => exportCollaboratorsToCSV(filteredCollaborators, `fiscais_${buildingName.replace(/\s+/g, "_").toLowerCase()}`)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md hover:shadow-emerald-500/20 active:scale-95 shrink-0"
              title="Exportar dados filtrados para planilha Excel/CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar CSV</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-800/60 text-[10px] font-mono font-bold">
                {filteredCollaborators.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tier 2: Refinement Controls (Submission Date Range + Sorting) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          
          {/* Submission Date Range */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400">
            <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Data de Submissão:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart?.(e.target.value)}
                className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs rounded-lg font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
              <span className="text-slate-400 text-xs font-bold">até</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd?.(e.target.value)}
                className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs rounded-lg font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
              {(dateStart || dateEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateStart?.("");
                    setDateEnd?.("");
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                  title="Limpar filtro de data"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ordenar por:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy?.(e.target.value as any)}
              className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-bold rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden focus:border-emerald-500"
            >
              <option value="created_desc">Mais Recentes Primeiro</option>
              <option value="created_asc">Mais Antigos Primeiro</option>
              <option value="name_asc">Nome (A - Z)</option>
              <option value="name_desc">Nome (Z - A)</option>
            </select>
          </div>
        </div>

        {/* Tier 3: Category Status Filter Pills */}
        <div className="flex gap-1.5 flex-wrap pt-3 border-t border-slate-200 dark:border-slate-800">
          {[
            { id: "todos", label: "Todos", count: allCollaborators.length },
            { id: "confirmados", label: "Confirmados", count: allCollaborators.filter(c => c.status === "Confirmado").length },
            { id: "efetivos", label: "Efetivos c/ Sala", count: allCollaborators.filter(c => !c.isReserve && c.status === "Confirmado" && c.assignedRoom && c.assignedRoom.trim() !== "").length },
            { id: "reservas", label: "Reservas", count: allCollaborators.filter(c => c.isReserve && c.status === "Confirmado").length },
            { id: "com_funcao_sem_sala", label: "Com Função (Não Ensalados)", count: allCollaborators.filter(c => c.status === "Confirmado" && c.assignedRole && c.assignedRole.trim() !== "" && (!c.assignedRoom || c.assignedRoom.trim() === "")).length },
            { id: "sem_funcao", label: "Sem Função Atribuída", count: allCollaborators.filter(c => c.status === "Confirmado" && (!c.assignedRole || c.assignedRole.trim() === "")).length },
            { id: "pendentes", label: "Pendentes", count: allCollaborators.filter(c => c.status === "Pendente").length },
            { id: "recusados", label: "Recusados", count: refusedCollabs.length },
            { id: "com_erro", label: "⚠ Inconsistência", count: allCollaborators.filter(c => c.orionStatus === "Erro").length }
          ].map(f => {
            const isActive = filterType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition active:scale-95 ${
                  isActive
                    ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-sm border border-transparent"
                    : "bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {filteredCollaborators.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-center text-slate-400 font-bold text-xs space-y-2">
          <p>Nenhum colaborador corresponde ao filtro de busca selecionado no CalanguS.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#080b13]/40 shadow-inner max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#101726]/50 uppercase text-[9px] font-black text-slate-550 dark:text-slate-400 tracking-widest border-b-2 border-slate-200 dark:border-slate-800">
                <th className="p-4">Nome Colaborador / Origem CLA</th>
                <th className="p-4">Experiência</th>
                <th className="p-4">Escolaridade / Deficiência</th>
                <th className="p-4">Confirm. Cand.</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-155 dark:divide-slate-800">
              {filteredCollaborators.map((c) => {
                const originName = c.originalClaName || c.claName || buildingName || "CLA";
                return (
                <tr key={c.id} className="hover:bg-slate-500/5 transition">
                  {/* Name detail */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <FiscalAvatar
                        photoUrl={c.photoUrl}
                        name={c.name}
                        size="md"
                        onClick={() => onOpenPhotoLightbox?.({
                          imageUrl: c.photoUrl || "",
                          name: c.name,
                          role: c.assignedRole || (c.isReserve ? "Fiscal Reserva" : "Fiscal de Sala"),
                          cpf: c.cpf,
                          claName: c.claName || originName,
                          originalClaName: c.originalClaName || originName,
                          education: c.education,
                          specialRole: c.specialRole,
                          hasWorkedEnem: c.hasWorkedEnem,
                          pastEditions: c.pastEditions,
                          email: c.email,
                          whatsapp: c.whatsapp,
                          birthDate: c.birthDate,
                          disability: c.disability,
                          languages: c.languages,
                          pixKey: c.pixKey,
                          referencePerson: c.referencePerson,
                          assignedRoom: c.assignedRoom,
                          status: c.status,
                          attendanceStatus: c.attendanceStatus,
                          refusedRole: c.refusedRole,
                          refusalTag: c.refusalTag,
                          createdAt: c.createdAt,
                          isExternalRecruit: c.isExternalRecruit,
                          materialsAccessed: c.materialsAccessed,
                          transferHistory: c.transferHistory
                        })}
                      />
                      <div className="grow min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{c.name}</div>
                          {c.isExternalRecruit && (
                            <span className="text-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-extrabold border border-indigo-500/20 px-1.5 rounded shrink-0">RECRUTA_EXTERNO</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-450 font-mono mt-0.5">{c.email} | {c.whatsapp}</div>
                        {c.referencePerson && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 flex items-center gap-1">
                            <span>👤 Indicação / Ref:</span>
                            <span className="underline">{c.referencePerson}</span>
                          </div>
                        )}
                        
                        {/* Tags line: CLA Tag, Reserve/Role Tag, Transfer request tag, Material Access Tag */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {/* Origin CLA TAG */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20" title={`Cadastrado no CLA: ${originName}`}>
                            <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>CLA: {originName}</span>
                          </span>

                          {c.materialsAccessed && c.materialsAccessed.length > 0 && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                              title={c.materialsAccessed.map(m => `• ${m.materialTitle} (${new Date(m.accessedAt).toLocaleString("pt-BR")})`).join("\n")}
                            >
                              <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>Material Acessado ({c.materialsAccessed.length})</span>
                            </span>
                          )}

                          {(c.refusedRole || c.refusalTag) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30" title={`Recusa: ${c.refusalTag || c.refusedRole}`}>
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>{c.refusalTag || `Recusa de trabalho na função ${c.refusedRole}`}</span>
                            </span>
                          )}

                          {c.status === "Pendente" ? (
                            <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                              <span>⏳ Aguardando Aprovação</span>
                            </span>
                          ) : c.status === "Recusado" ? (
                            <span className="bg-rose-500/15 text-rose-700 dark:text-rose-300 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-rose-500/30">
                              Recusado
                            </span>
                          ) : c.isReserve ? (
                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-500/20">
                              RESERVA
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-500/20">
                              {c.assignedRole || "Não Definido"}: {c.assignedRoom || "Sem Sala (Arraste)"}
                            </span>
                          )}

                          {c.transferRequest && c.transferRequest.status === "Pendente" && (
                            <button
                              type="button"
                              onClick={() => onOpenTransferRequests?.()}
                              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-black text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-500/40 animate-pulse cursor-pointer flex items-center gap-1"
                              title="Clique para abrir e responder ao pedido de liberação"
                            >
                              <span>⏳ Pedido de Liberação Pendente</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Experiência no ENEM e Função Especial */}
                  <td className="p-4">
                    <div className="space-y-1.5 max-w-[280px]">
                      {c.specialRole && c.specialRole !== "Nenhuma" && (
                        <div className="inline-block">
                          <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-black px-2.5 py-0.5 rounded-md text-[10px] border border-indigo-500/20">
                            ★ {c.specialRole}
                          </span>
                          {c.specialRole === "Tradutor e Intérprete" && c.languages && c.languages.length > 0 && (
                            <div className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 mt-0.5">Idiomas: {c.languages.join(", ")}</div>
                          )}
                        </div>
                      )}
                      {c.pastEditions && c.pastEditions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.pastEditions.map((pe, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20"
                            >
                              <span className="font-black font-mono text-amber-700 dark:text-amber-400">{pe.year}:</span>
                              <span>{pe.role || "Fiscal"}</span>
                            </span>
                          ))}
                        </div>
                      ) : c.hasWorkedEnem ? (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                          <span>✓ Já atuou em edições anteriores</span>
                        </div>
                      ) : (c.specialRole === "Nenhuma" || !c.specialRole) ? (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          Novo / Sem experiência anterior
                        </div>
                      ) : null}
                    </div>
                  </td>

                  {/* Education / disability */}
                  <td className="p-4">
                    <div className="text-slate-705 dark:text-slate-300 font-extrabold text-xs">{c.education}</div>
                    <div className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">PCD: {c.disability}</div>
                  </td>

                  {/* Confirmation status */}
                  <td className="p-4">
                    {c.attendanceStatus === "Confirmado" ? (
                      <span className="bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 w-fit shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Presença Confirmada</span>
                      </span>
                    ) : (c.attendanceStatus === "Recusado" || c.refusedRole) ? (
                      <span className="bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 w-fit shadow-xs" title={c.refusalTag || `Recusou: ${c.refusedRole}`}>
                        <X className="w-3 h-3 stroke-[3]" />
                        <span>Recusou Função</span>
                      </span>
                    ) : c.assignedRole ? (
                      <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 w-fit border border-amber-500/30">
                        <span>⏳ Aguardando Fiscal</span>
                      </span>
                    ) : (
                      <span className={`font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full ${c.status === "Confirmado" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : c.status === "Recusado" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
                        {c.status === "Confirmado" ? "Cad. Autorizado" : c.status}
                      </span>
                    )}
                  </td>

                  {/* Quick trigger Actions */}
                  <td className="p-4 text-right font-bold">
                    <div className="flex justify-end gap-1.5 items-center">
                      <button
                        onClick={() => sendEmailNotification(c)}
                        title="Enviar ou reenviar solicitação de confirmação por e-mail"
                        className="p-2 hover:bg-indigo-500/10 rounded-xl text-indigo-500 dark:hover:bg-indigo-500/15 cursor-pointer border border-transparent hover:border-indigo-550/20 active:scale-90 transition-all"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStartEdit(c)}
                        title="Editar Registro de Colaborador"
                        className="p-2 hover:bg-teal-500/10 rounded-xl text-teal-500 hover:text-teal-600 cursor-pointer border border-transparent hover:border-teal-555/20 active:scale-95 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {c.status === "Pendente" ? (
                        <button
                          onClick={() => confirmStaff(c.id!)}
                          title="Aprovar cadastro e integrar à reserva de fiscais"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg shadow-sm hover:scale-105 cursor-pointer active:scale-90 transition-all flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Aprovar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => confirmStaff(c.id!)}
                          title="Confirmar / Revalidar Colaborador"
                          className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:scale-105 rounded-lg text-emerald-500 font-extrabold cursor-pointer active:scale-90 transition-all text-sm"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => refuseStaff(c.id!)}
                        title="Recusar Participante"
                        className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:scale-105 rounded-lg text-rose-550 font-extrabold cursor-pointer active:scale-90 transition-all text-sm"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => onDelete(c.id!)}
                        title="Excluir Colaborador"
                        className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 cursor-pointer border border-transparent hover:border-rose-550/20 active:scale-95 transition-all"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function activeTabSubAddForm(
  activeSubTab: string,
  name: string,
  setName: any,
  photoUrl: string,
  setPhotoUrl: any,
  birthDate: string,
  setBirthDate: any,
  cpf: string,
  setCpf: any,
  whatsapp: string,
  setWhatsapp: any,
  email: string,
  setEmail: any,
  education: string,
  setEducation: any,
  disability: string,
  setDisability: any,
  hasWorkedEnem: boolean,
  setHasWorkedEnem: any,
  pixKey: string,
  setPixKey: any,
  referencePerson: string,
  setReferencePerson: any,
  specialRole: string,
  setSpecialRole: any,
  languages: string,
  setLanguages: any,
  isReserve: boolean,
  setIsReserve: any,
  showPastYears: boolean,
  setShowPastYears: any,
  availableYears: number[],
  pastEditionsSelected: Record<number, boolean>,
  setPastEditionsSelected: any,
  pastEditionsRoles: Record<number, string>,
  setPastEditionsRoles: any,
  handleCreateCollaboratorSubmit: any,
  handleCpfChange: any,
  handlePhoneChange: any,
  handleBirthDateChange: any
) {
  if (activeSubTab !== "add") return null;

  return (
    <form onSubmit={handleCreateCollaboratorSubmit} className="space-y-6 text-sm bg-slate-50 dark:bg-[#070b13]/60 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#1e293b]">
      <h3 className="text-base font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
        <span>👤</span> Form Cadastro Individual
      </h3>

      <PhotoUploader
        photoUrl={photoUrl}
        onChange={setPhotoUrl}
        name={name || "Novo Fiscal"}
        label="Foto de Identificação do Fiscal"
        helpText="Faça o upload de uma foto clara do colaborador para uso nos relatórios, listagens e crachás."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Nome Completo (Sem Caps-lock total)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Carlos Costa Neto"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-semibold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Data Nascimento</label>
          <input
            type="text"
            value={birthDate}
            onChange={(e) => handleBirthDateChange(e.target.value)}
            placeholder="DD/MM/AAAA"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-semibold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">CPF (com hífen e pontos)</label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => handleCpfChange(e.target.value)}
            placeholder="Ex: 403.401.503-12"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-mono font-bold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">WhatsApp</label>
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="Ex: (87) 98123-4567"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-mono font-bold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ex: carlos@email.com"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-semibold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Chave PIX</label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="Chave Pix para repasse Cebraspe"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-mono font-bold"
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Pessoa de Referência</label>
          <input
            type="text"
            value={referencePerson}
            onChange={(e) => setReferencePerson(e.target.value)}
            placeholder="Ex: MARIA"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-semibold"
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 font-medium leading-relaxed">
            Informe aqui o nome da pessoa (amigo, parente ou familiar) que lhe indicou para esse CLA. Exemplo: Minha amiga MARIA conversou com o CLA para me indicar para os trabalhos desse ano, então na referência eu digito MARIA.
          </span>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Grau de Escolaridade</label>
          <select
            value={education}
            onChange={(e) => setEducation(e.target.value as any)}
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-800 dark:text-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
          >
            <option value="Ensino Fundamental (Alfabetizado)">Ensino Fundamental (Alfabetizado)</option>
            <option value="Ensino Médio">Ensino Médio</option>
            <option value="Ensino Técnico">Ensino Técnico</option>
            <option value="Ensino Superior Cursando">Ensino Superior Cursando</option>
            <option value="Ensino Superior Completo">Ensino Superior Completo</option>
            <option value="Pós-Graduação">Pós-Graduação</option>
            <option value="Mestrado">Mestrado</option>
            <option value="Doutorado">Doutorado</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Necessidade Física PCD</label>
          <input
            type="text"
            value={disability}
            onChange={(e) => setDisability(e.target.value)}
            placeholder="Escreva PCD ou Nenhuma"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden text-xs font-semibold"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Função de Apoio / Especialização</label>
          <select
            value={specialRole}
            onChange={(e) => setSpecialRole(e.target.value as any)}
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-800 dark:text-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
          >
            <option value="Nenhuma">Nenhuma / Fiscal de Sala Padrão</option>
            <option value="Libras">Libras (Intérprete)</option>
            <option value="Tradutor e Intérprete">Tradutor e Intérprete</option>
            <option value="Técnico de Informática">Técnico de Informática</option>
            <option value="Auxiliar de Acessibilidade">Auxiliar de Acessibilidade</option>
            <option value="Ledor/Transcritor">Ledor/Transcritor Especializado</option>
            <option value="Apenas Ledor">Apenas Ledor</option>
            <option value="Leitor transcritor espanhol">Leitor transcritor espanhol</option>
            <option value="Leitor transcritor inglês">Leitor transcritor inglês</option>
            <option value="Apenas leitor espanhol">Apenas leitor espanhol</option>
            <option value="Apenas leitor inglês">Apenas leitor inglês</option>
          </select>
        </div>


      </div>

      {/* Checklist ENEM Worked years */}
      <div className="pt-2">
        <div className="p-4 bg-white dark:bg-[#101726]/40 border-2 border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-inner">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Histórico em edições do ENEM (1998 a 2025)</span>
          </div>

          <details className="text-xs bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 cursor-pointer group">
            <summary className="font-extrabold text-indigo-600 dark:text-indigo-400 select-none flex items-center gap-1.5 focus:outline-hidden hover:text-indigo-500">
              <span>📚</span> Ver Lista de Funções Oficiais do ENEM (Cheatsheet)
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 cursor-default">
              {ENEM_ROLES.map((role) => (
                <div key={role.name} className="p-2.5 bg-white dark:bg-[#101726] border border-slate-150 dark:border-slate-800 rounded-lg text-[11px] hover:border-indigo-400 transition">
                  <div className="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400 gap-1.5 flex-wrap">
                    <span>{role.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedRoles = { ...pastEditionsRoles };
                        Object.keys(pastEditionsSelected).forEach((yr) => {
                          if (pastEditionsSelected[parseInt(yr)]) {
                            updatedRoles[parseInt(yr)] = role.name;
                          }
                        });
                        setPastEditionsRoles(updatedRoles);
                      }}
                      className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded hover:bg-emerald-500/20 cursor-pointer font-bold"
                    >
                      Aplicar aos marcados
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{role.desc}</p>
                </div>
              ))}
            </div>
          </details>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {availableYears.map((yr) => (
              <div key={yr} className={`flex flex-col p-2 border-2 rounded-xl transition ${pastEditionsSelected[yr] ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-50 dark:bg-[#070b13]/50 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'}`}>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={!!pastEditionsSelected[yr]}
                    onChange={(e) => setPastEditionsSelected({
                      ...pastEditionsSelected,
                      [yr]: e.target.checked
                    })}
                    className="rounded text-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-mono text-slate-900 dark:text-white font-black">{yr}</span>
                </label>
                {pastEditionsSelected[yr] && (
                  <input
                    type="text"
                    placeholder="Chefe de Setor, Fiscal, etc."
                    list="enem-roles-list"
                    value={pastEditionsRoles[yr] || ""}
                    onChange={(e) => setPastEditionsRoles({
                      ...pastEditionsRoles,
                      [yr]: e.target.value
                    })}
                    className="mt-1.5 border-2 border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-[10px] bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          className="btn-3d btn-3d-secondary rounded-xl px-6 py-3 font-extrabold text-xs shadow-lg"
        >
          SALVAR INSCRIÇÃO INDIVIDUAL
        </button>
      </div>
    </form>
  );
}

function activeTabSubImport(
  activeSubTab: string,
  fileInputRef: React.RefObject<HTMLInputElement | null>,
  parseStatus: string,
  parseErrors: { row: number; name: string; message: string }[],
  handleSpreadsheetImport: any
) {
  if (activeSubTab !== "import") return null;

  return (
    <div className="p-6 bg-slate-50 dark:bg-[#070b13]/60 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_#1e293b]">
      <div className="flex flex-col lg:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-display font-black text-slate-850 dark:text-white uppercase tracking-wider">Planilha de Importação (Modelo XLS)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">O sistema aceita importações de planilhas seguindo o modelo oficial estruturado com os dados cadastrais do fiscal.</p>
        </div>

        <button
          onClick={downloadCsvTemplate}
          className="btn-3d btn-3d-accent rounded-xl px-4 py-2.5 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>BAIXAR MODELO XLS (CSV)</span>
        </button>
      </div>

      {/* Visual representation of the spreadsheet headers - matches uploaded image */}
      <div>
        <p className="text-[10px] uppercase font-black text-indigo-500 dark:text-indigo-400 mb-2 tracking-wider">Mapeamento de Colunas do Arquivo XLS / CSV:</p>
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#101726]/40 shadow-inner text-xs font-sans">
          <div className="grid grid-cols-6 bg-slate-100 dark:bg-[#070b13] border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">A</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">B</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">C</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">D</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">E</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">F</div>
          </div>
          <div className="grid grid-cols-6 divide-x divide-slate-200 dark:divide-slate-800 font-bold font-mono text-[9px] uppercase tracking-wide text-slate-700 dark:text-slate-300 text-center bg-slate-50/50 dark:bg-[#101726]/20">
            <div className="p-2 truncate bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-350">Nome</div>
            <div className="p-2 truncate bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-350">CPF</div>
            <div className="p-2 truncate">D. Nascimento</div>
            <div className="p-2 truncate">Telefone</div>
            <div className="p-2 truncate">Email</div>
            <div className="p-2 truncate">Escolaridade</div>
          </div>
          <div className="grid grid-cols-6 divide-x divide-slate-150 dark:divide-slate-850 font-mono text-[9px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-800 p-1.5 bg-white dark:bg-[#101726]/40">
            <div className="p-1.5 truncate">Ex: Carlos Silva</div>
            <div className="p-1.5 truncate">Ex: 40320189844</div>
            <div className="p-1.5 truncate">Ex: 05/12/1988</div>
            <div className="p-1.5 truncate">Ex: 11987654321</div>
            <div className="p-1.5 truncate">Ex: carlos@email.com</div>
            <div className="p-1.5 truncate">Ex: Ensino Médio</div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-440 mt-1.5 leading-relaxed">
          💡 <strong>Dica de Compatibilidade:</strong> Ao exportar do Excel, salve como <strong>CSV Separado por Semicolons (;)</strong> ou CSV Utf-8. O validador integrado CalanguS processará a formatação e preencherá automaticamente os detalhes cadastrais no painel.
        </p>
      </div>

      {/* Error and validation logs */}
      {parseStatus === "rejected" && (
        <div className="p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl text-rose-800 dark:text-rose-455 space-y-3 shadow-sm animate-pulse">
          <h4 className="font-black text-sm flex items-center gap-2 text-rose-700 dark:text-rose-400 uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <span>Planilha Rejeitada pelo Validador CalanguS</span>
          </h4>
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-bold">
            Para garantir o alinhamento com a base Orion Cebraspe, **todas as inscrições da planilha foram abortadas em tempo real**. Foram encontradas informações inválidas (como nomes 100% em caixa alta, CPF incorreto ou e-mail com formato inadequado). Por favor, repare-os e envie novamente.
          </p>

          <div className="border-2 border-rose-500/20 bg-white dark:bg-slate-950 rounded-xl p-3 max-h-[190px] overflow-y-auto shadow-inner">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-800 text-[9px] uppercase font-black tracking-wider text-rose-500 pb-1">
                  <th className="py-1">Linha Planilha</th>
                  <th className="py-1">Candidato / Coluna</th>
                  <th className="py-1">Erro de Auditoria Detectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {parseErrors.map((err, idx) => (
                  <tr key={idx} className="hover:bg-rose-500/5">
                    <td className="py-1.5 font-mono text-xs text-slate-400 dark:text-slate-500">{err.row}</td>
                    <td className="py-1.5 font-black text-slate-805 dark:text-white">{err.name}</td>
                    <td className="py-1.5 text-rose-605 dark:text-rose-400 font-bold font-mono text-[11px]">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DROP AREA */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 bg-white dark:bg-[#101726]/30 text-center flex flex-col items-center justify-center space-y-3 shadow-inner">
        <Upload className="w-10 h-10 text-slate-400 dark:text-slate-700 animate-bounce" />
        <div>
          <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Arraste seu arquivo .csv/.xls aqui</p>
          <p className="text-xs text-slate-450 dark:text-slate-450 mt-1 font-semibold">Tamanho máximo suportado: 800KB por upload</p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleSpreadsheetImport}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-3d btn-3d-secondary rounded-xl px-4 py-2 text-xs font-black shadow-md cursor-pointer uppercase"
        >
          Selecionar Arquivo do Computador
        </button>
      </div>
    </div>
  );
}
