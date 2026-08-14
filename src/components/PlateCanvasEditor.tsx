import React, { useState, useRef, useEffect } from "react";
import { 
  Type, Move, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, 
  Square, CheckSquare, Plus, Trash2, Copy, Eye, Download, 
  Sparkles, Save, RotateCcw, LayoutTemplate, Layers, 
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  HelpCircle, Check, X, ShieldAlert, DoorOpen, Users, 
  Accessibility, Coffee, PhoneOff, Clock, FileCheck, Maximize2, Sliders
} from "lucide-react";
import { jsPDF } from "jspdf";
import { BuildingInfo, RoomDetails } from "../types";

export interface CanvasElement {
  id: string;
  type: "text" | "arrow" | "attendance_box" | "badge" | "shape" | "icon";
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width?: number; // percentage 0 - 100
  height?: number; // percentage 0 - 100
  text?: string;
  subText?: string;
  fontSize?: number; // px inside canvas standard 800px width
  fontWeight?: "normal" | "bold" | "black";
  fontStyle?: "normal" | "italic";
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  textTransform?: "uppercase" | "none";
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  arrowDirection?: "left" | "right" | "straight" | "down";
  arrowColor?: string;
  iconName?: string;
  zIndex?: number;
}

export interface PlateTemplate {
  id: string;
  name: string;
  description: string;
  category: "sala" | "direcional" | "especial" | "coordenacao" | "aviso" | "custom";
  isCustom?: boolean;
  bgStyle: "white" | "light-gray" | "timbre";
  elements: CanvasElement[];
}

