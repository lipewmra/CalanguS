import React, { useState, useEffect } from "react";
import { Settings, X, Type, Palette, Sun, Moon, Check, Sparkles, RefreshCw, Camera, User, Key, ShieldCheck, ExternalLink, HelpCircle } from "lucide-react";
import { UserProfile } from "../types";
import PhotoUploader from "./PhotoUploader";
import GeminiKeyModal from "./GeminiKeyModal";
import { getGeminiApiKey, maskApiKey } from "../utils/geminiApiKey";

export type FontSizeOption = "5pt" | "8pt" | "12pt" | "14pt" | "18pt" | "24pt";
export type ColorThemeOption = "emerald" | "ocean" | "amethyst" | "amber" | "crimson" | "monochrome";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  colorTheme: ColorThemeOption;
  setColorTheme: (theme: ColorThemeOption) => void;
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;
  currentUser?: UserProfile | null;
  onUpdatePhoto?: (newPhotoUrl: string) => Promise<void>;
}

export const FONT_SIZES: { value: FontSizeOption; label: string; desc: string }[] = [
  { value: "5pt", label: "5 pt", desc: "Super Micro" },
  { value: "8pt", label: "8 pt", desc: "Pequeno" },
  { value: "12pt", label: "12 pt", desc: "Normal (Padrão)" },
  { value: "14pt", label: "14 pt", desc: "Médio" },
  { value: "18pt", label: "18 pt", desc: "Grande" },
  { value: "24pt", label: "24 pt", desc: "Extra Grande" },
];

export const COLOR_THEMES: {
  id: ColorThemeOption;
  name: string;
  desc: string;
  badge: string;
  previewColors: string[];
  gradientClass: string;
  accentBg: string;
  borderColor: string;
}[] = [
  {
    id: "emerald",
    name: "CalanguS Esmeralda",
    desc: "Tema original em tons de verde esmeralda e índigo",
    badge: "Padrão",
    previewColors: ["#10b981", "#14b8a6", "#6366f1"],
    gradientClass: "from-emerald-400 via-teal-300 to-indigo-400",
    accentBg: "bg-emerald-500",
    borderColor: "border-emerald-500",
  },
  {
    id: "ocean",
    name: "Oceano Profundo",
    desc: "Navegação serena em azul turquesa e ciano",
    badge: "Oceano",
    previewColors: ["#0284c7", "#06b6d4", "#3b82f6"],
    gradientClass: "from-sky-400 via-cyan-300 to-blue-500",
    accentBg: "bg-sky-500",
    borderColor: "border-sky-500",
  },
  {
    id: "amethyst",
    name: "Ametista Cósmica",
    desc: "Elegância em roxo violeta, magenta e rosa neon",
    badge: "Místico",
    previewColors: ["#8b5cf6", "#a855f7", "#ec4899"],
    gradientClass: "from-purple-400 via-violet-300 to-pink-500",
    accentBg: "bg-purple-500",
    borderColor: "border-purple-500",
  },
  {
    id: "amber",
    name: "Pôr do Sol / Dourado",
    desc: "Cores quentes em laranja âmbar, dourado e vermelho",
    badge: "Quente",
    previewColors: ["#f59e0b", "#f97316", "#ef4444"],
    gradientClass: "from-amber-400 via-orange-300 to-red-500",
    accentBg: "bg-amber-500",
    borderColor: "border-amber-500",
  },
  {
    id: "crimson",
    name: "Carmesim / Rubi",
    desc: "Tom vibrante em vermelho rubi e rosa cereja",
    badge: "Vibrante",
    previewColors: ["#f43f5e", "#e11d48", "#be123c"],
    gradientClass: "from-rose-400 via-pink-400 to-red-600",
    accentBg: "bg-rose-500",
    borderColor: "border-rose-500",
  },
  {
    id: "monochrome",
    name: "Alto Contraste",
    desc: "Estilo monocromático neutro para máxima clareza",
    badge: "Minimalista",
    previewColors: ["#64748b", "#475569", "#0f172a"],
    gradientClass: "from-slate-300 via-slate-400 to-slate-200",
    accentBg: "bg-slate-600",
    borderColor: "border-slate-500",
  },
];

