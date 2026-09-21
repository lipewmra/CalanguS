import React, { useState, useEffect } from "react";
import { BuildingInfo, RoomDetails, SPECIALIZED_ROLES, SpecializedRole, EventConfigInfo } from "../types";
import {
  Landmark,
  Save,
  MapPin,
  Calculator,
  BookOpen,
  AlertCircle,
  Check,
  FileUp,
  FileText,
  Download,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Key,
  HelpCircle,
  ShieldCheck,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RotateCcw,
  Users,
} from "lucide-react";
import {
  getGeminiApiKey,
  maskApiKey,
  hasGeminiApiKey,
} from "../utils/geminiApiKey";
import {
  DEFAULT_COLLABORATOR_METRICS,
  calculateOfficialTier,
} from "../lib/metrics-calculator";

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
  userRole?: string;
  eventConfig?: EventConfigInfo | null;
}

export default function BuildingConfigView({ initialBuilding, claId, onSave, readOnly = false, userRole = "SuperAdmin", eventConfig }: BuildingProps) {
  const isSuperAdmin = userRole === "SuperAdmin";
  const isCla = userRole === "CLA";
  const isAla = userRole === "ALA";
  const isReadOnly = readOnly || isAla || userRole === "Colaborador";

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [roomsCount, setRoomsCount] = useState(0);
  const [virtualCapacity, setVirtualCapacity] = useState(30); // ENEM standard capability per room as helper
  const [coordRoom, setCoordRoom] = useState("");
  const [specialRoomsCount, setSpecialRoomsCount] = useState(0);
  const [specialDetails, setSpecialDetails] = useState("");
  const [extraRoomsCount, setExtraRoomsCount] = useState(0);
  
  // Specialized Attendance states
  const [hasSpecializedAttendance, setHasSpecializedAttendance] = useState<boolean>(false);
  const [specializedRoles, setSpecializedRoles] = useState<string[]>([]);
  const [openRoomRolePicker, setOpenRoomRolePicker] = useState<number | null>(null);

  // Quantitativo de outras funções do prédio (Menu 1 inferior)
  const [rolesTargetQuantities, setRolesTargetQuantities] = useState<Record<string, number>>({});
  const [newCustomRoleName, setNewCustomRoleName] = useState("");
  const [newCustomRoleQty, setNewCustomRoleQty] = useState(1);
  const [showAddCustomRole, setShowAddCustomRole] = useState(false);
  
  const [rooms, setRooms] = useState<RoomDetails[]>([]);
  const [specialRooms, setSpecialRooms] = useState<RoomDetails[]>([]);
  const [extraRooms, setExtraRooms] = useState<RoomDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // OCR Ensalamento states - recolhido por padrão
  const [isOcrExpanded, setIsOcrExpanded] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeApiKey, setActiveApiKey] = useState<string>(getGeminiApiKey());

  useEffect(() => {
    const handleKeyChange = (e: any) => {
      setActiveApiKey(e.detail?.apiKey || getGeminiApiKey());
    };

    window.addEventListener("calangus_api_key_changed", handleKeyChange);
    return () => {
      window.removeEventListener("calangus_api_key_changed", handleKeyChange);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setOcrError(null);
      setOcrSuccessMsg(null);
    }
  };

  const handleRunOCR = async (fileToUse?: File | null, useDefaultTemplate = false) => {
    setOcrLoading(true);
    setOcrError(null);
    setOcrSuccessMsg(null);

    const userKey = getGeminiApiKey();

    try {
      let bodyData: any = {
        apiKey: userKey || undefined,
      };

      if (useDefaultTemplate) {
        // Keep bodyData with apiKey
      } else if (fileToUse || selectedFile) {
        const file = fileToUse || selectedFile;
        if (!file) {
          throw new Error("Nenhum arquivo selecionado. Escolha um arquivo PDF/Imagem ou clique em 'Usar Modelo'.");
        }
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
        bodyData = {
          ...bodyData,
          fileData: base64,
          mimeType: file.type || "application/pdf"
        };
      }

      const res = await fetch("/api/parse-ensalamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.requiresApiKey
            ? "Chave de API do Gemini necessária. Acesse o menu Configurações (ícone ⚙️ no topo) para cadastrar sua chave."
            : (json.error || "Falha no processamento do OCR de ensalamento.")
        );
      }

      const data = json.data;

      // Populate extracted data into form
      if (data.schoolName && (isSuperAdmin || !name)) {
        setName(data.schoolName);
      }
      if (data.address && (isSuperAdmin || !address)) {
        setAddress(data.address);
      }
      if (data.coordRoom) {
        setCoordRoom(data.coordRoom);
      }

      if (data.rooms && Array.isArray(data.rooms) && data.rooms.length > 0) {
        setRooms(data.rooms);
        setRoomsCount(data.rooms.length);
        if (data.rooms[0]?.capacity) {
          setVirtualCapacity(data.rooms[0].capacity);
        }
      }

      if (data.specialRooms && Array.isArray(data.specialRooms) && data.specialRooms.length > 0) {
        setSpecialRooms(data.specialRooms);
        setSpecialRoomsCount(data.specialRooms.length);
        if (data.specialDetails) {
          setSpecialDetails(data.specialDetails);
        }
      } else {
        setSpecialRooms([]);
        setSpecialRoomsCount(0);
      }

      if (data.extraRooms && Array.isArray(data.extraRooms) && data.extraRooms.length > 0) {
        setExtraRooms(data.extraRooms);
        setExtraRoomsCount(data.extraRooms.length);
      } else {
        setExtraRooms([]);
        setExtraRoomsCount(0);
      }

      const roomCount = data.rooms?.length || 0;
      const extraCount = data.extraRooms?.length || 0;
      const specCount = data.specialRooms?.length || 0;

      setOcrSuccessMsg(
        `✨ Leitura OCR do Ensalamento concluída com sucesso! Foram extraídas ${roomCount} salas normais, ${extraCount} sala(s) extra/reserva e ${specCount} sala(s) especial(is). Todos os campos do sistema foram preenchidos.`
      );
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || "Erro ao executar OCR no arquivo de ensalamento.");
    } finally {
      setOcrLoading(false);
    }
  };

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

      const hasSpec = initialBuilding.hasSpecializedAttendance ?? (
        (initialBuilding.specialRoomsCount !== undefined && initialBuilding.specialRoomsCount > 0) ||
        (initialBuilding.specializedRoles && initialBuilding.specializedRoles.length > 0) ||
        false
      );
      setHasSpecializedAttendance(hasSpec);

      const hadVideoProvaSaved = Boolean(
        initialBuilding.hasVideoProva === true ||
        (initialBuilding.specializedRoles && (
          initialBuilding.specializedRoles.includes("Video Prova") ||
          initialBuilding.specializedRoles.some(r => /video\s*prova/i.test(r))
        ))
      );

      let loadedRoles = initialBuilding.specializedRoles && initialBuilding.specializedRoles.length > 0
        ? [...initialBuilding.specializedRoles]
        : (hasSpec ? SPECIALIZED_ROLES.filter(r => hadVideoProvaSaved ? true : (r !== "Video Prova" && r !== "Técnico de Informática")) : []);

      if (!hadVideoProvaSaved) {
        loadedRoles = loadedRoles.filter(r => r !== "Video Prova" && r !== "Técnico de Informática");
      }

      // Se o prédio tem atendimento especializado habilitado, assegura que as funções de ledores estejam presentes
      if (hasSpec) {
        const priorityRoles = ["Ledor/Transcritor Inglês", "Ledor/Transcritor", "Ledor/Transcritor Espanhol"];
        priorityRoles.forEach(r => {
          if (!loadedRoles.includes(r)) {
            loadedRoles.push(r);
          }
        });
      }
      setSpecializedRoles(loadedRoles);
      
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
          targetChefes: 1,
          targetAplicadores: 0,
        }));
        setExtraRooms(defaultExtra);
      } else {
        setExtraRooms([]);
      }

      // Quantitativo de funções de apoio do prédio (limpa qualquer registro prévio de Aplicador, Chefe ou Reserva)
      const cleanRolesTargets = { ...(initialBuilding.rolesTargetQuantities || {}) };
      Object.keys(cleanRolesTargets).forEach(key => {
        if (/aplicador|chefe|reserva/i.test(key)) {
          delete cleanRolesTargets[key];
        }
      });
      setRolesTargetQuantities(cleanRolesTargets);
    } else {
      setRoomsCount(0);
      setCoordRoom("");
      setSpecialRoomsCount(0);
      setSpecialDetails("");
      setExtraRoomsCount(0);
      setRooms([]);
      setSpecialRooms([]);
      setExtraRooms([]);
      setHasSpecializedAttendance(false);
      setSpecializedRoles([]);
      setRolesTargetQuantities({});
    }
  }, [initialBuilding]);

  // Cálculos de métricas do Super Admin para suporte e sugestão de quantitativos
  const metricsConfig = eventConfig?.collaboratorMetrics || DEFAULT_COLLABORATOR_METRICS;
  const totalSalasCount = Math.max(0, roomsCount + specialRoomsCount + extraRoomsCount);
  const defaultVolante = calculateOfficialTier(totalSalasCount);
  const defaultBanheiro = calculateOfficialTier(totalSalasCount);
  const defaultPorteiro = metricsConfig.porteirosPerBuilding ?? 2;
  const defaultLimpeza = metricsConfig.auxiliaresLimpezaPerBuilding ?? 2;
  const defaultRepresentante = metricsConfig.representanteLocalPerBuilding ?? 1;
  const hasVideoProva = Boolean(
    hasSpecializedAttendance && (
      specializedRoles.includes("Video Prova") ||
      specializedRoles.some(r => /video\s*prova/i.test(r)) ||
      (rolesTargetQuantities["Video Prova"] && rolesTargetQuantities["Video Prova"] > 0)
    )
  );
  const defaultInformatica = hasVideoProva ? (metricsConfig.tecnicosInformaticaPerBuilding ?? 1) : 0;

  const getDefaultRoleQty = (roleName: string): number => {
    switch (roleName) {
      case "Fiscal Volante / Corredor":
      case "Fiscal Volante":
        return defaultVolante;
      case "Fiscal de Banheiro":
        return defaultBanheiro;
      case "Representante do Local":
        return defaultRepresentante;
      case "Auxiliar de Limpeza":
      case "Limpeza":
        return defaultLimpeza;
      case "Porteiro":
        return defaultPorteiro;
      case "Técnico de Informática":
        return defaultInformatica;
      default:
        return 0;
    }
  };

  const getEffectiveRoleQty = (roleName: string): number => {
    if (rolesTargetQuantities[roleName] !== undefined) {
      return rolesTargetQuantities[roleName];
    }
    return getDefaultRoleQty(roleName);
  };

  const handleRoleTargetChange = (roleName: string, deltaOrValue: number, isAbsolute = false) => {
    setRolesTargetQuantities(prev => {
      const currentVal = prev[roleName] !== undefined ? prev[roleName] : getDefaultRoleQty(roleName);
      const newVal = isAbsolute ? Math.max(0, deltaOrValue) : Math.max(0, currentVal + deltaOrValue);
      return {
        ...prev,
        [roleName]: newVal
      };
    });
  };

  const handleRemoveSupportRole = (roleName: string) => {
    setRolesTargetQuantities(prev => {
      const updated = { ...prev };
      updated[roleName] = 0;
      return updated;
    });
  };

  const handleDeleteCustomSupportRole = (roleName: string) => {
    setRolesTargetQuantities(prev => {
      const updated = { ...prev };
      delete updated[roleName];
      return updated;
    });
  };

  const handleResetSupportRolesToOfficial = () => {
    const nextTargets: Record<string, number> = {
      "Fiscal Volante / Corredor": defaultVolante,
      "Fiscal de Banheiro": defaultBanheiro,
      "Representante do Local": defaultRepresentante,
      "Auxiliar de Limpeza": defaultLimpeza,
      "Porteiro": defaultPorteiro,
    };
    if (hasVideoProva) {
      nextTargets["Técnico de Informática"] = defaultInformatica;
    }
    setRolesTargetQuantities(nextTargets);
  };

  const handleAddCustomSupportRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCustomRoleName.trim();
    if (!trimmed) return;
    if (/aplicador|chefe/i.test(trimmed)) {
      alert("As funções de Aplicador e Chefe de Sala já são calculadas automaticamente nas salas de prova (Módulo de Dimensionamento) e não pertencem ao espaço de Outras Funções.");
      return;
    }
    if (/reserva/i.test(trimmed)) {
      alert("Funções de Reserva não são postos fixos de apoio e não devem ser cadastradas como vagas deste quadro.");
      return;
    }
    setRolesTargetQuantities(prev => ({
      ...prev,
      [trimmed]: Math.max(1, newCustomRoleQty)
    }));
    setNewCustomRoleName("");
    setNewCustomRoleQty(1);
    setShowAddCustomRole(false);
  };

  const handleResetRoomsToOfficialDefaults = () => {
    setRooms(prev => prev.map(r => ({
      ...r,
      targetChefes: 1,
      targetAplicadores: (r.capacity > 60 ? 2 : 1)
    })));
  };

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
            targetChefes: 1,
            targetAplicadores: virtualCapacity > 60 ? 2 : 1,
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
        [field]: (field === "capacity" || field === "targetChefes" || field === "targetAplicadores")
          ? Math.max(0, Number(value) || 0)
          : value,
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
            targetChefes: 1,
            targetAplicadores: 0,
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
        [field]: (field === "capacity" || field === "targetChefes" || field === "targetAplicadores")
          ? Math.max(0, Number(value) || 0)
          : value,
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
            targetChefes: 1,
            targetAplicadores: 0,
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
        [field]: (field === "capacity" || field === "targetChefes" || field === "targetAplicadores")
          ? Math.max(0, Number(value) || 0)
          : value,
      };
      return updated;
    });
  };

  const handleToggleRoomSpecializedRole = (roomIndex: number, role: string) => {
    setSpecialRooms((prev) => {
      const updated = [...prev];
      const room = updated[roomIndex];
      const currentRoles: string[] = room.specializedRoles ? [...room.specializedRoles] : (
        room.details ? room.details.split(",").map(s => s.trim()).filter(Boolean) : []
      );
      let newRoles: string[];
      if (currentRoles.includes(role)) {
        newRoles = currentRoles.filter(r => r !== role);
      } else {
        newRoles = [...currentRoles, role];
      }
      updated[roomIndex] = {
        ...room,
        specializedRoles: newRoles,
        details: newRoles.join(", "),
      };
      return updated;
    });
  };

  const handleAddRoleInstance = (roomIndex: number, role: string) => {
    setSpecialRooms((prev) => {
      const updated = [...prev];
      const room = updated[roomIndex];
      const currentRoles: string[] = room.specializedRoles ? [...room.specializedRoles] : (
        room.details ? room.details.split(",").map(s => s.trim()).filter(Boolean) : []
      );
      const newRoles = [...currentRoles, role];
      updated[roomIndex] = {
        ...room,
        specializedRoles: newRoles,
        details: newRoles.join(", "),
      };
      return updated;
    });
  };

  const handleRemoveRoleInstance = (roomIndex: number, role: string) => {
    setSpecialRooms((prev) => {
      const updated = [...prev];
      const room = updated[roomIndex];
      const currentRoles: string[] = room.specializedRoles ? [...room.specializedRoles] : (
        room.details ? room.details.split(",").map(s => s.trim()).filter(Boolean) : []
      );
      const idxToRemove = currentRoles.lastIndexOf(role);
      if (idxToRemove >= 0) {
        currentRoles.splice(idxToRemove, 1);
      }
      updated[roomIndex] = {
        ...room,
        specializedRoles: [...currentRoles],
        details: currentRoles.join(", "),
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

    // Preservar Aplicador, Chefe de Sala e metas oficiais já salvas pelo CLA no Menu 2
    const sanitizedRolesTargetQuantities: Record<string, number> = {
      ...(initialBuilding?.rolesTargetQuantities || {})
    };
    Object.entries(rolesTargetQuantities).forEach(([k, v]) => {
      sanitizedRolesTargetQuantities[k] = Number(v) || 0;
    });

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
      hasSpecializedAttendance: Boolean(hasSpecializedAttendance),
      hasVideoProva: Boolean(
        hasSpecializedAttendance && (
          specializedRoles.includes("Video Prova") ||
          specializedRoles.some(r => /video\s*prova/i.test(r)) ||
          (rolesTargetQuantities["Video Prova"] && rolesTargetQuantities["Video Prova"] > 0)
        )
      ),
      specializedRoles: hasSpecializedAttendance ? specializedRoles : [],
      rolesTargetQuantities: sanitizedRolesTargetQuantities,
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

      {isReadOnly ? (
        <div className="mb-6 p-4 bg-amber-500/10 text-amber-850 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-amber-500/20">
          <span className="text-amber-500">⚠️</span>
          <span><strong>Modo de Leitura (ALA):</strong> Você possui acesso apenas para consulta em tempo real das configurações estruturais, salas e capacidades deste prédio de aplicação. As alterações são gerenciadas pela Cebraspe Central (SuperAdmin) ou pelo Coordenador do Local (CLA).</span>
        </div>
      ) : isCla ? (
        <div className="mb-6 p-4 bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-indigo-500/20">
          <span className="text-indigo-500 font-mono font-bold text-base">ℹ️</span>
          <span><strong>Informações do Local (CLA):</strong> O nome da escola e o endereço são gerenciados exclusivamente pelo Super Administrador da Cebraspe Central. Você (Coordenador) pode alterar e salvar livremente a sala da coordenação, as salas extras, a quantidade total de salas, as capacidades reais e os atendimentos de acessibilidade / salas especiais.</span>
        </div>
      ) : null}

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Informações do prédio do exame salvas com sucesso em tempo real com persistência na nuvem!</span>
        </div>
      )}

      {/* MÓDULO OCR DE ENSALAMENTO (RECOLHIDO POR PADRÃO) */}
      <div className="mb-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 border-2 border-emerald-500/30 rounded-2xl shadow-xs overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsOcrExpanded(prev => !prev)}
          className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-emerald-500/5 transition select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-md shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  OCR & Envio do Ensalamento
                </h3>
                <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-mono font-black">
                  GEMINI AI 3.7 VISION
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {isOcrExpanded ? "Clique para recolher ▲" : "Recolhido (clique para expandir) ▼"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 line-clamp-1">
                Envie o documento de ensalamento para extrair automaticamente salas de prova, capacidades, sala da coordenação e salas extras.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[10px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              Processamento Óptico
            </span>
            {isOcrExpanded ? (
              <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
        </button>

        {isOcrExpanded && (
          <div className="p-5 pt-2 border-t border-emerald-500/20 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch pt-2">
              <label className="flex-1 cursor-pointer flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#101726] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-xl transition text-xs font-semibold text-slate-700 dark:text-slate-200 overflow-hidden">
                <FileUp className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">
                  {selectedFile ? selectedFile.name : "Escolher arquivo de Ensalamento..."}
                </span>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isReadOnly || ocrLoading}
                />
              </label>

              <button
                type="button"
                onClick={() => handleRunOCR()}
                disabled={isReadOnly || ocrLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {ocrLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ANALISANDO...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>ANALISAR ARQUIVO</span>
                  </>
                )}
              </button>
            </div>

            {ocrError && (
              <div className="p-3 bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl flex items-center justify-between gap-2 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{ocrError}</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Chaves de API são gerenciadas no menu Configurações (⚙️)
                </span>
              </div>
            )}

            {ocrSuccessMsg && (
              <div className="p-3 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold rounded-xl flex items-center gap-2 border border-emerald-500/30 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{ocrSuccessMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ATENDIMENTO ESPECIALIZADO NO TOPO DO MENU 1 */}
        <div className="p-5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-teal-950/40 border-2 border-purple-500/30 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Atendimento Especializado na Coordenação</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-black ${
                    hasSpecializedAttendance 
                      ? "bg-purple-600 text-white" 
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}>
                    {hasSpecializedAttendance ? "HABILITADO" : "NÃO HABILITADO"}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  Indique se este local de aplicação possui atendimento especializado e selecione as funções especiais requeridas.
                </p>
              </div>
            </div>

            {/* Toggle Checkbox */}
            <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-purple-500/50 cursor-pointer shadow-xs hover:border-purple-600 transition shrink-0 select-none">
              <input
                type="checkbox"
                checked={hasSpecializedAttendance}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasSpecializedAttendance(checked);
                  if (checked && specializedRoles.length === 0) {
                    setSpecializedRoles([...SPECIALIZED_ROLES]);
                  }
                }}
                disabled={isReadOnly}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
              />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Possui Atendimento Especializado
              </span>
            </label>
          </div>

          {/* Lista com checkbox com todas as funções especializadas */}
          {hasSpecializedAttendance && (
            <div className="pt-3 border-t border-purple-500/20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <span>Funções Especializadas Disponíveis ({specializedRoles.length} de {SPECIALIZED_ROLES.length}):</span>
                </span>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSpecializedRoles([...SPECIALIZED_ROLES])}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      Marcar todas
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={() => setSpecializedRoles([])}
                      className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Desmarcar todas
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {SPECIALIZED_ROLES.map((role) => {
                  const isChecked = specializedRoles.includes(role);
                  const isTI = role === "Técnico de Informática";
                  const hasVideoProva = specializedRoles.includes("Video Prova");

                  return (
                    <label
                      key={role}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition cursor-pointer select-none ${
                        isChecked
                          ? "bg-purple-500/15 border-purple-500 dark:bg-purple-950/40 dark:border-purple-600"
                          : "bg-white/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-purple-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (role === "Video Prova") {
                              setSpecializedRoles(prev => Array.from(new Set([...prev, "Video Prova", "Técnico de Informática"])));
                            } else {
                              setSpecializedRoles(prev => [...prev, role]);
                            }
                          } else {
                            setSpecializedRoles(prev => prev.filter(r => r !== role));
                          }
                        }}
                        disabled={isReadOnly}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {role}
                        </span>
                        {isTI && (
                          <span className={`text-[9px] block ${isChecked ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400 font-medium"}`}>
                            {isChecked ? "✓ Informado para Alocação no Menu 3" : "Habilita a alocação de TI no Menu 3"}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
                disabled={isReadOnly || !isSuperAdmin}
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
                  disabled={isReadOnly || !isSuperAdmin}
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Lista de Salas Extra configuradas */}
            {extraRooms.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-550 dark:text-indigo-400">
                    📂 Detalhamento das {extraRooms.length} Salas Extra (Reserva)
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Configure número, capacidade, andar e fiscais da sala</span>
                </div>
                <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                  {extraRooms.map((room, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-2.5 bg-white dark:bg-[#101726]/60 border border-slate-200 dark:border-slate-800 rounded-xl items-center animate-fade-in font-sans shadow-xs">
                      <div className="col-span-1 text-[11px] font-mono text-amber-500 text-center font-black">
                        #{index + 1}
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Número</span>
                        <input
                          type="text"
                          value={room.number}
                          onChange={(e) => handleExtraRoomFieldChange(index, "number", e.target.value)}
                          placeholder="Ex: X-101"
                          className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                          required
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Capacidade</span>
                        <input
                          type="number"
                          value={room.capacity}
                          onChange={(e) => handleExtraRoomFieldChange(index, "capacity", parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                          min="1"
                          required
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Andar</span>
                        <select
                          value={room.floor}
                          onChange={(e) => handleExtraRoomFieldChange(index, "floor", e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold text-slate-800 dark:text-white focus:outline-hidden disabled:opacity-60"
                          required
                          disabled={isReadOnly}
                        >
                          {FLOOR_OPTIONS.map((floor) => (
                            <option key={floor} value={floor}>{floor}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <span className="text-[8px] uppercase text-amber-600 dark:text-amber-400 block font-extrabold mb-0.5" title="Quantidade de Chefes para esta sala">
                          Chefes
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={room.targetChefes !== undefined ? room.targetChefes : 1}
                          onChange={(e) => handleExtraRoomFieldChange(index, "targetChefes", parseInt(e.target.value) || 0)}
                          className="w-full bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-xs rounded-md font-black font-mono text-amber-900 dark:text-amber-200 disabled:opacity-60"
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <span className="text-[8px] uppercase text-indigo-600 dark:text-indigo-400 block font-extrabold mb-0.5" title="Quantidade de Aplicadores para esta sala">
                          Aplicadores
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={room.targetAplicadores !== undefined ? room.targetAplicadores : 0}
                          onChange={(e) => handleExtraRoomFieldChange(index, "targetAplicadores", parseInt(e.target.value) || 0)}
                          className="w-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-1 text-xs rounded-md font-black font-mono text-indigo-900 dark:text-indigo-200 disabled:opacity-60"
                          disabled={isReadOnly}
                        />
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-500 dark:text-indigo-400">
                      Detalhamento das {rooms.length} Salas Regulares
                    </span>
                    <div className="flex items-center gap-2">
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={handleResetRoomsToOfficialDefaults}
                          className="px-2.5 py-1 text-[9.5px] font-bold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition cursor-pointer"
                          title="Define 1 Chefe e 1 Aplicador por sala (ou 2 aplicadores caso a capacidade seja maior que 60)"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Padrão Oficial (1 Chefe / 1 Aplic.)</span>
                        </button>
                      )}
                      <span className="text-[9px] text-slate-400 font-medium">Configure número, capacidade, andar e fiscais</span>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {rooms.map((room, index) => {
                      const defaultAplicadores = (room.capacity > 60) ? 2 : 1;
                      const currentChefes = room.targetChefes !== undefined ? room.targetChefes : 1;
                      const currentAplicadores = room.targetAplicadores !== undefined ? room.targetAplicadores : defaultAplicadores;

                      return (
                        <div key={index} className="grid grid-cols-12 gap-2 p-2.5 bg-white dark:bg-[#101726]/60 border border-slate-200 dark:border-slate-800 rounded-xl items-center animate-fade-in shadow-xs">
                          <div className="col-span-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 text-center font-black">
                            #{index + 1}
                          </div>
                          <div className="col-span-3 sm:col-span-2">
                            <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Número</span>
                            <input
                              type="text"
                              value={room.number}
                              onChange={(e) => handleRoomFieldChange(index, "number", e.target.value)}
                              placeholder="Ex: 101-A"
                              className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                              required
                              disabled={isReadOnly}
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-2">
                            <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Capac. Real</span>
                            <input
                              type="number"
                              value={room.capacity}
                              onChange={(e) => handleRoomFieldChange(index, "capacity", parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                              min="1"
                              required
                              disabled={isReadOnly}
                            />
                          </div>
                          <div className="col-span-5 sm:col-span-3">
                            <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Andar</span>
                            <select
                              value={room.floor}
                              onChange={(e) => handleRoomFieldChange(index, "floor", e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold text-slate-850 dark:text-white focus:outline-hidden disabled:opacity-60"
                              required
                              disabled={isReadOnly}
                            >
                              {FLOOR_OPTIONS.map((floor) => (
                                <option key={floor} value={floor}>{floor}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <span className="text-[8px] uppercase text-amber-600 dark:text-amber-400 block font-extrabold mb-0.5" title="Chefes de Sala requeridos (Padrão 1)">
                              Chefes
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={currentChefes}
                              onChange={(e) => handleRoomFieldChange(index, "targetChefes", parseInt(e.target.value) || 0)}
                              className="w-full bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-xs rounded-md font-black font-mono text-amber-900 dark:text-amber-200 disabled:opacity-60"
                              disabled={isReadOnly}
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <span className="text-[8px] uppercase text-indigo-600 dark:text-indigo-400 block font-extrabold mb-0.5" title="Aplicadores requeridos (Padrão 1 ou 2 se capacidade > 60)">
                              Aplicadores
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={currentAplicadores}
                              onChange={(e) => handleRoomFieldChange(index, "targetAplicadores", parseInt(e.target.value) || 0)}
                              className="w-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-1 text-xs rounded-md font-black font-mono text-indigo-900 dark:text-indigo-200 disabled:opacity-60"
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-indigo-500/5 dark:bg-[#070b13]/55 border-2 border-indigo-500/10 dark:border-slate-800 rounded-2xl shadow-inner space-y-4">
              <div>
                <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4 text-emerald-500" />
                  <span>Acessibilidade & Atendimento Especializado</span>
                </h4>

                {!hasSpecializedAttendance ? (
                  <div className="p-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-lg">♿</span>
                    <div>
                      <span className="font-bold block text-slate-700 dark:text-slate-300">Atendimento Especializado Desabilitado</span>
                      <span>Para cadastrar salas especiais e detalhar funções de acessibilidade, marque a opção &quot;Possui Atendimento Especializado&quot; no topo deste formulário.</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="max-w-xs">
                      <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Quantidade de Salas Especiais</label>
                      <input
                        type="number"
                        min="0"
                        value={specialRoomsCount}
                        onChange={(e) => handleSpecialRoomsCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full max-w-[140px] border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden font-mono font-bold text-xs disabled:opacity-60"
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Lista de Salas Especializadas configuradas */}
                    {specialRooms.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-550 dark:text-indigo-400">
                            ♿ Detalhamento das {specialRooms.length} Salas Especializadas
                          </span>
                          <span className="text-[9px] text-slate-450 dark:text-slate-440 font-medium">
                            Selecione as funções especializadas requeridas para cada sala
                          </span>
                        </div>
                        <div className="max-h-96 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                          {specialRooms.map((room, index) => {
                            const availableRoles = Array.from(new Set([...(specializedRoles.length > 0 ? specializedRoles : SPECIALIZED_ROLES), "Ledor/Transcritor Inglês", "Ledor/Transcritor", "Ledor/Transcritor Espanhol"]));
                            const roomRoles: string[] = room.specializedRoles || (
                              room.details ? room.details.split(",").map(s => s.trim()).filter(Boolean) : []
                            );
                            const counts: Record<string, number> = {};
                            roomRoles.forEach(r => { counts[r] = (counts[r] || 0) + 1; });

                            return (
                              <div key={index} className="p-3 bg-white dark:bg-[#101726]/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-fade-in shadow-xs">
                                <div className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-1 text-[11px] font-mono text-purple-600 dark:text-purple-400 text-center font-black">
                                    #{index + 1}
                                  </div>
                                  <div className="col-span-3 sm:col-span-2">
                                    <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Número</span>
                                    <input
                                      type="text"
                                      value={room.number}
                                      onChange={(e) => handleSpecialRoomFieldChange(index, "number", e.target.value)}
                                      placeholder="Ex: S-101"
                                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                                      required
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                  <div className="col-span-3 sm:col-span-2">
                                    <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Capac.</span>
                                    <input
                                      type="number"
                                      value={room.capacity}
                                      onChange={(e) => handleSpecialRoomFieldChange(index, "capacity", parseInt(e.target.value) || 0)}
                                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold font-mono text-slate-800 dark:text-white disabled:opacity-60"
                                      min="1"
                                      required
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                  <div className="col-span-5 sm:col-span-2">
                                    <span className="text-[8px] uppercase text-slate-400 block font-extrabold mb-0.5">Andar</span>
                                    <select
                                      value={room.floor}
                                      onChange={(e) => handleSpecialRoomFieldChange(index, "floor", e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs rounded-md font-semibold text-slate-800 dark:text-white focus:outline-hidden disabled:opacity-60 font-mono"
                                      required
                                      disabled={isReadOnly}
                                    >
                                      {FLOOR_OPTIONS.map((floor) => (
                                        <option key={floor} value={floor}>{floor}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-4 sm:col-span-1">
                                    <span className="text-[8px] uppercase text-amber-600 dark:text-amber-400 block font-extrabold mb-0.5" title="Chefes de Sala requeridos (Padrão 1)">
                                      Chefes
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={room.targetChefes !== undefined ? room.targetChefes : 1}
                                      onChange={(e) => handleSpecialRoomFieldChange(index, "targetChefes", parseInt(e.target.value) || 0)}
                                      className="w-full bg-amber-500/10 border border-amber-500/30 px-1.5 py-1 text-xs rounded-md font-black font-mono text-amber-900 dark:text-amber-200 disabled:opacity-60 text-center"
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                  <div className="col-span-4 sm:col-span-1">
                                    <span className="text-[8px] uppercase text-indigo-600 dark:text-indigo-400 block font-extrabold mb-0.5" title="Aplicadores Comuns requeridos (Padrão 0)">
                                      Aplic.
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={room.targetAplicadores !== undefined ? room.targetAplicadores : 0}
                                      onChange={(e) => handleSpecialRoomFieldChange(index, "targetAplicadores", parseInt(e.target.value) || 0)}
                                      className="w-full bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-1 text-xs rounded-md font-black font-mono text-indigo-900 dark:text-indigo-200 disabled:opacity-60 text-center"
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                  <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setOpenRoomRolePicker(openRoomRolePicker === index ? null : index)}
                                      className="w-full sm:w-auto px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                      disabled={isReadOnly}
                                      title="Configurar Ledores, Transcritores, Guia-Intérprete para esta sala"
                                    >
                                      <span>♿ {openRoomRolePicker === index ? "Fechar" : "Especialistas"}</span>
                                      <span className="px-1.5 py-0.2 bg-purple-600 text-white rounded-full text-[9px] font-black">
                                        {roomRoles.length}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                {/* Badges das funções selecionadas para esta sala */}
                                <div className="p-2 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center gap-1.5">
                                  {roomRoles.length === 0 ? (
                                    <span
                                      onClick={() => !isReadOnly && setOpenRoomRolePicker(index)}
                                      className="text-[10px] text-slate-400 italic cursor-pointer"
                                    >
                                      Nenhuma função especializada marcada. Clique em &quot;Selecionar Funções&quot; para escolher (Ledor, Transcritor, etc.).
                                    </span>
                                  ) : (
                                    Object.entries(counts).map(([rName, cnt]) => (
                                      <span
                                        key={rName}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-[10.5px] font-bold"
                                      >
                                        <span>{rName}</span>
                                        {cnt > 1 && (
                                          <span className="px-1.5 py-0.2 bg-purple-600 text-white rounded text-[9px] font-black">
                                            {cnt} colaboradores
                                          </span>
                                        )}
                                        {!isReadOnly && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveRoleInstance(index, rName)}
                                            className="text-purple-500 hover:text-red-500 ml-0.5 font-black leading-none"
                                            title="Remover uma vaga"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </span>
                                    ))
                                  )}
                                </div>

                                {/* Seletor Popover com Checkboxes de todas as funções especializadas */}
                                {openRoomRolePicker === index && (
                                  <div className="p-3 bg-white dark:bg-[#0d1527] border-2 border-purple-500/40 rounded-xl shadow-lg space-y-2.5 animate-fade-in">
                                    <div className="flex items-center justify-between border-b pb-1.5 border-slate-150 dark:border-slate-800">
                                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300">
                                        Seletor de Funções Especializadas - Sala {room.number || `#${index + 1}`}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setOpenRoomRolePicker(null)}
                                        className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                                      >
                                        ✕ Concluir
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                      Marque as funções que atuarão nesta sala. Se houver mais de um colaborador da mesma função, use o botão (+) para adicionar mais vagas.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {availableRoles.map((role) => {
                                        const count = roomRoles.filter(r => r === role).length;
                                        const isSelected = count > 0;

                                        return (
                                          <div
                                            key={role}
                                            className={`flex items-center justify-between p-2 rounded-lg border text-xs transition ${
                                              isSelected
                                                ? "bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 font-bold"
                                                : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                            }`}
                                          >
                                            <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1 select-none">
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleRoomSpecializedRole(index, role)}
                                                disabled={isReadOnly}
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                                              />
                                              <span className="truncate">{role}</span>
                                            </label>

                                            {isSelected && !isReadOnly && (
                                              <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveRoleInstance(index, role)}
                                                  className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px] hover:bg-red-500 hover:text-white cursor-pointer"
                                                  title="Diminuir quantidade"
                                                >
                                                  -
                                                </button>
                                                <span className="font-mono text-[10px] font-black w-3.5 text-center">{count}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleAddRoleInstance(index, role)}
                                                  className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] hover:bg-purple-700 cursor-pointer"
                                                  title="Adicionar mais um colaborador desta função nesta sala"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Outras Funções Operacionais do Local (Apoio & Logística) */}
        <div className="mt-6 p-5 bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-display font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Quantitativo de Outras Funções Operacionais (Apoio & Logística)</span>
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Defina a quantidade de vagas para funções de apoio do local. Os valores iniciais seguem as métricas do Super Admin ({totalSalasCount} salas no total).
              </p>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSupportRolesToOfficial}
                  className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  title="Restaura os quantitativos de apoio para as métricas oficiais calculadas pelo Super Admin"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Métricas Oficiais</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomRole(!showAddCustomRole)}
                  className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Outra Função</span>
                </button>
              </div>
            )}
          </div>

          {/* Form para adicionar nova função personalizada */}
          {showAddCustomRole && !isReadOnly && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fade-in space-y-2">
              <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 block">
                Cadastrar Nova Função de Apoio para este Local
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome da Função (Ex: Apoio de Triagem, Segurança Externa, etc.)"
                  value={newCustomRoleName}
                  onChange={(e) => setNewCustomRoleName(e.target.value)}
                  className="w-full flex-1 bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs rounded-lg font-medium text-slate-900 dark:text-white"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">Qtd:</span>
                  <input
                    type="number"
                    min="1"
                    value={newCustomRoleQty}
                    onChange={(e) => setNewCustomRoleQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs rounded-lg font-bold font-mono text-slate-900 dark:text-white text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSupportRole}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomRole(false)}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid de Funções de Apoio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { role: "Fiscal Volante / Corredor", label: "Fiscal Volante", defaultQty: defaultVolante, icon: "🏃" },
              { role: "Fiscal de Banheiro", label: "Fiscal de Banheiro", defaultQty: defaultBanheiro, icon: "🚻" },
              { role: "Representante do Local", label: "Representante do Local", defaultQty: defaultRepresentante, icon: "👔" },
              { role: "Auxiliar de Limpeza", label: "Auxiliar de Limpeza", defaultQty: defaultLimpeza, icon: "🧹" },
              { role: "Porteiro", label: "Porteiro", defaultQty: defaultPorteiro, icon: "🚪" },
              ...(hasVideoProva ? [{ role: "Técnico de Informática", label: "Técnico de Informática", defaultQty: defaultInformatica, icon: "💻" }] : []),
            ].map(({ role, label, defaultQty, icon }) => {
              const currentQty = getEffectiveRoleQty(role);
              const isDifferent = currentQty !== defaultQty;

              return (
                <div key={role} className="p-3 bg-white dark:bg-[#101726]/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block truncate" title={label}>
                          {label}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          Métrica Super Admin: <b className="text-slate-600 dark:text-slate-300">{defaultQty}</b>
                        </span>
                      </div>
                    </div>
                    {isDifferent && (
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                        Personalizado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1">
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRoleTargetChange(role, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center transition cursor-pointer"
                          title="Reduzir 1 vaga"
                        >
                          -
                        </button>
                      )}
                      <input
                        type="number"
                        min="0"
                        value={currentQty}
                        onChange={(e) => handleRoleTargetChange(role, Math.max(0, parseInt(e.target.value) || 0), true)}
                        className="w-12 py-1 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-lg text-center font-mono font-black text-xs text-slate-900 dark:text-white disabled:opacity-60"
                        disabled={isReadOnly}
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRoleTargetChange(role, 1)}
                          className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center transition cursor-pointer"
                          title="Aumentar 1 vaga"
                        >
                          +
                        </button>
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        {currentQty !== defaultQty && (
                          <button
                            type="button"
                            onClick={() => handleRoleTargetChange(role, defaultQty, true)}
                            className="px-1.5 py-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                            title="Restaurar para a métrica sugerida"
                          >
                            Padrão
                          </button>
                        )}
                        {currentQty > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSupportRole(role)}
                            className="px-1.5 py-1 text-[9px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                            title="Zerar quantidade desta função"
                          >
                            Zerar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Funções Customizadas extras cadastradas pelo CLA */}
            {Object.entries(rolesTargetQuantities)
              .filter(([rName]) => {
                // REGRA DO USUÁRIO: Aplicador e Chefe de Sala já são calculados no Módulo de Dimensionamento
                // e JAMAIS devem aparecer neste espaço de Quantitativo de Outras Funções.
                if (/aplicador|chefe/i.test(rName)) return false;
                if (/reserva/i.test(rName)) return false;
                return ![
                  "Fiscal Volante / Corredor",
                  "Fiscal Volante",
                  "Fiscal de Banheiro",
                  "Representante do Local",
                  "Auxiliar de Limpeza",
                  "Limpeza",
                  "Porteiro",
                  "Técnico de Informática",
                  "Video Prova"
                ].includes(rName);
              })
              .map(([customRole, qty]) => (
                <div key={customRole} className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">✨</span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 block truncate" title={customRole}>
                          {customRole}
                        </span>
                        <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 block">
                          Função Personalizada
                        </span>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomSupportRole(customRole)}
                        className="text-slate-400 hover:text-red-500 transition cursor-pointer p-1"
                        title="Remover esta função personalizada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-500/20">
                    <div className="flex items-center gap-1">
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRoleTargetChange(customRole, -1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center transition border border-emerald-500/30 cursor-pointer"
                        >
                          -
                        </button>
                      )}
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => handleRoleTargetChange(customRole, Math.max(0, parseInt(e.target.value) || 0), true)}
                        className="w-12 py-1 bg-white dark:bg-[#070b13] border border-emerald-500/30 rounded-lg text-center font-mono font-black text-xs text-slate-900 dark:text-white disabled:opacity-60"
                        disabled={isReadOnly}
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRoleTargetChange(customRole, 1)}
                          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center transition cursor-pointer"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {!isReadOnly && (
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
