import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { Download, Printer, ArrowLeft, ArrowRight, ArrowUp, CheckCircle, Eye } from "lucide-react";

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
}

export default function RoomPlatesPrint({ readOnly = false }: RoomPlatesProps) {
  const [plates, setPlates] = useState<PlateItem[]>([
    { id: "1", type: "class", title: "SALA 01", subTitle: "ENEM - CAPACIDADE: 30" },
    { id: "2", type: "class", title: "SALA 02", subTitle: "ENEM - CAPACIDADE: 30" },
    { id: "3", type: "special", title: "ATENDIMENTO ESPECIALIZADO", subTitle: "Acessibilidade LIBRAS / Ledor" },
    { id: "4", type: "special", title: "SALA DE COORDENAÇÃO", subTitle: "Acesso Restrito - CLA / ALA" },
    { id: "5", type: "special", title: "SALA EXTRA", subTitle: "Controle de Contingência de Candidatos" },
    { id: "6", type: "arrow", title: "SALA 01 a 05", direction: "right", subTitle: "Siga a Seta Indicativa" },
    { id: "7", type: "arrow", title: "SALA DE COORDENAÇÃO", direction: "left", subTitle: "Siga a Seta Indicativa" },
    { id: "8", type: "arrow", title: "BANHEIROS / ALIMENTAÇÃO", direction: "straight", subTitle: "Acesso Geral" },
  ]);

  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [customType, setCustomType] = useState<"class" | "arrow" | "custom">("class");
  const [customDir, setCustomDir] = useState<"left" | "right" | "straight" | "none">("none");

  const addCustomPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newItem: PlateItem = {
      id: Date.now().toString(),
      type: customType,
      title: customTitle.toUpperCase(),
      subTitle: customSubtitle || "CALANGUS EXUM PLANNER",
      direction: customDir,
    };

    setPlates([...plates, newItem]);
    setCustomTitle("");
    setCustomSubtitle("");
  };

  const removePlate = (id: string) => {
    setPlates(plates.filter(p => p.id !== id));
  };

  // Modern jsPDF design compiler
  const generatePdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    plates.forEach((plate, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Draw elegant boundary border
      doc.setDrawColor(21, 128, 61); // forest green
      doc.setLineWidth(3);
      doc.rect(8, 8, 281, 194); // outer frame

      doc.setDrawColor(245, 158, 11); // amber secondary border
      doc.setLineWidth(1);
      doc.rect(12, 12, 273, 186);

      // Header watermark Logo
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(21, 128, 61);
      doc.text("EXAME NACIONAL DO ENSINO MÉDIO - ENEM", 148, 25, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text("SISTEMA ORION CEBRASPE - COORDENAÇÃO DE LOCAL (CLA)", 148, 31, { align: "center" });

      // Plate Main text
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(44);
      doc.setTextColor(30, 41, 59);
      doc.text(plate.title, 148, 95, { align: "center" });

      // Setas (Arrows)
      if (plate.direction && plate.direction !== "none") {
        doc.setLineWidth(4);
        doc.setDrawColor(21, 128, 61);
        doc.setFillColor(21, 128, 61);

        if (plate.direction === "right") {
          // Draw standard Arrow pointing Right 👉
          doc.triangle(195, 115, 195, 135, 215, 125, "F");
          doc.line(165, 125, 195, 125);
        } else if (plate.direction === "left") {
          // Draw standard Arrow pointing Left 👈
          doc.triangle(100, 115, 100, 135, 80, 125, "F");
          doc.line(100, 125, 130, 125);
        } else if (plate.direction === "straight") {
          // Draw standard Arrow pointing Up 👆
          doc.triangle(138, 120, 158, 120, 148, 105, "F");
          doc.line(148, 120, 148, 145);
        }
      }

      // Subtitle information
      if (plate.subTitle) {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(18);
        doc.setTextColor(71, 85, 105);
        doc.text(plate.subTitle, 148, 160, { align: "center" });
      }

      // Footer branding
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(245, 158, 11);
      doc.text("CalanguS Exam Planner", 148, 185, { align: "center" });
    });

    doc.save("placas_sinalizacao_enem_calangus.pdf");
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="plates-print-selector">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
            <span>🖨️ Placas e Sinalizações de Portas</span>
            <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">PDF COMPILER</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Gere placas de identificação de salas, setas de fluxo de corredores e avisos oficiais prontos para impressão.</p>
        </div>
        <button
          onClick={generatePdf}
          className="btn-3d btn-3d-primary rounded-xl px-5 py-3 font-extrabold text-xs shadow-md flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>COMPILAR PDF IMPRESSÃO</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form to add custom plate */}
        <div className="bg-slate-50 dark:bg-[#070b13]/60 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#cbd5e1] dark:shadow-[4px_4px_0px_0px_#1e293b]">
          {readOnly ? (
            <div className="space-y-4">
              <h3 className="text-xs font-display font-black text-slate-805 dark:text-white mb-4 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1">
                <span>✨</span> Letreiros & Placas
              </h3>
              <div className="p-3.5 bg-indigo-500/10 border-2 border-indigo-550/25 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold leading-relaxed space-y-2">
                <p>ℹ️ <strong>Modo de Leitura Ativo (ALA):</strong></p>
                <p className="font-normal text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Como assistente ALA, você pode compilar o PDF de impressão das placas e conferir identificadores, mas a criação de letreiros personalizados ou remoção é restrita ao CLA.</p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-display font-black text-slate-805 dark:text-white mb-4 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1">
                <span>✨</span> Adicionar Letreiro
              </h3>
              <form onSubmit={addCustomPlate} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Título Principal (Letreiro)</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ex: SALA DE AUDITÓRIO B"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Subtítulo Informativo (Régua)</label>
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder="Ex: CAPACIDADE REAL: 30 VAGAS"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Tipo de Letreiro</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as any)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2.5 bg-white dark:bg-[#101726] text-slate-805 dark:text-slate-200 text-xs font-bold"
                >
                  <option value="class">Sala Comum</option>
                  <option value="special">Setor Especial</option>
                  <option value="arrow">Seta de Direção</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Direção da Seta</label>
                <select
                  value={customDir}
                  onChange={(e) => setCustomDir(e.target.value as any)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2.5 bg-white dark:bg-[#101726] text-slate-805 dark:text-slate-200 text-xs font-bold"
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
              className="btn-3d btn-3d-secondary rounded-xl w-full py-2.5 flex items-center justify-center font-extrabold text-xs shadow-md"
            >
              INCLUIR NO LOTE DE IMPRESSÃO
            </button>
          </form>
          </>
          )}
        </div>

        {/* Live list of plates */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2">
            <span>Lista de Placas Ativadas na Fila</span>
            <span className="bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-mono">{plates.length}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
            {plates.map((plate) => (
              <div
                key={plate.id}
                className="p-4 border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#101726]/40 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-500/20 shadow-xs transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] uppercase font-black px-2.5 py-0.5 rounded-md bg-white dark:bg-[#070b13] text-slate-800 dark:text-slate-350 border-2 border-slate-200 dark:border-slate-800`}>
                      {plate.type === "class" ? "Sala" : plate.type === "special" ? "Especial" : "Direção"}
                    </span>
                    {!readOnly && (
                      <button
                        onClick={() => removePlate(plate.id)}
                        className="text-slate-400 hover:text-rose-500 text-xs font-bold cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white truncate font-display">{plate.title}</h4>
                  {plate.subTitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">{plate.subTitle}</p>}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {plate.direction === "left" && (
                      <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/10 font-mono text-[9px] tracking-wider uppercase">
                        <ArrowLeft className="w-3 h-3" /> ESQUERDA
                      </span>
                    )}
                    {plate.direction === "right" && (
                      <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/10 font-mono text-[9px] tracking-wider uppercase">
                        <ArrowRight className="w-3 h-3" /> DIREITA
                      </span>
                    )}
                    {plate.direction === "straight" && (
                      <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/10 font-mono text-[9px] tracking-wider uppercase">
                        <ArrowUp className="w-3 h-3" /> RETO
                      </span>
                    )}
                    {!plate.direction || plate.direction === "none" ? (
                      <span className="text-slate-400 dark:text-slate-505 text-[9px] uppercase tracking-wide">Padrão Identificador</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-2 border-emerald-500/10 rounded-xl text-xs font-bold flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-500" />
            <span>As placas geradas no PDF estão configuradas com orientação <strong>Paisagem</strong> (A4) prontas para fixação física nas paredes da escola de aplicação.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
