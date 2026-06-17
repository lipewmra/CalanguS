import React, { useState } from "react";
import { CollaboratorInfo, RoomDetails } from "../types";
import { 
  Users, ShieldAlert, BadgeInfo, HelpCircle, CornerDownRight, 
  Check, MoveRight, ArrowRight, UserCheck, Inbox, RefreshCw 
} from "lucide-react";
import { ENEM_ROLES } from "./CollaboratorManager";

interface DragAndDropProps {
  collaborators: CollaboratorInfo[];
  rooms: RoomDetails[];
  onMove: (collabId: string, isReserve: boolean, assignedRoom: string, updatedRole?: string) => void;
}

export default function DragAndDropReserves({ collaborators, rooms, onMove }: DragAndDropProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // Track active function filter on the mobile fast assignment or selector if needed
  const [showRoleInfo, setShowRoleInfo] = useState<string | null>(null);

  // Computations
  // Unallocated are those who do not have an assignedRoom
  const unallocated = collaborators.filter(c => !c.assignedRoom || c.assignedRoom === "");
  
  // 1. Reserves: those who are unallocated AND have no assignedRole (unassociated)
  const unallocatedReservas = unallocated.filter(c => !c.assignedRole || c.assignedRole === "");

  // 2. Associated unallocated: those who are unallocated AND have an assignedRole
  // Group them by role for our quadros (lanes)
  const unallocatedByRole = ENEM_ROLES.map(role => {
    const list = unallocated.filter(c => c.assignedRole === role.name);
    return {
      roleName: role.name,
      desc: role.desc,
      members: list
    };
  });

  // Drag handles
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Drop to a specific classroom
  const handleDropToRoom = (e: React.DragEvent, roomName: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;
    
    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      // When placed in a room, they are alocated (isReserve: false) inside that room,
      // and keep their associated role.
      onMove(id, false, roomName);
      setSuccessMsg(`Colaborador ${targetCollab.name} alocado na ${roomName}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Drop to the Reserva (Unassociated) quadro
  const handleDropToReserves = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      // Disassociates function and clears room
      onMove(id, true, "", "");
      setSuccessMsg(`${targetCollab.name} movido para Reservas (Sem Função).`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Drop to a specific associated function quadro (lane/box)
  const handleDropToFunctionQuadro = (e: React.DragEvent, targetRole: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const targetCollab = collaborators.find(c => c.id === id);
    if (targetCollab) {
      // Associates them with the new function and clears classroom
      onMove(id, false, "", targetRole);
      setSuccessMsg(`${targetCollab.name} associado como ${targetRole}.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
    setDraggedId(null);
  };

  // Smartphone/Tablet Click Alternative (Accessibility & Responsiveness)
  const quickAssignMobile = (collabId: string, dest: string) => {
    const targetCollab = collaborators.find(c => c.id === collabId);
    if (targetCollab) {
      if (dest === "RESERVA") {
        onMove(collabId, true, "", "");
        setSuccessMsg(`Movido para Reserva (Sem Função): ${targetCollab.name}`);
      } else if (dest === "DESALOCAR") {
        // Keeps current role, clears room
        onMove(collabId, false, "", targetCollab.assignedRole || "Aplicador (Fiscal de Sala)");
        setSuccessMsg(`Desalocado para Quadros Associados: ${targetCollab.name}`);
      } else {
        onMove(collabId, false, dest);
        setSuccessMsg(`Alocado: ${targetCollab.name} na ${dest}`);
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="drag-drop-reserves-container">
      
      {/* Informative Header Banner */}
      <div className="mb-6 pb-4 border-b-2 border-slate-105 dark:border-slate-800">
        <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
          <span>🏷️ Organização de Fiscais e Quadros de Funções</span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">DRAG-N-DROP</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
          Arraste e solte os colaboradores entre as salas faturadas ou as colunas de designação. Você pode mudar a função de um fiscal instantaneamente arrastando-o para o quadro da função desejada ou devolvê-lo para a Reserva (Sem Função).
        </p>
      </div>

      {/* Success Notification ticker */}
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* LEFT COLUMNS (2 Columns): THE ALLOCATION LANES / QUADROS */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b-2 border-slate-150 dark:border-slate-800">
            <h3 className="text-xs font-display font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              📥 Fiscais Disponíveis (Não Alocados)
            </h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-mono font-black px-2 py-0.5 rounded-full">
              {unallocated.length} Disponíveis
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 max-h-[750px] overflow-y-auto pr-1">
            
            {/* 1. RESERVES QUADRO (Always visible) */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDropToReserves}
              className={`border-2 border-dashed rounded-2xl p-4 transition duration-150 ${
                draggedId && !collaborators.find(c => c.id === draggedId)?.isReserve
                  ? "border-amber-400 bg-amber-500/10 animate-pulse scale-[1.01]" 
                  : "border-amber-300 dark:border-amber-500/20 bg-amber-500/[0.03] dark:bg-amber-500/[0.01]"
              }`}
            >
              <div className="flex items-center justify-between mb-3 border-b border-amber-500/15 pb-2">
                <div>
                  <h4 className="text-xs font-display font-black text-amber-705 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Inbox className="w-4 h-4 text-amber-500" />
                    <span>Banco de Reservas</span>
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Fiscais sem função designada (Banco Geral)</p>
                </div>
                <span className="bg-amber-105 border-2 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-450 font-black font-mono text-xs px-2.5 py-0.5 rounded-full shrink-0">
                  {unallocatedReservas.length}
                </span>
              </div>

              <div className="space-y-2.5 min-h-[105px]">
                {unallocatedReservas.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 font-bold text-[10px] italic">
                    Nenhum fiscal na reserva geral no momento.
                  </div>
                ) : (
                  unallocatedReservas.map(collab => (
                    <div
                      key={collab.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, collab.id!)}
                      onDragEnd={handleDragEnd}
                      className={`p-3 bg-white dark:bg-[#101726]/80 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-amber-500 dark:hover:border-amber-400 transition cursor-grab active:cursor-grabbing relative ${draggedId === collab.id ? 'opacity-45' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="truncate">
                          <h5 className="font-extrabold text-slate-800 dark:text-white text-xs truncate">{collab.name}</h5>
                          <p className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">{collab.cpf}</p>
                        </div>
                        {collab.specialRole && collab.specialRole !== "Nenhuma" && (
                          <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[8px] font-black px-1.5 py-0.2 rounded border border-indigo-500/10">
                            {collab.specialRole}
                          </span>
                        )}
                      </div>
                      
                      {collaboratorWarnings(collab)}

                      {/* Fast Mobile Action */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 block lg:hidden">
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Alocar em:</label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              quickAssignMobile(collab.id!, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="w-full text-[10px] bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-bold"
                        >
                          <option value="">-- Escolha Local --</option>
                          {rooms.map(r => (
                            <option key={r.number} value={r.number}>{r.number}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. SPECIFIC FUNCTIONS ASSOCIATED QUADROS (LANES) */}
            {unallocatedByRole.map(lane => {
              const hasMembers = lane.members.length > 0;
              return (
                <div 
                  key={lane.roleName}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToFunctionQuadro(e, lane.roleName)}
                  className={`border-2 rounded-2xl p-4 transition duration-150 ${
                    draggedId && collaborators.find(c => c.id === draggedId)?.assignedRole !== lane.roleName
                      ? "border-emerald-400 bg-emerald-500/5 animate-pulse scale-[1.01]" 
                      : hasMembers 
                        ? "border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-[#101726]/20" 
                        : "border-slate-200 dark:border-slate-800/40 bg-slate-50/40 dark:bg-[#101726]/5 border-dashed"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div>
                      <h4 className="text-xs font-display font-black text-slate-800 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <UserCheck className="w-4 h-4 text-indigo-400" />
                        <span>{lane.roleName}</span>
                      </h4>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-bold" title={lane.desc}>{lane.desc}</p>
                    </div>
                    <span className={`font-black font-mono text-xs px-2.5 py-0.5 rounded-full shrink-0 border-2 ${
                      hasMembers 
                        ? "bg-emerald-550/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                        : "bg-slate-100 border-slate-200 text-slate-405 dark:bg-slate-800 dark:border-slate-700"
                    }`}>
                      {lane.members.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 min-h-[60px]">
                    {lane.members.length === 0 ? (
                      <div className="text-center py-4 text-slate-400/70 font-bold text-[9px] italic border border-dashed border-slate-200/55 dark:border-slate-800 rounded-xl bg-slate-100/30 dark:bg-transparent">
                        Arraste fiscais aqui para associá-los a esta função
                      </div>
                    ) : (
                      lane.members.map(collab => (
                        <div
                          key={collab.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, collab.id!)}
                          onDragEnd={handleDragEnd}
                          className={`p-3 bg-white dark:bg-[#101726]/80 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-emerald-500 dark:hover:border-emerald-400 transition cursor-grab active:cursor-grabbing relative ${draggedId === collab.id ? 'opacity-45' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="truncate">
                              <h5 className="font-extrabold text-slate-805 dark:text-white text-xs truncate">{collab.name}</h5>
                              <p className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">{collab.cpf}</p>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-mono font-black border border-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                ASSOCIADO
                              </span>
                            </div>
                          </div>
                          
                          {collaboratorWarnings(collab)}

                          {/* Fast Mobile Action */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 block lg:hidden">
                            <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Alocar em / Desassociar:</label>
                            <div className="flex gap-1.5">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    quickAssignMobile(collab.id!, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="flex-1 text-[10px] bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-bold"
                              >
                                <option value="">-- Escolha Local --</option>
                                {rooms.map(r => (
                                  <option key={r.number} value={r.number}>{r.number}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => quickAssignMobile(collab.id!, "RESERVA")}
                                className="bg-amber-500/10 text-amber-600 px-2 py-1 text-[9px] rounded font-extrabold border border-amber-500/20"
                              >
                                Desass.
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* RIGHT COLUMNS (3 Columns): THE CLASSROOM TESTING LABS */}
        <div className="xl:col-span-3">
          <div className="mb-4 flex items-center justify-between pb-2 border-b-2 border-slate-150 dark:border-slate-800">
            <h3 className="text-xs font-display font-black text-slate-880 dark:text-slate-200 uppercase tracking-wider font-extrabold">
              🏢 Salas do Bloco de Provas
            </h3>
            <span className="text-[10.5px] text-slate-450 dark:text-slate-400 font-bold font-sans">
              Arraste os fiscais das listas para as salas correspondentes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map((room) => {
              // Fiscais associated with room
              const assignedCollabs = collaborators.filter(c => c.assignedRoom === room.number);
              
              return (
                <div
                  key={room.number}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToRoom(e, room.number)}
                  className="bg-slate-50 dark:bg-[#070b13]/55 border-2 border-slate-205 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-500/5 transition min-h-[220px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.02)]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800/60 pb-2">
                      <div className="flex flex-col">
                        <span className="font-display font-black text-xs text-slate-850 dark:text-white uppercase tracking-wider">
                          🚪 {room.number}
                        </span>
                        <span className="text-[9px] text-[#10b981] font-bold font-sans mt-0.5">
                          📍 {room.floor}
                        </span>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-750 dark:text-emerald-400 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        {assignedCollabs.length} Alocados
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[110px] max-h-[200px] overflow-y-auto pr-1">
                      {assignedCollabs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-1">
                          <p className="text-[10px] italic font-medium">Sem equipe alocada</p>
                          <p className="text-[8px] font-black uppercase text-slate-500 dark:text-emerald-405/60">Arraste de qualquer quadro</p>
                        </div>
                      ) : (
                        assignedCollabs.map((collab) => (
                          <div 
                            key={collab.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, collab.id!)}
                            onDragEnd={handleDragEnd}
                            className="bg-white dark:bg-[#101726]/80 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-2.5 flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-500/20 transition shadow-xs pr-3 text-xs font-bold gap-2 cursor-grab active:cursor-grabbing"
                          >
                            <div className="truncate pr-1 flex-1">
                              <span className="font-extrabold text-slate-805 dark:text-white block truncate text-xs">{collab.name}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {collab.assignedRole ? (
                                  <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-1 rounded truncate max-w-[100px]" title={collab.assignedRole}>
                                    {collab.assignedRole}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1 rounded">
                                    Reserva
                                  </span>
                                )}
                                {collab.specialRole && collab.specialRole !== "Nenhuma" && (
                                  <span className="text-[8px] font-black bg-slate-100 text-slate-650 px-1 rounded">
                                    {collab.specialRole}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions to desalocate */}
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => quickAssignMobile(collab.id!, "DESALOCAR")}
                                title="Desalocar para o seu quadro de função"
                                className="text-[8px] font-black text-indigo-650 dark:text-indigo-400 hover:bg-indigo-500/10 border border-indigo-550/20 px-1.5 py-0.5 rounded transition uppercase cursor-pointer"
                              >
                                Desalocar
                              </button>
                              <button
                                onClick={() => quickAssignMobile(collab.id!, "RESERVA")}
                                title="Desassociar e mover p/ o Banco de Reserva Geral"
                                className="text-[8px] font-black text-amber-650 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-550/20 px-1.5 py-0.5 rounded transition uppercase cursor-pointer"
                              >
                                Reserva
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {assignedCollabs.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 font-mono">
                        QUADRO DE FUNÇÕES NA SALA:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(
                          assignedCollabs.reduce((acc, current) => {
                            const role = current.assignedRole || "Reserva";
                            acc[role] = (acc[role] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([role, count]) => (
                          <span 
                            key={role} 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20"
                          >
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{count}x</span>
                            <span className="truncate max-w-[125px]" title={role}>{role}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-[8.5px] text-slate-400 dark:text-slate-500 flex items-center justify-between font-mono font-bold">
                    <span>ZONA DE SOLTURA</span>
                    <span>CAP: {room.capacity} CAND.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function collaboratorWarnings(collab: CollaboratorInfo) {
  if (collab.orionStatus === "Erro") {
    return (
      <div className="mt-2 text-[9px] text-rose-700 bg-rose-500/10 dark:text-rose-400 p-1.5 rounded-lg flex items-center gap-1 border border-rose-550/15">
        <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
        <span className="font-extrabold text-[8.5px] text-rose-600 dark:text-rose-400 truncate">{collab.orionErrors[0] || "Inconsistência Orion"}</span>
      </div>
    );
  }
  return null;
}
