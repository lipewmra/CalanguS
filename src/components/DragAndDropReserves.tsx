import React, { useState, useMemo } from "react";
import { CollaboratorInfo, RoomDetails, BuildingInfo, EventConfigInfo } from "../types";
import { getRoomTargetRequirements, calculateBuildingTargetQuantities, calculateOfficialTier } from "../lib/metrics-calculator";
import CollaboratorFailureModal from "./CollaboratorFailureModal";
import FiscalAvatar from "./FiscalAvatar";
import ImageLightboxModal, { LightboxData } from "./ImageLightboxModal";
import { 
  Users, ShieldAlert, BadgeInfo, HelpCircle, CornerDownRight, 
  Check, MoveRight, ArrowRight, UserCheck, Inbox, RefreshCw, Building2, 
  AlertCircle, Printer, Download, Sparkles, X, UserPlus, ArrowRightLeft,
  FileSpreadsheet, FileText, CheckCircle2, ChevronRight, Search, Shield,
  ExternalLink, Copy, CheckCheck, Eye, Filter, Footprints, Bath, Award,
  ChevronDown, ChevronUp, Layers, SlidersHorizontal, Trash2, KeyRound,
  DoorClosed, Settings2, Phone, CheckSquare, Square, TableProperties, ArrowUpDown
} from "lucide-react";
import { ENEM_ROLES } from "./CollaboratorManager";

export type ExportTemplateType = 
  | "chefe_de_sala" 
  | "aplicadores" 
  | "volantes" 
  | "banheiro" 
  | "limpeza" 
  | "porteiro" 
  | "ensalamento" 
  | "predio" 
  | "personalizado";

export type ExportSortType = "function_alphabetical" | "alphabetical" | "room_alphabetical";

export const ROLE_HIERARCHY_RANK: Record<string, number> = {
  "chefe de sala": 1,
  "chefe": 1,
  "aplicador": 2,
  "fiscal de sala": 2,
  "fiscal volante / corredor": 3,
  "fiscal volante": 3,
  "volante": 3,
  "corredor": 3,
  "fiscal de banheiro": 4,
  "banheiro": 4,
  "auxiliar de limpeza": 5,
  "limpeza": 5,
  "porteiro": 6,
  "portaria": 6,
  "representante do local": 7,
  "representante": 7,
  "técnico de informática": 8,
  "tecnico de informatica": 8,
  "informática": 8,
  "informatica": 8,
  "ti": 8,
  "fiscal especializado": 9,
  "intérprete de libras": 10,
  "interprete de libras": 10,
  "ledor/transcritor": 11,
  "guia-intérprete": 12,
  "guia-interprete": 12,
  "apoio": 13,
  "reserva": 90,
};

export function getRoleRank(role?: string): number {
  if (!role) return 50;
  const r = role.toLowerCase().trim();
  for (const [key, rank] of Object.entries(ROLE_HIERARCHY_RANK)) {
    if (r === key || r.includes(key)) return rank;
  }
  return 50;
}

export interface CustomExportConfig {
  selectedRoles: string[];
  selectedColumns: ("nome" | "cpf" | "telefone" | "funcao" | "sala" | "andar" | "status" | "assinatura")[];
  allocationStatusFilter: "all" | "allocated" | "unallocated";
  groupBy: "room" | "role" | "none";
}

export interface OperationalSectorConfig {
  id: string;
  name: string;
  shortName: string;
  defaultRole: string;
  icon: string;
  iconBg: string;
  themeColor: "indigo" | "cyan" | "amber" | "emerald" | "rose" | "sky";
  desc: string;
}

export const OPERATIONAL_SECTORS: OperationalSectorConfig[] = [
  {
    id: "volante",
    name: "Fiscal Volante / Corredor",
    shortName: "Fiscal Volante",
    defaultRole: "Fiscal Volante / Corredor",
    icon: "🏃",
    iconBg: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    themeColor: "indigo",
    desc: "Circulação nas áreas comuns, apoio nos corredores e condução de participantes.",
  },
  {
    id: "banheiro",
    name: "Fiscal de Banheiro",
    shortName: "Fiscal de Banheiro",
    defaultRole: "Fiscal de Banheiro",
    icon: "🚻",
    iconBg: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    themeColor: "cyan",
    desc: "Inspeção e vistoria eletrônica com detector de metais nos sanitários masculino e feminino.",
  },
  {
    id: "limpeza",
    name: "Auxiliar de Limpeza",
    shortName: "Auxiliar de Limpeza",
    defaultRole: "Auxiliar de Limpeza",
    icon: "🧹",
    iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    themeColor: "amber",
    desc: "Higienização periódica contínua dos banheiros, salas de prova e descarte de resíduos.",
  },
  {
    id: "porteiro",
    name: "Porteiro",
    shortName: "Porteiro",
    defaultRole: "Porteiro",
    icon: "🚪",
    iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    themeColor: "emerald",
    desc: "Controle de abertura/fechamento pontual dos portões de acesso do prédio e triagem inicial.",
  },
  {
    id: "representante",
    name: "Representante do Local",
    shortName: "Representante do Local",
    defaultRole: "Representante do Local",
    icon: "🏛️",
    iconBg: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
    themeColor: "rose",
    desc: "Responsável institucional pelo prédio escolar, infraestrutura predial e apoio de ligação ao CLA.",
  },
  {
    id: "informatica",
    name: "Técnico de Informática",
    shortName: "Técnico de Informática",
    defaultRole: "Técnico de Informática",
    icon: "💻",
    iconBg: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30",
    themeColor: "sky",
    desc: "Suporte especializado aos computadores, videoprova em Libras e tecnologia do prédio.",
  }
];

export interface TemplateMeta {
  id: ExportTemplateType;
  title: string;
  shortTitle: string;
  badge: string;
  iconName: "award" | "user-check" | "footprints" | "bath" | "sparkles" | "door" | "layers" | "building" | "sliders";
  fieldsDescription: string;
  description: string;
  defaultColumns: ("nome" | "cpf" | "telefone" | "funcao" | "sala" | "andar" | "status" | "assinatura")[];
  colorScheme: "amber" | "indigo" | "sky" | "cyan" | "emerald" | "slate" | "teal" | "purple" | "rose";
}

export const EXPORT_TEMPLATES: TemplateMeta[] = [
  {
    id: "chefe_de_sala",
    title: "Chefe de Salas",
    shortTitle: "Chefes de Sala",
    badge: "Liderança de Sala",
    iconName: "award",
    fieldsDescription: "Nome, CPF, Telefone, Sala alocada",
    description: "Lista de Chefes de Sala com contatos telefônicos e salas designadas.",
    defaultColumns: ["nome", "cpf", "telefone", "sala", "assinatura"],
    colorScheme: "amber"
  },
  {
    id: "aplicadores",
    title: "Aplicadores",
    shortTitle: "Aplicadores de Sala",
    badge: "Fiscais de Sala",
    iconName: "user-check",
    fieldsDescription: "Nome, CPF, Telefone, Sala alocada",
    description: "Lista completa de Fiscais Aplicadores e respectivas salas de prova.",
    defaultColumns: ["nome", "cpf", "telefone", "sala", "assinatura"],
    colorScheme: "indigo"
  },
  {
    id: "volantes",
    title: "Volantes",
    shortTitle: "Fiscais Volantes",
    badge: "Corredor & Apoio",
    iconName: "footprints",
    fieldsDescription: "Nome, CPF, Telefone, Sala alocada",
    description: "Equipe de Fiscais Volantes para apoio nos corredores e trânsito de participantes.",
    defaultColumns: ["nome", "cpf", "telefone", "sala", "assinatura"],
    colorScheme: "sky"
  },
  {
    id: "banheiro",
    title: "Banheiro",
    shortTitle: "Fiscais de Banheiro",
    badge: "Vistoria Eletrônica",
    iconName: "bath",
    fieldsDescription: "Nome, CPF, Telefone, Sala alocada",
    description: "Fiscais de Banheiro encarregados da vistoria eletrônica e sanitários.",
    defaultColumns: ["nome", "cpf", "telefone", "sala", "assinatura"],
    colorScheme: "cyan"
  },
  {
    id: "limpeza",
    title: "Limpeza",
    shortTitle: "Auxiliares de Limpeza",
    badge: "Conservação Predial",
    iconName: "sparkles",
    fieldsDescription: "Nome, CPF, Telefone, Sala alocada",
    description: "Auxiliares de limpeza e higienização durante todo o período do exame.",
    defaultColumns: ["nome", "cpf", "telefone", "sala", "assinatura"],
    colorScheme: "emerald"
  },
  {
    id: "porteiro",
    title: "Porteiro",
    shortTitle: "Porteiros & Acesso",
    badge: "Controle de Portaria",
    iconName: "door",
    fieldsDescription: "Nome, CPF, Telefone, Sala alocada",
    description: "Equipe de Portaria para abertura, triagem e controle de acesso aos portões.",
    defaultColumns: ["nome", "cpf", "telefone", "sala", "assinatura"],
    colorScheme: "slate"
  },
  {
    id: "ensalamento",
    title: "Ensalamento Geral",
    shortTitle: "Chefes + Aplicadores",
    badge: "União das Salas",
    iconName: "layers",
    fieldsDescription: "Chefes de Sala + Aplicadores (Nome, CPF, Telefone, Sala alocada)",
    description: "União completa de Chefes de Sala e Aplicadores agrupados por sala de aula.",
    defaultColumns: ["nome", "cpf", "telefone", "funcao", "sala", "andar", "assinatura"],
    colorScheme: "teal"
  },
  {
    id: "predio",
    title: "Prédio Completo",
    shortTitle: "Equipe do Prédio",
    badge: "Chefes + Aplic. + Volantes + Banheiro",
    iconName: "building",
    fieldsDescription: "Chefes + Aplicador + Volantes + Banheiro (+ Apoio)",
    description: "Consolidado geral unindo todas as funções operacionais do prédio de provas.",
    defaultColumns: ["nome", "cpf", "telefone", "funcao", "sala", "assinatura"],
    colorScheme: "purple"
  },
  {
    id: "personalizado",
    title: "Personalizado",
    shortTitle: "Customizado",
    badge: "Configuração Livre",
    iconName: "sliders",
    fieldsDescription: "Deixar o usuário escolher cargos, colunas e filtros",
    description: "Filtre funções, colunas e status de alocação de forma totalmente flexível.",
    defaultColumns: ["nome", "cpf", "telefone", "funcao", "sala", "assinatura"],
    colorScheme: "rose"
  }
];

function isCollabInTemplate(
  c: CollaboratorInfo,
  template: ExportTemplateType,
  customCfg: CustomExportConfig,
  rooms: RoomDetails[],
  isChefeDeSalaRole: (r?: string) => boolean,
  isAplicadorRole: (r?: string) => boolean,
  isRoleMatchingSector: (r: string | undefined, sectorId: string) => boolean,
  isCollabInSector: (c: CollaboratorInfo, s: OperationalSectorConfig) => boolean
): boolean {
  // Apenas colaboradores alocados em salas ou postos/setores do Menu 4
  const isAllocated = !c.isReserve && !!c.assignedRoom && c.assignedRoom.trim() !== "";

  if (template === "chefe_de_sala") {
    return isAllocated && isChefeDeSalaRole(c.assignedRole);
  }
  if (template === "aplicadores") {
    return isAllocated && isAplicadorRole(c.assignedRole);
  }
  if (template === "volantes") {
    return isAllocated && (isRoleMatchingSector(c.assignedRole, "volante") || isCollabInSector(c, OPERATIONAL_SECTORS[0]));
  }
  if (template === "banheiro") {
    return isAllocated && (isRoleMatchingSector(c.assignedRole, "banheiro") || isCollabInSector(c, OPERATIONAL_SECTORS[1]));
  }
  if (template === "limpeza") {
    return isAllocated && (isRoleMatchingSector(c.assignedRole, "limpeza") || isCollabInSector(c, OPERATIONAL_SECTORS[2]));
  }
  if (template === "porteiro") {
    return isAllocated && (isRoleMatchingSector(c.assignedRole, "porteiro") || isCollabInSector(c, OPERATIONAL_SECTORS[3]));
  }
  if (template === "ensalamento") {
    // Apenas alocados em salas de provas com funções de chefia ou aplicação
    return isAllocated && (
      isChefeDeSalaRole(c.assignedRole) ||
      isAplicadorRole(c.assignedRole) ||
      rooms.some(r => r.number === c.assignedRoom)
    );
  }
  if (template === "predio") {
    // Unir todas as funções operacionais alocadas no prédio
    return isAllocated;
  }
  if (template === "personalizado") {
    let roleMatches = false;
    if (customCfg.selectedRoles.includes("Chefe de Sala") && isChefeDeSalaRole(c.assignedRole)) roleMatches = true;
    if (customCfg.selectedRoles.includes("Aplicador") && isAplicadorRole(c.assignedRole)) roleMatches = true;
    if (customCfg.selectedRoles.includes("Volante") && (isRoleMatchingSector(c.assignedRole, "volante") || isCollabInSector(c, OPERATIONAL_SECTORS[0]))) roleMatches = true;
    if (customCfg.selectedRoles.includes("Banheiro") && (isRoleMatchingSector(c.assignedRole, "banheiro") || isCollabInSector(c, OPERATIONAL_SECTORS[1]))) roleMatches = true;
    if (customCfg.selectedRoles.includes("Limpeza") && (isRoleMatchingSector(c.assignedRole, "limpeza") || isCollabInSector(c, OPERATIONAL_SECTORS[2]))) roleMatches = true;
    if (customCfg.selectedRoles.includes("Porteiro") && (isRoleMatchingSector(c.assignedRole, "porteiro") || isCollabInSector(c, OPERATIONAL_SECTORS[3]))) roleMatches = true;
    if (customCfg.selectedRoles.includes("Representante") && (isRoleMatchingSector(c.assignedRole, "representante") || isCollabInSector(c, OPERATIONAL_SECTORS[4]))) roleMatches = true;
    if (customCfg.selectedRoles.includes("TI") && (isRoleMatchingSector(c.assignedRole, "informatica") || isCollabInSector(c, OPERATIONAL_SECTORS[5]))) roleMatches = true;
    if (customCfg.selectedRoles.includes("Reservas") && (c.isReserve || !c.assignedRole)) roleMatches = true;
    if (customCfg.selectedRoles.includes("Outros") && c.assignedRole && !isChefeDeSalaRole(c.assignedRole) && !isAplicadorRole(c.assignedRole)) roleMatches = true;

    if (!roleMatches) return false;

    if (customCfg.allocationStatusFilter === "allocated") {
      return isAllocated;
    }
    if (customCfg.allocationStatusFilter === "unallocated") {
      return !isAllocated;
    }
    return isAllocated;
  }
  return isAllocated;
}

interface DragAndDropProps {
  collaborators: CollaboratorInfo[];
  rooms: RoomDetails[];
  building?: BuildingInfo | null;
  claName?: string;
  onMove: (collabId: string, isReserve: boolean, assignedRoom: string, updatedRole?: string) => void;
  onUpdateCollaborator?: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  onSubstitute?: (replacedId: string, replacementId: string, roomNumber: string, targetRole?: string) => Promise<void>;
  eventConfig?: EventConfigInfo | null;
  onSaveBuilding?: (building: BuildingInfo) => Promise<void>;
}

