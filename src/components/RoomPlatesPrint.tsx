import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { 
  Download, Printer, ArrowLeft, ArrowRight, ArrowUp, CheckCircle, 
  Eye, RefreshCw, Plus, Trash2, Sparkles, X, FileText, Layers 
} from "lucide-react";
import { BuildingInfo, RoomDetails } from "../types";

interface PlateItem {
  id: string;
  type: "class" | "arrow" | "custom" | "special";
  title: string;
  subTitle?: string;
  icon?: string;
  direction?: "left" | "right" | "straight" | "none";
}

interface RoomPlatesProps {
  readOnly?: boolean;
  building?: BuildingInfo | null;
  rooms?: RoomDetails[];
}

export default function RoomPlatesPrint({ 
  readOnly = false, 
  building = null, 
  rooms = [] 
}: RoomPlatesProps) {
  const [plates, setPlates] = useState<PlateItem[]>([
    { id: "1", type: "class", title: "SALA 01" },
    { id: "2", type: "class", title: "SALA 02" },
    { id: "3", type: "special", title: "ATENDIMENTO ESPECIALIZADO", subTitle: "Acessibilidade LIBRAS / Ledor / Tempo Adicional" },
    { id: "4", type: "special", title: "SALA DE COORDENAÇÃO", subTitle: "Acesso Restrito - Equipe CLA / ALA" },
    { id: "5", type: "special", title: "SALA EXTRA DE CONTINGÊNCIA", subTitle: "Suporte e Remanejamento de Candidatos" },
    { id: "6", type: "arrow", title: "SALAS 01 A 05", direction: "right", subTitle: "Siga a Seta Indicativa no Corredor" },
    { id: "7", type: "arrow", title: "COORDENAÇÃO DE LOCAL", direction: "left", subTitle: "Direção da Sala da Equipe CLA" },
    { id: "8", type: "arrow", title: "BANHEIROS / SANITÁRIOS", direction: "straight", subTitle: "Acesso Geral de Candidatos" },
  ]);

  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [customType, setCustomType] = useState<"class" | "arrow" | "custom" | "special">("class");
  const [customDir, setCustomDir] = useState<"left" | "right" | "straight" | "none">("none");

  // Background Image State for AvisosEnem.jpg
  const [bgImageBase64, setBgImageBase64] = useState<string>("");
  const [isBgLoaded, setIsBgLoaded] = useState<boolean>(false);
  const [previewPlate, setPreviewPlate] = useState<PlateItem | null>(null);

  // Load Model/AvisosEnem.jpg and convert to base64
  useEffect(() => {
    const loadBgImage = async () => {
      try {
        let res = await fetch('/Model/AvisosEnem.jpg');
        if (!res.ok) {
          res = await fetch('/AvisosEnem.jpg');
        }
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setBgImageBase64(base64data);
          setIsBgLoaded(true);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Erro ao carregar imagem de fundo AvisosEnem.jpg:", err);
      }
    };
    loadBgImage();
  }, []);

  // Sync plates with building rooms
  const handleSyncWithBuilding = () => {
    const newPlates: PlateItem[] = [];

    if (rooms && rooms.length > 0) {
      rooms.forEach((r, idx) => {
        newPlates.push({
          id: `room-${idx}`,
          type: "class",
          title: `SALA ${r.number}`,
          subTitle: r.floor ? r.floor : undefined
        });
      });
    } else if (building && building.roomsCount > 0) {
      for (let i = 1; i <= building.roomsCount; i++) {
        newPlates.push({
          id: `room-${i}`,
          type: "class",
          title: `SALA ${i < 10 ? "0" + i : i}`
        });
      }
    }

    // Default institutional signage
    newPlates.push({
      id: "coord-room",
      type: "special",
      title: "SALA DE COORDENAÇÃO",
      subTitle: `Acesso Restrito - Equipe CLA / ALA ${building?.coordRoom ? `• ${building.coordRoom}` : ""}`
    });

    if (building?.specialRoomsCount && building.specialRoomsCount > 0) {
      newPlates.push({
        id: "special-room",
        type: "special",
        title: "ATENDIMENTO ESPECIALIZADO",
        subTitle: building.specialDetails || "Salas com Acessibilidade / Ledor / LIBRAS"
      });
    }

    if (building?.extraRoomsCount && building.extraRoomsCount > 0) {
      newPlates.push({
        id: "extra-room",
        type: "special",
        title: "SALA EXTRA DE CONTINGÊNCIA",
        subTitle: "Controle de Contingência de Candidatos"
      });
    }

    newPlates.push(
      { id: "arrow-coord", type: "arrow", title: "COORDENAÇÃO DE LOCAL", direction: "left", subTitle: "Siga a Seta Indicativa" },
      { id: "arrow-wc", type: "arrow", title: "SANITÁRIOS / BANHEIROS", direction: "straight", subTitle: "Acesso Geral" }
    );

    setPlates(newPlates);
  };

  const addCustomPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newItem: PlateItem = {
      id: Date.now().toString(),
      type: customType,
      title: customTitle.toUpperCase(),
      subTitle: customSubtitle || "ENEM - AVISO OFICIAL DE SINALIZAÇÃO",
      direction: customDir,
    };

    setPlates([...plates, newItem]);
    setCustomTitle("");
    setCustomSubtitle("");
  };

  const removePlate = (id: string) => {
    setPlates(plates.filter(p => p.id !== id));
  };

  // Modern jsPDF design compiler using AvisosEnem.jpg as background, BLACK text without background boxes
  const generatePdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 297;
    const pageHeight = 210;

    plates.forEach((plate, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // 1. Draw Background Image (Model/AvisosEnem.jpg)
      if (bgImageBase64) {
        try {
          doc.addImage(bgImageBase64, "JPEG", 0, 0, pageWidth, pageHeight);
        } catch (e) {
          console.warn("Could not render background image into PDF:", e);
        }
      }

      // 2. Central Main Letreiro / Title Text (Directly on background)
      doc.setFont("Helvetica", "bold");
      
      let fontSize = 68;
      if (plate.title.length > 15) fontSize = 52;
      if (plate.title.length > 25) fontSize = 38;
      if (plate.title.length > 35) fontSize = 28;

      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0); // BLACK FONT
      
      const mainY = plate.direction && plate.direction !== "none" ? 82 : (plate.subTitle ? 95 : 102);
      doc.text(plate.title, 148.5, mainY, { align: "center" });

      // 3. Directional Arrow with Light Blue Accent (No giant surrounding box)
      if (plate.direction && plate.direction !== "none") {
        doc.setLineWidth(3);
        doc.setDrawColor(14, 165, 233); // Light blue arrow lines
        doc.setFillColor(56, 189, 248);  // Light blue arrow fill

        if (plate.direction === "right") {
          doc.triangle(210, 102, 210, 122, 230, 112, "F");
          doc.line(160, 112, 210, 112);
        } else if (plate.direction === "left") {
          doc.triangle(87, 102, 87, 122, 67, 112, "F");
          doc.line(87, 112, 137, 112);
        } else if (plate.direction === "straight") {
          doc.triangle(138.5, 102, 158.5, 102, 148.5, 87, "F");
          doc.line(148.5, 102, 148.5, 125);
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(14, 165, 233); // Light Blue Text
        doc.text("FLUXO INDICATIVO DE CORREDOR", 148.5, 135, { align: "center" });
      }

      // 4. Subtitle Text (Directly on background - Pure Black)
      if (plate.subTitle) {
        const subY = plate.direction && plate.direction !== "none" ? 155 : 142;

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0); // BLACK FONT
        doc.text(plate.subTitle, 148.5, subY, { align: "center" });
      }

      // 5. Presentes 1º Dia & Presentes 2º Dia Boxes (Bottom-Left Corner)
      const boxY = 162;
      const boxW = 48;
      const boxH = 26;

      // Box 1: Presentes 1º Dia
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.rect(25, boxY, boxW, boxH, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("Presentes 1º Dia", 25 + boxW / 2, boxY + 6, { align: "center" });
      doc.setLineWidth(0.4);
      doc.line(25, boxY + 8, 25 + boxW, boxY + 8);

      // Box 2: Presentes 2º Dia
      doc.setLineWidth(0.8);
      doc.rect(25 + boxW + 6, boxY, boxW, boxH, "FD");
      doc.text("Presentes 2º Dia", 25 + boxW + 6 + boxW / 2, boxY + 6, { align: "center" });
      doc.setLineWidth(0.4);
      doc.line(25 + boxW + 6, boxY + 8, 25 + boxW + 6 + boxW, boxY + 8);

      // 6. Optional Building info in footer
      if (building?.name) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`PRÉDIO: ${building.name.toUpperCase()}`, 148.5, 198, { align: "center" });
      }
    });

    doc.save("placas_sinalizacao_enem_avisos.pdf");
  };

  // Browser Direct Printing Handler
  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="plates-print-selector">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
            <span>🖨️ Placas e Sinalizações de Portas</span>
            <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-400/30 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>MODELO AVISOS ENEM</span>
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Gere letreiros com o fundo oficial <strong>Model/AvisosEnem.jpg</strong>, fontes pretas legíveis e destaques em azul claro para impressão.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncWithBuilding}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Sincronizar placas com as salas cadastradas no prédio"
          >
            <RefreshCw className="w-4 h-4 text-sky-500" />
            <span>Sincronizar Salas</span>
          </button>

          <button
            onClick={handleNativePrint}
            className="px-3.5 py-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-2 border-sky-400/40 rounded-xl text-xs font-bold transition hover:bg-sky-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-500" />
            <span>Imprimir Navegador</span>
          </button>

          <button
            onClick={generatePdf}
            className="btn-3d bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-5 py-2.5 font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>BAIXAR PDF COMPLETO</span>
          </button>
        </div>
      </div>

      {/* STATUS BANNER */}
      <div className="mb-6 p-3.5 bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-400/30 rounded-xl flex items-center justify-between gap-3 text-xs font-bold text-sky-900 dark:text-sky-200">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-sky-500 shrink-0" />
          <span>
            {isBgLoaded 
              ? "Imagem de Fundo Oficial (Model/AvisosEnem.jpg) Carregada e Pronta!" 
              : "Carregando imagem de fundo oficial AvisosEnem.jpg..."}
          </span>
        </div>
        <span className="text-[10px] bg-sky-400 text-black px-2.5 py-0.5 rounded-full font-mono font-extrabold">
          FONTE: PRETA • DESTAQUES: AZUL CLARO
        </span>
      </div>

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ADD PLATE FORM */}
        <div className="bg-slate-50 dark:bg-[#070b13]/60 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#cbd5e1] dark:shadow-[4px_4px_0px_0px_#1e293b]">
          {readOnly ? (
            <div className="space-y-4">
              <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1">
                <span>✨</span> Letreiros & Placas
              </h3>
              <div className="p-3.5 bg-sky-500/10 border-2 border-sky-400/30 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold leading-relaxed space-y-2">
                <p>ℹ️ <strong>Modo de Leitura Ativo (ALA):</strong></p>
                <p className="font-normal text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Como assistente ALA, você pode compilar o PDF e visualizar os modelos de placa com o fundo AvisosEnem.jpg, mas a criação ou exclusão de placas é restrita ao CLA.
                </p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1">
                <span>✨</span> Adicionar Letreiro
              </h3>
              <form onSubmit={addCustomPlate} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Título Principal (Letreiro)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: SALA 01 ou BANHEIROS"
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-400 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Subtítulo Informativo
                  </label>
                  <input
                    type="text"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Ex: CAPACIDADE: 30 CANDIDATOS"
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-400 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Tipo de Letreiro
                    </label>
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value as any)}
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2.5 bg-white dark:bg-[#101726] text-slate-800 dark:text-slate-200 text-xs font-bold"
                    >
                      <option value="class">Sala Comum</option>
                      <option value="special">Setor Especial</option>
                      <option value="arrow">Seta de Direção</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Direção da Seta
                    </label>
                    <select
                      value={customDir}
                      onChange={(e) => setCustomDir(e.target.value as any)}
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2.5 bg-white dark:bg-[#101726] text-slate-800 dark:text-slate-200 text-xs font-bold"
                      disabled={customType !== "arrow" && customType !== "class"}
                    >
                      <option value="none">Nenhuma</option>
                      <option value="left">Esquerda 👈</option>
                      <option value="right">Direita 👉</option>
                      <option value="straight">Reto 👆</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>INCLUIR NO LOTE DE IMPRESSÃO</span>
                </button>
              </form>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE LIST OF PLATES WITH AvisosEnem.jpg BACKGROUND PREVIEW */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-sky-400 flex items-center gap-2">
              <span>Fila de Placas Prontas para Impressão</span>
              <span className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                {plates.length}
              </span>
            </h3>

            <span className="text-[10px] font-bold text-slate-400">
              Clique em "Visualizar" para ver em tamanho real
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {plates.map((plate) => (
              <div
                key={plate.id}
                className="relative p-5 border-2 border-sky-400/50 rounded-2xl shadow-md flex flex-col justify-between transition hover:border-sky-400 hover:shadow-lg overflow-hidden group"
                style={{
                  backgroundImage: `url('/Model/AvisosEnem.jpg'), url('/AvisosEnem.jpg')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Translucent overlay card to guarantee high contrast black text */}
                <div className="absolute inset-0 bg-white/85 dark:bg-slate-950/80 backdrop-blur-[1px] group-hover:bg-white/75 dark:group-hover:bg-slate-950/70 transition" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    {/* Light Blue Highlight Badge */}
                    <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-lg bg-sky-400 text-black border border-sky-500 shadow-xs tracking-wider">
                      {plate.type === "class" ? "Sala de Prova" : plate.type === "special" ? "Setor Especial" : "Direção"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewPlate(plate)}
                        className="text-sky-700 dark:text-sky-300 hover:text-sky-900 bg-sky-100 dark:bg-sky-900/60 p-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1"
                        title="Visualizar modelo A4"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Ver Placa</span>
                      </button>

                      {!readOnly && (
                        <button
                          onClick={() => removePlate(plate.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg text-xs font-bold cursor-pointer transition"
                          title="Remover placa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MAIN TITLE IN BLACK FONT */}
                  <h4 className="text-2xl font-black text-black dark:text-white font-display tracking-tight leading-tight">
                    {plate.title}
                  </h4>

                  {/* SUBTITLE */}
                  {plate.subTitle && (
                    <div className="mt-2">
                      <p className="text-[11px] text-slate-800 dark:text-slate-200 font-extrabold tracking-wide">
                        {plate.subTitle}
                      </p>
                    </div>
                  )}
                </div>

                {/* DIRECTION ARROW & PRESENTES BOXES HIGHLIGHT */}
                <div className="relative z-10 flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex items-center gap-1.5">
                    <div className="px-1.5 py-0.5 bg-white border border-slate-900 rounded text-[9px] font-extrabold text-slate-900 shadow-2xs">
                      Presentes 1º Dia
                    </div>
                    <div className="px-1.5 py-0.5 bg-white border border-slate-900 rounded text-[9px] font-extrabold text-slate-900 shadow-2xs">
                      Presentes 2º Dia
                    </div>
                  </div>

                  {plate.direction && plate.direction !== "none" ? (
                    <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-black uppercase tracking-wider">
                      {plate.direction === "left" && <><ArrowLeft className="w-3.5 h-3.5 stroke-[3]" /> SIGA À ESQUERDA</>}
                      {plate.direction === "right" && <><ArrowRight className="w-3.5 h-3.5 stroke-[3]" /> SIGA À DIREITA</>}
                      {plate.direction === "straight" && <><ArrowUp className="w-3.5 h-3.5 stroke-[3]" /> SIGA EM FRENTE</>}
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-slate-500">
                      Sinalização de Porta
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-2 border-sky-400/40 rounded-2xl text-xs font-bold flex items-center gap-3">
            <Printer className="w-5 h-5 text-sky-500 shrink-0" />
            <span>
              As placas utilizam a imagem oficial <strong>Model/AvisosEnem.jpg</strong> como background com as caixas "Presentes 1º Dia" e "Presentes 2º Dia" no canto inferior esquerdo.
            </span>
          </div>
        </div>
      </div>

      {/* FULL A4 LANDSCAPE PREVIEW MODAL */}
      {previewPlate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border-2 border-sky-400 animate-fade-in relative space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    Pré-visualização do Modelo de Placa A4
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Layout Limpo com Fundo Model/AvisosEnem.jpg • Caixas de Frequência "Presentes 1º Dia / 2º Dia"
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewPlate(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* A4 LANDSCAPE PREVIEW CANVAS */}
            <div className="flex justify-center my-4">
              <div 
                className="w-full max-w-2xl aspect-[1.414/1] rounded-2xl p-8 border-4 border-sky-400 shadow-2xl flex flex-col justify-between relative overflow-hidden"
                style={{
                  backgroundImage: `url('/Model/AvisosEnem.jpg'), url('/AvisosEnem.jpg')`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                }}
              >
                {/* Central Title (Directly on background) */}
                <div className="my-auto text-center py-4">
                  <h2 className="text-6xl font-black text-black font-display tracking-tight uppercase">
                    {previewPlate.title}
                  </h2>

                  {previewPlate.direction && previewPlate.direction !== "none" && (
                    <div className="mt-4 flex justify-center">
                      <div className="text-sky-600 font-mono text-base font-black flex items-center gap-2">
                        {previewPlate.direction === "left" && <><ArrowLeft className="w-6 h-6 stroke-[3]" /> SIGA À ESQUERDA</>}
                        {previewPlate.direction === "right" && <><ArrowRight className="w-6 h-6 stroke-[3]" /> SIGA À DIREITA</>}
                        {previewPlate.direction === "straight" && <><ArrowUp className="w-6 h-6 stroke-[3]" /> SIGA EM FRENTE</>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtitle Text (Directly on background) */}
                {previewPlate.subTitle && (
                  <div className="text-center pb-2">
                    <p className="text-base font-black text-black uppercase tracking-wide">
                      {previewPlate.subTitle}
                    </p>
                  </div>
                )}

                {/* Bottom Row: Left Attendance Boxes + Right Building Info */}
                <div className="mt-2 flex justify-between items-end">
                  <div className="flex items-center gap-2.5">
                    <div className="w-28 h-14 bg-white border-2 border-black rounded-md p-1 flex flex-col items-center justify-between shadow-xs">
                      <span className="text-[10px] font-black text-black border-b border-black/40 pb-0.5 w-full text-center">
                        Presentes 1º Dia
                      </span>
                      <div className="flex-1" />
                    </div>

                    <div className="w-28 h-14 bg-white border-2 border-black rounded-md p-1 flex flex-col items-center justify-between shadow-xs">
                      <span className="text-[10px] font-black text-black border-b border-black/40 pb-0.5 w-full text-center">
                        Presentes 2º Dia
                      </span>
                      <div className="flex-1" />
                    </div>
                  </div>

                  <span className="text-[11px] font-black text-black">
                    {building?.name ? `PRÉDIO: ${building.name.toUpperCase()}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPreviewPlate(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Fechar Visualização
              </button>

              <button
                onClick={() => {
                  generatePdf();
                  setPreviewPlate(null);
                }}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>BAIXAR PDF COMPLETO</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HIDDEN BROWSER PRINT TEMPLATE FOR DIRECT window.print() */}
      <div className="hidden print:block font-sans">
        {plates.map((plate) => (
          <div 
            key={`print-${plate.id}`}
            className="w-full h-screen p-12 flex flex-col justify-between page-break-after-always relative"
            style={{
              backgroundImage: `url('/Model/AvisosEnem.jpg'), url('/AvisosEnem.jpg')`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              color: '#000000',
            }}
          >
            {/* Title */}
            <div className="my-auto text-center py-10">
              <h2 className="text-7xl font-black text-black font-display tracking-tight uppercase">
                {plate.title}
              </h2>

              {plate.direction && plate.direction !== "none" && (
                <div className="mt-8 flex justify-center">
                  <div className="text-sky-600 font-mono text-2xl font-black flex items-center gap-3">
                    {plate.direction === "left" && <><ArrowLeft className="w-8 h-8 stroke-[3]" /> SIGA À ESQUERDA</>}
                    {plate.direction === "right" && <><ArrowRight className="w-8 h-8 stroke-[3]" /> SIGA À DIREITA</>}
                    {plate.direction === "straight" && <><ArrowUp className="w-8 h-8 stroke-[3]" /> SIGA EM FRENTE</>}
                  </div>
                </div>
              )}
            </div>

            {/* Subtitle */}
            {plate.subTitle && (
              <div className="text-center pb-6">
                <p className="text-2xl font-black text-black uppercase tracking-wide">
                  {plate.subTitle}
                </p>
              </div>
            )}

            {/* Bottom Row */}
            <div className="flex justify-between items-end pt-4">
              {/* Bottom Left Attendance Boxes */}
              <div className="flex items-center gap-4">
                <div className="w-36 h-20 bg-white border-2 border-black rounded-lg p-2 flex flex-col items-center shadow-xs">
                  <span className="text-xs font-black text-black border-b border-black/50 pb-1 w-full text-center tracking-wider uppercase">
                    Presentes 1º Dia
                  </span>
                  <div className="flex-1" />
                </div>

                <div className="w-36 h-20 bg-white border-2 border-black rounded-lg p-2 flex flex-col items-center shadow-xs">
                  <span className="text-xs font-black text-black border-b border-black/50 pb-1 w-full text-center tracking-wider uppercase">
                    Presentes 2º Dia
                  </span>
                  <div className="flex-1" />
                </div>
              </div>

              {/* Footer Right */}
              <div className="text-sm font-black text-black">
                {building?.name ? `PRÉDIO: ${building.name.toUpperCase()}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
