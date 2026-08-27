import React, { useState, useMemo, useEffect } from "react";
import { 
  Mail, MessageSquare, Send, Phone, CheckCircle2, Clock, 
  Users, UserCheck, AlertTriangle, Sparkles, Copy, Check, 
  Search, Filter, ExternalLink, RefreshCw, Layers, ShieldCheck, 
  FileText, ArrowRight, MessageCircle, Info, Plus, Edit2, Trash2,
  HelpCircle, Smartphone, Inbox, Radio, X, Vote, Eye, BarChart3,
  HelpCircle as QuestionIcon, ThumbsUp, PlusCircle
} from "lucide-react";
import { BuildingInfo, CollaboratorInfo, CalangusMessage, CalangusTemplate, PingramConfig, MessagePoll } from "../types";
import PingramConfigModal from "./PingramConfigModal";
import MessageReceiptsAndPollsView from "./MessageReceiptsAndPollsView";
import { resetAllClaMessages } from "../lib/db-services";
import {
  getPingramConfig,
  sendEmailViaPingram,
  sendSmsViaPingram,
  dispatchPingramBatch,
  hasPingramConfig,
  formatBrazilianPhone,
  maskPingramApiKey as maskPingramKey,
} from "../utils/pingramConfig";

export interface SentMessageLog {
  id: string;
  sentAt: string;
  senderName: string;
  senderRole: string;
  channel: "email" | "calangus" | "whatsapp" | "sms";
  targetType: "individual" | "group";
  targetSummary: string;
  recipientCount: number;
  subject: string;
  body: string;
}

interface MessagingCenterProps {
  collaborators: CollaboratorInfo[];
  building: BuildingInfo | null;
  currentUserName?: string;
  currentUserRole?: string;
  claId?: string;
  onSaveBuilding?: (updatedBuilding: BuildingInfo) => Promise<void> | void;
}

// Initial Default Official Templates
const DEFAULT_TEMPLATES: CalangusTemplate[] = [
  {
    id: "convocacao_geral",
    title: "Convocação & Confirmação de Presença",
    channel: "whatsapp",
    subject: "Convocação Oficial para Atuação no ENEM",
    body: "Olá, {nome}! Você foi convocado(a) para atuar como {funcao} no ENEM no local {predio}. Por favor, acesse o sistema CalanguS e confirme sua presença imediatamente.",
    isCustom: false
  },
  {
    id: "lembrete_horario",
    title: "Lembrete de Horário e Apresentação",
    channel: "whatsapp",
    subject: "Horário de Apresentação e Acesso ao Prédio",
    body: "Atenção {nome}: A apresentação de toda a equipe no dia da prova ocorrerá pontualmente às 11h00 no prédio {predio}. Traga documento oficial com foto e caneta preta em tubo transparente.",
    isCustom: false
  },
  {
    id: "reserva_orientacao",
    title: "Orientações para Fiscais da Reserva",
    channel: "whatsapp",
    subject: "Orientações - Fiscais da Reserva ENEM",
    body: "Olá {nome}! Você está escalado(a) na Reserva Estratégica do ENEM no prédio {predio}. Sua presença é obrigatória a partir das 11h00 para suprir eventuais remanejamentos e garantir o funcionamento das salas.",
    isCustom: false
  },
  {
    id: "ajuste_orion",
    title: "Regularização de Inconsistência Cadastral (Orion)",
    channel: "email",
    subject: "URGENTE: Regularização Cadastral ENEM",
    body: "Prezado(a) {nome}, identificamos uma pendência no seu cadastro (CPF: {cpf}) no sistema do ENEM. Solicitamos que acesse o portal do colaborador ou entre em contato com a coordenação para regularizar sua situação.",
    isCustom: false
  },
  {
    id: "comunicado_interno_geral",
    title: "Comunicado Geral da Coordenação CLA",
    channel: "calangus",
    subject: "Comunicado Importante da Coordenação do Prédio",
    body: "Prezada equipe do prédio {predio}: Sejam bem-vindos aos trabalhos do ENEM 2026. Solicitamos que revisem a aba 'Agenda & Itinerário' e façam o check-list dos materiais antes do dia da aplicação.",
    isCustom: false
  }
];

