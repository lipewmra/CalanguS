import React from "react";
import { CollaboratorInfo } from "../types";
import { 
  AlertTriangle, X, ShieldAlert, CheckCircle2, Pencil, 
  MessageCircle, Mail, User, Phone, FileWarning, ExternalLink, HelpCircle
} from "lucide-react";

interface CollaboratorFailureModalProps {
  collaborator: CollaboratorInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (collaborator: CollaboratorInfo) => void;
}

export default function CollaboratorFailureModal({
  collaborator,
  isOpen,
  onClose,
  onEdit,
}: CollaboratorFailureModalProps) {
  if (!isOpen || !collaborator) return null;

  const errors = collaborator.orionErrors || [];

  // Helper to diagnose specific errors and provide user-friendly explanations and solutions
  const getErrorDiagnosis = (errorMsg: string) => {
    const lower = errorMsg.toLowerCase();
    
    if (lower.includes("maiúscul") || lower.includes("maiuscul")) {
      return {
        title: "Nome em Caixa Alta (MAIÚSCULO)",
        severity: "Alta",
        cause: "O Cebraspe/Inep não aceita nomes preenchidos totalmente em letras maiúsculas.",
        impact: "Pode bloquear a importação oficial da ata e a emissão dos crachás e listas de presença.",
        solution: "Altere o nome para o padrão normal com iniciais maiúsculas (Exemplo: Carlos Costa Silva)."
      };
    }
    
    if (lower.includes("cpf") && (lower.includes("inválido") || lower.includes("invalido") || lower.includes("matematicamente"))) {
      return {
        title: "Dígito Verificador do CPF Inválido",
        severity: "Crítica",
        cause: "Os 11 dígitos do CPF não passaram no cálculo de validação oficial da Receita Federal.",
        impact: "Impossibilita o pagamento da diária pelo Cebraspe e causa rejeição automática no sistema Orion.",
        solution: "Solicite a conferência do documento oficial de identidade/CPF do colaborador e corrija os dígitos digitados."
      };
    }
    
    if (lower.includes("whatsapp") || lower.includes("telefone")) {
      return {
        title: "Formato de Telefone / WhatsApp Incorreto",
        severity: "Média",
        cause: "O número informado não possui a quantidade de dígitos necessária (DDD + 9 dígitos).",
        impact: "O CLA ou ALA não conseguirá disparar convocações urgentes, avisos de escala ou links de confirmação.",
        solution: "Insira o DDD completo seguido dos 9 dígitos do celular (Exemplo: (87) 98123-4567)."
      };
    }
    
    if (lower.includes("e-mail") || lower.includes("email")) {
      return {
        title: "Endereço de E-mail Inválido",
        severity: "Média",
        cause: "O e-mail digitado não segue a estrutura válida padrão (usuario@dominio.com).",
        impact: "As notificações automáticas de confirmação de equipe e termos de trabalho não serão entregues.",
        solution: "Revise a digitação do e-mail do colaborador e corrija eventuais erros de digitação."
      };
    }
    
    if (lower.includes("orion") || lower.includes("divergência") || lower.includes("divergencia") || lower.includes("cebraspe")) {
      return {
        title: "Inconsistência no Banco de Dados Orion (Cebraspe)",
        severity: "Alta",
        cause: "Há divergência cadastral entre os dados informados neste local e o cadastro prévio na base Cebraspe/Inep.",
        impact: "Risco de pendência no fechamento do lote de pagamentos após os dois domingos de aplicação.",
        solution: "Verifique se o CPF confere com o titular cadastrado na Receita Federal e no sistema Cebraspe."
      };
    }
    
    return {
      title: "Inconsistência Cadastral Detectada",
      severity: "Média",
      cause: errorMsg,
      impact: "Pode gerar inconformidades na auditoria de prestação de contas do local de prova.",
      solution: "Acesse a edição do colaborador e revise os dados preenchidos conforme os documentos comprobatórios."
    };
  };

  const handleWhatsAppContact = () => {
    if (!collaborator.whatsapp) return;
    const cleanPhone = collaborator.whatsapp.replace(/\D/g, "");
    const issuesList = errors.map((err, i) => `${i + 1}. ${err}`).join("\n");
    const msg = encodeURIComponent(
      `Olá ${collaborator.name}, aqui é da Coordenação do ENEM (CalanguS / Local de Aplicação).\n\n` +
      `Identificamos uma inconsistência no seu cadastro de fiscal de apoio:\n${issuesList}\n\n` +
      `Por favor, nos envie os dados corretos para regularizarmos seu registro no sistema Orion Cebraspe.`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#0c1220] border-2 border-rose-500/30 rounded-3xl max-w-2xl w-full shadow-[8px_8px_0px_0px_rgba(244,63,94,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="p-5 bg-rose-500/10 dark:bg-rose-950/30 border-b-2 border-rose-500/20 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-[3px_3px_0px_0px_#be123c]">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                Auditoria & Diagnóstico de Falha
              </span>
              <h3 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white mt-0.5">
                Inconsistência no Cadastro do Fiscal
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Collaborator Profile Summary Card */}
          <div className="p-4 bg-slate-50 dark:bg-[#101726]/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Colaborador Avaliado</span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>{collaborator.name}</span>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${collaborator.isReserve ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"}`}>
                  {collaborator.isReserve ? "Reserva" : "Efetivo"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {collaborator.assignedRole || collaborator.specialRole || "Fiscal"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 block font-sans uppercase font-bold">CPF:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{collaborator.cpf || "Não informado"}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-sans uppercase font-bold">WhatsApp:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{collaborator.whatsapp || "Não informado"}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-sans uppercase font-bold">Chave PIX:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">{collaborator.pixKey || "Não informada"}</span>
              </div>
            </div>
          </div>

          {/* DETECTED PROBLEMS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <FileWarning className="w-4 h-4" />
                <span>Problemas Detectados ({errors.length > 0 ? errors.length : 1})</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-bold">Status Orion: {collaborator.orionStatus}</span>
            </div>

            {errors.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl text-amber-800 dark:text-amber-400 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Possível divergência não especificada</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O colaborador foi marcado com pendência no módulo Cebraspe. Recomendamos revisar nome, CPF e escolaridade.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {errors.map((errMsg, idx) => {
                  const diag = getErrorDiagnosis(errMsg);
                  return (
                    <div 
                      key={idx} 
                      className="p-4 bg-rose-500/5 dark:bg-rose-950/20 border-2 border-rose-500/20 rounded-2xl space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                            {diag.title}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${diag.severity === "Crítica" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"}`}>
                          Severidade: {diag.severity}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-[#070b13] p-3 rounded-xl border border-rose-500/15 font-mono text-[11px] text-rose-700 dark:text-rose-400 font-bold">
                        "{errMsg}"
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-1">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">Motivo / Causa:</span>
                          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{diag.cause}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">Impacto no ENEM:</span>
                          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{diag.impact}</p>
                        </div>
                      </div>

                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-extrabold block uppercase text-[9px] tracking-wider text-emerald-600 dark:text-emerald-400">Ação Recomendada:</strong>
                          <span>{diag.solution}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-[#101726] border-t-2 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {collaborator.whatsapp && (
              <button
                type="button"
                onClick={handleWhatsAppContact}
                className="btn-3d py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Abrir WhatsApp com mensagem automática"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Pedir Correção no WhatsApp</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-800 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              FECHAR
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(collaborator);
                }}
                className="btn-3d btn-3d-secondary px-5 py-2.5 font-black text-xs text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="w-4 h-4" />
                <span>EDITAR CADASTRO AGORA</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
