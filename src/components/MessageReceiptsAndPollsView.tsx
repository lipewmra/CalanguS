import React, { useState, useMemo } from "react";
import { 
  CheckCircle2, Clock, Users, BarChart3, HelpCircle, Send, 
  RefreshCw, Download, Filter, Check, Copy, Search, MessageSquare, 
  AlertCircle, Vote, FileText, Sparkles, ChevronRight, Eye, 
  Smartphone, Mail, MessageCircle, ArrowRight, Printer, Share2,
  ThumbsUp, ThumbsDown, UserCheck, UserX, ChevronDown, Trash2
} from "lucide-react";
import { BuildingInfo, CollaboratorInfo, CalangusMessage, MessageCollaboratorResponse, MessageReadReceipt } from "../types";
import { formatBrazilianPhone } from "../utils/pingramConfig";

interface MessageReceiptsAndPollsViewProps {
  messages: CalangusMessage[];
  collaborators: CollaboratorInfo[];
  building: BuildingInfo | null;
  currentUserName?: string;
  claId?: string;
  onSaveBuilding?: (updatedBuilding: BuildingInfo) => Promise<void> | void;
  onResetAllMessages?: () => Promise<void> | void;
  onDeleteMessage?: (messageId: string) => Promise<void> | void;
  onComposeNewWithTarget?: (targetCollabIds: string[], defaultSubject?: string, defaultBody?: string) => void;
}

