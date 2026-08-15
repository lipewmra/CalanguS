import React, { useState, useRef, useEffect } from "react";
import { 
  User, 
  Coffee, 
  FileText, 
  Calendar, 
  CheckSquare, 
  MapPin, 
  Navigation, 
  Check, 
  Upload, 
  Camera,
  X, 
  ExternalLink, 
  Video, 
  Image as ImageIcon,
  AlertTriangle, 
  Info, 
  Sparkles, 
  BookOpen,
  ArrowRight,
  UserCheck,
  ChevronDown
} from "lucide-react";
import { UserProfile, BuildingInfo, CateringInfo, CollaboratorInfo } from "../types";
import PhotoUploader from "./PhotoUploader";
import { DEFAULT_ENEM_SCHEDULE } from "./CollaboratorSettingsView";

interface CollaboratorDashboardProps {
  currentUser: UserProfile;
  building: BuildingInfo | null;
  catering: CateringInfo | null;
  collaboratorRecord: CollaboratorInfo | null;
  individualConfirmationStatus: "Pendente" | "Confirmado" | "Recusado";
  onUpdateConfirmationStatus: (status: "Pendente" | "Confirmado" | "Recusado", roleNameToRefuse?: string) => void;
  onUpdateProfile: (updates: Partial<CollaboratorInfo>) => Promise<void>;
}

