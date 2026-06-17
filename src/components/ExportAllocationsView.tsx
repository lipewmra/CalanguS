import React, { useState } from "react";
import { CollaboratorInfo, RoomDetails, BuildingInfo } from "../types";
import { 
  Download, Printer, Clipboard, Search, CheckCircle, 
  AlertTriangle, Building, Users, Phone, FileSpreadsheet,
  Check, Layers, FileText, ChevronRight, HelpCircle
} from "lucide-react";

interface ExportAllocationsViewProps {
  collaborators: CollaboratorInfo[];
  rooms: RoomDetails[];
  building: BuildingInfo | null;
}

export default function ExportAllocationsView({ collaborators, rooms, building }: ExportAllocationsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  // Compute stats
  const totalRooms = rooms.length;
  const allocatedCollabs = collaborators.filter(c => c.assignedRoom && c.assignedRoom !== "");
  const unallocatedCollabs = collaborators.filter(c => !c.assignedRoom || c.assignedRoom === "");
  const totalAllocatedCount = allocatedCollabs.length;

  // Filter rooms based on search
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (room.floor && room.floor.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterRole === "all") return matchesSearch;
    if (filterRole === "empty") {
      const roomAlloc = collaborators.filter(c => c.assignedRoom === room.number);
      return matchesSearch && roomAlloc.length === 0;
    }
    if (filterRole === "filled") {
      const roomAlloc = collaborators.filter(c => c.assignedRoom === room.number);
      return matchesSearch && roomAlloc.length > 0;
    }
    // Specific roles allocated
    const hasRole = collaborators.some(c => c.assignedRoom === room.number && c.assignedRole === filterRole);
    return matchesSearch && hasRole;
  });

  // Unique roles currently assigned for the role filter list
  const uniqueAssignedRoles = Array.from(
    new Set(collaborators.map(c => c.assignedRole).filter(Boolean))
  ) as string[];

  // Helper to format CPF safely if needed or raw for admin export
  const formatCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
    }
    return cpf;
  };

  // 1. Export as CSV
  const handleExportCSV = () => {
    // CSV headers
    const headers = [
      "Sala",
      "Andar",
      "Capacidade de Candidatos",
      "Detalhes da Sala",
      "Nome do Fiscal",
      "CPF",
      "Função Alocada",
      "WhatsApp",
      "Email",
      "Chave PIX",
      "Já Trabalhou no ENEM",
      "Necessidade Especial/PCD",
      "Status de Confirmação"
    ];

    const rows: string[][] = [];

    rooms.forEach(room => {
      const roomPeople = collaborators.filter(c => c.assignedRoom === room.number);
      
      if (roomPeople.length === 0) {
        // Empty room row
        rows.push([
          room.number,
          room.floor || "Térreo",
          String(room.capacity),
          room.details || "Nenhum",
          "Nenhum fiscal alocado",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-"
        ]);
      } else {
        roomPeople.forEach(p => {
          rows.push([
            room.number,
            room.floor || "Térreo",
            String(room.capacity),
            room.details || "Nenhum",
            p.name,
            p.cpf,
            p.assignedRole || "Não Definido",
            p.whatsapp || "-",
            p.email || "-",
            p.pixKey || "-",
            p.hasWorkedEnem ? "Sim" : "Não",
            p.disability || "Nenhuma",
            p.status
          ]);
        });
      }
    });

    // Also append the Reserves / Unallocated list at the bottom
    if (unallocatedCollabs.length > 0) {
      rows.push(["", "", "", "", "", "", "", "", "", "", "", "", ""]);
      rows.push(["--- FISCAIS EM RESERVA / NÃO ALOCADOS ---", "", "", "", "", "", "", "", "", "", "", "", ""]);
      unallocatedCollabs.forEach(p => {
        rows.push([
          "RESERVA (Sem sala)",
          "-",
          "-",
          "-",
          p.name,
          p.cpf,
          p.assignedRole || "Reserva / Não Definido",
          p.whatsapp || "-",
          p.email || "-",
          p.pixKey || "-",
          p.hasWorkedEnem ? "Sim" : "Não",
          p.disability || "Nenhuma",
          p.status
        ]);
      });
    }

    // Generate CSV Content with semicolon delimiter (standard for Excel in Brazil/Europe)
    const csvContent = 
      "\uFEFF" + // UTF-8 BOM for Excel compatibility
      [headers.join(";"), ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Alocacao_Salas_ENEM_${building?.name?.replace(/\s+/g, "_") || "Local"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Copy Entire Allocation as Formatted Text (WhatsApp Friendly)
  const handleCopyToClipboard = () => {
    let text = `📋 *ALOCAÇÃO DE SALAS - ENEM*\n`;
    text += `🏢 *Local:* ${building?.name || "Não Definido"}\n`;
    text += `📍 *Endereço:* ${building?.address || "Não Definido"}\n`;
    text += `📅 *Gerado em:* ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}\n`;
    text += `⚙️ *Resumo:* ${totalRooms} salas | ${totalAllocatedCount} fiscais alocados | ${unallocatedCollabs.length} em reserva\n`;
    text += `=========================================\n\n`;

    rooms.forEach(room => {
      const roomPeople = collaborators.filter(c => c.assignedRoom === room.number);
      text += `🚪 *${room.number.toUpperCase()}* (${room.floor} | Cap: ${room.capacity} cand.)\n`;
      
      if (roomPeople.length === 0) {
        text += `  ⚠️ _Nenhum fiscal alocado nesta sala_\n`;
      } else {
        roomPeople.forEach(p => {
          text += `  • *${p.assignedRole || "Fiscal"}:* ${p.name} (${p.whatsapp || "Sem whats"})\n`;
        });
      }
      text += `-----------------------------------------\n`;
    });

    if (unallocatedCollabs.length > 0) {
      text += `\n🚨 *FISCAIS EM RESERVA / SUPORTE CORREDOR:*\n`;
      unallocatedCollabs.forEach((p, idx) => {
        text += `  ${idx + 1}. ${p.name} - *${p.assignedRole || "Reserva"}* (${p.whatsapp || "Sem whats"})\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 3500);
  };

  // 3. Copy text of a SINGLE Room
  const handleCopySingleRoom = (room: RoomDetails) => {
    const roomPeople = collaborators.filter(c => c.assignedRoom === room.number);
    let text = `🚪 *${room.number.toUpperCase()}* - ALOCAÇÃO\n`;
    text += `🏢 Local: ${building?.name || ""}\n`;
    text += `📍 Andar: ${room.floor || "Térreo"} | Cap: ${room.capacity} cand.\n`;
    text += `-----------------------------------------\n`;
    
    if (roomPeople.length === 0) {
      text += `⚠️ Nenhum fiscal alocado para esta sala.\n`;
    } else {
      roomPeople.forEach(p => {
        text += `• *${p.assignedRole || "Fiscal"}:* ${p.name}\n`;
        text += `  📱 Contato: ${p.whatsapp || "-"}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedRoomId(room.number);
    setTimeout(() => setCopiedRoomId(null), 2500);
  };

  // 4. Trigger print of page
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 3D STYLE HEADER BANNER */}
      <div className="p-6 bg-gradient-to-br from-emerald-950 to-slate-900 border-2 border-emerald-800 text-white rounded-3xl shadow-[4px_4px_0px_0px_#022c22] no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                MÓDULO DE RELATÓRIO
              </span>
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              Exportar e Imprimir Alocações
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Exporte a estrutura de salas e seus respectivos fiscais alocados para o Excel, copie em formato de texto para enviar no WhatsApp ou imprima folhas de controle para o dia da aplicação do ENEM.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:self-center">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-bold rounded-xl shadow-[2px_2px_0px_0px_#04583d] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-2 border border-emerald-700"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Planilha Excel (.csv)
            </button>
            
            <button
              onClick={handleCopyToClipboard}
              className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-[2px_2px_0px_0px_#0369a1] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-2 border border-sky-700"
            >
              {copiedStatus ? (
                <>
                  <Check className="w-4 h-4 text-white animate-bounce" />
                  Copiado!
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4" />
                  Copiar p/ WhatsApp
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl shadow-[2px_2px_0px_0px_#020617] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-2 border border-slate-705"
            >
              <Printer className="w-4 h-4" />
              Imprimir Quadro
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-emerald-500/20">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
            <span className="block text-[9px] uppercase font-bold tracking-widest text-slate-400 font-mono">
              Salas no Prédio
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-white">{totalRooms}</span>
              <span className="text-[10px] text-emerald-400 font-bold">Unidades</span>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
            <span className="block text-[9px] uppercase font-bold tracking-widest text-slate-400 font-mono">
              Fiscais Alocados
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-400">{totalAllocatedCount}</span>
              <span className="text-[10px] text-slate-350 font-medium">de {collaborators.length}</span>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
            <span className="block text-[9px] uppercase font-bold tracking-widest text-slate-400 font-mono">
              Equipe Reserva
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-400">{unallocatedCollabs.length}</span>
              <span className="text-[10px] text-slate-350 font-medium">Corredor/Apoio</span>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
            <span className="block text-[9px] uppercase font-bold tracking-widest text-slate-400 font-mono">
              Capacidade do Prédio
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-white">
                {rooms.reduce((acc, current) => acc + (current.capacity || 0), 0)}
              </span>
              <span className="text-[10px] text-slate-350 font-medium">Estudantes</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS (NO PRINT) */}
      <div className="p-4 bg-white dark:bg-[#101726]/90 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número da sala ou andar..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-hidden text-slate-800 dark:text-slate-250 cursor-text"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono shrink-0">
            Filtrar Salas por:
          </span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">Todas as Salas</option>
            <option value="empty">Sem Nenhum Fiscal Alocado</option>
            <option value="filled">Salas com Fiscais Alocados</option>
            
            {uniqueAssignedRoles.map((role) => (
              <option key={role} value={role}>
                Contém Função: {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PRINT-ONLY HEADER BANNER */}
      <div className="hidden print:block mb-8 border-b-4 border-slate-900 pb-4">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            RELATÓRIO DE FISCAIS ALOCADOS POR SALA
          </h1>
          <h2 className="text-xl font-bold text-slate-700 mt-1">
            LOCAL: {building?.name || "Local Não Definido"}
          </h2>
          <p className="text-sm text-slate-600 font-mono mt-1">
            Endereço: {building?.address || "Não informado"} | Data de Emissão: {new Date().toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-4 flex justify-center gap-8 text-sm font-bold font-mono">
            <span>Total de Salas: {totalRooms}</span>
            <span>Fiscais Alocados: {totalAllocatedCount}</span>
            <span>Fiscais em Reserva: {unallocatedCollabs.length}</span>
          </div>
        </div>
      </div>

      {/* ROOMS GRID */}
      {filteredRooms.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-205 dark:border-slate-805 rounded-3xl no-print">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma sala corresponde aos critérios</h3>
          <p className="text-xs text-slate-400 mt-1">Ajuste o termo de busca ou mude as opções de filtros acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRooms.map((room) => {
            const roomPeople = collaborators.filter(c => c.assignedRoom === room.number);
            
            return (
              <div 
                key={room.number} 
                className="bg-white dark:bg-[#101726]/90 border-2 border-slate-105 dark:border-slate-805 rounded-2xl overflow-hidden p-5 flex flex-col justify-between shadow-xs hover:border-emerald-500/30 transition-all duration-200 print:break-inside-avoid print:border-slate-300 print:shadow-none"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-3.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-slate-850 dark:text-slate-100 uppercase tracking-tight">
                          {room.number}
                        </span>
                        {roomPeople.length === 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-extrabold bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                            VAZIA
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-extrabold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            ALOCADA ({roomPeople.length})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 font-bold">
                        <span>🚪 Floor: {room.floor || "Térreo"}</span>
                        <span>•</span>
                        <span>👥 Cap: {room.capacity} cand.</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopySingleRoom(room)}
                      title="Copiar estas alocações da sala"
                      className="no-print p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center justify-center border border-slate-100 dark:border-slate-800"
                    >
                      {copiedRoomId === room.number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-550 animate-bounce" />
                      ) : (
                        <Clipboard className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Room Allocations List */}
                  {roomPeople.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-150 dark:border-slate-800">
                      <HelpCircle className="w-6 h-6 mx-auto mb-1.5 text-slate-350 dark:text-slate-600" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Aguardando Fiscais</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Arraste colaboradores para esta sala no menu de Alocações.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {roomPeople.map((person) => (
                        <div 
                          key={person.id} 
                          className="p-3 bg-slate-50/75 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-extrabold text-slate-800 dark:text-slate-100 select-all leading-tight">
                                {person.name}
                              </p>
                              <p className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-0.5 select-all">
                                CPF: {formatCPF(person.cpf)}
                              </p>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap">
                              {person.assignedRole || "Fiscal"}
                            </span>
                          </div>

                          {/* Contact and Status Info */}
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                            <span className="flex items-center gap-1 select-all hover:text-emerald-500 transition">
                              <Phone className="w-2.5 h-2.5 text-emerald-500" />
                              {person.whatsapp || "Sem whats"}
                            </span>

                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                person.status === "Confirmado" ? "bg-emerald-500" :
                                person.status === "Recusado" ? "bg-red-500" : "bg-amber-500"
                              }`} />
                              <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                {person.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer Warning */}
                {room.details && (
                  <div className="mt-4 pt-2.5 border-t border-slate-105 dark:border-slate-805 text-[9px] text-slate-400 dark:text-slate-500 flex items-start gap-1 leading-normal font-sans">
                    <span className="shrink-0 text-amber-505 dark:text-amber-400 mt-0.5">ℹ️</span>
                    <span className="italic">{room.details}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* UNALLOCATED / RESERVES BLOCK */}
      <div className="bg-white dark:bg-[#101726]/90 border-2 border-slate-105 dark:border-slate-805 rounded-2xl p-6 shadow-xs print:break-inside-avoid print:border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-550 dark:text-amber-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                Fiscais em Reserva / Apoio Corredor
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                Estes colaboradores não estão associados a nenhuma sala de prova física.
              </p>
            </div>
          </div>
          
          <span className="px-3 py-1 font-mono font-black text-xs text-amber-705 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-full self-start sm:self-center">
            {unallocatedCollabs.length} DISPONÍVEIS
          </span>
        </div>

        {unallocatedCollabs.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs font-bold">Nenhum colaborador na equipe de reserva.</p>
            <p className="text-[10px] text-slate-450 mt-0.5">Todos os inscritos foram alocados em alguma sala do prédio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unallocatedCollabs.map(p => (
              <div 
                key={p.id}
                className="p-3.5 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/70 rounded-xl space-y-2 hover:border-amber-500/25 transition shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="font-extrabold text-slate-850 dark:text-slate-150 text-xs truncate leading-snug">
                      {p.name}
                    </p>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 uppercase tracking-tight whitespace-nowrap">
                      {p.assignedRole || "RESERVA"}
                    </span>
                  </div>
                  <p className="text-[9px] font-mono font-extrabold text-slate-400 mt-0.5">
                    CPF: {formatCPF(p.cpf)}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-[9px] text-slate-450 dark:text-slate-400 font-bold">
                  <span className="flex items-center gap-1 select-all hover:text-emerald-500 transition">
                    <Phone className="w-2.5 h-2.5 text-emerald-500" />
                    {p.whatsapp || "Sem whats"}
                  </span>

                  <span className={`px-1.5 py-0.5 rounded-md font-mono text-[8px] leading-none uppercase ${
                    p.status === "Confirmado" ? "text-emerald-600 bg-emerald-500/10" :
                    p.status === "Recusado" ? "text-red-600 bg-red-500/10" : "text-amber-600 bg-amber-500/10"
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
