export type UserRole = "SuperAdmin" | "CLA" | "ALA" | "Colaborador";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  roles?: UserRole[];
  assignedBuildingId?: string;
  coordinationCode?: string;
  claId?: string;
  hasAccessed?: boolean;
}

export interface RoomDetails {
  number: string;
  capacity: number;
  floor: string;
  details?: string;
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
}

export interface PastEdition {
  year: number;
  role: string;
}

export interface CollaboratorInfo {
  id?: string;
  claId: string;
  name: string;
  birthDate: string;
  cpf: string;
  whatsapp: string;
  email: string;
  education: "Ensino Médio" | "Ensino Técnico" | "Ensino Superior Cursando" | "Ensino Superior Completo" | "Pós-Graduação" | "Mestrado" | "Doutorado";
  disability: string; // "Nenhuma" or text
  hasWorkedEnem: boolean;
  pastEditions: PastEdition[]; // checkbox lists for 1998 up to 2025
  pixKey: string;
  specialRole: "Nenhuma" | "Libras" | "Tradutor e Intérprete" | "Técnico de Informática" | "Auxiliar de Acessibilidade" | "Ledor/Transcritor" | "Ledora de Gestante";
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