export default function CollaboratorDashboard({
  currentUser,
  building,
  catering,
  collaboratorRecord,
  individualConfirmationStatus,
  onUpdateConfirmationStatus,
  onUpdateProfile
}: CollaboratorDashboardProps) {
  const [activeMenuTab, setActiveMenuTab] = useState<string>("");
  const [isRefusingModalOpen, setIsRefusingModalOpen] = useState(false);
  
  // Profile edit states
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [education, setEducation] = useState<any>("Ensino Superior Completo");
  const [referencePerson, setReferencePerson] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Snack menu choice states
  const [snackPreference, setSnackPreference] = useState("Padrão");
  const [restrictions, setRestrictions] = useState("");
  const [isSavingSnack, setIsSavingSnack] = useState(false);
  const [snackSuccessMsg, setSnackSuccessMsg] = useState("");

  // Interactive Checklist states (Stored in LocalStorage for persistence per collaborator)
  const [checklistItems, setChecklistItems] = useState([
    { id: "apparel", label: "Vestuário Recomendado", desc: "Usar roupas leves e sapato inteiramente fechado (Regulamento Cebraspe obriga calçado fechado).", checked: false },
    { id: "pen", label: "Caneta Esferográfica Preta", desc: "Levar de 2 a 3 canetas de corpo transparente e tinta de cor preta ou azul.", checked: false },
    { id: "id", label: "Documento Oficial com Foto", desc: "Levar carteira de identidade física original (RG, CNH, Passaporte ou e-Título).", checked: false },
    { id: "water", label: "Água & Alimentação leve", desc: "Garrafas devem ser de plástico transparente de até 1.5L, sem os rótulos decorativos.", checked: false },
    { id: "phone", label: "Smartphone preparado para envelopes", desc: "Celular desligado e sem alarmes ativos debaixo da cadeira dentro do envelope de segurança.", checked: false },
    { id: "rest", label: "Descanso prévio", desc: "Estar alimentado e bem descansado para cumprir as 8 horas de supervisão tática.", checked: false },
  ]);

  useEffect(() => {
    if (collaboratorRecord) {
      setName(collaboratorRecord.name || "");
      setCpf(collaboratorRecord.cpf || "");
      setBirthDate(collaboratorRecord.birthDate || "");
      setWhatsapp(collaboratorRecord.whatsapp || "");
      setEmail(collaboratorRecord.email || "");
      setEducation(collaboratorRecord.education || "Ensino Superior Completo");
      setReferencePerson(collaboratorRecord.referencePerson || "");
      setPhotoUrl(collaboratorRecord.photoUrl || "");
      setRestrictions(collaboratorRecord.foodRestrictions || "");
      setSnackPreference(collaboratorRecord.snackPreference || "Padrão");
    }
  }, [collaboratorRecord]);

  // Load checklist progress from local storage
  useEffect(() => {
    const saved = localStorage.getItem(`enem_checklist_${currentUser.uid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChecklistItems(prev => prev.map(item => ({
          ...item,
          checked: !!parsed[item.id]
        })));
      } catch (e) {
        console.error(e);
      }
    }
  }, [currentUser.uid]);

  const handleChecklistToggle = (itemId: string) => {
    const updated = checklistItems.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklistItems(updated);
    const reduction = updated.reduce((acc, item) => {
      acc[item.id] = item.checked;
      return acc;
    }, {} as Record<string, boolean>);
    localStorage.setItem(`enem_checklist_${currentUser.uid}`, JSON.stringify(reduction));
  };

  const handleCollaboratorPhotoChange = async (newUrl: string) => {
    setPhotoUrl(newUrl);
    if (collaboratorRecord?.id) {
      setIsSavingProfile(true);
      try {
        await onUpdateProfile({ photoUrl: newUrl });
        setProfileSuccessMsg("Foto do crachá atualizada e sincronizada com sucesso!");
        setTimeout(() => setProfileSuccessMsg(""), 3500);
      } catch (err) {
        console.error("Error saving collaborator photo:", err);
      } finally {
        setIsSavingProfile(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorRecord?.id) return;
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        name,
        cpf,
        birthDate,
        whatsapp,
        email,
        education,
        referencePerson,
        photoUrl
      });
      setProfileSuccessMsg("Seu cadastro de fiscal foi atualizado com sucesso e sincronizado.");
      setTimeout(() => setProfileSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveSnackSelection = async () => {
    if (!collaboratorRecord?.id) return;
    setIsSavingSnack(true);
    try {
      await onUpdateProfile({
        snackPreference: snackPreference as any,
        foodRestrictions: restrictions
      });
      setSnackSuccessMsg("Suas preferências de alimentação e restrições foram encaminhadas aos coordenadores CLA.");
      setTimeout(() => setSnackSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSnack(false);
    }
  };

  // Agenda Timeline List - loaded dynamically from building settings or default official schedule
  const activeSchedule = (building?.collaboratorSchedule && building.collaboratorSchedule.length > 0)
    ? building.collaboratorSchedule 
    : DEFAULT_ENEM_SCHEDULE;

  // Is Snack released?
  const isSnackMenuReleased = catering?.releasedToCollaborators === true;
  
  const selectedQuotes = catering?.quotes?.filter(q => q.selected) || [];
  const activeLancheQuote = selectedQuotes.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || 
                             catering?.quotes?.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || null;
  const activeRefeicaoQuote = selectedQuotes.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || 
                               catering?.quotes?.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || null;

  const activeQuote = catering?.quotes?.find(q => q.selected) || catering?.quotes?.[0] || null;

  // Checklist Progress calculation - accurate 0% to 100%
  const totalChecklist = checklistItems.length;
  const checkedCount = checklistItems.filter(i => i.checked).length;
  const finalPercent = totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;

  const desktopMenuTab = activeMenuTab || "status";

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 animate-fade-in text-sans">
      
      {/* LEFT SIDE NAVIGATION PANEL - 3D Tactile Sidebar */}
      <div className="w-full md:w-64 shrink-0 bg-white dark:bg-[#0c1220]/90 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 flex flex-col gap-2">
        <div className="px-3 py-2 text-center border-b border-slate-100 dark:border-slate-850 pb-4 mb-2 flex flex-col items-center">
          <div 
            className="relative group mb-2.5 cursor-pointer"
            onClick={() => setActiveMenuTab("profile")}
            title="Clique para enviar ou alterar sua foto"
          >
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt="Foto do Fiscal" 
                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-md bg-slate-100 group-hover:scale-105 transition duration-200" 
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white rounded-full flex items-center justify-center font-black text-xl border-2 border-indigo-500/10 shadow-md group-hover:scale-105 transition duration-200">
                {name ? name.substring(0, 2).toUpperCase() : "CM"}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-indigo-500 group-hover:bg-emerald-500 text-white rounded-full p-1.5 border-2 border-white dark:border-slate-900 shadow-sm transition">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>
          <h2 className="font-display font-black text-slate-850 dark:text-white text-sm line-clamp-1">{name || "Carregando..."}</h2>
          <span className="text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-full mt-1 tracking-wide">
            {collaboratorRecord?.isReserve ? "Fiscal de Reserva " : `Fiscal Sala: ${collaboratorRecord?.assignedRoom || "Sem Sala"}`}
          </span>
          <button
            type="button"
            onClick={() => setActiveMenuTab("profile")}
            className="mt-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Camera className="w-3 h-3" />
            <span>{photoUrl ? "Alterar Foto" : "Enviar Foto"}</span>
          </button>
        </div>

        {/* Navigation Buttons - Toggle on click */}
        <button
          onClick={() => setActiveMenuTab((prev) => (prev === "status" ? "" : "status"))}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
            activeMenuTab === "status" || (activeMenuTab === "" && false)
              ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span className="flex-1">Status & Local</span>
          <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "status" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
        </button>

        <button
          onClick={() => setActiveMenuTab((prev) => (prev === "profile" ? "" : "profile"))}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
            activeMenuTab === "profile"
              ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
          }`}
        >
          <User className="w-4 h-4" />
          <span className="flex-1">Editar Perfil</span>
          <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "profile" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
        </button>

        {isSnackMenuReleased && (
          <button
            onClick={() => setActiveMenuTab((prev) => (prev === "snack" ? "" : "snack"))}
            className={`flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
              activeMenuTab === "snack"
                ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 animate-pulse"
            }`}
          >
            <span className="flex items-center gap-2.5 flex-1">
              <Coffee className="w-4 h-4 text-emerald-500" />
              <span>Cardápio & Lanche</span>
            </span>
            <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full mr-1">LIBERADO</span>
            <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "snack" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
          </button>
        )}

        <button
          onClick={() => setActiveMenuTab((prev) => (prev === "materials" ? "" : "materials"))}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
            activeMenuTab === "materials"
              ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="flex-1">Materiais de Apoio</span>
          <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "materials" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
        </button>

        <button
          onClick={() => setActiveMenuTab((prev) => (prev === "agenda" ? "" : "agenda"))}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
            activeMenuTab === "agenda"
              ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="flex-1">Agenda & Itinerário</span>
          <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "agenda" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
        </button>

        <button
          onClick={() => setActiveMenuTab((prev) => (prev === "checklist" ? "" : "checklist"))}
          className={`flex items-center justify-between gap-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 cursor-pointer ${
            activeMenuTab === "checklist"
              ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
          }`}
        >
          <span className="flex items-center gap-2.5 flex-1">
            <CheckSquare className="w-4 h-4" />
            <span>Check-list</span>
          </span>
          <span className="text-[9px] font-bold font-mono text-slate-400 mr-1">{finalPercent}%</span>
          <ChevronDown className={`w-4 h-4 md:hidden transition-transform duration-200 ${activeMenuTab === "checklist" ? "rotate-180 text-emerald-400" : "text-slate-400"}`} />
        </button>

        <div className="mt-8 border-t border-slate-100 dark:border-slate-850 pt-4 px-2">
          <div className="p-3 bg-indigo-500/5 dark:bg-[#101726]/40 border border-indigo-500/10 rounded-xl text-center">
            <Sparkles className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <span className="block text-[8px] uppercase font-extrabold text-indigo-550 dark:text-indigo-400 tracking-widest">Portal CalanguS</span>
            <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">Fiscais autorizados Cebraspe.</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE DETAILS AREA */}
      <div className={`grow bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 ${activeMenuTab === "" ? "hidden md:block" : "block"}`}>
        
        {/* TAB 1: STATUS & LOCAL_ */}
        {desktopMenuTab === "status" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Status do Colaborador & Local de Aplicação</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Consulte seus dados cadastrais, local de prova e informações de atuação para o ENEM.</p>
            </div>

            {/* Quick Photo & Fiscal Status Banner */}
            <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div 
                  className="relative group cursor-pointer shrink-0" 
                  onClick={() => setActiveMenuTab("profile")}
                  title="Clique para enviar ou trocar sua foto"
                >
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Foto do Fiscal" 
                      className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-md bg-slate-100 group-hover:scale-105 transition" 
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white rounded-full flex items-center justify-center font-black text-lg border-2 border-indigo-500/20 shadow-md group-hover:scale-105 transition">
                      {name ? name.substring(0, 2).toUpperCase() : "CM"}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-xs">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-slate-850 dark:text-white text-sm">{name}</span>
                    {photoUrl ? (
                      <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Foto enviada</span>
                    ) : (
                      <span className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">Foto pendente</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {photoUrl 
                      ? "Sua foto de identificação está cadastrada para o crachá oficial do ENEM." 
                      : "Clique no perfil ou no botão ao lado para enviar a foto do seu crachá."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMenuTab("profile")}
                className="btn-3d py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{photoUrl ? "Alterar Foto" : "Enviar Foto"}</span>
              </button>
            </div>

            {/* BUSINESS LOGIC: PRESENCE CONFIRMATION SECTION */}
            {(() => {
              const isAuthorized = collaboratorRecord?.status === "Confirmado";
              const assignedRole = collaboratorRecord?.assignedRole?.trim();
              const isReserve = Boolean(collaboratorRecord?.isReserve);
              const hasAssignedRole = Boolean(assignedRole && assignedRole !== "" && !isReserve);
              const hasRefused = Boolean(collaboratorRecord?.refusedRole || collaboratorRecord?.refusalTag);
              const isConfirmedAttendance = collaboratorRecord?.attendanceStatus === "Confirmado";

              // Only show presence confirmation when collaborator is authorized AND has an assigned active role (not reserve)
              if (isAuthorized && hasAssignedRole) {
                return (
                  <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-slate-50 to-indigo-500/10 dark:from-emerald-500/10 dark:via-[#0c1220] dark:to-indigo-500/10 border-2 border-emerald-500/30 rounded-2xl space-y-4 shadow-md animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                            CONVOCAÇÃO OFICIAL CEBRASPE
                          </span>
                          {isConfirmedAttendance ? (
                            <span className="text-[10px] bg-emerald-600 text-white font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Presença Confirmada</span>
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                              ⏳ Confirmação Pendente
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-display font-black text-slate-850 dark:text-white mt-1.5 flex items-center gap-1.5">
                          <span>📋</span> Função Designada: <span className="text-indigo-600 dark:text-indigo-400 underline">{assignedRole}</span>
                        </h4>
                      </div>

                      {collaboratorRecord?.assignedRoom && (
                        <div className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Sala Designada</span>
                          <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">{collaboratorRecord.assignedRoom}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {isConfirmedAttendance ? (
                          <span>
                            ✓ Você confirmou sua presença para exercer a função de <strong>{assignedRole}</strong> no ENEM 2026. A coordenação conta com sua pontualidade!
                          </span>
                        ) : (
                          <span>
                            O CLA autorizou seu cadastro e fez a sua associação na função de <strong>{assignedRole}</strong>. Por favor, <strong>confirme sua presença</strong> para garantir sua vaga na escala oficial do ENEM.
                          </span>
                        )}
                      </p>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateConfirmationStatus("Confirmado")}
                          className={`btn-3d py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                            isConfirmedAttendance 
                              ? "bg-emerald-600 text-white shadow-md" 
                              : "bg-emerald-500 hover:bg-emerald-600 text-white"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{isConfirmedAttendance ? "Presença Já Confirmada" : "Confirmar Presença na Função"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsRefusingModalOpen(true)}
                          className="btn-3d py-2.5 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                          title="Recusar a convocação nesta função e retornar para a reserva"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Recusar Função</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isAuthorized && !hasAssignedRole && hasRefused) {
                return (
                  <div className="p-5 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl space-y-3 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                          Convocação Recusada — Você está no Banco de Reserva
                        </h4>
                      </div>
                      <span className="text-[9px] bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30 font-mono font-black uppercase px-2 py-0.5 rounded-md">
                        RESERVA ATIVO
                      </span>
                    </div>

                    <div className="p-3 bg-white/80 dark:bg-[#070b13]/80 rounded-xl border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                        <span>🏷️</span>
                        <span>TAG: <strong>{collaboratorRecord?.refusalTag || `Recusa de trabalho na função ${collaboratorRecord?.refusedRole}`}</strong></span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        Você recusou a convocação para a função de <strong>{collaboratorRecord?.refusedRole || "Função anterior"}</strong>{collaboratorRecord?.refusedRoleDate ? ` (${collaboratorRecord.refusedRoleDate})` : ""}. A coordenação do CLA foi notificada e o cargo associado voltou a ficar vazio. Você continua cadastrado no banco de <strong>Fiscais Reservas</strong>. Caso o CLA atribua uma nova função a você, a opção de confirmação de presença será reaberta automaticamente aqui.
                      </p>
                    </div>
                  </div>
                );
              }

              // When in reserve or waiting for role assignment: do not show any confirmation div
              return null;
            })()}

            {/* Modal to Confirm Refusal of Role Convocations */}
            {isRefusingModalOpen && collaboratorRecord?.assignedRole && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div className="bg-white dark:bg-[#0c1220] max-w-md w-full rounded-2xl border-2 border-rose-500/30 p-6 space-y-5 shadow-2xl animate-scale-up">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-display font-black text-slate-900 dark:text-white">
                        Recusar Convocação na Função?
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Você está prestes a recusar a atuação na função de <strong className="text-rose-600 dark:text-rose-400">{collaboratorRecord.assignedRole}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <div className="font-bold text-rose-700 dark:text-rose-400 text-[11px] uppercase tracking-wide">
                      Consequências da Recusa:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <li>A coordenação do <strong>CLA receberá aviso imediato</strong> da sua recusa.</li>
                      <li>O cargo de <strong>{collaboratorRecord.assignedRole}</strong> voltará a ficar vazio para alocação de outro fiscal.</li>
                      <li>Você retornará para a equipe de <strong>Reserva</strong> com a TAG: <strong className="text-rose-600 dark:text-rose-400">"Recusa de trabalho na função {collaboratorRecord.assignedRole}"</strong>.</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRefusingModalOpen(false)}
                      className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Cancelar e Manter Função
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateConfirmationStatus("Recusado", collaboratorRecord.assignedRole);
                        setIsRefusingModalOpen(false);
                      }}
                      className="btn-3d py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Confirmar Recusa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {building && (
              <div className="space-y-4">
                <span className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400">Escola Designada & Rota</span>
                
                <div className="bg-slate-50 dark:bg-[#070b13]/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner">
                  <div>
                    <h4 className="font-display font-black text-slate-800 dark:text-white text-base">🏫 {building.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 font-medium">
                      <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{building.address}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs font-bold leading-relaxed">
                    <div>
                      <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Sua Função de Lotação:</span>
                      <span className="text-slate-800 dark:text-white">
                        {collaboratorRecord?.specialRole && collaboratorRecord.specialRole !== "Nenhuma" 
                          ? `${collaboratorRecord.specialRole} (Acessibilidade)`
                          : (collaboratorRecord?.isReserve ? "Fiscal de Reserva de Corredor" : "Fiscal de Sala Regular")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Setor de Alocação:</span>
                      <span className="text-slate-850 dark:text-slate-200">
                        {collaboratorRecord?.isReserve ? "Salas Extras / Apoio" : `Andar ${collaboratorRecord?.assignedRoom ? "1º / Bloco A" : "Selecione na Sala"} (${collaboratorRecord?.assignedRoom || "Pendente de Coordenação"})`}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Sala de Coordenação (CLA):</span>
                      <span className="text-slate-850 dark:text-slate-200">{building.coordRoom}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-400 block font-normal uppercase text-[9px] tracking-wider mb-0.5">Capacidade da Escola:</span>
                      <span className="text-slate-850 dark:text-slate-200">{building.realCapacity} Candidatos</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.name + " " + building.address)}`}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="btn-3d w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs cursor-pointer shadow-md"
                    >
                      <Navigation className="w-4 h-4 text-white" />
                      <span>TRAÇAR ROTA NO GOOGLE MAPS</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EDITAR PERFIL_ */}
        {desktopMenuTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Editar Dados Cadastrais & Foto</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mantenha seus dados atualizados para controle financeiro, fita magnética de presença e homologação Cebraspe.</p>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl animate-fade-in">
                ✓ {profileSuccessMsg}
              </div>
            )}

            {/* Profile image uploading wrapper */}
            <PhotoUploader
              photoUrl={photoUrl}
              onChange={handleCollaboratorPhotoChange}
              name={name || currentUser.name || "Fiscal"}
              label="Foto de Identificação do Crachá"
              helpText="Adicione uma foto nítida do seu rosto em fundos claros, pois será impressa no crachá oficial de portaria e visualizada pela coordenação do CLA."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-sans text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">CPF (Chave Pix)</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-mono text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Data de Nascimento</label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-mono text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Whatsapp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#070b13 ] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold font-mono text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2.5 text-xs rounded-xl font-bold text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Escolaridade máxima</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="Ensino Fundamental (Alfabetizado)">Ensino Fundamental (Alfabetizado)</option>
                  <option value="Ensino Médio">Ensino Médio</option>
                  <option value="Ensino Técnico">Ensino Técnico</option>
                  <option value="Ensino Superior Cursando">Ensino Superior Cursando</option>
                  <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                  <option value="Pós-Graduação">Pós-Graduação</option>
                  <option value="Mestrado">Mestrado</option>
                  <option value="Doutorado">Doutorado</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Pessoa de Referência</label>
                <input
                  type="text"
                  value={referencePerson}
                  onChange={(e) => setReferencePerson(e.target.value)}
                  placeholder="Ex: MARIA"
                  className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-xl font-bold text-slate-800 dark:text-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 font-medium leading-relaxed">
                  Informe aqui o nome da pessoa (amigo, parente ou familiar) que lhe indicou para esse CLA. Exemplo: Minha amiga MARIA conversou com o CLA para me indicar para os trabalhos desse ano, então na referência eu digito MARIA.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-3d w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSavingProfile ? "Sincronizando..." : "SALVAR DADOS CADASTRAIS"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: LANCHE_ */}
        {desktopMenuTab === "snack" && isSnackMenuReleased && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Seleção de Cardápio & Restrições Alimentares</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Os coordenadores CLA liberaram o cardápio oficial! Configure suas preferências e informe alertas de alergias/restrições sanitárias.</p>
            </div>

            {snackSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl animate-fade-in">
                ✓ {snackSuccessMsg}
              </div>
            )}

            {/* Menu Description card */}
            {(activeLancheQuote || activeRefeicaoQuote) && (
              <div className="p-4 bg-indigo-500/5 dark:bg-[#101726]/40 border-2 border-indigo-500/10 dark:border-[#10b981]/25 rounded-2xl space-y-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] uppercase font-black tracking-widest text-[#10b981]">Cardápio Homologado de Lanches & Refeições</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Lanches */}
                  <div className="bg-white dark:bg-[#070b13]/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
                    <span className="text-[9px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <span>🥪</span> Itens do Lanche {activeLancheQuote && `(Fornecedor: ${activeLancheQuote.supplier})`}
                    </span>
                    {activeLancheQuote ? (
                      (activeLancheQuote.lancheItems && activeLancheQuote.lancheItems.length > 0) ? (
                        <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-350 font-semibold list-disc list-inside">
                          {activeLancheQuote.lancheItems.map((item, idx) => (
                            <li key={idx} className="marker:text-indigo-500">{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          {activeLancheQuote.menu.includes("Lanche:") ? activeLancheQuote.menu.split("Refeição:")[0].replace("Lanche:", "").trim() : activeLancheQuote.menu}
                        </p>
                      )
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Consulte os coordenadores.</p>
                    )}
                  </div>

                  {/* Refeição */}
                  <div className="bg-white dark:bg-[#070b13]/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
                    <span className="text-[9px] font-black text-teal-650 dark:text-teal-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <span>🍽️</span> Itens da Refeição {activeRefeicaoQuote && `(Fornecedor: ${activeRefeicaoQuote.supplier})`}
                    </span>
                    {activeRefeicaoQuote ? (
                      (activeRefeicaoQuote.refeicaoItems && activeRefeicaoQuote.refeicaoItems.length > 0) ? (
                        <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-350 font-semibold list-disc list-inside">
                          {activeRefeicaoQuote.refeicaoItems.map((item, idx) => (
                            <li key={idx} className="marker:text-teal-500">{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          {activeRefeicaoQuote.menu.includes("Refeição:") ? activeRefeicaoQuote.menu.split("Refeição:")[1].trim() : "Consulte os coordenadores."}
                        </p>
                      )
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Consulte os coordenadores.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1.5">Sua Preferência Alimentar</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {["Padrão", "Vegetariano", "Vegano", "Sem Glúten"].map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setSnackPreference(pref)}
                      className={`p-3 border-2 rounded-xl font-bold text-xs cursor-pointer select-none transition-all duration-300 text-center ${snackPreference === pref ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"}`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Alergias ou Restrições Alimentares Ativas</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={restrictions}
                    onChange={(e) => setRestrictions(e.target.value)}
                    placeholder="Ex: Alérgico a corantes vermelhos, intolerante à lactose pesado (precisa de leite vegetal), vegetariano estrito."
                    className="w-full bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 p-3 text-xs rounded-xl font-semibold font-sans text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {restrictions && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 uppercase bg-rose-500/10 text-rose-600 dark:text-rose-450 text-[8px] font-extrabold rounded px-1.5 py-0.5 border border-rose-500/20">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span>Alerta de Restrição Enviado</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-450 dark:text-slate-440 mt-1.5 flex items-center gap-1 font-semibold leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>O sistema CalanguS alertará o seu Coordenador CLA imediatamente em tempo real sobre esta restrição.</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={handleSaveSnackSelection}
                  disabled={isSavingSnack}
                  className="btn-3d w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs cursor-pointer shadow-md"
                >
                  {isSavingSnack ? "Sincronizando escolhas de lanche..." : "SALVAR PREFERÊNCIA DE LANCHE"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MATERIAL_ */}
        {desktopMenuTab === "materials" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Material Didático & Capacitação</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Acesse apostilas, normativas, briefings e orientações recomendadas pela coordenação para a aplicação do ENEM.</p>
            </div>

            <div className="p-8 md:p-12 bg-white dark:bg-[#0c1220] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500/15 via-emerald-500/15 to-teal-500/15 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border-2 border-indigo-500/25 shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="inline-block px-3.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                  ⏳ Em Breve Teremos Conteúdo
                </span>
                <h4 className="text-base font-display font-black text-slate-850 dark:text-white">
                  Materiais Didáticos & Guias do ENEM 2026
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  A coordenação do Cebraspe e do CLA disponibilizará em breve os manuais oficiais, videoaulas instrutivas de procedimentos, portarias e orientações específicas nesta aba antes do dia do exame.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AGENDA_ */}
        {desktopMenuTab === "agenda" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Agenda & Itinerário Tático do Fiscal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Observe a contagem rigorosa de horários regulada pela coordenação do local e pelo Cebraspe.</p>
            </div>

            {/* CLA Custom Instructions/Notices if configured */}
            {building?.collaboratorInstructions && (
              <div className="p-4 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Avisos & Instruções da Coordenação (CLA)</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                  {building.collaboratorInstructions}
                </p>
              </div>
            )}

            {/* Timeline component with active schedule configured by CLA */}
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-5 pr-1 ml-3 space-y-6">
              {activeSchedule.map((item, idx) => (
                <div key={item.id || idx} className="relative group animate-fade-in font-sans">
                  {/* Glowing timeline node */}
                  <div className="absolute -left-[27px] top-1 bg-white dark:bg-[#070b13] border-2 border-emerald-500 rounded-full w-4 h-4 flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </div>

                  <div className="bg-slate-50 dark:bg-[#070b13]/30 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full block w-max uppercase tracking-wider border border-emerald-500/20">
                      {item.time}
                    </span>
                    <h4 className="font-display font-black text-xs text-slate-800 dark:text-white mt-1.5 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CHECK-LIST_ */}
        {desktopMenuTab === "checklist" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Check-list de Preparação do Aplicador</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Evite impedimentos e advertências no domingo do exame utilizando o check-list de adequação de vestimentas e materiais permitidos.</p>
            </div>

            {/* Progress segment */}
            <div className="p-4 bg-[#10b981]/5 border-2 border-[#10b981]/15 rounded-2xl space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-emerald-650 dark:text-emerald-400 uppercase tracking-wide">Progresso de Preparação</span>
                <span className="font-mono text-lg">{checkedCount} / {totalChecklist} Concluídos</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${finalPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-455 dark:text-slate-440 font-semibold mt-1">
                {checkedCount === totalChecklist 
                  ? "✓ Fantástico! Você está 100% elegível e preparado conforme as portarias do Edital do ENEM."
                  : "Complete os itens recomendados abaixo antes de se deslocar ao colégio."}
              </p>
            </div>

            {/* Checkbox item list */}
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleChecklistToggle(item.id)}
                  className={`p-3.5 border-2 rounded-2xl flex items-start gap-3.5 cursor-pointer select-none transition-all duration-300 ${item.checked ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${item.checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-700"}`}>
                    {item.checked && <Check className="w-3.5 h-3.5 stroke-[4px]" />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-black leading-snug flex items-center gap-1.5 ${item.checked ? "text-slate-800 dark:text-slate-200 line-through opacity-70" : "text-slate-800 dark:text-white"}`}>
                      {item.label}
                    </h4>
                    <p className={`text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold ${item.checked ? "line-through opacity-60" : ""}`}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Inline replacement for CompassIcon if absent
function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
