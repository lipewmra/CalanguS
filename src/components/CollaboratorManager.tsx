import React, { useState, useRef } from "react";
import { CollaboratorInfo, PastEdition } from "../types";
import { downloadCsvTemplate } from "./CsvTemplate";
import { auditCollaborator } from "../lib/data-validator";
import { 
  Users, UserPlus, Upload, ShieldAlert, BadgeInfo, Trash, Mail, 
  MapPin, Check, X, FileText, Download, HelpCircle, AlertTriangle, Pencil
} from "lucide-react";

export const ENEM_ROLES = [
  { name: "Aplicador", desc: "Entrega cadernos de provas, fiscaliza candidatos e preenche a ata de sala." },
  { name: "Chefe de Sala", desc: "Coordenador direto da sala de prova, responsável por cronômetro e ata de abertura/fechamento." },
  { name: "Fiscal de Banheiro", desc: "Responsável pela inspeção com detector de metais na entrada e saída dos sanitários." },
  { name: "Fiscal Volante", desc: "Monitora os corredores, acompanha candidatos aos sanitários e dá suporte logístico." },
  { name: "Interprete de Libras", desc: "Suporte especializado a candidatos surdos, traduzindo instruções para a Língua de Sinais." },
  { name: "Ledor/Transcritor", desc: "Auxílio especializado para leitura de provas ou transcrição de respostas para candidatos PCD." },
  { name: "Tecnico Informática", desc: "Suporte aos computadores, coletores de biometria e conectividade lógica do prédio." },
  { name: "Auxiliar de Limpeza", desc: "Responsável pela higienização periódica dos banheiros, salas e corredores do local." },
  { name: "Porteiro", desc: "Responsável pelo controle de abertura e fechamento de portões e filtragem de acessos." },
  { name: "Representante da Local", desc: "Responsável oficial de ligação operacional e suporte de infraestrutura predial do local de aplicação." },
  { name: "OUTROS", desc: "Compreende fiscais reservas ativados de última hora ou outras tarefas gerais não mapeadas." }
];

interface CollaboratorManagerProps {
  collaborators: CollaboratorInfo[];
  claId: string;
  onAdd: (collab: Omit<CollaboratorInfo, "id">) => Promise<string>;
  onUpdate: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSimulatePublicRecruit?: () => void;
}