export default function SettingsModal({
  isOpen,
  onClose,
  fontSize,
  setFontSize,
  colorTheme,
  setColorTheme,
  themeMode,
  setThemeMode,
  currentUser,
  onUpdatePhoto,
}: SettingsModalProps) {
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photoUrl || "");
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoSavedMsg, setPhotoSavedMsg] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [activeApiKey, setActiveApiKey] = useState<string>(getGeminiApiKey());

  useEffect(() => {
    const handleKeyChange = (e: any) => {
      setActiveApiKey(e.detail?.apiKey || getGeminiApiKey());
    };
    window.addEventListener("calangus_api_key_changed", handleKeyChange);
    return () => {
      window.removeEventListener("calangus_api_key_changed", handleKeyChange);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.photoUrl !== undefined) {
      setPhotoUrl(currentUser.photoUrl || "");
    }
  }, [currentUser?.photoUrl]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setFontSize("12pt");
    setColorTheme("emerald");
    setThemeMode("dark");
  };

  const handlePhotoChange = async (newUrl: string) => {
    setPhotoUrl(newUrl);
    if (onUpdatePhoto) {
      setIsSavingPhoto(true);
      try {
        await onUpdatePhoto(newUrl);
        setPhotoSavedMsg("Foto de perfil atualizada com sucesso!");
        setTimeout(() => setPhotoSavedMsg(""), 3500);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSavingPhoto(false);
      }
    }
  };

  const isCoordinatorOrAdmin = currentUser && (
    currentUser.role === "SuperAdmin" || 
    currentUser.role === "CLA" || 
    currentUser.role === "ALA" ||
    (currentUser.roles && currentUser.roles.some(r => r === "SuperAdmin" || r === "CLA" || r === "ALA"))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#0c1220] rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[10px_10px_0px_0px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b-2 border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-500">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                  Configurações do Sistema
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-black">
                  CalanguS v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Personalize sua foto de perfil, tamanho das letras e esquema de cores
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">

          {/* SECTION 0: PHOTO PROFILE (SUPERADMIN, CLA, ALA) */}
          {isCoordinatorOrAdmin && (
            <div className="space-y-3 p-4 bg-emerald-500/5 dark:bg-slate-900/60 rounded-2xl border-2 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold text-sm uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  <span>Foto de Perfil ({currentUser?.role || "Usuário"})</span>
                </div>
                {photoSavedMsg && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 animate-fade-in">
                    ✓ {photoSavedMsg}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Envie sua foto de identificação funcional para ser exibida no cabeçalho superior, crachás e relatórios da equipe:
              </p>

              <PhotoUploader
                photoUrl={photoUrl}
                onChange={handlePhotoChange}
                name={currentUser?.name || currentUser?.role || "Coordenador"}
                label=""
                helpText="A foto será redimensionada e otimizada automaticamente com compressão de alta qualidade."
              />
            </div>
          )}
          
          {/* SECTION 1: FONT SIZE (6 PREDEFINED SIZES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold text-sm uppercase tracking-wider">
                <Type className="w-4 h-4 text-emerald-500" />
                <span>1. Tamanho da Letra (6 Opções Predefinidas)</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                Atal: {fontSize}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Ajusta proporcionalmente o tamanho dos textos em todas as telas da aplicação:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {FONT_SIZES.map((opt) => {
                const isSelected = fontSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFontSize(opt.value)}
                    className={`relative p-3.5 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-[3px_3px_0px_0px_#10b981]"
                        : "bg-slate-50 dark:bg-[#070b13]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-mono font-black text-sm tracking-tight">{opt.label}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">{opt.desc}</span>
                    <div className="mt-2 text-slate-800 dark:text-slate-200 overflow-hidden text-ellipsis whitespace-nowrap font-semibold" style={{ fontSize: opt.value }}>
                      Amostra {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          {/* SECTION 2: COLOR SCHEMES (6 THEMES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold text-sm uppercase tracking-wider">
                <Palette className="w-4 h-4 text-emerald-500" />
                <span>2. Esquema de Cores (6 Temas Disponíveis)</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Escolha a paleta de cores principal para destacar botões, realces e gradientes:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {COLOR_THEMES.map((theme) => {
                const isSelected = colorTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setColorTheme(theme.id)}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `bg-slate-100 dark:bg-slate-900 ${theme.borderColor} shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]`
                        : "bg-slate-50 dark:bg-[#070b13]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-350 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2">
                        {/* Color swatches preview */}
                        <div className="flex items-center -space-x-1.5">
                          {theme.previewColors.map((color, idx) => (
                            <div
                              key={idx}
                              className="w-4 h-4 rounded-full border border-white dark:border-slate-900 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">{theme.name}</span>
                      </div>

                      {isSelected ? (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Ativo
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{theme.badge}</span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 font-medium leading-relaxed">
                      {theme.desc}
                    </p>

                    {/* Gradient Bar Preview */}
                    <div className={`h-2.5 w-full rounded-full bg-gradient-to-r ${theme.gradientClass} shadow-inner`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          {/* SECTION 3: LIGHT / DARK MODE TOGGLE */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {themeMode === "dark" ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <div>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider block">Modo de Iluminação</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Alternar entre interface clara e escura</span>
              </div>
            </div>

            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl gap-1">
              <button
                onClick={() => setThemeMode("light")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                  themeMode === "light"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                Claro
              </button>
              <button
                onClick={() => setThemeMode("dark")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                  themeMode === "dark"
                    ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                Escuro
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          {/* SECTION 4: GOOGLE GEMINI API KEY & OCR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold text-sm uppercase tracking-wider">
                <Key className="w-4 h-4 text-emerald-500" />
                <span>4. Inteligência Artificial & OCR (Google Gemini)</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                Sessão do Usuário
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Configure sua chave de API gratuita do Google Gemini para realizar leitura óptica (OCR) de documentos de ensalamento e extração de salas.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white ${activeApiKey ? "bg-emerald-500" : "bg-amber-500"}`}>
                  {activeApiKey ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {activeApiKey ? "Chave de API Configurada" : "Nenhuma Chave Pessoal Configurada"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {activeApiKey ? maskApiKey(activeApiKey) : "Usará chave padrão do sistema se disponível"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsKeyModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer self-stretch sm:self-auto justify-center"
              >
                <Sparkles className="w-4 h-4" />
                <span>{activeApiKey ? "Gerenciar Chave / Tutorial" : "Configurar Chave & Tutorial"}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-slate-100 dark:border-slate-850 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5 font-bold cursor-pointer transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Padrões</span>
            </button>
            <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono font-bold hidden sm:inline">
              CalanguS v2.3 (Build 2026)
            </span>
          </div>

          <button
            onClick={onClose}
            className="btn-3d btn-3d-primary px-6 py-2.5 rounded-xl font-mono font-black text-xs uppercase tracking-wider text-white"
          >
            Concluir / Salvar
          </button>
        </div>
      </div>

      {/* Tutorial & Key Management Modal */}
      <GeminiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={(k) => setActiveApiKey(k)}
      />
    </div>
  );
}
