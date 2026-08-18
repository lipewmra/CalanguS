export type UserRole = "SuperAdmin" | "CLA" | "ALA" | "Colaborador";

export interface PingramConfig {
  apiKey: string;
  senderEmail?: string;
  senderName?: string;
  senderPhone?: string;
  enabled?: boolean;
  lastTestedAt?: string;
  lastTestStatus?: "success" | "error";
  lastTestMessage?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  emails?: string[];
  name: string;
  role: UserRole;
  roles?: UserRole[];
  assignedBuildingId?: string;
  coordinationCode?: string;
  claId?: string;
  hasAccessed?: boolean;
  photoUrl?: string;
  pingramConfig?: PingramConfig;
  createdBySuperAdmin?: boolean;
  createdByCla?: boolean;
}

export interface RoomDetails {
  number: string;
  capacity: number;
  floor: string;
  details?: string;
}

export interface CollaboratorScheduleItem {
  id?: string;
  time: string;
  title: string;
  desc: string;
}

export interface ClaCustomRole {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
  targetQuantity?: number;
  remuneration?: number;
  isDefault?: boolean;
}

export interface CalangusTemplate {
  id: string;
  title: string;
  channel: "whatsapp" | "email" | "calangus" | "sms";
  subject: string;
  body: string;
  isCustom?: boolean;
}

export interface MessageReadReceipt {
  collaboratorId: string;
  collaboratorName?: string;
  collaboratorCpf?: string;
  collaboratorEmail?: string;
  collaboratorPhone?: string;
  collaboratorRole?: string;
  readAt: string;
}

export interface MessagePollOption {
  id: string;
  text: string;
}

export interface MessagePoll {
  id: string;
  question: string;
  type: "single_choice" | "multiple_choice" | "text_input" | "confirmation_yes_no";
  options?: MessagePollOption[];
  allowCustomText?: boolean;
  required?: boolean;
  helpText?: string;
}

export interface MessageCollaboratorResponse {
  collaboratorId: string;
  collaboratorName?: string;
  collaboratorCpf?: string;
  collaboratorEmail?: string;
  collaboratorPhone?: string;
  collaboratorRole?: string;
  selectedOptionIds?: string[];
  selectedOptionTexts?: string[];
  textAnswer?: string;
  answeredAt: string;
}

export interface CalangusMessage {
  id: string;
  senderClaId: string;
  senderName: string;
  senderRole?: string;
  targetType: "all" | "associated" | "reserve" | "pending_attendance" | "confirmed_attendance" | "role" | "individual";
  targetRoleId?: string;
  targetRoleName?: string;
  targetCollaboratorId?: string;
  targetCollaboratorName?: string;
  targetCollaboratorEmail?: string;
  targetCollaboratorPhone?: string;
  targetSummary?: string;
  targetRecipientIds?: string[];
  title: string;
  content: string;
  sentAt: string;
  channels: Array<"calangus" | "email" | "whatsapp" | "sms">;
  channel?: "calangus" | "email" | "whatsapp" | "sms";
  readBy?: string[]; // IDs/CPFs/Emails of collaborators who read this message
  readReceipts?: MessageReadReceipt[]; // Detailed read receipts with timestamp & collaborator info
  poll?: MessagePoll; // Interactive question/poll/inquiry created by the CLA
  responses?: MessageCollaboratorResponse[]; // Answers submitted by collaborators
}

export interface BuildingInfo {
  id?: string;
  claId: string;
  name: string;
  address: string;
  roomsCount: number;
  virtualCapacity: number; // e.g. 30 per room
  realCapacity: number; // calculated rooms * capacity
  coordRoom: string;
  specialRoomsCount: number;
  specialDetails: string;
  extraRoomsCount: number;
  rooms?: RoomDetails[];
  specialRooms?: RoomDetails[];
  extraRooms?: RoomDetails[];
  rolesTargetQuantities?: Record<string, number>;
  collaboratorSchedule?: CollaboratorScheduleItem[];
  collaboratorInstructions?: string;
  customRoles?: ClaCustomRole[];
  messages?: CalangusMessage[];
  customMessageTemplates?: CalangusTemplate[];
  pingramConfig?: PingramConfig;
}

export interface PastEdition {
  year: number;
  role: string;
}

export interface TransferRequestInfo {
  requestId: string;
  targetClaId: string;
  targetClaName: string;
  targetBuildingName?: string;
  targetUserEmail?: string;
  targetClaPhone?: string;
  requestedAt: string;
  status: "Pendente" | "Aprovado" | "Recusado" | "Cancelado";
  respondedAt?: string;
  notes?: string;
}

