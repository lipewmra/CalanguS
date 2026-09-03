import React, { useState, useRef, useEffect } from "react";
import { 
  User, 
  Coffee, 
  FileText, 
  Calendar, 
  CheckSquare, 
  MapPin, 
  Navigation, 
  Check, 
  Upload, 
  Camera,
  X, 
  ExternalLink, 
  Video, 
  Image as ImageIcon,
  AlertTriangle, 
  Info, 
  Sparkles, 
  BookOpen,
  ArrowRight,
  UserCheck,
  ChevronDown,
  MessageSquare,
  Inbox,
  Copy,
  Vote,
  Send,
  CheckCircle2,
  Clock,
  HelpCircle,
  ThumbsUp,
  Edit2,
  Banknote,
  Award,
  CalendarCheck,
  Building2,
  ShieldCheck,
  Bot,
  Users
} from "lucide-react";
import { UserProfile, BuildingInfo, CateringInfo, CollaboratorInfo, CalangusMessage, MessageReadReceipt, MessageCollaboratorResponse, DidacticMaterial, MaterialAccessLog, EventConfigInfo } from "../types";
import { subscribeToDidacticMaterials, recordCollaboratorMaterialAccess } from "../lib/db-services";
import PhotoUploader from "./PhotoUploader";
import { DEFAULT_ENEM_SCHEDULE } from "./CollaboratorSettingsView";
import { getRolePayment } from "./AssociationView";
import CalangusIaView from "./CalangusIaView";

interface CollaboratorDashboardProps {
  currentUser: UserProfile;
  building: BuildingInfo | null;
  catering: CateringInfo | null;
  collaboratorRecord: CollaboratorInfo | null;
  individualConfirmationStatus: "Pendente" | "Confirmado" | "Recusado";
  onUpdateConfirmationStatus: (status: "Pendente" | "Confirmado" | "Recusado", roleNameToRefuse?: string) => void;
  onUpdateProfile: (updates: Partial<CollaboratorInfo>) => Promise<void>;
  onSaveBuilding?: (building: BuildingInfo) => Promise<void> | void;
  eventConfig?: EventConfigInfo | null;
  claName?: string;
}

