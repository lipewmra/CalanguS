import React, { useEffect } from "react";
import { 
  X, ZoomIn, Download, User, Shield, Building2, Award, Sparkles, 
  Clock, CheckCircle2, Phone, Mail, CreditCard, UserCheck, 
  AlertCircle, Check, DoorOpen, History, Layers, MessageCircle, BookOpen
} from "lucide-react";
import { getInitials } from "../lib/image-utils";
import { PastEdition, MaterialAccessLog } from "../types";

export interface LightboxData {
  imageUrl: string;
  name: string;
  role?: string;
  cpf?: string;
  claName?: string;
  originalClaName?: string;
  education?: string;
  specialRole?: string;
  hasWorkedEnem?: boolean;
  pastEditions?: PastEdition[];
  email?: string;
  whatsapp?: string;
  birthDate?: string;
  disability?: string;
  languages?: string[];
  pixKey?: string;
  referencePerson?: string;
  assignedRoom?: string;
  status?: string;
  attendanceStatus?: string;
  refusedRole?: string;
  refusalTag?: string;
  createdAt?: string;
  isExternalRecruit?: boolean;
  paymentValue?: string;
  materialsAccessed?: MaterialAccessLog[];
  transferHistory?: Array<{
    fromClaId: string;
    fromClaName: string;
    toClaId: string;
    toClaName: string;
    date: string;
    approvedBy?: string;
  }>;
}

interface ImageLightboxModalProps {
  data: LightboxData | null;
  onClose: () => void;
}

