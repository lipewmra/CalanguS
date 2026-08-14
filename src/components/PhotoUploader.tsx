import React, { useRef, useState } from "react";
import { Camera, Upload, X, Check, Image as ImageIcon, AlertCircle } from "lucide-react";
import { compressImageFile, getInitials } from "../lib/image-utils";

interface PhotoUploaderProps {
  photoUrl?: string;
  onChange: (dataUrl: string) => void;
  name?: string;
  label?: string;
  helpText?: string;
  className?: string;
}

export default function PhotoUploader({
  photoUrl,
  onChange,
  name = "Fiscal",
  label = "Foto de Identificação do Crachá",
  helpText = "Adicione uma foto nítida do seu rosto em fundo claro. O arquivo será comprimido automaticamente para o crachá.",
  className = "",
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Por favor, selecione um arquivo de imagem (PNG, JPG, JPEG, WEBP).");
      return;
    }
    setErrorMessage(null);
    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 600, 600, 0.84);
      onChange(compressedDataUrl);
    } catch (err: any) {
      console.error("Compression error:", err);
      setErrorMessage("Não foi possível processar a imagem. Tente outro arquivo.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input value so re-uploading same file triggers change
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#070b13]/80 p-4 border-2 rounded-2xl transition-all ${
          isDragOver
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        {/* Photo Avatar Preview */}
        <div className="relative group shrink-0">
          {photoUrl ? (
            <div className="relative">
              <img
                src={photoUrl}
                alt="Foto"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-md bg-slate-100 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-md cursor-pointer hover:scale-110 transition"
                title="Remover foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/30 text-indigo-500 flex flex-col items-center justify-center font-bold text-xs">
              <Camera className="w-6 h-6 mb-1 opacity-70" />
              <span className="text-[9px] uppercase font-black">Sem Foto</span>
            </div>
          )}

          {isCompressing && (
            <div className="absolute inset-0 bg-slate-950/70 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-bold animate-pulse">
              <span>Otimizando...</span>
            </div>
          )}
        </div>

        {/* Action buttons & helper info */}
        <div className="grow space-y-2 text-center sm:text-left">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {helpText}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="btn-3d px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{photoUrl ? "Trocar Foto" : "Escolher Arquivo"}</span>
            </button>

            {/* Direct Camera Trigger on Mobile */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isCompressing}
              className="btn-3d px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tirar Foto</span>
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="user"
            className="hidden"
          />

          {errorMessage && (
            <div className="text-[11px] text-rose-500 font-bold flex items-center gap-1 justify-center sm:justify-start">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