export default function MessagingCenter({
  collaborators = [],
  building,
  currentUserName = "Coordenador de Local",
  currentUserRole = "CLA",
  claId = "",
  onSaveBuilding
}: MessagingCenterProps) {
  // Navigation tabs inside Messaging
  const [activeTab, setActiveTab] = useState<"compose" | "templates" | "history" | "confirmations" | "direct_info">("compose");

  // Composition State
  const [channel, setChannel] = useState<"whatsapp" | "email" | "calangus" | "sms">("whatsapp");
  const [targetType, setTargetType] = useState<"individual" | "group">("group");
  
  // Group Target Filter
  const [groupFilter, setGroupFilter] = useState<
    "all" | "confirmed_presence" | "pending_presence" | "reserves" | "with_errors" | "assigned" | "pending_approval"
  >("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Individual Target Selection
  const [selectedCollabId, setSelectedCollabId] = useState<string>("");
  const [searchCollabText, setSearchCollabText] = useState<string>("");

  // Message Content
  const [subject, setSubject] = useState<string>("Convocação e Orientações Importantes - ENEM");
  const [messageBody, setMessageBody] = useState<string>(
    "Olá, {nome}! Informamos que você foi selecionado para atuar no ENEM no prédio {predio}. Sua função prevista é {funcao}. Solicitamos que confirme sua presença no aplicativo CalanguS até as 18h."
  );

  // CLA Interactive Poll / Questionnaire Builder State
  const [includePoll, setIncludePoll] = useState<boolean>(false);
  const [pollQuestion, setPollQuestion] = useState<string>("");
  const [pollType, setPollType] = useState<"single_choice" | "multiple_choice" | "text_input" | "confirmation_yes_no">("single_choice");
  const [pollOptions, setPollOptions] = useState<Array<{ id: string; text: string }>>([
    { id: "opt-1", text: "Sim, confirmo presença" },
    { id: "opt-2", text: "Não poderei comparecer" }
  ]);
  const [pollRequired, setPollRequired] = useState<boolean>(true);

  // Synchronized Internal Messages State for Real-Time Read Receipts & Poll Responses
  const [internalMessages, setInternalMessages] = useState<CalangusMessage[]>(() => {
    let msgs: CalangusMessage[] = building?.messages ? [...building.messages] : [];
    try {
      const saved = JSON.parse(localStorage.getItem("enem_internal_messages") || "[]");
      const ids = new Set(msgs.map(m => m.id));
      saved.forEach((m: CalangusMessage) => {
        if (!ids.has(m.id)) {
          msgs.push(m);
          ids.add(m.id);
        }
      });
    } catch (e) {
      console.error(e);
    }
    return msgs;
  });

  const reloadInternalMessages = () => {
    let msgs: CalangusMessage[] = building?.messages ? [...building.messages] : [];
    try {
      const saved = JSON.parse(localStorage.getItem("enem_internal_messages") || "[]");
      const ids = new Set(msgs.map(m => m.id));
      saved.forEach((m: CalangusMessage) => {
        if (!ids.has(m.id)) {
          msgs.push(m);
          ids.add(m.id);
        }
      });
    } catch (e) {
      console.error(e);
    }
    setInternalMessages(msgs);
  };

  useEffect(() => {
    reloadInternalMessages();
    const handleUpdate = () => reloadInternalMessages();
    window.addEventListener("calangus_message_sent", handleUpdate);
    window.addEventListener("calangus_response_submitted", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("calangus_message_sent", handleUpdate);
      window.removeEventListener("calangus_response_submitted", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [building]);

  const handleAddPollOption = () => {
    setPollOptions(prev => [...prev, { id: `opt-${Date.now()}`, text: "" }]);
  };

  const handleRemovePollOption = (id: string) => {
    setPollOptions(prev => prev.filter(o => o.id !== id));
  };

  const handlePollOptionChange = (id: string, text: string) => {
    setPollOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
  };

  const applyPollPreset = (presetKey: string) => {
    setIncludePoll(true);
    if (presetKey === "treinamento") {
      setSubject("Convocação: Treinamento Presencial da Equipe");
      setMessageBody("Prezado(a) {nome}, você foi convocado(a) para o treinamento presencial preparatório do ENEM no prédio {predio}. Por favor, confirme sua presença respondendo ao questionamento abaixo.");
      setPollQuestion("Você confirma sua presença no treinamento presencial dos fiscais?");
      setPollType("single_choice");
      setPollOptions([
        { id: "opt-1", text: "Sim, estarei presente pontualmente" },
        { id: "opt-2", text: "Não poderei comparecer (justificar)" },
        { id: "opt-3", text: "Desejo receber o material digital complementar" }
      ]);
    } else if (presetKey === "transporte") {
      setSubject("Logística: Necessidade de Transporte para o Dia da Prova");
      setMessageBody("Olá {nome}, estamos organizando a logística de transporte para o prédio {predio}. Precisamos saber se você necessitará do transporte da coordenação.");
      setPollQuestion("Você necessita de transporte/van da coordenação para o dia da aplicação?");
      setPollType("single_choice");
      setPollOptions([
        { id: "opt-1", text: "Sim, preciso do transporte da coordenação" },
        { id: "opt-2", text: "Não, irei em condução própria" },
        { id: "opt-3", text: "Irei de carona com colega da equipe" }
      ]);
    } else if (presetKey === "camiseta") {
      setSubject("Uniforme Oficial: Escolha do Tamanho de Camiseta/Colete");
      setMessageBody("Olá {nome}, para a identificação da equipe durante a aplicação no {predio}, solicitamos que informe o tamanho do seu colete/camiseta oficial.");
      setPollQuestion("Qual o seu tamanho de camiseta/colete para a aplicação?");
      setPollType("single_choice");
      setPollOptions([
        { id: "opt-p", text: "Tamanho P" },
        { id: "opt-m", text: "Tamanho M" },
        { id: "opt-g", text: "Tamanho G" },
        { id: "opt-gg", text: "Tamanho GG" },
        { id: "opt-xg", text: "Tamanho XG" }
      ]);
    } else if (presetKey === "alimentacao") {
      setSubject("Kit Lanche: Preferências e Restrições Alimentares");
      setMessageBody("Olá {nome}, a coordenação está definindo a distribuição dos kits de alimentação. Por favor, assinale se possui alguma restrição alimentar.");
      setPollQuestion("Você possui alguma restrição alimentar para o kit lanche?");
      setPollType("single_choice");
      setPollOptions([
        { id: "opt-1", text: "Sem restrição alimentar (padrão)" },
        { id: "opt-2", text: "Vegetariano / Vegano" },
        { id: "opt-3", text: "Celíaco (Sem Glúten)" },
        { id: "opt-4", text: "Intolerante a Lactose" }
      ]);
    } else if (presetKey === "texto_livre") {
      setPollQuestion("Informe suas observações, dúvidas ou necessidades especiais para a escala:");
      setPollType("text_input");
      setPollOptions([]);
    }
  };

  // Template Management States
  const [templates, setTemplates] = useState<CalangusTemplate[]>(() => {
    if (building?.customMessageTemplates && building.customMessageTemplates.length > 0) {
      return building.customMessageTemplates;
    }
    try {
      const saved = localStorage.getItem("enem_message_templates");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TEMPLATES;
  });

  // Modal / Form state for template create/edit
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplFormTitle, setTplFormTitle] = useState("");
  const [tplFormChannel, setTplFormChannel] = useState<"whatsapp" | "email" | "calangus" | "sms">("whatsapp");
  const [tplFormSubject, setTplFormSubject] = useState("");
  const [tplFormBody, setTplFormBody] = useState("");

  // Logs of sent messages (stored in localStorage)
  const [sentLogs, setSentLogs] = useState<SentMessageLog[]>(() => {
    try {
      const saved = localStorage.getItem("enem_sent_messages_log");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [successBanner, setSuccessBanner] = useState<string>("");

  // Pingram API & Dispatch States
  const [isPingramModalOpen, setIsPingramModalOpen] = useState(false);
  const [pingramConfig, setPingramConfig] = useState<PingramConfig | null>(() => getPingramConfig(claId));
  const [isSendingViaPingram, setIsSendingViaPingram] = useState(false);
  const [pingramProgress, setPingramProgress] = useState<{
    current: number;
    total: number;
    channel: string;
    log: string[];
  } | null>(null);

  useEffect(() => {
    const handlePingramChange = (e: any) => {
      setPingramConfig(e.detail?.config || getPingramConfig(claId));
    };
    window.addEventListener("calangus_pingram_config_changed", handlePingramChange);
    return () => {
      window.removeEventListener("calangus_pingram_config_changed", handlePingramChange);
    };
  }, [claId]);

  // Reset all messages sent to collaborators across Firestore and LocalStorage
  const handleResetAllMessages = async () => {
    if (!confirm("⚠️ ATENÇÃO: Deseja realmente resetar e apagar TODAS as mensagens enviadas aos colaboradores?\n\nEsta ação limpará a caixa de entrada de todos os colaboradores e o histórico de mensagens para iniciarmos novos envios a partir de agora.")) {
      return;
    }

    try {
      // 1. Clear local state
      setInternalMessages([]);
      setSentLogs([]);

      // 2. Clear localStorage keys
      localStorage.removeItem("enem_internal_messages");
      localStorage.removeItem("enem_sent_messages_log");
      localStorage.setItem("enem_internal_messages", JSON.stringify([]));
      localStorage.setItem("enem_sent_messages_log", JSON.stringify([]));

      // 3. Update building with empty messages array
      if (building && onSaveBuilding) {
        await onSaveBuilding({
          ...building,
          messages: []
        });
      }

      // 4. Global wipe across Firestore & local cache
      await resetAllClaMessages(claId || building?.claId);

      // 5. Dispatch sync events
      window.dispatchEvent(new CustomEvent("calangus_message_sent", { detail: { reset: true } }));
      window.dispatchEvent(new CustomEvent("calangus_response_submitted", { detail: { reset: true } }));
      window.dispatchEvent(new Event("storage"));

      setSuccessBanner("✓ Todas as mensagens enviadas foram resetadas com sucesso! As caixas de entrada dos colaboradores agora estão limpas para os novos envios.");
      setTimeout(() => setSuccessBanner(""), 5000);
    } catch (err) {
      console.error("Erro ao resetar mensagens:", err);
      alert("Erro ao resetar mensagens. Verifique a conexão e tente novamente.");
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Deseja realmente excluir esta mensagem enviada?")) return;
    try {
      const updated = internalMessages.filter(m => m.id !== msgId);
      setInternalMessages(updated);
      localStorage.setItem("enem_internal_messages", JSON.stringify(updated));
      
      const updatedLogs = sentLogs.filter(l => l.id !== msgId && !l.id.includes(msgId));
      setSentLogs(updatedLogs);
      localStorage.setItem("enem_sent_messages_log", JSON.stringify(updatedLogs));

      if (building && onSaveBuilding) {
        const buildingMsgs = (building.messages || []).filter(m => m.id !== msgId);
        await onSaveBuilding({ ...building, messages: buildingMsgs });
      }

      window.dispatchEvent(new CustomEvent("calangus_message_sent", { detail: { deletedId: msgId } }));
      setSuccessBanner("Mensagem excluída com sucesso.");
      setTimeout(() => setSuccessBanner(""), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  // Sync templates changes to building and localStorage
  const saveTemplates = (newTemplates: CalangusTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem("enem_message_templates", JSON.stringify(newTemplates));
    if (building && onSaveBuilding) {
      onSaveBuilding({
        ...building,
        customMessageTemplates: newTemplates
      });
    }
  };

  // Open Template Modal for Create
  const handleOpenCreateTemplate = () => {
    setEditingTemplateId(null);
    setTplFormTitle("");
    setTplFormChannel(channel);
    setTplFormSubject(subject || "Novo Comunicado ENEM");
    setTplFormBody(messageBody || "Olá {nome}, informamos que...");
    setIsTemplateModalOpen(true);
  };

  // Open Template Modal for Edit
  const handleOpenEditTemplate = (tpl: CalangusTemplate) => {
    setEditingTemplateId(tpl.id);
    setTplFormTitle(tpl.title);
    setTplFormChannel(tpl.channel);
    setTplFormSubject(tpl.subject);
    setTplFormBody(tpl.body);
    setIsTemplateModalOpen(true);
  };

  // Save Template (Create or Update)
  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplFormTitle.trim() || !tplFormBody.trim()) {
      alert("Por favor, preencha o título e o corpo do modelo.");
      return;
    }

    if (editingTemplateId) {
      // Edit existing
      const updated = templates.map(t => 
        t.id === editingTemplateId 
          ? { ...t, title: tplFormTitle.trim(), channel: tplFormChannel, subject: tplFormSubject.trim(), body: tplFormBody.trim(), isCustom: true }
          : t
      );
      saveTemplates(updated);
      setSuccessBanner("Modelo de mensagem atualizado com sucesso!");
    } else {
      // Create new
      const newTpl: CalangusTemplate = {
        id: `tpl-${Date.now()}`,
        title: tplFormTitle.trim(),
        channel: tplFormChannel,
        subject: tplFormSubject.trim(),
        body: tplFormBody.trim(),
        isCustom: true
      };
      saveTemplates([...templates, newTpl]);
      setSuccessBanner("Novo modelo de mensagem criado com sucesso!");
    }

    setIsTemplateModalOpen(false);
    setTimeout(() => setSuccessBanner(""), 3500);
  };

  // Delete Template
  const handleDeleteTemplate = (tplId: string) => {
    if (confirm("Tem certeza que deseja excluir este modelo de mensagem?")) {
      const updated = templates.filter(t => t.id !== tplId);
      saveTemplates(updated);
      setSuccessBanner("Modelo excluído com sucesso.");
      setTimeout(() => setSuccessBanner(""), 3000);
    }
  };

  // Restore Default Templates
  const handleRestoreDefaultTemplates = () => {
    if (confirm("Deseja restaurar os modelos de mensagens originais do sistema?")) {
      saveTemplates(DEFAULT_TEMPLATES);
      setSuccessBanner("Modelos originais restaurados com sucesso!");
      setTimeout(() => setSuccessBanner(""), 3000);
    }
  };

  // Extract distinct roles for filter (only from CLA-approved collaborators)
  const approvedCollaborators = useMemo(() => {
    return collaborators.filter(c => c.status === "Confirmado");
  }, [collaborators]);

  const pendingApprovalCollaborators = useMemo(() => {
    return collaborators.filter(c => c.status === "Pendente");
  }, [collaborators]);

  const statsCounts = useMemo(() => {
    const approved = approvedCollaborators;
    return {
      totalAll: collaborators.length,
      approvedTotal: approved.length,
      confirmedPresence: approved.filter(c => c.attendanceStatus === "Confirmado").length,
      pendingPresence: approved.filter(c => c.attendanceStatus !== "Confirmado" && !c.isReserve).length,
      reserves: approved.filter(c => c.isReserve).length,
      assigned: approved.filter(c => !c.isReserve && !!c.assignedRole).length,
      withErrors: approved.filter(c => c.orionStatus === "Erro").length,
      pendingApproval: pendingApprovalCollaborators.length,
      rejected: collaborators.filter(c => c.status === "Recusado").length,
    };
  }, [collaborators, approvedCollaborators, pendingApprovalCollaborators]);

  const distinctRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    approvedCollaborators.forEach(c => {
      if (c.assignedRole) rolesSet.add(c.assignedRole);
      if (c.specialRole && c.specialRole !== "Nenhuma") rolesSet.add(c.specialRole);
    });
    return Array.from(rolesSet);
  }, [approvedCollaborators]);

  // Compute targeted recipients list
  const targetedRecipients = useMemo(() => {
    if (targetType === "individual") {
      const single = collaborators.find(c => c.id === selectedCollabId);
      return single ? [single] : [];
    }

    if (groupFilter === "pending_approval") {
      // Specifically target pending registrants in Menu 2
      let list = pendingApprovalCollaborators;
      if (roleFilter !== "all") {
        list = list.filter(c => c.assignedRole === roleFilter || c.specialRole === roleFilter);
      }
      return list;
    }

    // For all standard groups: ONLY collaborators approved by the CLA in Menu 2 (c.status === "Confirmado")
    return approvedCollaborators.filter(c => {
      // Group filter
      if (groupFilter === "confirmed_presence" && c.attendanceStatus !== "Confirmado") return false;
      if (groupFilter === "pending_presence" && (c.attendanceStatus === "Confirmado" || c.isReserve)) return false;
      if (groupFilter === "reserves" && !c.isReserve) return false;
      if (groupFilter === "assigned" && (c.isReserve || !c.assignedRole)) return false;
      if (groupFilter === "with_errors" && c.orionStatus !== "Erro") return false;

      // Role filter
      if (roleFilter !== "all") {
        if (c.assignedRole !== roleFilter && c.specialRole !== roleFilter) return false;
      }

      return true;
    });
  }, [collaborators, approvedCollaborators, pendingApprovalCollaborators, targetType, selectedCollabId, groupFilter, roleFilter]);

  // Helpers to replace placeholders in message
  const formatMessageForCollab = (template: string, collab: CollaboratorInfo) => {
    let text = template;
    text = text.replace(/\{nome\}/gi, collab.name || "Colaborador");
    text = text.replace(/\{primeiro_nome\}/gi, (collab.name || "Colaborador").split(" ")[0]);
    text = text.replace(/\{funcao\}/gi, collab.assignedRole || collab.specialRole || "Fiscal de Apoio");
    text = text.replace(/\{sala\}/gi, collab.assignedRoom || "A Definir");
    text = text.replace(/\{predio\}/gi, building?.name || "Local de Aplicação");
    text = text.replace(/\{cpf\}/gi, collab.cpf || "");
    text = text.replace(/\{horario\}/gi, "11:00h");
    return text;
  };

  // Helper to format WhatsApp URL
  const getWhatsAppUrl = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  // Helper to format SMS URL
  const getSmsUrl = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
  };

  // Apply a template
  const handleApplyTemplate = (tpl: CalangusTemplate) => {
    setChannel(tpl.channel);
    setSubject(tpl.subject);
    setMessageBody(tpl.body);
    setActiveTab("compose");
    setSuccessBanner(`Modelo "${tpl.title}" aplicado no editor!`);
    setTimeout(() => setSuccessBanner(""), 3000);
  };

  // Dispatch / Log Action
  const handleDispatchMessage = () => {
    if (targetedRecipients.length === 0) {
      alert("Nenhum colaborador selecionado como destinatário.");
      return;
    }

    if (!messageBody.trim()) {
      alert("Por favor, preencha o corpo da mensagem.");
      return;
    }

    const timestampStr = new Date().toLocaleString("pt-BR");
    const getGroupFilterLabel = () => {
      switch (groupFilter) {
        case "all": return `Todos os Colaboradores Aprovados (${statsCounts.approvedTotal})`;
        case "confirmed_presence": return `Presença Confirmada (${statsCounts.confirmedPresence})`;
        case "pending_presence": return `Pendentes de Confirmar Presença (${statsCounts.pendingPresence})`;
        case "reserves": return `Fiscais da Reserva (${statsCounts.reserves})`;
        case "assigned": return `Fiscais c/ Sala & Função (${statsCounts.assigned})`;
        case "with_errors": return `Com Inconsistência Orion (${statsCounts.withErrors})`;
        case "pending_approval": return `Cadastros Pendentes no Menu 2 (${statsCounts.pendingApproval})`;
        default: return groupFilter;
      }
    };

    const summaryTarget = targetType === "individual" 
      ? targetedRecipients[0]?.name || "Colaborador Individual"
      : `Grupo: ${getGroupFilterLabel()}${roleFilter !== "all" ? ` (${roleFilter})` : ""} (${targetedRecipients.length} pessoas)`;

    // 1. Create Sent Log
    const newLog: SentMessageLog = {
      id: `msg-${Date.now()}`,
      sentAt: timestampStr,
      senderName: currentUserName,
      senderRole: currentUserRole,
      channel: channel,
      targetType: targetType,
      targetSummary: summaryTarget,
      recipientCount: targetedRecipients.length,
      subject: subject,
      body: messageBody
    };

    const updatedLogs = [newLog, ...sentLogs];
    setSentLogs(updatedLogs);
    localStorage.setItem("enem_sent_messages_log", JSON.stringify(updatedLogs));

    // 2. ALWAYS dispatch internal Calangus message so collaborators receive in their personal inbox!
    const pollData: MessagePoll | undefined = (includePoll && pollQuestion.trim()) ? {
      id: `poll-${Date.now()}`,
      question: pollQuestion.trim(),
      type: pollType,
      options: pollType !== "text_input" ? pollOptions.filter(o => o.text.trim()) : [],
      required: pollRequired
    } : undefined;

    const newInternalMessage: CalangusMessage = {
      id: `cmsg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderClaId: claId || building?.claId || "cla-coord",
      senderName: currentUserName,
      senderRole: currentUserRole,
      title: subject || "Comunicado Oficial ENEM",
      content: messageBody,
      sentAt: timestampStr,
      channel: channel,
      channels: [channel],
      targetType: targetType === "individual" 
        ? "individual" 
        : (groupFilter === "all" 
            ? "all" 
            : (groupFilter === "reserves" 
                ? "reserve" 
                : (groupFilter === "confirmed_presence" 
                    ? "confirmed_attendance" 
                    : (groupFilter === "pending_presence" 
                        ? "pending_attendance" 
                        : (groupFilter === "assigned" ? "associated" : "role"))))),
      targetRoleId: roleFilter !== "all" ? roleFilter : undefined,
      targetRoleName: roleFilter !== "all" ? roleFilter : undefined,
      targetCollaboratorId: targetType === "individual" ? targetedRecipients[0]?.id : undefined,
      targetCollaboratorName: targetType === "individual" ? targetedRecipients[0]?.name : undefined,
      targetCollaboratorEmail: targetType === "individual" ? targetedRecipients[0]?.email : undefined,
      targetCollaboratorPhone: targetType === "individual" ? targetedRecipients[0]?.whatsapp : undefined,
      targetRecipientIds: targetedRecipients.map(r => r.id!).filter(Boolean),
      targetSummary: summaryTarget,
      readBy: [],
      readReceipts: [],
      poll: pollData,
      responses: []
    };

    // Save to building messages
    const currentBuildingMessages = building?.messages || [];
    const updatedBuildingMessages = [newInternalMessage, ...currentBuildingMessages];
    if (building && onSaveBuilding) {
      onSaveBuilding({
        ...building,
        messages: updatedBuildingMessages
      });
    }

    // Save to localStorage for instant local/cross-tab reactivity
    try {
      const stored = JSON.parse(localStorage.getItem("enem_internal_messages") || "[]");
      localStorage.setItem("enem_internal_messages", JSON.stringify([newInternalMessage, ...stored]));
      window.dispatchEvent(new CustomEvent("calangus_message_sent", { detail: newInternalMessage }));
    } catch (e) {
      console.error(e);
    }

    // 3. Channel specific direct external triggers
    if (channel === "whatsapp" && targetType === "individual") {
      const recipient = targetedRecipients[0];
      if (recipient.whatsapp) {
        const msgText = formatMessageForCollab(messageBody, recipient);
        const url = getWhatsAppUrl(recipient.whatsapp || "", msgText);
        window.open(url, "_blank");
      }
    } else if (channel === "email" && targetType === "individual") {
      const recipient = targetedRecipients[0];
      if (recipient.email) {
        const msgText = formatMessageForCollab(messageBody, recipient);
        // If Pingram is configured, attempt Pingram dispatch in background
        if (pingramConfig && pingramConfig.apiKey) {
          sendEmailViaPingram(pingramConfig, recipient.email, subject, msgText, recipient.name).catch(() => null);
        }
        const mailtoUrl = `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msgText)}`;
        window.open(mailtoUrl, "_blank");
      }
    } else if (channel === "sms" && targetType === "individual") {
      const recipient = targetedRecipients[0];
      if (recipient.whatsapp) {
        const msgText = formatMessageForCollab(messageBody, recipient);
        if (pingramConfig && pingramConfig.apiKey) {
          sendSmsViaPingram(pingramConfig, recipient.whatsapp, msgText, recipient.name).catch(() => null);
        }
        const smsUrl = getSmsUrl(recipient.whatsapp || "", msgText);
        window.open(smsUrl, "_blank");
      }
    }

    setSuccessBanner(
      channel === "calangus" 
        ? `Mensagem enviada com sucesso para a Caixa Pessoal de ${targetedRecipients.length} colaborador(es) no CalanguS!`
        : `Mensagem processada com sucesso e sincronizada na Caixa Interna do CalanguS para ${targetedRecipients.length} colaborador(es)!`
    );
    setTimeout(() => setSuccessBanner(""), 4500);
  };

  // Direct Pingram Batch Dispatch (Automatic Server & API Delivery)
  const handleDispatchViaPingram = async () => {
    if (!pingramConfig || !pingramConfig.apiKey) {
      setIsPingramModalOpen(true);
      return;
    }

    if (targetedRecipients.length === 0) {
      alert("Nenhum colaborador selecionado como destinatário.");
      return;
    }

    if (!messageBody.trim()) {
      alert("Por favor, preencha o corpo da mensagem.");
      return;
    }

    const currentChannel = channel === "sms" ? "sms" : "email";
    setIsSendingViaPingram(true);
    setPingramProgress({
      current: 0,
      total: targetedRecipients.length,
      channel: currentChannel,
      log: [`Iniciando envio via Pingram API (${currentChannel.toUpperCase()})...`],
    });

    const items = targetedRecipients.map((collab) => ({
      id: collab.id,
      name: collab.name,
      email: collab.email,
      phone: collab.whatsapp,
      body: formatMessageForCollab(messageBody, collab),
      subject: subject || "Comunicado ENEM 2026",
      channel: currentChannel as "email" | "sms",
    }));

    try {
      const batchResult = await dispatchPingramBatch(pingramConfig, items);

      // Save Log
      const timestampStr = new Date().toLocaleString("pt-BR");
      const summaryTarget = targetType === "individual"
        ? targetedRecipients[0]?.name || "Colaborador Individual"
        : `Disparo Pingram (${currentChannel.toUpperCase()}): ${targetedRecipients.length} pessoas`;

      const newLog: SentMessageLog = {
        id: `pingram-${Date.now()}`,
        sentAt: timestampStr,
        senderName: `${currentUserName} (via Pingram)`,
        senderRole: currentUserRole,
        channel: currentChannel as "email" | "sms",
        targetType: targetType,
        targetSummary: summaryTarget,
        recipientCount: batchResult.successCount,
        subject: subject,
        body: messageBody,
      };

      const updatedLogs = [newLog, ...sentLogs];
      setSentLogs(updatedLogs);
      localStorage.setItem("enem_sent_messages_log", JSON.stringify(updatedLogs));

      // Also save internal notification message
      const newInternalMessage: CalangusMessage = {
        id: `cmsg-p-${Date.now()}`,
        senderClaId: claId || building?.claId || "cla-coord",
        senderName: `${currentUserName} (Pingram ${currentChannel.toUpperCase()})`,
        senderRole: currentUserRole,
        title: subject || "Comunicado Oficial ENEM",
        content: messageBody,
        sentAt: timestampStr,
        channel: currentChannel as "email" | "sms",
        channels: [currentChannel as "email" | "sms"],
        targetType: "all",
        targetSummary: summaryTarget,
        readBy: [],
      };

      if (building && onSaveBuilding) {
        onSaveBuilding({
          ...building,
          messages: [newInternalMessage, ...(building.messages || [])],
        });
      }

      setSuccessBanner(
        `✓ Disparo concluído via Pingram! ${batchResult.successCount} de ${items.length} mensagens entregues com sucesso.`
      );
      setTimeout(() => setSuccessBanner(""), 6000);
    } catch (err: any) {
      alert(`Erro no disparo Pingram: ${err.message || "Falha na conexão"}`);
    } finally {
      setIsSendingViaPingram(false);
      setPingramProgress(null);
    }
  };

  // Single Recipient Instant Pingram Trigger from Queue Card
  const handleSinglePingramSend = async (collab: CollaboratorInfo) => {
    if (!pingramConfig || !pingramConfig.apiKey) {
      setIsPingramModalOpen(true);
      return;
    }

    const currentChannel = channel === "sms" ? "sms" : "email";
    const formattedText = formatMessageForCollab(messageBody, collab);

    try {
      if (currentChannel === "email") {
        if (!collab.email) {
          alert(`O colaborador ${collab.name} não possui e-mail cadastrado.`);
          return;
        }
        await sendEmailViaPingram(pingramConfig, collab.email, subject, formattedText, collab.name);
        setSuccessBanner(`✓ E-mail enviado com sucesso para ${collab.name} (${collab.email}) via Pingram!`);
      } else {
        if (!collab.whatsapp) {
          alert(`O colaborador ${collab.name} não possui telefone/celular cadastrado.`);
          return;
        }
        await sendSmsViaPingram(pingramConfig, collab.whatsapp, formattedText, collab.name);
        setSuccessBanner(`✓ SMS enviado com sucesso para ${collab.name} (${collab.whatsapp}) via Pingram!`);
      }
      setTimeout(() => setSuccessBanner(""), 4500);
    } catch (err: any) {
      alert(`Falha no envio via Pingram para ${collab.name}: ${err.message}`);
    }
  };

  // Copy rendered message for an individual in queue
  const handleCopyRendered = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Insert tag into textarea
  const handleInsertTag = (tag: string, isModal: boolean = false) => {
    if (isModal) {
      setTplFormBody(prev => prev + " " + tag);
    } else {
      setMessageBody(prev => prev + " " + tag);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="text-left">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-10 h-10 bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/30 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2 text-left">
                <span>Central de Comunicação & Mensagens</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  MENU 10
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-left">
                Envio direto de comunicados para colaboradores individuais ou grupos com suporte a WhatsApp 1-Clique, Caixa Interna CalanguS, E-mail e SMS.
              </p>
            </div>
          </div>
        </div>

        {/* TABS & PINGRAM SELECTOR */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PINGRAM API STATUS BUTTON */}
          <button
            type="button"
            onClick={() => setIsPingramModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-xs ${
              pingramConfig && pingramConfig.apiKey
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
                : "bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20"
            }`}
            title="Configurar credenciais da API Pingram para este CLA (E-mail e SMS)"
          >
            <Radio className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
            <span>API Pingram:</span>
            {pingramConfig && pingramConfig.apiKey ? (
              <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded font-mono">
                {maskPingramKey(pingramConfig.apiKey)}
              </span>
            ) : (
              <span className="text-[10px] font-black bg-sky-600 text-white px-1.5 py-0.2 rounded">
                Configurar CLA
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "compose"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span>Nova Mensagem</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("confirmations")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "confirmations"
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 font-bold"
              }`}
              title="Acompanhar confirmações de leitura e respostas a questionamentos dos colaboradores em tempo real"
            >
              <Vote className="w-3.5 h-3.5 text-purple-400" />
              <span>Monitor de Leitura & Enquetes</span>
              {internalMessages.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "confirmations" ? "bg-white text-purple-700" : "bg-purple-600 text-white"
                }`}>
                  {internalMessages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "templates"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Modelos Prontos ({templates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Histórico ({sentLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("direct_info")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "direct_info"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Pingram & E-mail/SMS</span>
            </button>
          </div>

          {/* RESET ALL MESSAGES BUTTON */}
          <button
            type="button"
            id="btn-reset-all-messages"
            onClick={handleResetAllMessages}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 active:scale-95 shadow-xs ml-auto sm:ml-0"
            title="Resetar e apagar todas as mensagens enviadas aos colaboradores (limpa a caixa de entrada de todos para iniciar novos envios)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Resetar Mensagens</span>
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMPOSE MESSAGE */}
      {/* ========================================================================= */}
      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-left">
          
          {/* LEFT 2 COLS: COMPOSITION WORKSPACE */}
          <div className="lg:col-span-2 space-y-5 bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 text-left">
            
            {/* REAL-TIME COLLABORATORS SYNC METRICS (CONGRUENCE WITH MENU 2) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-2 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Sincronização de Cadastros (Menu 2 - Fiscais e Inscrições)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {statsCounts.approvedTotal} Aprovados pelo CLA
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {statsCounts.assigned} Efetivos c/ Sala
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {statsCounts.reserves} Reserva
                  </span>
                  {statsCounts.pendingApproval > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      {statsCounts.pendingApproval} Pendentes no Menu 2
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Os colaboradores aptos para atuação e disparos regulares são estritamente aqueles com <strong>cadastro aprovado pelo CLA no Menu 2</strong>. Colaboradores com cadastro pendente não ingressam como efetivos nem como reserva até sua aprovação.
              </p>
            </div>

            {/* CHANNEL SELECTOR */}
            <div>
              <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2 text-left">
                1. Selecione o Canal de Comunicação
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <button
                  type="button"
                  onClick={() => setChannel("whatsapp")}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                    channel === "whatsapp"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>WhatsApp</span>
                  </div>
                  <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 text-left">1-Clique Web/App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel("calangus")}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                    channel === "calangus"
                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Inbox className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>CalanguS Interno</span>
                  </div>
                  <span className="text-[9px] font-normal text-indigo-600 dark:text-indigo-400 text-left">Caixa do Colaborador</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-start gap-1 transition cursor-pointer text-left relative ${
                    channel === "email"
                      ? "bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>E-mail Oficial</span>
                    </div>
                    {pingramConfig?.apiKey ? (
                      <span className="text-[8px] bg-emerald-500 text-white font-black px-1.5 py-0.2 rounded uppercase">
                        Pingram API
                      </span>
                    ) : (
                      <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-1 py-0.2 rounded">
                        Mailto
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-normal text-sky-600 dark:text-sky-400 text-left">
                    {pingramConfig?.apiKey ? "Envio automático via API" : "Template formal / Mailto"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-start gap-1 transition cursor-pointer text-left relative ${
                    channel === "sms"
                      ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>SMS Celular</span>
                    </div>
                    {pingramConfig?.apiKey ? (
                      <span className="text-[8px] bg-emerald-500 text-white font-black px-1.5 py-0.2 rounded uppercase">
                        Pingram API
                      </span>
                    ) : (
                      <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-1 py-0.2 rounded">
                        SMS Link
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-normal text-amber-600 dark:text-amber-400 text-left">
                    {pingramConfig?.apiKey ? "Envio automático via API" : "Mensagem de texto / Celular"}
                  </span>
                </button>
              </div>
            </div>

            {/* TARGET SELECTION */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-left">
              <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 text-left">
                2. Destinatários da Mensagem
              </label>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "group"}
                    onChange={() => setTargetType("group")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Disparo para Grupo / Segmento</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "individual"}
                    onChange={() => setTargetType("individual")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Colaborador Individual Específico</span>
                </label>
              </div>

              {/* GROUP FILTERS */}
              {targetType === "group" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 text-left">
                      Filtrar por Condição
                    </label>
                    <select
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value as any)}
                      className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-[#101726] text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">Todos os Colaboradores Aprovados ({statsCounts.approvedTotal})</option>
                      <option value="confirmed_presence">Presença Confirmada ({statsCounts.confirmedPresence})</option>
                      <option value="pending_presence">Pendentes de Confirmar Presença ({statsCounts.pendingPresence})</option>
                      <option value="reserves">Fiscais da Reserva - Aprovados ({statsCounts.reserves})</option>
                      <option value="assigned">Fiscais c/ Função & Sala - Aprovados ({statsCounts.assigned})</option>
                      <option value="with_errors">Com Inconsistência Orion - Aprovados ({statsCounts.withErrors})</option>
                      {statsCounts.pendingApproval > 0 && (
                        <option value="pending_approval" className="text-amber-600 font-bold">
                          ⚠️ Cadastros Pendentes no Menu 2 ({statsCounts.pendingApproval})
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 text-left">
                      Filtrar por Função
                    </label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-[#101726] text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">Todas as Funções ({statsCounts.approvedTotal})</option>
                      {distinctRoles.map(role => {
                        const countInRole = approvedCollaborators.filter(c => c.assignedRole === role || c.specialRole === role).length;
                        return (
                          <option key={role} value={role}>{role} ({countInRole})</option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {/* INDIVIDUAL SELECTION */}
              {targetType === "individual" && (
                <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchCollabText}
                      onChange={(e) => setSearchCollabText(e.target.value)}
                      placeholder="Pesquisar por nome, CPF ou email..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-left">
                    {collaborators
                      .filter(c => {
                        if (!searchCollabText) return true;
                        const q = searchCollabText.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.cpf.includes(q) ||
                          (c.email && c.email.toLowerCase().includes(q))
                        );
                      })
                      .sort((a, b) => {
                        const order: Record<string, number> = { "Confirmado": 1, "Pendente": 2, "Recusado": 3, "Cancelado": 4 };
                        const orderA = order[a.status || ""] || 5;
                        const orderB = order[b.status || ""] || 5;
                        return orderA - orderB;
                      })
                      .map(c => {
                        const isSelected = selectedCollabId === c.id;
                        const isApproved = c.status === "Confirmado";
                        const isPending = c.status === "Pendente";

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCollabId(c.id!)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer border ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border-emerald-500/50 shadow-xs"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800"
                            }`}
                          >
                            <div className="text-left space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span>{c.name}</span>
                                {isApproved && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                    Aprovado {c.isReserve ? "(Reserva)" : (c.assignedRoom ? `(Sala ${c.assignedRoom})` : "")}
                                  </span>
                                )}
                                {isPending && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                                    ⏳ Pendente Menu 2
                                  </span>
                                )}
                                {c.status === "Recusado" && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300">
                                    Recusado
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {c.assignedRole || c.specialRole || "Sem Função"} • CPF: {c.cpf || "---"} • Tel: {c.whatsapp || "Sem tel"}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                  </div>

                  {/* Warning if selected collaborator is pending approval in Menu 2 */}
                  {selectedCollabId && collaborators.find(c => c.id === selectedCollabId)?.status === "Pendente" && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        <strong>Aviso:</strong> O cadastro deste colaborador está <strong>Pendente de Aprovação no Menu 2</strong>. Para que ele possa atuar na aplicação de provas ou compor a reserva, aprove o cadastro no Menu 2 (Fiscais e Inscrições).
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SUBJECT FIELD (FOR EMAIL OR NOTIFICATIONS) */}
            <div>
              <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1 text-left">
                3. Assunto / Título da Mensagem
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Convocação Oficial ENEM"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 text-left"
              />
            </div>

            {/* MESSAGE BODY WITH DYNAMIC TAGS */}
            <div className="text-left">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 text-left">
                  4. Mensagem & Tags Dinâmicas
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {messageBody.length} caracteres
                </span>
              </div>

              {/* QUICK TAG BUTTONS */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2 text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400">Inserir tag:</span>
                {[
                  { tag: "{nome}", label: "Nome Completo" },
                  { tag: "{primeiro_nome}", label: "1º Nome" },
                  { tag: "{funcao}", label: "Função" },
                  { tag: "{sala}", label: "Sala" },
                  { tag: "{predio}", label: "Nome do Prédio" },
                  { tag: "{horario}", label: "Horário (11h)" },
                  { tag: "{cpf}", label: "CPF" }
                ].map(t => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() => handleInsertTag(t.tag)}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-600 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
                    title={`Inserir ${t.label}`}
                  >
                    {t.tag}
                  </button>
                ))}
              </div>

              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                placeholder="Digite o texto da mensagem que será enviada aos colaboradores..."
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed text-left"
              />
            </div>

            {/* INTERACTIVE QUESTIONNAIRE / POLL BUILDER FOR CALANGUS INBOX */}
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800/60 space-y-3.5 text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                    <Vote className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Questionamento Interativo do CLA</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200">
                        Caixa CalanguS
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Solicite que o colaborador escolha uma opção ou responda a uma pergunta diretamente na mensagem.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={includePoll}
                    onChange={(e) => setIncludePoll(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {includePoll && (
                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/40 space-y-3 animate-fade-in text-left">
                  {/* PRESET CHIPS */}
                  <div>
                    <span className="text-[9px] font-black uppercase text-purple-700 dark:text-purple-300 block mb-1">
                      Modelos de Questionamentos Prontos:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { key: "treinamento", label: "🎓 Presença no Treinamento" },
                        { key: "transporte", label: "🚌 Van / Transporte" },
                        { key: "camiseta", label: "👕 Tamanho Uniforme" },
                        { key: "alimentacao", label: "🥗 Restrição Alimentar" },
                        { key: "texto_livre", label: "✏️ Campo Aberto / Obs" }
                      ].map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => applyPollPreset(p.key)}
                          className="px-2.5 py-1 bg-white dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-800/60 text-purple-800 dark:text-purple-200 rounded-lg text-[10px] font-bold border border-purple-200 dark:border-purple-700 transition cursor-pointer shadow-2xs"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QUESTION INPUT */}
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">
                      Pergunta / Solicitação da Coordenação *
                    </label>
                    <input
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Ex: Você confirma sua presença no treinamento presencial dos fiscais?"
                      className="w-full border-2 border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* RESPONSE TYPE SELECTOR */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">
                        Formato da Resposta
                      </label>
                      <select
                        value={pollType}
                        onChange={(e: any) => setPollType(e.target.value)}
                        className="w-full border border-purple-200 dark:border-purple-800 rounded-xl p-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-bold"
                      >
                        <option value="single_choice">Escolha Única (Opção Exclusiva)</option>
                        <option value="multiple_choice">Múltipla Escolha (Várias Opções)</option>
                        <option value="text_input">Texto Livre (Colaborador digita)</option>
                        <option value="confirmation_yes_no">Sim / Não com Observação</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pollRequired}
                          onChange={(e) => setPollRequired(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                        />
                        <span>Resposta Obrigatória para o Colaborador</span>
                      </label>
                    </div>
                  </div>

                  {/* OPTIONS LIST (IF NOT TEXT ONLY) */}
                  {pollType !== "text_input" && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                          Opções de Resposta para Escolha
                        </label>
                        <button
                          type="button"
                          onClick={handleAddPollOption}
                          className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Adicionar Opção</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {pollOptions.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="w-5 text-[11px] font-mono font-bold text-slate-400 text-center">
                              {idx + 1}.
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handlePollOptionChange(opt.id, e.target.value)}
                              placeholder={`Texto da opção ${idx + 1}...`}
                              className="flex-1 border border-purple-200 dark:border-purple-800/80 rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#101726] text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500"
                            />
                            {pollOptions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePollOption(opt.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                                title="Remover esta opção"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ACTION DISPATCH BUTTONS */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium text-left">
                Destinatários na fila: <strong className="text-slate-850 dark:text-white font-bold">{targetedRecipients.length} colaborador(es)</strong>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenCreateTemplate}
                  className="px-3.5 py-2.5 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Salvar como Modelo</span>
                </button>

                {/* DIRECT PINGRAM BATCH DISPATCH BUTTON (FOR EMAIL & SMS) */}
                {(channel === "email" || channel === "sms") && (
                  <button
                    type="button"
                    onClick={handleDispatchViaPingram}
                    disabled={targetedRecipients.length === 0 || isSendingViaPingram}
                    className={`btn-3d py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md text-white ${
                      targetedRecipients.length === 0 || isSendingViaPingram
                        ? "bg-slate-400 cursor-not-allowed opacity-60"
                        : channel === "email"
                        ? "bg-sky-600 hover:bg-sky-500 border border-sky-400/40"
                        : "bg-amber-600 hover:bg-amber-500 border border-amber-400/40"
                    }`}
                    title={
                      pingramConfig?.apiKey
                        ? `Disparar ${channel.toUpperCase()} para todos os ${targetedRecipients.length} destinatários via API Pingram do CLA`
                        : "Configurar chave Pingram para envio automático"
                    }
                  >
                    <Radio className={`w-4 h-4 ${isSendingViaPingram ? "animate-spin" : "animate-pulse"}`} />
                    <span>
                      {isSendingViaPingram
                        ? "Enviando via Pingram..."
                        : pingramConfig?.apiKey
                        ? `Disparar via Pingram API (${targetedRecipients.length})`
                        : `Conectar Pingram CLA (${channel.toUpperCase()})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDispatchMessage}
                  disabled={targetedRecipients.length === 0 || isSendingViaPingram}
                  className={`btn-3d py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md text-white grow sm:grow-0 ${
                    targetedRecipients.length === 0 || isSendingViaPingram
                      ? "bg-slate-400 cursor-not-allowed opacity-60"
                      : channel === "whatsapp"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : channel === "calangus"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {channel === "calangus"
                      ? `Enviar na Caixa CalanguS (${targetedRecipients.length})`
                      : channel === "whatsapp"
                      ? `Disparar no WhatsApp (${targetedRecipients.length})`
                      : `Disparo Local / Manual (${targetedRecipients.length})`}
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT 1 COL: LIVE PREVIEW & QUEUE */}
          <div className="space-y-4 text-left">
            <div className="bg-white dark:bg-[#0c1220]/90 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5 text-left">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pré-visualização Dinâmica</span>
                </span>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-mono font-bold">
                  {targetedRecipients.length} na fila
                </span>
              </div>

              {/* RECIPIENTS QUEUE SCROLLER */}
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 text-left">
                {targetedRecipients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    Nenhum colaborador corresponde aos filtros selecionados.
                  </div>
                ) : (
                  targetedRecipients.slice(0, 10).map((collab, idx) => {
                    const previewText = formatMessageForCollab(messageBody, collab);
                    const waPhone = collab.whatsapp || "";
                    const waUrl = getWhatsAppUrl(waPhone, previewText);
                    const smsUrl = getSmsUrl(waPhone, previewText);
                    const mailUrl = `mailto:${collab.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(previewText)}`;

                    return (
                      <div
                        key={collab.id || idx}
                        className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-left"
                      >
                        <div className="flex items-center justify-between text-left">
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white block text-left">
                              {collab.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block text-left">
                              {collab.status === "Confirmado" ? (
                                `${collab.assignedRole || collab.specialRole || (collab.isReserve ? "Reserva Estratégica" : "Fiscal Efetivo")} • Sala: ${collab.assignedRoom || "A Definir"}`
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  {collab.status === "Pendente" ? "⏳ Cadastro Pendente no Menu 2" : `Status: ${collab.status}`}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {channel === "whatsapp" && waPhone && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                                title="Abrir WhatsApp Web / App para este fiscal"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            {channel === "sms" && waPhone && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSinglePingramSend(collab)}
                                  className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition shadow-xs cursor-pointer"
                                  title="Enviar SMS via API Pingram deste CLA"
                                >
                                  <Radio className="w-3.5 h-3.5" />
                                  <span>Pingram SMS</span>
                                </button>
                                <a
                                  href={smsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                                  title="Abrir SMS no celular"
                                >
                                  <Smartphone className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                            {channel === "email" && collab.email && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSinglePingramSend(collab)}
                                  className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition shadow-xs cursor-pointer"
                                  title="Enviar E-mail via API Pingram deste CLA"
                                >
                                  <Radio className="w-3.5 h-3.5" />
                                  <span>Pingram Mail</span>
                                </button>
                                <a
                                  href={mailUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                                  title="Abrir cliente de e-mail local"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                            {channel === "calangus" && (
                              <span className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-indigo-500/20">
                                <Inbox className="w-3 h-3" />
                                <span>Caixa CalanguS</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* MESSAGE PREVIEW BOX */}
                        <div className="p-2 bg-white dark:bg-[#0c1220] rounded-lg text-[11px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed border border-slate-200 dark:border-slate-800 text-left">
                          {previewText}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 text-left">
                          <span>Tel: {waPhone || "Não informado"}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyRendered(previewText, idx)}
                            className="text-slate-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 font-bold">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar texto</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* VIABILITY NOTICE CARD */}
            <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs space-y-1.5 text-left">
              <div className="flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-left">
                <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Integração de Mensagens no CalanguS</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-left">
                ✅ <strong>Caixa Pessoal CalanguS Integrada:</strong> Os colaboradores visualizam as mensagens diretamente na aba <em>"Mensagens do CLA"</em> no painel deles com confirmação de leitura instantânea, sem custo e sem depender de softwares de terceiros.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CONFIRMATIONS & POLLS MONITOR (RECEIPTS & RESPONSES) */}
      {/* ========================================================================= */}
      {activeTab === "confirmations" && (
        <MessageReceiptsAndPollsView
          messages={internalMessages}
          collaborators={collaborators}
          building={building}
          currentUserName={currentUserName}
          claId={claId}
          onSaveBuilding={onSaveBuilding}
          onResetAllMessages={handleResetAllMessages}
          onDeleteMessage={handleDeleteMessage}
          onComposeNewWithTarget={(ids, defaultSubj, defaultBdy) => {
            if (ids.length === 1) {
              setTargetType("individual");
              setSelectedCollabId(ids[0]);
            } else {
              setTargetType("group");
            }
            if (defaultSubj) setSubject(defaultSubj);
            if (defaultBdy) setMessageBody(defaultBdy);
            setActiveTab("compose");
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUICK TEMPLATES MANAGEMENT (CRUD) */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 space-y-5 text-left">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-4 text-left">
            <div>
              <h3 className="text-sm font-display font-black text-slate-850 dark:text-white uppercase tracking-wider text-left">
                Gestão de Modelos de Mensagens & Convocação
              </h3>
              <p className="text-xs text-slate-500 font-medium text-left">
                Crie novos modelos personalizados, edite textos e canais ou exclua modelos não utilizados pelo CLA.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDefaultTemplates}
                className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Restaurar modelos padrão do sistema"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Padrões</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateTemplate}
                className="btn-3d py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Modelo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border-2 border-slate-200 dark:border-slate-800 space-y-3 hover:border-emerald-500/40 transition flex flex-col justify-between text-left"
              >
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between gap-2 text-left">
                    <span className="font-bold text-xs text-slate-900 dark:text-white text-left">
                      {tpl.title}
                    </span>
                    <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                      tpl.channel === "whatsapp" 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : tpl.channel === "calangus"
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                        : tpl.channel === "sms"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                    }`}>
                      {tpl.channel.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-left">
                    Assunto: <span className="font-bold text-slate-900 dark:text-white">{tpl.subject}</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-[#0c1220] rounded-lg text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200 dark:border-slate-800 text-left whitespace-pre-wrap font-sans">
                    {tpl.body}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTemplate(tpl)}
                      className="p-1.5 px-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Editar este modelo"
                    >
                      <Edit2 className="w-3 h-3 text-sky-500" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Excluir este modelo"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Excluir</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Usar no Editor</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MESSAGE HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 space-y-4 text-left">
          <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3 text-left">
            <div>
              <h3 className="text-sm font-display font-black text-slate-850 dark:text-white uppercase tracking-wider text-left">
                Histórico de Mensagens Enviadas
              </h3>
              <p className="text-xs text-slate-500 font-medium text-left">
                Registro de todas as mensagens e convocações disparadas pela coordenação.
              </p>
            </div>
            {sentLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Deseja limpar o histórico de mensagens?")) {
                    setSentLogs([]);
                    localStorage.removeItem("enem_sent_messages_log");
                  }
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
              >
                Limpar Histórico
              </button>
            )}
          </div>

          {sentLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              Nenhuma mensagem disparada até o momento.
            </div>
          ) : (
            <div className="space-y-3 text-left">
              {sentLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-left"
                >
                  <div className="flex items-center justify-between text-xs text-left">
                    <span className="font-black text-slate-900 dark:text-white text-left">
                      {log.subject || "Sem Assunto"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.sentAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 text-left">
                    <span>Canal: <strong className="uppercase text-slate-800 dark:text-slate-200">{log.channel}</strong></span>
                    <span>•</span>
                    <span>Destinatários: <strong className="text-slate-800 dark:text-slate-200">{log.targetSummary}</strong></span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-[#0c1220] rounded-lg text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-sans text-left">
                    {log.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DIRECT EMAIL & SMS TECHNICAL GUIDE & VIABILITY */}
      {/* ========================================================================= */}
      {activeTab === "direct_info" && (
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 space-y-6 text-left">
          
          <div className="border-b-2 border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <h3 className="text-sm font-display font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2 text-left">
                <Radio className="w-4 h-4 text-sky-500" />
                <span>Integração Pingram API • E-mail & SMS Direto do CLA</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium text-left">
                Cada CLA pode criar e cadastrar sua própria chave de API Pingram para disparar e-mails e SMS automáticos para seus colaboradores.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPingramModalOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition cursor-pointer self-start sm:self-auto"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Configurar API Pingram</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            
            {/* EMAIL DIRECT CARD */}
            <div className="p-5 bg-sky-500/5 dark:bg-sky-500/10 rounded-2xl border-2 border-sky-500/30 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="font-display font-black text-sm text-slate-850 dark:text-white text-left">
                  1. Envio Direto de E-mails via Pingram
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                <strong>Disparo em lote automatizado!</strong> Ao cadastrar sua chave API do Pingram, os e-mails são enviados diretamente pelos servidores sem que você precise abrir seu webmail pessoal.
              </p>
              <div className="p-3 bg-white dark:bg-[#0c1220] rounded-xl border border-sky-500/20 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 text-left">
                <div className="font-bold text-sky-700 dark:text-sky-300">Como funciona:</div>
                <div>• O sistema monta o template formatado com o nome e sala.</div>
                <div>• O backend Node/Vercel conecta na sua API Pingram.</div>
                <div>• O colaborador recebe com remetente configurado.</div>
              </div>
            </div>

            {/* SMS DIRECT CARD */}
            <div className="p-5 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border-2 border-amber-500/30 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h4 className="font-display font-black text-sm text-slate-850 dark:text-white text-left">
                  2. Envio Direto de SMS via Pingram
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                <strong>Notificações no bolso do colaborador!</strong> O SMS do Pingram alcança colaboradores mesmo sem internet ativa no celular, ideal para convocações urgentes e avisos de horário (11h).
              </p>
              <div className="p-3 bg-white dark:bg-[#0c1220] rounded-xl border border-amber-500/20 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 text-left">
                <div className="font-bold text-amber-700 dark:text-amber-300">Recursos de SMS:</div>
                <div>• Formatação automática no padrão internacional (+55 E.164).</div>
                <div>• Disparo individual com 1 clique ou em lote para toda a equipe.</div>
              </div>
            </div>

            {/* CALANGUS INTERNAL INBOX CARD */}
            <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/30 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Inbox className="w-5 h-5" />
                </div>
                <h4 className="font-display font-black text-sm text-slate-850 dark:text-white text-left">
                  3. Caixa Interna CalanguS
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                <strong>100% Nativo, Gratuito e Instantâneo!</strong> Todas as mensagens enviadas pela coordenação caem instantaneamente na <em>Caixa de Mensagens do Colaborador</em> no próprio portal CalanguS dele.
              </p>
              <div className="p-3 bg-white dark:bg-[#0c1220] rounded-xl border border-emerald-500/20 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 text-left">
                <div className="font-bold text-emerald-700 dark:text-emerald-300">Recursos do Ambiente Interno:</div>
                <div>• Notificação de novas mensagens com contador.</div>
                <div>• Confirmação de recebimento e leitura.</div>
                <div>• Não depende de e-mail externo, saldo de SMS nem WhatsApp.</div>
              </div>
            </div>

          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-4 text-left">
            <span className="text-left">Deseja redigir ou disparar uma convocação agora?</span>
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className="btn-3d py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer shadow-md shrink-0"
            >
              Ir para Nova Mensagem
            </button>
          </div>

        </div>
      )}

      {/* PINGRAM DISPATCH PROGRESS MODAL */}
      {pingramProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-white dark:bg-[#0c1220] max-w-md w-full rounded-2xl border-2 border-sky-500/40 p-6 space-y-4 shadow-2xl animate-scale-up text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-md animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Disparando via Pingram API...
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Enviando {pingramProgress.channel.toUpperCase()} para {pingramProgress.total} destinatário(s)
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full w-full animate-pulse" />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-mono space-y-1 max-h-32 overflow-y-auto">
              {pingramProgress.log.map((line, idx) => (
                <div key={idx}>• {line}</div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 text-center font-medium">
              Aguarde enquanto os servidores do Pingram concluem as entregas.
            </p>
          </div>
        </div>
      )}

      {/* Modal de Configuração do Pingram do CLA */}
      <PingramConfigModal
        isOpen={isPingramModalOpen}
        onClose={() => setIsPingramModalOpen(false)}
        claId={claId}
        onConfigSaved={(cfg) => {
          setPingramConfig(cfg);
          setSuccessBanner("Credenciais do Pingram salvas e validadas para este CLA!");
          setTimeout(() => setSuccessBanner(""), 4000);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT MESSAGE TEMPLATE */}
      {/* ========================================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-white dark:bg-[#0c1220] max-w-xl w-full rounded-2xl border-2 border-emerald-500/40 p-6 space-y-5 shadow-2xl animate-scale-up text-left">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 text-left">
              <div>
                <h3 className="font-display font-black text-base text-slate-900 dark:text-white text-left">
                  {editingTemplateId ? "Editar Modelo de Mensagem" : "Criar Novo Modelo de Mensagem"}
                </h3>
                <p className="text-xs text-slate-500 text-left">
                  Defina o título, canal recomendado, assunto e o corpo com tags dinâmicas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 text-left">
                  Título Identificador do Modelo *
                </label>
                <input
                  type="text"
                  value={tplFormTitle}
                  onChange={(e) => setTplFormTitle(e.target.value)}
                  placeholder="Ex: Convocação Fiscal de Corredor"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-bold text-left"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 text-left">
                    Canal Recomendado *
                  </label>
                  <select
                    value={tplFormChannel}
                    onChange={(e) => setTplFormChannel(e.target.value as any)}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-bold text-left"
                  >
                    <option value="whatsapp">WhatsApp 1-Clique</option>
                    <option value="calangus">CalanguS (Caixa Interna)</option>
                    <option value="email">E-mail Oficial</option>
                    <option value="sms">SMS Celular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 text-left">
                    Assunto / Título *
                  </label>
                  <input
                    type="text"
                    value={tplFormSubject}
                    onChange={(e) => setTplFormSubject(e.target.value)}
                    placeholder="Ex: Convocação ENEM"
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-bold text-left"
                    required
                  />
                </div>
              </div>

              <div className="text-left">
                <div className="flex items-center justify-between mb-1.5 text-left">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 text-left">
                    Corpo da Mensagem *
                  </label>
                  <div className="flex items-center gap-1 flex-wrap text-left">
                    <span className="text-[9px] text-slate-400">Inserir:</span>
                    {["{nome}", "{funcao}", "{sala}", "{predio}", "{horario}"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleInsertTag(tag, true)}
                        className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 rounded cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={tplFormBody}
                  onChange={(e) => setTplFormBody(e.target.value)}
                  rows={5}
                  placeholder="Olá {nome}, você foi convocado para a função {funcao} no prédio {predio}..."
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-white text-xs font-medium font-sans leading-relaxed text-left"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-3d py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editingTemplateId ? "Salvar Alterações" : "Criar Modelo"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