export default function CollaboratorDashboard({
  currentUser,
  building,
  catering,
  collaboratorRecord,
  individualConfirmationStatus,
  onUpdateConfirmationStatus,
  onUpdateProfile,
  onSaveBuilding,
  eventConfig,
  claName
}: CollaboratorDashboardProps) {
  const [activeMenuTab, setActiveMenuTab] = useState<string>("messages");
  const [isRefusingModalOpen, setIsRefusingModalOpen] = useState(false);
  
  // Profile edit states
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [education, setEducation] = useState<any>("Ensino Superior Completo");
  const [referencePerson, setReferencePerson] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Snack menu choice states
  const [snackPreference, setSnackPreference] = useState("Padrão");
  const [restrictions, setRestrictions] = useState("");
  const [isSavingSnack, setIsSavingSnack] = useState(false);
  const [snackSuccessMsg, setSnackSuccessMsg] = useState("");

  // Interactive Checklist states (Stored in LocalStorage for persistence per collaborator)
  const [checklistItems, setChecklistItems] = useState([
    { id: "apparel", label: "Vestuário Recomendado", desc: "Usar roupas leves e sapato inteiramente fechado (Regulamento Cebraspe obriga calçado fechado).", checked: false },
    { id: "pen", label: "Caneta Esferográfica Preta", desc: "Levar de 2 a 3 canetas de corpo transparente e tinta de cor preta ou azul.", checked: false },
    { id: "id", label: "Documento Oficial com Foto", desc: "Levar carteira de identidade física original (RG, CNH, Passaporte ou e-Título).", checked: false },
    { id: "water", label: "Água & Alimentação leve", desc: "Garrafas devem ser de plástico transparente de até 1.5L, sem os rótulos decorativos.", checked: false },
    { id: "phone", label: "Smartphone preparado para envelopes", desc: "Celular desligado e sem alarmes ativos debaixo da cadeira dentro do envelope de segurança.", checked: false },
    { id: "rest", label: "Descanso prévio", desc: "Estar alimentado e bem descansado para cumprir as 8 horas de supervisão tática.", checked: false },
  ]);

  useEffect(() => {
    if (collaboratorRecord) {
      setName(collaboratorRecord.name || "");
      setCpf(collaboratorRecord.cpf || "");
      setBirthDate(collaboratorRecord.birthDate || "");
      setWhatsapp(collaboratorRecord.whatsapp || "");
      setEmail(collaboratorRecord.email || "");
      setEducation(collaboratorRecord.education || "Ensino Superior Completo");
      setReferencePerson(collaboratorRecord.referencePerson || "");
      setPhotoUrl(collaboratorRecord.photoUrl || "");
      setRestrictions(collaboratorRecord.foodRestrictions || "");
      setSnackPreference(collaboratorRecord.snackPreference || "Padrão");
    }
  }, [collaboratorRecord]);

  // Load checklist progress from local storage
  useEffect(() => {
    const saved = localStorage.getItem(`enem_checklist_${currentUser.uid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChecklistItems(prev => prev.map(item => ({
          ...item,
          checked: !!parsed[item.id]
        })));
      } catch (e) {
        console.error(e);
      }
    }
  }, [currentUser.uid]);

  const handleChecklistToggle = (itemId: string) => {
    const updated = checklistItems.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklistItems(updated);
    const reduction = updated.reduce((acc, item) => {
      acc[item.id] = item.checked;
      return acc;
    }, {} as Record<string, boolean>);
    localStorage.setItem(`enem_checklist_${currentUser.uid}`, JSON.stringify(reduction));
  };

  const handleCollaboratorPhotoChange = async (newUrl: string) => {
    setPhotoUrl(newUrl);
    if (collaboratorRecord?.id) {
      setIsSavingProfile(true);
      try {
        await onUpdateProfile({ photoUrl: newUrl });
        setProfileSuccessMsg("Foto do crachá atualizada e sincronizada com sucesso!");
        setTimeout(() => setProfileSuccessMsg(""), 3500);
      } catch (err) {
        console.error("Error saving collaborator photo:", err);
      } finally {
        setIsSavingProfile(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorRecord?.id) return;
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        name,
        cpf,
        birthDate,
        whatsapp,
        email,
        education,
        referencePerson,
        photoUrl
      });
      setProfileSuccessMsg("Seu cadastro de fiscal foi atualizado com sucesso e sincronizado.");
      setTimeout(() => setProfileSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveSnackSelection = async () => {
    if (!collaboratorRecord?.id) return;
    setIsSavingSnack(true);
    try {
      await onUpdateProfile({
        snackPreference: snackPreference as any,
        foodRestrictions: restrictions
      });
      setSnackSuccessMsg("Suas preferências de alimentação e restrições foram encaminhadas aos coordenadores CLA.");
      setTimeout(() => setSnackSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSnack(false);
    }
  };

  // Agenda Timeline List - loaded dynamically from building settings, global SuperAdmin event config or default official schedule
  const activeSchedule = (building?.collaboratorSchedule && building.collaboratorSchedule.length > 0)
    ? building.collaboratorSchedule 
    : (eventConfig?.collaboratorSchedule && eventConfig.collaboratorSchedule.length > 0)
      ? eventConfig.collaboratorSchedule
      : DEFAULT_ENEM_SCHEDULE;

  const activeInstructions = building?.collaboratorInstructions || eventConfig?.collaboratorInstructions || "";

  // Is Snack released?
  const isSnackMenuReleased = catering?.releasedToCollaborators === true;
  
  const selectedQuotes = catering?.quotes?.filter(q => q.selected) || [];
  const activeLancheQuote = selectedQuotes.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || 
                             catering?.quotes?.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || null;
  const activeRefeicaoQuote = selectedQuotes.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || 
                               catering?.quotes?.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || null;

  const activeQuote = catering?.quotes?.find(q => q.selected) || catering?.quotes?.[0] || null;

  // Checklist Progress calculation - accurate 0% to 100%
  const totalChecklist = checklistItems.length;
  const checkedCount = checklistItems.filter(i => i.checked).length;
  const finalPercent = totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;

  // Internal Calangus messages state & reactivity
  const [internalMessages, setInternalMessages] = useState<CalangusMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<"all" | "unread" | "read">("all");
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState<string>("");
  const [pollSelections, setPollSelections] = useState<Record<string, { optionIds: string[]; texts: string[]; customText: string }>>({});
  const [editingPollMsgId, setEditingPollMsgId] = useState<string | null>(null);

  // Didactic materials state
  const [didacticMaterials, setDidacticMaterials] = useState<DidacticMaterial[]>([]);
  const [localAccessLogs, setLocalAccessLogs] = useState<Record<string, string>>({}); // materialId -> timestamp

  useEffect(() => {
    const unsub = subscribeToDidacticMaterials((list) => {
      setDidacticMaterials(list);
    });
    return () => unsub();
  }, []);

  const myCollabId = collaboratorRecord?.id || "";
  const myEmail = currentUser?.email || "";
  const myCpf = collaboratorRecord?.cpf || "";
  const myRole = collaboratorRecord?.assignedRole || collaboratorRecord?.specialRole || "";
  const isMyReserve = Boolean(collaboratorRecord?.isReserve);
  const myAttendance = collaboratorRecord?.attendanceStatus;
  const myIdentifier = myCollabId || myEmail || myCpf || "collab-user";

  const handleAccessMaterial = async (mat: DidacticMaterial) => {
    const now = new Date().toISOString();
    setLocalAccessLogs(prev => ({ ...prev, [mat.id]: now }));
    
    // Open the material link
    if (mat.accessUrl) {
      window.open(mat.accessUrl, "_blank", "noopener,noreferrer");
    }

    // Record in database & dispatch event
    const targetId = collaboratorRecord?.id || currentUser.uid;
    if (targetId) {
      await recordCollaboratorMaterialAccess(targetId, mat.id, mat.title);
    }
  };

  const relevantMaterials = didacticMaterials.filter(mat => {
    if (!mat.roles || mat.roles.includes("all") || mat.roles.length === 0) return true;
    if (myRole && mat.roles.includes(myRole)) return true;
    if (collaboratorRecord?.assignedRole && mat.roles.includes(collaboratorRecord.assignedRole)) return true;
    if (collaboratorRecord?.specialRole && mat.roles.includes(collaboratorRecord.specialRole)) return true;
    return false;
  });

  const reloadMessages = () => {
    let allMsgs: CalangusMessage[] = [];
    if (building?.messages && building.messages.length > 0) {
      allMsgs = [...building.messages];
    }
    try {
      const localStored: CalangusMessage[] = JSON.parse(localStorage.getItem("enem_internal_messages") || "[]");
      const ids = new Set(allMsgs.map(m => m.id));
      localStored.forEach(m => {
        if (!ids.has(m.id)) {
          allMsgs.push(m);
          ids.add(m.id);
        }
      });
    } catch (e) {
      console.error(e);
    }

    // Filter messages directed to this collaborator or their role / group
    const myMsgs = allMsgs.filter(msg => {
      if (msg.targetType === "all") return true;
      if (msg.targetRecipientIds && msg.targetRecipientIds.length > 0) {
        return msg.targetRecipientIds.includes(myCollabId) || msg.targetRecipientIds.includes(myIdentifier);
      }
      if (msg.targetType === "individual") {
        return (
          (msg.targetCollaboratorId && msg.targetCollaboratorId === myCollabId) ||
          (msg.targetCollaboratorEmail && msg.targetCollaboratorEmail.toLowerCase() === myEmail.toLowerCase()) ||
          (msg.targetCollaboratorPhone && collaboratorRecord?.whatsapp && msg.targetCollaboratorPhone.replace(/\D/g, "") === collaboratorRecord.whatsapp.replace(/\D/g, ""))
        );
      }
      if (msg.targetType === "role") {
        return msg.targetRoleId === myRole || msg.targetRoleName === myRole;
      }
      if (msg.targetType === "reserve") {
        return isMyReserve;
      }
      if (msg.targetType === "confirmed_attendance") {
        return myAttendance === "Confirmado";
      }
      if (msg.targetType === "pending_attendance") {
        return myAttendance !== "Confirmado";
      }
      return true;
    });

    setInternalMessages(myMsgs);
  };

  useEffect(() => {
    reloadMessages();

    const handleMsgSent = () => reloadMessages();
    window.addEventListener("calangus_message_sent", handleMsgSent);
    window.addEventListener("calangus_response_submitted", handleMsgSent);
    window.addEventListener("storage", handleMsgSent);
    return () => {
      window.removeEventListener("calangus_message_sent", handleMsgSent);
      window.removeEventListener("calangus_response_submitted", handleMsgSent);
      window.removeEventListener("storage", handleMsgSent);
    };
  }, [building, collaboratorRecord, currentUser]);

  const handleMarkAsRead = (msgId: string) => {
    const now = new Date().toISOString();
    const readReceipt: MessageReadReceipt = {
      collaboratorId: myCollabId || myIdentifier,
      collaboratorName: collaboratorRecord?.name || currentUser?.name || "Colaborador",
      collaboratorCpf: collaboratorRecord?.cpf || myCpf || "",
      collaboratorEmail: currentUser?.email || collaboratorRecord?.email || myEmail || "",
      collaboratorPhone: collaboratorRecord?.whatsapp || "",
      collaboratorRole: collaboratorRecord?.assignedRole || collaboratorRecord?.specialRole || (isMyReserve ? "Fiscal de Reserva" : "Colaborador"),
      readAt: now
    };

    const updateMsgObject = (m: CalangusMessage): CalangusMessage => {
      if (m.id === msgId) {
        const currentReads = m.readBy || [];
        const newReads = currentReads.includes(myIdentifier) ? currentReads : [...currentReads, myIdentifier];
        const existingReceipts = (m.readReceipts || []).filter(r => r.collaboratorId !== myIdentifier && r.collaboratorId !== myCollabId);
        return {
          ...m,
          readBy: newReads,
          readReceipts: [...existingReceipts, readReceipt]
        };
      }
      return m;
    };

    const updated = internalMessages.map(updateMsgObject);
    setInternalMessages(updated);

    try {
      const localStored: CalangusMessage[] = JSON.parse(localStorage.getItem("enem_internal_messages") || "[]");
      const updatedLocal = localStored.map(updateMsgObject);
      localStorage.setItem("enem_internal_messages", JSON.stringify(updatedLocal));
      window.dispatchEvent(new CustomEvent("calangus_message_sent", { detail: { messageId: msgId } }));
    } catch (e) {
      console.error(e);
    }

    if (building && onSaveBuilding) {
      const updatedBuildingMsgs = (building.messages || []).map(updateMsgObject);
      onSaveBuilding({ ...building, messages: updatedBuildingMsgs });
    }

    setReceiptSuccessMsg("✓ Recebimento e leitura da mensagem confirmados com sucesso!");
    setTimeout(() => setReceiptSuccessMsg(""), 3500);
  };

  const handleSelectOption = (msgId: string, optId: string, optText: string, isMultiple = false) => {
    setPollSelections(prev => {
      const current = prev[msgId] || { optionIds: [], texts: [], customText: "" };
      if (isMultiple) {
        const exists = current.optionIds.includes(optId);
        const newIds = exists ? current.optionIds.filter(id => id !== optId) : [...current.optionIds, optId];
        const newTexts = exists ? current.texts.filter(t => t !== optText) : [...current.texts, optText];
        return { ...prev, [msgId]: { ...current, optionIds: newIds, texts: newTexts } };
      } else {
        return { ...prev, [msgId]: { ...current, optionIds: [optId], texts: [optText] } };
      }
    });
  };

  const handleCustomTextChange = (msgId: string, text: string) => {
    setPollSelections(prev => {
      const current = prev[msgId] || { optionIds: [], texts: [], customText: "" };
      return { ...prev, [msgId]: { ...current, customText: text } };
    });
  };

  const handleSubmitPollResponse = (msg: CalangusMessage) => {
    const currentSelection = pollSelections[msg.id] || { optionIds: [], texts: [], customText: "" };
    
    if (msg.poll?.type === "text_input") {
      if (!currentSelection.customText.trim()) {
        alert("Por favor, digite sua resposta no campo de texto.");
        return;
      }
    } else {
      if (currentSelection.optionIds.length === 0 && !currentSelection.customText.trim()) {
        alert("Por favor, selecione uma opção para enviar.");
        return;
      }
    }

    const now = new Date().toISOString();
    const readReceipt: MessageReadReceipt = {
      collaboratorId: myCollabId || myIdentifier,
      collaboratorName: collaboratorRecord?.name || currentUser?.name || "Colaborador",
      collaboratorCpf: collaboratorRecord?.cpf || myCpf || "",
      collaboratorEmail: currentUser?.email || collaboratorRecord?.email || myEmail || "",
      collaboratorPhone: collaboratorRecord?.whatsapp || "",
      collaboratorRole: collaboratorRecord?.assignedRole || collaboratorRecord?.specialRole || (isMyReserve ? "Fiscal de Reserva" : "Colaborador"),
      readAt: now
    };

    const newResponse: MessageCollaboratorResponse = {
      collaboratorId: myCollabId || myIdentifier,
      collaboratorName: collaboratorRecord?.name || currentUser?.name || "Colaborador",
      collaboratorCpf: collaboratorRecord?.cpf || myCpf || "",
      collaboratorEmail: currentUser?.email || collaboratorRecord?.email || myEmail || "",
      collaboratorPhone: collaboratorRecord?.whatsapp || "",
      collaboratorRole: collaboratorRecord?.assignedRole || collaboratorRecord?.specialRole || (isMyReserve ? "Fiscal de Reserva" : "Colaborador"),
      selectedOptionIds: currentSelection.optionIds,
      selectedOptionTexts: currentSelection.texts,
      textAnswer: currentSelection.customText.trim() || undefined,
      answeredAt: now
    };

    const updateMsgWithPoll = (m: CalangusMessage): CalangusMessage => {
      if (m.id === msg.id) {
        const existingReceipts = (m.readReceipts || []).filter(r => r.collaboratorId !== myIdentifier && r.collaboratorId !== myCollabId);
        const existingResponses = (m.responses || []).filter(r => r.collaboratorId !== myIdentifier && r.collaboratorId !== myCollabId);
        const currentReads = m.readBy || [];
        const newReads = currentReads.includes(myIdentifier) ? currentReads : [...currentReads, myIdentifier];

        return {
          ...m,
          readBy: newReads,
          readReceipts: [...existingReceipts, readReceipt],
          responses: [...existingResponses, newResponse]
        };
      }
      return m;
    };

    const updated = internalMessages.map(updateMsgWithPoll);
    setInternalMessages(updated);

    try {
      const localStored: CalangusMessage[] = JSON.parse(localStorage.getItem("enem_internal_messages") || "[]");
      const updatedLocal = localStored.map(updateMsgWithPoll);
      localStorage.setItem("enem_internal_messages", JSON.stringify(updatedLocal));
      window.dispatchEvent(new CustomEvent("calangus_response_submitted", { detail: { messageId: msg.id, response: newResponse } }));
      window.dispatchEvent(new CustomEvent("calangus_message_sent", { detail: { messageId: msg.id } }));
    } catch (e) {
      console.error(e);
    }

    if (building && onSaveBuilding) {
      const updatedBuildingMsgs = (building.messages || []).map(updateMsgWithPoll);
      onSaveBuilding({ ...building, messages: updatedBuildingMsgs });
    }

    setEditingPollMsgId(null);
    setReceiptSuccessMsg("✓ Resposta gravada e confirmação de leitura enviadas ao CLA!");
    setTimeout(() => setReceiptSuccessMsg(""), 4000);
  };

  const unreadMessagesCount = internalMessages.filter(m => !m.readBy || !m.readBy.includes(myIdentifier)).length;

  const filteredMessages = internalMessages.filter(m => {
    const isRead = m.readBy && m.readBy.includes(myIdentifier);
    if (messageFilter === "unread") return !isRead;
    if (messageFilter === "read") return isRead;
    return true;
  });

  const desktopMenuTab = activeMenuTab || "messages";

  const renderTabContent = (targetTab: string) => {
    return (
      <div className="space-y-6">
        {/* TAB 1: STATUS & LOCAL_ */}
        {targetTab === "status" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Status do Colaborador & Local de Aplicação</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Consulte seus dados cadastrais, local de prova e informações de atuação para o ENEM.</p>
            </div>

            {/* Quick Photo & Fiscal Status Banner */}
            <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div 
                  className="relative group cursor-pointer shrink-0" 
                  onClick={() => setActiveMenuTab("profile")}
                  title="Clique para enviar ou trocar sua foto"
                >
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Foto do Fiscal" 
                      className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-md bg-slate-100 group-hover:scale-105 transition" 
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white rounded-full flex items-center justify-center font-black text-lg border-2 border-indigo-500/20 shadow-md group-hover:scale-105 transition">
                      {name ? name.substring(0, 2).toUpperCase() : "CM"}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-xs">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-slate-850 dark:text-white text-sm">{name}</span>
                    {photoUrl ? (
                      <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Foto enviada</span>
                    ) : (
                      <span className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">Foto pendente</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {photoUrl 
                      ? "Sua foto de identificação está cadastrada para o crachá oficial do ENEM." 
                      : "Clique no perfil ou no botão ao lado para enviar a foto do seu crachá."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMenuTab("profile")}
                className="btn-3d py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{photoUrl ? "Alterar Foto" : "Enviar Foto"}</span>
              </button>
            </div>

            {/* BUSINESS LOGIC: PRESENCE CONFIRMATION & ROLE HIGHLIGHTS SECTION */}
            {(() => {
              const isAuthorized = collaboratorRecord?.status === "Confirmado";
              const assignedRole = collaboratorRecord?.assignedRole?.trim();
              const assignedRoom = collaboratorRecord?.assignedRoom?.trim();
              const isReserve = Boolean(collaboratorRecord?.isReserve);
              // Only collaborators who are officially allocated in a room/post with a defined role (and not reserve) receive the confirmation questionnaire
              const isAllocated = Boolean(isAuthorized && !isReserve && assignedRole && assignedRole !== "" && assignedRoom && assignedRoom !== "");
              const isRoleDefinedWithoutRoom = Boolean(isAuthorized && !isReserve && assignedRole && assignedRole !== "" && (!assignedRoom || assignedRoom === ""));
              const hasRefused = Boolean(collaboratorRecord?.refusedRole || collaboratorRecord?.refusalTag);
              const isConfirmedAttendance = collaboratorRecord?.attendanceStatus === "Confirmado";

              // Role resolution for payments and display
              const displayRoleName = assignedRole && assignedRole !== ""
                ? assignedRole
                : (collaboratorRecord?.specialRole && collaboratorRecord.specialRole !== "Nenhuma" 
                    ? collaboratorRecord.specialRole 
                    : (isReserve ? "Fiscal de Reserva de Corredor" : "Fiscal de Sala Regular"));

              // Compute custom or standard remuneration
              const getCustomOrStandardPayment = (roleName: string): string => {
                if (!roleName) return "—";
                if (building?.customRoles && building.customRoles.length > 0) {
                  const matched = building.customRoles.find(r => r.name.toLowerCase().trim() === roleName.toLowerCase().trim());
                  if (matched && matched.remuneration && matched.remuneration > 0) {
                    return `R$ ${matched.remuneration.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                }
                return getRolePayment(roleName);
              };

              const rolePayment = getCustomOrStandardPayment(displayRoleName);

              // Exam dates list
              const rawDate1 = eventConfig?.examDates?.[0];
              const rawDate2 = eventConfig?.examDates?.[1];
              const examDates = [
                (rawDate1 && rawDate1 !== "01/11/2026" && rawDate1 !== "03/11/2024" && rawDate1 !== "03/11/2026") ? rawDate1 : "08/11/2026",
                (rawDate2 && rawDate2 !== "08/11/2026" && rawDate2 !== "10/11/2024") ? rawDate2 : "15/11/2026"
              ];

              // ONLY show presence confirmation questionnaire when collaborator is authorized AND has BOTH assigned role AND room allocation (not in reserve)
              if (isAuthorized && isAllocated) {
                return (
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-slate-50 to-indigo-500/10 dark:from-emerald-500/10 dark:via-[#0c1220] dark:to-indigo-500/10 border-2 border-emerald-500/40 rounded-2xl space-y-5 shadow-lg animate-fade-in">
                    
                    {/* Header Convocação */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                            CONVOCAÇÃO OFICIAL
                          </span>
                          {isConfirmedAttendance ? (
                            <span className="text-[10px] bg-emerald-600 text-white font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Presença Confirmada</span>
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                              ⏳ Confirmação Pendente
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-display font-black text-slate-850 dark:text-white mt-1.5 flex items-center gap-2">
                          <span>📋</span> Convocação Oficial para Atuação no ENEM
                        </h4>
                      </div>

                      {assignedRoom && (
                        <div className="bg-white dark:bg-[#101726] border-2 border-emerald-500/30 rounded-xl px-4 py-2 text-center shadow-xs">
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Sala Designada</span>
                          <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">{assignedRoom}</span>
                        </div>
                      )}
                    </div>

                    {/* DADOS EM DESTAQUE (Função, Valor recebido, Dias de comparecimento) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* 1. FUNÇÃO */}
                      <div className="p-4 bg-white dark:bg-[#101726] rounded-xl border-2 border-indigo-500/30 shadow-xs flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600 dark:text-indigo-400">
                            Função Designada
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Award className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <div className="font-display font-black text-slate-900 dark:text-white text-base leading-tight">
                            {assignedRole}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                            {collaboratorRecord?.specialRole && collaboratorRecord.specialRole !== "Nenhuma"
                              ? `Especialidade: ${collaboratorRecord.specialRole}`
                              : "Atuação oficial em equipe de aplicação"}
                          </span>
                        </div>
                      </div>

                      {/* 2. VALOR RECEBIDO NA FUNÇÃO */}
                      <div className="p-4 bg-white dark:bg-[#101726] rounded-xl border-2 border-emerald-500/30 shadow-xs flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                            Valor Recebido na Função
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Banknote className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <div className="font-display font-black text-emerald-600 dark:text-emerald-400 text-xl font-mono leading-tight">
                            {rolePayment}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                            Remuneração oficial do exame
                          </span>
                        </div>
                      </div>

                      {/* 3. DIAS DE COMPARECIMENTO (DIAS DO ENEM) */}
                      <div className="p-4 bg-white dark:bg-[#101726] rounded-xl border-2 border-amber-500/30 shadow-xs flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">
                            Comparecer nos Dias (ENEM)
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <CalendarCheck className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <div className="font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
                            1º Dia: <strong className="text-indigo-600 dark:text-indigo-400">{examDates[0] || "08/11/2026"}</strong>
                            <br />
                            2º Dia: <strong className="text-indigo-600 dark:text-indigo-400">{examDates[1] || "15/11/2026"}</strong>
                          </div>
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                            ⚠️ Presença obrigatória em ambos os dias
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions and message (Questionário de Confirmação e Recusa) */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {isConfirmedAttendance ? (
                          <span>
                            ✓ Você confirmou sua presença para exercer a função de <strong>{assignedRole}</strong> na sala <strong>{assignedRoom}</strong>. Compareça pontualmente nos dias <strong>{examDates[0]}</strong> e <strong>{examDates[1]}</strong>!
                          </span>
                        ) : (
                          <span>
                            Você foi alocado na função de <strong>{assignedRole}</strong> na sala <strong>{assignedRoom}</strong> ({rolePayment}). Por favor, <strong>confirme sua presença</strong> para garantir sua escala nos dias <strong>{examDates[0]}</strong> e <strong>{examDates[1]}</strong>.
                          </span>
                        )}
                      </p>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateConfirmationStatus("Confirmado")}
                          className={`btn-3d py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                            isConfirmedAttendance 
                              ? "bg-emerald-600 text-white shadow-md" 
                              : "bg-emerald-500 hover:bg-emerald-600 text-white"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{isConfirmedAttendance ? "Presença Já Confirmada" : "Confirmar Presença na Função"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsRefusingModalOpen(true)}
                          className="btn-3d py-2.5 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                          title="Recusar a convocação nesta função e retornar para a reserva"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Recusar Função</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Collaborator who previously refused a role convocations
              if (isAuthorized && !isAllocated && hasRefused) {
                return (
                  <div className="p-5 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl space-y-3 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                          Convocação Recusada — Você está no Banco de Reserva
                        </h4>
                      </div>
                      <span className="text-[9px] bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30 font-mono font-black uppercase px-2 py-0.5 rounded-md">
                        RESERVA ATIVO
                      </span>
                    </div>

                    <div className="p-3 bg-white/80 dark:bg-[#070b13]/80 rounded-xl border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                        <span>🏷️</span>
                        <span>TAG: <strong>{collaboratorRecord?.refusalTag || `Recusa de trabalho na função ${collaboratorRecord?.refusedRole}`}</strong></span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        Você recusou a convocação para a função de <strong>{collaboratorRecord?.refusedRole || "Função anterior"}</strong>{collaboratorRecord?.refusedRoleDate ? ` (${collaboratorRecord.refusedRoleDate})` : ""}. A coordenação do CLA foi notificada e o cargo associado voltou a ficar vazio. Você continua cadastrado no banco de <strong>Fiscais Reservas</strong>. Caso o CLA atribua uma nova função e sala oficial a você, a opção de confirmação de presença será disponibilizada automaticamente aqui.
                      </p>
                    </div>
                  </div>
                );
              }

              // In reserve or awaiting room allocation (without confirmation/refusal questionnaire)
              // No sistema geral, o colaborador que tem função mas não tem alocação deve ser considerado como um tipo de reserva.
              return (
                <div className="p-5 bg-slate-100/80 dark:bg-[#101726]/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-sky-500/20 text-sky-700 dark:text-sky-300 font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-sky-500/30">
                      {isRoleDefinedWithoutRoom ? "RESERVA • FUNÇÃO DESIGNADA" : isReserve ? "RESERVA TÉCNICA" : "STATUS DO CADASTRO"}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {isRoleDefinedWithoutRoom 
                        ? "Banco de Reserva — Aguardando Alocação em Sala" 
                        : isReserve 
                        ? "Banco de Reserva de Fiscais" 
                        : "Aguardando Associação pelo CLA"}
                    </span>
                  </div>

                  {/* Informational Callout regarding Reserve and Absence of Questionnaire */}
                  <div className="p-3.5 bg-sky-500/10 dark:bg-sky-950/30 border border-sky-500/20 rounded-xl text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{isRoleDefinedWithoutRoom ? "Colaborador em Banco de Reserva com Função Definida" : "Cadastro Homologado no Banco de Reserva"}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {isRoleDefinedWithoutRoom ? (
                        <>
                          Você possui a função pré-definida de <strong>{assignedRole}</strong> ({rolePayment}), mas <strong>ainda não possui alocação em sala oficial</strong>. Você é considerado(a) integrante da <strong>equipe de reserva</strong> do local de aplicação. O questionário de confirmação de presença e convocação oficial só é disponibilizado após a coordenação do CLA definir a sua sala de atuação.
                        </>
                      ) : isReserve ? (
                        <>
                          Você está escalado(a) como <strong>Fiscal de Reserva Técnica</strong>. Os fiscais de reserva comparecem ao local de aplicação para atuar prontamente na cobertura de eventuais ausências e no apoio logístico à coordenação.
                        </>
                      ) : (
                        <>
                          Seu cadastro foi homologado pela coordenação. Aguarde a definição da sua função e sala de atuação para liberação da convocação oficial.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* 1. FUNÇÃO */}
                    <div className="p-4 bg-white dark:bg-[#0c1220] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {isRoleDefinedWithoutRoom ? "Função Designada" : "Função Cadastrada"}
                        </span>
                        <Award className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-display font-black text-slate-850 dark:text-white text-sm">
                          {displayRoleName}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          {isRoleDefinedWithoutRoom 
                            ? "Aguardando alocação em sala" 
                            : isReserve 
                            ? "Disponível para substituições" 
                            : "Aguardando definição pelo CLA"}
                        </span>
                      </div>
                    </div>

                    {/* 2. VALOR RECEBIDO */}
                    <div className="p-4 bg-white dark:bg-[#0c1220] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                          Remuneração da Função
                        </span>
                        <Banknote className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <div className="font-display font-black text-emerald-600 dark:text-emerald-400 text-lg font-mono">
                          {rolePayment}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Valor padrão conforme tabela oficial
                        </span>
                      </div>
                    </div>

                    {/* 3. DIAS DO ENEM */}
                    <div className="p-4 bg-white dark:bg-[#0c1220] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600 dark:text-indigo-400">
                          Dias de Aplicação ENEM
                        </span>
                        <CalendarCheck className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <div className="font-mono font-black text-slate-800 dark:text-white text-xs">
                          1º Dia: {examDates[0] || "08/11/2026"} • 2º Dia: {examDates[1] || "15/11/2026"}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                          Comparecimento nos 2 domingos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal to Confirm Refusal of Role Convocations */}
            {isRefusingModalOpen && collaboratorRecord?.assignedRole && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div className="bg-white dark:bg-[#0c1220] max-w-md w-full rounded-2xl border-2 border-rose-500/30 p-6 space-y-5 shadow-2xl animate-scale-up">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-display font-black text-slate-900 dark:text-white">
                        Recusar Convocação na Função?
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Você está prestes a recusar a atuação na função de <strong className="text-rose-600 dark:text-rose-400">{collaboratorRecord.assignedRole}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <div className="font-bold text-rose-700 dark:text-rose-400 text-[11px] uppercase tracking-wide">
                      Consequências da Recusa:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <li>A coordenação do <strong>CLA receberá aviso imediato</strong> da sua recusa.</li>
                      <li>O cargo de <strong>{collaboratorRecord.assignedRole}</strong> voltará a ficar vazio para alocação de outro fiscal.</li>
                      <li>Você retornará para a equipe de <strong>Reserva</strong> com a TAG: <strong className="text-rose-600 dark:text-rose-400">"Recusa de trabalho na função {collaboratorRecord.assignedRole}"</strong>.</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRefusingModalOpen(false)}
                      className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Cancelar e Manter Função
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateConfirmationStatus("Recusado", collaboratorRecord.assignedRole);
                        setIsRefusingModalOpen(false);
                      }}
                      className="btn-3d py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Confirmar Recusa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESCOLA DESIGNADA & LOCAL DE TRABALHO (Includes Nome do CLA que convocou) */}
            {building && (() => {
              const convokedClaName = (
                collaboratorRecord?.claName || 
                collaboratorRecord?.originalClaName || 
                claName || 
                (building?.coordRoom ? `Coordenação (Sala ${building.coordRoom})` : "Coordenação CLA")
              ).trim();

              return (
                <div className="space-y-4">
                  <span className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400">Escola Designada & Local de Trabalho</span>
                  
                  <div className="bg-slate-50 dark:bg-[#070b13]/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner">
                    <div>
                      <h4 className="font-display font-black text-slate-800 dark:text-white text-base">🏫 {building.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 font-medium">
                        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{building.address}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs font-bold leading-relaxed">
                      {/* Destaque: Nome do CLA que convocou */}
                      <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 col-span-1 sm:col-span-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-300 block">
                              Nome do CLA que Convocou:
                            </span>
                            <span className="font-display font-black text-slate-900 dark:text-white text-sm">
                              {convokedClaName}
                            </span>
                          </div>
                        </div>
                        {building.coordRoom && (
                          <div className="text-right shrink-0">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Sala CLA</span>
                            <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">{building.coordRoom}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Sua Função de Lotação:</span>
                        <span className="text-slate-800 dark:text-white">
                          {collaboratorRecord?.specialRole && collaboratorRecord.specialRole !== "Nenhuma" 
                            ? `${collaboratorRecord.specialRole} (Acessibilidade)`
                            : (collaboratorRecord?.isReserve ? "Fiscal de Reserva de Corredor" : "Fiscal de Sala Regular")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Setor de Alocação:</span>
                        <span className="text-slate-850 dark:text-slate-200">
                          {collaboratorRecord?.isReserve ? "Salas Extras / Apoio" : `Andar ${collaboratorRecord?.assignedRoom ? "1º / Bloco A" : "Selecione na Sala"} (${collaboratorRecord?.assignedRoom || "Pendente de Coordenação"})`}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Sala de Coordenação (CLA):</span>
                        <span className="text-slate-850 dark:text-slate-200">{building.coordRoom}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Capacidade da Escola:</span>
                        <span className="text-slate-850 dark:text-slate-200">{building.realCapacity} Candidatos</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.name + " " + building.address)}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="btn-3d w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs cursor-pointer shadow-md"
                      >
                        <Navigation className="w-4 h-4 text-white" />
                        <span>TRAÇAR ROTA NO GOOGLE MAPS</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 2: EDITAR PERFIL_ */}
        {targetTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Editar Dados Cadastrais & Foto</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mantenha seus dados atualizados para controle financeiro, fita magnética de presença e homologação Cebraspe.</p>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl animate-fade-in">
                ✓ {profileSuccessMsg}
              </div>
            )}

            {/* Profile image uploading wrapper */}
            <PhotoUploader
              photoUrl={photoUrl}
              onChange={handleCollaboratorPhotoChange}
              name={name || currentUser.name || "Fiscal"}
              label="Foto de Identificação do Crachá"
              helpText="Adicione uma foto nítida do seu rosto em fundos claros, pois será impressa no crachá oficial de portaria e visualizada pela coordenação do CLA."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-sans text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">CPF (Chave Pix)</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Data de Nascimento</label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Whatsapp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(87) 98123-4567"
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-slate-100 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-850 p-2.5 text-xs rounded-xl font-bold text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Escolaridade máxima</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
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

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Pessoa de Referência</label>
                <input
                  type="text"
                  value={referencePerson}
                  onChange={(e) => setReferencePerson(e.target.value)}
                  placeholder="Ex: MARIA"
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 font-medium leading-relaxed">
                  Informe aqui o nome da pessoa (amigo, parente ou familiar) que lhe indicou para esse CLA. Exemplo: Minha amiga MARIA conversou com o CLA para me indicar para os trabalhos desse ano, então na referência eu digito MARIA.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-3d w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSavingProfile ? "Sincronizando..." : "SALVAR DADOS CADASTRAIS"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: LANCHE_ */}
        {targetTab === "snack" && isSnackMenuReleased && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Seleção de Cardápio & Restrições Alimentares</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Os coordenadores CLA liberaram o cardápio oficial! Configure suas preferências e informe alertas de alergias/restrições sanitárias.</p>
            </div>

            {snackSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl animate-fade-in">
                ✓ {snackSuccessMsg}
              </div>
            )}

            {/* Menu Description card */}
            {(activeLancheQuote || activeRefeicaoQuote) && (
              <div className="p-4 bg-indigo-500/5 dark:bg-[#101726]/40 border-2 border-indigo-500/10 dark:border-[#10b981]/25 rounded-2xl space-y-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] uppercase font-black tracking-widest text-[#10b981]">Cardápio Homologado de Lanches & Refeições</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Lanches */}
                  <div className="bg-white dark:bg-[#070b13]/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
                    <span className="text-[9px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <span>🥪</span> Itens do Lanche {activeLancheQuote && `(Fornecedor: ${activeLancheQuote.supplier})`}
                    </span>
                    {activeLancheQuote ? (
                      (activeLancheQuote.lancheItems && activeLancheQuote.lancheItems.length > 0) ? (
                        <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-350 font-semibold list-disc list-inside">
                          {activeLancheQuote.lancheItems.map((item, idx) => (
                            <li key={idx} className="marker:text-indigo-500">{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          {activeLancheQuote.menu.includes("Lanche:") ? activeLancheQuote.menu.split("Refeição:")[0].replace("Lanche:", "").trim() : activeLancheQuote.menu}
                        </p>
                      )
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Consulte os coordenadores.</p>
                    )}
                  </div>

                  {/* Refeição */}
                  <div className="bg-white dark:bg-[#070b13]/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
                    <span className="text-[9px] font-black text-teal-650 dark:text-teal-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <span>🍽️</span> Itens da Refeição {activeRefeicaoQuote && `(Fornecedor: ${activeRefeicaoQuote.supplier})`}
                    </span>
                    {activeRefeicaoQuote ? (
                      (activeRefeicaoQuote.refeicaoItems && activeRefeicaoQuote.refeicaoItems.length > 0) ? (
                        <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-350 font-semibold list-disc list-inside">
                          {activeRefeicaoQuote.refeicaoItems.map((item, idx) => (
                            <li key={idx} className="marker:text-teal-500">{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          {activeRefeicaoQuote.menu.includes("Refeição:") ? activeRefeicaoQuote.menu.split("Refeição:")[1].trim() : "Consulte os coordenadores."}
                        </p>
                      )
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Consulte os coordenadores.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1.5">Sua Preferência Alimentar</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {["Padrão", "Vegetariano", "Vegano", "Sem Glúten"].map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setSnackPreference(pref)}
                      className={`p-3 border-2 rounded-xl font-bold text-xs cursor-pointer select-none transition-all duration-300 text-center ${snackPreference === pref ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"}`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Alergias ou Restrições Alimentares Ativas</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={restrictions}
                    onChange={(e) => setRestrictions(e.target.value)}
                    placeholder="Ex: Alérgico a corantes vermelhos, intolerante à lactose pesado (precisa de leite vegetal), vegetariano estrito."
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-3 text-xs rounded-xl font-semibold font-sans text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {restrictions && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 uppercase bg-rose-500/10 text-rose-600 dark:text-rose-450 text-[8px] font-extrabold rounded px-1.5 py-0.5 border border-rose-500/20">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span>Alerta de Restrição Enviado</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-450 dark:text-slate-440 mt-1.5 flex items-center gap-1 font-semibold leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>O sistema CalanguS alertará o seu Coordenador CLA imediatamente em tempo real sobre esta restrição.</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={handleSaveSnackSelection}
                  disabled={isSavingSnack}
                  className="btn-3d w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs cursor-pointer shadow-md"
                >
                  {isSavingSnack ? "Sincronizando escolhas de lanche..." : "SALVAR PREFERÊNCIA DE LANCHE"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MATERIAL_ */}
        {targetTab === "materials" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2 flex items-center justify-between">
                <span>Material Didático & Capacitação</span>
                <span className="text-[10px] font-bold text-slate-400 font-mono lowercase">
                  {relevantMaterials.length} {relevantMaterials.length === 1 ? "disponível" : "disponíveis"}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Acesse apostilas, manuais, videoaulas, normativas e orientações recomendadas pela coordenação Cebraspe/CLA para a aplicação do ENEM.</p>
            </div>

            {relevantMaterials.length === 0 ? (
              <div className="p-8 md:p-12 bg-white dark:bg-[#0c1220] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500/15 via-emerald-500/15 to-teal-500/15 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border-2 border-indigo-500/25 shadow-sm">
                  <BookOpen className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <span className="inline-block px-3.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                    ⏳ Nenhum Material Cadastrado para sua Função
                  </span>
                  <h4 className="text-base font-display font-black text-slate-850 dark:text-white">
                    Materiais Didáticos do ENEM 2026
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    A coordenação disponibilizará em breve os manuais oficiais, instruções de sala e portarias específicas para sua função. Fique atento às mensagens do CLA!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {relevantMaterials.map((mat) => {
                  const existingAccess = collaboratorRecord?.materialsAccessed?.find(m => m.materialId === mat.id);
                  const localAccessTime = localAccessLogs[mat.id];
                  const accessTimestamp = existingAccess?.accessedAt || localAccessTime;
                  const hasAccessed = Boolean(accessTimestamp);

                  return (
                    <div 
                      key={mat.id}
                      className="p-5 bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 rounded-2xl transition-all duration-300 shadow-sm space-y-3.5 relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-850 dark:text-white leading-tight">
                              {mat.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {mat.roles.includes("all") ? (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Todas as Funções
                                </span>
                              ) : (
                                mat.roles.map((r, i) => (
                                  <span key={i} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    {r}
                                  </span>
                                ))
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                • {new Date(mat.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Access status tag */}
                        <div>
                          {hasAccessed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Acessado em {new Date(accessTimestamp!).toLocaleDateString("pt-BR")}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <span>⏳ Não Acessado</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Instruction Text */}
                      {mat.instructionText && (
                        <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-1">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Instruções & Orientações:</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                            {mat.instructionText}
                          </p>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          Ao clicar em acessar, seu registro de visualização é enviado automaticamente ao CLA.
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAccessMaterial(mat)}
                          className="btn-3d w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{hasAccessed ? "Acessar Material Novamente" : "Acessar Material & Registrar"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AGENDA_ */}
        {targetTab === "agenda" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Agenda & Itinerário Tático do Fiscal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Observe a contagem rigorosa de horários regulada pela coordenação do local e pelo Cebraspe.</p>
            </div>

            {/* Custom Instructions/Notices from CLA or SuperAdmin */}
            {activeInstructions && (
              <div className="p-4 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Avisos & Instruções da Coordenação</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                  {activeInstructions}
                </p>
              </div>
            )}

            {/* Timeline component with active schedule configured by CLA */}
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-5 pr-1 ml-3 space-y-6">
              {activeSchedule.map((item, idx) => (
                <div key={item.id || idx} className="relative group animate-fade-in font-sans">
                  {/* Glowing timeline node */}
                  <div className="absolute -left-[27px] top-1 bg-white dark:bg-[#070b13] border-2 border-emerald-500 rounded-full w-4 h-4 flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </div>

                  <div className="bg-slate-50 dark:bg-[#070b13]/30 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full block w-max uppercase tracking-wider border border-emerald-500/20">
                      {item.time}
                    </span>
                    <h4 className="font-display font-black text-xs text-slate-800 dark:text-white mt-1.5 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CHECK-LIST_ */}
        {targetTab === "checklist" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Check-list de Preparação do Aplicador</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Evite impedimentos e advertências no domingo do exame utilizando o check-list de adequação de vestimentas e materiais permitidos.</p>
            </div>

            {/* Progress segment */}
            <div className="p-4 bg-[#10b981]/5 border-2 border-[#10b981]/15 rounded-2xl space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-emerald-650 dark:text-emerald-400 uppercase tracking-wide">Progresso de Preparação</span>
                <span className="font-mono text-lg">{checkedCount} / {totalChecklist} Concluídos</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${finalPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-455 dark:text-slate-440 font-semibold mt-1">
                {checkedCount === totalChecklist 
                  ? "✓ Fantástico! Você está 100% elegível e preparado conforme as portarias do Edital do ENEM."
                  : "Complete os itens recomendados abaixo antes de se deslocar ao colégio."}
              </p>
            </div>

            {/* Checkbox item list */}
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleChecklistToggle(item.id)}
                  className={`p-3.5 border-2 rounded-2xl flex items-start gap-3.5 cursor-pointer select-none transition-all duration-300 ${item.checked ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${item.checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-700"}`}>
                    {item.checked && <Check className="w-3.5 h-3.5 stroke-[4px]" />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-black leading-snug flex items-center gap-1.5 ${item.checked ? "text-slate-800 dark:text-slate-200 line-through opacity-70" : "text-slate-800 dark:text-white"}`}>
                      {item.label}
                    </h4>
                    <p className={`text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold ${item.checked ? "line-through opacity-60" : ""}`}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: MENSAGENS DO CLA (CAIXA PESSOAL CALANGUS) */}
        {targetTab === "messages" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-850 pb-3 text-left">
              <div>
                <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-sky-500" />
                  <span>Caixa de Entrada & Comunicados do CLA</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Mensagens, convocações e avisos oficiais enviados diretamente pela coordenação do seu local de aplicação.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setMessageFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    messageFilter === "all" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  Todas ({internalMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMessageFilter("unread")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    messageFilter === "unread" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  <span>Não Lidas</span>
                  {unreadMessagesCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageFilter("read")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    messageFilter === "read" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  Lidas ({internalMessages.length - unreadMessagesCount})
                </button>
              </div>
            </div>

            {receiptSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl animate-fade-in flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{receiptSuccessMsg}</span>
              </div>
            )}

            {filteredMessages.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhuma mensagem encontrada</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {messageFilter === "unread"
                    ? "Você não possui mensagens pendentes de leitura no momento."
                    : "Você ainda não recebeu comunicados diretos da coordenação."}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredMessages.map((msg) => {
                  const isRead = msg.readBy && msg.readBy.includes(myIdentifier);

                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isRead
                          ? "bg-slate-50/80 dark:bg-[#070b13]/60 border-slate-200 dark:border-slate-800"
                          : "bg-white dark:bg-[#101726] border-emerald-500/40 shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          {!isRead && (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" title="Mensagem Nova" />
                          )}
                          <h4 className={`text-xs font-bold ${isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-950 dark:text-white font-black"}`}>
                            {msg.title || "Comunicado Oficial"}
                          </h4>
                          <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                            msg.channel === "whatsapp"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : msg.channel === "email"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                              : msg.channel === "sms"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                          }`}>
                            {msg.channel ? msg.channel.toUpperCase() : "CALANGUS"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{msg.sentAt}</span>
                          {isRead ? (
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold">
                              Lida
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold">
                              Nova
                            </span>
                          )}
                        </div>
                      </div>

                      {/* SENDER INFO */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 py-1.5 flex items-center justify-between">
                        <div>
                          De: <strong className="text-slate-800 dark:text-slate-200">{msg.senderName} ({msg.senderRole || "CLA Coordenação"})</strong>
                        </div>
                      </div>

                      {/* BODY CONTENT */}
                      <div className="p-3 bg-white dark:bg-[#0c1220] rounded-xl text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-sans leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {/* QUESTIONÁRIO / ENQUETE INTERATIVA DO CLA */}
                      {msg.poll && (
                        <div className="mt-3 p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800/60 space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-800/40 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-lg bg-purple-600 text-white shadow-xs">
                                <Vote className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="text-[10px] uppercase font-black tracking-wider text-purple-700 dark:text-purple-300 block">
                                  Questionamento da Coordenação (CLA)
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {msg.poll.question}
                                </h5>
                              </div>
                            </div>
                            {msg.poll.required && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                                Obrigatório
                              </span>
                            )}
                          </div>

                          {(() => {
                            const myExistingResponse = (msg.responses || []).find(
                              r => r.collaboratorId === myIdentifier || r.collaboratorId === myCollabId
                            );
                            const isEditing = editingPollMsgId === msg.id;

                            if (myExistingResponse && !isEditing) {
                              return (
                                <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                      <span>Sua resposta foi gravada e enviada com sucesso!</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPollMsgId(msg.id);
                                        setPollSelections(prev => ({
                                          ...prev,
                                          [msg.id]: {
                                            optionIds: myExistingResponse.selectedOptionIds || [],
                                            texts: myExistingResponse.selectedOptionTexts || [],
                                            customText: myExistingResponse.textAnswer || ""
                                          }
                                        }));
                                      }}
                                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      <span>Alterar Resposta</span>
                                    </button>
                                  </div>

                                  <div className="pl-5 space-y-1 text-xs text-slate-700 dark:text-slate-200 font-medium">
                                    {myExistingResponse.selectedOptionTexts && myExistingResponse.selectedOptionTexts.length > 0 && (
                                      <div>
                                        Opção escolhida:{" "}
                                        <strong className="text-emerald-700 dark:text-emerald-300 font-bold">
                                          {myExistingResponse.selectedOptionTexts.join(", ")}
                                        </strong>
                                      </div>
                                    )}
                                    {myExistingResponse.textAnswer && (
                                      <div>
                                        Resposta escrita:{" "}
                                        <span className="italic text-slate-800 dark:text-slate-100">
                                          "{myExistingResponse.textAnswer}"
                                        </span>
                                      </div>
                                    )}
                                    {myExistingResponse.answeredAt && (
                                      <div className="text-[10px] text-slate-400">
                                        Respondido em: {new Date(myExistingResponse.answeredAt).toLocaleString("pt-BR")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            const currentSel = pollSelections[msg.id] || { optionIds: [], texts: [], customText: "" };
                            const isMultiple = msg.poll.type === "multiple_choice";

                            return (
                              <div className="space-y-3">
                                {msg.poll.type !== "text_input" && (
                                  <div className="space-y-1.5">
                                    {msg.poll.options?.map((opt) => {
                                      const isSelected = currentSel.optionIds.includes(opt.id);
                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => handleSelectOption(msg.id, opt.id, opt.text, isMultiple)}
                                          className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                                            isSelected
                                              ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                                              : "bg-white dark:bg-[#101726] text-slate-800 dark:text-slate-200 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-800/80"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <span className={`w-4 h-4 rounded-${isMultiple ? "md" : "full"} border flex items-center justify-center shrink-0 ${
                                              isSelected
                                                ? "bg-white text-purple-700 border-white font-black text-[10px]"
                                                : "border-slate-300 dark:border-slate-600"
                                            }`}>
                                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                            </span>
                                            <span>{opt.text}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                {(msg.poll.type === "text_input" || msg.poll.type === "confirmation_yes_no") && (
                                  <div>
                                    <textarea
                                      rows={2}
                                      value={currentSel.customText}
                                      onChange={(e) => handleCustomTextChange(msg.id, e.target.value)}
                                      placeholder="Digite aqui sua resposta ou observação para a coordenação..."
                                      className="w-full p-2.5 bg-white dark:bg-[#101726] border border-purple-300 dark:border-purple-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingPollMsgId(null)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleSubmitPollResponse(msg)}
                                    className="btn-3d py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Enviar Resposta ao CLA</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* ACTIONS */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedMsgId(msg.id);
                            setTimeout(() => setCopiedMsgId(null), 2000);
                          }}
                          className="text-[11px] text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-bold cursor-pointer"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Texto</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(msg.id)}
                              className="btn-3d py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Confirmar Leitura</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 12: CALANGUS IA */}
        {targetTab === "calangusia" && (
          <div className="space-y-4">
            <CalangusIaView notebookUrl={eventConfig?.notebookUrl || "https://notebook.google.com/notebook/c3e64642-72e2-4ced-9d2c-685fcb910084"} />
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 animate-fade-in text-sans">
      
      {/* LEFT SIDE NAVIGATION PANEL - 3D Tactile Sidebar */}
      <div className="w-full md:w-64 shrink-0 bg-white dark:bg-[#0c1220]/90 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 flex flex-col gap-2">
        <div className="px-3 py-2 text-center border-b border-slate-100 dark:border-slate-850 pb-4 mb-2 flex flex-col items-center">
          <div 
            className="relative group mb-2.5 cursor-pointer"
            onClick={() => setActiveMenuTab("profile")}
            title="Clique para enviar ou alterar sua foto"
          >
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt="Foto do Fiscal" 
                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-md bg-slate-100 group-hover:scale-105 transition duration-200" 
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white rounded-full flex items-center justify-center font-black text-xl border-2 border-indigo-500/10 shadow-md group-hover:scale-105 transition duration-200">
                {name ? name.substring(0, 2).toUpperCase() : "CM"}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-indigo-500 group-hover:bg-emerald-500 text-white rounded-full p-1.5 border-2 border-white dark:border-slate-900 shadow-sm transition">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>
          <h2 className="font-display font-black text-slate-850 dark:text-white text-sm line-clamp-1">{name || "Carregando..."}</h2>
          <span className="text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-full mt-1 tracking-wide">
            {collaboratorRecord?.isReserve ? "Fiscal de Reserva " : `Fiscal Sala: ${collaboratorRecord?.assignedRoom || "Sem Sala"}`}
          </span>
          <button
            type="button"
            onClick={() => setActiveMenuTab("profile")}
            className="mt-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Camera className="w-3 h-3" />
            <span>{photoUrl ? "Alterar Foto" : "Enviar Foto"}</span>
          </button>
        </div>

        {/* Navigation Buttons - Toggle on click with Mobile Inline View */}
        {/* 1. MENSAGENS DO CLA (MENU INICIAL DO COLABORADOR) */}
        <div className="flex flex-col">
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "messages" ? "" : "messages"))}
            className={`flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "messages"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <span className="flex items-center gap-2.5 flex-1">
              <MessageSquare className="w-4 h-4 text-sky-500" />
              <span>Mensagens do CLA</span>
            </span>
            {unreadMessagesCount > 0 && (
              <span className="text-[9px] bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-bounce">
                {unreadMessagesCount} {unreadMessagesCount === 1 ? "nova" : "novas"}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "messages" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
          {activeMenuTab === "messages" && (
            <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
              {renderTabContent("messages")}
            </div>
          )}
        </div>

        {/* 2. STATUS & LOCAL */}
        <div className="flex flex-col">
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "status" ? "" : "status"))}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "status"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span className="flex-1">Status & Local</span>
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "status" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
          {activeMenuTab === "status" && (
            <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
              {renderTabContent("status")}
            </div>
          )}
        </div>

        {/* 3. EDITAR PERFIL */}
        <div className="flex flex-col">
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "profile" ? "" : "profile"))}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "profile"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <User className="w-4 h-4" />
            <span className="flex-1">Editar Perfil</span>
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "profile" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
          {activeMenuTab === "profile" && (
            <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
              {renderTabContent("profile")}
            </div>
          )}
        </div>

        {isSnackMenuReleased && (
          <div className="flex flex-col">
            <button
              onClick={() => setActiveMenuTab((prev) => (prev === "snack" ? "" : "snack"))}
              className={`flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
                activeMenuTab === "snack"
                  ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 animate-pulse"
              }`}
            >
              <span className="flex items-center gap-2.5 flex-1">
                <Coffee className="w-4 h-4 text-emerald-500" />
                <span>Cardápio & Lanche</span>
              </span>
              <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full mr-1">LIBERADO</span>
              <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "snack" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
            </button>
            {activeMenuTab === "snack" && (
              <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
                {renderTabContent("snack")}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col">
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "materials" ? "" : "materials"))}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "materials"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="flex-1">Materiais de Apoio</span>
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "materials" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
          {activeMenuTab === "materials" && (
            <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
              {renderTabContent("materials")}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "agenda" ? "" : "agenda"))}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "agenda"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="flex-1">Agenda & Itinerário</span>
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "agenda" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
          {activeMenuTab === "agenda" && (
            <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
              {renderTabContent("agenda")}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "checklist" ? "" : "checklist"))}
            className={`flex items-center justify-between gap-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "checklist"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <span className="flex items-center gap-2.5 flex-1">
              <CheckSquare className="w-4 h-4" />
              <span>Check-list</span>
            </span>
            <span className="text-[9px] font-bold font-mono text-slate-400 mr-1">{finalPercent}%</span>
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "checklist" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
          {activeMenuTab === "checklist" && (
            <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
              {renderTabContent("checklist")}
            </div>
          )}
        </div>

        {/* 12. CALANGUS IA */}
        <div className="flex flex-col">
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "calangusia" ? "" : "calangusia"))}
            className={`flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "calangusia"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <span className="flex items-center gap-2.5 flex-1">
              <Bot className="w-4 h-4 text-amber-500" />
              <span className="flex items-center gap-1.5">
                <span>12. CalangusIA</span>
                <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              </span>
            </span>
            <span className="text-[8px] bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">IA</span>
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "calangusia" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
          {activeMenuTab === "calangusia" && (
            <div className="md:hidden mt-2 mb-3 p-4 bg-slate-50/90 dark:bg-[#070b13] rounded-2xl border-2 border-emerald-500/30 shadow-md animate-fade-in">
              {renderTabContent("calangusia")}
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-100 dark:border-slate-850 pt-4 px-2">
          <div className="p-3 bg-indigo-500/5 dark:bg-[#101726]/40 border border-indigo-500/10 rounded-xl text-center">
            <Sparkles className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <span className="block text-[8px] uppercase font-extrabold text-indigo-550 dark:text-indigo-400 tracking-widest">Portal CalanguS</span>
            <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">Fiscais autorizados Cebraspe.</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE DETAILS AREA (DESKTOP ONLY) */}
      <div className="hidden md:block grow bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10">
        {renderTabContent(desktopMenuTab)}
      </div>
    </div>
  );
}

// Inline replacement for CompassIcon if absent
function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