export const DEFAULT_TEMPLATES: PlateTemplate[] = [
  {
    id: "tpl-sala-padrao",
    name: "Sala de Prova Padrão",
    description: "Fundo branco limpo, título principal em destaque, caixas de presentes e identificação de prédio.",
    category: "sala",
    bgStyle: "white",
    elements: [
      {
        id: "badge-top",
        type: "badge",
        x: 50,
        y: 12,
        width: 32,
        height: 7,
        text: "ENEM • EXAME NACIONAL",
        textColor: "#0284c7",
        bgColor: "#e0f2fe",
        borderColor: "#38bdf8",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: "black",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "main-title",
        type: "text",
        x: 50,
        y: 42,
        text: "SALA 01",
        fontSize: 64,
        fontWeight: "black",
        textColor: "#0f172a",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "sub-title",
        type: "text",
        x: 50,
        y: 62,
        text: "CAPACIDADE: 30 CANDIDATOS • BLOCO A - TÉRREO",
        fontSize: 16,
        fontWeight: "bold",
        textColor: "#334155",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "att-box-1",
        type: "attendance_box",
        x: 18,
        y: 84,
        width: 26,
        height: 18,
        text: "Presentes 1º Dia",
        textColor: "#000000",
        bgColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
        borderRadius: 6
      },
      {
        id: "att-box-2",
        type: "attendance_box",
        x: 46,
        y: 84,
        width: 26,
        height: 18,
        text: "Presentes 2º Dia",
        textColor: "#000000",
        bgColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
        borderRadius: 6
      },
      {
        id: "footer-text",
        type: "text",
        x: 80,
        y: 89,
        text: "LOCAL DE PROVA OFICIAL",
        fontSize: 12,
        fontWeight: "bold",
        textColor: "#64748b",
        textAlign: "right",
        textTransform: "uppercase"
      }
    ]
  },
  {
    id: "tpl-direcional",
    name: "Sinalização Direcional de Corredor",
    description: "Indicação direcional de salas e corredores com seta de alto impacto e fundo branco.",
    category: "direcional",
    bgStyle: "white",
    elements: [
      {
        id: "badge-dir",
        type: "badge",
        x: 50,
        y: 14,
        width: 36,
        height: 7,
        text: "FLUXO DE CANDIDATOS",
        textColor: "#0369a1",
        bgColor: "#f0f9ff",
        borderColor: "#7dd3fc",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: "black",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "title-dir",
        type: "text",
        x: 50,
        y: 36,
        text: "SALAS 01 A 08",
        fontSize: 54,
        fontWeight: "black",
        textColor: "#0f172a",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "arrow-element",
        type: "arrow",
        x: 50,
        y: 60,
        width: 50,
        height: 16,
        arrowDirection: "right",
        text: "SIGA À DIREITA NO CORREDOR",
        arrowColor: "#0284c7",
        textColor: "#0369a1",
        fontSize: 18,
        fontWeight: "black"
      },
      {
        id: "sub-dir",
        type: "text",
        x: 50,
        y: 84,
        text: "ACESSO ÀS SALAS DE PROVA E SANITÁRIOS",
        fontSize: 15,
        fontWeight: "bold",
        textColor: "#475569",
        textAlign: "center",
        textTransform: "uppercase"
      }
    ]
  },
  {
    id: "tpl-especial",
    name: "Atendimento Especializado / Acessibilidade",
    description: "Placa com ícone de acessibilidade, Libras, Ledor e regras específicas de suporte.",
    category: "especial",
    bgStyle: "white",
    elements: [
      {
        id: "badge-spec",
        type: "badge",
        x: 50,
        y: 12,
        width: 44,
        height: 7.5,
        text: "ACESSIBILIDADE & SUPORTE CEBRASPE",
        textColor: "#047857",
        bgColor: "#ecfdf5",
        borderColor: "#34d399",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: "black",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "icon-spec",
        type: "icon",
        x: 50,
        y: 28,
        iconName: "accessibility",
        textColor: "#059669",
        fontSize: 32
      },
      {
        id: "title-spec",
        type: "text",
        x: 50,
        y: 48,
        text: "ATENDIMENTO ESPECIALIZADO",
        fontSize: 38,
        fontWeight: "black",
        textColor: "#064e3b",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "sub-spec",
        type: "text",
        x: 50,
        y: 65,
        text: "SALA COM RECURSOS DE LIBRAS • LEDOR • TEMPO ADICIONAL",
        fontSize: 15,
        fontWeight: "bold",
        textColor: "#065f46",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "att-box-1-spec",
        type: "attendance_box",
        x: 18,
        y: 84,
        width: 26,
        height: 18,
        text: "Presentes 1º Dia",
        textColor: "#000000",
        bgColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
        borderRadius: 6
      },
      {
        id: "att-box-2-spec",
        type: "attendance_box",
        x: 46,
        y: 84,
        width: 26,
        height: 18,
        text: "Presentes 2º Dia",
        textColor: "#000000",
        bgColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
        borderRadius: 6
      }
    ]
  },
  {
    id: "tpl-coordenacao",
    name: "Sala de Coordenação (Acesso Restrito)",
    description: "Placa institucional para sala da equipe CLA/ALA com aviso de segurança.",
    category: "coordenacao",
    bgStyle: "white",
    elements: [
      {
        id: "badge-coord",
        type: "badge",
        x: 50,
        y: 14,
        width: 48,
        height: 8,
        text: "ACESSO RESTRITO • EQUIPE DE COORDENAÇÃO",
        textColor: "#b91c1c",
        bgColor: "#fef2f2",
        borderColor: "#f87171",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: "black",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "title-coord",
        type: "text",
        x: 50,
        y: 44,
        text: "COORDENAÇÃO DE LOCAL",
        fontSize: 46,
        fontWeight: "black",
        textColor: "#7f1d1d",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "sub-coord",
        type: "text",
        x: 50,
        y: 64,
        text: "COORDENADORES DE LOCAL (CLA) E ASSISTENTES (ALA)",
        fontSize: 16,
        fontWeight: "bold",
        textColor: "#991b1b",
        textAlign: "center",
        textTransform: "uppercase"
      },
      {
        id: "alert-box",
        type: "shape",
        x: 50,
        y: 83,
        width: 80,
        height: 14,
        text: "⚠️ PROIBIDA A ENTRADA DE CANDIDATOS SEM AUTORIZAÇÃO",
        textColor: "#7f1d1d",
        bgColor: "#fee2e2",
        borderColor: "#ef4444",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: "black",
        textAlign: "center"
      }
    ]
  },
  {
    id: "tpl-sanitarios",
    name: "Sanitários & Bebedouros",
    description: "Sinalização para banheiros e pontos de hidratação no prédio.",
    category: "aviso",
    bgStyle: "white",
    elements: [
      {
        id: "badge-wc",
        type: "badge",
        x: 50,
        y: 14,
        width: 32,
        height: 7,
        text: "ÁREA DE CONVIVÊNCIA",
        textColor: "#0f766e",
        bgColor: "#f0fdfa",
        borderColor: "#5eead4",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: "black",
        textAlign: "center"
      },
      {
        id: "title-wc",
        type: "text",
        x: 50,
        y: 40,
        text: "SANITÁRIOS",
        fontSize: 56,
        fontWeight: "black",
        textColor: "#134e4a",
        textAlign: "center"
      },
      {
        id: "arrow-wc",
        type: "arrow",
        x: 50,
        y: 62,
        width: 44,
        height: 15,
        arrowDirection: "straight",
        text: "SIGA EM FRENTE",
        arrowColor: "#0d9488",
        textColor: "#115e59",
        fontSize: 16,
        fontWeight: "black"
      },
      {
        id: "sub-wc",
        type: "text",
        x: 50,
        y: 84,
        text: "MASCULINO • FEMININO • ACESSIBILIDADE PCD",
        fontSize: 15,
        fontWeight: "bold",
        textColor: "#115e59",
        textAlign: "center"
      }
    ]
  },
  {
    id: "tpl-horarios-normas",
    name: "Avisos de Prova & Horários",
    description: "Quadro de horários e regras (celular desligado, fechamento dos portões).",
    category: "aviso",
    bgStyle: "white",
    elements: [
      {
        id: "badge-normas",
        type: "badge",
        x: 50,
        y: 12,
        width: 42,
        height: 7,
        text: "ORIENTAÇÕES AOS CANDIDATOS",
        textColor: "#c2410c",
        bgColor: "#fff7ed",
        borderColor: "#fb923c",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: "black",
        textAlign: "center"
      },
      {
        id: "title-normas",
        type: "text",
        x: 50,
        y: 34,
        text: "HORÁRIOS & REGRAS",
        fontSize: 44,
        fontWeight: "black",
        textColor: "#7c2d12",
        textAlign: "center"
      },
      {
        id: "box-times",
        type: "shape",
        x: 28,
        y: 62,
        width: 40,
        height: 28,
        text: "PORTÕES: 12h às 13h\nINÍCIO: 13h30\nCANETA PRETA OBRIGATÓRIA",
        textColor: "#0f172a",
        bgColor: "#f8fafc",
        borderColor: "#cbd5e1",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center"
      },
      {
        id: "box-cell",
        type: "shape",
        x: 72,
        y: 62,
        width: 40,
        height: 28,
        text: "📵 CELULARES DESLIGADOS\nE LACRADOS NO ENVELOPE\nPORTA-OBJETOS",
        textColor: "#991b1b",
        bgColor: "#fef2f2",
        borderColor: "#fca5a5",
        borderWidth: 2,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: "black",
        textAlign: "center"
      },
      {
        id: "footer-normas",
        type: "text",
        x: 50,
        y: 90,
        text: "O NÃO CUMPRIMENTO DAS REGRAS ACARRETA ELIMINAÇÃO IMEDIATA",
        fontSize: 12,
        fontWeight: "black",
        textColor: "#dc2626",
        textAlign: "center"
      }
    ]
  }
];

