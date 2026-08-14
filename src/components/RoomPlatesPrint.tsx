import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { 
  Download, Printer, ArrowLeft, ArrowRight, ArrowUp, CheckCircle, 
  Eye, RefreshCw, Plus, Trash2, Sparkles, X, FileText, Layers, 
  LayoutTemplate, Palette, Check, Edit3, ArrowDown
} from "lucide-react";
import { BuildingInfo, RoomDetails } from "../types";
import PlateCanvasEditor, { CanvasElement, PlateTemplate } from "./PlateCanvasEditor";

export interface PlateItem {
  id: string;
  type: "class" | "arrow" | "custom" | "special";
  title: string;
  subTitle?: string;
  icon?: string;
  direction?: "left" | "right" | "straight" | "down" | "none";
  canvasElements?: CanvasElement[];
  bgStyle?: "white" | "light-gray" | "timbre";
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
  // Visual Mode: "list" (standard queue) or "canvas" (WYSIWYG visual editor)
  const [activeSubView, setActiveSubView] = useState<"list" | "canvas">("list");
  
  // Default background mode is WHITE as requested
  const [bgMode, setBgMode] = useState<"white" | "timbre">("white");

  const [plates, setPlates] = useState<PlateItem[]>([
    { id: "1", type: "class", title: "SALA 01", subTitle: "BLOCO A • TÉRREO" },
    { id: "2", type: "class", title: "SALA 02", subTitle: "BLOCO A • TÉRREO" },
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
  const [customDir, setCustomDir] = useState<"left" | "right" | "straight" | "down" | "none">("none");

  // Background Image State for optional AvisosEnem.jpg
  const [bgImageBase64, setBgImageBase64] = useState<string>("");
  const [isBgLoaded, setIsBgLoaded] = useState<boolean>(false);
  const [previewPlate, setPreviewPlate] = useState<PlateItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");

  // Load Model/AvisosEnem.jpg and convert to base64 for optional timbre
  useEffect(() => {
    const loadBgImage = async () => {
      try {
        let res = await fetch('/Model/AvisosEnem.jpg');
        if (!res.ok) {
          res = await fetch('/AvisosEnem.jpg');
        }
        if (res.ok) {
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            setBgImageBase64(base64data);
            setIsBgLoaded(true);
          };
          reader.readAsDataURL(blob);
        }
      } catch (err) {
        console.warn("Imagem de timbre AvisosEnem.jpg opcional:", err);
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
          subTitle: r.floor ? `BLOCO / ANDAR: ${r.floor}` : undefined
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
    setToastMessage("Placas sincronizadas com sucesso a partir das salas cadastradas!");
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Add custom plate from quick form
  const addCustomPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newItem: PlateItem = {
      id: Date.now().toString(),
      type: customType,
      title: customTitle.toUpperCase(),
      subTitle: customSubtitle || "ENEM • AVISO OFICIAL DE SINALIZAÇÃO",
      direction: customDir,
      bgStyle: bgMode === "timbre" ? "timbre" : "white"
    };

    setPlates([...plates, newItem]);
    setCustomTitle("");
    setCustomSubtitle("");
    setToastMessage("Nova placa adicionada à fila de impressão!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Save Plate created in Canvas Editor
  const handleSaveCanvasPlate = (plateData: {
    title: string;
    subTitle?: string;
    type: "class" | "arrow" | "custom" | "special";
    direction?: "left" | "right" | "straight" | "none";
    canvasElements?: CanvasElement[];
    bgStyle?: "white" | "light-gray" | "timbre";
  }) => {
    const newItem: PlateItem = {
      id: `canvas-${Date.now()}`,
      type: plateData.type,
      title: plateData.title,
      subTitle: plateData.subTitle,
      direction: plateData.direction,
      canvasElements: plateData.canvasElements,
      bgStyle: plateData.bgStyle || "white"
    };

    setPlates(prev => [newItem, ...prev]);
    setActiveSubView("list");
    setToastMessage("Placa criada no Canvas adicionada à fila com sucesso!");
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Batch apply a template to all building rooms
  const handleApplyTemplateToAllRooms = (template: PlateTemplate) => {
    const newPlates: PlateItem[] = [];

    const roomCount = (rooms && rooms.length > 0) ? rooms.length : (building?.roomsCount || 10);

    for (let i = 1; i <= roomCount; i++) {
      const roomNumStr = rooms && rooms[i - 1] ? rooms[i - 1].number : (i < 10 ? `0${i}` : `${i}`);
      const floorStr = rooms && rooms[i - 1]?.floor ? rooms[i - 1].floor : "Térreo";
      const roomTitle = `SALA ${roomNumStr}`;

      // Clone canvas elements and update main title and subtitle
      const updatedElements = template.elements.map(el => {
        if (el.id === "main-title" || (el.type === "text" && (el.fontSize || 0) >= 30)) {
          return { ...el, text: roomTitle };
        }
        if (el.id === "sub-title" || el.id === "sub-spec") {
          return { ...el, text: `CAPACIDADE: ${rooms[i - 1]?.capacity || building?.virtualCapacity || 30} CANDIDATOS • ${floorStr}` };
        }
        return el;
      });

      newPlates.push({
        id: `tpl-room-${i}-${Date.now()}`,
        type: "class",
        title: roomTitle,
        subTitle: `CAPACIDADE: ${rooms[i - 1]?.capacity || building?.virtualCapacity || 30} • ${floorStr}`,
        canvasElements: updatedElements,
        bgStyle: template.bgStyle || "white"
      });
    }

    // Keep special room plates and arrow plates
    newPlates.push(
      { id: `tpl-coord-${Date.now()}`, type: "special", title: "SALA DE COORDENAÇÃO", subTitle: "Acesso Restrito - Equipe CLA / ALA" },
      { id: `tpl-wc-${Date.now()}`, type: "arrow", title: "SANITÁRIOS / BANHEIROS", direction: "straight", subTitle: "Acesso Geral" }
    );

    setPlates(newPlates);
    setActiveSubView("list");
    setToastMessage(`Template aplicado com sucesso para ${roomCount} salas do prédio!`);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const removePlate = (id: string) => {
    setPlates(plates.filter(p => p.id !== id));
  };

  // Modern jsPDF design compiler - WHITE Background as DEFAULT
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

      // Check if plate or global mode has timbre requested
      const useTimbre = (plate.bgStyle === "timbre" || bgMode === "timbre") && Boolean(bgImageBase64);

      if (useTimbre) {
        // Draw Timbre Image (Model/AvisosEnem.jpg)
        try {
          doc.addImage(bgImageBase64, "JPEG", 0, 0, pageWidth, pageHeight);
        } catch (e) {
          console.warn("Could not render background image into PDF:", e);
        }
      } else {
        // DEFAULT WHITE BACKGROUND WITH CLEAN BORDERS & INSTITUTIONAL HEADER
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        // Top Subtle Accent Bar
        doc.setFillColor(2, 132, 199);
        doc.rect(0, 0, pageWidth, 6, "F");

        // Institutional Header Text
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(2, 132, 199);
        doc.text("EXAME NACIONAL DO ENSINO MÉDIO • SISTEMA DE SINALIZAÇÃO", 148.5, 14, { align: "center" });

        // Divider Line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(20, 18, 277, 18);
      }

      // If the plate has custom canvas elements, render them with coordinates
      if (plate.canvasElements && plate.canvasElements.length > 0) {
        plate.canvasElements.forEach(el => {
          const posX = (el.x / 100) * pageWidth;
          const posY = (el.y / 100) * pageHeight;
          const elWidth = el.width ? (el.width / 100) * pageWidth : 40;
          const elHeight = el.height ? (el.height / 100) * pageHeight : 20;

          if (el.type === "text" && el.text) {
            doc.setFont("Helvetica", el.fontWeight === "normal" ? "normal" : "bold");
            const fontSizePt = Math.max(10, Math.round((el.fontSize || 24) * 0.45));
            doc.setFontSize(fontSizePt);

            const hex = el.textColor || "#000000";
            const r = parseInt(hex.slice(1, 3), 16) || 0;
            const g = parseInt(hex.slice(3, 5), 16) || 0;
            const b = parseInt(hex.slice(5, 7), 16) || 0;
            doc.setTextColor(r, g, b);

            doc.text(el.textTransform === "uppercase" ? el.text.toUpperCase() : el.text, posX, posY, {
              align: el.textAlign || "center"
            });
          }

          if (el.type === "badge" && el.text) {
            const leftX = posX - elWidth / 2;
            const topY = posY - elHeight / 2;
            doc.setFillColor(224, 242, 254);
            doc.setDrawColor(56, 189, 248);
            doc.setLineWidth(0.8);
            doc.roundedRect(leftX, topY, elWidth, elHeight, 3, 3, "FD");

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(Math.max(9, Math.round((el.fontSize || 14) * 0.45)));
            doc.setTextColor(2, 132, 199);
            doc.text(el.text.toUpperCase(), posX, topY + elHeight / 2 + 2, { align: "center" });
          }

          if (el.type === "arrow") {
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(2, 132, 199);
            if (el.text) {
              doc.text(el.text.toUpperCase(), posX, posY + 12, { align: "center" });
            }

            doc.setLineWidth(2.5);
            doc.setDrawColor(2, 132, 199);
            doc.setFillColor(56, 189, 248);

            if (el.arrowDirection === "right") {
              doc.triangle(posX + 25, posY - 8, posX + 25, posY + 8, posX + 40, posY, "F");
              doc.line(posX - 35, posY, posX + 25, posY);
            } else if (el.arrowDirection === "left") {
              doc.triangle(posX - 25, posY - 8, posX - 25, posY + 8, posX - 40, posY, "F");
              doc.line(posX - 25, posY, posX + 35, posY);
            } else if (el.arrowDirection === "straight") {
              doc.triangle(posX - 8, posY - 15, posX + 8, posY - 15, posX, posY - 28, "F");
              doc.line(posX, posY - 15, posX, posY + 8);
            }
          }

          if (el.type === "attendance_box" && el.text) {
            const leftX = posX - elWidth / 2;
            const topY = posY - elHeight / 2;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.8);
            doc.roundedRect(leftX, topY, elWidth, elHeight, 2, 2, "FD");

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(el.text, posX, topY + 5, { align: "center" });
            doc.setLineWidth(0.4);
            doc.line(leftX, topY + 7, leftX + elWidth, topY + 7);
          }

          if (el.type === "shape" && el.text) {
            const leftX = posX - elWidth / 2;
            const topY = posY - elHeight / 2;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.6);
            doc.roundedRect(leftX, topY, elWidth, elHeight, 3, 3, "FD");

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            const lines = el.text.split("\n");
            lines.forEach((line, lIdx) => {
              doc.text(line, posX, topY + 6 + lIdx * 5, { align: "center" });
            });
          }
        });
      } else {
        // Standard Plate Rendering
        // Central Main Title
        doc.setFont("Helvetica", "bold");
        
        let fontSize = 68;
        if (plate.title.length > 15) fontSize = 52;
        if (plate.title.length > 25) fontSize = 38;
        if (plate.title.length > 35) fontSize = 28;

        doc.setFontSize(fontSize);
        doc.setTextColor(15, 23, 42); // Black / Dark Slate
        
        const mainY = plate.direction && plate.direction !== "none" ? 82 : (plate.subTitle ? 95 : 102);
        doc.text(plate.title, 148.5, mainY, { align: "center" });

        // Directional Arrow with Light Blue Accent
        if (plate.direction && plate.direction !== "none") {
          doc.setLineWidth(3);
          doc.setDrawColor(14, 165, 233);
          doc.setFillColor(56, 189, 248);

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
          doc.setTextColor(14, 165, 233);
          doc.text("FLUXO INDICATIVO DE CORREDOR", 148.5, 135, { align: "center" });
        }

        // Subtitle Text
        if (plate.subTitle) {
          const subY = plate.direction && plate.direction !== "none" ? 155 : 142;

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(51, 65, 85);
          doc.text(plate.subTitle, 148.5, subY, { align: "center" });
        }

        // Presentes 1º Dia & Presentes 2º Dia Boxes (Bottom-Left Corner)
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
      }

      // Building info in footer
      if (building?.name) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`PRÉDIO: ${building.name.toUpperCase()}`, 148.5, 198, { align: "center" });
      }
    });

    doc.save("placas_sinalizacao_enem_brancas.pdf");
  };

  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="plates-print-selector">
      
      {/* VIEW SUB-NAV: QUEUE LIST vs CANVAS EDITOR */}
      <div className="bg-white dark:bg-[#0c1220]/90 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView("list")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeSubView === "list"
                ? "bg-sky-600 text-white shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fila de Placas & Impressão ({plates.length})</span>
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setActiveSubView("canvas")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeSubView === "canvas"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-500/30"
              }`}
            >
              <LayoutTemplate className="w-4 h-4 text-emerald-500" />
              <span>Editor Visual de Templates (Canvas)</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-mono">NOVO</span>
            </button>
          )}
        </div>

        {/* DEFAULT BACKGROUND MODE SELECTOR (WHITE DEFAULT) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span>Fundo Padrão:</span>
          </span>
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setBgMode("white")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                bgMode === "white"
                  ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-300"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Fundo Branco (Recomendado)</span>
            </button>

            <button
              type="button"
              onClick={() => setBgMode("timbre")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                bgMode === "timbre"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Utilizar imagem Model/AvisosEnem.jpg de fundo"
            >
              <span>Timbre Oficial</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SUB-VIEW 1: CANVAS-BASED VISUAL EDITOR */}
      {activeSubView === "canvas" && (
        <PlateCanvasEditor
          onSavePlate={handleSaveCanvasPlate}
          onApplyTemplateToAllRooms={handleApplyTemplateToAllRooms}
          onClose={() => setActiveSubView("list")}
          building={building}
          rooms={rooms}
        />
      )}

      {/* SUB-VIEW 2: MAIN QUEUE LIST & COMPILER */}
      {activeSubView === "list" && (
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300">
          
          {/* HEADER BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
                <span>🖨️ Placas e Sinalizações de Portas</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>FUNDO BRANCO PADRÃO</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Letreiros nítidos com <strong>fundo branco padrão</strong>, caixas de presença "Presentes 1º/2º Dia" e suporte ao <strong>Editor Visual Canvas</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setActiveSubView("canvas")}
                  className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/30 hover:bg-emerald-100 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LayoutTemplate className="w-4 h-4 text-emerald-600" />
                  <span>Criar no Canvas</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSyncWithBuilding}
                className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Sincronizar placas com as salas cadastradas no prédio"
              >
                <RefreshCw className="w-4 h-4 text-sky-500" />
                <span>Sincronizar Salas</span>
              </button>

              <button
                type="button"
                onClick={handleNativePrint}
                className="px-3.5 py-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-2 border-sky-400/40 rounded-xl text-xs font-bold transition hover:bg-sky-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-500" />
                <span>Imprimir Navegador</span>
              </button>

              <button
                type="button"
                onClick={generatePdf}
                className="btn-3d bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-5 py-2.5 font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>BAIXAR PDF COMPLETO ({plates.length})</span>
              </button>
            </div>
          </div>

          {/* STATUS BANNER */}
          <div className="mb-6 p-3.5 bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs font-bold text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                Visualização e PDF configurados para <strong>Fundo Branco Padrão</strong> de alta legibilidade.
              </span>
            </div>
            <span className="text-[10px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-0.5 rounded-full font-mono font-extrabold">
              A4 PAISAGEM • {plates.length} PLACAS
            </span>
          </div>

          {/* MAIN LAYOUT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: QUICK ADD PLATE FORM & CANVAS SHORTCUT */}
            <div className="bg-slate-50 dark:bg-[#070b13]/60 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#cbd5e1] dark:shadow-[4px_4px_0px_0px_#1e293b] space-y-4">
              
              {!readOnly && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border-2 border-emerald-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>Editor Visual Estilo Canvas</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Deseja mover elementos livremente, adicionar logos, mudar fontes ou criar templates reutilizáveis?
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSubView("canvas")}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Abrir Editor Visual Canvas</span>
                  </button>
                </div>
              )}

              {readOnly ? (
                <div className="space-y-4">
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1">
                    <span>✨</span> Letreiros & Placas
                  </h3>
                  <div className="p-3.5 bg-sky-500/10 border-2 border-sky-400/30 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold leading-relaxed space-y-2">
                    <p>ℹ️ <strong>Modo de Leitura Ativo (ALA):</strong></p>
                    <p className="font-normal text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Como assistente ALA, você pode compilar o PDF e visualizar os modelos de placa em fundo branco, mas a criação ou exclusão de placas e templates é restrita ao CLA.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1">
                    <span>⚡</span> Adicionar Placa Rápida
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
                        className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-400 text-xs font-semibold"
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
                        className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-400 text-xs font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          Tipo de Placa
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
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>INCLUIR NO LOTE DE IMPRESSÃO</span>
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* RIGHT COLUMN: LIVE LIST OF PLATES WITH CRISP WHITE BACKGROUND PREVIEW */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-display font-black text-slate-850 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2">
                  <span>Fila de Placas Prontas para Impressão</span>
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {plates.length}
                  </span>
                </h3>

                <span className="text-[10px] font-bold text-slate-400">
                  Clique em "Ver Placa" para visualizar o modelo A4
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
                {plates.map((plate) => {
                  const isTimbre = (plate.bgStyle === "timbre" || bgMode === "timbre") && Boolean(bgImageBase64);

                  return (
                    <div
                      key={plate.id}
                      className="relative p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-2xl shadow-md flex flex-col justify-between transition hover:shadow-lg overflow-hidden group"
                      style={
                        isTimbre
                          ? {
                              backgroundImage: `url('/Model/AvisosEnem.jpg'), url('/AvisosEnem.jpg')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : undefined
                      }
                    >
                      {/* Translucent overlay only if timbre is active */}
                      {isTimbre && (
                        <div className="absolute inset-0 bg-white/85 dark:bg-slate-950/80 backdrop-blur-[1px]" />
                      )}

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          {/* Highlight Badge */}
                          <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border shadow-2xs tracking-wider ${
                            plate.type === "special"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : plate.type === "arrow"
                              ? "bg-sky-100 text-sky-800 border-sky-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}>
                            {plate.type === "class" ? "Sala de Prova" : plate.type === "special" ? "Setor Especial" : "Direção"}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewPlate(plate)}
                              className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 bg-emerald-100 dark:bg-emerald-900/60 p-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1"
                              title="Visualizar modelo A4"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Ver Placa</span>
                            </button>

                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removePlate(plate.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg text-xs font-bold cursor-pointer transition"
                                title="Remover placa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* MAIN TITLE IN BOLD BLACK FONT */}
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight leading-tight">
                          {plate.title}
                        </h4>

                        {/* SUBTITLE */}
                        {plate.subTitle && (
                          <div className="mt-2">
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-extrabold tracking-wide">
                              {plate.subTitle}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* DIRECTION ARROW & PRESENTES BOXES HIGHLIGHT */}
                      <div className="relative z-10 flex items-center justify-between mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
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
                            {plate.direction === "left" && <><ArrowLeft className="w-3.5 h-3.5 stroke-[3]" /> ESQUERDA</>}
                            {plate.direction === "right" && <><ArrowRight className="w-3.5 h-3.5 stroke-[3]" /> DIREITA</>}
                            {plate.direction === "straight" && <><ArrowUp className="w-3.5 h-3.5 stroke-[3]" /> EM FRENTE</>}
                            {plate.direction === "down" && <><ArrowDown className="w-3.5 h-3.5 stroke-[3]" /> DESCER</>}
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-slate-500">
                            Sinalização de Porta
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Printer className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>
                    O lote contém <strong>{plates.length} placas formatadas</strong> prontas para download ou impressão direta no navegador.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={generatePdf}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  Baixar PDF
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* FULL A4 LANDSCAPE PREVIEW MODAL (WHITE BACKGROUND DEFAULT) */}
      {previewPlate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border-2 border-emerald-500 animate-fade-in relative space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    Pré-visualização do Modelo de Placa A4
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Fundo Branco Padrão de Alta Legibilidade • Caixas de Frequência "Presentes 1º e 2º Dia"
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewPlate(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* A4 LANDSCAPE PREVIEW CANVAS */}
            <div className="flex justify-center my-4">
              <div 
                className="w-full max-w-2xl aspect-[1.414/1] rounded-2xl p-8 border-4 border-slate-300 dark:border-slate-700 bg-white shadow-2xl flex flex-col justify-between relative overflow-hidden text-slate-900"
              >
                {/* Top Institutional Header */}
                <div className="border-b-2 border-sky-600/30 pb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider">
                    ENEM • EXAME NACIONAL DO ENSINO MÉDIO
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    SINALIZAÇÃO OFICIAL DE LOCAL DE PROVA
                  </span>
                </div>

                {/* Central Title */}
                <div className="my-auto text-center py-4">
                  <h2 className="text-5xl md:text-6xl font-black text-slate-900 font-display tracking-tight uppercase">
                    {previewPlate.title}
                  </h2>

                  {previewPlate.direction && previewPlate.direction !== "none" && (
                    <div className="mt-4 flex justify-center">
                      <div className="text-sky-600 font-mono text-base font-black flex items-center gap-2">
                        {previewPlate.direction === "left" && <><ArrowLeft className="w-6 h-6 stroke-[3]" /> SIGA À ESQUERDA</>}
                        {previewPlate.direction === "right" && <><ArrowRight className="w-6 h-6 stroke-[3]" /> SIGA À DIREITA</>}
                        {previewPlate.direction === "straight" && <><ArrowUp className="w-6 h-6 stroke-[3]" /> SIGA EM FRENTE</>}
                        {previewPlate.direction === "down" && <><ArrowDown className="w-6 h-6 stroke-[3]" /> DESCER ESCADA</>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtitle Text */}
                {previewPlate.subTitle && (
                  <div className="text-center pb-2">
                    <p className="text-base font-black text-slate-700 uppercase tracking-wide">
                      {previewPlate.subTitle}
                    </p>
                  </div>
                )}

                {/* Bottom Row: Left Attendance Boxes + Right Building Info */}
                <div className="mt-2 flex justify-between items-end border-t border-slate-200 pt-3">
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

                  <span className="text-[11px] font-black text-slate-700">
                    {building?.name ? `PRÉDIO: ${building.name.toUpperCase()}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewPlate(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Fechar Visualização
              </button>

              <button
                type="button"
                onClick={() => {
                  generatePdf();
                  setPreviewPlate(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>BAIXAR PDF COMPLETO</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HIDDEN BROWSER PRINT TEMPLATE FOR DIRECT window.print() (WHITE BACKGROUND DEFAULT) */}
      <div className="hidden print:block font-sans bg-white text-black">
        {plates.map((plate) => (
          <div 
            key={`print-${plate.id}`}
            className="w-full h-screen p-12 flex flex-col justify-between page-break-after-always relative bg-white text-black"
          >
            {/* Top Institutional Header */}
            <div className="border-b-2 border-sky-600 pb-2 flex items-center justify-between">
              <span className="text-sm font-black text-sky-700 uppercase tracking-wider">
                ENEM • EXAME NACIONAL DO ENSINO MÉDIO
              </span>
              <span className="text-xs font-bold text-slate-600">
                SINALIZAÇÃO OFICIAL DE LOCAL DE PROVA
              </span>
            </div>

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
                    {plate.direction === "down" && <><ArrowDown className="w-8 h-8 stroke-[3]" /> DESCER ESCADA</>}
                  </div>
                </div>
              )}
            </div>

            {/* Subtitle */}
            {plate.subTitle && (
              <div className="text-center pb-6">
                <p className="text-2xl font-black text-slate-800 uppercase tracking-wide">
                  {plate.subTitle}
                </p>
              </div>
            )}

            {/* Bottom Row */}
            <div className="flex justify-between items-end pt-4 border-t-2 border-slate-300">
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
