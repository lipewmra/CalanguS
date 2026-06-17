import React, { useState, useEffect } from "react";
import { PhotoRecord } from "../types";
import { Camera, Trash, Check, Eye, Image as ImageIcon, Calendar } from "lucide-react";

interface PhotoLogsProps {
  photos: PhotoRecord[];
  claId: string;
  onAdd: (photo: Omit<PhotoRecord, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  readOnly?: boolean;
}

const PRESET_MOCKS = [
  { name: "Placa Identificação Entrada", url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80" },
  { name: "Sala de Aplicação Configurada", url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80" },
  { name: "Quadro Negro Avisos", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80" },
  { name: "Sala de Coordenação Pronta", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80" }
];

export default function PhotoRecordLogsView({ photos, claId, onAdd, onDelete, readOnly = false }: PhotoLogsProps) {
  const [description, setDescription] = useState("");
  const [day, setDay] = useState<1 | 2>(1);
  const [selectedMockUrl, setSelectedMockUrl] = useState(PRESET_MOCKS[0].url);
  const [customFileBase64, setCustomFileBase64] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit size
        alert("A foto é muito grande! Por favor envie arquivos menores que 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    
    setLoading(true);
    const resolvedUrl = customFileBase64 || selectedMockUrl;

    const newPhoto: Omit<PhotoRecord, "id"> = {
      claId,
      imageUrl: resolvedUrl,
      description,
      day,
      createdAt: new Date().toISOString()
    };

    try {
      await onAdd(newPhoto);
      setDescription("");
      setCustomFileBase64(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#6366f1]/20 transition-all duration-300" id="photo-record-logs-dashboard">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="p-3 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-display font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>Registros Fotográficos Oficiais</span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">3D REPORT</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Insira fotos para documentar a conformidade das salas, portão principal e coordenação do ENEM.</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-550 shrink-0" />
          <span>Foto gravada e vinculada ao relatório fotográfico Firestore com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD PHOTO FORM */}
        <div className="bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800 p-5 rounded-2xl h-fit shadow-[4px_4px_0px_0px_#cbd5e1] dark:shadow-[4px_4px_0px_0px_#1e293b] space-y-4">
          {readOnly ? (
            <div className="space-y-4">
              <h3 className="text-sm font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1">
                <span>📸</span> Registro de Captações
              </h3>
              <div className="p-3.5 bg-indigo-500/10 border-2 border-indigo-550/25 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold leading-relaxed space-y-2">
                <p>ℹ️ <strong>Modo de Leitura Ativo (ALA):</strong></p>
                <p className="font-normal text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Como assistente ALA, você pode visualizar toda a galeria de conformidade à direita e auditar as fotos enviadas, mas somente o CLA pode anexar novas fotos do ENEM ou apagá-las do relatório oficial.</p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1">
                <span>📸</span> Registrar Nova Captação
              </h3>
              
              <form onSubmit={handleAddPhotoSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Dia do Exame</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDay(1)}
                  className={`py-2 text-xs font-extrabold rounded-lg border-2 cursor-pointer transition duration-150 active:translate-y-[2px] ${day === 1 ? "bg-indigo-600 text-white border-indigo-805 shadow-[2px_2px_0px_0px_#4f46e5]" : "bg-white dark:bg-[#101726] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)]"}`}
                >
                  Dia 1 (Humanas)
                </button>
                <button
                  type="button"
                  onClick={() => setDay(2)}
                  className={`py-2 text-xs font-extrabold rounded-lg border-2 cursor-pointer transition duration-150 active:translate-y-[2px] ${day === 2 ? "bg-indigo-600 text-white border-indigo-805 shadow-[2px_2px_0px_0px_#4f46e5]" : "bg-white dark:bg-[#101726] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.15)]"}`}
                >
                  Dia 2 (Exatas)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Descrição do Registro</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Sala 01 com carteiras organizadas"
                className="w-full text-xs font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 transition"
                required
              />
            </div>

            {/* Simulated file upload or Preset Gallery */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Foto a ser anexada</label>
              
              <div className="space-y-3">
                {/* Real File Input */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-2 file:border-indigo-500/20 file:text-xs file:font-black file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"
                />

                {customFileBase64 ? (
                  <div className="mt-2 border-2 border-dashed border-indigo-500/30 rounded-xl p-3 bg-indigo-500/5 text-[10px] text-indigo-400 font-bold truncate">
                    ✓ Foto do dispositivo pronta para envio.
                  </div>
                ) : (
                  <div>
                    <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider mb-2 text-center">— Ou simule com Mockup fotográfico —</span>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_MOCKS.map((m) => {
                        const isSelected = selectedMockUrl === m.url;
                        return (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => setSelectedMockUrl(m.url)}
                            className={`p-1.5 border-2 rounded-xl overflow-hidden text-left bg-white dark:bg-[#101726] transition hover:border-indigo-400 focus:outline-hidden active:translate-y-0.5 ${isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md transform scale-[1.01]" : "border-slate-200 dark:border-slate-800"}`}
                          >
                            <img src={m.url} referrerPolicy="no-referrer" alt={m.name} className="w-full h-11 object-cover rounded-lg mb-1" />
                            <span className="block text-[9px] font-black leading-tight truncate text-slate-700 dark:text-slate-350">{m.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-secondary rounded-xl w-full py-2.5 flex items-center justify-center gap-1.5 font-extrabold shadow-lg"
            >
              <Camera className="w-4 h-4" />
              <span>{loading ? "REGISTRANDO..." : "REGISTRAR FOTO"}</span>
            </button>
          </form>
          </>
          )}
        </div>

        {/* PHOTOS LOGS VIEW GRID */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-display font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Galeria de Relatórios Fotográficos</h3>
            <span className="text-[10px] bg-indigo-550/15 text-indigo-400 border border-indigo-500/20 font-bold px-2.5 py-0.5 rounded-full font-mono">
              {photos.length} CAPTURA(S)
            </span>
          </div>

          {photos.length === 0 ? (
            <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <ImageIcon className="w-10 h-10 stroke-1 text-slate-500 animate-pulse" />
              <p className="text-xs font-bold text-slate-450">Nenhum registro fotográfico enviado no sistema.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[460px] overflow-y-auto pr-2">
              {photos.map((photo) => {
                const relativeDate = new Date(photo.createdAt).toLocaleDateString("pt-BR");
                
                return (
                  <div key={photo.id} className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_#1e293b] hover:-translate-y-1 transition duration-200">
                    <div>
                      <div className="relative h-32 bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <img
                          src={photo.imageUrl}
                          referrerPolicy="no-referrer"
                          alt={photo.description}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-indigo-650 text-white font-extrabold text-[8px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md border border-white/15">
                          Dia {photo.day}
                        </span>
                      </div>
                      <div className="p-3.5 space-y-1">
                        <p className="text-xs font-black text-slate-800 dark:text-white leading-snug">{photo.description}</p>
                        <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-indigo-400" /> Enviado em {relativeDate}
                        </span>
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/20">
                        <button
                          onClick={() => onDelete(photo.id!)}
                          className="text-slate-400 hover:text-rose-500 font-extrabold text-[9px] uppercase flex items-center gap-1 px-2.5 py-1 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 border border-transparent hover:border-rose-500/20 rounded-xl transition cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          <span>Apagar</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