export default function DragAndDropReserves({ 
  collaborators, 
  rooms, 
  building, 
  claName, 
  onMove,
  onUpdateCollaborator,
  onSubstitute,
  eventConfig = null,
  onSaveBuilding
}: DragAndDropProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [diagnoseCollab, setDiagnoseCollab] = useState<CollaboratorInfo | null>(null);
  const [lightboxData, setLightboxData] = useState<LightboxData | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Selected filter: "all" | "available" | "allocated" | "unallocated_with_role" | "sem_funcao" | specific role name
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [onlyUnallocatedToggle, setOnlyUnallocatedToggle] = useState<boolean>(false);

  // Export Templates State
  const [selectedExportTemplate, setSelectedExportTemplate] = useState<ExportTemplateType>("ensalamento");
  const [exportSortBy, setExportSortBy] = useState<ExportSortType>("function_alphabetical");
  const [exportSearchQuery, setExportSearchQuery] = useState<string>("");
  const [customExportConfig, setCustomExportConfig] = useState<CustomExportConfig>({
    selectedRoles: ["Chefe de Sala", "Aplicador", "Volante", "Banheiro", "Limpeza", "Porteiro"],
    selectedColumns: ["nome", "cpf", "telefone", "funcao", "sala", "assinatura"],
    allocationStatusFilter: "allocated",
    groupBy: "room"
  });

  // Modals state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [allocatingCollab, setAllocatingCollab] = useState<CollaboratorInfo | null>(null);
  const [substitutingTarget, setSubstitutingTarget] = useState<{ collab: CollaboratorInfo; roomNumber: string } | null>(null);
  
  // Managing Room modal
  const [managingRoom, setManagingRoom] = useState<RoomDetails | null>(null);
  const [roomModalRoleFilter, setRoomModalRoleFilter] = useState<string>("all");
  const [roomModalSearch, setRoomModalSearch] = useState<string>("");
  const [roomModalOnlyUnallocated, setRoomModalOnlyUnallocated] = useState<boolean>(false);

  // Managing Operational Sector modal (Volantes, Banheiro, Limpeza, Porteiro, Representante, TI)
  const [managingSector, setManagingSector] = useState<OperationalSectorConfig | null>(null);
  const [sectorModalRoleFilter, setSectorModalRoleFilter] = useState<string>("all");
  const [sectorModalSearch, setSectorModalSearch] = useState<string>("");
  const [sectorModalOnlyUnallocated, setSectorModalOnlyUnallocated] = useState<boolean>(false);

  // Form states for Allocation modal
  const [selectedTargetRoom, setSelectedTargetRoom] = useState<string>("");
  const [selectedTargetRole, setSelectedTargetRole] = useState<string>("Aplicador (Fiscal de Sala)");

  // Form states for Substitution modal
  const [substituteCandidateId, setSubstituteCandidateId] = useState<string>("");
  const [substituteSearchQuery, setSubstituteSearchQuery] = useState<string>("");
  const [substituteRole, setSubstituteRole] = useState<string>("Aplicador (Fiscal de Sala)");

  // Approved collaborators
  const approvedCollaborators = useMemo(() => {
    return collaborators.filter(c => c.status === "Confirmado");
  }, [collaborators]);

  const pendingCount = useMemo(() => {
    return collaborators.filter(c => c.status === "Pendente").length;
  }, [collaborators]);

  // Unallocated are those who do not have an assignedRoom
  const unallocated = useMemo(() => {
    return approvedCollaborators.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "");
  }, [approvedCollaborators]);
  
  // Reserves: unallocated AND (isReserve === true OR no assignedRole)
  const unallocatedReservas = useMemo(() => {
    return unallocated.filter(c => c.isReserve || !c.assignedRole || c.assignedRole.trim() === "");
  }, [unallocated]);

  // Target Quantities calculated from building inventory and official metrics
  const buildingTargetQuantities = useMemo(() => {
    return calculateBuildingTargetQuantities(building || null, eventConfig?.collaboratorMetrics || undefined);
  }, [building, eventConfig]);

  // Helper to test if a role is Chefe de Sala
  const isChefeDeSalaRole = (role?: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes("chefe de sala") || r === "chefe";
  };

  // Helper to test if a role is an Aplicador (excluding Chefe de Sala)
  const isAplicadorRole = (role?: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return (r.includes("aplicador") || r.includes("fiscal de sala")) && !r.includes("chefe de sala");
  };

  // Helper to test if a role matches a sector
  const isRoleMatchingSector = (role: string | undefined, sectorId: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    if (sectorId === "volante") return r.includes("volante") || r.includes("corredor");
    if (sectorId === "banheiro") return r.includes("banheiro");
    if (sectorId === "limpeza") return r.includes("limpeza");
    if (sectorId === "porteiro") return r.includes("porteiro") || r.includes("portaria");
    if (sectorId === "representante") return r.includes("representante");
    if (sectorId === "informatica") return r.includes("informática") || r.includes("informatica") || r.includes("ti");
    return false;
  };

  // Helper to test if collaborator is in a specific sector
  const isCollabInSector = (collab: CollaboratorInfo, sector: OperationalSectorConfig) => {
    if (collab.isReserve) return false;
    const room = (collab.assignedRoom || "").trim().toLowerCase();
    const sectorName = sector.name.toLowerCase();
    const sectorShort = sector.shortName.toLowerCase();
    if (room === sectorName || room === sectorShort) return true;
    if (sector.id === "volante" && (room.includes("volante") || room.includes("corredor"))) return true;
    if (sector.id === "banheiro" && room.includes("banheiro")) return true;
    if (sector.id === "limpeza" && room.includes("limpeza")) return true;
    if (sector.id === "porteiro" && room.includes("porteiro")) return true;
    if (sector.id === "representante" && room.includes("representante")) return true;
    if (sector.id === "informatica" && (room.includes("informática") || room.includes("informatica") || room.includes("ti"))) return true;
    return false;
  };

  // Quantitative Stats: Fiscais, Chefes de Sala, Aplicadores, Volantes, Banheiro, Alocados e Reservas
  const stats = useMemo(() => {
    const totalApproved = approvedCollaborators.length;
    
    // 1. Chefes de Sala
    const chefesDeSala = approvedCollaborators.filter(c => isChefeDeSalaRole(c.assignedRole));
    const chefesDeSalaAssigned = chefesDeSala.length;
    const chefesDeSalaAllocated = chefesDeSala.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "").length;
    const chefesDeSalaAvailable = chefesDeSala.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetChefes = buildingTargetQuantities["Chefe de Sala"] ?? rooms.length;

    // 2. Aplicadores
    const aplicadores = approvedCollaborators.filter(c => isAplicadorRole(c.assignedRole));
    const aplicadoresAssigned = aplicadores.length;
    const aplicadoresAllocated = aplicadores.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "").length;
    const aplicadoresAvailable = aplicadores.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetAplicadores = buildingTargetQuantities["Aplicador"] ?? rooms.length;

    // 3. Volantes / Corredor
    const volantes = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "volante"));
    const volantesAssigned = volantes.length;
    const volantesAllocated = approvedCollaborators.filter(c => isCollabInSector(c, OPERATIONAL_SECTORS[0])).length;
    const volantesAvailable = volantes.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetVolantes = buildingTargetQuantities["Fiscal Volante / Corredor"] ?? calculateOfficialTier(rooms.length);

    // 4. Banheiro
    const banheiro = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "banheiro"));
    const banheiroAssigned = banheiro.length;
    const banheiroAllocated = approvedCollaborators.filter(c => isCollabInSector(c, OPERATIONAL_SECTORS[1])).length;
    const banheiroAvailable = banheiro.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetBanheiro = buildingTargetQuantities["Fiscal de Banheiro"] ?? calculateOfficialTier(rooms.length);

    // 5. Limpeza
    const limpeza = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "limpeza"));
    const limpezaAssigned = limpeza.length;
    const limpezaAllocated = approvedCollaborators.filter(c => isCollabInSector(c, OPERATIONAL_SECTORS[2])).length;
    const limpezaAvailable = limpeza.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetLimpeza = buildingTargetQuantities["Auxiliar de Limpeza"] ?? 2;

    // 6. Porteiro
    const porteiro = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "porteiro"));
    const porteiroAssigned = porteiro.length;
    const porteiroAllocated = approvedCollaborators.filter(c => isCollabInSector(c, OPERATIONAL_SECTORS[3])).length;
    const porteiroAvailable = porteiro.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetPorteiro = buildingTargetQuantities["Porteiro"] ?? 2;

    // 7. Representante
    const representante = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "representante"));
    const representanteAssigned = representante.length;
    const representanteAllocated = approvedCollaborators.filter(c => isCollabInSector(c, OPERATIONAL_SECTORS[4])).length;
    const representanteAvailable = representante.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetRepresentante = buildingTargetQuantities["Representante do Local"] ?? 1;

    // 8. TI
    const ti = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "informatica"));
    const tiAssigned = ti.length;
    const tiAllocated = approvedCollaborators.filter(c => isCollabInSector(c, OPERATIONAL_SECTORS[5])).length;
    const tiAvailable = ti.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;
    const targetTI = buildingTargetQuantities["Técnico de Informática"] ?? 1;

    // Demais Fiscais (especializados ou outros)
    const demaisFiscais = approvedCollaborators.filter(c => 
      c.assignedRole && 
      c.assignedRole.trim() !== "" && 
      !isChefeDeSalaRole(c.assignedRole) && 
      !isAplicadorRole(c.assignedRole)
    );
    const demaisFiscaisAssigned = demaisFiscais.length;
    const demaisFiscaisAllocated = demaisFiscais.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "").length;
    const demaisFiscaisAvailable = demaisFiscais.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "").length;

    const totalAllocatedRooms = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "" && !OPERATIONAL_SECTORS.some(s => isCollabInSector(c, s))).length;
    const totalAllocatedSectors = approvedCollaborators.filter(c => !c.isReserve && OPERATIONAL_SECTORS.some(s => isCollabInSector(c, s))).length;
    const totalReserves = approvedCollaborators.filter(c => c.isReserve || !c.assignedRole || c.assignedRole.trim() === "").length;
    
    // Collaborators with assigned role but no room / unallocated
    const unallocatedWithRole = approvedCollaborators.filter(c => c.assignedRole && c.assignedRole.trim() !== "" && (!c.assignedRoom || c.assignedRoom.trim() === "")).length;
    const unallocatedNoRole = approvedCollaborators.filter(c => !c.assignedRole || c.assignedRole.trim() === "").length;

    // Rooms with at least 1 allocated collaborator
    const roomsOccupied = new Set(approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "" && !OPERATIONAL_SECTORS.some(s => isCollabInSector(c, s))).map(c => c.assignedRoom)).size;
    const sectorsOccupied = OPERATIONAL_SECTORS.filter(s => approvedCollaborators.some(c => isCollabInSector(c, s))).length;

    return {
      totalApproved,
      chefesDeSalaAssigned,
      chefesDeSalaAllocated,
      chefesDeSalaAvailable,
      targetChefes,
      aplicadoresAssigned,
      aplicadoresAllocated,
      aplicadoresAvailable,
      targetAplicadores,
      volantesAssigned,
      volantesAllocated,
      volantesAvailable,
      targetVolantes,
      banheiroAssigned,
      banheiroAllocated,
      banheiroAvailable,
      targetBanheiro,
      limpezaAssigned,
      limpezaAllocated,
      limpezaAvailable,
      targetLimpeza,
      porteiroAssigned,
      porteiroAllocated,
      porteiroAvailable,
      targetPorteiro,
      representanteAssigned,
      representanteAllocated,
      representanteAvailable,
      targetRepresentante,
      tiAssigned,
      tiAllocated,
      tiAvailable,
      targetTI,
      demaisFiscaisAssigned,
      demaisFiscaisAllocated,
      demaisFiscaisAvailable,
      totalAllocatedRooms,
      totalAllocatedSectors,
      totalReserves,
      unallocatedWithRole,
      unallocatedNoRole,
      roomsOccupied,
      sectorsOccupied
    };
  }, [approvedCollaborators, buildingTargetQuantities, rooms.length]);

  // Dynamic active roles list mapped with Menu 3 Quantitativo & Collaborators Count
  const activeRolesList = useMemo(() => {
    const baseRoles = (building?.customRoles && building.customRoles.length > 0)
      ? building.customRoles.filter(r => !r.hidden)
      : ENEM_ROLES.map(r => ({ name: r.name, desc: r.desc }));

    return baseRoles.map(r => {
      const targetQty = buildingTargetQuantities[r.name] ?? building?.rolesTargetQuantities?.[r.name] ?? 0;
      const allAssigned = approvedCollaborators.filter(c => c.assignedRole === r.name);
      const unallocatedMembers = allAssigned.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "");
      const allocatedMembers = allAssigned.filter(c => c.assignedRoom && c.assignedRoom.trim() !== "");
      
      return {
        name: r.name,
        desc: r.desc,
        targetQty,
        totalAssigned: allAssigned.length,
        unallocatedCount: unallocatedMembers.length,
        allocatedCount: allocatedMembers.length,
        allMembers: allAssigned,
        unallocatedMembers,
        allocatedMembers
      };
    });
  }, [building, approvedCollaborators, buildingTargetQuantities]);

  // Functions that have > 0 assigned in Menu 3 OR target quantity > 0 in Menu 3
  const rolesWithQuantity = useMemo(() => {
    return activeRolesList.filter(r => r.totalAssigned > 0 || r.targetQty > 0);
  }, [activeRolesList]);

  // List of collaborators to display on the left panel based on active filter
  const displayedCollaborators = useMemo(() => {
    let list: CollaboratorInfo[] = [];

    if (selectedRoleFilter === "all") {
      list = approvedCollaborators;
    } else if (selectedRoleFilter === "available") {
      list = unallocated;
    } else if (selectedRoleFilter === "allocated") {
      list = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "");
    } else if (selectedRoleFilter === "unallocated_with_role") {
      // Tem função mas não está associado a sala/posto
      list = approvedCollaborators.filter(c => c.assignedRole && c.assignedRole.trim() !== "" && (!c.assignedRoom || c.assignedRoom.trim() === ""));
    } else if (selectedRoleFilter === "sem_funcao") {
      // Não tem função associada
      list = approvedCollaborators.filter(c => !c.assignedRole || c.assignedRole.trim() === "");
    } else if (selectedRoleFilter === "chefe_de_sala" || selectedRoleFilter === "Chefe de Sala") {
      list = approvedCollaborators.filter(c => isChefeDeSalaRole(c.assignedRole));
    } else if (selectedRoleFilter === "aplicadores" || selectedRoleFilter === "Aplicador") {
      list = approvedCollaborators.filter(c => isAplicadorRole(c.assignedRole));
    } else if (selectedRoleFilter === "volantes") {
      list = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "volante"));
    } else if (selectedRoleFilter === "banheiro") {
      list = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "banheiro"));
    } else if (selectedRoleFilter === "limpeza") {
      list = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "limpeza"));
    } else if (selectedRoleFilter === "porteiro") {
      list = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "porteiro"));
    } else if (selectedRoleFilter === "representante") {
      list = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "representante"));
    } else if (selectedRoleFilter === "ti") {
      list = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, "informatica"));
    } else if (selectedRoleFilter === "demais_fiscais") {
      list = approvedCollaborators.filter(c => c.assignedRole && c.assignedRole.trim() !== "" && !isChefeDeSalaRole(c.assignedRole) && !isAplicadorRole(c.assignedRole));
    } else if (selectedRoleFilter === "reserva") {
      list = unallocatedReservas;
    } else {
      list = approvedCollaborators.filter(c => c.assignedRole === selectedRoleFilter);
    }

    // Apply quick toggle: only unallocated / unassigned
    if (onlyUnallocatedToggle) {
      list = list.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "");
    }

    // Apply text search
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(c => {
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchCpf = (c.cpf || "").toLowerCase().includes(q);
        const matchRole = (c.assignedRole || "").toLowerCase().includes(q);
        const matchRoom = (c.assignedRoom || "").toLowerCase().includes(q);
        return matchName || matchCpf || matchRole || matchRoom;
      });
    }

    return list;
  }, [selectedRoleFilter, approvedCollaborators, unallocated, unallocatedReservas, searchFilter, onlyUnallocatedToggle]);

  // Map of room number -> { total, chefes, aplicadores } count of allocated collaborators
  const roomOccupancyMap = useMemo(() => {
    const map: Record<string, { total: number; chefes: number; aplicadores: number; outros: number }> = {};
    approvedCollaborators.forEach(c => {
      if (!c.isReserve && c.assignedRoom && c.assignedRoom.trim()) {
        const rName = c.assignedRoom.trim();
        if (!map[rName]) {
          map[rName] = { total: 0, chefes: 0, aplicadores: 0, outros: 0 };
        }
        map[rName].total += 1;
        if (isChefeDeSalaRole(c.assignedRole)) {
          map[rName].chefes += 1;
        } else if (isAplicadorRole(c.assignedRole)) {
          map[rName].aplicadores += 1;
        } else {
          map[rName].outros += 1;
        }
      }
    });
    return map;
  }, [approvedCollaborators]);

  // Filtered collaborators list inside Direct Room Management Modal
  const roomModalFilteredCollabs = useMemo(() => {
    if (!managingRoom) return [];

    let list: CollaboratorInfo[] = [];

    if (roomModalRoleFilter === "all") {
      list = approvedCollaborators;
    } else if (roomModalRoleFilter === "unallocated") {
      list = unallocated;
    } else if (roomModalRoleFilter === "unallocated_with_role") {
      list = approvedCollaborators.filter(c => c.assignedRole && c.assignedRole.trim() !== "" && (!c.assignedRoom || c.assignedRoom.trim() === ""));
    } else if (roomModalRoleFilter === "sem_funcao") {
      list = approvedCollaborators.filter(c => !c.assignedRole || c.assignedRole.trim() === "");
    } else if (roomModalRoleFilter === "current_room") {
      list = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === managingRoom.number);
    } else if (roomModalRoleFilter === "reserva") {
      list = unallocatedReservas;
    } else if (roomModalRoleFilter === "chefe_de_sala" || roomModalRoleFilter === "Chefe de Sala") {
      list = approvedCollaborators.filter(c => isChefeDeSalaRole(c.assignedRole));
    } else if (roomModalRoleFilter === "aplicadores" || roomModalRoleFilter === "Aplicador") {
      list = approvedCollaborators.filter(c => isAplicadorRole(c.assignedRole));
    } else {
      list = approvedCollaborators.filter(c => c.assignedRole === roomModalRoleFilter);
    }

    if (roomModalOnlyUnallocated) {
      list = list.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "" || c.assignedRoom === managingRoom.number);
    }

    if (roomModalSearch.trim()) {
      const q = roomModalSearch.toLowerCase().trim();
      list = list.filter(c => 
        (c.name || "").toLowerCase().includes(q) ||
        (c.cpf || "").toLowerCase().includes(q) ||
        (c.assignedRole || "").toLowerCase().includes(q) ||
        (c.assignedRoom || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [managingRoom, approvedCollaborators, unallocated, unallocatedReservas, roomModalRoleFilter, roomModalOnlyUnallocated, roomModalSearch]);

  // Filtered collaborators list inside Direct Sector Management Modal
  const sectorModalFilteredCollabs = useMemo(() => {
    if (!managingSector) return [];

    let list: CollaboratorInfo[] = [];

    if (sectorModalRoleFilter === "all") {
      list = approvedCollaborators;
    } else if (sectorModalRoleFilter === "unallocated") {
      list = unallocated;
    } else if (sectorModalRoleFilter === "unallocated_with_role") {
      list = approvedCollaborators.filter(c => c.assignedRole && c.assignedRole.trim() !== "" && (!c.assignedRoom || c.assignedRoom.trim() === ""));
    } else if (sectorModalRoleFilter === "sem_funcao") {
      list = approvedCollaborators.filter(c => !c.assignedRole || c.assignedRole.trim() === "");
    } else if (sectorModalRoleFilter === "current_sector") {
      list = approvedCollaborators.filter(c => isCollabInSector(c, managingSector));
    } else if (sectorModalRoleFilter === "reserva") {
      list = unallocatedReservas;
    } else if (sectorModalRoleFilter === "sector_default") {
      list = approvedCollaborators.filter(c => isRoleMatchingSector(c.assignedRole, managingSector.id));
    } else {
      list = approvedCollaborators.filter(c => c.assignedRole === sectorModalRoleFilter);
    }

    if (sectorModalOnlyUnallocated) {
      list = list.filter(c => !c.assignedRoom || c.assignedRoom.trim() === "" || isCollabInSector(c, managingSector));
    }

    if (sectorModalSearch.trim()) {
      const q = sectorModalSearch.toLowerCase().trim();
      list = list.filter(c => 
        (c.name || "").toLowerCase().includes(q) ||
        (c.cpf || "").toLowerCase().includes(q) ||
        (c.assignedRole || "").toLowerCase().includes(q) ||
        (c.assignedRoom || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [managingSector, approvedCollaborators, unallocated, unallocatedReservas, sectorModalRoleFilter, sectorModalOnlyUnallocated, sectorModalSearch]);

  const getSectorTarget = (sectorId: string) => {
    switch (sectorId) {
      case "volante": return stats.targetVolantes;
      case "banheiro": return stats.targetBanheiro;
      case "limpeza": return stats.targetLimpeza;
      case "porteiro": return stats.targetPorteiro;
      case "representante": return stats.targetRepresentante;
      case "informatica": return stats.targetTI;
      default: return 1;
    }
  };

  // Helper to pick a clean icon for each role
  const getRoleIcon = (roleName: string) => {
    const r = roleName.toLowerCase();
    if (r.includes("volante")) return <Footprints className="w-3.5 h-3.5 text-indigo-500" />;
    if (r.includes("banheiro")) return <Bath className="w-3.5 h-3.5 text-cyan-500" />;
    if (r.includes("chefe")) return <Award className="w-3.5 h-3.5 text-emerald-500" />;
    if (r.includes("aplicador")) return <UserCheck className="w-3.5 h-3.5 text-teal-500" />;
    if (r.includes("libras") || r.includes("ledor") || r.includes("transcritor") || r.includes("acessibilidade")) {
      return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
    }
    if (r.includes("porteiro") || r.includes("portaria")) return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    if (r.includes("limpeza")) return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
    if (r.includes("informática") || r.includes("tecnico")) return <Building2 className="w-3.5 h-3.5 text-sky-500" />;
    return <UserCheck className="w-3.5 h-3.5 text-slate-500" />;
  };

  // Drag handles
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Drop to a specific classroom
  const handleDropToRoom = (e: React.DragEvent, roomName: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;
    
    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      const role = targetCollab.assignedRole && targetCollab.assignedRole.trim() !== "" 
        ? targetCollab.assignedRole 
        : "Aplicador (Fiscal de Sala)";
      
      onMove(id, false, roomName, role);
      setSuccessMsg(`Colaborador ${targetCollab.name} alocado na ${roomName} como ${role}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Drop to an operational sector (Volantes, Banheiro, Limpeza, etc.)
  const handleDropToSector = (e: React.DragEvent, sector: OperationalSectorConfig) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;
    
    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      const role = targetCollab.assignedRole && targetCollab.assignedRole.trim() !== "" 
        ? targetCollab.assignedRole 
        : sector.defaultRole;
      
      onMove(id, false, sector.shortName, role);
      setSuccessMsg(`Colaborador ${targetCollab.name} alocado em ${sector.name} como ${role}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Drop to the Reserva (Unassociated) quadro
  const handleDropToReserves = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      onMove(id, true, "", "");
      setSuccessMsg(`${targetCollab.name} movido para Reservas.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Quick Action
  const quickAssignMobile = (collabId: string, dest: string) => {
    const targetCollab = collaborators.find(c => c.id === collabId);
    if (targetCollab) {
      if (dest === "RESERVA") {
        onMove(collabId, true, "", "");
        setSuccessMsg(`Movido para Reserva: ${targetCollab.name}`);
      } else if (dest === "DESALOCAR") {
        onMove(collabId, false, "", targetCollab.assignedRole || "Aplicador (Fiscal de Sala)");
        setSuccessMsg(`Desalocado para Quadros Associados: ${targetCollab.name}`);
      } else {
        const role = targetCollab.assignedRole || "Aplicador (Fiscal de Sala)";
        onMove(collabId, false, dest, role);
        setSuccessMsg(`Alocado: ${targetCollab.name} na ${dest}`);
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Open Click-to-Allocate Modal for a collaborator
  const handleOpenAllocateModal = (collab: CollaboratorInfo) => {
    setAllocatingCollab(collab);
    setSelectedTargetRoom(rooms[0]?.number || "Sala 01");
    if (collab.isReserve || !collab.assignedRole) {
      setSelectedTargetRole("Aplicador (Fiscal de Sala)");
    } else {
      setSelectedTargetRole(collab.assignedRole);
    }
  };

  // Confirm Click-to-Allocate
  const handleConfirmAllocation = () => {
    if (!allocatingCollab || !allocatingCollab.id || !selectedTargetRoom) return;

    onMove(allocatingCollab.id, false, selectedTargetRoom, selectedTargetRole);
    setSuccessMsg(`${allocatingCollab.name} alocado na ${selectedTargetRoom} como ${selectedTargetRole}!`);
    setTimeout(() => setSuccessMsg(null), 3500);
    setAllocatingCollab(null);
  };

  // Open Substitution Modal for an allocated collaborator in a room
  const handleOpenSubstituteModal = (collab: CollaboratorInfo, roomNumber: string) => {
    setSubstitutingTarget({ collab, roomNumber });
    setSubstituteSearchQuery("");
    setSubstituteCandidateId(unallocated[0]?.id || "");
    setSubstituteRole(collab.assignedRole || "Aplicador (Fiscal de Sala)");
  };

  // Confirm Substitution
  const handleConfirmSubstitution = async () => {
    if (!substitutingTarget || !substitutingTarget.collab.id || !substituteCandidateId) return;

    const replacedCollab = substitutingTarget.collab;
    const replacementCollab = collaborators.find(c => c.id === substituteCandidateId);

    if (!replacementCollab || !replacementCollab.id) return;

    try {
      if (onSubstitute) {
        await onSubstitute(
          replacedCollab.id, 
          replacementCollab.id, 
          substitutingTarget.roomNumber, 
          substituteRole
        );
      } else if (onUpdateCollaborator) {
        const now = new Date().toISOString();
        await onUpdateCollaborator(replacedCollab.id, {
          assignedRoom: "",
          isReserve: true,
          isSubstituted: true,
          substitutedBy: replacementCollab.name,
          substitutedById: replacementCollab.id,
          substitutedAt: now,
          substitutionTag: `Substituído por ${replacementCollab.name}`
        });

        await onUpdateCollaborator(replacementCollab.id, {
          assignedRoom: substitutingTarget.roomNumber,
          isReserve: false,
          assignedRole: substituteRole,
          substitutedFor: replacedCollab.name,
          isSubstituted: false,
          substitutionTag: `Substituto de ${replacedCollab.name}`
        });
      } else {
        onMove(replacedCollab.id, true, "", "");
        onMove(replacementCollab.id, false, substitutingTarget.roomNumber, substituteRole);
      }

      setSuccessMsg(
        `${replacedCollab.name} foi substituído por ${replacementCollab.name} e retornou à Reserva com a tag "Substituído".`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      setSubstitutingTarget(null);
    } catch (err) {
      console.error("Erro na substituição:", err);
    }
  };

  // Filter available candidates for substitution
  const availableCandidates = useMemo(() => {
    return unallocated.filter(c => {
      if (!c.id) return false;
      if (substitutingTarget && c.id === substitutingTarget.collab.id) return false;
      if (substituteSearchQuery.trim()) {
        const q = substituteSearchQuery.toLowerCase().trim();
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchCpf = (c.cpf || "").toLowerCase().includes(q);
        const matchRole = (c.assignedRole || "").toLowerCase().includes(q);
        return matchName || matchCpf || matchRole;
      }
      return true;
    });
  }, [unallocated, substitutingTarget, substituteSearchQuery]);

  // Computed collaborators for current template
  const filteredTemplateCollaborators = useMemo(() => {
    const list = approvedCollaborators.filter(c => 
      isCollabInTemplate(c, selectedExportTemplate, customExportConfig, rooms, isChefeDeSalaRole, isAplicadorRole, isRoleMatchingSector, isCollabInSector)
    );

    if (!exportSearchQuery.trim()) return list;
    const q = exportSearchQuery.toLowerCase().trim();
    return list.filter(c => {
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchCpf = (c.cpf || "").toLowerCase().includes(q);
      const matchPhone = (c.whatsapp || "").toLowerCase().includes(q);
      const matchRole = (c.assignedRole || "").toLowerCase().includes(q);
      const matchRoom = (c.assignedRoom || "").toLowerCase().includes(q);
      return matchName || matchCpf || matchPhone || matchRole || matchRoom;
    });
  }, [approvedCollaborators, selectedExportTemplate, customExportConfig, rooms, exportSearchQuery]);

  // Sort list logically by function and alphabetical order (or user-selected sort criteria)
  const sortedTemplateCollaborators = useMemo(() => {
    const list = [...filteredTemplateCollaborators];
    list.sort((a, b) => {
      const nameA = (a.name || "").trim();
      const nameB = (b.name || "").trim();

      if (exportSortBy === "function_alphabetical") {
        const rankA = getRoleRank(a.assignedRole);
        const rankB = getRoleRank(b.assignedRole);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        const roleA = (a.assignedRole || "").trim();
        const roleB = (b.assignedRole || "").trim();
        const roleComp = roleA.localeCompare(roleB, "pt-BR", { sensitivity: "base" });
        if (roleComp !== 0) return roleComp;
        return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
      }

      if (exportSortBy === "alphabetical") {
        const nameComp = nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
        if (nameComp !== 0) return nameComp;
        const rankA = getRoleRank(a.assignedRole);
        const rankB = getRoleRank(b.assignedRole);
        return rankA - rankB;
      }

      if (exportSortBy === "room_alphabetical") {
        const roomA = a.assignedRoom || "ZZZ";
        const roomB = b.assignedRoom || "ZZZ";
        const numA = parseInt(roomA.replace(/\D/g, ""), 10);
        const numB = parseInt(roomB.replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numA - numB;
        }
        if (roomA !== roomB) {
          return roomA.localeCompare(roomB, "pt-BR", { numeric: true });
        }
        const rankA = getRoleRank(a.assignedRole);
        const rankB = getRoleRank(b.assignedRole);
        if (rankA !== rankB) return rankA - rankB;
        return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
      }

      return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
    });
    return list;
  }, [filteredTemplateCollaborators, exportSortBy]);

  // Active columns for the current template
  const activeTemplateColumns = useMemo(() => {
    if (selectedExportTemplate === "personalizado") {
      return customExportConfig.selectedColumns;
    }
    const templateMeta = EXPORT_TEMPLATES.find(t => t.id === selectedExportTemplate);
    return templateMeta?.defaultColumns || ["nome", "cpf", "telefone", "sala", "assinatura"];
  }, [selectedExportTemplate, customExportConfig.selectedColumns]);

  // Download printable HTML report based on active template
  const handleDownloadHtmlReport = () => {
    const templateMeta = EXPORT_TEMPLATES.find(t => t.id === selectedExportTemplate) || EXPORT_TEMPLATES[0];
    const html = generateTemplatePrintableHtml(
      building, 
      claName, 
      rooms, 
      sortedTemplateCollaborators, 
      templateMeta, 
      activeTemplateColumns,
      customExportConfig,
      exportSortBy
    );
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedTemplateName = templateMeta.shortTitle.replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `Relatorio_${sanitizedTemplateName}_ENEM2026_${building?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Local"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    setSuccessMsg(`Relatório "${templateMeta.title}" exportado com sucesso! Arquivo HTML pronto para impressão ou PDF.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open printable view in new window/tab for active template
  const handleOpenPrintWindow = () => {
    const templateMeta = EXPORT_TEMPLATES.find(t => t.id === selectedExportTemplate) || EXPORT_TEMPLATES[0];
    const html = generateTemplatePrintableHtml(
      building, 
      claName, 
      rooms, 
      sortedTemplateCollaborators, 
      templateMeta, 
      activeTemplateColumns,
      customExportConfig,
      exportSortBy
    );
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      handleDownloadHtmlReport();
    }
  };

  // Download CSV Spreadsheet for active template
  const handleDownloadCsv = () => {
    const templateMeta = EXPORT_TEMPLATES.find(t => t.id === selectedExportTemplate) || EXPORT_TEMPLATES[0];
    const headers: string[] = ["Nº"];
    if (activeTemplateColumns.includes("nome")) headers.push("Nome Completo");
    if (activeTemplateColumns.includes("cpf")) headers.push("CPF");
    if (activeTemplateColumns.includes("telefone")) headers.push("Telefone / WhatsApp");
    if (activeTemplateColumns.includes("funcao")) headers.push("Função / Cargo");
    if (activeTemplateColumns.includes("sala")) headers.push("Sala / Posto Alocado");
    if (activeTemplateColumns.includes("andar")) headers.push("Pavimento / Andar");
    if (activeTemplateColumns.includes("status")) headers.push("Status / Observação");

    const rows = sortedTemplateCollaborators.map((c, idx) => {
      const row: string[] = [(idx + 1).toString()];
      if (activeTemplateColumns.includes("nome")) row.push(`"${(c.name || "").replace(/"/g, '""')}"`);
      if (activeTemplateColumns.includes("cpf")) row.push(`"${c.cpf || ""}"`);
      if (activeTemplateColumns.includes("telefone")) row.push(`"${c.whatsapp || "—"}"`);
      if (activeTemplateColumns.includes("funcao")) row.push(`"${c.assignedRole || (c.isReserve ? "Reserva" : "Aplicador")}"`);
      if (activeTemplateColumns.includes("sala")) {
        const roomStr = c.assignedRoom ? (rooms.some(r => r.number === c.assignedRoom) ? `Sala ${c.assignedRoom}` : c.assignedRoom) : "Não Alocado / Reserva";
        row.push(`"${roomStr}"`);
      }
      if (activeTemplateColumns.includes("andar")) {
        const roomObj = rooms.find(r => r.number === c.assignedRoom);
        row.push(`"${roomObj ? roomObj.floor : "—"}"`);
      }
      if (activeTemplateColumns.includes("status")) {
        row.push(`"${c.substitutionTag || c.status || "Efetivo"}"`);
      }
      return row.join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedTemplateName = templateMeta.shortTitle.replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `Planilha_${sanitizedTemplateName}_ENEM2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    setSuccessMsg(`Planilha CSV "${templateMeta.title}" exportada com sucesso!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Copy textual summary of current template to clipboard
  const handleCopyReportText = () => {
    const templateMeta = EXPORT_TEMPLATES.find(t => t.id === selectedExportTemplate) || EXPORT_TEMPLATES[0];
    let text = `========================================================\n`;
    text += `EXAME NACIONAL DO ENSINO MÉDIO - ENEM 2026\n`;
    text += `RELATÓRIO: ${templateMeta.title.toUpperCase()}\n`;
    text += `Estrutura: ${templateMeta.fieldsDescription}\n`;
    text += `Local: ${building?.name || "Local de Aplicação"}\n`;
    text += `CLA: ${claName || "Coordenação"}\n`;
    text += `Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `Total de Colaboradores no Relatório: ${sortedTemplateCollaborators.length}\n`;
    text += `========================================================\n\n`;

    sortedTemplateCollaborators.forEach((c, idx) => {
      const roomStr = c.assignedRoom ? (rooms.some(r => r.number === c.assignedRoom) ? `Sala ${c.assignedRoom}` : c.assignedRoom) : "Não Alocado / Reserva";
      text += `${idx + 1}. ${c.name} | CPF: ${c.cpf} | Tel: ${c.whatsapp || "—"} | Sala/Posto: ${roomStr} | Função: ${c.assignedRole || "Reserva"}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="drag-drop-reserves-container">
      
      {/* Informative Header Banner with PDF Export Button */}
      <div className="mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
            <span>🏷️ Organização de Fiscais e Ensalamento</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
              DRAG-N-DROP & CLIQUE
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
            Exibindo todas as funções atribuídas e necessárias definidas no <strong>Menu 3 (Associação de Funções)</strong>. Clique nos botões para filtrar e alocar.
          </p>
        </div>

        {/* Action Buttons: PDF Export & Print */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="cursor-pointer px-4 py-2.5 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all duration-200 active:scale-95 shadow-[3px_3px_0px_0px_#065f46] flex items-center gap-2"
            title="Abrir Central de Templates e Relatórios Oficiais (Chefes, Aplicadores, Volantes, Banheiro, Limpeza, Porteiro, Ensalamento, Prédio, Personalizado)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Templates & Relatórios</span>
            <span className="bg-emerald-950/40 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">9</span>
          </button>
          <button
            onClick={handleDownloadHtmlReport}
            className="cursor-pointer px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 transition active:scale-95 flex items-center gap-1.5"
            title="Baixar diretamente arquivo HTML formatado para impressão"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar HTML</span>
          </button>
        </div>
      </div>

      {/* Success Notification ticker */}
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Notice */}
      {pendingCount > 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              Há <strong>{pendingCount} fiscal(is) pendente(s) de aprovação</strong> no <strong>Menu 2 (Fiscais)</strong>. Apenas fiscais aprovados pelo CLA aparecem para alocação nas salas de provas.
            </span>
          </div>
        </div>
      )}

      {/* QUANTITATIVE DASHBOARD METRICS: TOTAL DE FUNÇÕES PARA ASSOCIAÇÃO & QUANTIDADE ASSOCIADA */}
      <div className="mb-6 space-y-3">
        {/* Primary Role Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Fiscais Aprovados */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-slate-500 dark:text-slate-400">Total Fiscais</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-display font-black text-slate-900 dark:text-white">{stats.totalApproved}</span>
                <span className="text-[9px] font-bold text-slate-400">Aprovados</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold text-slate-500 dark:text-slate-400">
                <span>{stats.totalAllocatedRooms + stats.totalAllocatedSectors} alocados</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{unallocated.length} disp.</span>
              </div>
            </div>
          </div>

          {/* Chefe de Sala */}
          <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Chefe de Sala</span>
              </span>
              <span className="text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                Meta: {stats.targetChefes}
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-black text-amber-700 dark:text-amber-300">{stats.chefesDeSalaAssigned}</span>
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">/ {stats.targetChefes}</span>
                </div>
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Associados</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold">
                <span className="text-rose-600 dark:text-rose-400 font-black">{stats.chefesDeSalaAllocated} em sala</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{stats.chefesDeSalaAvailable} disp.</span>
              </div>
            </div>
          </div>

          {/* Aplicadores */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Aplicadores</span>
              </span>
              <span className="text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                Meta: {stats.targetAplicadores}
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-black text-indigo-700 dark:text-indigo-300">{stats.aplicadoresAssigned}</span>
                  <span className="text-[9px] font-bold text-indigo-500">/ {stats.targetAplicadores}</span>
                </div>
                <span className="text-[9px] font-bold text-indigo-500">Associados</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold">
                <span className="text-rose-600 dark:text-rose-400 font-black">{stats.aplicadoresAllocated} em sala</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{stats.aplicadoresAvailable} disp.</span>
              </div>
            </div>
          </div>

          {/* Fiscal Volante (Corredor) */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800/60 rounded-2xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Volantes</span>
              </span>
              <span className="text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                Meta: {stats.targetVolantes}
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-black text-blue-700 dark:text-blue-300">{stats.volantesAssigned}</span>
                  <span className="text-[9px] font-bold text-blue-500">/ {stats.targetVolantes}</span>
                </div>
                <span className="text-[9px] font-bold text-blue-500">Associados</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold">
                <span className="text-rose-600 dark:text-rose-400 font-black">{stats.volantesAllocated} no posto</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{stats.volantesAvailable} disp.</span>
              </div>
            </div>
          </div>

          {/* Fiscal de Banheiro */}
          <div className="p-3.5 bg-cyan-50/70 dark:bg-cyan-950/20 border-2 border-cyan-200 dark:border-cyan-800/60 rounded-2xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Banheiro</span>
              </span>
              <span className="text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                Meta: {stats.targetBanheiro}
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-black text-cyan-700 dark:text-cyan-300">{stats.banheiroAssigned}</span>
                  <span className="text-[9px] font-bold text-cyan-500">/ {stats.targetBanheiro}</span>
                </div>
                <span className="text-[9px] font-bold text-cyan-500">Associados</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold">
                <span className="text-rose-600 dark:text-rose-400 font-black">{stats.banheiroAllocated} no posto</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">{stats.banheiroAvailable} disp.</span>
              </div>
            </div>
          </div>

          {/* Auxiliar de Limpeza & Portaria & Demais */}
          <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/20 border-2 border-teal-200 dark:border-teal-800/60 rounded-2xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Demais Setores</span>
              </span>
              <span className="text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300">
                {stats.totalAllocatedSectors} Postos
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-display font-black text-teal-700 dark:text-teal-300">
                  {stats.limpezaAssigned + stats.porteiroAssigned + stats.representanteAssigned + stats.tiAssigned + stats.demaisFiscaisAssigned}
                </span>
                <span className="text-[9px] font-bold text-teal-500">Associados</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold">
                <span className="text-rose-600 dark:text-rose-400 font-black">
                  {stats.limpezaAllocated + stats.porteiroAllocated + stats.representanteAllocated + stats.tiAllocated + stats.demaisFiscaisAllocated} alocados
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  {stats.limpezaAvailable + stats.porteiroAvailable + stats.representanteAvailable + stats.tiAvailable + stats.demaisFiscaisAvailable} disp.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Operational Summary Strip */}
        <div className="p-3 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Detalhamento de Funções do Prédio:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
              🧹 Limpeza: {stats.limpezaAssigned}/{stats.targetLimpeza} assoc. ({stats.limpezaAllocated} aloc.)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
              🚪 Porteiro: {stats.porteiroAssigned}/{stats.targetPorteiro} assoc. ({stats.porteiroAllocated} aloc.)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
              🏛️ Representante: {stats.representanteAssigned}/{stats.targetRepresentante} assoc. ({stats.representanteAllocated} aloc.)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-800 dark:text-sky-300 font-bold text-[10px]">
              💻 TI: {stats.tiAssigned}/{stats.targetTI} assoc. ({stats.tiAllocated} aloc.)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              ⚡ Com Função Não Ensalados: <strong>{stats.unallocatedWithRole}</strong>
            </span>
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              📦 Reservas Puras: <strong>{stats.unallocatedNoRole}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* LEFT COLUMNS (2 Columns): THE ALLOCATION LANES & COLLABORATOR LIST */}
        <div className="xl:col-span-2 space-y-4">
          
          {/* Header & Clean Filter Tabs */}
          <div className="pb-3 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-display font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                  <span>Fiscais & Ensalamento</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {stats.totalAllocatedRooms + stats.totalAllocatedSectors} alocados • {unallocated.length} disponíveis
                </p>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-black px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {displayedCollaborators.length} na lista
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Pesquisar por nome, CPF, sala, posto ou função..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* TOGGLE: Apenas Colaboradores Não Associados (que têm função mas não estão em sala/posto) */}
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-emerald-500/10 dark:bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/15 transition">
              <input
                type="checkbox"
                checked={onlyUnallocatedToggle}
                onChange={(e) => setOnlyUnallocatedToggle(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="flex items-center justify-between flex-1 gap-1">
                <span>Marcar apenas colaboradores <strong>NÃO associados</strong> a salas/postos</span>
                <span className="font-mono text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  {stats.unallocatedWithRole + stats.unallocatedNoRole}
                </span>
              </span>
            </label>

            {/* STREAMLINED FILTER TABS */}
            <div className="flex flex-wrap gap-1.5">
              {/* 1. Todos */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>Todos</span>
                <span className="font-mono text-[9px] opacity-80">({stats.totalApproved})</span>
              </button>

              {/* 2. Com Função Não Ensalados */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("unallocated_with_role")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "unallocated_with_role"
                    ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/40"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                }`}
                title="Colaboradores que têm função designada mas ainda não foram alocados a nenhuma sala ou posto"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Com Função (Sem Sala)</span>
                <span className="font-mono text-[9px] font-black">({stats.unallocatedWithRole})</span>
              </button>

              {/* 3. Sem Função Atribuída (Reserva Pura) */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("sem_funcao")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "sem_funcao"
                    ? "bg-slate-700 text-white shadow-xs ring-2 ring-slate-500/40"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-slate-500" />
                <span>Sem Função</span>
                <span className="font-mono text-[9px]">({stats.unallocatedNoRole})</span>
              </button>

              {/* 4. Chefe de Sala */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("chefe_de_sala")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "chefe_de_sala" || selectedRoleFilter === "Chefe de Sala"
                    ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/40"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Chefe ({stats.chefesDeSalaAssigned}/{stats.targetChefes})</span>
              </button>

              {/* 5. Aplicadores */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("aplicadores")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "aplicadores" || selectedRoleFilter === "Aplicador"
                    ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/40"
                    : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Aplicadores ({stats.aplicadoresAssigned}/{stats.targetAplicadores})</span>
              </button>

              {/* 6. Volantes */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("volantes")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "volantes"
                    ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/40"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-500/20"
                }`}
              >
                <Footprints className="w-3.5 h-3.5 text-blue-500" />
                <span>Volantes ({stats.volantesAssigned}/{stats.targetVolantes})</span>
              </button>

              {/* 7. Banheiro */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("banheiro")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "banheiro"
                    ? "bg-cyan-600 text-white shadow-xs ring-2 ring-cyan-500/40"
                    : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
                }`}
              >
                <Bath className="w-3.5 h-3.5 text-cyan-500" />
                <span>Banheiro ({stats.banheiroAssigned}/{stats.targetBanheiro})</span>
              </button>

              {/* 8. Limpeza */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("limpeza")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "limpeza"
                    ? "bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/40"
                    : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 hover:bg-teal-500/20"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                <span>Limpeza ({stats.limpezaAssigned}/{stats.targetLimpeza})</span>
              </button>

              {/* 9. Porteiro */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("porteiro")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "porteiro"
                    ? "bg-blue-700 text-white shadow-xs ring-2 ring-blue-500/40"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-500/20"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>Porteiro ({stats.porteiroAssigned}/{stats.targetPorteiro})</span>
              </button>

              {/* 10. Representante */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("representante")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "representante"
                    ? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/40"
                    : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-purple-500" />
                <span>Representante ({stats.representanteAssigned}/{stats.targetRepresentante})</span>
              </button>

              {/* 11. Alocados em Sala */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("allocated")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "allocated"
                    ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/40"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Alocados ({stats.totalAllocatedRooms})</span>
              </button>

              {/* 12. Disponíveis */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("available")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "available"
                    ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/40"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Disponíveis ({unallocated.length})</span>
              </button>

              {/* 13. Demais Fiscais */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("demais_fiscais")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "demais_fiscais"
                    ? "bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/40"
                    : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 hover:bg-teal-500/20"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-teal-500" />
                <span>Demais Fiscais</span>
                <span className="font-mono text-[9px]">({stats.demaisFiscaisAssigned})</span>
              </button>

              {/* Dynamic Individual pills for any other active specific role */}
              {rolesWithQuantity
                .filter(r => !isChefeDeSalaRole(r.name) && !isAplicadorRole(r.name))
                .map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => setSelectedRoleFilter(r.name)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedRoleFilter === r.name
                        ? "bg-teal-700 text-white shadow-xs ring-2 ring-teal-500/40"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {getRoleIcon(r.name)}
                    <span className="truncate max-w-[120px]">{r.name}</span>
                    <span className="font-mono text-[9px]">({r.totalAssigned}{r.targetQty > 0 ? `/${r.targetQty}` : ""})</span>
                  </button>
                ))}

              {/* 7. Reserva Geral */}
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("reserva")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedRoleFilter === "reserva"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-amber-500" />
                <span>Reserva</span>
                <span className="font-mono text-[9px]">({stats.totalReserves})</span>
              </button>
            </div>

          </div>

          {/* List of collaborators matching the active filter */}
          <div 
            className="grid grid-cols-1 gap-3 max-h-[750px] overflow-y-auto pr-1"
            style={{ minHeight: "420px" }}
          >
            {displayedCollaborators.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Nenhum fiscal encontrado no filtro ativo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleFilter("all");
                    setSearchFilter("");
                  }}
                  className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Ver todos os fiscais
                </button>
              </div>
            ) : (
              displayedCollaborators.map(collab => {
                const isAlreadyAllocated = Boolean(!collab.isReserve && collab.assignedRoom && collab.assignedRoom.trim() !== "");

                return (
                  <div
                    key={collab.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, collab.id!)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleOpenAllocateModal(collab)}
                    className={`p-3.5 border-2 rounded-xl shadow-xs transition cursor-pointer group relative ${
                      isAlreadyAllocated 
                        ? "bg-rose-50/70 dark:bg-rose-950/25 border-rose-300 dark:border-rose-800/80 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.08)]" 
                        : "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/80 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.08)] hover:shadow-md"
                    } ${draggedId === collab.id ? 'opacity-45' : ''}`}
                    title="Clique para alocar em uma sala ou alterar função"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FiscalAvatar 
                          photoUrl={collab.photoUrl} 
                          name={collab.name} 
                          size="sm"
                          onClick={(e) => {
                            e?.stopPropagation();
                            setLightboxData({
                              imageUrl: collab.photoUrl || '',
                              name: collab.name,
                              role: collab.assignedRole || (collab.isReserve ? 'Reserva Geral' : 'Disponível'),
                              cpf: collab.cpf,
                              claName: collab.originalClaName || collab.claName,
                              specialRole: collab.specialRole,
                              hasWorkedEnem: collab.hasWorkedEnem,
                              pastEditions: collab.pastEditions
                            });
                          }}
                        />
                        <div className="truncate min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-extrabold text-slate-800 dark:text-white text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" title={collab.name}>
                              {collab.name}
                            </h5>
                            <span className="opacity-0 group-hover:opacity-100 transition text-[9px] text-emerald-600 font-bold flex items-center shrink-0">
                              ⚡ {isAlreadyAllocated ? "Remanejar" : "Alocar"}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono font-bold mt-0.5">{collab.cpf}</p>
                          
                          {/* PROMINENT ROOM AND ROLE STATUS */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {isAlreadyAllocated ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-500/20 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-md border border-rose-500/30">
                                🚪 Alocado: <strong>{collab.assignedRoom}</strong>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                🟢 Disponível
                              </span>
                            )}

                            {/* Exact Role badge */}
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              {getRoleIcon(collab.assignedRole || "")}
                              <span>Função: <strong>{collab.assignedRole || "Reserva Geral"}</strong></span>
                            </span>

                            {/* TAG SUBSTITUÍDO / SUBSTITUTO */}
                            {(collab.isSubstituted || collab.substitutionTag || collab.substitutedBy) && (
                              <span 
                                className="inline-flex items-center gap-1 text-[8px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded"
                                title={collab.substitutionTag || `Substituído por ${collab.substitutedBy}`}
                              >
                                <ArrowRightLeft className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>{collab.substitutionTag || `Substituído (${collab.substitutedBy})`}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAllocateModal(collab);
                          }}
                          className={`px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-lg border transition cursor-pointer ${
                            isAlreadyAllocated
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500 hover:text-white"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                          }`}
                        >
                          {isAlreadyAllocated ? "Remanejar" : "Alocar"}
                        </button>
                        {isAlreadyAllocated && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickAssignMobile(collab.id!, "DESALOCAR");
                            }}
                            className="text-[8.5px] font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer"
                          >
                            Desalocar
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {collaboratorWarnings(collab, setDiagnoseCollab)}

                    {/* Fast Action Select */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 block" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <label className="text-[8.5px] uppercase font-bold text-slate-500 shrink-0">Mudar Sala:</label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              quickAssignMobile(collab.id!, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          defaultValue=""
                          className="flex-1 text-[10px] bg-white dark:bg-[#070b13] border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-bold text-slate-700 dark:text-slate-200 focus:outline-emerald-500 cursor-pointer"
                        >
                          <option value="" disabled>-- Selecione Sala de Destino --</option>
                          {rooms.map(r => {
                            const occ = roomOccupancyMap[r.number]?.total || 0;
                            const isCurrent = r.number === collab.assignedRoom;
                            const roomReq = getRoomTargetRequirements(r, eventConfig?.collaboratorMetrics || undefined);
                            const totalNeeded = roomReq.targetChefes + roomReq.targetAplicadores + roomReq.targetLedores + roomReq.targetLibras + roomReq.targetAcessibilidade;
                            const countDisplay = totalNeeded > 0
                              ? `(${occ}/${totalNeeded} alocados)`
                              : `(${occ} ${occ === 1 ? "alocado" : "alocados"})`;

                            return (
                              <option key={r.number} value={r.number}>
                                {r.number} — {countDisplay}{isCurrent ? " • Sala Atual" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMNS (3 Columns): THE CLASSROOM TESTING LABS */}
        <div className="xl:col-span-3">
          <div className="mb-4 flex items-center justify-between pb-2 border-b-2 border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-display font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-extrabold flex items-center gap-2">
                <span>🏢 Salas do Bloco de Provas</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full">
                  {stats.totalAllocatedRooms} fiscais alocados
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Arraste fiscais para as salas ou use o botão de substituição direta
              </p>
            </div>
            <span className="text-[10.5px] text-slate-400 font-bold font-sans">
              Total: {rooms.length} Salas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map((room) => {
              // Fiscais associated with room
              const assignedCollabs = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === room.number);
              
              const roomReq = getRoomTargetRequirements(room, eventConfig?.collaboratorMetrics || undefined);
              const chefesInRoom = assignedCollabs.filter(c => isChefeDeSalaRole(c.assignedRole)).length;
              const aplicadoresInRoom = assignedCollabs.filter(c => isAplicadorRole(c.assignedRole)).length;
              const totalStaffNeeded = roomReq.targetChefes + roomReq.targetAplicadores + roomReq.targetLedores + roomReq.targetLibras + roomReq.targetAcessibilidade;
              const isFullyStaffed = chefesInRoom >= roomReq.targetChefes && aplicadoresInRoom >= roomReq.targetAplicadores && assignedCollabs.length >= totalStaffNeeded;

              return (
                <div
                  key={room.number}
                  onClick={() => {
                    setManagingRoom(room);
                    setRoomModalRoleFilter("all");
                    setRoomModalSearch("");
                    setRoomModalOnlyUnallocated(false);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToRoom(e, room.number)}
                  className={`border-2 rounded-2xl p-4 flex flex-col justify-between transition-all min-h-[220px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.02)] cursor-pointer group hover:shadow-lg hover:scale-[1.008] ${
                    isFullyStaffed 
                      ? "bg-slate-50 dark:bg-[#070b13]/55 border-emerald-500/40 dark:border-emerald-500/30 hover:border-emerald-500" 
                      : "bg-slate-50 dark:bg-[#070b13]/55 border-slate-200 dark:border-slate-800/80 hover:border-emerald-500 dark:hover:border-emerald-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 border-b border-slate-200 dark:border-slate-800/60 pb-2">
                      <div className="flex flex-col">
                        <span className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          🚪 {room.number}
                        </span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold font-sans mt-0.5">
                          📍 {room.floor}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isFullyStaffed ? (
                          <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-black text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                            {assignedCollabs.length}/{totalStaffNeeded} Completa
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-800 dark:text-amber-300 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                            {assignedCollabs.length}/{totalStaffNeeded} Alocados
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManagingRoom(room);
                            setRoomModalRoleFilter("all");
                            setRoomModalSearch("");
                            setRoomModalOnlyUnallocated(false);
                          }}
                          className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                          title="Clique para alocar colaboradores por função nesta sala"
                        >
                          <UserPlus className="w-2.5 h-2.5" />
                          <span>Alocar</span>
                        </button>
                      </div>
                    </div>

                    {/* Room Target Requirement Info Bar */}
                    <div className="mb-2.5 px-2 py-1 bg-slate-200/50 dark:bg-slate-800/40 rounded-lg flex items-center justify-between text-[8px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Meta da Sala:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {roomReq.targetChefes} Chefe{roomReq.targetAplicadores > 0 ? ` • ${roomReq.targetAplicadores} Aplicador(es)` : ''}
                        {roomReq.targetLedores > 0 ? ` • ${roomReq.targetLedores} Ledor/Transcritor` : ''}
                        {roomReq.targetLibras > 0 ? ` • ${roomReq.targetLibras} Libras` : ''}
                        {roomReq.targetAcessibilidade > 0 ? ` • ${roomReq.targetAcessibilidade} Acessibilidade` : ''}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[110px] max-h-[260px] overflow-y-auto pr-1">
                      {assignedCollabs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-1.5">
                          <p className="text-[10px] italic font-medium">Nenhum fiscal alocado nesta sala</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setManagingRoom(room);
                              setRoomModalRoleFilter("all");
                              setRoomModalSearch("");
                              setRoomModalOnlyUnallocated(false);
                            }}
                            className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 cursor-pointer"
                          >
                            + Clique aqui para alocar fiscais
                          </button>
                        </div>
                      ) : (
                        assignedCollabs.map((collab) => {
                          const isChefe = isChefeDeSalaRole(collab.assignedRole);
                          const isAplicador = isAplicadorRole(collab.assignedRole);
                          return (
                            <div 
                              key={collab.id}
                              draggable
                              onClick={(e) => e.stopPropagation()}
                              onDragStart={(e) => handleDragStart(e, collab.id!)}
                              onDragEnd={handleDragEnd}
                              className={`border-2 rounded-xl p-2.5 flex items-center justify-between transition shadow-xs pr-2.5 text-xs font-bold gap-2 cursor-grab active:cursor-grabbing ${
                                isChefe
                                  ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60"
                                  : isAplicador 
                                  ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60" 
                                  : "bg-teal-50/60 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/60"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                                <FiscalAvatar 
                                  photoUrl={collab.photoUrl} 
                                  name={collab.name} 
                                  size="xs"
                                  onClick={(e) => {
                                    e?.stopPropagation();
                                    setLightboxData({
                                      imageUrl: collab.photoUrl || '',
                                      name: collab.name,
                                      role: collab.assignedRole || 'Fiscal de Sala',
                                      cpf: collab.cpf,
                                      claName: collab.originalClaName || collab.claName,
                                      specialRole: collab.specialRole,
                                      hasWorkedEnem: collab.hasWorkedEnem,
                                      pastEditions: collab.pastEditions
                                    });
                                  }}
                                />
                                <div className="truncate min-w-0 flex-1">
                                  <span className="font-extrabold text-slate-900 dark:text-white block truncate text-xs" title={collab.name}>
                                    {collab.name}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    <span className="text-[8.5px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                      {isChefe && <Award className="w-2.5 h-2.5 text-amber-600 shrink-0" />}
                                      <span>Função: <strong className={isChefe ? "text-amber-700 dark:text-amber-300" : isAplicador ? "text-indigo-700 dark:text-indigo-300" : "text-teal-700 dark:text-teal-300"}>{collab.assignedRole || "Aplicador"}</strong></span>
                                    </span>

                                    {/* TAG SUBSTITUTO */}
                                    {collab.substitutionTag && (
                                      <span 
                                        className="text-[8px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 rounded truncate max-w-[110px]"
                                        title={collab.substitutionTag}
                                      >
                                        {collab.substitutionTag}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Actions: Substituir & Desalocar */}
                              <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSubstituteModal(collab, room.number);
                                  }}
                                  title="Substituir este colaborador por outro fiscal"
                                  className="text-[8.5px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded transition uppercase cursor-pointer flex items-center gap-1 active:scale-95"
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  <span>Substituir</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    quickAssignMobile(collab.id!, "DESALOCAR");
                                  }}
                                  title="Remover fiscal da sala"
                                  className="text-[8px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-1 py-0.5 cursor-pointer text-center"
                                >
                                  Desalocar
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {assignedCollabs.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Chefes: <strong className="text-amber-700 dark:text-amber-300">{assignedCollabs.filter(c => isChefeDeSalaRole(c.assignedRole)).length}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-indigo-500" />
                        <span>Aplicadores: <strong className="text-indigo-600 dark:text-indigo-400">{assignedCollabs.filter(c => isAplicadorRole(c.assignedRole)).length}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-teal-500" />
                        <span>Demais: <strong className="text-teal-600 dark:text-teal-400">{assignedCollabs.filter(c => !isChefeDeSalaRole(c.assignedRole) && !isAplicadorRole(c.assignedRole)).length}</strong></span>
                      </span>
                    </div>
                  )}

                  <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[8.5px] text-slate-400 dark:text-slate-500 flex items-center justify-between font-mono font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center gap-1">
                      ⚡ Clique na sala para alocar
                    </span>
                    <span>Capacidade: {room.capacity} cand.</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* SECTION: OPERATIONAL SECTORS & BUILDING ROLES (VOLANTES, BANHEIRO, ETC.) */}
          {/* ========================================================================= */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-display font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span>Postos de Apoio & Setores Operacionais do Prédio</span>
                </h3>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Arraste os fiscais ou clique nos quadros para associar Volantes, Banheiros, Limpeza, Portaria e Representantes
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  {stats.totalAllocatedSectors} alocados nos postos
                </span>
              </div>
            </div>

            {/* Grid of Operational Sectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {OPERATIONAL_SECTORS.map((sector) => {
                const assignedToSector = approvedCollaborators.filter(c => isCollabInSector(c, sector));
                const targetCount = getSectorTarget(sector.id);
                const isFullyStaffed = assignedToSector.length >= targetCount && targetCount > 0;

                return (
                  <div
                    key={sector.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropToSector(e, sector)}
                    onClick={() => {
                      setManagingSector(sector);
                      setSectorModalRoleFilter("all");
                      setSectorModalSearch("");
                      setSectorModalOnlyUnallocated(false);
                    }}
                    className={`group relative rounded-2xl border-2 p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                      isFullyStaffed
                        ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-300 dark:border-emerald-700/60 hover:border-emerald-400"
                        : assignedToSector.length > 0
                        ? "bg-white dark:bg-[#0c1220] border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400"
                        : "bg-white dark:bg-[#0c1220] border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div>
                      {/* Sector Header */}
                      <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl shrink-0 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {sector.icon}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-display font-black text-xs text-slate-900 dark:text-white truncate">
                              {sector.name}
                            </h4>
                            <span className="text-[9.5px] text-slate-400 font-bold block truncate">
                              {sector.desc}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${
                            isFullyStaffed
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                          }`}>
                            {assignedToSector.length}/{targetCount}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setManagingSector(sector);
                              setSectorModalRoleFilter("all");
                              setSectorModalSearch("");
                              setSectorModalOnlyUnallocated(false);
                            }}
                            className="text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition active:scale-95 cursor-pointer"
                            title="Alocar colaboradores neste posto"
                          >
                            <UserPlus className="w-2.5 h-2.5" />
                            <span>Alocar</span>
                          </button>
                        </div>
                      </div>

                      {/* List of Assigned Collaborators */}
                      <div className="space-y-1.5 min-h-[90px] max-h-[220px] overflow-y-auto pr-1">
                        {assignedToSector.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 space-y-1">
                            <p className="text-[10px] italic font-medium">Nenhum colaborador alocado neste posto</p>
                            <span className="text-[8.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                              + Clique ou arraste para alocar
                            </span>
                          </div>
                        ) : (
                          assignedToSector.map((collab) => (
                            <div
                              key={collab.id}
                              draggable
                              onClick={(e) => e.stopPropagation()}
                              onDragStart={(e) => handleDragStart(e, collab.id!)}
                              onDragEnd={handleDragEnd}
                              className="border-2 rounded-xl p-2 flex items-center justify-between transition shadow-xs pr-2 text-xs font-bold gap-2 cursor-grab active:cursor-grabbing bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                                <FiscalAvatar
                                  photoUrl={collab.photoUrl}
                                  name={collab.name}
                                  size="xs"
                                  onClick={(e) => {
                                    e?.stopPropagation();
                                    setLightboxData({
                                      imageUrl: collab.photoUrl || '',
                                      name: collab.name,
                                      role: collab.assignedRole || sector.defaultRole,
                                      cpf: collab.cpf,
                                      claName: collab.originalClaName || collab.claName,
                                      specialRole: collab.specialRole,
                                      hasWorkedEnem: collab.hasWorkedEnem,
                                      pastEditions: collab.pastEditions
                                    });
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 truncate leading-tight" title={collab.name}>
                                    {collab.name}
                                  </p>
                                  <span className="text-[9px] text-slate-400 font-mono block">
                                    CPF: {collab.cpf}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSubstituteModal(collab, sector.shortName);
                                  }}
                                  title="Substituir colaborador neste posto"
                                  className="text-[8px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded transition uppercase cursor-pointer flex items-center gap-1 active:scale-95"
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  <span>Substituir</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    quickAssignMobile(collab.id!, "DESALOCAR");
                                  }}
                                  title="Remover deste posto"
                                  className="text-[8px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-1 py-0.5 cursor-pointer"
                                >
                                  Desalocar
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[8.5px] text-slate-400 dark:text-slate-500 flex items-center justify-between font-mono font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
                        ⚡ Clique no posto para gerenciar
                      </span>
                      <span>Função: {sector.defaultRole}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 0A: DIRECT ROOM ALLOCATION & ROLE FILTER WINDOW */}
      {/* ========================================================================= */}
      {managingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl shrink-0 shadow-xs border border-emerald-500/30">
                  🚪
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-black text-slate-900 dark:text-white text-base sm:text-lg">
                      Alocação de Colaboradores — {managingRoom.number}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      📍 {managingRoom.floor}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Cap: {managingRoom.capacity} cand.
                    </span>
                  </div>
                  {(() => {
                    const rReq = getRoomTargetRequirements(managingRoom, eventConfig?.collaboratorMetrics || undefined);
                    const inRoom = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === managingRoom.number);
                    const totalReq = rReq.targetChefes + rReq.targetAplicadores + rReq.targetLedores + rReq.targetLibras + rReq.targetAcessibilidade;
                    const isComplete = inRoom.length >= totalReq && inRoom.some(c => isChefeDeSalaRole(c.assignedRole));

                    return (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>Meta da Sala: <strong>{rReq.targetChefes} Chefe</strong>, <strong>{rReq.targetAplicadores} Aplicador(es)</strong>{rReq.targetLibras > 0 ? `, ${rReq.targetLibras} Libras` : ''}{rReq.targetLedores > 0 ? `, ${rReq.targetLedores} Ledores` : ''}</span>
                        <span className={`font-bold ${isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          • Status: {inRoom.length}/{totalReq} fiscais alocados {isComplete ? "✓ Completa" : "(Pendente)"}
                        </span>
                      </p>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setManagingRoom(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* SECTION 1: Current Staff In This Room */}
              {(() => {
                const assignedInRoom = approvedCollaborators.filter(c => !c.isReserve && c.assignedRoom === managingRoom.number);
                return (
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-display font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Equipe Atual Alocada na {managingRoom.number} ({assignedInRoom.length} Fiscais)
                        </h4>
                      </div>
                      {assignedInRoom.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-bold">
                          Clique em "Desalocar" para remover da sala
                        </span>
                      )}
                    </div>

                    {assignedInRoom.length === 0 ? (
                      <div className="py-5 px-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-900/40">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Nenhum fiscal alocado atualmente nesta sala.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {assignedInRoom.map((collab) => {
                          const isChefe = isChefeDeSalaRole(collab.assignedRole);
                          const isAplicador = isAplicadorRole(collab.assignedRole);

                          return (
                            <div
                              key={collab.id}
                              className={`p-3 rounded-xl border-2 flex items-center justify-between gap-2 shadow-xs ${
                                isChefe
                                  ? "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-700/50"
                                  : isAplicador
                                  ? "bg-indigo-500/10 border-indigo-500/30 dark:bg-indigo-950/30 dark:border-indigo-700/50"
                                  : "bg-teal-500/10 border-teal-500/30 dark:bg-teal-950/30 dark:border-teal-700/50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FiscalAvatar
                                  photoUrl={collab.photoUrl}
                                  name={collab.name}
                                  size="sm"
                                  onClick={() => setLightboxData({
                                    imageUrl: collab.photoUrl || '',
                                    name: collab.name,
                                    role: collab.assignedRole || 'Fiscal',
                                    cpf: collab.cpf,
                                    claName: collab.originalClaName || collab.claName,
                                    specialRole: collab.specialRole,
                                    hasWorkedEnem: collab.hasWorkedEnem,
                                    pastEditions: collab.pastEditions
                                  })}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                                      {collab.name}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                    CPF: {collab.cpf}
                                  </p>
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 ${
                                    isChefe
                                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-300"
                                      : isAplicador
                                      ? "bg-indigo-500/20 text-indigo-900 dark:text-indigo-300"
                                      : "bg-teal-500/20 text-teal-900 dark:text-teal-300"
                                  }`}>
                                    {isChefe && <Award className="w-2.5 h-2.5" />}
                                    {isAplicador && <UserCheck className="w-2.5 h-2.5" />}
                                    <span>{collab.assignedRole || "Fiscal de Sala"}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => quickAssignMobile(collab.id!, "DESALOCAR")}
                                  className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 px-2 py-1 rounded-lg transition cursor-pointer"
                                  title="Desalocar desta sala"
                                >
                                  Desalocar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubstituteModal(collab, managingRoom.number)}
                                  className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-lg transition cursor-pointer"
                                  title="Substituir por outro fiscal"
                                >
                                  Substituir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SECTION 2: Role Filters & Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-display font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Filter className="w-4 h-4 text-indigo-500" />
                      <span>Filtrar Funções e seus Associados</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Selecione uma função para listar os colaboradores e alocar na <strong>{managingRoom.number}</strong>
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                    <input
                      type="checkbox"
                      checked={roomModalOnlyUnallocated}
                      onChange={(e) => setRoomModalOnlyUnallocated(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Apenas disponíveis (não alocados)</span>
                  </label>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={roomModalSearch}
                    onChange={(e) => setRoomModalSearch(e.target.value)}
                    placeholder="Buscar associado por nome, CPF ou cargo..."
                    className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  {roomModalSearch && (
                    <button
                      onClick={() => setRoomModalSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Role Filter Pills */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-100/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRoomModalRoleFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      roomModalRoleFilter === "all"
                        ? "bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>Todas as Funções</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-mono">
                      {approvedCollaborators.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomModalRoleFilter("unallocated")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      roomModalRoleFilter === "unallocated"
                        ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Livres / Disponíveis</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-mono">
                      {unallocated.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomModalRoleFilter("unallocated_with_role")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      roomModalRoleFilter === "unallocated_with_role"
                        ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    }`}
                  >
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <span>Com Função (Sem Sala)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-mono">
                      {stats.unallocatedWithRole}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomModalRoleFilter("sem_funcao")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      roomModalRoleFilter === "sem_funcao"
                        ? "bg-slate-700 text-white dark:bg-slate-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <Inbox className="w-3 h-3 text-slate-500" />
                    <span>Sem Função</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      {stats.unallocatedNoRole}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomModalRoleFilter("chefe_de_sala")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      roomModalRoleFilter === "chefe_de_sala"
                        ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    <span>Chefe de Sala</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-mono">
                      {stats.chefesDeSalaAssigned}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomModalRoleFilter("aplicadores")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      roomModalRoleFilter === "aplicadores"
                        ? "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Aplicadores</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-mono">
                      {stats.aplicadoresAssigned}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomModalRoleFilter("volantes")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      roomModalRoleFilter === "volantes"
                        ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    }`}
                  >
                    <Footprints className="w-3 h-3" />
                    <span>Volantes</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono">
                      {stats.volantesAssigned}
                    </span>
                  </button>

                  {/* Individual active specific roles */}
                  {rolesWithQuantity
                    .filter(r => !isChefeDeSalaRole(r.name) && !isAplicadorRole(r.name) && !r.name.toLowerCase().includes("volante"))
                    .map((r) => (
                      <button
                        key={r.name}
                        type="button"
                        onClick={() => setRoomModalRoleFilter(r.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                          roomModalRoleFilter === r.name
                            ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {getRoleIcon(r.name)}
                        <span className="truncate max-w-[140px]">{r.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
                          {r.totalAssigned}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* SECTION 3: Collaborators List for the Active Role */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Associados ({roomModalFilteredCollabs.length} encontrados):
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    Clique em "+ Alocar" para associar o fiscal à <strong>{managingRoom.number}</strong>
                  </span>
                </div>

                {roomModalFilteredCollabs.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500">Nenhum colaborador encontrado com os filtros atuais.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roomModalFilteredCollabs.map((collab) => {
                      const isAlreadyInThisRoom = !collab.isReserve && collab.assignedRoom === managingRoom.number;
                      const isInOtherRoom = !collab.isReserve && collab.assignedRoom && collab.assignedRoom !== managingRoom.number;
                      const isChefe = isChefeDeSalaRole(collab.assignedRole);
                      const isAplicador = isAplicadorRole(collab.assignedRole);

                      return (
                        <div
                          key={collab.id}
                          className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                            isAlreadyInThisRoom
                              ? "bg-emerald-500/10 border-emerald-500/40 dark:border-emerald-500/40 shadow-xs"
                              : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <FiscalAvatar
                              photoUrl={collab.photoUrl}
                              name={collab.name}
                              size="md"
                              onClick={() => setLightboxData({
                                imageUrl: collab.photoUrl || '',
                                name: collab.name,
                                role: collab.assignedRole || 'Fiscal de Sala',
                                cpf: collab.cpf,
                                claName: collab.originalClaName || collab.claName,
                                specialRole: collab.specialRole,
                                hasWorkedEnem: collab.hasWorkedEnem,
                                pastEditions: collab.pastEditions
                              })}
                            />
                            <div className="min-w-0 flex-1">
                              <h5 className="font-black text-xs text-slate-900 dark:text-white truncate" title={collab.name}>
                                {collab.name}
                              </h5>
                              <p className="text-[10px] font-mono text-slate-500">
                                CPF: {collab.cpf}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  isChefe
                                    ? "bg-amber-500/20 text-amber-900 dark:text-amber-300"
                                    : isAplicador
                                    ? "bg-indigo-500/20 text-indigo-900 dark:text-indigo-300"
                                    : "bg-teal-500/20 text-teal-900 dark:text-teal-300"
                                }`}>
                                  {isChefe && <Award className="w-2.5 h-2.5" />}
                                  {isAplicador && <UserCheck className="w-2.5 h-2.5" />}
                                  <span>{collab.assignedRole || "Fiscal de Sala"}</span>
                                </span>

                                {isAlreadyInThisRoom ? (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-950">
                                    Alocado nesta sala
                                  </span>
                                ) : isInOtherRoom ? (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    Alocado em: {collab.assignedRoom}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                    Disponível
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Button for this room */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                            {isAlreadyInThisRoom ? (
                              <button
                                type="button"
                                onClick={() => {
                                  quickAssignMobile(collab.id!, "DESALOCAR");
                                  setSuccessMsg(`${collab.name} desalocado da ${managingRoom.number}`);
                                  setTimeout(() => setSuccessMsg(null), 3000);
                                }}
                                className="w-full py-1.5 text-center text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition cursor-pointer"
                              >
                                Desalocar desta Sala
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 w-full">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const designatedRole = collab.assignedRole && collab.assignedRole.trim() !== ""
                                      ? collab.assignedRole
                                      : "Aplicador (Fiscal de Sala)";
                                    onMove(collab.id!, false, managingRoom.number, designatedRole);
                                    setSuccessMsg(`${collab.name} alocado na ${managingRoom.number} como ${designatedRole}!`);
                                    setTimeout(() => setSuccessMsg(null), 3000);
                                  }}
                                  className="flex-1 py-1.5 px-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 rounded-xl transition shadow-xs cursor-pointer active:scale-95 text-center truncate"
                                >
                                  + Alocar nesta Sala
                                </button>

                                {!isChefe && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onMove(collab.id!, false, managingRoom.number, "Chefe de Sala");
                                      setSuccessMsg(`${collab.name} alocado na ${managingRoom.number} como Chefe de Sala!`);
                                      setTimeout(() => setSuccessMsg(null), 3000);
                                    }}
                                    className="py-1.5 px-2.5 text-[10.5px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition cursor-pointer active:scale-95"
                                    title="Alocar como Chefe de Sala"
                                  >
                                    + Chefe
                                  </button>
                                )}

                                {!isAplicador && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onMove(collab.id!, false, managingRoom.number, "Aplicador (Fiscal de Sala)");
                                      setSuccessMsg(`${collab.name} alocado na ${managingRoom.number} como Aplicador!`);
                                      setTimeout(() => setSuccessMsg(null), 3000);
                                    }}
                                    className="py-1.5 px-2.5 text-[10.5px] font-extrabold text-indigo-800 dark:text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-xl transition cursor-pointer active:scale-95"
                                    title="Alocar como Aplicador"
                                  >
                                    + Aplicador
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-[#070b13] border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Mostrando {roomModalFilteredCollabs.length} de {approvedCollaborators.length} associados
              </span>
              <button
                type="button"
                onClick={() => setManagingRoom(null)}
                className="px-5 py-2 text-xs font-extrabold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              >
                Concluir e Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 0B: DIRECT OPERATIONAL SECTOR ALLOCATION WINDOW */}
      {/* ========================================================================= */}
      {managingSector && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-teal-500/15 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl shrink-0 shadow-xs border border-indigo-500/30">
                  {managingSector.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-black text-slate-900 dark:text-white text-base sm:text-lg">
                      Alocação de Posto — {managingSector.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                      Função Padrão: {managingSector.defaultRole}
                    </span>
                  </div>
                  {(() => {
                    const assignedInSec = approvedCollaborators.filter(c => isCollabInSector(c, managingSector));
                    const target = getSectorTarget(managingSector.id);
                    const isComplete = assignedInSec.length >= target && target > 0;

                    return (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{managingSector.desc}</span>
                        <span className={`font-bold ${isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          • Status: {assignedInSec.length}/{target} alocados {isComplete ? "✓ Completo" : "(Pendente)"}
                        </span>
                      </p>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setManagingSector(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* SECTION 1: Current Staff In This Sector */}
              {(() => {
                const assignedInSector = approvedCollaborators.filter(c => isCollabInSector(c, managingSector));
                return (
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-display font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Equipe Atual Alocada em {managingSector.name} ({assignedInSector.length} Colaboradores)
                        </h4>
                      </div>
                      {assignedInSector.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-bold">
                          Clique em "Desalocar" para remover deste posto
                        </span>
                      )}
                    </div>

                    {assignedInSector.length === 0 ? (
                      <div className="py-5 px-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-900/40">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Nenhum colaborador alocado atualmente neste posto operacional.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {assignedInSector.map((collab) => (
                          <div
                            key={collab.id}
                            className="p-3 rounded-xl border-2 flex items-center justify-between gap-2 shadow-xs bg-indigo-500/10 border-indigo-500/30 dark:bg-indigo-950/30 dark:border-indigo-700/50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FiscalAvatar
                                photoUrl={collab.photoUrl}
                                name={collab.name}
                                size="sm"
                                onClick={() => setLightboxData({
                                  imageUrl: collab.photoUrl || '',
                                  name: collab.name,
                                  role: collab.assignedRole || managingSector.defaultRole,
                                  cpf: collab.cpf,
                                  claName: collab.originalClaName || collab.claName,
                                  specialRole: collab.specialRole,
                                  hasWorkedEnem: collab.hasWorkedEnem,
                                  pastEditions: collab.pastEditions
                                })}
                              />
                              <div className="min-w-0">
                                <span className="font-black text-xs text-slate-900 dark:text-white truncate block">
                                  {collab.name}
                                </span>
                                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                  CPF: {collab.cpf}
                                </p>
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 bg-indigo-500/20 text-indigo-900 dark:text-indigo-300">
                                  <span>{collab.assignedRole || managingSector.defaultRole}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => quickAssignMobile(collab.id!, "DESALOCAR")}
                                className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 px-2 py-1 rounded-lg transition cursor-pointer"
                                title="Desalocar deste posto"
                              >
                                Desalocar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSubstituteModal(collab, managingSector.shortName)}
                                className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-lg transition cursor-pointer"
                                title="Substituir por outro colaborador"
                              >
                                Substituir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SECTION 2: Role Filters & Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-display font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Filter className="w-4 h-4 text-indigo-500" />
                      <span>Filtrar Associados para {managingSector.name}</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Selecione um filtro para listar colaboradores e associar a este posto
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                    <input
                      type="checkbox"
                      checked={sectorModalOnlyUnallocated}
                      onChange={(e) => setSectorModalOnlyUnallocated(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Apenas disponíveis (não alocados)</span>
                  </label>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sectorModalSearch}
                    onChange={(e) => setSectorModalSearch(e.target.value)}
                    placeholder="Buscar colaborador por nome, CPF ou função..."
                    className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  {sectorModalSearch && (
                    <button
                      onClick={() => setSectorModalSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Role Filter Pills */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-100/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSectorModalRoleFilter("sector_default")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      sectorModalRoleFilter === "sector_default"
                        ? "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    <span>Associados com esta Função ({managingSector.defaultRole})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSectorModalRoleFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      sectorModalRoleFilter === "all"
                        ? "bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <span>Todos os Colaboradores</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
                      {approvedCollaborators.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSectorModalRoleFilter("unallocated")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      sectorModalRoleFilter === "unallocated"
                        ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Livres / Disponíveis</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-mono">
                      {unallocated.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSectorModalRoleFilter("unallocated_with_role")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      sectorModalRoleFilter === "unallocated_with_role"
                        ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    }`}
                  >
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <span>Com Função (Sem Sala)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-mono">
                      {stats.unallocatedWithRole}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSectorModalRoleFilter("sem_funcao")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      sectorModalRoleFilter === "sem_funcao"
                        ? "bg-slate-700 text-white dark:bg-slate-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <Inbox className="w-3 h-3 text-slate-500" />
                    <span>Sem Função</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      {stats.unallocatedNoRole}
                    </span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: Collaborators List for Sector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Associados ({sectorModalFilteredCollabs.length} encontrados):
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    Clique em "+ Alocar" para associar ao posto <strong>{managingSector.name}</strong>
                  </span>
                </div>

                {sectorModalFilteredCollabs.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500">Nenhum colaborador encontrado com os filtros atuais.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sectorModalFilteredCollabs.map((collab) => {
                      const isAlreadyInSector = isCollabInSector(collab, managingSector);
                      const isAllocatedElsewhere = !collab.isReserve && collab.assignedRoom && !isAlreadyInSector;

                      return (
                        <div
                          key={collab.id}
                          className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                            isAlreadyInSector
                              ? "bg-indigo-500/10 border-indigo-500/40 dark:border-indigo-500/40 shadow-xs"
                              : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <FiscalAvatar
                              photoUrl={collab.photoUrl}
                              name={collab.name}
                              size="md"
                              onClick={() => setLightboxData({
                                imageUrl: collab.photoUrl || '',
                                name: collab.name,
                                role: collab.assignedRole || managingSector.defaultRole,
                                cpf: collab.cpf,
                                claName: collab.originalClaName || collab.claName,
                                specialRole: collab.specialRole,
                                hasWorkedEnem: collab.hasWorkedEnem,
                                pastEditions: collab.pastEditions
                              })}
                            />
                            <div className="min-w-0 flex-1">
                              <h5 className="font-black text-xs text-slate-900 dark:text-white truncate" title={collab.name}>
                                {collab.name}
                              </h5>
                              <p className="text-[10px] font-mono text-slate-500">
                                CPF: {collab.cpf}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                  {collab.assignedRole || "Sem função"}
                                </span>

                                {isAlreadyInSector ? (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                                    Alocado neste posto
                                  </span>
                                ) : isAllocatedElsewhere ? (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    Alocado em: {collab.assignedRoom}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                    Disponível
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Button */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                            {isAlreadyInSector ? (
                              <button
                                type="button"
                                onClick={() => {
                                  quickAssignMobile(collab.id!, "DESALOCAR");
                                  setSuccessMsg(`${collab.name} desalocado de ${managingSector.name}`);
                                  setTimeout(() => setSuccessMsg(null), 3000);
                                }}
                                className="w-full py-1.5 text-center text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition cursor-pointer"
                              >
                                Desalocar deste Posto
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const designatedRole = collab.assignedRole && collab.assignedRole.trim() !== ""
                                    ? collab.assignedRole
                                    : managingSector.defaultRole;
                                  onMove(collab.id!, false, managingSector.shortName, designatedRole);
                                  setSuccessMsg(`${collab.name} alocado em ${managingSector.name} como ${designatedRole}!`);
                                  setTimeout(() => setSuccessMsg(null), 3000);
                                }}
                                className="w-full py-1.5 px-3 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950 rounded-xl transition shadow-xs cursor-pointer active:scale-95 text-center"
                              >
                                + Alocar em {managingSector.name}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-[#070b13] border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Mostrando {sectorModalFilteredCollabs.length} de {approvedCollaborators.length} associados
              </span>
              <button
                type="button"
                onClick={() => setManagingSector(null)}
                className="px-5 py-2 text-xs font-extrabold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              >
                Concluir e Fechar
              </button>
            </div>

          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 1: CLICK-TO-ALLOCATE MODAL (CHOOSE ROOM & ROLE) */}
      {/* ========================================================================= */}
      {allocatingCollab && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-lg rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                  ⚡
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 dark:text-white text-base">
                    Alocar Fiscal na Sala de Prova
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina a sala de aplicação e o cargo do colaborador
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllocatingCollab(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              
              {/* Collab Info Card */}
              <div className="p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                <FiscalAvatar
                  photoUrl={allocatingCollab.photoUrl}
                  name={allocatingCollab.name}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {allocatingCollab.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>CPF: {allocatingCollab.cpf}</span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {allocatingCollab.isReserve ? "Banco de Reserva" : (allocatingCollab.assignedRole || "Disponível")}
                    </span>
                  </div>
                  {allocatingCollab.substitutionTag && (
                    <div className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {allocatingCollab.substitutionTag}
                    </div>
                  )}
                </div>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  1. Selecione a Sala de Destino:
                </label>
                <select
                  value={selectedTargetRoom}
                  onChange={(e) => setSelectedTargetRoom(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  {rooms.map((r) => {
                    const occ = roomOccupancyMap[r.number]?.total || 0;
                    const roomReq = getRoomTargetRequirements(r, eventConfig?.collaboratorMetrics || undefined);
                    const totalNeeded = roomReq.targetChefes + roomReq.targetAplicadores + roomReq.targetLedores + roomReq.targetLibras + roomReq.targetAcessibilidade;
                    const countStr = totalNeeded > 0
                      ? `${occ}/${totalNeeded} alocados`
                      : `${occ} ${occ === 1 ? "alocado" : "alocados"}`;

                    return (
                      <option key={r.number} value={r.number}>
                        {r.number} — {r.floor} ({countStr} | Cap: {r.capacity} cand.)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Role Selection (Highlight functions with > 0) */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  2. Cargo / Função na Sala:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTargetRole("Chefe de Sala")}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                      selectedTargetRole === "Chefe de Sala"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">Chefe de Sala</span>
                      {selectedTargetRole === "Chefe de Sala" && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">
                      Responsável pela abertura de malote e cronômetro
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTargetRole("Aplicador (Fiscal de Sala)")}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                      selectedTargetRole === "Aplicador (Fiscal de Sala)"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">Aplicador (Fiscal)</span>
                      {selectedTargetRole === "Aplicador (Fiscal de Sala)" && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">
                      Fiscalização presencial e preenchimento de ata
                    </span>
                  </button>
                </div>

                {/* Secondary Roles Selector with all roles that have > 0 */}
                <div className="mt-2.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Ou selecione outra função associada:
                  </label>
                  <select
                    value={selectedTargetRole}
                    onChange={(e) => setSelectedTargetRole(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Chefe de Sala">Chefe de Sala</option>
                    <option value="Aplicador (Fiscal de Sala)">Aplicador (Fiscal de Sala)</option>
                    {rolesWithQuantity
                      .filter(r => r.name !== "Chefe de Sala" && r.name !== "Aplicador (Fiscal de Sala)" && r.name !== "Aplicador")
                      .map(r => (
                        <option key={r.name} value={r.name}>
                          {r.name} ({r.totalAssigned} associados)
                        </option>
                      ))}
                    <option value="Fiscal Volante">Fiscal Volante (Corredores)</option>
                    <option value="Fiscal de Banheiro">Fiscal de Banheiro (Sanitários)</option>
                    <option value="Auxiliar de Acessibilidade">Auxiliar de Acessibilidade</option>
                    <option value="Interprete de Libras">Tradutor / Intérprete de Libras</option>
                    <option value="Ledor/Transcritor">Fiscal Especializado (Ledor/Transcritor)</option>
                    <option value="Porteiro">Porteiro / Controle de Portões</option>
                    <option value="Auxiliar de Limpeza">Auxiliar de Limpeza</option>
                    <option value="Tecnico Informática">Técnico em Informática</option>
                    <option value="Fiscal de Apoio / Recepção">Fiscal de Apoio / Recepção</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-[#070b13] border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAllocatingCollab(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAllocation}
                className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Alocação</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COLLABORATOR SUBSTITUTION MODAL */}
      {/* ========================================================================= */}
      {substitutingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-xl rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span>Substituição de Fiscal</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {substitutingTarget.roomNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O fiscal atual retornará à Reserva com a tag "Substituído"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubstitutingTarget(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              
              {/* Fiscal to be replaced */}
              <div className="p-3.5 rounded-xl border-2 border-rose-200 dark:border-rose-900/40 bg-rose-500/[0.04] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FiscalAvatar
                    photoUrl={substitutingTarget.collab.photoUrl}
                    name={substitutingTarget.collab.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400 block">
                      Fiscal Sendo Substituído:
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                      {substitutingTarget.collab.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      CPF: {substitutingTarget.collab.cpf} • {substitutingTarget.collab.assignedRole || "Aplicador"}
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0">
                  Vai p/ Reserva
                </span>
              </div>

              {/* Choose Replacement Candidate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Selecione o Fiscal Substituto:
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {availableCandidates.length} disponíveis
                  </span>
                </div>

                {/* Candidate Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={substituteSearchQuery}
                    onChange={(e) => setSubstituteSearchQuery(e.target.value)}
                    placeholder="Buscar substituto por nome ou CPF..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Candidate List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 border-2 border-slate-100 dark:border-slate-800 rounded-xl">
                  {availableCandidates.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">
                      Nenhum fiscal disponível na reserva para substituição imediata.
                    </div>
                  ) : (
                    availableCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        onClick={() => setSubstituteCandidateId(candidate.id || "")}
                        className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-2 ${
                          substituteCandidateId === candidate.id
                            ? "bg-amber-500/15 border-amber-500 shadow-xs"
                            : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FiscalAvatar
                            photoUrl={candidate.photoUrl}
                            name={candidate.name}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">
                              {candidate.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              CPF: {candidate.cpf} • {candidate.assignedRole || "Reserva"}
                            </span>
                          </div>
                        </div>

                        {substituteCandidateId === candidate.id && (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Function for the new fiscal */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Função do Novo Fiscal na Sala:
                </label>
                <select
                  value={substituteRole}
                  onChange={(e) => setSubstituteRole(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="Chefe de Sala">Chefe de Sala</option>
                  <option value="Aplicador (Fiscal de Sala)">Aplicador (Fiscal de Sala)</option>
                  <option value="Fiscal Volante">Fiscal Volante</option>
                  <option value="Fiscal de Banheiro">Fiscal de Banheiro</option>
                  <option value="Auxiliar de Acessibilidade">Auxiliar de Acessibilidade</option>
                  <option value="Interprete de Libras">Tradutor e Intérprete de Libras</option>
                  <option value="Ledor/Transcritor">Fiscal Especializado (Ledor/Transcritor)</option>
                </select>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-[#070b13] border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubstitutingTarget(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubstitution}
                disabled={!substituteCandidateId}
                className="px-5 py-2.5 text-xs font-extrabold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Efetuar Substituição</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: OFFICIAL TEMPLATE-BASED PDF / PRINT EXPORT MODAL & ACTIONS       */}
      {/* ========================================================================= */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#0c1220] w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Action Bar */}
            <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-700/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-black text-base sm:text-lg tracking-tight">
                      Central de Templates & Relatórios Oficiais
                    </h3>
                    <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      ENEM 2026
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                    Escolha um template pronto ou monte seu relatório personalizado para impressão, PDF e CSV.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadHtmlReport}
                  className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                  title="Baixar arquivo HTML/PDF para abrir e imprimir diretamente"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar HTML / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPrintWindow}
                  className="cursor-pointer px-3 py-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                  title="Abrir relatório pronto em nova aba para impressão"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="cursor-pointer px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                  title="Exportar planilha CSV formatada"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReportText}
                  className="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  title="Copiar texto formatado para a área de transferência"
                >
                  {copiedSuccess ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSuccess ? "Copiado!" : "Copiar"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Fechar Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable area with Templates + Custom config + Live preview */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-[#070b13] space-y-6">
              
              {/* SECTION: 9 TEMPLATE PRESETS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span>📑 Selecione o Template de Exportação</span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                      9 opções disponíveis
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Template ativo: <strong className="text-emerald-600 dark:text-emerald-400">{EXPORT_TEMPLATES.find(t => t.id === selectedExportTemplate)?.title}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {EXPORT_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedExportTemplate === tmpl.id;
                    const countMatching = approvedCollaborators.filter(c => 
                      isCollabInTemplate(c, tmpl.id, customExportConfig, rooms, isChefeDeSalaRole, isAplicadorRole, isRoleMatchingSector, isCollabInSector)
                    ).length;

                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedExportTemplate(tmpl.id)}
                        className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                          isSelected
                            ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                            : "bg-white dark:bg-[#0c1220] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0">
                              {tmpl.id === "chefe_de_sala" && "🏆"}
                              {tmpl.id === "aplicadores" && "👤"}
                              {tmpl.id === "volantes" && "🏃‍♂️"}
                              {tmpl.id === "banheiro" && "🚻"}
                              {tmpl.id === "limpeza" && "✨"}
                              {tmpl.id === "porteiro" && "🚪"}
                              {tmpl.id === "ensalamento" && "📚"}
                              {tmpl.id === "predio" && "🏛️"}
                              {tmpl.id === "personalizado" && "⚙️"}
                            </span>
                            <div className="min-w-0">
                              <h5 className={`font-display font-black text-xs truncate ${isSelected ? "text-emerald-900 dark:text-emerald-300" : "text-slate-800 dark:text-slate-200"}`}>
                                {tmpl.title}
                              </h5>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">
                                {tmpl.fieldsDescription}
                              </span>
                            </div>
                          </div>
                          
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected 
                              ? "bg-emerald-600 text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}>
                            {countMatching} fiscais
                          </span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Template Selecionado para Emissão</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: CUSTOM CONFIGURATION ACCORDION (If "Personalizado" is selected) */}
              {selectedExportTemplate === "personalizado" && (
                <div className="p-4 sm:p-5 bg-white dark:bg-[#0c1220] rounded-xl border-2 border-rose-300 dark:border-rose-900/50 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-rose-500" />
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Configuração do Relatório Personalizado
                      </h4>
                    </div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      Modo Customizado
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Role Filter */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        1. Selecione as Funções a Incluir:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Chefe de Sala", "Aplicador", "Volante", "Banheiro", 
                          "Limpeza", "Porteiro", "Representante", "TI", "Reservas", "Outros"
                        ].map((role) => {
                          const isChecked = customExportConfig.selectedRoles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setCustomExportConfig(prev => ({
                                  ...prev,
                                  selectedRoles: isChecked 
                                    ? prev.selectedRoles.filter(r => r !== role)
                                    : [...prev.selectedRoles, role]
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                                isChecked
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 opacity-60"
                              }`}
                            >
                              {isChecked ? <Check className="w-3 h-3 text-rose-500" /> : <span className="w-3 h-3" />}
                              <span>{role}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Columns Selector */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        2. Selecione as Colunas da Tabela:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: "nome", label: "Nome" },
                          { key: "cpf", label: "CPF" },
                          { key: "telefone", label: "Telefone" },
                          { key: "funcao", label: "Função" },
                          { key: "sala", label: "Sala Alocada" },
                          { key: "andar", label: "Pavimento/Andar" },
                          { key: "status", label: "Status/Histórico" },
                          { key: "assinatura", label: "Campo Assinatura" }
                        ].map((col) => {
                          const isChecked = customExportConfig.selectedColumns.includes(col.key as any);
                          return (
                            <button
                              key={col.key}
                              type="button"
                              onClick={() => {
                                setCustomExportConfig(prev => ({
                                  ...prev,
                                  selectedColumns: isChecked 
                                    ? prev.selectedColumns.filter(c => c !== col.key)
                                    : [...prev.selectedColumns, col.key as any]
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                                isChecked
                                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 opacity-60"
                              }`}
                            >
                              {isChecked ? <Check className="w-3 h-3 text-indigo-500" /> : <span className="w-3 h-3" />}
                              <span>{col.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Allocation Status Filter */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      3. Filtrar Status:
                    </span>
                    <div className="flex items-center gap-2">
                      {[
                        { val: "all", label: "Todos os Colaboradores" },
                        { val: "allocated", label: "Apenas Alocados em Sala/Posto" },
                        { val: "unallocated", label: "Apenas Livres / Reserva" }
                      ].map((st) => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setCustomExportConfig(prev => ({ ...prev, allocationStatusFilter: st.val as any }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                            customExportConfig.allocationStatusFilter === st.val
                              ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white font-bold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE REPORT PREVIEW BOX */}
              <div className="bg-white dark:bg-[#0c1220] rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                
                {/* Preview Controls Bar */}
                <div className="p-3.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TableProperties className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-display font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Pré-visualização do Relatório Oficial
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {sortedTemplateCollaborators.length} registros
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* Sorting selector */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-250 dark:border-slate-700 text-xs shadow-xs">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 px-1.5 flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3 text-emerald-500" /> Ordenar:
                      </span>
                      <button
                        type="button"
                        onClick={() => setExportSortBy("function_alphabetical")}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                          exportSortBy === "function_alphabetical"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title="Ordenação por Função e Nome em Ordem Alfabética (A-Z)"
                      >
                        🏷️ Função + Nome (A-Z)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportSortBy("alphabetical")}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                          exportSortBy === "alphabetical"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title="Ordenação geral de todos em Ordem Alfabética (A-Z)"
                      >
                        🔤 Nome (A-Z)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportSortBy("room_alphabetical")}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                          exportSortBy === "room_alphabetical"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title="Ordenação por Sala/Posto e Nome"
                      >
                        🚪 Sala / Posto
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-60">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={exportSearchQuery}
                        onChange={(e) => setExportSearchQuery(e.target.value)}
                        placeholder="Buscar nome, CPF, função, sala..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      {exportSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setExportSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Preview Table */}
                <div className="max-h-96 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-xs">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        {activeTemplateColumns.includes("nome") && <th className="py-2.5 px-3">Nome do Colaborador</th>}
                        {activeTemplateColumns.includes("cpf") && <th className="py-2.5 px-3 w-32">CPF</th>}
                        {activeTemplateColumns.includes("telefone") && <th className="py-2.5 px-3 w-32">Telefone</th>}
                        {activeTemplateColumns.includes("funcao") && <th className="py-2.5 px-3 w-40">Função</th>}
                        {activeTemplateColumns.includes("sala") && <th className="py-2.5 px-3 w-36">Sala Alocada</th>}
                        {activeTemplateColumns.includes("andar") && <th className="py-2.5 px-3 w-28">Pavimento</th>}
                        {activeTemplateColumns.includes("status") && <th className="py-2.5 px-3 w-28">Histórico</th>}
                        {activeTemplateColumns.includes("assinatura") && <th className="py-2.5 px-3 w-40">Assinatura</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {sortedTemplateCollaborators.length === 0 ? (
                        <tr>
                          <td colSpan={activeTemplateColumns.length + 1} className="py-8 text-center text-slate-400 italic">
                            Nenhum colaborador encontrado para este template com os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        sortedTemplateCollaborators.map((fiscal, idx) => {
                          const roomObj = rooms.find(r => r.number === fiscal.assignedRoom);
                          const roomLabel = fiscal.assignedRoom 
                            ? (rooms.some(r => r.number === fiscal.assignedRoom) ? `Sala ${fiscal.assignedRoom}` : fiscal.assignedRoom)
                            : "Não Alocado / Reserva";

                          return (
                            <tr key={fiscal.id || fiscal.cpf} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-2 px-3 font-mono font-bold text-slate-400 text-center">
                                {idx + 1}
                              </td>
                              {activeTemplateColumns.includes("nome") && (
                                <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                                  {fiscal.name}
                                </td>
                              )}
                              {activeTemplateColumns.includes("cpf") && (
                                <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                                  {fiscal.cpf}
                                </td>
                              )}
                              {activeTemplateColumns.includes("telefone") && (
                                <td className="py-2 px-3 font-mono text-[11px] text-sky-700 dark:text-sky-400 font-semibold">
                                  {fiscal.whatsapp || "—"}
                                </td>
                              )}
                              {activeTemplateColumns.includes("funcao") && (
                                <td className="py-2 px-3 font-bold text-indigo-700 dark:text-indigo-300">
                                  <span className="px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20 text-[10px]">
                                    {fiscal.assignedRole || (fiscal.isReserve ? "Reserva" : "Aplicador")}
                                  </span>
                                </td>
                              )}
                              {activeTemplateColumns.includes("sala") && (
                                <td className="py-2 px-3 font-bold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                    fiscal.assignedRoom 
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  }`}>
                                    {roomLabel}
                                  </span>
                                </td>
                              )}
                              {activeTemplateColumns.includes("andar") && (
                                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                                  {roomObj ? `Pav. ${roomObj.floor}` : "—"}
                                </td>
                              )}
                              {activeTemplateColumns.includes("status") && (
                                <td className="py-2 px-3 text-[10px] text-slate-500 dark:text-slate-400">
                                  {fiscal.substitutionTag || fiscal.status || "Efetivo"}
                                </td>
                              )}
                              {activeTemplateColumns.includes("assinatura") && (
                                <td className="py-2 px-3">
                                  <div className="h-4 border-b border-slate-300 dark:border-slate-700"></div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

            {/* Modal Footer Bar with Full Actions */}
            <div className="p-4 bg-white dark:bg-[#0c1220] border-t-2 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Local: <strong className="text-slate-800 dark:text-slate-200">{building?.name || "Local de Aplicação"}</strong> • CLA: <strong className="text-slate-800 dark:text-slate-200">{claName || "Coordenação"}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHtmlReport}
                  className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Relatório Formatado</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DIAGNOSTIC FAILURE MODAL */}
      <CollaboratorFailureModal
        isOpen={!!diagnoseCollab}
        collaborator={diagnoseCollab}
        onClose={() => setDiagnoseCollab(null)}
      />

      {/* IMAGE LIGHTBOX MODAL */}
      <ImageLightboxModal
        data={lightboxData}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
}

function isAlreadyRemapped(collab: CollaboratorInfo): boolean {
  return Boolean(!collab.isReserve && collab.assignedRoom && collab.assignedRoom.trim() !== "");
}

function collaboratorWarnings(collab: CollaboratorInfo, onDiagnose?: (c: CollaboratorInfo) => void) {
  if (collab.orionStatus === "Erro") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDiagnose?.(collab);
        }}
        title="Clique para abrir detalhes da falha cadastral"
        className="mt-2 w-full text-left text-[9px] text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 dark:text-rose-400 p-1.5 rounded-lg flex items-center justify-between gap-1 border border-rose-500/30 cursor-pointer group active:scale-95 transition"
      >
        <div className="flex items-center gap-1 min-w-0">
          <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0 group-hover:animate-bounce" />
          <span className="font-extrabold text-[8.5px] text-rose-600 dark:text-rose-400 truncate">{collab.orionErrors[0] || "Inconsistência Orion"}</span>
        </div>
        <span className="text-[8px] bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1 py-0.2 rounded font-mono font-bold shrink-0">Ver</span>
      </button>
    );
  }
  return null;
}

/**
 * Generates a complete, self-contained, printable HTML document based on the selected template and active columns
 */
function generateTemplatePrintableHtml(
  building: BuildingInfo | null | undefined,
  claName: string | undefined,
  rooms: RoomDetails[],
  collaborators: CollaboratorInfo[],
  templateMeta: TemplateMeta,
  columns: ("nome" | "cpf" | "telefone" | "funcao" | "sala" | "andar" | "status" | "assinatura")[],
  customCfg: CustomExportConfig,
  exportSortBy: ExportSortType = "function_alphabetical"
): string {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const totalAllocated = collaborators.filter(c => !c.isReserve && c.assignedRoom && c.assignedRoom.trim() !== "").length;

  const sortDescription = exportSortBy === "function_alphabetical"
    ? "Hierarquia de Função e Ordem Alfabética (A-Z)"
    : exportSortBy === "alphabetical"
      ? "Ordem Alfabética Geral (Nome A-Z)"
      : "Número de Sala/Posto e Ordem Alfabética";

  const headerCols: { key: string; label: string; width?: string; align?: string }[] = [
    { key: "num", label: "#", width: "35px", align: "center" }
  ];
  if (columns.includes("nome")) headerCols.push({ key: "nome", label: "Nome do Colaborador", width: "auto" });
  if (columns.includes("cpf")) headerCols.push({ key: "cpf", label: "CPF", width: "125px" });
  if (columns.includes("telefone")) headerCols.push({ key: "telefone", label: "Telefone / WhatsApp", width: "125px" });
  if (columns.includes("funcao")) headerCols.push({ key: "funcao", label: "Função / Cargo", width: "140px" });
  if (columns.includes("sala")) headerCols.push({ key: "sala", label: "Sala / Posto Alocado", width: "130px" });
  if (columns.includes("andar")) headerCols.push({ key: "andar", label: "Pavimento / Andar", width: "110px" });
  if (columns.includes("status")) headerCols.push({ key: "status", label: "Status / Obs", width: "110px" });
  if (columns.includes("assinatura")) headerCols.push({ key: "assinatura", label: "Assinatura do Fiscal", width: "150px" });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório ENEM 2026 - ${templateMeta.title} - ${building?.name || 'Local'}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; line-height: 1.3; color: #111827; background: #fff; margin: 0; padding: 16px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .tag { font-family: monospace; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #047857; }
    h1 { margin: 2px 0 4px; font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
    .template-badge { display: inline-block; background: #0f766e; color: #fff; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-left: 6px; }
    .sub { font-size: 10.5px; color: #334155; font-weight: 600; }
    .meta { font-family: monospace; font-size: 9.5px; font-weight: 700; text-align: right; color: #475569; }
    .stats { display: flex; gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
    .stat-box { flex: 1; }
    .stat-label { font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block; }
    .stat-val { font-family: monospace; font-size: 12px; font-weight: 800; color: #0f172a; }
    .fields-tag { font-size: 9px; font-weight: 700; color: #0369a1; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; display: inline-block; margin-top: 4px; margin-right: 6px; }
    .sort-tag { font-size: 9px; font-weight: 700; color: #047857; background: #d1fae5; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0; display: inline-block; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 10px; margin-bottom: 15px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; }
    th { background: #f1f5f9; font-size: 8.5px; font-weight: 800; text-transform: uppercase; padding: 6px 6px; border-bottom: 1.5px solid #94a3b8; color: #334155; }
    td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .sig-line { border-bottom: 1px solid #64748b; height: 16px; width: 100%; }
    .sig-grid { display: flex; gap: 30px; margin-top: 25px; padding-top: 15px; border-top: 1.5px solid #94a3b8; page-break-inside: avoid; }
    .sig-block { flex: 1; text-align: center; font-size: 9.5px; }
    .sig-box-line { border-bottom: 1.5px solid #0f172a; height: 26px; margin: 0 auto 6px; max-width: 200px; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; font-weight: 700; background: #e0e7ff; color: #3730a3; }
    .print-btn-bar { margin-bottom: 16px; text-align: right; }
    .btn { background: #059669; color: white; border: none; padding: 7px 14px; font-weight: 800; border-radius: 6px; cursor: pointer; font-size: 11px; }
    @media print { .print-btn-bar { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Imprimir Agora / Salvar PDF</button>
  </div>

  <div class="header">
    <div>
      <span class="tag">EXAME NACIONAL DO ENSINO MÉDIO — ENEM 2026</span>
      <h1>${templateMeta.title.toUpperCase()} <span class="template-badge">${templateMeta.badge}</span></h1>
      <div class="sub">
        Local de Prova: <strong>${building?.name || 'Local Não Definido'}</strong> | Coordenação: <strong>${claName || 'CLA'}</strong>
      </div>
      <div>
        <span class="fields-tag">📋 Estrutura: ${templateMeta.fieldsDescription}</span>
        <span class="sort-tag">⚡ Ordenação: ${sortDescription}</span>
      </div>
    </div>
    <div class="meta">
      <div>Data de Emissão: ${dateStr}</div>
      <div>Horário: ${timeStr}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat-box"><span class="stat-label">Total no Relatório:</span><span class="stat-val">${collaborators.length} Colaboradores</span></div>
    <div class="stat-box"><span class="stat-label">Alocados em Sala/Posto:</span><span class="stat-val">${totalAllocated} Alocados</span></div>
    <div class="stat-box"><span class="stat-label">Disponíveis / Livres:</span><span class="stat-val">${collaborators.length - totalAllocated}</span></div>
    <div class="stat-box"><span class="stat-label">Salas no Prédio:</span><span class="stat-val">${rooms.length} Salas</span></div>
  </div>

  <table>
    <thead>
      <tr>
        ${headerCols.map(col => `<th style="${col.width ? `width: ${col.width};` : ''} ${col.align ? `text-align: ${col.align};` : ''}">${col.label}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${collaborators.length === 0 ? `
        <tr><td colspan="${headerCols.length}" style="text-align: center; color: #94a3b8; font-style: italic; padding: 14px;">Nenhum colaborador encontrado para o template selecionado com os filtros atuais.</td></tr>
      ` : collaborators.map((c, idx) => {
        const roomObj = rooms.find(r => r.number === c.assignedRoom);
        const roomStr = c.assignedRoom ? (rooms.some(r => r.number === c.assignedRoom) ? `Sala ${c.assignedRoom}` : c.assignedRoom) : "Não Alocado";
        const floorStr = roomObj ? `Pav. ${roomObj.floor}` : "—";
        return `
        <tr>
          <td style="font-family: monospace; font-weight: bold; text-align: center; color: #64748b;">${idx + 1}</td>
          ${columns.includes("nome") ? `<td style="font-weight: bold; color: #0f172a;">${c.name}</td>` : ''}
          ${columns.includes("cpf") ? `<td style="font-family: monospace; font-weight: bold; color: #334155;">${c.cpf}</td>` : ''}
          ${columns.includes("telefone") ? `<td style="font-family: monospace; color: #0369a1; font-weight: 600;">${c.whatsapp || "—"}</td>` : ''}
          ${columns.includes("funcao") ? `<td><span class="badge">${c.assignedRole || (c.isReserve ? "Reserva" : "Aplicador")}</span></td>` : ''}
          ${columns.includes("sala") ? `<td style="font-weight: 700; color: ${c.assignedRoom ? '#047857' : '#94a3b8'};">${roomStr}</td>` : ''}
          ${columns.includes("andar") ? `<td style="font-size: 9px; color: #475569;">${floorStr}</td>` : ''}
          ${columns.includes("status") ? `<td style="font-size: 9px; color: #64748b;">${c.substitutionTag || c.status || "Efetivo"}</td>` : ''}
          ${columns.includes("assinatura") ? `<td><div class="sig-line"></div></td>` : ''}
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-box-line"></div>
      <strong>${claName || 'Coordenador de Local de Aplicação (CLA)'}</strong><br>
      <span style="color: #64748b;">Responsável pelo Local de Aplicação</span>
    </div>
    <div class="sig-block">
      <div class="sig-box-line"></div>
      <strong>Supervisão Geral ENEM 2026</strong><br>
      <span style="color: #64748b;">Validação e Encerramento do Relatório</span>
    </div>
  </div>
</body>
</html>`;
}
