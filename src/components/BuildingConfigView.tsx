import React, { useState, useEffect } from "react";
import { BuildingInfo, RoomDetails } from "../types";
import { Landmark, Save, MapPin, Calculator, BookOpen, AlertCircle, Check } from "lucide-react";

export const FLOOR_OPTIONS = [
  "10º Andar",
  "9º Andar",
  "8º Andar",
  "7º Andar",
  "6º Andar",
  "5º Andar",
  "4º Andar",
  "3º Andar",
  "2º Andar",
  "1º Andar",
  "Térreo",
  "Subsolo 1",
  "Subsolo 2",
  "Subsolo 3"
];

interface BuildingProps {
  initialBuilding: BuildingInfo | null;
  claId: string;
  onSave: (building: BuildingInfo) => Promise<void>;
  readOnly?: boolean;
}

export default function BuildingConfigView({ initialBuilding, claId, onSave, readOnly = false }: BuildingProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [roomsCount, setRoomsCount] = useState(0);
  const [virtualCapacity, setVirtualCapacity] = useState(30); // ENEM standard capability per room as helper
  const [coordRoom, setCoordRoom] = useState("");
  const [specialRoomsCount, setSpecialRoomsCount] = useState(0);
  const [specialDetails, setSpecialDetails] = useState("");
  const [extraRoomsCount, setExtraRoomsCount] = useState(0);
  
  const [rooms, setRooms] = useState<RoomDetails[]>([]);
  const [specialRooms, setSpecialRooms] = useState<RoomDetails[]>([]);
  const [extraRooms, setExtraRooms] = useState<RoomDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialBuilding) {
      setName(initialBuilding.name || "");
      setAddress(initialBuilding.address || "");
      const rCount = initialBuilding.roomsCount !== undefined ? initialBuilding.roomsCount : 0;
      const vCap = initialBuilding.virtualCapacity || 30;
      setRoomsCount(rCount);
      setVirtualCapacity(vCap);
      setCoordRoom(initialBuilding.coordRoom || "");
      setSpecialRoomsCount(initialBuilding.specialRoomsCount || 0);
      setSpecialDetails(initialBuilding.specialDetails || "");
      setExtraRoomsCount(initialBuilding.extraRoomsCount || 0);
      
      if (initialBuilding.rooms && initialBuilding.rooms.length > 0) {
        setRooms(initialBuilding.rooms);
      } else if (rCount > 0) {
        const defaultRooms = Array.from({ length: rCount }, (_, i) => ({
          number: `${101 + i}`,
          capacity: vCap,
          floor: i < 5 ? "Térreo" : "1º Andar",
        }));
        setRooms(defaultRooms);
      } else {
        setRooms([]);
      }

      const sCount = initialBuilding.specialRoomsCount || 0;
      if (initialBuilding.specialRooms && initialBuilding.specialRooms.length > 0) {
        setSpecialRooms(initialBuilding.specialRooms);
      } else if (sCount > 0) {
        const defaultSpecial = Array.from({ length: sCount }, (_, i) => ({
          number: `ESP-${201 + i}`,
          capacity: 15,
          floor: "Térreo",
        }));
        setSpecialRooms(defaultSpecial);
      } else {
        setSpecialRooms([]);
      }

      const eCount = initialBuilding.extraRoomsCount || 0;
      if (initialBuilding.extraRooms && initialBuilding.extraRooms.length > 0) {
        setExtraRooms(initialBuilding.extraRooms);
      } else if (eCount > 0) {
        const defaultExtra = Array.from({ length: eCount }, (_, i) => ({
          number: `EXT-${301 + i}`,
          capacity: vCap,
          floor: "Térreo",
        }));
        setExtraRooms(defaultExtra);
      } else {
        setExtraRooms([]);
      }
    } else {
      setRoomsCount(0);
      setCoordRoom("");
      setSpecialRoomsCount(0);
      setSpecialDetails("");
      setExtraRoomsCount(0);
      setRooms([]);
      setSpecialRooms([]);
      setExtraRooms([]);
    }
  }, [initialBuilding]);

  const handleRoomsCountChange = (newCount: number) => {
    setRoomsCount(newCount);
    setRooms((prev) => {
      const currentList = [...prev];
      if (newCount < currentList.length) {
        return currentList.slice(0, newCount);
      } else {
        const added: RoomDetails[] = [];
        for (let i = currentList.length; i < newCount; i++) {
          added.push({
            number: `${101 + i}`,
            capacity: virtualCapacity,
            floor: i < 5 ? "Térreo" : i < 10 ? "1º Andar" : "2º Andar",
          });
        }
        return [...currentList, ...added];
      }
    });
  };

  const handleVirtualCapacityChange = (newCap: number) => {
    setVirtualCapacity(newCap);
    setRooms((prev) => prev.map(r => ({
      ...r,
      capacity: r.capacity === virtualCapacity ? newCap : r.capacity
    })));
  };

  const handleRoomFieldChange = (index: number, field: keyof RoomDetails, value: any) => {
    setRooms((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "capacity" ? Number(value) || 0 : value,
      };
      return updated;
    });
  };

  const handleSpecialRoomsCountChange = (newCount: number) => {
    setSpecialRoomsCount(newCount);
    setSpecialRooms((prev) => {
      const currentList = [...prev];
      if (newCount < currentList.length) {
        return currentList.slice(0, newCount);
      } else {
        const added: RoomDetails[] = [];
        for (let i = currentList.length; i < newCount; i++) {
          added.push({
            number: `ESP-${201 + i}`,
            capacity: 15,
            floor: "Térreo",
            details: "",
          });
        }
        return [...currentList, ...added];
      }
    });
  };

  const handleSpecialRoomFieldChange = (index: number, field: keyof RoomDetails, value: any) => {
    setSpecialRooms((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "capacity" ? Number(value) || 0 : value,
      };
      return updated;
    });
  };

  const handleExtraRoomsCountChange = (newCount: number) => {
    setExtraRoomsCount(newCount);
    setExtraRooms((prev) => {
      const currentList = [...prev];
      if (newCount < currentList.length) {
        return currentList.slice(0, newCount);
      } else {
        const added: RoomDetails[] = [];
        for (let i = currentList.length; i < newCount; i++) {
          added.push({
            number: `EXT-${301 + i}`,
            capacity: virtualCapacity,
            floor: "Térreo",
          });
        }
        return [...currentList, ...added];
      }
    });
  };

  const handleExtraRoomFieldChange = (index: number, field: keyof RoomDetails, value: any) => {
    setExtraRooms((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "capacity" ? Number(value) || 0 : value,
      };
      return updated;
    });
  };

  const calcRealCapacity = () => {
    let sum = 0;
    if (rooms && rooms.length > 0) {
      sum += rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    } else {
      sum += roomsCount * virtualCapacity;
    }
    if (specialRooms && specialRooms.length > 0) {
      sum += specialRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    }
    return sum;
  };

  const calcExtraCapacity = () => {
    if (extraRooms && extraRooms.length > 0) {
      return extraRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    }
    return extraRoomsCount * virtualCapacity;
  };

  const calcVirtualEnemCapacity = () => roomsCount * 45; // Virtual is standard pre-absenteeism allowance (usually +50% or 45 per room)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const bData: BuildingInfo = {
      id: initialBuilding?.id,
      claId,
      name,
      address,
      roomsCount: Number(roomsCount),
      virtualCapacity: Number(virtualCapacity),
      realCapacity: calcRealCapacity(),
      coordRoom,
      specialRoomsCount: Number(specialRoomsCount),
      specialDetails,
      extraRoomsCount: Number(extraRoomsCount),
      rooms,
      specialRooms,
      extraRooms,
    };

    try {
      await onSave(bData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Maps URL Generator
  const getMapsSearchUrl = () => {
    if (!address) return "#";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + address)}`;
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="building-config-view">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="p-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-display font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>Gerenciamento do Prédio de Aplicação</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">3D ACTIVE</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Configure detalhes de salas, localização no Google Maps e dimensões de capacidade.</p>
        </div>
      </div>

      {readOnly && (
        <div className="mb-6 p-4 bg-indigo-500/10 text-indigo-850 dark:text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-indigo-500/20">
          <span className="text-slate-400">ℹ️</span>
          <span><strong>Modo de Leitura (ALA):</strong> Você tem acesso completo aos dados estruturais do prédio, mas somente o CLA possui permissão para salvar alterações nestas configurações.</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Informações do prédio do exame salvas com sucesso em tempo real com persistência na nuvem!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Endereço & Nome */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Nome da Escola / Prédio</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Escola Estadual Calango Verde"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden text-sm font-semibold transition disabled:opacity-60"
                required
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Endereço Completo</label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua das Acácias, 100 - Centro, Petrolina - PE"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden text-sm font-semibold transition disabled:opacity-60"
                  required
                  disabled={readOnly}
                />
                <MapPin className="w-4 h-4 text-emerald-550 dark:text-emerald-400 absolute left-3.5 top-3.5" />
              </div>
              
              {address && (
                <div className="mt-2 text-xs">
                  <a
                    href={getMapsSearchUrl()}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-emerald-550 dark:text-emerald-400 hover:text-emerald-650 font-extrabold underline inline-flex items-center gap-1 font-mono hover:scale-101 transition-transform"
                  >
                    Visualizar localização no Google Maps 🗺️ 🔗
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Sala da Coordenação</label>
                <input
                  type="text"
                  value={coordRoom}
                  onChange={(e) => setCoordRoom(e.target.value)}
                  placeholder="Ex: Sala de Professores Bloco A"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden text-sm font-semibold transition disabled:opacity-60"
                  disabled={readOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Qtd. de Salas Extra</label>
                <input
                  type="number"
                  min="0"
                  value={extraRoomsCount}
                  onChange={(e) => handleExtraRoomsCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden text-sm font-semibold transition disabled:opacity-60"
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Lista de Salas Extra configuradas */}
            {extraRooms.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-550 dark:text-indigo-400">
                    📂 Detalhamento das {extraRooms.length} Salas Extra
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Configure número, capacidade e andar</span>
                </div>
                <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                  {extraRooms.map((room, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-2 bg-white dark:bg-[#101726]/60 border border-slate-200 dark:border-slate-800 rounded-lg items-center animate-fade-in font-sans">
                      <div className="col-span-1 text-[11px] font-mono text-slate-400 text-center font-bold">
                        #{index + 1}
                      </div>
                      <div className="col-span-4">
                        <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Número</span>
                        <input
                          type="text"
                          value={room.number}
                          onChange={(e) => handleExtraRoomFieldChange(index, "number", e.target.value)}
                          placeholder="Ex: X-101"
                          className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                          required
                          disabled={readOnly}
                        />
                      </div>
                      <div className="col-span-3">
                        <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Capacidade</span>
                        <input
                          type="number"
                          value={room.capacity}
                          onChange={(e) => handleExtraRoomFieldChange(index, "capacity", parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                          min="1"
                          required
                          disabled={readOnly}
                        />
                      </div>
                      <div className="col-span-4">
                        <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Andar</span>
                        <select
                          value={room.floor}
                          onChange={(e) => handleExtraRoomFieldChange(index, "floor", e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold text-slate-800 dark:text-white focus:outline-hidden disabled:opacity-60"
                          required
                          disabled={readOnly}
                        >
                          {FLOOR_OPTIONS.map((floor) => (
                            <option key={floor} value={floor}>{floor}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Salas & Capacidades */}
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 dark:bg-[#070b13]/55 border-2 border-slate-150 dark:border-slate-800 rounded-2xl shadow-inner relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <h3 className="text-xs font-display font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <span>Módulo de Dimensionamento ENEM</span>
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1">Quantidade de Salas</label>
                  <input
                    type="number"
                    min="1"
                    value={roomsCount}
                    onChange={(e) => handleRoomsCountChange(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden font-mono font-extrabold text-xs disabled:opacity-60"
                    required
                    disabled={readOnly}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1">Capacidade Real / Sala</label>
                  <input
                    type="number"
                    min="1"
                    value={virtualCapacity}
                    onChange={(e) => handleVirtualCapacityChange(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden font-mono font-extrabold text-xs disabled:opacity-60"
                    required
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* Dynamic calculations reports with rich 3D badges */}
              <div className="space-y-3 border-t border-slate-150 dark:border-slate-800 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-extrabold font-mono text-[10.5px]">Capacidade Real (Regulares + Especiais):</span>
                  <span className="font-mono font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg text-xs border border-emerald-500/20 shadow-xs">
                    ⚡ {calcRealCapacity()} Candidatos
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-extrabold font-mono text-[10.5px]">Capacidade de Reserva (Salas Extra):</span>
                  <span className="font-mono font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-lg text-xs border border-amber-500/20 shadow-xs">
                    🛡️ {calcExtraCapacity()} Candidatos
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-extrabold font-mono text-[10.5px]">Capacidade Tolerância Virtual (Sem Extras):</span>
                  <span className="font-mono font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-lg text-xs border border-indigo-500/20 shadow-xs">
                    📈 {calcVirtualEnemCapacity()} Candidatos
                  </span>
                </div>
              </div>

              {/* Lista de Salas configuradas */}
              {rooms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-500 dark:text-indigo-400">
                      Detalhamento das {rooms.length} Salas
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">Configure número, capacidade e andar</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {rooms.map((room, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 p-2 bg-white dark:bg-[#101726]/60 border border-slate-200 dark:border-slate-800 rounded-lg items-center animate-fade-in">
                        <div className="col-span-1 text-[11px] font-mono text-slate-400 text-center font-bold">
                          #{index + 1}
                        </div>
                        <div className="col-span-4">
                          <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Número</span>
                          <input
                            type="text"
                            value={room.number}
                            onChange={(e) => handleRoomFieldChange(index, "number", e.target.value)}
                            placeholder="Ex: 101-A"
                            className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                            required
                            disabled={readOnly}
                          />
                        </div>
                        <div className="col-span-3">
                          <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Capac. Real</span>
                          <input
                            type="number"
                            value={room.capacity}
                            onChange={(e) => handleRoomFieldChange(index, "capacity", parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                            min="1"
                            required
                            disabled={readOnly}
                          />
                        </div>
                        <div className="col-span-4">
                          <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Andar</span>
                          <select
                            value={room.floor}
                            onChange={(e) => handleRoomFieldChange(index, "floor", e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold text-slate-850 dark:text-white focus:outline-hidden disabled:opacity-60"
                            required
                            disabled={readOnly}
                          >
                            {FLOOR_OPTIONS.map((floor) => (
                              <option key={floor} value={floor}>{floor}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-indigo-500/5 dark:bg-[#070b13]/55 border-2 border-indigo-500/10 dark:border-slate-800 rounded-2xl shadow-inner space-y-4">
              <div>
                <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <AlertCircle className="w-4 h-4 text-emerald-500" />
                  <span>Acessibilidade & Atendimento Especializado</span>
                </h4>

                <div className="max-w-xs">
                  <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Quantidade de Salas Especiais</label>
                  <input
                    type="number"
                    min="0"
                    value={specialRoomsCount}
                    onChange={(e) => handleSpecialRoomsCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full max-w-[140px] border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden font-mono font-bold text-xs disabled:opacity-60"
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* Lista de Salas Especializadas configuradas */}
              {specialRooms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-550 dark:text-indigo-400">
                      ♿ Detalhamento das {specialRooms.length} Salas Especializadas
                    </span>
                    <span className="text-[9px] text-slate-450 dark:text-slate-440 font-medium">Configure número, capacidade, andar e atendimento específico</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {specialRooms.map((room, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 p-2 bg-white dark:bg-[#101726]/60 border border-slate-200 dark:border-slate-800 rounded-lg items-center animate-fade-in">
                        <div className="col-span-1 text-[11px] font-mono text-slate-400 text-center font-bold">
                          #{index + 1}
                        </div>
                        <div className="col-span-2">
                          <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Número</span>
                          <input
                            type="text"
                            value={room.number}
                            onChange={(e) => handleSpecialRoomFieldChange(index, "number", e.target.value)}
                            placeholder="Ex: S-101"
                            className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                            required
                            disabled={readOnly}
                          />
                        </div>
                        <div className="col-span-2">
                          <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Capac.</span>
                          <input
                            type="number"
                            value={room.capacity}
                            onChange={(e) => handleSpecialRoomFieldChange(index, "capacity", parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                            min="1"
                            required
                            disabled={readOnly}
                          />
                        </div>
                        <div className="col-span-3">
                          <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Andar</span>
                          <select
                            value={room.floor}
                            onChange={(e) => handleSpecialRoomFieldChange(index, "floor", e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold text-slate-800 dark:text-white focus:outline-hidden disabled:opacity-60 font-mono"
                            required
                            disabled={readOnly}
                          >
                            {FLOOR_OPTIONS.map((floor) => (
                              <option key={floor} value={floor}>{floor}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Detalhamento / Especificidade</span>
                          <input
                            type="text"
                            value={room.details || ""}
                            onChange={(e) => handleSpecialRoomFieldChange(index, "details", e.target.value)}
                            placeholder="Ex: Libras, Ledor, Infantil"
                            className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-medium text-slate-850 dark:text-white disabled:opacity-60"
                            required
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-primary rounded-xl px-6 py-3 items-center justify-center flex gap-2 text-xs font-extrabold shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "SALVANDO..." : "SALVAR CONFIGURAÇÕES DO PRÉDIO"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