export default function ImageLightboxModal({ data, onClose }: ImageLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (data) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [data, onClose]);

  if (!data) return null;

  const handleDownload = () => {
    if (!data.imageUrl) return;
    const a = document.createElement("a");
    a.href = data.imageUrl;
    a.download = `foto_${(data.name || "fiscal").replace(/\s+/g, "_").toLowerCase()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cleanPhone = data.whatsapp ? data.whatsapp.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone.length <= 11 ? cleanPhone : cleanPhone}` : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#080d1a]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Ficha Completa do Colaborador
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">Identificação e dados cadastrais no ENEM</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Header Row: Photo + Main Header Summary */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800/80 rounded-2xl">
            {/* Photo Avatar / Full photo */}
            <div className="relative group shrink-0">
              {data.imageUrl ? (
                <img
                  src={data.imageUrl}
                  alt={data.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-2xl border-4 border-white dark:border-slate-800 shadow-lg ring-2 ring-indigo-500/30"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex flex-col items-center justify-center font-black text-3xl shadow-lg ring-2 ring-indigo-500/30">
                  <span>{getInitials(data.name)}</span>
                  <span className="text-[9px] uppercase font-medium mt-1 opacity-75">Sem foto</span>
                </div>
              )}
            </div>

            {/* Name + Badges */}
            <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                  {data.role || "Fiscal Reserva"}
                </span>
                {data.paymentValue && (
                  <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {data.paymentValue}
                  </span>
                )}
                {data.status && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                    data.status === "Confirmado" 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : data.status === "Pendente" 
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  }`}>
                    {data.status.toUpperCase()}
                  </span>
                )}
                {data.isExternalRecruit && (
                  <span className="text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono font-black border border-teal-500/20 px-2 py-0.5 rounded-md">
                    RECRUTAMENTO EXTERNO
                  </span>
                )}
              </div>

              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {data.name}
              </h2>

              {data.cpf && (
                <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  CPF: {data.cpf}
                </p>
              )}

              {data.assignedRoom && (
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Alocado na {data.assignedRoom}</span>
                </div>
              )}
            </div>
          </div>

          {/* Key Attribute Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Indicação / Referência */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Indicação / Pessoa de Referência</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                {data.referencePerson || <span className="text-slate-400 font-normal">Nenhuma indicação informada (Inscrição direta)</span>}
              </div>
            </div>

            {/* Escolaridade & PCD */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Escolaridade & Acessibilidade</span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {data.education || "Ensino Médio"}
                {data.disability && data.disability !== "Nenhuma" && (
                  <span className="block text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-0.5">
                    PCD: {data.disability}
                  </span>
                )}
              </div>
            </div>

            {/* Contatos */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
              <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-500" />
                <span>Contatos & Comunicação</span>
              </div>
              <div className="space-y-1 text-xs font-medium">
                {data.whatsapp ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{data.whatsapp}</span>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Conversar no WhatsApp</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">Telefone não informado</span>
                )}
                {data.email && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate" title={data.email}>
                    {data.email}
                  </div>
                )}
              </div>
            </div>

            {/* Pagamento / Chave PIX */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Chave PIX Cadastrada</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                {data.pixKey ? data.pixKey : <span className="text-slate-400 font-sans font-normal">Chave PIX não cadastrada</span>}
              </div>
            </div>
          </div>

          {/* Perfil Especial e Idiomas */}
          {(data.specialRole && data.specialRole !== "Nenhuma") && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
              <div className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>Perfil Especial / Idiomas</span>
              </div>
              <div className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                {data.specialRole}
                {data.languages && data.languages.length > 0 && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 block font-bold mt-0.5">
                    Idiomas: {data.languages.join(", ")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Atuação Anterior no ENEM */}
          <div className="p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Histórico de Atuação no ENEM</span>
              </div>
              {data.pastEditions && data.pastEditions.length > 0 && (
                <span className="text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {data.pastEditions.length} {data.pastEditions.length === 1 ? "edição realizada" : "edições realizadas"}
                </span>
              )}
            </div>

            {data.pastEditions && data.pastEditions.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {data.pastEditions.map((pe, idx) => (
                  <div 
                    key={idx}
                    className="p-2 bg-white dark:bg-[#101726] rounded-xl border border-amber-500/30 flex items-center gap-2"
                  >
                    <span className="font-black font-mono text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded text-xs">
                      {pe.year}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {pe.role || "Fiscal"}
                    </span>
                  </div>
                ))}
              </div>
            ) : data.hasWorkedEnem ? (
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ✓ Possui experiência prévia em edições anteriores do ENEM.
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                Primeira participação / Sem histórico de edições anteriores no ENEM.
              </p>
            )}
          </div>

          {/* Local de Origem / Histórico de Transferência de CLA */}
          <div className="p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Origem e Histórico de Transferências</span>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">CLA Atual:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{data.claName || "Coordenação Local"}</span>
              </div>
              {data.originalClaName && data.originalClaName !== data.claName && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">CLA de Cadastro Inicial:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{data.originalClaName}</span>
                </div>
              )}
            </div>

            {data.transferHistory && data.transferHistory.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Registros de Transferência entre Locais:</span>
                {data.transferHistory.map((th, i) => (
                  <div key={i} className="text-[11px] p-2 bg-indigo-500/10 rounded-lg text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2 font-medium">
                    <span>De <strong>{th.fromClaName}</strong> ➔ Para <strong>{th.toClaName}</strong></span>
                    <span className="text-[10px] font-mono text-slate-400">{new Date(th.date).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materiais Didáticos e de Apoio Acessados */}
          <div className="p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Material de Apoio e Capacitação Acessado</span>
              </div>
              {data.materialsAccessed && data.materialsAccessed.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {data.materialsAccessed.length} acessado(s)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500">
                  Nenhum registro ainda
                </span>
              )}
            </div>

            {data.materialsAccessed && data.materialsAccessed.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {data.materialsAccessed.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-white truncate">{item.materialTitle}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {new Date(item.accessedAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                O colaborador ainda não registrou o acesso aos materiais didáticos de apoio nesta edição.
              </p>
            )}
          </div>

          {/* Recusas ou Avisos de Função */}
          {(data.refusedRole || data.refusalTag) && (
            <div className="p-3.5 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-rose-800 dark:text-rose-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{data.refusalTag || `Recusa de trabalho na função ${data.refusedRole}`}</span>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080d1a]/70 shrink-0">
          {data.imageUrl ? (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-2 rounded-xl hover:bg-indigo-500/10 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Foto</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="btn-3d px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-black cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
