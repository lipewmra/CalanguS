import React, { useState } from "react";
import { CollaboratorInfo, RoomDetails, BuildingInfo } from "../types";
import ExportAllocationsView from "./ExportAllocationsView";
import RoomPlatesPrint from "./RoomPlatesPrint";
import { Printer, FileSpreadsheet, Layers, Info } from "lucide-react";

interface CombinedPrintExportViewProps {
  collaborators: CollaboratorInfo[];
  rooms: RoomDetails[];
  building: BuildingInfo | null;
  readOnly?: boolean;
}

export default function CombinedPrintExportView({ 
  collaborators, 
  rooms, 
  building, 
  readOnly = false 
}: CombinedPrintExportViewProps) {
  const [subTab, setSubTab] = useState<"export" | "plates">("export");

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="no-print bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex gap-2">
        <button
          onClick={() => setSubTab("export")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            subTab === "export"
              ? "bg-emerald-600 text-white shadow-[2px_2px_0px_0px_#04583d]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Quadro de Alocações (Visualizar / Exportar)</span>
        </button>

        <button
          onClick={() => setSubTab("plates")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            subTab === "plates"
              ? "bg-emerald-600 text-white shadow-[2px_2px_0px_0px_#04583d]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Placas de Sinalização / Impressão</span>
        </button>
      </div>

      {subTab === "export" ? (
        <ExportAllocationsView 
          collaborators={collaborators} 
          rooms={rooms} 
          building={building} 
        />
      ) : (
        <RoomPlatesPrint readOnly={readOnly} />
      )}
    </div>
  );
}