interface PlateCanvasEditorProps {
  onSavePlate: (plateData: {
    title: string;
    subTitle?: string;
    type: "class" | "arrow" | "custom" | "special";
    direction?: "left" | "right" | "straight" | "none";
    canvasElements?: CanvasElement[];
    bgStyle?: "white" | "light-gray" | "timbre";
  }) => void;
  onApplyTemplateToAllRooms?: (template: PlateTemplate) => void;
  onClose?: () => void;
  building?: BuildingInfo | null;
  rooms?: RoomDetails[];
  initialTemplate?: PlateTemplate | null;
}

export default function PlateCanvasEditor({
  onSavePlate,
  onApplyTemplateToAllRooms,
  onClose,
  building,
  rooms = [],
  initialTemplate
}: PlateCanvasEditorProps) {
  // Canvas State
  const [elements, setElements] = useState<CanvasElement[]>(
    initialTemplate ? initialTemplate.elements : DEFAULT_TEMPLATES[0].elements
  );
  const [selectedId, setSelectedId] = useState<string | null>("main-title");
  const [bgStyle, setBgStyle] = useState<"white" | "light-gray" | "timbre">(
    initialTemplate?.bgStyle || "white"
  );
  const [customTemplates, setCustomTemplates] = useState<PlateTemplate[]>(() => {
    try {
      const saved = localStorage.getItem("enem_custom_plate_templates");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [applyBatchSuccessMsg, setApplyBatchSuccessMsg] = useState("");

  // Canvas Dragging State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const selectedElement = elements.find(el => el.id === selectedId);

  // Sync element updates
  const updateSelected = (updates: Partial<CanvasElement>) => {
    if (!selectedId) return;
    setElements(prev =>
      prev.map(el => (el.id === selectedId ? { ...el, ...updates } : el))
    );
  };

  // Add new element to canvas
  const addElement = (type: CanvasElement["type"]) => {
    const newId = `elem-${Date.now()}`;
    let newEl: CanvasElement;

    switch (type) {
      case "text":
        newEl = {
          id: newId,
          type: "text",
          x: 50,
          y: 50,
          text: "NOVO TEXTO / SALA",
          fontSize: 36,
          fontWeight: "black",
          textColor: "#0f172a",
          textAlign: "center",
          textTransform: "uppercase"
        };
        break;
      case "arrow":
        newEl = {
          id: newId,
          type: "arrow",
          x: 50,
          y: 50,
          width: 44,
          height: 14,
          arrowDirection: "right",
          text: "SIGA À DIREITA",
          arrowColor: "#0284c7",
          textColor: "#0369a1",
          fontSize: 16,
          fontWeight: "black"
        };
        break;
      case "attendance_box":
        newEl = {
          id: newId,
          type: "attendance_box",
          x: 50,
          y: 80,
          width: 26,
          height: 18,
          text: "Presentes 1º Dia",
          textColor: "#000000",
          bgColor: "#ffffff",
          borderColor: "#000000",
          borderWidth: 2,
          borderRadius: 6
        };
        break;
      case "badge":
        newEl = {
          id: newId,
          type: "badge",
          x: 50,
          y: 15,
          width: 36,
          height: 7.5,
          text: "ETIQUETA OFICIAL",
          textColor: "#0284c7",
          bgColor: "#e0f2fe",
          borderColor: "#38bdf8",
          borderWidth: 2,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: "black",
          textAlign: "center",
          textTransform: "uppercase"
        };
        break;
      case "shape":
        newEl = {
          id: newId,
          type: "shape",
          x: 50,
          y: 50,
          width: 50,
          height: 20,
          text: "AVISO OU QUADRO",
          textColor: "#0f172a",
          bgColor: "#f8fafc",
          borderColor: "#cbd5e1",
          borderWidth: 2,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: "bold",
          textAlign: "center"
        };
        break;
      case "icon":
        newEl = {
          id: newId,
          type: "icon",
          x: 50,
          y: 30,
          iconName: "door",
          textColor: "#0284c7",
          fontSize: 32
        };
        break;
      default:
        return;
    }

    setElements([...elements, newEl]);
    setSelectedId(newId);
  };

  // Delete selected
  const deleteSelected = () => {
    if (!selectedId) return;
    setElements(elements.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  // Duplicate selected
  const duplicateSelected = () => {
    if (!selectedElement) return;
    const newEl: CanvasElement = {
      ...selectedElement,
      id: `elem-${Date.now()}`,
      x: Math.min(90, selectedElement.x + 4),
      y: Math.min(90, selectedElement.y + 4)
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  // Dragging logic on canvas
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    setIsDragging(true);

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const el = elements.find(item => item.id === id);
    if (!el) return;

    const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    setDragOffset({
      x: mouseXPercent - el.x,
      y: mouseYPercent - el.y
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !selectedId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let newX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x;
    let newY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y;

    // Boundaries 5% to 95%
    newX = Math.max(5, Math.min(95, Math.round(newX * 10) / 10));
    newY = Math.max(5, Math.min(95, Math.round(newY * 10) / 10));

    updateSelected({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Save current layout as a custom template
  const handleSaveCustomTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTpl: PlateTemplate = {
      id: `custom-tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      description: "Template personalizado criado no Editor Visual de Placas pelo CLA.",
      category: "custom",
      isCustom: true,
      bgStyle: bgStyle,
      elements: JSON.parse(JSON.stringify(elements))
    };

    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    localStorage.setItem("enem_custom_plate_templates", JSON.stringify(updated));
    setNewTemplateName("");
    setSaveSuccessMsg("Template salvo com sucesso!");
    setTimeout(() => setSaveSuccessMsg(""), 3000);
  };

  // Delete custom template
  const handleDeleteCustomTemplate = (tplId: string) => {
    const updated = customTemplates.filter(t => t.id !== tplId);
    setCustomTemplates(updated);
    localStorage.setItem("enem_custom_plate_templates", JSON.stringify(updated));
  };

  // Load a template into the editor
  const loadTemplate = (tpl: PlateTemplate) => {
    setElements(JSON.parse(JSON.stringify(tpl.elements)));
    setBgStyle(tpl.bgStyle);
    setSelectedId(tpl.elements[0]?.id || null);
    setIsTemplateModalOpen(false);
  };

  // Apply this template to all building rooms in batch
  const handleApplyToAllRooms = () => {
    if (!onApplyTemplateToAllRooms) return;
    const currentTpl: PlateTemplate = {
      id: `active-tpl-${Date.now()}`,
      name: "Template Atual do Editor",
      description: "Template gerado no editor visual",
      category: "sala",
      bgStyle: bgStyle,
      elements: JSON.parse(JSON.stringify(elements))
    };
    onApplyTemplateToAllRooms(currentTpl);
    setApplyBatchSuccessMsg(`Template aplicado com sucesso para todas as salas (${rooms.length || building?.roomsCount || 0} salas)!`);
    setTimeout(() => setApplyBatchSuccessMsg(""), 4000);
  };

  // Save Plate to queue
  const handleSaveToQueue = () => {
    // Extract main title and subtitle from elements
    const mainTitleEl = elements.find(el => el.id === "main-title" || (el.type === "text" && (el.fontSize || 0) >= 30));
    const subTitleEl = elements.find(el => el.id === "sub-title" || (el.type === "text" && el.id !== mainTitleEl?.id));
    const arrowEl = elements.find(el => el.type === "arrow");
    const isSpecial = elements.some(el => el.text?.toLowerCase().includes("especial") || el.text?.toLowerCase().includes("acessibilidade"));

    const title = mainTitleEl?.text || "SINALIZAÇÃO PERSONALIZADA";
    const subTitle = subTitleEl?.text || (building?.name ? `PRÉDIO: ${building.name.toUpperCase()}` : undefined);
    const direction = arrowEl?.arrowDirection || "none";
    const type = arrowEl ? "arrow" : isSpecial ? "special" : "class";

    onSavePlate({
      title,
      subTitle,
      type,
      direction,
      canvasElements: elements,
      bgStyle
    });

    setSaveSuccessMsg("Placa salva e adicionada à fila de impressão!");
    setTimeout(() => {
      setSaveSuccessMsg("");
      if (onClose) onClose();
    }, 1200);
  };

  // Generate single plate PDF directly
  const handleExportSinglePdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 297;
    const pageHeight = 210;

    // 1. Background
    if (bgStyle === "white") {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    } else if (bgStyle === "light-gray") {
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    }

    // 2. Render each element based on coordinates (percent to mm)
    elements.forEach(el => {
      const posX = (el.x / 100) * pageWidth;
      const posY = (el.y / 100) * pageHeight;
      const elWidth = el.width ? (el.width / 100) * pageWidth : 40;
      const elHeight = el.height ? (el.height / 100) * pageHeight : 20;

      if (el.type === "text" && el.text) {
        doc.setFont("Helvetica", el.fontWeight === "normal" ? "normal" : "bold");
        const fontSizePt = Math.max(10, Math.round((el.fontSize || 24) * 0.45));
        doc.setFontSize(fontSizePt);

        // Convert hex color to rgb
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

    // Building footer if present
    if (building?.name) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`PRÉDIO: ${building.name.toUpperCase()}`, 148.5, 203, { align: "center" });
    }

    doc.save("placa_editor_canvas.pdf");
  };

  return (
    <div className="bg-white dark:bg-[#0c1220] rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6 animate-fade-in relative">
      
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
              <LayoutTemplate className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-display font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Editor Visual de Placas & Templates</span>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  CANVAS WYSIWYG
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Crie placas personalizadas ou templates arrastando elementos em tela branca padrão com proporção A4 paisagem.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Biblioteca de Templates</span>
          </button>

          {onApplyTemplateToAllRooms && (
            <button
              type="button"
              onClick={handleApplyToAllRooms}
              className="px-3.5 py-2 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-400/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Gerar placas de todas as salas cadastradas com este modelo"
            >
              <FileCheck className="w-4 h-4 text-sky-500" />
              <span>Aplicar em Todas as Salas ({rooms.length || building?.roomsCount || 0})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportSinglePdf}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Baixar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToQueue}
            className="btn-3d px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar na Fila de Impressão</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS NOTIFICATIONS */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {applyBatchSuccessMsg && (
        <div className="p-3 bg-sky-500/10 border-2 border-sky-500/30 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span>{applyBatchSuccessMsg}</span>
        </div>
      )}

      {/* EDITOR WORKSPACE: CANVAS + SIDEBAR TOOLS */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* LEFT / CENTER: INTERACTIVE CANVAS CONTAINER */}
        <div className="xl:col-span-3 space-y-3">
          
          {/* CANVAS CONTROLS TOP BAR */}
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex-wrap">
            
            {/* ADD ELEMENT BUTTONS */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-black text-slate-400 px-1">Adicionar:</span>
              <button
                type="button"
                onClick={() => addElement("text")}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <Type className="w-3.5 h-3.5 text-sky-500" />
                <span>Texto / Título</span>
              </button>

              <button
                type="button"
                onClick={() => addElement("arrow")}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Seta Direcional</span>
              </button>

              <button
                type="button"
                onClick={() => addElement("attendance_box")}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>Caixa Presentes</span>
              </button>

              <button
                type="button"
                onClick={() => addElement("badge")}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Etiqueta / Badge</span>
              </button>

              <button
                type="button"
                onClick={() => addElement("shape")}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <Square className="w-3.5 h-3.5 text-purple-500" />
                <span>Quadro de Aviso</span>
              </button>
            </div>

            {/* BACKGROUND MODE TOGGLE (WHITE DEFAULT) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black text-slate-400">Fundo:</span>
              <button
                type="button"
                onClick={() => setBgStyle("white")}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  bgStyle === "white"
                    ? "bg-white text-slate-900 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-transparent text-slate-500 border-slate-300 dark:border-slate-700"
                }`}
              >
                Branco (Padrão)
              </button>

              <button
                type="button"
                onClick={() => setBgStyle("light-gray")}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  bgStyle === "light-gray"
                    ? "bg-slate-100 text-slate-900 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-transparent text-slate-500 border-slate-300 dark:border-slate-700"
                }`}
              >
                Cinza Claro
              </button>
            </div>

          </div>

          {/* THE INTERACTIVE A4 CANVAS (LANDSCAPE RATIO 1.414 / 1) */}
          <div className="w-full flex justify-center bg-slate-200/70 dark:bg-[#060a12] p-4 sm:p-8 rounded-3xl border-2 border-slate-300/80 dark:border-slate-800 shadow-inner overflow-hidden">
            
            <div
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => {
                // Only deselect if directly clicked on the empty canvas background
                if (e.target === e.currentTarget) {
                  setSelectedId(null);
                }
              }}
              className={`w-full max-w-3xl aspect-[1.414/1] rounded-2xl shadow-2xl relative select-none cursor-crosshair border-2 transition-all ${
                bgStyle === "white" 
                  ? "bg-white border-slate-300" 
                  : bgStyle === "light-gray"
                  ? "bg-slate-50 border-slate-300"
                  : "bg-white border-sky-400"
              }`}
              style={{
                boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)"
              }}
            >
              {/* Subtle Grid dots for alignment */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-15 rounded-2xl"
                style={{
                  backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                  backgroundSize: "20px 20px"
                }}
              />

              {/* RENDER CANVAS ELEMENTS */}
              {elements.map((el) => {
                const isSelected = selectedId === el.id;

                return (
                  <div
                    key={el.id}
                    id={`canvas-elem-${el.id}`}
                    onPointerDown={(e) => handlePointerDown(e, el.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(el.id);
                    }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-all select-none ${
                      isSelected
                        ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 rounded-lg shadow-xl z-30"
                        : "hover:ring-2 hover:ring-sky-400/80 rounded-lg z-10"
                    }`}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: el.width ? `${el.width}%` : undefined,
                      height: el.height ? `${el.height}%` : undefined,
                    }}
                  >
                    {/* TYPE: TEXT */}
                    {el.type === "text" && (
                      <div
                        className="px-2 py-1 leading-tight select-none"
                        style={{
                          fontSize: `${el.fontSize ? el.fontSize * 0.45 : 18}px`,
                          fontWeight: el.fontWeight === "black" ? 900 : el.fontWeight === "bold" ? 700 : 400,
                          fontStyle: el.fontStyle || "normal",
                          color: el.textColor || "#0f172a",
                          textAlign: el.textAlign || "center",
                          textTransform: el.textTransform || "none",
                          letterSpacing: el.fontSize && el.fontSize > 40 ? "-0.03em" : "normal"
                        }}
                      >
                        {el.text || "Clique para editar"}
                      </div>
                    )}

                    {/* TYPE: BADGE */}
                    {el.type === "badge" && (
                      <div
                        className="w-full h-full flex items-center justify-center px-3 py-1 shadow-2xs"
                        style={{
                          backgroundColor: el.bgColor || "#e0f2fe",
                          borderColor: el.borderColor || "#38bdf8",
                          borderWidth: `${el.borderWidth || 2}px`,
                          borderStyle: "solid",
                          borderRadius: `${el.borderRadius || 8}px`,
                          color: el.textColor || "#0284c7",
                          fontSize: `${el.fontSize ? el.fontSize * 0.45 : 12}px`,
                          fontWeight: el.fontWeight === "black" ? 900 : 700,
                          textAlign: el.textAlign || "center",
                          textTransform: el.textTransform || "uppercase"
                        }}
                      >
                        {el.text || "BADGE"}
                      </div>
                    )}

                    {/* TYPE: ARROW */}
                    {el.type === "arrow" && (
                      <div className="flex flex-col items-center justify-center p-2 w-full">
                        <div 
                          className="flex items-center justify-center gap-2 font-mono"
                          style={{
                            color: el.arrowColor || "#0284c7",
                            fontSize: `${el.fontSize ? el.fontSize * 0.45 : 14}px`,
                            fontWeight: el.fontWeight === "black" ? 900 : 700,
                          }}
                        >
                          {el.arrowDirection === "left" && <ArrowLeft className="w-7 h-7 stroke-[3.5]" />}
                          {el.arrowDirection === "right" && <ArrowRight className="w-7 h-7 stroke-[3.5]" />}
                          {el.arrowDirection === "straight" && <ArrowUp className="w-7 h-7 stroke-[3.5]" />}
                          {el.arrowDirection === "down" && <ArrowDown className="w-7 h-7 stroke-[3.5]" />}
                          {el.text && <span>{el.text}</span>}
                        </div>
                      </div>
                    )}

                    {/* TYPE: ATTENDANCE BOX */}
                    {el.type === "attendance_box" && (
                      <div
                        className="w-full h-full bg-white border-2 border-black rounded p-1 flex flex-col justify-between shadow-2xs"
                        style={{
                          borderRadius: `${el.borderRadius || 4}px`,
                          borderColor: el.borderColor || "#000000",
                          borderWidth: `${el.borderWidth || 2}px`,
                        }}
                      >
                        <span className="text-[9px] font-black text-black border-b border-black/50 pb-0.5 w-full text-center leading-none">
                          {el.text || "Presentes"}
                        </span>
                        <div className="flex-1" />
                      </div>
                    )}

                    {/* TYPE: SHAPE */}
                    {el.type === "shape" && (
                      <div
                        className="w-full h-full p-2 flex items-center justify-center whitespace-pre-line text-center shadow-2xs"
                        style={{
                          backgroundColor: el.bgColor || "#f8fafc",
                          borderColor: el.borderColor || "#cbd5e1",
                          borderWidth: `${el.borderWidth || 2}px`,
                          borderStyle: "solid",
                          borderRadius: `${el.borderRadius || 8}px`,
                          color: el.textColor || "#0f172a",
                          fontSize: `${el.fontSize ? el.fontSize * 0.45 : 12}px`,
                          fontWeight: el.fontWeight === "black" ? 900 : 700,
                        }}
                      >
                        {el.text || "Aviso"}
                      </div>
                    )}

                    {/* TYPE: ICON */}
                    {el.type === "icon" && (
                      <div 
                        className="p-1 flex items-center justify-center"
                        style={{ color: el.textColor || "#0284c7" }}
                      >
                        {el.iconName === "accessibility" && <Accessibility className="w-9 h-9 stroke-[2.5]" />}
                        {el.iconName === "door" && <DoorOpen className="w-9 h-9 stroke-[2.5]" />}
                        {el.iconName === "users" && <Users className="w-9 h-9 stroke-[2.5]" />}
                        {el.iconName === "warning" && <ShieldAlert className="w-9 h-9 stroke-[2.5]" />}
                      </div>
                    )}

                    {/* SELECTION CORNER HANDLES */}
                    {isSelected && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
                      </>
                    )}
                  </div>
                );
              })}

              {/* FOOTER WATERMARK / BUILDING IDENTIFICATION */}
              <div className="absolute bottom-2 right-4 pointer-events-none text-[10px] font-bold text-slate-400">
                {building?.name ? `PRÉDIO: ${building.name.toUpperCase()}` : "ENEM • SISTEMA DE SINALIZAÇÃO"}
              </div>

            </div>

          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-2">
            <span>💡 <strong>Dica:</strong> Clique e arraste qualquer elemento para reposicionar livremente na tela.</span>
            <span>Dimensões: A4 Paisagem (297 x 210 mm)</span>
          </div>

        </div>

        {/* RIGHT SIDEBAR: ELEMENT PROPERTY INSPECTOR & CONTROLS */}
        <div className="space-y-4">
          
          <div className="bg-slate-50 dark:bg-[#070b13]/80 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
            <h3 className="text-xs font-display font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-800 pb-2 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>{selectedElement ? "Propriedades" : "Elemento Selecionado"}</span>
              </div>
              {selectedElement && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={duplicateSelected}
                    title="Duplicar elemento"
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    title="Remover elemento"
                    className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-rose-500 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </h3>

            {selectedElement ? (
              <div className="space-y-4 text-xs">
                
                {/* ACTIVE ELEMENT BADGE */}
                <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 rounded-xl">
                  <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>
                      {selectedElement.type === "text" ? "Texto / Letreiro" :
                       selectedElement.type === "arrow" ? "Seta Direcional" :
                       selectedElement.type === "attendance_box" ? "Caixa de Presença" :
                       selectedElement.type === "badge" ? "Etiqueta / Badge" :
                       selectedElement.type === "shape" ? "Quadro de Avisos" : "Ícone"}
                    </span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">ID: {selectedElement.id}</span>
                </div>

                {/* TEXT CONTENT FIELD */}
                {(selectedElement.type === "text" || selectedElement.type === "badge" || selectedElement.type === "shape" || selectedElement.type === "attendance_box" || selectedElement.type === "arrow") && (
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">
                      Conteúdo do Texto
                    </label>
                    <textarea
                      value={selectedElement.text || ""}
                      onChange={(e) => updateSelected({ text: e.target.value })}
                      rows={selectedElement.type === "shape" ? 3 : 2}
                      className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                      placeholder="Digite o texto..."
                    />
                  </div>
                )}

                {/* ARROW DIRECTION */}
                {selectedElement.type === "arrow" && (
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">
                      Direção da Seta
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["left", "right", "straight", "down"] as const).map(dir => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => updateSelected({ arrowDirection: dir })}
                          className={`py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center cursor-pointer transition ${
                            selectedElement.arrowDirection === dir
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {dir === "left" && <ArrowLeft className="w-4 h-4" />}
                          {dir === "right" && <ArrowRight className="w-4 h-4" />}
                          {dir === "straight" && <ArrowUp className="w-4 h-4" />}
                          {dir === "down" && <ArrowDown className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* FONT SIZE SLIDER */}
                {selectedElement.type === "text" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] uppercase font-extrabold text-slate-500">Tamanho da Fonte</label>
                      <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {selectedElement.fontSize || 24} pt
                      </span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="80"
                      step="2"
                      value={selectedElement.fontSize || 24}
                      onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                )}

                {/* TEXT STYLES & ALIGNMENT */}
                {selectedElement.type === "text" && (
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">
                      Alinhamento & Estilo
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateSelected({ textAlign: "left" })}
                        className={`p-2 rounded-lg border cursor-pointer ${
                          selectedElement.textAlign === "left" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200"
                        }`}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelected({ textAlign: "center" })}
                        className={`p-2 rounded-lg border cursor-pointer ${
                          selectedElement.textAlign === "center" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200"
                        }`}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelected({ textAlign: "right" })}
                        className={`p-2 rounded-lg border cursor-pointer ${
                          selectedElement.textAlign === "right" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200"
                        }`}
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelected({ fontWeight: selectedElement.fontWeight === "black" ? "normal" : "black" })}
                        className={`p-2 rounded-lg border cursor-pointer ${
                          selectedElement.fontWeight === "black" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200"
                        }`}
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelected({ fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" })}
                        className={`p-2 rounded-lg border cursor-pointer ${
                          selectedElement.fontStyle === "italic" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200"
                        }`}
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* PRESET COLORS PICKER */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">
                    Cor Principal
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      "#0f172a", "#000000", "#0284c7", "#059669", 
                      "#dc2626", "#d97706", "#7c3aed", "#475569"
                    ].map(hex => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          if (selectedElement.type === "arrow") {
                            updateSelected({ arrowColor: hex, textColor: hex });
                          } else {
                            updateSelected({ textColor: hex });
                          }
                        }}
                        className="w-6 h-6 rounded-full border-2 border-white shadow-xs cursor-pointer hover:scale-110 transition"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* POSITION COORDINATES (X, Y) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Posição X: {selectedElement.x}%</span>
                  <span>Posição Y: {selectedElement.y}%</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => updateSelected({ x: 50 })}
                    className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Centralizar Horizontal
                  </button>
                </div>

              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Move className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-bold">Nenhum elemento selecionado</p>
                <p className="text-[11px] text-slate-400">Clique em qualquer item no canvas para editar suas cores, tamanhos e textos.</p>
              </div>
            )}
          </div>

          {/* LAYERS & ELEMENTS LIST */}
          <div className="bg-slate-50 dark:bg-[#070b13]/80 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-display font-black text-slate-850 dark:text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-500" />
                <span>Elementos da Placa ({elements.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Clique para selecionar</span>
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {elements.map((el) => {
                const isSelected = selectedId === el.id;
                let label = el.text || `Elemento ${el.type}`;
                if (label.length > 28) label = label.substring(0, 28) + "...";

                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedId(el.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer border ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-500 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: el.textColor || el.arrowColor || "#059669" }} />
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400">[{el.type}]</span>
                      <span className="truncate">{label}</span>
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SAVE AS CUSTOM REUSABLE TEMPLATE */}
          <div className="bg-slate-50 dark:bg-[#070b13]/80 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-display font-black text-slate-850 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-emerald-500" />
              <span>Salvar Como Novo Template</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Guarde este layout no acervo do CLA para reutilizar em qualquer outra placa de sinalização.
            </p>
            
            <div className="space-y-2">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Ex: Meu Template Sala Especial"
                className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveCustomTemplate}
                disabled={!newTemplateName.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar Template</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* TEMPLATE LIBRARY MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border-2 border-emerald-500 animate-fade-in relative space-y-5">
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <LayoutTemplate className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    Galeria de Templates de Sinalização
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Selecione um modelo oficial pré-formatado ou um dos seus templates personalizados.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TEMPLATES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[440px] overflow-y-auto pr-1">
              {/* DEFAULT TEMPLATES */}
              {DEFAULT_TEMPLATES.map(tpl => (
                <div
                  key={tpl.id}
                  className="p-4 bg-slate-50 dark:bg-slate-850/60 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        {tpl.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Oficial</span>
                    </div>
                    <h4 className="font-display font-black text-slate-850 dark:text-white text-sm">
                      {tpl.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadTemplate(tpl)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Carregar Este Modelo</span>
                  </button>
                </div>
              ))}

              {/* CUSTOM USER TEMPLATES */}
              {customTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  className="p-4 bg-amber-500/5 dark:bg-amber-950/20 rounded-2xl border-2 border-amber-500/30 hover:border-amber-500 transition flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        Personalizado CLA
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomTemplate(tpl.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="Excluir template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-display font-black text-slate-850 dark:text-white text-sm">
                      {tpl.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadTemplate(tpl)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Carregar Este Modelo</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