export default function MessageReceiptsAndPollsView({
  messages = [],
  collaborators = [],
  building,
  currentUserName = "CLA",
  claId = "",
  onSaveBuilding,
  onResetAllMessages,
  onDeleteMessage,
  onComposeNewWithTarget
}: MessageReceiptsAndPollsViewProps) {
  // Select which message to inspect
  const [selectedMessageId, setSelectedMessageId] = useState<string>(() => {
    return messages.length > 0 ? messages[0].id : "";
  });

  // Table filter & search
  const [statusFilter, setStatusFilter] = useState<"all" | "read" | "unread" | "answered" | "unanswered">("all");
  const [selectedPollOptionFilter, setSelectedPollOptionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedPhones, setCopiedPhones] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  // Sync selected message if list changes and current is invalid
  const currentMessage = useMemo(() => {
    return messages.find(m => m.id === selectedMessageId) || (messages.length > 0 ? messages[0] : null);
  }, [messages, selectedMessageId]);

  // Compute targeted collaborators for the current message
  const targetedCollaborators = useMemo(() => {
    if (!currentMessage) return [];

    return collaborators.filter(collab => {
      // 1. If explicit recipient IDs were saved
      if (currentMessage.targetRecipientIds && currentMessage.targetRecipientIds.length > 0) {
        return currentMessage.targetRecipientIds.includes(collab.id);
      }

      // 2. Individual target
      if (currentMessage.targetType === "individual") {
        return (
          collab.id === currentMessage.targetCollaboratorId ||
          (currentMessage.targetCollaboratorEmail && collab.email && collab.email.toLowerCase() === currentMessage.targetCollaboratorEmail.toLowerCase()) ||
          (currentMessage.targetCollaboratorPhone && collab.whatsapp && collab.whatsapp.replace(/\D/g, "") === currentMessage.targetCollaboratorPhone.replace(/\D/g, ""))
        );
      }

      // 3. Role target
      if (currentMessage.targetType === "role") {
        const role = collab.assignedRole || collab.specialRole || "";
        return role === currentMessage.targetRoleId || role === currentMessage.targetRoleName;
      }

      // 4. Reserve target
      if (currentMessage.targetType === "reserve") {
        return Boolean(collab.isReserve);
      }

      // 5. Attendance confirmed / pending
      if (currentMessage.targetType === "confirmed_attendance") {
        return collab.attendanceStatus === "Confirmado";
      }
      if (currentMessage.targetType === "pending_attendance") {
        return collab.attendanceStatus !== "Confirmado";
      }

      // 6. Associated with room
      if (currentMessage.targetType === "associated") {
        return Boolean(collab.assignedRoom);
      }

      // Default: all collaborators in the building
      return true;
    });
  }, [currentMessage, collaborators]);

  // Read receipts and responses map
  const receiptsMap = useMemo(() => {
    const map = new Map<string, MessageReadReceipt>();
    if (!currentMessage) return map;

    // From structured readReceipts array
    (currentMessage.readReceipts || []).forEach(r => {
      if (r.collaboratorId) map.set(r.collaboratorId, r);
      if (r.collaboratorCpf) map.set(r.collaboratorCpf.replace(/\D/g, ""), r);
      if (r.collaboratorEmail) map.set(r.collaboratorEmail.toLowerCase(), r);
    });

    // Also legacy readBy array
    (currentMessage.readBy || []).forEach(id => {
      if (!map.has(id)) {
        map.set(id, {
          collaboratorId: id,
          readAt: currentMessage.sentAt || new Date().toISOString()
        });
      }
    });

    return map;
  }, [currentMessage]);

  const responsesMap = useMemo(() => {
    const map = new Map<string, MessageCollaboratorResponse>();
    if (!currentMessage || !currentMessage.responses) return map;

    currentMessage.responses.forEach(resp => {
      if (resp.collaboratorId) map.set(resp.collaboratorId, resp);
      if (resp.collaboratorCpf) map.set(resp.collaboratorCpf.replace(/\D/g, ""), resp);
      if (resp.collaboratorEmail) map.set(resp.collaboratorEmail.toLowerCase(), resp);
    });

    return map;
  }, [currentMessage]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = targetedCollaborators.length;
    let readCount = 0;
    let answeredCount = 0;

    targetedCollaborators.forEach(collab => {
      const isRead = 
        receiptsMap.has(collab.id) || 
        (collab.cpf && receiptsMap.has(collab.cpf.replace(/\D/g, ""))) || 
        (collab.email && receiptsMap.has(collab.email.toLowerCase()));

      const hasAnswer = 
        responsesMap.has(collab.id) || 
        (collab.cpf && responsesMap.has(collab.cpf.replace(/\D/g, ""))) || 
        (collab.email && responsesMap.has(collab.email.toLowerCase()));

      if (isRead || hasAnswer) readCount++;
      if (hasAnswer) answeredCount++;
    });

    const unreadCount = Math.max(0, total - readCount);
    const readPercentage = total > 0 ? Math.round((readCount / total) * 100) : 0;
    const answerPercentage = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    // Poll options distribution
    const pollDistribution: Record<string, { text: string; count: number; percentage: number }> = {};
    if (currentMessage?.poll && currentMessage.poll.options) {
      currentMessage.poll.options.forEach(opt => {
        pollDistribution[opt.id] = { text: opt.text, count: 0, percentage: 0 };
      });

      responsesMap.forEach(resp => {
        (resp.selectedOptionIds || []).forEach(optId => {
          if (pollDistribution[optId]) {
            pollDistribution[optId].count++;
          }
        });
      });

      const totalResponses = currentMessage.responses?.length || 0;
      Object.keys(pollDistribution).forEach(optId => {
        pollDistribution[optId].percentage = totalResponses > 0 
          ? Math.round((pollDistribution[optId].count / totalResponses) * 100) 
          : 0;
      });
    }

    return {
      total,
      readCount,
      unreadCount,
      readPercentage,
      answeredCount,
      answerPercentage,
      pollDistribution
    };
  }, [targetedCollaborators, receiptsMap, responsesMap, currentMessage]);

  // Filtered list of collaborators for table
  const filteredCollaboratorRows = useMemo(() => {
    return targetedCollaborators.filter(collab => {
      const isRead = 
        receiptsMap.has(collab.id) || 
        (collab.cpf && receiptsMap.has(collab.cpf.replace(/\D/g, ""))) || 
        (collab.email && receiptsMap.has(collab.email.toLowerCase()));

      const resp = 
        responsesMap.get(collab.id) || 
        (collab.cpf ? responsesMap.get(collab.cpf.replace(/\D/g, "")) : undefined) || 
        (collab.email ? responsesMap.get(collab.email.toLowerCase()) : undefined);

      const hasAnswer = Boolean(resp);

      // Status Filter
      if (statusFilter === "read" && !isRead && !hasAnswer) return false;
      if (statusFilter === "unread" && (isRead || hasAnswer)) return false;
      if (statusFilter === "answered" && !hasAnswer) return false;
      if (statusFilter === "unanswered" && hasAnswer) return false;

      // Option Filter
      if (selectedPollOptionFilter !== "all") {
        if (!resp || !resp.selectedOptionIds || !resp.selectedOptionIds.includes(selectedPollOptionFilter)) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = collab.name?.toLowerCase().includes(query);
        const matchCpf = collab.cpf?.includes(query);
        const matchRole = (collab.assignedRole || collab.specialRole || "")?.toLowerCase().includes(query);
        const matchAnswer = resp?.selectedOptionTexts?.some(t => t.toLowerCase().includes(query)) || resp?.textAnswer?.toLowerCase().includes(query);
        if (!matchName && !matchCpf && !matchRole && !matchAnswer) return false;
      }

      return true;
    });
  }, [targetedCollaborators, receiptsMap, responsesMap, statusFilter, selectedPollOptionFilter, searchQuery]);

  // Unread collaborators list for reminders
  const unreadCollaborators = useMemo(() => {
    return targetedCollaborators.filter(collab => {
      const isRead = 
        receiptsMap.has(collab.id) || 
        (collab.cpf && receiptsMap.has(collab.cpf.replace(/\D/g, ""))) || 
        (collab.email && receiptsMap.has(collab.email.toLowerCase()));
      const hasAnswer = 
        responsesMap.has(collab.id) || 
        (collab.cpf && responsesMap.has(collab.cpf.replace(/\D/g, ""))) || 
        (collab.email && responsesMap.has(collab.email.toLowerCase()));
      return !isRead && !hasAnswer;
    });
  }, [targetedCollaborators, receiptsMap, responsesMap]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!currentMessage) return;

    const headers = [
      "Nome",
      "CPF",
      "Funcao",
      "Sala",
      "WhatsApp",
      "Email",
      "Status Leitura",
      "Data/Hora Leitura",
      "Resposta ao Questionamento",
      "Data/Hora Resposta"
    ];

    const rows = targetedCollaborators.map(c => {
      const receipt = 
        receiptsMap.get(c.id) || 
        (c.cpf ? receiptsMap.get(c.cpf.replace(/\D/g, "")) : undefined) || 
        (c.email ? receiptsMap.get(c.email.toLowerCase()) : undefined);

      const resp = 
        responsesMap.get(c.id) || 
        (c.cpf ? responsesMap.get(c.cpf.replace(/\D/g, "")) : undefined) || 
        (c.email ? responsesMap.get(c.email.toLowerCase()) : undefined);

      const isRead = Boolean(receipt || resp);
      const readAt = receipt?.readAt || resp?.answeredAt || "";
      const answerText = resp ? (resp.selectedOptionTexts?.join("; ") || resp.textAnswer || "Respondido") : "Sem resposta";
      const answeredAt = resp?.answeredAt || "";

      return [
        `"${c.name || ""}"`,
        `"${c.cpf || ""}"`,
        `"${c.assignedRole || c.specialRole || (c.isReserve ? "Reserva" : "Colaborador")}"`,
        `"${c.assignedRoom || "Não alocada"}"`,
        `"${c.whatsapp || ""}"`,
        `"${c.email || ""}"`,
        `"${isRead ? "Confirmado / Lido" : "Pendente"}"`,
        `"${readAt}"`,
        `"${answerText.replace(/"/g, '""')}"`,
        `"${answeredAt}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_leitura_respostas_${currentMessage.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActionSuccessMsg("Relatório CSV exportado com sucesso!");
    setTimeout(() => setActionSuccessMsg(""), 3500);
  };

  // Copy unread phones to clipboard
  const handleCopyUnreadPhones = () => {
    const phones = unreadCollaborators
      .map(c => c.whatsapp?.replace(/\D/g, ""))
      .filter(Boolean);

    if (phones.length === 0) {
      setActionSuccessMsg("Nenhum colaborador pendente de leitura com telefone cadastrado.");
      setTimeout(() => setActionSuccessMsg(""), 3000);
      return;
    }

    navigator.clipboard.writeText(phones.join("\n"));
    setCopiedPhones(true);
    setActionSuccessMsg(`${phones.length} telefones dos pendentes copiados para a área de transferência!`);
    setTimeout(() => {
      setCopiedPhones(false);
      setActionSuccessMsg("");
    }, 4000);
  };

  // Resend reminder trigger
  const handleResendReminder = () => {
    if (!currentMessage || unreadCollaborators.length === 0) {
      setActionSuccessMsg("Todos os destinatários já confirmaram leitura desta mensagem!");
      setTimeout(() => setActionSuccessMsg(""), 3500);
      return;
    }

    if (onComposeNewWithTarget) {
      const unreadIds = unreadCollaborators.map(c => c.id);
      const subject = `[LEMBRETE URGENTE] Leitura Pendente: ${currentMessage.title}`;
      const body = `Olá, {nome}! Notamos que você ainda não confirmou a leitura do comunicado oficial "${currentMessage.title}" enviado pela Coordenação do Prédio. Por favor, acesse o CalanguS agora para confirmar seu recebimento e responder eventuais questionamentos.`;
      onComposeNewWithTarget(unreadIds, subject, body);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhuma mensagem interna enviada ainda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Envie comunicados ou crie questionamentos interativos na aba <strong>"Enviar Mensagem"</strong> para acompanhar a taxa de leitura em tempo real e as escolhas dos colaboradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-sans">
      {/* SUCCESS NOTIFICATION TOAST */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* TOP BAR: MESSAGE SELECTOR & QUICK STATS */}
      <div className="bg-white dark:bg-[#101726] rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.03)] dark:shadow-[4px_4px_0px_0px_#10b981]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Eye className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Monitor de Confirmação de Leitura & Questionamentos
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhe quem já visualizou o comunicado no CalanguS e consulte as respostas dos questionamentos em tempo real.
            </p>
          </div>

          {/* MESSAGE SELECTOR DROPDOWN */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
              Comunicado:
            </label>
            <select
              id="message-monitor-selector"
              value={selectedMessageId}
              onChange={(e) => {
                setSelectedMessageId(e.target.value);
                setStatusFilter("all");
                setSelectedPollOptionFilter("all");
              }}
              className="bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 max-w-xs truncate cursor-pointer"
            >
              {messages.map(m => (
                <option key={m.id} value={m.id}>
                  {m.poll ? "📊 [Enquete] " : "✉️ "}{m.title || "Comunicado"} ({m.sentAt ? m.sentAt.split(" ")[0] : "Recente"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SELECTED MESSAGE SUMMARY BAR */}
        {currentMessage && (
          <div className="mt-4 pt-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {currentMessage.title}
                </h3>
                {currentMessage.poll && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Vote className="w-3 h-3" />
                    Questionamento Ativo
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-400">
                  Enviado em {currentMessage.sentAt} por {currentMessage.senderName}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-[#070b13]/80 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                "{currentMessage.content}"
              </p>
            </div>

            {/* ACTION BUTTONS: EXPORT, REMINDER */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-export-receipts-csv"
                onClick={handleExportCSV}
                className="btn-3d px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Exportar dados de confirmação em planilha CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                id="btn-copy-unread-phones"
                onClick={handleCopyUnreadPhones}
                className="btn-3d px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Copiar lista de telefones de quem não leu para contato"
              >
                {copiedPhones ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPhones ? "Copiados!" : "Copiar Telefones Pendentes"}</span>
              </button>

              {stats.unreadCount > 0 && onComposeNewWithTarget && (
                <button
                  type="button"
                  id="btn-resend-unread-reminder"
                  onClick={handleResendReminder}
                  className="btn-3d px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Reenviar lembrete para os colaboradores que não leram"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Cobrar Leitura ({stats.unreadCount})</span>
                </button>
              )}

              {onDeleteMessage && currentMessage && (
                <button
                  type="button"
                  id="btn-delete-current-message"
                  onClick={() => onDeleteMessage(currentMessage.id)}
                  className="btn-3d px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border border-rose-500/20"
                  title="Excluir este comunicado do painel"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Mensagem</span>
                </button>
              )}

              {onResetAllMessages && (
                <button
                  type="button"
                  id="btn-reset-messages-monitor"
                  onClick={onResetAllMessages}
                  className="btn-3d px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Resetar e apagar todas as mensagens enviadas aos colaboradores"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Resetar Todas</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL RECIPIENTS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101726] border-2 border-slate-200 dark:border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.03)] dark:shadow-[3px_3px_0px_0px_#10b981]/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Destinatários
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs text-slate-400">colaboradores</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">
            {currentMessage?.targetSummary || "Equipe do Prédio"}
          </p>
        </div>

        {/* CONFIRMED READS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101726] border-2 border-emerald-500/40 shadow-[3px_3px_0px_0px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Confirmaram Leitura
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.readCount}
            </span>
            <span className="text-xs font-bold text-emerald-600/80">
              ({stats.readPercentage}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.readPercentage}%` }}
            />
          </div>
        </div>

        {/* PENDING READS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101726] border-2 border-amber-500/30 shadow-[3px_3px_0px_0px_rgba(245,158,11,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pendentes de Leitura
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.unreadCount}
            </span>
            <span className="text-xs text-slate-400">
              ({100 - stats.readPercentage}%)
            </span>
          </div>
          <p className="mt-1 text-[10px] text-amber-600/80 font-bold">
            {stats.unreadCount === 0 ? "✓ Todos já leram" : "Requer atenção do CLA"}
          </p>
        </div>

        {/* POLL RESPONSES (IF APPLICABLE) OR ENGAGEMENT */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101726] border-2 border-purple-500/30 shadow-[3px_3px_0px_0px_rgba(168,85,247,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {currentMessage?.poll ? "Respostas à Enquete" : "Engajamento Geral"}
            </span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Vote className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {currentMessage?.poll ? stats.answeredCount : stats.readCount}
            </span>
            <span className="text-xs font-bold text-purple-600/80">
              ({currentMessage?.poll ? stats.answerPercentage : stats.readPercentage}%)
            </span>
          </div>
          <p className="mt-1 text-[10px] text-purple-600/80 font-bold">
            {currentMessage?.poll ? `${currentMessage.poll.type === "confirmation_yes_no" ? "Sim/Não" : "Opções registradas"}` : "Taxa de recebimento"}
          </p>
        </div>
      </div>

      {/* QUESTIONNAIRE / POLL VISUAL BREAKDOWN (IF MESSAGE HAS A POLL) */}
      {currentMessage?.poll && (
        <div className="bg-white dark:bg-[#101726] rounded-2xl border-2 border-purple-500/30 p-5 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Resultados do Questionamento do CLA
                </h3>
                <p className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
                  "{currentMessage.poll.question}"
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {stats.answeredCount} de {stats.total} responderam
            </span>
          </div>

          {/* POLL OPTIONS DISTRIBUTION BARS */}
          {currentMessage.poll.options && currentMessage.poll.options.length > 0 && (
            <div className="space-y-3 pt-1">
              {currentMessage.poll.options.map((opt, idx) => {
                const optStat = stats.pollDistribution[opt.id] || { text: opt.text, count: 0, percentage: 0 };
                const isSelectedForFilter = selectedPollOptionFilter === opt.id;

                return (
                  <div 
                    key={opt.id}
                    onClick={() => {
                      setSelectedPollOptionFilter(isSelectedForFilter ? "all" : opt.id);
                    }}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer ${
                      isSelectedForFilter 
                        ? "bg-purple-500/10 border-purple-500 dark:border-purple-400" 
                        : "bg-slate-50 dark:bg-[#070b13] border-slate-200 dark:border-slate-800 hover:border-purple-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {opt.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400">
                          {optStat.count} voto{optStat.count !== 1 ? "s" : ""}
                        </span>
                        <span className="font-extrabold text-purple-600 dark:text-purple-400">
                          {optStat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Visual bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 dark:bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${optStat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TEXT ANSWERS ACCORDION (IF TEXT POLL OR COMMENTS EXIST) */}
          {currentMessage.responses && currentMessage.responses.some(r => r.textAnswer) && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-500" />
                <span>Respostas em Texto / Observações Recebidas:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {currentMessage.responses.filter(r => r.textAnswer).map((r, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 dark:bg-[#070b13] rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">{r.collaboratorName || "Colaborador"}</span>
                      <span>{r.answeredAt ? r.answeredAt.split(" ")[0] : ""}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 italic">
                      "{r.textAnswer}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILED RECIPIENTS & CONFIRMATIONS TABLE */}
      <div className="bg-white dark:bg-[#101726] rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.03)] dark:shadow-[4px_4px_0px_0px_#10b981]/5 overflow-hidden">
        
        {/* TABLE CONTROLS HEADER */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Filtrar por Status:
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Todos ({targetedCollaborators.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("read")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "read"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmados ({stats.readCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("unread")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "unread"
                    ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pendentes ({stats.unreadCount})</span>
              </button>

              {currentMessage?.poll && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("answered")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === "answered"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                  }`}
                >
                  <Vote className="w-3.5 h-3.5" />
                  <span>Com Resposta ({stats.answeredCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, sala ou resposta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* ACTIVE POLL OPTION FILTER BADGE */}
        {selectedPollOptionFilter !== "all" && (
          <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-bold">
            <span>
              Filtrando apenas colaboradores que responderam a opção selecionada acima.
            </span>
            <button
              type="button"
              onClick={() => setSelectedPollOptionFilter("all")}
              className="text-[11px] underline cursor-pointer hover:text-purple-900"
            >
              Limpar Filtro de Opção
            </button>
          </div>
        )}

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#070b13] text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-3">Função / Sala</th>
                <th className="py-3 px-3">Status de Leitura</th>
                {currentMessage?.poll && (
                  <th className="py-3 px-3">Resposta à Enquete</th>
                )}
                <th className="py-3 px-3 text-right">Contato Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredCollaboratorRows.length === 0 ? (
                <tr>
                  <td colSpan={currentMessage?.poll ? 5 : 4} className="py-10 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCollaboratorRows.map((collab) => {
                  const receipt = 
                    receiptsMap.get(collab.id) || 
                    (collab.cpf ? receiptsMap.get(collab.cpf.replace(/\D/g, "")) : undefined) || 
                    (collab.email ? receiptsMap.get(collab.email.toLowerCase()) : undefined);

                  const resp = 
                    responsesMap.get(collab.id) || 
                    (collab.cpf ? responsesMap.get(collab.cpf.replace(/\D/g, "")) : undefined) || 
                    (collab.email ? responsesMap.get(collab.email.toLowerCase()) : undefined);

                  const isRead = Boolean(receipt || resp);
                  const readTimestamp = receipt?.readAt || resp?.answeredAt;

                  return (
                    <tr 
                      key={collab.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition ${
                        !isRead ? "bg-amber-500/[0.02]" : ""
                      }`}
                    >
                      {/* COLLABORATOR INFO */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {collab.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>CPF: {collab.cpf || "Não inf."}</span>
                          {collab.email && <span className="truncate max-w-[140px]">{collab.email}</span>}
                        </div>
                      </td>

                      {/* ROLE & ROOM */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          {collab.assignedRole || collab.specialRole || (collab.isReserve ? "Fiscal de Reserva" : "Colaborador")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {collab.assignedRoom ? `Sala: ${collab.assignedRoom}` : "Sem sala alocada"}
                        </span>
                      </td>

                      {/* READ STATUS */}
                      <td className="py-3 px-3">
                        {isRead ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <div>
                              <span>Confirmado / Lido</span>
                              {readTimestamp && (
                                <span className="block text-[9px] text-slate-400 font-mono font-normal">
                                  {readTimestamp.includes("T") 
                                    ? new Date(readTimestamp).toLocaleString("pt-BR") 
                                    : readTimestamp}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>Pendente de Leitura</span>
                          </div>
                        )}
                      </td>

                      {/* POLL ANSWER (IF APPLICABLE) */}
                      {currentMessage?.poll && (
                        <td className="py-3 px-3">
                          {resp ? (
                            <div className="space-y-1">
                              {resp.selectedOptionTexts && resp.selectedOptionTexts.length > 0 ? (
                                resp.selectedOptionTexts.map((text, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-extrabold border border-purple-500/20 text-[10px]"
                                  >
                                    <Vote className="w-2.5 h-2.5" />
                                    {text}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                  Respondido
                                </span>
                              )}
                              {resp.textAnswer && (
                                <p className="text-[10px] text-slate-600 dark:text-slate-300 italic line-clamp-1">
                                  "{resp.textAnswer}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Não respondeu ainda
                            </span>
                          )}
                        </td>
                      )}

                      {/* QUICK ACTION CONTACT */}
                      <td className="py-3 px-3 text-right">
                        {collab.whatsapp ? (
                          <a
                            href={`https://wa.me/55${collab.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Olá ${collab.name}, aqui é ${currentUserName} (CLA ENEM). Favor acessar seu painel CalanguS para confirmar a leitura do comunicado "${currentMessage.title}".`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] transition"
                            title="Enviar mensagem direta de cobrança no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sem tel.</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
