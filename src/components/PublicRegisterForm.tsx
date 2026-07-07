import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CollaboratorInfo, BuildingInfo, PastEdition } from "../types";
import { auditCollaborator } from "../lib/data-validator";
import { getCurrentUserProfile } from "../lib/db-services";
import { 
  Building2, Users, FileText, CheckCircle, AlertTriangle, 
  ChevronRight, Sparkles, Mail, Phone, ShieldCheck, Heart, RotateCcw
} from "lucide-react";
import { ENEM_ROLES } from "./CollaboratorManager";

interface PublicRegisterFormProps {
  onBackToApp?: () => void;
}

export default function PublicRegisterForm({ onBackToApp }: PublicRegisterFormProps) {
  // Fetch lists of buildings
  const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);

  // Form states
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
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

  // Past Editions checklist helper (ENEM 1998 to 2025)
  const [pastEditionsSelected, setPastEditionsSelected] = useState<Record<number, boolean>>({});
  const [pastEditionsRoles, setPastEditionsRoles] = useState<Record<number, string>>({});
  const [showPastYears, setShowPastYears] = useState(false);

  const availableYears = Array.from({ length: 2025 - 1998 + 1 }, (_, i) => 2025 - i);

  // Submission control
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [bypassWarning, setBypassWarning] = useState(false);

  // States for storing CLA Coordinator's Profile parsed from the URL
  const [claProfile, setClaProfile] = useState<{ name: string; email: string } | null>(null);
  const [loadingClaProfile, setLoadingClaProfile] = useState(false);

  // Parse incoming CLA or Building ID from URL
  const getClaParamFromUrl = (): string | null => {
    try {
      // 1. Try standard query params (e.g. ?cla=xxx)
      const queryParams = new URLSearchParams(window.location.search);
      if (queryParams.get("cla")) return queryParams.get("cla");
      if (queryParams.get("building")) return queryParams.get("building");

      // 2. Try hash query params (e.g. #/cadastro?cla=xxx)
      const hash = window.location.hash;
      if (hash.includes("?")) {
        const hashQueryParams = new URLSearchParams(hash.split("?")[1]);
        if (hashQueryParams.get("cla")) return hashQueryParams.get("cla");
        if (hashQueryParams.get("building")) return hashQueryParams.get("building");
      }

      // 3. Try to extract last path segment or segment after /recrutamento/
      const pathname = window.location.pathname;
      const parts = pathname.split("/");
      if (parts.length > 1) {
        const last = parts[parts.length - 1];
        if (last && last.length > 5 && last !== "cadastro" && last !== "fiscais") {
          return last;
        }
      }
    } catch (e) {
      console.error("Error parsing CLA parameter", e);
    }
    return null;
  };

  // Load buildings from Firestore to link public form registration
  useEffect(() => {
    let active = true;
    const fetchBuildings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "buildings"));
        const list: BuildingInfo[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as BuildingInfo);
        });
        if (active) {
          setBuildings(list);
          
          // Try to auto-select matching building
          const claParam = getClaParamFromUrl();
          if (claParam) {
            // Find a building where building.id or building.claId matches the parameter
            const matched = list.find(b => b.claId === claParam || b.id === claParam);
            if (matched) {
              setSelectedBuildingId(matched.id || "");
            } else if (list.length > 0) {
              setSelectedBuildingId(list[0].id || "");
            }
          } else if (list.length > 0) {
            setSelectedBuildingId(list[0].id || "");
          }
        }
      } catch (err) {
        console.error("Error loading buildings", err);
      } finally {
        if (active) setLoadingBuildings(false);
      }
    };
    fetchBuildings();
    return () => { active = false; };
  }, []);

  // Load CLA user profile if available in URL parameters
  useEffect(() => {
    const claParam = getClaParamFromUrl();
    if (!claParam) return;
    
    setLoadingClaProfile(true);
    getCurrentUserProfile(claParam)
      .then((profile) => {
        if (profile) {
          setClaProfile({ name: profile.name, email: profile.email });
        }
      })
      .catch((err) => {
        console.error("Error fetching CLA profile", err);
      })
      .finally(() => {
        setLoadingClaProfile(false);
      });
  }, []);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      value = value
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      setCpf(value);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
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

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 8) {
      value = value
        .replace(/(\d{2})(\d)/, "$1/$2")
        .replace(/(\d{2})(\d)/, "$1/$2");
      setBirthDate(value);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setValidationWarnings([]);

    const claParam = getClaParamFromUrl();
    if (!selectedBuildingId && !claParam) {
      setSubmitError("Por favor, selecione qual é o Prédio / Local de Aplicação para sua pré-inscrição.");
      return;
    }

    // Run audit validations locally first
    const audits = auditCollaborator({
      name: name.trim(),
      cpf,
      whatsapp: whatsapp.replace(/\D/g, ""),
      email: email.trim(),
      education,
      pixKey: pixKey.trim() || cpf
    });

    // If there are audits errors and we haven't bypassed, display warning block
    if (audits.length > 0 && !bypassWarning) {
      setValidationWarnings(audits.map(a => a.message));
      setSubmitError("Inconsistências cadastrais apontadas pelo sistema Orion foram detectadas.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find building to retrieve claId
      const targetBuilding = buildings.find(b => b.id === selectedBuildingId);
      const claId = targetBuilding ? (targetBuilding.claId || claParam || "mock-cla-user-id") : (claParam || "mock-cla-user-id");

      // Build past edition list
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

      const collabData = {
        claId,
        buildingId: selectedBuildingId || "",
        name: name.trim(),
        birthDate,
        cpf,
        whatsapp,
        email: email.trim(),
        education,
        disability: disability.trim(),
        hasWorkedEnem,
        pastEditions: finalPastEditions,
        pixKey: pixKey.trim() || cpf,
        specialRole,
        languages: languages.split(";").map(l => l.trim()).filter(Boolean),
        isReserve: true, // recruited public are automatically reserve status first until CLA promotes
        status: "Pendente" as const,
        orionStatus: audits.length > 0 ? ("Erro" as const) : ("Ok" as const),
        orionErrors: audits.map(a => a.message),
        orionSynced: audits.length === 0,
        isExternalRecruit: true, // Identify this as from the public link!
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "collaborators"), collabData);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error(err);
      setSubmitError("Falha na gravação do cadastro no banco de dados. Verifique a conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setBirthDate("");
    setCpf("");
    setWhatsapp("");
    setEmail("");
    setEducation("Ensino Superior Completo");
    setDisability("Nenhuma");
    setHasWorkedEnem(false);
    setPixKey("");
    setSpecialRole("Nenhuma");
    setLanguages("");
    setPastEditionsSelected({});
    setPastEditionsRoles({});
    setSubmitSuccess(false);
    setBypassWarning(false);
    setValidationWarnings([]);
    setSubmitError("");
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 animate-fade-in" id="public-recruitment-form-view">
      
      {/* Simulation Header Indicator */}
      {onBackToApp && (
        <div className="no-print mb-6 p-4 bg-[#101726]/80 text-blue-300 rounded-2xl border-2 border-blue-500/20 shadow-lg text-xs font-semibold flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
            <div>
              <span className="font-extrabold uppercase text-indigo-400 block font-mono">SIMULAÇÃO DE LINK EXTERNO</span>
              <span>Este formulário representa a visão de um candidato externo que acessou o link de recrutamento do CalanguS.</span>
            </div>
          </div>
          <button
            onClick={onBackToApp}
            className="btn-3d py-1.5 px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-extrabold text-[10px] cursor-pointer"
          >
            ↩ VOLTAR AO MEU PAINEL (CLA)
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#0c1220]/95 p-6 md:p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all">
        
        {/* SUCCESS PANEL */}
        {submitSuccess ? (
          <div className="py-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 dark:bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500 max-w-max">
              <CheckCircle className="w-12 h-12 text-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-display font-black text-slate-850 dark:text-white uppercase tracking-wider">Inscrição Enviada!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                Olá <strong className="text-emerald-500">{name}</strong>, agradecemos por sua pré-inscrição no calendário de aplicação do ENEM 2026.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Seus dados cadastrais foram gravados e estão aguardando validação do Coordenador Geral do Local de Aplicação (**CLA**). Caso restem divergências nas informações, o fiscal assistente (**ALA**) falará com você no Whatsapp cadastrado.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-left text-[11px] font-mono font-bold max-w-sm mx-auto space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="text-indigo-400 uppercase tracking-widest text-[9px] mb-1 font-black">Resumo das Credenciais:</div>
              <div>Nome: {name}</div>
              <div>CPF: {cpf}</div>
              <div>Função Especial: {specialRole}</div>
              <div>Alocação Inicial: Equipe Reserva</div>
            </div>

            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={resetForm}
                className="btn-3d py-2.5 px-5 bg-slate-150 dark:bg-slate-800 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-200 cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nova Inscrição</span>
              </button>
              {onBackToApp && (
                <button
                  onClick={onBackToApp}
                  className="btn-3d btn-3d-primary py-2.5 px-5 font-black text-xs rounded-xl text-white cursor-pointer"
                >
                  Confirmar no Painel CLA
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-6 text-xs font-bold">
            
            {/* Form Title & Logo */}
            <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg transform shrink-0 rotate-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-display font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Pré-Inscrição de Fiscais — ENEM 2026
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Portal Público CalanguS. Preencha seus dados abaixo para se credenciar à equipe de fiscais de sala e pessoal de apoio técnico.
                </p>
              </div>
            </div>

            {selectedBuildingId && !getClaParamFromUrl() && (
              (() => {
                const b = buildings.find(item => item.id === selectedBuildingId);
                if (!b) return null;
                return (
                  <div className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 p-4 rounded-2xl border-2 border-emerald-500/20 text-xs font-bold space-y-1 animate-fade-in shadow-xs">
                    <span className="uppercase text-[9px] tracking-widest font-black text-emerald-500 block">🏫 Unidade de Aplicação Selecionada</span>
                    <p className="text-sm font-extrabold">{b.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Endereço: {b.address}</p>
                  </div>
                );
              })()
            )}

            {submitError && (
              <div className="p-4 bg-rose-500/10 border-2 border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl space-y-2 font-bold leading-relaxed">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="uppercase text-xs tracking-wider">Inconsistência Identificada</span>
                </div>
                {validationWarnings.length > 0 ? (
                  <ul className="text-[11px] font-mono list-disc list-inside pl-1 space-y-0.5 text-rose-600 dark:text-rose-400/90">
                    {validationWarnings.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-600 dark:text-slate-350">{submitError}</p>
                )}

                {validationWarnings.length > 0 && (
                  <div className="pt-3 border-t border-rose-500/10 mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Você deseja enviar os dados mesmo com inconsistências? (O CLA precisará corrigir)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBypassWarning(true);
                        setSubmitError("");
                      }}
                      className="bg-rose-500 text-white font-black hover:bg-rose-600 rounded px-2.5 py-1 transition cursor-pointer"
                    >
                      Ignorar Alerta e Enviar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FIELDSET Group 1: General destination / building */}
            {getClaParamFromUrl() ? (
              <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-indigo-500/5 dark:from-emerald-500/10 dark:to-slate-900/40 rounded-2xl border-2 border-emerald-500/20 space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>1. Coordenador Geral (CLA) responsável e Local de Atuação</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CLA Info */}
                  <div className="p-3 bg-white dark:bg-slate-950/80 rounded-xl border border-emerald-500/10 space-y-1.5 shadow-xs">
                    <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 block font-mono">👤 COORDENADOR RESPONSÁVEL</span>
                    {loadingClaProfile ? (
                      <p className="text-xs text-slate-400 animate-pulse">Buscando informações do CLA...</p>
                    ) : claProfile ? (
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-white uppercase">{claProfile.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono italic">{claProfile.email}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-white">Coordenador do Local de Aplicação</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-mono italic">ID Ref: {getClaParamFromUrl()}</p>
                      </div>
                    )}
                  </div>

                  {/* Designated Building Info */}
                  <div className="p-3 bg-white dark:bg-slate-950/80 rounded-xl border border-emerald-500/10 space-y-1.5 shadow-xs">
                    <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 block font-mono">🏫 LOCAL DE INSCRIÇÃO DIRETA</span>
                    {selectedBuildingId ? (
                      (() => {
                        const b = buildings.find(item => item.id === selectedBuildingId);
                        if (!b) return <p className="text-xs text-slate-400 animate-pulse">Buscando dados do prédio...</p>;
                        return (
                          <div>
                            <p className="text-sm font-extrabold text-slate-800 dark:text-white">{b.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-tight">{b.address}</p>
                          </div>
                        );
                      })()
                    ) : (
                      <div>
                        <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">Prédio em Configuração</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Os cadastros serão vinculados exclusivamente por este Coordenador.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-normal flex items-center gap-1.5 bg-emerald-500/5 p-2 px-3 rounded-lg border border-emerald-500/10 animate-fade-in">
                  <span className="text-emerald-500 text-xs">✓</span>
                  <span>Link verificado. Seu cadastro aparecerá <strong className="text-emerald-600 dark:text-emerald-400">exclusivamente</strong> na lista de aprovação do CLA indicado acima.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>1. Escolha o Local de Aplicação (Escola / Prédio)</span>
                </h3>
                
                {loadingBuildings ? (
                  <div className="text-[11px] text-slate-500 font-medium py-2">Consultando prédios parceiros cadastrados...</div>
                ) : buildings.length === 0 ? (
                  <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    Nenhum prédio configurado em rede ainda. Por padrão, sua inscrição será vinculada à Escola Estadual Governador Calango Sábio.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Selecione o Prédio ao qual você deseja se candidatar:</label>
                    <select
                      value={selectedBuildingId}
                      onChange={(e) => setSelectedBuildingId(e.target.value)}
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-3 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 text-sm font-bold shadow-inner"
                      required
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          🏫 {b.name} ({b.address})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* FIELDSET Group 2: Cadastral Info */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400 border-b pb-1.5 dark:border-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 shrink-0" />
                <span>2. Seus Dados Cadastrais</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Costa Neto (use maiúsculas/minúsculas corretas)"
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    required
                  />
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1 font-medium">⚠️ Não digite o nome completo inteiramente em MAIÚSCULAS para evitar descompasso com o Orion.</span>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5">Data Nascimento</label>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5">CPF (Apenas números ou formatado)</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="Ex: 403.401.503-12"
                    maxLength={14}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Telefone WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={handlePhoneChange}
                    placeholder="Ex: (87) 98123-4567"
                    maxLength={15}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>E-mail</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: carlos@email.com"
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5">Chave PIX (Onde quer receber o repasse)</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Padrão CPF ou digite outra chave"
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                  />
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1 font-medium">Caso em branco, utilizaremos o CPF.</span>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5">Grau de Escolaridade</label>
                  <select
                    value={education}
                    onChange={(e) => setEducation(e.target.value as any)}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold shadow-inner"
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
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5">Declaração Física PCD / Deficiência física?</label>
                  <input
                    type="text"
                    value={disability}
                    onChange={(e) => setDisability(e.target.value)}
                    placeholder="Nenhuma ou detalhe se precisar de sala acessível"
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1.5">Função de Apoio / Especialização</label>
                  <select
                    value={specialRole}
                    onChange={(e) => setSpecialRole(e.target.value as any)}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold shadow-inner"
                  >
                    <option value="Nenhuma">Nenhuma / Fiscal de Sala Padrão</option>
                    <option value="Libras">Libras (Intérprete)</option>
                    <option value="Tradutor e Intérprete">Tradutor e Intérprete</option>
                    <option value="Técnico de Informática">Técnico de Informática</option>
                    <option value="Auxiliar de Acessibilidade">Auxiliar de Acessibilidade</option>
                    <option value="Ledor/Transcritor">Ledor/Transcritor Especializado</option>
                  </select>
                </div>

                {specialRole === "Tradutor e Intérprete" && (
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase text-indigo-500 mb-1.5 font-extrabold">Idiomas dominados (Separados por ponto e vírgula)</label>
                    <input
                      type="text"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="Ex: Espanhol; Inglês; Francês"
                      className="w-full border-2 border-indigo-400/30 rounded-xl px-3.5 py-3 bg-indigo-500/5 text-indigo-550 dark:text-indigo-400 focus:outline-hidden text-sm font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* FIELDSET Group 3: Historical worked ENEMS */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-2 border-slate-150 dark:border-slate-850 space-y-4">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-extrabold text-slate-800 dark:text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={hasWorkedEnem}
                  onChange={(e) => setHasWorkedEnem(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 mt-0.5 border-2 shrink-0"
                />
                <div>
                  <span className="block font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Deseja registrar histórico em edições anteriores do ENEM? (1998 a 2025)</span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 font-semibold">Custa a seu favor para o CLA priorizar o enquadramento de fiscais experientes no prédio.</span>
                </div>
              </label>

              {hasWorkedEnem && (
                <div className="p-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-850 rounded-xl mt-3 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Selecione os anos das edições trabalhadas</span>
                    <button
                      type="button"
                      onClick={() => setShowPastYears(!showPastYears)}
                      className="text-xs text-indigo-500 dark:text-indigo-400 font-black hover:underline cursor-pointer"
                    >
                      {showPastYears ? "Ocultar Lista Completa" : "Exibir Anos (28 Edições)"}
                    </button>
                  </div>

                  <details className="text-xs bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 cursor-pointer group">
                    <summary className="font-extrabold text-indigo-600 dark:text-indigo-400 select-none flex items-center gap-1.5 focus:outline-hidden hover:text-indigo-500">
                      <span>📚</span> Ver Lista de Funções Oficiais do ENEM (Cheatsheet)
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 cursor-default">
                      {ENEM_ROLES.map((role) => (
                        <div key={role.name} className="p-2.5 bg-white dark:bg-[#101726]/40 border border-slate-150 dark:border-slate-800 rounded-lg text-[11px] hover:border-indigo-400 transition animate-fade-in">
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

                  {showPastYears ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[190px] overflow-y-auto pr-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {availableYears.map((yr) => (
                        <div key={yr} className="flex flex-col p-2 bg-slate-50 dark:bg-[#070b13]/50 border-2 border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-555/40 transition">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-300 select-none">
                            <input
                              type="checkbox"
                              checked={!!pastEditionsSelected[yr]}
                              onChange={(e) => setPastEditionsSelected({
                                ...pastEditionsSelected,
                                [yr]: e.target.checked
                              })}
                              className="rounded text-emerald-500 w-3.5 h-3.5 shrink-0"
                            />
                            <span className="font-mono text-slate-900 dark:text-white font-black">{yr}</span>
                          </label>
                          {pastEditionsSelected[yr] && (
                            <input
                              type="text"
                              placeholder="Chefe de Setor, Fiscal, Ledor, etc."
                              list="enem-roles-list"
                              value={pastEditionsRoles[yr] || ""}
                              onChange={(e) => setPastEditionsRoles({
                                ...pastEditionsRoles,
                                [yr]: e.target.value
                              })}
                              className="mt-1.5 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[10px] bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-semibold"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-semibold text-center py-1">
                      Clique em "Exibir Anos" para registrar suas edições passadas.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SUBMIT SECTION */}
            <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-5 h-5 text-[#10b981]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Criptografia Privada Orion Cebraspe</span>
              </div>
              
              <div className="flex gap-3">
                {onBackToApp && (
                  <button
                    type="button"
                    onClick={onBackToApp}
                    className="btn-3d py-3 px-5 border-2 border-slate-250 dark:border-slate-800 dark:text-slate-300 font-extrabold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-3d btn-3d-secondary py-3 px-8 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {isSubmitting ? "ENVIANDO CREDENCIAMENTO..." : "ENVIAR MINHA PRÉ-INSCRIÇÃO"}
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

          </form>
        )}

      </div>

      <datalist id="enem-roles-list">
        {ENEM_ROLES.map((r) => (
          <option key={r.name} value={r.name} />
        ))}
      </datalist>
    </div>
  );
}
