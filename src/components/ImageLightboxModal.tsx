import React, { useEffect } from "react";
import { X, ZoomIn, Download, User, Shield, Building2, Award } from "lucide-react";
import { getInitials } from "../lib/image-utils";

export interface LightboxData {
  imageUrl: string;
  name: string;
  role?: string;
  cpf?: string;
  claName?: string;
  education?: string;
  specialRole?: string;
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080d1a]/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <ZoomIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Foto de Identificação
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">Visualização ampliada para controle de portaria</p>
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

        {/* Image Container */}
        <div className="p-6 flex flex-col items-center w-full bg-radial from-slate-100/50 dark:from-slate-900/40 to-transparent">
          <div className="relative group">
            {data.imageUrl ? (
              <img
                src={data.imageUrl}
                alt={data.name}
                className="w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-2xl border-4 border-white dark:border-slate-800 shadow-xl ring-2 ring-indigo-500/30"
              />
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex flex-col items-center justify-center font-black text-5xl shadow-xl ring-2 ring-indigo-500/30">
                <span>{getInitials(data.name)}</span>
                <span className="text-xs uppercase font-medium mt-2 opacity-75">Sem foto anexada</span>
              </div>
            )}
          </div>

          {/* Details Pill */}
          <div className="mt-5 w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-left">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-base leading-snug">
                  {data.name}
                </h4>
                {data.cpf && (
                  <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    CPF: {data.cpf}
                  </p>
                )}
              </div>
              {data.role && (
                <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-indigo-500/20 shrink-0">
                  {data.role}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {data.claName && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">CLA: {data.claName}</span>
                </div>
              )}
              {data.education && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{data.education}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080d1a]/50">
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
            className="btn-3d px-5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-black cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
