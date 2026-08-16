import React, { useState, useEffect } from "react";
import {
  Key,
  X,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck,
  Zap,
  FileText,
  Info,
  Check,
  ClipboardPaste,
} from "lucide-react";
import {
  getGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
  maskApiKey,
  testGeminiApiKey,
} from "../utils/geminiApiKey";

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (savedKey: string) => void;
}

export default function GeminiKeyModal({
  isOpen,
  onClose,
  onKeySaved,
}: GeminiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [currentSavedKey, setCurrentSavedKey] = useState("");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [justCopiedLink, setJustCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getGeminiApiKey();
      setCurrentSavedKey(saved);
      setApiKeyInput(saved);
      setTestResult(null);
      setShowKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (forceKey?: string) => {
    const keyToTest = (forceKey !== undefined ? forceKey : apiKeyInput).trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: "Por favor, digite ou cole a sua chave de API antes de testar.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testGeminiApiKey(keyToTest);
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      saveGeminiApiKey(keyToTest);
      setCurrentSavedKey(keyToTest);
      if (onKeySaved) {
        onKeySaved(keyToTest);
      }
    }
  };

  const handleSaveWithoutTesting = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      clearGeminiApiKey();
      setCurrentSavedKey("");
      setTestResult({
        success: true,
        message: "Chave removida da sessão.",
      });
      return;
    }
    saveGeminiApiKey(trimmed);
    setCurrentSavedKey(trimmed);
    setTestResult({
      success: true,
      message: "Chave salva com sucesso na sua sessão local!",
    });
    if (onKeySaved) {
      onKeySaved(trimmed);
    }
  };

  const handleClear = () => {
    clearGeminiApiKey();
    setApiKeyInput("");
    setCurrentSavedKey("");
    setTestResult({
      success: true,
      message: "Chave de API removida da sua sessão.",
    });
    if (onKeySaved) {
      onKeySaved("");
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setApiKeyInput(text.trim());
        setTestResult(null);
      }
    } catch (err) {
      console.warn("Não foi possível acessar a área de transferência:", err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://aistudio.google.com/app/apikey");
    setJustCopiedLink(true);
    setTimeout(() => setJustCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Chave Google Gemini API & OCR</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  GRATUITA
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ative o reconhecimento inteligente de ensalamentos para o seu CLA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              currentSavedKey
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl text-white ${
                  currentSavedKey ? "bg-emerald-500" : "bg-amber-500"
                }`}
              >
                {currentSavedKey ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <Key className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Status da Chave do CLA
                </p>
                <p className="text-sm font-extrabold flex items-center gap-2">
                  {currentSavedKey ? (
                    <>
                      <span>Chave Conectada e Ativa</span>
                      <span className="font-mono text-xs bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
                        {maskApiKey(currentSavedKey)}
                      </span>
                    </>
                  ) : (
                    <span>Nenhuma chave pessoal configurada</span>
                  )}
                </p>
              </div>
            </div>

            {currentSavedKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer self-end sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            )}
          </div>

          {/* Tutorial / Instruções Passo a Passo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-500" />
                <span>Como Obter sua Chave de API Gratuita (1 Minuto)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                100% Grátis sem cartão
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div
                onClick={() => setActiveStep(1)}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  activeStep === 1
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Acessar o Google
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Abra a página oficial do <strong>Google AI Studio</strong> com sua conta Google (Gmail).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Abrir Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div
                onClick={() => setActiveStep(2)}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  activeStep === 2
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Criar a Chave
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Clique no botão azul <strong>"Create API key"</strong> e escolha <em>"Create API key in new project"</em>.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    Formato: AQ... ou AIzaSy...
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div
                onClick={() => setActiveStep(3)}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  activeStep === 3
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Colar e Salvar
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Copie a chave gerada, cole no campo abaixo e clique em <strong>Testar e Salvar</strong>.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Salva automaticamente na sua sessão!
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Direct Link Action */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Link oficial do painel de chaves:
              </span>
              <code className="text-[11px] font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                aistudio.google.com/app/apikey
              </code>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition cursor-pointer"
              >
                {justCopiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
              >
                <span>Criar Chave Agora</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Form Input Area */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Cole sua Chave de API Google Gemini (AQ... ou AIzaSy...)
            </label>

            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="Ex: AQ.Ab... ou AIzaSy..."
                className="w-full pl-4 pr-24 py-3 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white outline-hidden transition"
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  title="Colar da área de transferência"
                  className="p-1.5 text-slate-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? "Ocultar chave" : "Mostrar chave"}
                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>🔒 A chave é armazenada de forma segura na sessão do seu navegador e utilizada estritamente para o OCR e funções de IA deste CLA.</span>
            </p>
          </div>

          {/* Test Feedback Message */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border-2 flex items-start gap-3 animate-fade-in ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-850 dark:text-emerald-300"
                  : testResult.message.includes("503") || testResult.message.includes("alta demanda") || testResult.message.includes("high demand")
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-850 dark:text-amber-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-850 dark:text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : testResult.message.includes("503") || testResult.message.includes("alta demanda") || testResult.message.includes("high demand") ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1 text-left">
                <p className="font-bold">
                  {testResult.success
                    ? "✨ Conexão Estabelecida com Sucesso!"
                    : testResult.message.includes("503") || testResult.message.includes("alta demanda") || testResult.message.includes("high demand")
                    ? "⚡ Alta Demanda Temporária nos Servidores do Google (Erro 503)"
                    : "⚠️ Não foi possível validar a chave"}
                </p>
                <p>{testResult.message}</p>
                {!testResult.success && !testResult.message.includes("503") && !testResult.message.includes("alta demanda") && (
                  <p className="text-[11px] opacity-80">
                    Certifique-se de copiar a chave completa (iniciando com <code>AQ...</code> ou <code>AIzaSy...</code>) e de que o projeto esteja ativo no Google AI Studio.
                  </p>
                )}
                {(testResult.message.includes("503") || testResult.message.includes("alta demanda")) && (
                  <p className="text-[11px] font-medium opacity-90">
                    💡 <strong>Dica:</strong> Este erro ocorre diretamente nos clusters do Google durante picos de uso e costuma durar apenas alguns segundos. O CalanguS já possui contingência automática entre múltiplos modelos (Gemini 2.5 Flash, 3.7 Flash, Flash-Lite e Pro). Você pode clicar em <strong>"Salvar Direto"</strong> para utilizá-la normalmente.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Fechar
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveWithoutTesting()}
                disabled={isTesting || !apiKeyInput.trim()}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                Salvar Direto
              </button>

              <button
                type="button"
                onClick={() => handleTestAndSave()}
                disabled={isTesting || !apiKeyInput.trim()}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>TESTANDO CONEXÃO...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>TESTAR & SALVAR CHAVE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
