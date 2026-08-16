import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Mail,
  MessageSquare,
  Sparkles,
  HelpCircle,
  X,
  Server,
  Zap,
  Info,
} from "lucide-react";
import { PingramConfig, BuildingInfo } from "../types";
import {
  getPingramConfig,
  savePingramConfig,
  clearPingramConfig,
  maskPingramApiKey,
  testPingramApiConnection,
} from "../utils/pingramConfig";

interface PingramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  claId?: string;
  claName?: string;
  building?: BuildingInfo | null;
  onSaveBuilding?: (updated: BuildingInfo) => void;
}

export const PingramConfigModal: React.FC<PingramConfigModalProps> = ({
  isOpen,
  onClose,
  claId,
  claName,
  building,
  onSaveBuilding,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("Coordenação ENEM 2026");
  const [senderPhone, setSenderPhone] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prioritize building.pingramConfig, then localStorage per claId
      const stored = building?.pingramConfig || getPingramConfig(claId);
      setApiKey(stored.apiKey || "");
      setSenderEmail(stored.senderEmail || "");
      setSenderName(stored.senderName || (building ? `Coordenação ENEM - ${building.name}` : "Coordenação ENEM 2026"));
      setSenderPhone(stored.senderPhone || "");
      setTestResult(
        stored.lastTestedAt
          ? {
              success: stored.lastTestStatus === "success",
              message: stored.lastTestMessage || "Configuração salva anteriormente.",
            }
          : null
      );
      setSavedSuccess(false);
    }
  }, [isOpen, claId, building]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        success: false,
        message: "Por favor, insira sua Chave de API do Pingram antes de testar.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testPingramApiConnection({
        apiKey: apiKey.trim(),
        senderEmail: senderEmail.trim(),
        senderName: senderName.trim(),
        senderPhone: senderPhone.trim(),
      });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Falha ao testar conexão: ${err?.message || "Erro desconhecido"}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      if (!confirm("Deseja salvar sem chave de API? O envio automatizado de E-mails e SMS ficará desabilitado.")) {
        return;
      }
    }

    const newConfig: PingramConfig = {
      apiKey: apiKey.trim(),
      senderEmail: senderEmail.trim(),
      senderName: senderName.trim() || "Coordenação ENEM 2026",
      senderPhone: senderPhone.trim(),
      enabled: !!apiKey.trim(),
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: testResult?.success ? "success" : "error",
      lastTestMessage: testResult?.message || "Salvo pelo usuário",
    };

    // Save in local storage & dispatch events
    savePingramConfig(newConfig, claId);

    // Save in Building record if available
    if (building && onSaveBuilding) {
      onSaveBuilding({
        ...building,
        pingramConfig: newConfig,
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    if (confirm("Deseja remover as credenciais Pingram deste CLA?")) {
      clearPingramConfig(claId);
      if (building && onSaveBuilding) {
        onSaveBuilding({
          ...building,
          pingramConfig: undefined,
        });
      }
      setApiKey("");
      setSenderEmail("");
      setSenderPhone("");
      setTestResult(null);
      setSavedSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-white dark:bg-[#0c1220] w-full max-w-2xl rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-[8px_8px_0px_0px_#e2e8f0] dark:shadow-[8px_8px_0px_0px_#10b981]/20 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-display text-slate-850 dark:text-white">
                  Configuração Pingram (E-mail & SMS)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Por CLA
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {claName || (building ? building.name : "Coordenador de Local de Aplicação")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-left">
          
          {/* ALERT EXPLAINING MULTI-TENANT CLA MODEL */}
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-200 dark:border-sky-800 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sky-900 dark:text-sky-200">
                Cada CLA possui sua própria conta e chave do Pingram
              </p>
              <p className="text-sky-700 dark:text-sky-300 leading-relaxed text-[11px]">
                O Pingram permite disparar E-mails e SMS reais para seus colaboradores com entrega garantida e relatórios. Cada Coordenador de Local deve criar sua conta gratuita no <strong>pingram.io</strong> e informar sua chave de API abaixo.
              </p>
            </div>
          </div>

          {/* FORM FIELDS */}
          <div className="space-y-4">
            
            {/* API KEY INPUT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Chave de API do Pingram (API Key / Token) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  {showTutorial ? "Ocultar tutorial" : "Como obter minha chave?"}
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="Ex: ping_live_... ou sua API Key Pingram"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-2xl text-xs font-mono text-slate-850 dark:text-white pr-20 outline-hidden transition"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    title={showApiKey ? "Ocultar" : "Exibir"}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* TUTORIAL COLLAPSIBLE */}
            {showTutorial && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] animate-fade-in">
                <div className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Passo a Passo para obter sua chave Pingram:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Acesse o site oficial: <a href="https://pingram.io" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline inline-flex items-center gap-0.5">pingram.io <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Crie ou faça login na sua conta de Coordenador (plano gratuito disponível).</li>
                  <li>No painel do Pingram, acesse a aba <strong>API Keys / Settings</strong>.</li>
                  <li>Copie sua chave de API e cole no campo acima.</li>
                  <li>Clique em <strong>Testar Conexão</strong> e depois em <strong>Salvar Configuração</strong>.</li>
                </ol>
              </div>
            )}

            {/* SENDER NAME & EMAIL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Nome do Remetente</span>
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ex: Coordenação ENEM - Escola XYZ"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-2xl text-xs text-slate-850 dark:text-white outline-hidden transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>E-mail do Remetente (Opcional)</span>
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="Ex: coord.enem@escola.edu.br"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-2xl text-xs text-slate-850 dark:text-white outline-hidden transition"
                />
              </div>
            </div>

            {/* SENDER PHONE */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>Telefone/ID Remetente para SMS (Opcional)</span>
              </label>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="Ex: +5561999998888 ou ENEM-CLA"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-2xl text-xs text-slate-850 dark:text-white outline-hidden transition"
              />
            </div>
          </div>

          {/* TEST CONNECTION BUTTON & STATUS */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey.trim()}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-indigo-500/40 hover:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Testando conexão com o Pingram...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Testar Conexão com API Pingram</span>
                </>
              )}
            </button>
          </div>

          {/* TEST RESULT FEEDBACK */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border-2 flex items-start gap-3 animate-fade-in ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">
                  {testResult.success ? "✨ Pingram Conectado com Sucesso!" : "⚠️ Falha ao Validar Pingram"}
                </p>
                <p className="text-[11px] leading-relaxed">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* SAVE SUCCESS BANNER */}
          {savedSuccess && (
            <div className="p-3 bg-emerald-500 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configurações do Pingram salvas com sucesso!</span>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3">
          <div>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
              >
                Desconectar / Limpar Chave
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-[3px_3px_0px_0px_#4338ca] transition cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Salvar Configuração</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PingramConfigModal;