export interface CollaboratorInfo {
  id?: string;
  claId: string;
  claName?: string; // Name of currently assigned CLA
  originalClaId?: string; // CLA who originally registered the fiscal
  originalClaName?: string; // Name/School of origin CLA
  name: string;
  birthDate: string;
  cpf: string;
  whatsapp: string;
  email: string;
  education: "Ensino Fundamental (Alfabetizado)" | "Ensino Médio" | "Ensino Técnico" | "Ensino Superior Cursando" | "Ensino Superior Completo" | "Pós-Graduação" | "Mestrado" | "Doutorado";
  disability: string; // "Nenhuma" or text
  hasWorkedEnem: boolean;
  pastEditions: PastEdition[]; // checkbox lists for 1998 up to 2025
  pixKey: string;
  specialRole: "Nenhuma" | "Libras" | "Tradutor e Intérprete" | "Técnico de Informática" | "Auxiliar de Acessibilidade" | "Ledor/Transcritor" | "Apenas Ledor" | "Apenas leitor" | "Leitor transcritor espanhol" | "Leitor transcritor inglês" | "Apenas leitor espanhol" | "Apenas leitor inglês" | "Ledora de Gestante" | string;
  languages: string[]; // only relevant if "Tradutor e Intérprete"
  certificateAttachedName?: string;
  isReserve: boolean;
  assignedRoom?: string; // e.g. "Sala 01", "Coordenação", or null
  status: "Pendente" | "Confirmado" | "Recusado" | "Cancelado";
  assignedRole?: string;
  orionStatus: "Ok" | "Erro";
  orionErrors: string[]; // lists data inconsistencies like CPFs, lower/uppercase structures
  orionSynced: boolean;
  photoUrl?: string;
  foodRestrictions?: string;
  snackPreference?: "Padrão" | "Vegetariano" | "Vegano" | "Sem Glúten";
  isExternalRecruit?: boolean;
  referencePerson?: string;
  transferRequest?: TransferRequestInfo | null;
  transferHistory?: Array<{
    fromClaId: string;
    fromClaName: string;
    toClaId: string;
    toClaName: string;
    date: string;
    approvedBy?: string;
  }>;
  attendanceStatus?: "Pendente" | "Confirmado" | "Recusado";
  refusedRole?: string;
  refusedRoleDate?: string;
  refusalTag?: string;
  attendanceConfirmedAt?: string;
  createdAt?: string; // Form submission/registration ISO date
}

export interface Quote {
  supplier: string;
  pricePerUnit: number;
  menu: string;
  type?: "lanche" | "refeicao" | "ambos";
  priceLanche?: number;
  priceRefeicao?: number;
  lancheItems?: string[];
  refeicaoItems?: string[];
  issuesInvoice: boolean;
  selected: boolean;
}

export interface CateringDayDetails {
  menuSelected: string;
  quoteSelected?: string;
  pricePerUnit: number;
  arrivalConfirmed: boolean;
  conferidoPor?: string;
  deliveredSlices: Record<string, boolean>; // mapping collabId -> delivered! (legacy support)
  deliveredSnacks?: Record<string, boolean>; // mapping collabId -> snacks delivered
  deliveredMeals?: Record<string, boolean>;   // mapping collabId -> meals delivered
  snackArrivalConfirmed?: boolean;
  snackConferidoPor?: string;
  mealArrivalConfirmed?: boolean;
  mealConferidoPor?: string;
}

export interface CateringInfo {
  id?: string;
  claId: string;
  quotes: Quote[];
  day1: CateringDayDetails;
  day2: CateringDayDetails;
  releasedToCollaborators?: boolean;
}

export interface PhotoRecord {
  id?: string;
  claId: string;
  imageUrl: string;
  description: string;
  day: 1 | 2;
  createdAt: string;
}

export interface EventConfigInfo {
  id: string;
  year: number;
  examDates: string[]; // ["08/11/2026", "15/11/2026"]
  trainingDates: string[];
  generalInstructions: string;
  initialClaTasks: string[];
}

export interface ClaActivities {
  id?: string;
  claId: string;
  visitation: {
    checked: boolean;
    date: string;
    notes: string;
  };
  alaDefined: {
    checked: boolean;
    name: string;
    contact: string;
  };
  training: {
    checked: boolean;
    date: string;
    format: "Presencial" | "Online" | "Não Participou" | "";
  };
  receivedMaterial: {
    checked: boolean;
    receiverName: string;
    receivedDate: string;
  };
  checkedMaterial: {
    checked: boolean;
    checkedDate: string;
    checkNotes: string;
  };
  filledOrion: {
    checked: boolean;
    fillDate: string;
    orionCode: string;
  };
  updatedAt?: string;
}
