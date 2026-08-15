import React, { useState, useMemo } from "react";
import { 
  Mail, MessageSquare, Send, Phone, CheckCircle2, Clock, 
  Users, UserCheck, AlertTriangle, Sparkles, Copy, Check, 
  Search, Filter, ExternalLink, RefreshCw, Layers, ShieldCheck, 
  FileText, ArrowRight, MessageCircle, Info
} from "lucide-react";
import { BuildingInfo, CollaboratorInfo } from "../types";

export interface SentMessageLog {
  id: string;
  sentAt: string;
  senderName: string;
  senderRole: string;
  channel: "email" | "calangus" | "whatsapp";
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
}

export default function MessagingCenter({
  collaborators = [],
  building,
  currentUserName = "Coordenador de Local",
  currentUserRole = "CLA",
  claId = ""
}: MessagingCenterProps) {
  // Navigation tabs inside Messaging
  const [activeTab, setActiveTab] = useState<"compose" | "history" | "templates">("compose");

  // Composition State
  const [channel, setChannel] = useState<"whatsapp" | "email" | "calangus">("whatsapp");
  const [targetType, setTargetType] = useState<"individual" | "group">("group");
  
  // Group Target Filter
  const [groupFilter, setGroupFilter] = useState<
    "all" | "confirmed_presence" | "pending_presence" | "reserves" | "with_errors" | "assigned"
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

  // Quick Templates List
  const QUICK_TEMPLATES = [
    {
      id: "convocacao_geral",
      title: "Convocação & Confirmação de Presença",
      channel: "whatsapp" as const,
      subject: "Convocação Oficial para Atuação no ENEM",
      body: "Olá, {nome}! Você foi convocado(a) para atuar como {funcao} no ENEM no local {predio}. Por favor, acesse o sistema CalanguS e confirme sua presença imediatamente."
    },
    {
      id: "lembrete_horario",
      title: "Lembrete de Horário e Apresentação",
      channel: "whatsapp" as const,
      subject: "Horário de Apresentação e Acesso ao Prédio",
      body: "Atenção {nome}: A apresentação de toda a equipe no dia da prova ocorrerá pontualmente às 11h00 no prédio {predio}. Traga documento oficial com foto e caneta preta em tubo transparente."
    },
    {
      id: "reserva_orientacao",
      title: "Orientações para Fiscais da Reserva",
      channel: "whatsapp" as const,
      subject: "Orientações - Fiscais da Reserva ENEM",
      body: "Olá {nome}! Você está escalado(a) na Reserva Estratégica do ENEM no prédio {predio}. Sua presença é obrigatória a partir das 11h00 para suprir eventuais remanejamentos e garantir o funcionamento das salas."
    },
    {
      id: "ajuste_orion",
      title: "Regularização de Inconsistência Cadastral (Orion)",
      channel: "email" as const,
      subject: "URGENTE: Regularização Cadastral ENEM",
      body: "Prezado(a) {nome}, identificamos uma pendência no seu cadastro (CPF: {cpf}) no sistema do ENEM. Solicitamos que acesse o portal do colaborador ou entre em contato com a coordenação para regularizar sua situação."
    }
  ];

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

  // Extract distinct roles for filter
  const distinctRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    collaborators.forEach(c => {
      if (c.assignedRole) rolesSet.add(c.assignedRole);
      if (c.specialRole) rolesSet.add(c.specialRole);
    });
    return Array.from(rolesSet);
  }, [collaborators]);

  // Compute targeted recipients list
  const targetedRecipients = useMemo(() => {
    if (targetType === "individual") {
      const single = collaborators.find(c => c.id === selectedCollabId);
      return single ? [single] : [];
    }

    return collaborators.filter(c => {
      if (c.status === "Recusado") return false;

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
  }, [collaborators, targetType, selectedCollabId, groupFilter, roleFilter]);

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
    // If lacks country code 55, add it
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  // Apply a template
  const handleApplyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setChannel(tpl.channel);
    setSubject(tpl.subject);
    setMessageBody(tpl.body);
    setActiveTab("compose");
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

    const newLog: SentMessageLog = {
      id: `msg-${Date.now()}`,
      sentAt: new Date().toLocaleString("pt-BR"),
      senderName: currentUserName,
      senderRole: currentUserRole,
      channel: channel,
      targetType: targetType,
      targetSummary: targetType === "individual" 
        ? targetedRecipients[0]?.name || "Colaborador Individual"
        : `Grupo: ${groupFilter === "all" ? "Todos os Fiscais" : groupFilter} (${targetedRecipients.length} pessoas)`,
      recipientCount: targetedRecipients.length,
      subject: subject,
      body: messageBody
    };

    const updated = [newLog, ...sentLogs];
    setSentLogs(updated);
    localStorage.setItem("enem_sent_messages_log", JSON.stringify(updated));

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
        const mailtoUrl = `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msgText)}`;
        window.open(mailtoUrl, "_blank");
      }
    }

    setSuccessBanner(`Mensagem processada com sucesso para ${targetedRecipients.length} colaborador(es)!`);
    setTimeout(() => setSuccessBanner(""), 4000);
  };

  // Copy rendered message for an individual in queue
  const handleCopyRendered = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
                <span>Central de Comunicação & Mensagens</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  WHATSAPP & E-MAIL
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Envio direto de comunicados para colaboradores individuais ou grupos com suporte a WhatsApp 1-Clique, E-mail e CalanguS.
              </p>
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
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
            onClick={() => setActiveTab("templates")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "templates"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Modelos Prontos</span>
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
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMPOSE MESSAGE */}
      {/* ========================================================================= */}
      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT 2 COLS: COMPOSITION WORKSPACE */}
          <div className="lg:col-span-2 space-y-5 bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20">
            
            {/* CHANNEL SELECTOR */}
            <div>
              <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                1. Selecione o Canal de Comunicação
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel("whatsapp")}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    channel === "whatsapp"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  <span>WhatsApp 1-Clique</span>
                  <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400">Direto no WhatsApp Web / App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    channel === "email"
                      ? "bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <Mail className="w-5 h-5 text-sky-500" />
                  <span>E-mail Oficial</span>
                  <span className="text-[9px] font-normal text-sky-600 dark:text-sky-400">Template formal ENEM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel("calangus")}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    channel === "calangus"
                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <span>Aviso no CalanguS</span>
                  <span className="text-[9px] font-normal text-indigo-600 dark:text-indigo-400">No feed do colaborador</span>
                </button>
              </div>
            </div>

            {/* TARGET SELECTION */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400">
                2. Destinatários da Mensagem
              </label>
              
              <div className="flex items-center gap-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Filtrar por Condição
                    </label>
                    <select
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value as any)}
                      className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-[#101726] text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">Todos os Colaboradores Aprovados</option>
                      <option value="confirmed_presence">Presença Confirmada (Efetivos)</option>
                      <option value="pending_presence">Pendentes de Confirmar Presença</option>
                      <option value="reserves">Fiscais da Reserva</option>
                      <option value="assigned">Fiscais com Função e Sala Atribuídas</option>
                      <option value="with_errors">Com Inconsistência Cadastral / Orion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Filtrar por Função
                    </label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-[#101726] text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">Todas as Funções</option>
                      {distinctRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* INDIVIDUAL SELECTION */}
              {targetType === "individual" && (
                <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
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

                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {collaborators
                      .filter(c => {
                        if (!searchCollabText) return true;
                        const q = searchCollabText.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.cpf.includes(q) ||
                          c.email.toLowerCase().includes(q)
                        );
                      })
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCollabId(c.id!)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                            selectedCollabId === c.id
                              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40"
                              : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div>
                            <div>{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {c.assignedRole || c.specialRole || "Sem Função"} • Tel: {c.whatsapp || "Sem tel"}
                            </div>
                          </div>
                          {selectedCollabId === c.id && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* SUBJECT FIELD (FOR EMAIL OR NOTIFICATIONS) */}
            {channel !== "whatsapp" && (
              <div>
                <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">
                  3. Assunto / Título da Mensagem
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Convocação Oficial ENEM"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* MESSAGE BODY WITH DYNAMIC TAGS */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                  {channel === "whatsapp" ? "3." : "4."} Mensagem & Tags Dinâmicas
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {messageBody.length} caracteres
                </span>
              </div>

              {/* QUICK TAG BUTTONS */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span className="text-[9px] uppercase font-bold text-slate-400">Inserir tag:</span>
                {[
                  { tag: "{nome}", label: "Nome Completo" },
                  { tag: "{primeiro_nome}", label: "1º Nome" },
                  { tag: "{funcao}", label: "Função" },
                  { tag: "{sala}", label: "Sala" },
                  { tag: "{predio}", label: "Nome do Prédio" },
                  { tag: "{horario}", label: "Horário (11h)" }
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => setMessageBody(prev => `${prev} ${item.tag}`)}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    + {item.tag}
                  </button>
                ))}
              </div>

              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Digite o texto da mensagem..."
              />
            </div>

            {/* SEND / DISPATCH ACTION BUTTON */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Destinatários: <strong className="text-slate-900 dark:text-white">{targetedRecipients.length} selecionado(s)</strong>
              </div>

              <button
                type="button"
                onClick={handleDispatchMessage}
                disabled={targetedRecipients.length === 0}
                className={`btn-3d px-6 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2 cursor-pointer ${
                  targetedRecipients.length === 0
                    ? "bg-slate-400 text-white cursor-not-allowed"
                    : channel === "whatsapp"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {channel === "whatsapp" 
                    ? targetType === "individual" ? "ABRIR CONVERSA NO WHATSAPP" : "GERAR FILA DE DISPARO WHATSAPP" 
                    : "DISPARAR MENSAGENS"}
                </span>
              </button>
            </div>

          </div>

          {/* RIGHT 1 COL: INTERACTIVE DISPATCH QUEUE / PREVIEW */}
          <div className="space-y-4">
            
            <div className="bg-slate-50 dark:bg-[#070b13]/80 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-2 mb-3">
                <h3 className="text-xs font-display font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Fila de Disparo ({targetedRecipients.length})</span>
                </h3>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full">
                  1-CLIQUE
                </span>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {targetedRecipients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    Nenhum colaborador encontrado para os filtros selecionados.
                  </div>
                ) : (
                  targetedRecipients.map((recip, idx) => {
                    const previewText = formatMessageForCollab(messageBody, recip);
                    const waPhone = recip.whatsapp;
                    const waUrl = waPhone ? getWhatsAppUrl(waPhone, previewText) : "";

                    return (
                      <div
                        key={recip.id || idx}
                        className="p-3 bg-white dark:bg-[#0c1220] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500/40 transition shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {recip.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {recip.assignedRole || "Reserva"} • {recip.assignedRoom || "Sem Sala"}
                            </div>
                          </div>

                          {channel === "whatsapp" && waPhone ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0 shadow-xs transition"
                              title="Abrir WhatsApp direto com este colaborador"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Enviar</span>
                            </a>
                          ) : channel === "email" && recip.email ? (
                            <a
                              href={`mailto:${recip.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(previewText)}`}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0 shadow-xs transition"
                            >
                              <Mail className="w-3 h-3" />
                              <span>E-mail</span>
                            </a>
                          ) : (
                            <span className="text-[9px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                              Sem contato
                            </span>
                          )}
                        </div>

                        {/* PREVIEW BOX */}
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-[11px] font-sans text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-800">
                          {previewText}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
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
            <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider">
                <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Viabilidade Técnica do WhatsApp</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                ✅ <strong>Envio 100% Viável & Gratuito:</strong> O sistema utiliza links diretos <code>wa.me</code> pré-formatados com os dados do fiscal. Permite disparar para centenas de colaboradores sem custos com APIs do WhatsApp Business e sem risco de banimento de número por spam.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUICK TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 space-y-4">
          <div className="border-b-2 border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-display font-black text-slate-850 dark:text-white uppercase tracking-wider">
              Modelos Rápidos de Convocação & Mensagens
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Selecione um modelo para carregar no editor e personalizar para o seu local de aplicação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUICK_TEMPLATES.map(tpl => (
              <div
                key={tpl.id}
                className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border-2 border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {tpl.title}
                  </span>
                  <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {tpl.channel.toUpperCase()}
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Assunto: {tpl.subject}
                </div>

                <div className="p-2.5 bg-white dark:bg-[#0c1220] rounded-lg text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200 dark:border-slate-800">
                  {tpl.body}
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Usar Este Modelo</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MESSAGE HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#10b981]/20 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-display font-black text-slate-850 dark:text-white uppercase tracking-wider">
                Histórico de Mensagens Enviadas
              </h3>
              <p className="text-xs text-slate-500 font-medium">
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
            <div className="space-y-3">
              {sentLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-900 dark:text-white">
                      {log.subject || "Sem Assunto"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.sentAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Canal: <strong className="uppercase text-slate-800 dark:text-slate-200">{log.channel}</strong></span>
                    <span>•</span>
                    <span>Destinatários: <strong className="text-slate-800 dark:text-slate-200">{log.targetSummary}</strong></span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-[#0c1220] rounded-lg text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-sans">
                    {log.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
