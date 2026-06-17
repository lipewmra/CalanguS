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
  X, 
  ExternalLink, 
  Video, 
  Image as ImageIcon,
  AlertTriangle, 
  Info, 
  Sparkles, 
  BookOpen,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { UserProfile, BuildingInfo, CateringInfo, CollaboratorInfo } from "../types";

interface CollaboratorDashboardProps {
  currentUser: UserProfile;
  building: BuildingInfo | null;
  catering: CateringInfo | null;
  collaboratorRecord: CollaboratorInfo | null;
  individualConfirmationStatus: "Pendente" | "Confirmado" | "Recusado";
  onUpdateConfirmationStatus: (status: "Pendente" | "Confirmado" | "Recusado") => void;
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
  const [activeMenuTab, setActiveMenuTab] = useState<"status" | "profile" | "snack" | "materials" | "agenda" | "checklist">("status");
  
  // Profile edit states
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [education, setEducation] = useState<any>("Ensino Superior Completo");
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("A foto excedeu o limite de 1MB. Por favor utilize uma imagem otimizada.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  // Materials Mock List shared by the CLA 
  const materialsList = [
    { 
      title: "Guia Oficial do Aplicador de Exames ENEM 2026", 
      type: "pdf", 
      size: "2.4 MB", 
      desc: "Normas completas de segurança, recepção de candidatos e tratamento de incidentes." 
    },
    { 
      title: "Procedimentos de Segurança e Biometria Cebraspe", 
      type: "video", 
      size: "12 min", 
      desc: "Videoaula explicativa contendo o protocolo passo a passo de coleta das digitais do envelope." 
    },
    { 
      title: "Cronograma de Toques de Campainha e Portões", 
      type: "image", 
      size: "450 KB", 
      desc: "Folheto visual rápido para fixar na mesa sobre a contagem regressiva de horários do ENEM." 
    },
    { 
      title: "Manual Cebraspe de Incidentes Sanitários e Acessibilidade", 
      type: "link", 
      size: "Link Externo", 
      desc: "Normas de atendimento especializado para candidatos gestantes, cegos e com baixa mobilidade." 
    }
  ];

  // Agenda Timeline List
  const agendaTimeline = [
    { time: "11:00h", title: "Chegada Obrigatória", desc: "Apresente-se à CLA na sala de coordenação com documento físico para assinatura da ata de presença de fiscais." },
    { time: "11:15h", title: "Reunião Geral Cebraspe", desc: "Briefing tático comandado pela coordenação do colégio. Alinhamento de salas e entrega do crachá oficial." },
    { time: "11:30h", title: "Vistoria e Preparo das Salas", desc: "Inspeção física, numeração de carteiras rascunho, e verificação dos lacres de janelas e ar-condicionado." },
    { time: "12:00h", title: "Abertura dos Portões", desc: "Entrada dos candidatos na escola. Fiscais posicionados em frente às portas orientando o fluxo com calma." },
    { time: "13:00h", title: "Fechamento dos Portões", desc: "Fechamento automático e irrevogável coordenado com a rota de segurança militar." },
    { time: "13:00h - 13:30h", title: "Identificação Tática", desc: "Coleta das assinaturas, dados do documento oficial, e verificação dos envelopes porta-objetos lacrados." },
    { time: "13:30h", title: "Início Oficial das Provas", desc: "Autorização para abertura do pacote plástico de cadernos de prova pela testemunha de sala." },
    { time: "15:30h", title: "Distribuição do Lanche", desc: "Envio assistido dos lanches aos aplicadores em regime de revezamento programado." },
    { time: "18:30h / 19:30h", title: "Encerramento e Ata Final", desc: "Coleta rigorosa do material excedente de prova, lacre do envelope de gabaritos e devolução à CLA." }
  ];

  // Is Snack released?
  const isSnackMenuReleased = catering?.releasedToCollaborators === true;
  
  const selectedQuotes = catering?.quotes?.filter(q => q.selected) || [];
  const activeLancheQuote = selectedQuotes.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || 
                             catering?.quotes?.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || null;
  const activeRefeicaoQuote = selectedQuotes.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || 
                               catering?.quotes?.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || null;

  const activeQuote = catering?.quotes?.find(q => q.selected) || catering?.quotes?.[0] || null;

  // Checklist Progress calculation
  const totalChecklist = checklistItems.length;
  const checkedCount = checklistItems.filter(i => i.checked).length;
  const checklistPercent = Math.round((checkedCount / totalChecklist) * 105) || 100; // max out properly
  const finalPercent = Math.min(100, checklistPercent);

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 animate-fade-in text-sans">
      
      {/* LEFT SIDE NAVIGATION PANEL - 3D Tactile Sidebar */}
      <div className="w-full md:w-64 shrink-0 bg-white dark:bg-[#0c1220]/90 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10 flex flex-col gap-2">
        <div className="px-3 py-2 text-center border-b border-slate-100 dark:border-slate-850 pb-4 mb-2 flex flex-col items-center">
          <div className="relative group mb-2.5">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt="Foto" 
                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-md bg-slate-100" 
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white rounded-full flex items-center justify-center font-black text-xl border-2 border-indigo-500/10 shadow-md">
                {name ? name.substring(0, 2).toUpperCase() : "CM"}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-sm cursor-pointer hover:bg-indigo-600 transition" onClick={() => setActiveMenuTab("profile")}>
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <h2 className="font-display font-black text-slate-850 dark:text-white text-sm line-clamp-1">{name || "Carregando..."}</h2>
          <span className="text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-full mt-1 tracking-wide">
            {collaboratorRecord?.isReserve ? "Fiscal de Reserva " : `Fiscal Sala: ${collaboratorRecord?.assignedRoom || "Sem Sala"}`}
          </span>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={() => setActiveMenuTab("status")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 ${activeMenuTab === "status" ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"}`}
        >
          <MapPin className="w-4 h-4" />
          <span>Status & Local</span>
        </button>

        <button
          onClick={() => setActiveMenuTab("profile")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 ${activeMenuTab === "profile" ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"}`}
        >
          <User className="w-4 h-4" />
          <span>Editar Perfil</span>
        </button>

        {isSnackMenuReleased && (
          <button
            onClick={() => setActiveMenuTab("snack")}
            className={`flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 ${activeMenuTab === "snack" ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 animate-pulse"}`}
          >
            <span className="flex items-center gap-2.5">
              <Coffee className="w-4 h-4 text-emerald-500" />
              <span>Cardápio & Lanche</span>
            </span>
            <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">LIBERADO</span>
          </button>
        )}

        <button
          onClick={() => setActiveMenuTab("materials")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 ${activeMenuTab === "materials" ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"}`}
        >
          <FileText className="w-4 h-4" />
          <span>Materiais de Apoio</span>
        </button>

        <button
          onClick={() => setActiveMenuTab("agenda")}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 ${activeMenuTab === "agenda" ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda & Itinerário</span>
        </button>

        <button
          onClick={() => setActiveMenuTab("checklist")}
          className={`flex items-center justify-between gap-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all duration-300 ${activeMenuTab === "checklist" ? "bg-slate-950 text-white dark:bg-emerald-500/15 dark:text-emerald-450 border-l-4 border-emerald-500" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"}`}
        >
          <span className="flex items-center gap-2.5">
            <CheckSquare className="w-4 h-4" />
            <span>Check-list</span>
          </span>
          <span className="text-[9px] font-bold font-mono text-slate-400">{finalPercent}%</span>
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
      <div className="grow bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_#10b981]/10">
        
        {/* TAB 1: STATUS & LOCAL_ */}
        {activeMenuTab === "status" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Status da Inscrição & Confirmação</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sinalize suas intenções de participação ao Cebraspe para que os coordenadores de prédio concluam as alocações.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#070b13]/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block mb-1">Seu status atual de presença:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-xs px-3 py-1 rounded-full border ${individualConfirmationStatus === "Confirmado" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/10" : individualConfirmationStatus === "Recusado" ? "bg-rose-500/15 text-rose-650 dark:text-rose-450 border-rose-500/10" : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/10"}`}>
                    ★ {individualConfirmationStatus}
                  </span>
                  {individualConfirmationStatus === "Confirmado" && (
                    <span className="text-emerald-555 text-[10px] font-bold">✓ Presença Confirmada no Colégio</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => onUpdateConfirmationStatus("Confirmado")}
                  className={`btn-3d py-2 px-4 rounded-xl text-xs font-black transition cursor-pointer ${individualConfirmationStatus === "Confirmado" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  <Check className="w-3.5 h-3.5 inline mr-1" />
                  Confirmar Presença
                </button>
                <button
                  onClick={() => onUpdateConfirmationStatus("Recusado")}
                  className={`btn-3d py-2 px-4 rounded-xl text-xs font-black transition cursor-pointer ${individualConfirmationStatus === "Recusado" ? "bg-rose-600 text-white" : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"}`}
                >
                  Recusar Participação
                </button>
              </div>
            </div>

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
        {activeMenuTab === "profile" && (
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
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-[#070b13]/60 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="relative group shrink-0">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt="Preview" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md bg-stone-100" 
                  />
                ) : (
                  <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center font-black text-xl border border-dashed border-indigo-500/30">
                    Sem Foto
                  </div>
                )}
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl("")}
                    className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-xs cursor-pointer hover:scale-105 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grow space-y-2 text-center sm:text-left">
                <span className="block text-[10px] uppercase font-extrabold tracking-wide text-slate-550 dark:text-slate-455">Foto de Identificação do Crachá</span>
                <p className="text-[10px] text-slate-450 dark:text-slate-440 font-semibold leading-relaxed">Adicione uma foto nítida do seu rosto em fundos claros de até 1MB, pois será impressa no crachá oficial de portaria.</p>
                
                <div className="flex justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-3d px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Foto</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

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
                  <option value="Ensino Médio">Ensino Médio</option>
                  <option value="Ensino Técnico">Ensino Técnico</option>
                  <option value="Ensino Superior Cursando">Ensino Superior Cursando</option>
                  <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                  <option value="Pós-Graduação">Pós-Graduação</option>
                  <option value="Mestrado">Mestrado</option>
                  <option value="Doutorado">Doutorado</option>
                </select>
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
        {activeMenuTab === "snack" && isSnackMenuReleased && (
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
        {activeMenuTab === "materials" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Material Didático & Capacitação</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Acesse apostilas, normativas, briefings e vídeos recomendados pela coordenação para obter 100% de aproveitamento na aplicação do ENEM.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materialsList.map((mat, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-[#070b13]/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${mat.type === "pdf" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : mat.type === "video" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : mat.type === "image" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}>
                        {mat.type}
                      </span>
                      <span className="text-[9px] text-slate-450 dark:text-slate-450 font-bold font-mono">{mat.size}</span>
                    </div>

                    <h4 className="font-display font-black text-xs text-slate-800 dark:text-white mt-2 leading-snug">{mat.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">{mat.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`Simulando visualização/download de: ${mat.title}`)}
                    className="btn-3d w-full py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-850 dark:text-slate-300 rounded-lg font-bold text-[10px] uppercase cursor-pointer flex items-center justify-center gap-1"
                  >
                    {mat.type === "video" ? (
                      <Video className="w-3.5 h-3.5 text-amber-550" />
                    ) : mat.type === "image" ? (
                      <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                    <span>Visualizar Material</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AGENDA_ */}
        {activeMenuTab === "agenda" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2">Agenda & Itinerário Tático do Fiscal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Observe a contagem rigorosa de tempo regulada pela presidência Cebraspe e maratona de segurança nacional.</p>
            </div>

            {/* Timeline component */}
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-5 pr-1 ml-3 space-y-6">
              {agendaTimeline.map((item, idx) => (
                <div key={idx} className="relative group animate-fade-in font-sans">
                  {/* Glowing timeline node */}
                  <div className="absolute -left-[27px] top-1 bg-white dark:bg-[#070b13] border-2 border-emerald-500 rounded-full w-4 h-4 flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </div>

                  <div className="bg-slate-50 dark:bg-[#070b13]/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full block w-max uppercase tracking-wider">{item.time}</span>
                    <h4 className="font-display font-black text-xs text-slate-800 dark:text-white mt-1.5 leading-snug">{item.title}</h4>
                    <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1 font-semibold leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CHECK-LIST_ */}
        {activeMenuTab === "checklist" && (
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