export default function CollaboratorManager({ 
  collaborators, 
  claId, 
  onAdd, 
  onUpdate, 
  onDelete,
  onSimulatePublicRecruit
}: CollaboratorManagerProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<"list" | "add" | "import" | "edit">("list");
  const [filterType, setFilterType] = useState<"todos" | "efetivos" | "reservas" | "com_erro">("todos");

  // Edit State
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [education, setEducation] = useState<any>("Ensino Superior Completo");
  const [disability, setDisability] = useState("Nenhuma");
  const [hasWorkedEnem, setHasWorkedEnem] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [specialRole, setSpecialRole] = useState<any>("Nenhuma");
  const [languages, setLanguages] = useState<string>("");
  const [isReserve, setIsReserve] = useState(false);
  
  // Past Editions checklist helper (ENEM 1998 to 2025)
  const [pastEditionsSelected, setPastEditionsSelected] = useState<Record<number, boolean>>({});
  const [pastEditionsRoles, setPastEditionsRoles] = useState<Record<number, string>>({});
  
  // Custom states
  const [showPastYears, setShowPastYears] = useState(false);
  const [showRolesHelp, setShowRolesHelp] = useState(false);
  const [localSuccessMsg, setLocalSuccessMsg] = useState<string | null>(null);
  const [mailDispatchResult, setMailDispatchResult] = useState<string | null>(null);

  // Import file states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseErrors, setParseErrors] = useState<{ row: number; name: string; message: string }[]>([]);
  const [parseStatus, setParseStatus] = useState<"idle" | "success" | "rejected">("idle");

  const availableYears = Array.from({ length: 2025 - 1998 + 1 }, (_, i) => 2025 - i); // [2025, 2024, ..., 1998]

  // Form auto formatter as typed
  const handleCpfChange = (val: string) => {
    let value = val.replace(/\D/g, "");
    if (value.length <= 11) {
      value = value
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      setCpf(value);
    }
  };

  const handlePhoneChange = (val: string) => {
    let value = val.replace(/\D/g, "");
    if (value.length <= 11) {
      if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
      } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
      } else if (value.length > 0) {
        value = value.replace(/^(\d{0,2})$/, "($1");
      }
      setWhatsapp(value);
    }
  };

  const handleBirthDateChange = (val: string) => {
    let value = val.replace(/\D/g, "");
    if (value.length <= 8) {
      value = value
        .replace(/(\d{2})(\d)/, "$1/$2")
        .replace(/(\d{2})(\d)/, "$1/$2");
      setBirthDate(value);
    }
  };

  const handleStartEdit = (collab: CollaboratorInfo) => {
    setEditingCollabId(collab.id || null);
    setName(collab.name || "");
    setBirthDate(collab.birthDate || "");
    setCpf(collab.cpf || "");
    setWhatsapp(collab.whatsapp || "");
    setEmail(collab.email || "");
    setEducation(collab.education || "Ensino Superior Completo");
    setDisability(collab.disability || "Nenhuma");
    setHasWorkedEnem(collab.hasWorkedEnem || false);
    setPixKey(collab.pixKey || "");
    setSpecialRole(collab.specialRole || "Nenhuma");
    setLanguages(collab.languages ? collab.languages.join("; ") : "");
    setIsReserve(collab.isReserve ?? false);
    
    // Fill past editions
    const selected: Record<number, boolean> = {};
    const roles: Record<number, string> = {};
    if (collab.pastEditions) {
      collab.pastEditions.forEach(ed => {
        selected[ed.year] = true;
        roles[ed.year] = ed.role;
      });
    }
    setPastEditionsSelected(selected);
    setPastEditionsRoles(roles);
    
    setParseStatus("idle");
    setActiveSubTab("edit");
  };

  const handleEditCollaboratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollabId) return;

    setLocalSuccessMsg(null);

    // Build past exam list
    const finalPastEditions: PastEdition[] = [];
    if (hasWorkedEnem) {
      Object.keys(pastEditionsSelected).forEach(yearStr => {
        const y = Number(yearStr);
        if (pastEditionsSelected[y]) {
          finalPastEditions.push({
            year: y,
            role: pastEditionsRoles[y] || "Fiscal de Sala"
          });
        }
      });
    }

    // Run audits first as requested by the user parameters:
    const validations = auditCollaborator({ name, cpf, whatsapp, email, education, pixKey });
    const hasAuditError = validations.length > 0;
    const errorsList = validations.map(v => v.message);

    const edits: Partial<CollaboratorInfo> = {
      name,
      birthDate,
      cpf,
      whatsapp,
      email,
      education,
      disability,
      hasWorkedEnem,
      pastEditions: finalPastEditions,
      pixKey,
      specialRole,
      languages: languages.split(";").map(l => l.trim()).filter(Boolean),
      isReserve,
      orionStatus: hasAuditError ? "Erro" : "Ok",
      orionErrors: errorsList,
      orionSynced: !hasAuditError,
    };

    try {
      await onUpdate(editingCollabId, edits);
      setLocalSuccessMsg(`Cadastro de "${name}" atualizado com sucesso!`);
      
      // Reset form fields
      setEditingCollabId(null);
      setName("");
      setBirthDate("");
      setCpf("");
      setWhatsapp("");
      setEmail("");
      setPixKey("");
      setHasWorkedEnem(false);
      setLanguages("");
      setIsReserve(false);
      setSpecialRole("Nenhuma");
      setPastEditionsSelected({});
      setPastEditionsRoles({});
      setActiveSubTab("list");
      setTimeout(() => setLocalSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCollaboratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalSuccessMsg(null);

    // Build past exam list
    const finalPastEditions: PastEdition[] = [];
    if (hasWorkedEnem) {
      Object.keys(pastEditionsSelected).forEach(yearStr => {
        const y = Number(yearStr);
         if (pastEditionsSelected[y]) {
          finalPastEditions.push({
            year: y,
            role: pastEditionsRoles[y] || "Fiscal de Sala"
          });
        }
      });
    }

    // Run audits first as requested by the user parameters:
    const validations = auditCollaborator({ name, cpf, whatsapp, email, education, pixKey });
    const hasAuditError = validations.length > 0;
    const errorsList = validations.map(v => v.message);

    const collab: Omit<CollaboratorInfo, "claId"> = {
      name,
      birthDate,
      cpf,
      whatsapp,
      email,
      education,
      disability,
      hasWorkedEnem,
      pastEditions: finalPastEditions,
      pixKey,
      specialRole,
      languages: languages.split(";").map(l => l.trim()).filter(Boolean),
      isReserve,
      status: "Pendente",
      orionStatus: hasAuditError ? "Erro" : "Ok",
      orionErrors: errorsList,
      orionSynced: !hasAuditError,
    };

    try {
      await onAdd({ claId, ...collab });
      setLocalSuccessMsg(`Colaborador "${name}" adicionado com sucesso!`);
      
      // Reset form fields
      setName("");
      setBirthDate("");
      setCpf("");
      setWhatsapp("");
      setEmail("");
      setPixKey("");
      setHasWorkedEnem(false);
      setLanguages("");
      setIsReserve(false);
      setSpecialRole("Nenhuma");
      setPastEditionsSelected({});
      setPastEditionsRoles({});
      setActiveSubTab("list");
      setTimeout(() => setLocalSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Dispatch Email alert (Cebraspe candidates coordination) via express API
  const sendEmailNotification = async (collab: CollaboratorInfo) => {
    setMailDispatchResult(null);
    const bodyStr = `Olá ${collab.name},\n\n` +
      `Sua participação oficial no ENEM ${new Date().getFullYear()} foi solicitada pelo Coordenador (CLA) de seu prédio.\n\n` +
      `DETALHES DA ALOCAÇÃO:\n` +
      `- Função especial: ${collab.specialRole}\n` +
      `- Regime de Equipe: ${collab.isReserve ? "COLABORADOR RESERVA" : "COLABORADOR EFETIVO (" + (collab.assignedRoom || "A designar") + ")"}\n\n` +
      `AÇÃO IMPORTANTE REQUERIDA:\n` +
      `Pedimos que confirme sua presença e valide se seus dados cadastrais estão alinhados com o sistema Orion Cebraspe.\n` +
      `Se houver erros no CPF ou Nome, seu Coordenador CLA será notificado para recusa no sistema.\n\n` +
      `Atenciosamente, Equipe de Coordenação CalanguS.`;

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: collab.email,
          subject: `[ENEM CalanguS] Confirmação de Equipe de Aplicação`,
          body: bodyStr,
          collaboratorName: collab.name
        })
      });

      const parsed = await response.json();
      if (parsed.success) {
        setMailDispatchResult(`Notificação enviada com sucesso para ${collab.name}!`);
        // update database status to verify email sent
        await onUpdate(collab.id!, { status: "Pendente" });
        setTimeout(() => setMailDispatchResult(null), 4000);
      }
    } catch (e) {
      console.error(e);
      setMailDispatchResult("Erro no envio de e-mails do servidor.");
    }
  };

  // Toggle Confirm
  const confirmStaff = async (id: string) => {
    await onUpdate(id, { status: "Confirmado" });
  };

  // Toggle Recused
  const refuseStaff = async (id: string) => {
    await onUpdate(id, { status: "Recusado" });
  };

  // File CSV Spreadsheet parsing implementation
  const handleSpreadsheetImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert("O arquivo não possui dados suficientes.");
        return;
      }

      // Headers skip, process lines
      const tempErrors: { row: number; name: string; message: string }[] = [];
      const parsedCollabs: Omit<CollaboratorInfo, "claId">[] = [];

      // Helper to parse CSV line with either ; or , separator supporting quotes
      const parseCSVLine = (line: string): string[] => {
        const semiCount = (line.match(/;/g) || []).length;
        const commaCount = (line.match(/,/g) || []).length;
        const separator = semiCount > commaCount ? ";" : ",";

        const result: string[] = [];
        let current = "";
        let insideQuotes = false;

        for (let idx = 0; idx < line.length; idx++) {
          const char = line[idx];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === separator && !insideQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const getSpecialRole = (roleStr: string): any => {
        const norm = (roleStr || "").trim().toLowerCase();
        if (norm.includes("libras")) return "Libras";
        if (norm.includes("tradutor") || norm.includes("interprete") || norm.includes("intérprete")) return "Tradutor e Intérprete";
        if (norm.includes("informática") || norm.includes("informatica") || norm.includes("técnico") || norm.includes("tecnico")) return "Técnico de Informática";
        if (norm.includes("acessibilidade") || norm.includes("auxiliar")) return "Auxiliar de Acessibilidade";
        if (norm.includes("ledor") || norm.includes("transcritor")) return "Ledor/Transcritor";
        if (norm.includes("gestante")) return "Ledora de Gestante";
        return "Nenhuma";
      };

      const getEducation = (educationStr: string): any => {
        const norm = (educationStr || "").trim().toLowerCase();
        if (norm.includes("médio") || norm.includes("medio")) return "Ensino Médio";
        if (norm.includes("técnico") || norm.includes("tecnico")) return "Ensino Técnico";
        if (norm.includes("superior cursando") || norm.includes("faculdade cursando")) return "Ensino Superior Cursando";
        if (norm.includes("superior completo") || norm.includes("superior") || norm.includes("completo")) return "Ensino Superior Completo";
        if (norm.includes("pós") || norm.includes("pos") || norm.includes("especialização")) return "Pós-Graduação";
        if (norm.includes("mestrado")) return "Mestrado";
        if (norm.includes("doutorado")) return "Doutorado";
        return "Ensino Superior Completo";
      };

      for (let i = 1; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);

        if (columns.length < 5) continue; // Skip malformed rows

        const itemCollab = {
          name: columns[0] || "",
          cpf: columns[1] || "",
          birthDate: columns[2] || "",
          assignedRoom: undefined, // "Sala Real" removed from spreadsheet; will be allocated in standard dashboard
          specialRole: "Nenhuma" as const, // "Função" column removed from spreadsheet template
          whatsapp: columns[3] || "",
          email: columns[4] || "",
          education: getEducation(columns[5] || "Ensino Superior Completo"),
        };

        // Run audit checks
        const audits = auditCollaborator({
          name: itemCollab.name,
          cpf: itemCollab.cpf,
          whatsapp: itemCollab.whatsapp,
          email: itemCollab.email,
          education: itemCollab.education,
          pixKey: itemCollab.cpf // default pix key to CPF for easy setup
        });

        if (audits.length > 0) {
          audits.forEach(err => {
            tempErrors.push({
              row: i + 1,
              name: itemCollab.name || `Coluna Desconhecida`,
              message: err.message
            });
          });
        }

        // Setup parsed records
        parsedCollabs.push({
          name: itemCollab.name,
          birthDate: itemCollab.birthDate,
          cpf: itemCollab.cpf,
          assignedRoom: itemCollab.assignedRoom || undefined,
          whatsapp: itemCollab.whatsapp,
          email: itemCollab.email,
          education: itemCollab.education,
          disability: "Nenhuma",
          hasWorkedEnem: false,
          pastEditions: [],
          pixKey: itemCollab.cpf, // set pix key as CPF
          specialRole: itemCollab.specialRole,
          languages: [],
          isReserve: false,
          status: "Pendente",
          orionStatus: audits.length > 0 ? "Erro" : "Ok",
          orionErrors: audits.map(a => a.message),
          orionSynced: audits.length === 0,
        });
      }

      // RULING TRUTH REDIRECT
      if (tempErrors.length > 0) {
        setParseErrors(tempErrors);
        setParseStatus("rejected");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setParseErrors([]);
        setParseStatus("success");
        for (const c of parsedCollabs) {
          await onAdd({ claId, ...c });
        }
        setLocalSuccessMsg(`Planilha importada com sucesso: ${parsedCollabs.length} colaboradores salvos!`);
        setTimeout(() => setLocalSuccessMsg(null), 3000);
        setActiveSubTab("list");
      }
    };
    reader.readAsText(file);
  };

  // List filters helper
  const filteredCollaborators = collaborators.filter(collab => {
    if (filterType === "efetivos") return !collab.isReserve;
    if (filterType === "reservas") return collab.isReserve;
    if (filterType === "com_erro") return collab.orionStatus === "Erro";
    return true; // todos
  });

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="collaborator-management-panel">
      
      {/* TABS CONTROLLER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <span>Colaboradores e Fiscais de Apoio</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">CEBRASPE ACTIVE</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inscreva individualmente ou envie links de pré-cadastro público para novos fiscais.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveSubTab("list"); setParseStatus("idle"); setEditingCollabId(null); }}
            className={`btn-3d py-2.5 px-4 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeSubTab === "list" ? "btn-3d-primary" : "bg-slate-150 dark:bg-slate-800/80 text-slate-705 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            <span>👥 Relação de Fiscais</span>
          </button>
          <button
            onClick={() => { setActiveSubTab("add"); setParseStatus("idle"); setEditingCollabId(null); }}
            className={`btn-3d py-2.5 px-4 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeSubTab === "add" ? "btn-3d-secondary" : "bg-slate-150 dark:bg-slate-800/80 text-slate-705 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            <span>➕ Novo Cadastro</span>
          </button>
          {activeSubTab === "edit" && (
            <span className="btn-3d bg-indigo-650 text-white border-indigo-900 py-2.5 px-4 text-xs font-black rounded-xl cursor-default flex items-center gap-1.5">
              <span>📝 Editando Cadastro</span>
            </span>
          )}
        </div>
      </div>

      {localSuccessMsg && (
        <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1 border-2 border-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{localSuccessMsg}</span>
        </div>
      )}

      {mailDispatchResult && (
        <div className="mb-4 p-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl flex items-center gap-1.5 border-2 border-indigo-500/20">
          <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{mailDispatchResult}</span>
        </div>
      )}

      {/* SUBTAB 1: COLLABORATORS LIST */}
      {activeTabSubList(activeSubTab, filterType, setFilterType, filteredCollaborators, sendEmailNotification, confirmStaff, refuseStaff, onDelete, handleStartEdit, claId, onSimulatePublicRecruit)}

      {/* SUBTAB 2: ADD FORM */}
      {activeTabSubAddForm(
        activeSubTab, name, setName, birthDate, setBirthDate, cpf, setCpf, whatsapp, setWhatsapp, email, setEmail,
        education, setEducation, disability, setDisability, hasWorkedEnem, setHasWorkedEnem, pixKey, setPixKey,
        specialRole, setSpecialRole, languages, setLanguages, isReserve, setIsReserve, showPastYears, setShowPastYears,
        availableYears, pastEditionsSelected, setPastEditionsSelected, pastEditionsRoles, setPastEditionsRoles,
        handleCreateCollaboratorSubmit, handleCpfChange, handlePhoneChange, handleBirthDateChange
      )}

      {/* SUBTAB 4: EDIT FORM */}
      {activeSubTab === "edit" && (
        <form onSubmit={handleEditCollaboratorSubmit} className="space-y-6 text-sm bg-slate-50 dark:bg-[#070b13]/60 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#1e293b]">
          <h3 className="text-base font-display font-black text-indigo-500 border-b pb-2 dark:border-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>📝</span> Editar Cadastro de Fiscal (Orion Sync)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Carlos Costa Neto"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Data Nascimento</label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => handleBirthDateChange(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="403.401.503-12"
                className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-hidden align-middle"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(87) 98123-4567"
                className="w-full border-2 border-slate-105 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@email.com"
                className="w-full border-2 border-slate-105 dark:border-slate-805 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Chave PIX</label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF ou e-mail"
                className="w-full border-2 border-slate-105 dark:border-slate-805 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Escolaridade</label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value as any)}
                className="w-full border-2 border-slate-105 dark:border-slate-805 rounded-xl px-2 py-2.5 bg-white dark:bg-[#101726] text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-hidden"
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

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">PCD</label>
              <input
                type="text"
                value={disability}
                onChange={(e) => setDisability(e.target.value)}
                className="w-full border-2 border-slate-105 dark:border-slate-805 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden"
              />
            </div>


          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-800 dark:text-slate-300 mb-2 select-none">
              <input
                type="checkbox"
                checked={hasWorkedEnem}
                onChange={(e) => setHasWorkedEnem(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 border-2"
              />
              <span>Historico comprovado em edicoes anteriores do ENEM (1998 a 2025)</span>
            </label>

            {hasWorkedEnem && (
              <div className="p-4 bg-white dark:bg-[#101726]/40 border-2 border-slate-200 dark:border-slate-800 rounded-2xl mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Selecione anos e funções</span>
                    <button
                      type="button"
                      onClick={() => setShowRolesHelp(!showRolesHelp)}
                      className="text-[10px] bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded hover:bg-indigo-500/20 flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      {showRolesHelp ? "Fechar Guia de Funções" : "Ver Guia de Funções"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPastYears(!showPastYears)}
                    className="text-xs text-indigo-500 dark:text-indigo-400 font-extrabold cursor-pointer"
                  >
                    {showPastYears ? "Ocultar" : "Exibir Anos"}
                  </button>
                </div>

                {showRolesHelp && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-[220px] overflow-y-auto">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Funções Oficiais do ENEM para preenchimento:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ENEM_ROLES.map((role) => (
                        <div key={role.name} className="p-2 bg-white dark:bg-[#101726] border border-slate-150 dark:border-slate-800 rounded-lg text-[11px]">
                          <div className="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400 gap-1.5 flex-wrap">
                            <span>{role.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedRoles = { ...pastEditionsRoles };
                                Object.keys(pastEditionsSelected).forEach((yr) => {
                                  if (pastEditionsSelected[parseInt(yr)]) {
                                    updatedRoles[parseInt(yr)] = role.name;
                                  }
                                });
                                setPastEditionsRoles(updatedRoles);
                              }}
                              className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded hover:bg-emerald-555/20 cursor-pointer"
                              title="Preencher nos anos marcados"
                            >
                              Aplicar aos marcados
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{role.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showPastYears && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[180px] overflow-y-auto pr-2">
                    {availableYears.map((yr) => (
                      <div key={yr} className="flex flex-col p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-805 dark:text-slate-305 select-none">
                          <input
                            type="checkbox"
                            checked={!!pastEditionsSelected[yr]}
                            onChange={(e) => setPastEditionsSelected({
                              ...pastEditionsSelected,
                              [yr]: e.target.checked
                            })}
                            className="rounded text-emerald-505 w-3.5 h-3.5"
                          />
                          <span className="font-mono text-slate-905 dark:text-white font-black">{yr}</span>
                        </label>
                        {pastEditionsSelected[yr] && (
                          <input
                            type="text"
                            placeholder="Cargo"
                            list="enem-roles-list"
                            value={pastEditionsRoles[yr] || ""}
                            onChange={(e) => setPastEditionsRoles({
                              ...pastEditionsRoles,
                              [yr]: e.target.value
                            })}
                            className="mt-1 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[10px] bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-hidden"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveSubTab("list"); setEditingCollabId(null); }}
              className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-800 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="btn-3d btn-3d-secondary rounded-xl px-6 py-2.5 font-extrabold text-xs shadow-lg cursor-pointer text-white font-black"
            >
              SALVAR ALTERAÇÕES
            </button>
          </div>
        </form>
      )}

      <datalist id="enem-roles-list">
        {ENEM_ROLES.map((r) => (
          <option key={r.name} value={r.name} />
        ))}
      </datalist>
    </div>
  );
}

function activeTabSubList(
  activeSubTab: string,
  filterType: string,
  setFilterType: any,
  filteredCollaborators: CollaboratorInfo[],
  sendEmailNotification: any,
  confirmStaff: any,
  refuseStaff: any,
  onDelete: any,
  onStartEdit: (c: CollaboratorInfo) => void,
  claId: string,
  onSimulatePublicRecruit?: () => void
) {
  if (activeSubTab !== "list") return null;

  // Track pending recruitment requests
  const recruitmentRequestsCount = filteredCollaborators.filter(c => c.isExternalRecruit && c.status === "Pendente").length;

  return (
    <div className="space-y-4">
      {/* 3D Glass Recruitment Link Info Card */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border-2 border-emerald-500/20 dark:border-indigo-500/20 rounded-2xl p-5 space-y-4 shadow-[#10b981]/5 shadow-lg animate-fade-in">
        <div className="space-y-1">
          <h4 className="text-sm font-display font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>🔗</span> Link de Recrutamento para Novos Fiscais
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
            Deseja coletar pré-inscrições de novos colaboradores/fiscais diretamente para seu local de aplicação? Compartilhe o link oficial abaixo. Quando um colaborador finaliza a inscrição, todos os seus dados pessoais e de participação são sincronizados e listados automaticamente com status <span className="text-amber-500 font-bold">Pendente</span> para avaliação.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-[#070b13]/60 rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-black uppercase tracking-widest px-2.5 py-0.5 rounded font-mono border border-emerald-550/10">LINK OFICIAL VERÍDICO (VERCEL)</span>
            </div>
            <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold p-3 bg-emerald-500/5 rounded-xl border border-emerald-550/10 select-all break-all shadow-inner">
              {`https://calangos.vercel.app/#/cadastro?cla=${claId}`}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 shrink-0 justify-end">
            <button
              onClick={() => {
                const url = `https://calangos.vercel.app/#/cadastro?cla=${claId}`;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(url);
                  alert("Link oficial do Vercel copiado com sucesso! Compartilhe com os colaboradores voluntários.");
                } else {
                  alert(`Copie o seguinte link oficial:\n${url}`);
                }
              }}
              className="btn-3d py-3 px-5 bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-800 font-extrabold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              📋 COPIAR LINK OFICIAL
            </button>
            {onSimulatePublicRecruit && (
              <button
                onClick={onSimulatePublicRecruit}
                className="btn-3d py-3 px-5 bg-teal-600 text-white hover:bg-teal-500 border-teal-800 font-extrabold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                🚀 SIMULAR INSCRIÇÃO
              </button>
            )}
          </div>
        </div>
      </div>

      {recruitmentRequestsCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-pulse shadow-xs">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Alerta CalanguS: Existem <strong>{recruitmentRequestsCount}</strong> inscrições pendentes realizadas pelo link externo de recrutamento público!</span>
          </span>
          <span className="text-[9px] uppercase tracking-wider font-extrabold bg-amber-500/20 px-2 py-0.5 rounded font-mono border border-amber-550/10 text-amber-600">Apenas Confirmar</span>
        </div>
      )}

      {/* List Filters */}
      <div className="flex gap-2 border-b-2 dark:border-slate-800 pb-3">
        {(["todos", "efetivos", "reservas", "com_erro"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold cursor-pointer transition capitalize active:scale-95 ${filterType === f ? "bg-slate-900 dark:bg-emerald-600 dark:text-white text-white shadow-xs" : "bg-slate-100 dark:bg-[#101726]/80 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
          >
            {f === "todos" ? "Todos Fiscais" : f === "efetivos" ? "Efetivos" : f === "reservas" ? "Reservas" : "⚠ Inconsistência (Orion)"}
          </button>
        ))}
      </div>

      {filteredCollaborators.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-center text-slate-400 font-bold text-xs space-y-2">
          <p>Nenhum colaborador corresponde ao filtro de busca selecionado no CalanguS.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#080b13]/40 shadow-inner max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#101726]/50 uppercase text-[9px] font-black text-slate-550 dark:text-slate-400 tracking-widest border-b-2 border-slate-200 dark:border-slate-800">
                <th className="p-4">Nome Colaborador</th>
                <th className="p-4 font-mono">CPF / Chave Pix</th>
                <th className="p-4">Função Especial</th>
                <th className="p-4">Escolaridade / Deficiência</th>
                <th className="p-4">Relação Orion</th>
                <th className="p-4">Confirm. Cand.</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-155 dark:divide-slate-800">
              {filteredCollaborators.map((c) => (
                <tr key={c.id} className="hover:bg-slate-500/5 transition">
                  {/* Name detail */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">{c.name}</div>
                      {c.isExternalRecruit && (
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-extrabold border border-indigo-500/20 px-1.5 rounded">RECRUTA_EXTERNO</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-450 font-mono mt-0.5">{c.email} | {c.whatsapp}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {c.isReserve ? (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-500/10">
                          RESERVA
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-500/10">
                          {c.assignedRole || "Não Definido"}: {c.assignedRoom || "Sem Sala (Arraste)"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* CPF & Pix */}
                  <td className="p-4 font-mono">
                    <div className="font-bold text-slate-850 dark:text-slate-200 text-xs">{c.cpf}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5 font-bold">PIX: {c.pixKey || "Nenhum Pix"}</div>
                  </td>

                  {/* Specialized and past enem experience */}
                  <td className="p-4">
                    <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-455 font-black px-2.5 py-0.5 rounded-md text-[10px] border border-indigo-500/10">
                      {c.specialRole}
                    </span>
                    {c.specialRole === "Tradutor e Intérprete" && c.languages && (
                      <div className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 mt-1">Idiomas: {c.languages.join(", ")}</div>
                    )}
                    <div className="text-[9px] text-slate-450 dark:text-slate-400 mt-1 font-bold">
                      {c.hasWorkedEnem ? `Trabalhou em ${c.pastEditions.length} edições` : "Novo no ENEM"}
                    </div>
                  </td>

                  {/* Education / disability */}
                  <td className="p-4">
                    <div className="text-slate-705 dark:text-slate-300 font-extrabold text-xs">{c.education}</div>
                    <div className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">PCD: {c.disability}</div>
                  </td>

                  {/* Orion Cross-audit reports */}
                  <td className="p-4">
                    {c.orionStatus === "Erro" ? (
                      <div className="bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-500/20 border-2 p-1.5 rounded-xl max-w-[210px] shadow-sm">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-700 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Erro Cadastral</span>
                        </div>
                        <ul className="text-[9px] list-disc list-inside mt-1 space-y-0.5 max-h-[50px] overflow-y-auto font-mono font-bold text-rose-600/90 dark:text-rose-400/90">
                          {c.orionErrors.map((err, i) => (
                            <li key={i} className="truncate" title={err}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 border-2 font-black text-[9px] px-2.5 py-1 rounded-full shadow-xs">
                        ✓ Orion OK
                      </span>
                    )}
                  </td>

                  {/* Confirmation status */}
                  <td className="p-4">
                    <span className={`font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full ${c.status === "Confirmado" ? "bg-emerald-600 text-white" : c.status === "Recusado" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
                      {c.status}
                    </span>
                  </td>

                  {/* Quick trigger Actions */}
                  <td className="p-4 text-right font-bold">
                    <div className="flex justify-end gap-1.5 items-center">
                      <button
                        onClick={() => sendEmailNotification(c)}
                        title="Enviar ou reenviar solicitação de confirmação por e-mail"
                        className="p-2 hover:bg-indigo-500/10 rounded-xl text-indigo-500 dark:hover:bg-indigo-500/15 cursor-pointer border border-transparent hover:border-indigo-550/20 active:scale-90 transition-all"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStartEdit(c)}
                        title="Editar Registro de Colaborador"
                        className="p-2 hover:bg-teal-500/10 rounded-xl text-teal-500 hover:text-teal-600 cursor-pointer border border-transparent hover:border-teal-555/20 active:scale-95 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmStaff(c.id!)}
                        title="Forçar Confirmação Manual"
                        className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:scale-105 rounded-lg text-emerald-500 font-extrabold cursor-pointer active:scale-90 transition-all text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => refuseStaff(c.id!)}
                        title="Recusar Participante"
                        className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:scale-105 rounded-lg text-rose-550 font-extrabold cursor-pointer active:scale-90 transition-all text-sm"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => onDelete(c.id!)}
                        title="Excluir Colaborador"
                        className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 cursor-pointer border border-transparent hover:border-rose-550/20 active:scale-95 transition-all"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function activeTabSubAddForm(
  activeSubTab: string,
  name: string,
  setName: any,
  birthDate: string,
  setBirthDate: any,
  cpf: string,
  setCpf: any,
  whatsapp: string,
  setWhatsapp: any,
  email: string,
  setEmail: any,
  education: string,
  setEducation: any,
  disability: string,
  setDisability: any,
  hasWorkedEnem: boolean,
  setHasWorkedEnem: any,
  pixKey: string,
  setPixKey: any,
  specialRole: string,
  setSpecialRole: any,
  languages: string,
  setLanguages: any,
  isReserve: boolean,
  setIsReserve: any,
  showPastYears: boolean,
  setShowPastYears: any,
  availableYears: number[],
  pastEditionsSelected: Record<number, boolean>,
  setPastEditionsSelected: any,
  pastEditionsRoles: Record<number, string>,
  setPastEditionsRoles: any,
  handleCreateCollaboratorSubmit: any,
  handleCpfChange: any,
  handlePhoneChange: any,
  handleBirthDateChange: any
) {
  if (activeSubTab !== "add") return null;

  return (
    <form onSubmit={handleCreateCollaboratorSubmit} className="space-y-6 text-sm bg-slate-50 dark:bg-[#070b13]/60 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#e2e8f0] dark:shadow-[4px_4px_0px_0px_#1e293b]">
      <h3 className="text-base font-display font-black text-slate-800 dark:text-white uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
        <span>👤</span> Form Cadastro Individual
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Nome Completo (Sem Caps-lock total)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Carlos Costa Neto"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-semibold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Data Nascimento</label>
          <input
            type="text"
            value={birthDate}
            onChange={(e) => handleBirthDateChange(e.target.value)}
            placeholder="DD/MM/AAAA"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-semibold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">CPF (com hífen e pontos)</label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => handleCpfChange(e.target.value)}
            placeholder="Ex: 403.401.503-12"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-mono font-bold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">WhatsApp</label>
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="Ex: (87) 98123-4567"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-mono font-bold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ex: carlos@email.com"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-semibold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Chave PIX</label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="Chave Pix para repasse Cebraspe"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-mono font-bold"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Grau de Escolaridade</label>
          <select
            value={education}
            onChange={(e) => setEducation(e.target.value as any)}
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2.5 bg-white dark:bg-[#101726] text-slate-800 dark:text-slate-200 text-xs font-bold"
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

        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-550 dark:text-slate-400 mb-1">Necessidade Física PCD</label>
          <input
            type="text"
            value={disability}
            onChange={(e) => setDisability(e.target.value)}
            placeholder="Escreva PCD ou Nenhuma"
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40 text-xs font-semibold"
          />
        </div>


      </div>

      {/* Checklist ENEM Worked years */}
      <div className="pt-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-850 dark:text-slate-300 mb-2 select-none">
          <input
            type="checkbox"
            checked={hasWorkedEnem}
            onChange={(e) => setHasWorkedEnem(e.target.checked)}
            className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 border-2"
          />
          <span>Possui histórico comprovado em outras edições do ENEM? (1998 a 2025)</span>
        </label>

        {hasWorkedEnem && (
          <div className="p-4 bg-white dark:bg-[#101726]/40 border-2 border-slate-250 dark:border-slate-800 rounded-2xl mt-3 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Marque as edições e registre a função</span>
              <button
                type="button"
                onClick={() => setShowPastYears(!showPastYears)}
                className="text-xs text-indigo-550 dark:text-indigo-400 font-black hover:underline cursor-pointer"
              >
                {showPastYears ? "Recolher Histórico" : "Expandir Lista de Anos (28 Edições)"}
              </button>
            </div>

            <details className="text-xs bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 cursor-pointer group">
              <summary className="font-extrabold text-indigo-650 dark:text-indigo-455 select-none flex items-center gap-1.5 focus:outline-hidden hover:text-indigo-505">
                <span>📚</span> Ver Lista de Funções Oficiais do ENEM (Cheatsheet)
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 cursor-default">
                {ENEM_ROLES.map((role) => (
                  <div key={role.name} className="p-2.5 bg-white dark:bg-[#101726] border border-slate-150 dark:border-slate-800 rounded-lg text-[11px] hover:border-indigo-400 transition">
                    <div className="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400 gap-1.5 flex-wrap">
                      <span>{role.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedRoles = { ...pastEditionsRoles };
                          Object.keys(pastEditionsSelected).forEach((yr) => {
                            if (pastEditionsSelected[parseInt(yr)]) {
                              updatedRoles[parseInt(yr)] = role.name;
                            }
                          });
                          setPastEditionsRoles(updatedRoles);
                        }}
                        className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded hover:bg-emerald-555/20 cursor-pointer"
                      >
                        Aplicar aos marcados
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{role.desc}</p>
                  </div>
                ))}
              </div>
            </details>

            {showPastYears && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                {availableYears.map((yr) => (
                  <div key={yr} className="flex flex-col p-2 bg-slate-50 dark:bg-[#070b13]/50 border-2 border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-555/40 transition">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-305 select-none">
                      <input
                        type="checkbox"
                        checked={!!pastEditionsSelected[yr]}
                        onChange={(e) => setPastEditionsSelected({
                          ...pastEditionsSelected,
                          [yr]: e.target.checked
                        })}
                        className="rounded text-emerald-555 w-3.5 h-3.5"
                      />
                      <span className="font-mono text-slate-900 dark:text-white font-black">{yr}</span>
                    </label>
                    {pastEditionsSelected[yr] && (
                      <input
                        type="text"
                        placeholder="Chefe de Setor, Fiscal, etc."
                        list="enem-roles-list"
                        value={pastEditionsRoles[yr] || ""}
                        onChange={(e) => setPastEditionsRoles({
                          ...pastEditionsRoles,
                          [yr]: e.target.value
                        })}
                        className="mt-1.5 border-2 border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-[10px] bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          className="btn-3d btn-3d-secondary rounded-xl px-6 py-3 font-extrabold text-xs shadow-lg"
        >
          SALVAR INSCRIÇÃO INDIVIDUAL
        </button>
      </div>
    </form>
  );
}

function activeTabSubImport(
  activeSubTab: string,
  fileInputRef: React.RefObject<HTMLInputElement | null>,
  parseStatus: string,
  parseErrors: { row: number; name: string; message: string }[],
  handleSpreadsheetImport: any
) {
  if (activeSubTab !== "import") return null;

  return (
    <div className="p-6 bg-slate-50 dark:bg-[#070b13]/60 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_#1e293b]">
      <div className="flex flex-col lg:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-display font-black text-slate-850 dark:text-white uppercase tracking-wider">Planilha de Importação (Modelo XLS)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">O sistema aceita importações de planilhas seguindo o modelo oficial estruturado com os dados cadastrais do fiscal.</p>
        </div>

        <button
          onClick={downloadCsvTemplate}
          className="btn-3d btn-3d-accent rounded-xl px-4 py-2.5 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>BAIXAR MODELO XLS (CSV)</span>
        </button>
      </div>

      {/* Visual representation of the spreadsheet headers - matches uploaded image */}
      <div>
        <p className="text-[10px] uppercase font-black text-indigo-500 dark:text-indigo-400 mb-2 tracking-wider">Mapeamento de Colunas do Arquivo XLS / CSV:</p>
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#101726]/40 shadow-inner text-xs font-sans">
          <div className="grid grid-cols-6 bg-slate-100 dark:bg-[#070b13] border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">A</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">B</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">C</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">D</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">E</div>
            <div className="p-1.5 font-bold text-center text-slate-400 bg-slate-150 dark:bg-slate-900 select-none">F</div>
          </div>
          <div className="grid grid-cols-6 divide-x divide-slate-200 dark:divide-slate-800 font-bold font-mono text-[9px] uppercase tracking-wide text-slate-700 dark:text-slate-300 text-center bg-slate-50/50 dark:bg-[#101726]/20">
            <div className="p-2 truncate bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-350">Nome</div>
            <div className="p-2 truncate bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-350">CPF</div>
            <div className="p-2 truncate">D. Nascimento</div>
            <div className="p-2 truncate">Telefone</div>
            <div className="p-2 truncate">Email</div>
            <div className="p-2 truncate">Escolaridade</div>
          </div>
          <div className="grid grid-cols-6 divide-x divide-slate-150 dark:divide-slate-850 font-mono text-[9px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-800 p-1.5 bg-white dark:bg-[#101726]/40">
            <div className="p-1.5 truncate">Ex: Carlos Silva</div>
            <div className="p-1.5 truncate">Ex: 40320189844</div>
            <div className="p-1.5 truncate">Ex: 05/12/1988</div>
            <div className="p-1.5 truncate">Ex: 11987654321</div>
            <div className="p-1.5 truncate">Ex: carlos@email.com</div>
            <div className="p-1.5 truncate">Ex: Ensino Médio</div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-440 mt-1.5 leading-relaxed">
          💡 <strong>Dica de Compatibilidade:</strong> Ao exportar do Excel, salve como <strong>CSV Separado por Semicolons (;)</strong> ou CSV Utf-8. O validador integrado CalanguS processará a formatação e preencherá automaticamente os detalhes cadastrais no painel.
        </p>
      </div>

      {/* Error and validation logs */}
      {parseStatus === "rejected" && (
        <div className="p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl text-rose-800 dark:text-rose-455 space-y-3 shadow-sm animate-pulse">
          <h4 className="font-black text-sm flex items-center gap-2 text-rose-700 dark:text-rose-400 uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <span>Planilha Rejeitada pelo Validador CalanguS</span>
          </h4>
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-bold">
            Para garantir o alinhamento com a base Orion Cebraspe, **todas as inscrições da planilha foram abortadas em tempo real**. Foram encontradas informações inválidas (como nomes 100% em caixa alta, CPF incorreto ou e-mail com formato inadequado). Por favor, repare-os e envie novamente.
          </p>

          <div className="border-2 border-rose-500/20 bg-white dark:bg-slate-950 rounded-xl p-3 max-h-[190px] overflow-y-auto shadow-inner">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-800 text-[9px] uppercase font-black tracking-wider text-rose-500 pb-1">
                  <th className="py-1">Linha Planilha</th>
                  <th className="py-1">Candidato / Coluna</th>
                  <th className="py-1">Erro de Auditoria Detectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {parseErrors.map((err, idx) => (
                  <tr key={idx} className="hover:bg-rose-500/5">
                    <td className="py-1.5 font-mono text-xs text-slate-400 dark:text-slate-500">{err.row}</td>
                    <td className="py-1.5 font-black text-slate-805 dark:text-white">{err.name}</td>
                    <td className="py-1.5 text-rose-605 dark:text-rose-400 font-bold font-mono text-[11px]">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DROP AREA */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 bg-white dark:bg-[#101726]/30 text-center flex flex-col items-center justify-center space-y-3 shadow-inner">
        <Upload className="w-10 h-10 text-slate-400 dark:text-slate-700 animate-bounce" />
        <div>
          <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Arraste seu arquivo .csv/.xls aqui</p>
          <p className="text-xs text-slate-450 dark:text-slate-450 mt-1 font-semibold">Tamanho máximo suportado: 800KB por upload</p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleSpreadsheetImport}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-3d btn-3d-secondary rounded-xl px-4 py-2 text-xs font-black shadow-md cursor-pointer uppercase"
        >
          Selecionar Arquivo do Computador
        </button>
      </div>
    </div>
  );
}
