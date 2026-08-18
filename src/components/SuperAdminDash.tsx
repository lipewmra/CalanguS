import React, { useState, useEffect } from "react";
import { EventConfigInfo, UserProfile, UserRole, BuildingInfo, CollaboratorInfo, ClaActivities } from "../types";
import { saveEventConfig, subscribeToUsers, updateUserRole, updateUserRoles, updateUserDetails, createPreRegisteredUser, subscribeToAllBuildings, subscribeToAllClaActivities, subscribeToAllCollaborators, saveBuilding } from "../lib/db-services";
import { ShieldCheck, Calendar, Settings, CheckCircle, Save, Users, RefreshCw, AlertCircle, PlusCircle, Trash2, AlertTriangle, Building, Activity, CheckSquare, Server, Layers, Pencil, X, Search, Mail, UserCheck, Hash } from "lucide-react";
import BuildingConfigView from "./BuildingConfigView";

interface SuperAdminProps {
  initialConfig: EventConfigInfo | null;
  onSaveConfig: (cfg: Omit<EventConfigInfo, "id"> & { id?: string }) => Promise<any>;
  activeSubTab?: string;
}

export default function SuperAdminDash({ initialConfig, onSaveConfig, activeSubTab = "dashboard" }: SuperAdminProps) {
  // Navigation & building state
  const [selectedClaId, setSelectedClaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Pre-configuration of building states
  const [preConfigureSchool, setPreConfigureSchool] = useState(false);
  const [preSchoolName, setPreSchoolName] = useState("");
  const [preAddress, setPreAddress] = useState("");
  const [preRoomsCount, setPreRoomsCount] = useState<number>(10);
  const [preVirtualCapacity, setPreVirtualCapacity] = useState<number>(30);
  const [preExtraRoomsCount, setPreExtraRoomsCount] = useState<number>(0);
  const [preSpecialRoomsCount, setPreSpecialRoomsCount] = useState<number>(0);
  const [preSpecialDetails, setPreSpecialDetails] = useState("");

  // Config states
  const [year, setYear] = useState(2026);
  const [examDate1, setExamDate1] = useState("08/11/2026");
  const [examDate2, setExamDate2] = useState("15/11/2026");
  const [trainingDate, setTrainingDate] = useState("07/11/2026");
  const [generalInstructions, setGeneralInstructions] = useState("Garantir rigidez na abertura e fechamento dos portões exatamente às 13:00h.");
  const [tasks, setTasks] = useState<string>("Conferir lacre das salas;Ativar placa de sinalização de salas;Alocar fiscais de reserva;Auditar chegada dos fardos de lanche");
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // User Profile Editing states (Super Admin)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editEmails, setEditEmails] = useState<string[]>([]);
  const [newSecondaryEmailInput, setNewSecondaryEmailInput] = useState("");
  const [editCoordCode, setEditCoordCode] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("CLA");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [profileSearch, setProfileSearch] = useState("");

  // New CLA Pre-registration states
  const [claName, setClaName] = useState("");
  const [claEmail, setClaEmail] = useState("");
  const [claAdditionalEmails, setClaAdditionalEmails] = useState<string[]>([]);
  const [claNewAdditionalEmail, setClaNewAdditionalEmail] = useState("");
  const [claCode, setClaCode] = useState("");
  const [claError, setClaError] = useState("");
  const [claSuccess, setClaSuccess] = useState("");
  const [claSubmitting, setClaSubmitting] = useState(false);
  const [registerRole, setRegisterRole] = useState<"CLA" | "SuperAdmin">("CLA");

  useEffect(() => {
    if (initialConfig) {
      setYear(initialConfig.year || 2026);
      setExamDate1(initialConfig.examDates?.[0] || "");
      setExamDate2(initialConfig.examDates?.[1] || "");
      setTrainingDate(initialConfig.trainingDates?.[0] || "");
      setGeneralInstructions(initialConfig.generalInstructions || "");
      setTasks(initialConfig.initialClaTasks?.join(";") || "");
    }
  }, [initialConfig]);

  // States for DB Statistics Dashboard
  const [allBuildings, setAllBuildings] = useState<BuildingInfo[]>([]);
  const [allCollaborators, setAllCollaborators] = useState<CollaboratorInfo[]>([]);
  const [allClaActivities, setAllClaActivities] = useState<ClaActivities[]>([]);

  // Sync users list
  useEffect(() => {
    const unsub = subscribeToUsers((usersList) => {
      setUsers(usersList);
    }, (err) => {
      console.error(err);
    });
    return () => unsub();
  }, []);

  // Sync buildings list for stats
  useEffect(() => {
    const unsub = subscribeToAllBuildings((list) => {
      setAllBuildings(list);
    });
    return () => unsub();
  }, []);

  // Sync collaborators list for stats
  useEffect(() => {
    const unsub = subscribeToAllCollaborators((list) => {
      setAllCollaborators(list);
    });
    return () => unsub();
  }, []);

  // Sync CLA activities list for stats
  useEffect(() => {
    const unsub = subscribeToAllClaActivities((list) => {
      setAllClaActivities(list);
    });
    return () => unsub();
  }, []);

  const handleSaveConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setConfigSuccess(false);

    const configData: Omit<EventConfigInfo, "id"> & { id?: string } = {
      id: initialConfig?.id,
      year: Number(year),
      examDates: [examDate1, examDate2],
      trainingDates: [trainingDate],
      generalInstructions,
      initialClaTasks: tasks.split(";").map(t => t.trim()).filter(Boolean)
    };

    try {
      await onSaveConfig(configData);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (profile: UserProfile, toggledRole: UserRole) => {
    let currentRoles = profile.roles || [profile.role];
    if (!currentRoles.includes(profile.role)) {
      currentRoles = [...currentRoles, profile.role];
    }
    
    let nextRoles: UserRole[];
    if (currentRoles.includes(toggledRole)) {
      if (currentRoles.length > 1) {
        nextRoles = currentRoles.filter(r => r !== toggledRole);
      } else {
        nextRoles = currentRoles;
      }
    } else {
      nextRoles = [...currentRoles, toggledRole];
    }
    
    let nextPrimary = profile.role;
    if (!nextRoles.includes(nextPrimary)) {
      nextPrimary = nextRoles[0];
    }
    
    try {
      await updateUserRoles(profile.uid, nextPrimary, nextRoles);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrimaryRoleChange = async (profile: UserProfile, newPrimary: UserRole) => {
    const currentRoles = profile.roles || [profile.role];
    let nextRoles = [...currentRoles];
    if (!nextRoles.includes(newPrimary)) {
      nextRoles.push(newPrimary);
    }
    try {
      await updateUserRoles(profile.uid, newPrimary, nextRoles);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditUser = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditName(profile.name || "");
    const primary = (profile.email || "").toLowerCase().trim();
    const allEmails = Array.from(new Set([
      primary,
      ...(profile.emails || []).map(e => (e || "").toLowerCase().trim())
    ].filter(Boolean)));

    setEditEmail(primary);
    setEditEmails(allEmails.length > 0 ? allEmails : [primary]);
    setNewSecondaryEmailInput("");
    setEditCoordCode(profile.coordinationCode || "");
    setEditRole(profile.role || "CLA");
    setEditError("");
    setEditSuccess("");
  };

  const handleCloseEditUser = () => {
    setEditingUser(null);
    setEditEmails([]);
    setNewSecondaryEmailInput("");
    setEditError("");
    setEditSuccess("");
  };

  const handleAddSecondaryEmailInModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailToAdd = newSecondaryEmailInput.trim().toLowerCase();
    if (!emailToAdd) return;

    if (!emailToAdd.endsWith("@gmail.com")) {
      setEditError("O e-mail adicional deve ser obrigatoriamente do Gmail (@gmail.com).");
      return;
    }

    if (editEmails.includes(emailToAdd)) {
      setEditError("Este e-mail já está incluído na lista do usuário.");
      return;
    }

    setEditEmails(prev => [...prev, emailToAdd]);
    setNewSecondaryEmailInput("");
    setEditError("");
  };

  const handleRemoveSecondaryEmailInModal = (emailToRemove: string) => {
    if (editEmails.length <= 1) {
      setEditError("O usuário precisa ter ao menos um e-mail cadastrado.");
      return;
    }
    const updated = editEmails.filter(e => e !== emailToRemove);
    setEditEmails(updated);
    // If the removed email was the active primary email, switch primary to first remaining
    if (editEmail.toLowerCase() === emailToRemove.toLowerCase()) {
      setEditEmail(updated[0]);
    }
  };

  const handleSetPrimaryEmailInModal = (newPrimary: string) => {
    setEditEmail(newPrimary);
    if (!editEmails.includes(newPrimary)) {
      setEditEmails(prev => [newPrimary, ...prev]);
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError("");
    setEditSuccess("");

    if (!editName.trim()) {
      setEditError("O nome completo não pode estar vazio.");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("O e-mail principal não pode estar vazio.");
      return;
    }
    if (!editEmail.toLowerCase().endsWith("@gmail.com")) {
      setEditError("O e-mail principal deve ser obrigatoriamente do Gmail (@gmail.com).");
      return;
    }

    // Ensure all emails in editEmails end with @gmail.com
    const allCleanEmails = Array.from(new Set([
      editEmail.trim().toLowerCase(),
      ...editEmails.map(em => em.trim().toLowerCase())
    ].filter(Boolean)));

    for (const em of allCleanEmails) {
      if (!em.endsWith("@gmail.com")) {
        setEditError(`O e-mail '${em}' não é um endereço válido do Gmail (@gmail.com).`);
        return;
      }
    }

    if (editRole === "CLA" && editCoordCode.trim() && !/^\d+$/.test(editCoordCode.trim())) {
      setEditError("O código de coordenação deve conter apenas números.");
      return;
    }

    setEditSaving(true);
    try {
      const currentRoles = editingUser.roles || [editingUser.role];
      let nextRoles = [...currentRoles];
      if (!nextRoles.includes(editRole)) {
        nextRoles.push(editRole);
      }

      await updateUserDetails(editingUser.uid, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        emails: allCleanEmails,
        coordinationCode: editCoordCode.trim(),
        role: editRole,
        roles: nextRoles
      });

      // Synchronize associated building if exists
      if (editCoordCode.trim()) {
        try {
          const userBuilding = allBuildings.find(b => b.claId === editingUser.uid || b.id === editingUser.uid);
          if (userBuilding) {
            await saveBuilding({
              ...userBuilding,
              coordRoom: editCoordCode.trim()
            });
          }
        } catch (bErr) {
          console.warn("Could not sync building with edited CLA:", bErr);
        }
      }

      setEditSuccess("Dados e e-mails do usuário atualizados com sucesso!");
      setTimeout(() => {
        setEditingUser(null);
        setEditSuccess("");
      }, 1200);
    } catch (err) {
      console.error(err);
      setEditError("Erro ao salvar alterações do usuário. Tente novamente.");
    } finally {
      setEditSaving(false);
    }
  };

  // Edit User Modal
  const renderEditUserModal = () => {
    if (!editingUser) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in" id="edit-user-modal-overlay">
        <div className="bg-white dark:bg-[#0c1220] w-full max-w-lg rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[8px_8px_0px_0px_#047857] dark:shadow-[8px_8px_0px_0px_#10b981]/30 p-6 space-y-5 max-h-[90vh] overflow-y-auto" id="edit-user-modal">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Editar Usuário e E-mails
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold">
                  Gerenciar dados cadastrais e múltiplos e-mails autorizados
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseEditUser}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback messages */}
          {editSuccess && (
            <div className="p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{editSuccess}</span>
            </div>
          )}
          {editError && (
            <div className="p-3 bg-rose-500/10 text-rose-800 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveUserEdit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500/40"
                  required
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Multiple Emails Management */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#101726]/60 rounded-xl border-2 border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-300">
                  E-mails Autorizados do Gmail (@gmail.com)
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {editEmails.length} {editEmails.length === 1 ? "e-mail vinculado" : "e-mails vinculados"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                O usuário poderá entrar no sistema utilizando <strong>qualquer um</strong> destes e-mails do Gmail.
              </p>

              {/* List of associated emails */}
              <div className="space-y-1.5">
                {editEmails.map((emailItem) => {
                  const isPrimary = emailItem.toLowerCase() === editEmail.toLowerCase();
                  return (
                    <div
                      key={emailItem}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition ${
                        isPrimary
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300 font-bold"
                          : "bg-white dark:bg-[#070b13] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className={`w-3.5 h-3.5 shrink-0 ${isPrimary ? "text-emerald-500" : "text-slate-400"}`} />
                        <span className="truncate">{emailItem}</span>
                        {isPrimary ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider shrink-0">
                            Principal
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryEmailInModal(emailItem)}
                            className="text-[9px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline font-sans font-semibold cursor-pointer shrink-0"
                          >
                            Tornar Principal
                          </button>
                        )}
                      </div>

                      {editEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSecondaryEmailInModal(emailItem)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Remover este e-mail"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add another email field */}
              <div className="flex gap-2 pt-1">
                <input
                  type="email"
                  value={newSecondaryEmailInput}
                  onChange={(e) => setNewSecondaryEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSecondaryEmailInModal();
                    }
                  }}
                  placeholder="adicionar.outro.email@gmail.com"
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-[#070b13] text-slate-900 dark:text-white font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => handleAddSecondaryEmailInModal()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-bold cursor-pointer"
                >
                  <option value="CLA">Coordenador (CLA)</option>
                  <option value="SuperAdmin">Super Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Código de Coordenação
                </label>
                {editRole === "CLA" ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={editCoordCode}
                      onChange={(e) => setEditCoordCode(e.target.value)}
                      placeholder="Ex: 8520"
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold"
                    />
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                ) : (
                  <div className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-[#101726]/40 text-slate-400 text-[11px] select-none">
                    Não Aplicável
                  </div>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseEditUser}
                disabled={editSaving}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="btn-3d btn-3d-primary px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Helper to filter ONLY users added by SuperAdmin in menu 4 (Cadastrar CLA/Admin)
  const isSuperAdminAddedUser = (u: UserProfile) => {
    // If marked as created by CLA/ALA in access management, exclude
    if (u.createdByCla) return false;
    // If explicitly marked as created by SuperAdmin in menu 4
    if (u.createdBySuperAdmin) return true;
    // Known hardcoded SuperAdmins
    const emailLower = (u.email || "").toLowerCase().trim();
    if (emailLower === "lipewmra@gmail.com" || emailLower === "philippewagnermra@gmail.com") return true;
    // Exclude Collaborators and ALAs or subordinate accounts under a CLA
    if (u.role === "Colaborador" || u.role === "ALA" || (u.claId && u.role !== "CLA" && u.role !== "SuperAdmin")) {
      return false;
    }
    // CLA and SuperAdmin accounts
    return u.role === "SuperAdmin" || u.role === "CLA";
  };

  const handleAddAdditionalEmailInRegister = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const em = claNewAdditionalEmail.trim().toLowerCase();
    if (!em) return;
    if (!em.endsWith("@gmail.com")) {
      setClaError("O e-mail adicional deve ser obrigatoriamente do Gmail (@gmail.com).");
      return;
    }
    if (em === claEmail.trim().toLowerCase() || claAdditionalEmails.includes(em)) {
      setClaError("Este e-mail já foi adicionado.");
      return;
    }
    setClaAdditionalEmails(prev => [...prev, em]);
    setClaNewAdditionalEmail("");
    setClaError("");
  };

  const handleRemoveAdditionalEmailInRegister = (emToRemove: string) => {
    setClaAdditionalEmails(prev => prev.filter(e => e !== emToRemove));
  };

  const handleClaRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaError("");
    setClaSuccess("");

    if (!claName.trim()) {
      setClaError("Insira o nome completo.");
      return;
    }
    if (!claEmail.trim()) {
      setClaError("Insira o e-mail principal.");
      return;
    }
    if (!claEmail.toLowerCase().endsWith("@gmail.com")) {
      setClaError("O e-mail principal deve ser obrigatoriamente do Gmail (@gmail.com).");
      return;
    }

    const allCleanEmails = Array.from(new Set([
      claEmail.trim().toLowerCase(),
      ...claAdditionalEmails.map(em => em.trim().toLowerCase())
    ].filter(Boolean)));

    for (const em of allCleanEmails) {
      if (!em.endsWith("@gmail.com")) {
        setClaError(`O e-mail '${em}' não é um endereço válido do Gmail (@gmail.com).`);
        return;
      }
    }

    if (registerRole === "CLA") {
      if (!claCode.trim() || !/^\d+$/.test(claCode)) {
        setClaError("O código de coordenação deve conter apenas números.");
        return;
      }
    }

    setClaSubmitting(true);
    try {
      if (registerRole === "SuperAdmin") {
        await createPreRegisteredUser({
          name: claName.trim(),
          email: claEmail.trim().toLowerCase(),
          emails: allCleanEmails,
          role: "SuperAdmin",
          roles: ["SuperAdmin"],
          createdBySuperAdmin: true
        });
        setClaSuccess(`Super Administrador ${claName} cadastrado com sucesso com ${allCleanEmails.length} e-mail(s) vinculados!`);
      } else {
        const registeredUid = await createPreRegisteredUser({
          name: claName.trim(),
          email: claEmail.trim().toLowerCase(),
          emails: allCleanEmails,
          role: "CLA",
          roles: ["CLA"],
          coordinationCode: claCode.trim(),
          createdBySuperAdmin: true
        });

        if (registeredUid && preConfigureSchool) {
          const rCount = preRoomsCount || 0;
          const vCap = preVirtualCapacity || 30;
          const sCount = preSpecialRoomsCount || 0;
          const eCount = preExtraRoomsCount || 0;

          const defaultRooms = Array.from({ length: rCount }, (_, i) => ({
            number: `${101 + i}`,
            capacity: vCap,
            floor: i < 5 ? "Térreo" : "1º Andar",
          }));

          const defaultSpecial = Array.from({ length: sCount }, (_, i) => ({
            number: `ESP-${201 + i}`,
            capacity: 15,
            floor: "Térreo",
          }));

          const defaultExtra = Array.from({ length: eCount }, (_, i) => ({
            number: `EXT-${301 + i}`,
            capacity: vCap,
            floor: "Térreo",
          }));

          const draftBuilding: BuildingInfo = {
            id: registeredUid,
            claId: registeredUid,
            name: preSchoolName.trim() || `Escola de ${claName.trim()}`,
            address: preAddress.trim(),
            roomsCount: rCount,
            virtualCapacity: vCap,
            realCapacity: rCount * vCap,
            coordRoom: "Sala 101",
            specialRoomsCount: sCount,
            specialDetails: preSpecialDetails.trim(),
            extraRoomsCount: eCount,
            rooms: defaultRooms,
            specialRooms: defaultSpecial,
            extraRooms: defaultExtra
          };

          await saveBuilding(draftBuilding);
        }

        setClaSuccess(`Coordenador (CLA) ${claName} cadastrado com sucesso com ${allCleanEmails.length} e-mail(s) vinculados!`);
      }
      setClaName("");
      setClaEmail("");
      setClaAdditionalEmails([]);
      setClaNewAdditionalEmail("");
      setClaCode("");
      setPreConfigureSchool(false);
      setPreSchoolName("");
      setPreAddress("");
      setPreRoomsCount(10);
      setPreVirtualCapacity(30);
      setPreExtraRoomsCount(0);
      setPreSpecialRoomsCount(0);
      setPreSpecialDetails("");
      setTimeout(() => setClaSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setClaError("Erro ao registrar. Tente de novo.");
    } finally {
      setClaSubmitting(false);
    }
  };

  // Calculations for Admin Dashboard Stats
  const totalClasCount = users.filter(u => (u.roles || [u.role]).includes("CLA")).length;
  const totalAlasCount = users.filter(u => (u.roles || [u.role]).includes("ALA")).length;
  
  const clasNotAccessedCount = users.filter(u => {
    const roles = u.roles || [u.role];
    return roles.includes("CLA") && !u.hasAccessed;
  }).length;
  
  const totalCollabsCount = allCollaborators.length;
  const allocatedCollabsCount = allCollaborators.filter(c => c.assignedRoom && c.assignedRoom.trim() !== "").length;
  const confirmedCollabsCount = allCollaborators.filter(c => c.status === "Confirmado").length;
  
  const totalBuildingsCount = allBuildings.length;
  const totalRoomsCount = allBuildings.reduce((sum, b) => sum + (Number(b.roomsCount) || 0), 0);
  const totalCapacityConfigured = allBuildings.reduce((sum, b) => sum + (Number(b.realCapacity) || 0), 0);

  // Milestone activity counters
  let countVisitation = 0;
  let countAlaDefined = 0;
  let countTraining = 0;
  let countReceivedMaterial = 0;
  let countCheckedMaterial = 0;
  let countFilledOrion = 0;

  allClaActivities.forEach(act => {
    if (act.visitation?.checked) countVisitation++;
    if (act.alaDefined?.checked) countAlaDefined++;
    if (act.training?.checked) countTraining++;
    if (act.receivedMaterial?.checked) countReceivedMaterial++;
    if (act.checkedMaterial?.checked) countCheckedMaterial++;
    if (act.filledOrion?.checked) countFilledOrion++;
  });

  const totalPossibleChecks = (allClaActivities.length || totalClasCount || 1) * 6;
  const actualChecksCompleted = countVisitation + countAlaDefined + countTraining + countReceivedMaterial + countCheckedMaterial + countFilledOrion;
  const overallActivitiesProgressPct = totalPossibleChecks > 0 ? Math.round((actualChecksCompleted / totalPossibleChecks) * 100) : 0;

  // Render for "building" sub-tab (Early return to avoid token/nesting overhead)
  if (activeSubTab === "building") {
    if (selectedClaId) {
      const getSelectedBuildingWithFallback = (): BuildingInfo => {
        if (!selectedClaId) return { claId: "", name: "", address: "", roomsCount: 0, virtualCapacity: 30, realCapacity: 0, coordRoom: "", specialRoomsCount: 0, specialDetails: "", extraRoomsCount: 0 };
        const found = allBuildings.find(b => b.claId === selectedClaId);
        if (found) return found;
        const userProfile = users.find(u => u.uid === selectedClaId);
        return {
          id: selectedClaId,
          claId: selectedClaId,
          name: userProfile?.name ? `Local de ${userProfile.name}` : "",
          address: "",
          roomsCount: 10,
          virtualCapacity: 30,
          realCapacity: 300,
          coordRoom: "Sala 101",
          specialRoomsCount: 0,
          specialDetails: "",
          extraRoomsCount: 0,
        };
      };
      const activeB = getSelectedBuildingWithFallback();
      return (
        <div className="space-y-4 animate-fade-in font-sans">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedClaId(null)}
              className="px-4 py-2 text-xs font-black uppercase text-slate-500 bg-slate-150 hover:bg-slate-205 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700/85 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer flex items-center gap-1.5 transition"
            >
              ← Voltar para lista de prédios
            </button>
            <div className="text-right">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Coordenador Proprietário</span>
              <p className="text-xs font-bold text-emerald-500">{users.find(u => u.uid === selectedClaId)?.name || selectedClaId}</p>
            </div>
          </div>
          <BuildingConfigView
            initialBuilding={activeB}
            claId={selectedClaId}
            onSave={async (b) => {
              await saveBuilding(b);
            }}
            readOnly={false}
          />
        </div>
      );
    }

    const filteredUsers = users.filter(u => {
      const isClaObj = (u.roles || [u.role]).includes("CLA");
      if (!isClaObj) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const b = allBuildings.find(bld => bld.claId === u.uid);
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        b?.name?.toLowerCase().includes(q) ||
        b?.address?.toLowerCase().includes(q)
      );
    });

    return (
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/15 space-y-6 font-sans">
        <div>
          <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-2 pb-1 font-black">
            <Building className="w-4 h-4 text-emerald-500" />
            <span>Gerenciamento Central de Prédios e Escolas de Aplicação</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">Assegure a configuração correta de escolas de aplicação, capacidades reais, andares, escadas e instalações de acessibilidade para cada CLA do ENEM.</p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar por coordenador (CLA), e-mail ou escola de aplicação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-[#10b981]/40"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.length === 0 ? (
            <p className="text-xs text-slate-450 dark:text-slate-400 py-10 font-bold col-span-2 text-center">Nenhum Coordenador (CLA) correspondente ou cadastrado.</p>
          ) : (
            filteredUsers.map(cla => {
              const b = allBuildings.find(bld => bld.claId === cla.uid);
              return (
                <div key={cla.uid} className="p-4 border-2 border-slate-150 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-[#101726]/40 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2">
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400">Coordenador (CLA)</span>
                        <h3 className="text-xs font-extrabold text-[#111827] dark:text-white leading-relaxed">{cla.name}</h3>
                        <p className="text-[9px] text-slate-400 font-mono">{cla.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${cla.hasAccessed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                        {cla.hasAccessed ? "Acessou" : "Não Acessou"}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600 dark:text-slate-350">
                      <div>
                        <strong className="text-slate-400 font-bold">Escola:</strong>{" "}
                        <span className="font-extrabold text-slate-750 dark:text-slate-200">{b?.name || "📋 Não Configurada pelo SuperAdmin"}</span>
                      </div>
                      <div>
                        <strong className="text-slate-400 font-bold">Endereço:</strong>{" "}
                        <span className="text-[11px]">{b?.address || "Não informado"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                        <div className="text-center bg-slate-100 dark:bg-[#070b13]/60 p-1 rounded">
                          <span className="block text-[8px] uppercase font-black text-slate-400">Salas</span>
                          <span className="font-mono font-extrabold text-slate-800 dark:text-white">{b?.roomsCount || 0}</span>
                        </div>
                        <div className="text-center bg-slate-100 dark:bg-[#070b13]/60 p-1 rounded">
                          <span className="block text-[8px] uppercase font-black text-slate-400">Capacidade</span>
                          <span className="font-mono font-extrabold text-slate-800 dark:text-white">{b?.realCapacity || 0}</span>
                        </div>
                        <div className="text-center bg-slate-100 dark:bg-[#070b13]/60 p-1 rounded">
                          <span className="block text-[8px] uppercase font-black text-slate-400">Salas Ext.</span>
                          <span className="font-mono font-extrabold text-slate-800 dark:text-white">{b?.extraRoomsCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedClaId(cla.uid)}
                    className="w-full btn-3d btn-3d-primary py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase cursor-pointer"
                  >
                    Gerenciar e Configurar Escola
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Early Return for "dashboard" sub-tab (to avoid token/nesting overhead)
  if (activeSubTab === "dashboard") {
    return (
      <div className="space-y-6 animate-fade-in font-sans" id="super-admin-root-dashboard">
        
        {/* HEADER BAR */}
        <div className="p-6 bg-[#0c1220]/90 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#1e293b] shadow-[6px_6px_0px_0px_#10b981]/25">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-display font-black tracking-wider flex items-center gap-2">
                <span>Painel do Super Administrador (Cebraspe Central)</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Configure diretrizes unificadas do ENEM, escopos de exames e perfis de acessibilidade.</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 border-2 border-emerald-500/25 rounded-xl font-black uppercase tracking-widest font-mono select-none self-start md:self-center">
            ⚡ ACESSO TOTAL
          </div>
        </div>

        {/* DASHBOARD DE MONITORAMENTO OPERACIONAL (STATISTICS) */}
        <div className="bg-white dark:bg-[#0c1220]/90 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/15">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h2 className="text-xs font-display font-black text-slate-700 dark:text-slate-350 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>Painel de Estatísticas e Indicadores Operacionais</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold">Atualização em tempo real de alocações, capacidades e metas das equipes regionais.</p>
            </div>
            <div className="text-[10px] bg-slate-100 dark:bg-slate-800 font-mono font-bold px-2 rounded-lg py-1 border dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
              {allClaActivities.length} CLAs Respondendo
            </div>
          </div>

          {/* 4 MAIN STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Coordenadores */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-450 border border-emerald-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Coordenação (CLA/ALA)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-black text-slate-855 dark:text-white">{totalClasCount}</span>
                  <span className="text-[10px] font-bold text-slate-400">CLAs / {totalAlasCount} ALAs</span>
                </div>
                {clasNotAccessedCount > 0 ? (
                  <div className="text-[9px] text-amber-500 font-extrabold mt-1 flex items-center gap-1 bg-amber-500/10 px-1 py-0.5 rounded">
                    ⚠️ <span>{clasNotAccessedCount} sem 1º acesso</span>
                  </div>
                ) : (
                  <div className="text-[9px] text-emerald-500 font-extrabold mt-1 flex items-center gap-1 bg-emerald-500/10 px-1 py-0.5 rounded">
                    ✅ <span>Todos acessaram</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Alocações */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Alocações de Fiscais</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-black text-slate-855 dark:text-white">{totalCollabsCount}</span>
                  <span className="text-[10px] font-bold text-slate-400">({allocatedCollabsCount} alocados • {confirmedCollabsCount} conf.)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Capacidade Física */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Capacidade de Locais</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-black text-slate-855 dark:text-white">{totalCapacityConfigured.toLocaleString("pt-BR")}</span>
                  <span className="text-[10px] font-bold text-slate-400">vagas em {totalBuildingsCount} locais</span>
                </div>
              </div>
            </div>

            {/* Card 4: Tarefas Concluídas */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Progresso de Atividades</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-mono font-black text-slate-855 dark:text-white">{overallActivitiesProgressPct}%</span>
                  <span className="text-[10px] font-bold text-slate-400">({actualChecksCompleted}/{totalPossibleChecks} tarefas)</span>
                </div>
              </div>
            </div>

          </div>

          {/* DETAILED STATS OF INDIVIDUAL TASK COMPLETION PROGRESS */}
          <div className="mt-5 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-950/5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450">Progresso dos Marcos Críticos do ENEM</span>
              <div className="flex items-center gap-3 font-mono text-[9px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Concluído</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800"></span> Pendente</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* 1. Visitação */}
              <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="block text-[9px] uppercase font-black text-slate-400">1. Visitação</span>
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                  <span>{countVisitation} de {totalClasCount || 1}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countVisitation / totalClasCount) * 100) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalClasCount > 0 ? (countVisitation / totalClasCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 2. Indicação de ALA */}
              <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="block text-[9px] uppercase font-black text-slate-400">2. Escolha de ALA</span>
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                  <span>{countAlaDefined} de {totalClasCount || 1}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countAlaDefined / totalClasCount) * 100) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalClasCount > 0 ? (countAlaDefined / totalClasCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 3. Treinamento */}
              <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="block text-[9px] uppercase font-black text-slate-400">3. Treinamento</span>
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                  <span>{countTraining} de {totalClasCount || 1}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countTraining / totalClasCount) * 100) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalClasCount > 0 ? (countTraining / totalClasCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 4. Recebimento Malote */}
              <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="block text-[9px] uppercase font-black text-slate-400">4. Rec. Malote</span>
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                  <span>{countReceivedMaterial} de {totalClasCount || 1}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countReceivedMaterial / totalClasCount) * 100) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalClasCount > 0 ? (countReceivedMaterial / totalClasCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 5. Conferência Material */}
              <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="block text-[9px] uppercase font-black text-slate-400">5. Conf. Malote</span>
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                  <span>{countCheckedMaterial} de {totalClasCount || 1}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countCheckedMaterial / totalClasCount) * 100) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalClasCount > 0 ? (countCheckedMaterial / totalClasCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 6. Orion Preenchido */}
              <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="block text-[9px] uppercase font-black text-slate-400">6. Integrar Orion</span>
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                  <span>{countFilledOrion} de {totalClasCount || 1}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countFilledOrion / totalClasCount) * 100) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalClasCount > 0 ? (countFilledOrion / totalClasCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    );
  }

  // Handle forms tabs
  if (activeSubTab === "directives") {
    return (
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 max-w-3xl mx-auto space-y-6 font-sans">
        <div>
          <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-2 pb-1 font-black">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <span>Configurações Gerais do Evento</span>
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold leading-relaxed">Defina parâmetros unificados como data, ano de aplicação, instruções gerais de portões e a lista inicial de tarefas que cada CLA receberá.</p>
        </div>

        {configSuccess && (
          <div className="p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Diretivas nacionais propagadas com sucesso para todos os CLAs!</span>
          </div>
        )}

        <form onSubmit={handleSaveConfigSubmit} className="space-y-4 text-sm font-semibold">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1">Ano de Aplicação</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-[#10b981]/40"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1">Data de Alinhamento</label>
              <input
                type="text"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
                placeholder="07/11/2026"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1">Dia 1 de Provas (Humanas)</label>
              <input
                type="text"
                value={examDate1}
                onChange={(e) => setExamDate1(e.target.value)}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1">Dia 2 de Provas (Exatas)</label>
              <input
                type="text"
                value={examDate2}
                onChange={(e) => setExamDate2(e.target.value)}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1 font-extrabold">Diretivas Oficiais Cebraspe / INEP</label>
            <textarea
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
              rows={4}
              className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-850 dark:text-white text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-450 mb-1 font-extrabold">Checklist Obrigatório para Lote CLA (divididos por ';')</label>
            <textarea
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              rows={3}
              placeholder="Ex tarefas: Arrumar salas;Confirmar lanche"
              className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-850 dark:text-white text-xs font-mono font-bold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-3d btn-3d-primary rounded-xl w-full py-3 flex items-center justify-center gap-1.5 font-black text-xs shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "CONFIGURANDO SERVIDOR..." : "PROPAGAR DIRETIVAS DE EVENTO"}</span>
          </button>
        </form>
      </div>
    );
  }

  if (activeSubTab === "profiles") {
    const superAdminUsers = users.filter(isSuperAdminAddedUser);
    const filteredUsers = superAdminUsers.filter(u => {
      if (!profileSearch.trim()) return true;
      const term = profileSearch.toLowerCase().trim();
      const allUserEmails = [u.email, ...(u.emails || [])].map(e => (e || "").toLowerCase());
      const hasEmailMatch = allUserEmails.some(e => e.includes(term));
      return (
        (u.name || "").toLowerCase().includes(term) ||
        hasEmailMatch ||
        (u.coordinationCode || "").toLowerCase().includes(term) ||
        (u.role || "").toLowerCase().includes(term)
      );
    });

    return (
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/15 max-w-4xl mx-auto space-y-6 font-sans">
        {renderEditUserModal()}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-1 pb-0.5 font-black">
              <Users className="w-5 h-5 text-emerald-500" />
              <span>Gestão de Perfis (Cadastro Central)</span>
            </h2>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Exibindo apenas usuários vinculados diretamente pelo Super Administrador no Menu 4 (CLAs e SuperAdmins). Clique em qualquer usuário para gerenciar nome, múltiplos e-mails e coordenação.
            </p>
          </div>
          <div className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>{superAdminUsers.length} cadastrados</span>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            value={profileSearch}
            onChange={(e) => setProfileSearch(e.target.value)}
            placeholder="Buscar por nome, e-mails vinculados do Gmail ou código de coordenação..."
            className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#101726]/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500/40"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          {profileSearch && (
            <button
              type="button"
              onClick={() => setProfileSearch("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-3 bg-emerald-500/[0.05] dark:bg-[#070b13]/65 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-emerald-500/15 dark:border-slate-800 flex items-center gap-3 text-xs font-bold leading-relaxed">
          <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>
            Clique no botão <strong>"Editar Dados"</strong> ou no cartão do usuário para renomear, corrigir ou <strong>adicionar múltiplos e-mails do Gmail</strong> para acesso.
          </span>
        </div>

        <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-[#101726]/20">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {profileSearch ? "Nenhum usuário encontrado para a busca." : "Nenhum perfil de CLA ou SuperAdmin cadastrado pelo Super Admin ainda."}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Utilize a aba "4. Cadastro CLA/Admin" para adicionar novos coordenadores locais ou administradores.
              </p>
            </div>
          ) : (
            filteredUsers.map((profile) => {
              const currentRoles = profile.roles || [profile.role];
              const allAvailableRoles: UserRole[] = ["SuperAdmin", "CLA"];
              const allEmails = Array.from(new Set([
                profile.email,
                ...(profile.emails || [])
              ].filter(Boolean)));

              return (
                <div
                  key={profile.uid}
                  className="p-4 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#101726]/40 hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 group flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div
                    onClick={() => handleOpenEditUser(profile)}
                    className="min-w-0 flex-1 cursor-pointer flex items-start gap-3"
                    title="Clique para editar este usuário e gerenciar e-mails"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-display font-black flex items-center justify-center text-xs shrink-0 shadow-xs group-hover:scale-105 transition">
                      {profile.name?.charAt(0).toUpperCase() || "U"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-[#111827] dark:text-white truncate text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {profile.name}
                        </span>
                        {profile.coordinationCode && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-black text-[10px] border border-slate-300 dark:border-slate-700">
                            Coord: {profile.coordinationCode}
                          </span>
                        )}
                        {profile.hasAccessed ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono font-extrabold text-[9px] border border-emerald-500/20">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-extrabold text-[9px] border border-amber-500/20">
                            Pendente Acesso
                          </span>
                        )}
                        {allEmails.length > 1 && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono font-extrabold text-[9px] border border-indigo-500/20">
                            {allEmails.length} e-mails vinculados
                          </span>
                        )}
                      </div>

                      {/* Emails tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 mb-2">
                        {allEmails.map((em, idx) => {
                          const isPrimary = em.toLowerCase() === (profile.email || "").toLowerCase();
                          return (
                            <span
                              key={em}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                                isPrimary
                                  ? "bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-slate-300 dark:border-slate-700"
                                  : "bg-white/90 dark:bg-[#070b13] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{em}</span>
                              {isPrimary && (
                                <span className="text-[8px] bg-emerald-600 text-white px-1 rounded uppercase font-extrabold">
                                  Principal
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[9px] uppercase font-extrabold text-slate-450 dark:text-slate-500 mr-1">Perfis:</span>
                        {allAvailableRoles.map((roleOpt) => {
                          const hasRole = currentRoles.includes(roleOpt);
                          return (
                            <button
                              key={roleOpt}
                              type="button"
                              onClick={() => handleRoleToggle(profile, roleOpt)}
                              className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono font-extrabold transition border cursor-pointer ${
                                hasRole
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/40"
                                  : "bg-slate-100 dark:bg-[#070b13] text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                              }`}
                            >
                              {roleOpt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <div className="flex flex-col items-start md:items-end gap-1">
                      <span className="text-[9px] uppercase font-extrabold text-[#475569] dark:text-slate-400">Ativo / Principal:</span>
                      <select
                        value={profile.role}
                        onChange={(e) => handlePrimaryRoleChange(profile, e.target.value as UserRole)}
                        className="bg-white dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-extrabold text-slate-705 dark:text-white cursor-pointer focus:outline-hidden"
                      >
                        {currentRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditUser(profile)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
                      title="Editar nome e gerenciar múltiplos e-mails"
                    >
                      <Pencil className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="hidden sm:inline">Editar Dados</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (activeSubTab === "register") {
    return (
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 max-w-4xl mx-auto space-y-6 font-sans">
        <div>
          <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-2 pb-1 font-black">
            <PlusCircle className="w-5 h-5 text-emerald-500" />
            <span>Cadastrar Novo Coordenador (CLA) ou Super Administrador</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Adicione antecipadamente e-mails autorizados para vincular permissões de acesso, suporte a múltiplos e-mails e definir sua escola de aplicação.
          </p>
        </div>

        <form onSubmit={handleClaRegisterSubmit} className="space-y-4">
          {claSuccess && (
            <div className="p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20">
              {claSuccess}
            </div>
          )}
          {claError && (
            <div className="p-3 bg-rose-500/10 text-rose-800 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20">
              {claError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-semibold">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Perfil de Acesso</label>
              <select
                value={registerRole}
                onChange={(e) => setRegisterRole(e.target.value as "CLA" | "SuperAdmin")}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="CLA">Coordenador (CLA)</option>
                <option value="SuperAdmin">Super Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: Dr. Carlos Silva"
                value={claName}
                onChange={(e) => setClaName(e.target.value)}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">E-mail Principal (Gmail)</label>
              <input
                type="email"
                placeholder="principal@gmail.com"
                value={claEmail}
                onChange={(e) => setClaEmail(e.target.value)}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Código de Coordenação (Numérico)</label>
              {registerRole === "CLA" ? (
                <input
                  type="text"
                  placeholder="Ex: 8520"
                  value={claCode}
                  onChange={(e) => setClaCode(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono"
                  required
                />
              ) : (
                <div className="w-full border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-[#101726]/40 text-slate-400 dark:text-slate-500 font-mono text-[11px] leading-relaxed select-none">
                  Não Aplicável para SuperAdmin
                </div>
              )}
            </div>
          </div>

          {/* Multiple Additional Emails Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#101726]/50 rounded-xl border-2 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-300">
                E-mails Adicionais / Secundários (Opcional)
              </label>
              <span className="text-[10px] text-slate-500 font-mono font-bold">
                {claAdditionalEmails.length} adicional(is)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Você pode cadastrar e-mails secundários do Gmail para este coordenador ou administrador acessar o sistema com mais de uma conta.
            </p>

            {/* List of additional emails */}
            {claAdditionalEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {claAdditionalEmails.map((em) => (
                  <div
                    key={em}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{em}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalEmailInRegister(em)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition"
                      title="Remover e-mail"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input to add email */}
            <div className="flex gap-2 pt-1">
              <input
                type="email"
                value={claNewAdditionalEmail}
                onChange={(e) => setClaNewAdditionalEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAdditionalEmailInRegister();
                  }
                }}
                placeholder="outro.email.secundario@gmail.com"
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-[#070b13] text-slate-900 dark:text-white font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => handleAddAdditionalEmailInRegister()}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Adicionar E-mail</span>
              </button>
            </div>
          </div>

          {registerRole === "CLA" && (
            <div className="p-4 bg-slate-50 dark:bg-[#101726]/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <label className="inline-flex items-center gap-2 cursor-pointer font-extrabold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-350 select-none">
                <input
                  type="checkbox"
                  checked={preConfigureSchool}
                  onChange={(e) => setPreConfigureSchool(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Pré-configurar Prédio / Escola de Aplicação para este CLA</span>
              </label>

              {preConfigureSchool && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Nome da Escola de Aplicação *</label>
                    <input
                      type="text"
                      placeholder="Ex: Colégio Estadual Dom Pedro II"
                      value={preSchoolName}
                      onChange={(e) => setPreSchoolName(e.target.value)}
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                      required={preConfigureSchool}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Endereço Completo</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores, 450 - Centro"
                      value={preAddress}
                      onChange={(e) => setPreAddress(e.target.value)}
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Quantidade de Salas *</label>
                      <input
                        type="number"
                        value={preRoomsCount}
                        onChange={(e) => setPreRoomsCount(Math.max(1, Number(e.target.value)))}
                        className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold"
                        required={preConfigureSchool}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Capacidade por Sala *</label>
                      <input
                        type="number"
                        value={preVirtualCapacity}
                        onChange={(e) => setPreVirtualCapacity(Math.max(1, Number(e.target.value)))}
                        className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold"
                        required={preConfigureSchool}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Qtd Salas Extras</label>
                      <input
                        type="number"
                        value={preExtraRoomsCount}
                        onChange={(e) => setPreExtraRoomsCount(Number(e.target.value))}
                        className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Qtd Salas Acessíveis (Especiais)</label>
                      <input
                        type="number"
                        value={preSpecialRoomsCount}
                        onChange={(e) => setPreSpecialRoomsCount(Number(e.target.value))}
                        className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Detalhamento para Acessibilidade e Atendimento</label>
                    <input
                      type="text"
                      placeholder="Ex: Cadeirantes e rampa de acesso na entrada leste, intérprete na sala 3"
                      value={preSpecialDetails}
                      onChange={(e) => setPreSpecialDetails(e.target.value)}
                      className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={claSubmitting}
            className="btn-3d btn-3d-primary rounded-xl px-6 py-3 flex items-center justify-center gap-1.5 font-black text-xs shadow-md cursor-pointer ml-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{claSubmitting ? "CADASTRANDO..." : registerRole === "SuperAdmin" ? "CADASTRAR SUPER ADMINISTRADOR" : "CADASTRAR E CONFIGURAR CLA"}</span>
          </button>
        </form>
      </div>
    );
  }

  // Fallback monolithic rendering if no subtab matches (keeps original tail intact)
  return (
    <div className="space-y-6 animate-fade-in" id="super-admin-root-dashboard">
      {renderEditUserModal()}
      
      {/* HEADER BAR */}
      <div className="p-6 bg-[#0c1220]/90 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#1e293b] shadow-[6px_6px_0px_0px_#10b981]/25">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-display font-black tracking-wider flex items-center gap-2">
              <span>Painel do Super Administrador (Cebraspe Central)</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Configure diretrizes unificadas do ENEM, escopos de exames e perfis de acessibilidade.</p>
          </div>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 border-2 border-emerald-500/25 rounded-xl font-black uppercase tracking-widest font-mono select-none self-start md:self-center">
          ⚡ ACESSO TOTAL
        </div>
      </div>

      {/* DASHBOARD DE MONITORAMENTO OPERACIONAL (STATISTICS) */}
      <div className="bg-white dark:bg-[#0c1220]/90 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/15">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div>
            <h2 className="text-xs font-display font-black text-slate-700 dark:text-slate-350 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Painel de Estatísticas e Indicadores Operacionais</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold">Atualização em tempo real de alocações, capacidades e metas das equipes regionais.</p>
          </div>
          <div className="text-[10px] bg-slate-100 dark:bg-slate-800 font-mono font-bold px-2 rounded-lg py-1 border dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
            {allClaActivities.length} CLAs Respondendo
          </div>
        </div>

        {/* 4 MAIN STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Coordenadores */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-450 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Coordenação (CLA/ALA)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-black text-slate-850 dark:text-white">{totalClasCount}</span>
                <span className="text-[10px] font-bold text-slate-400">CLAs / {totalAlasCount} ALAs</span>
              </div>
              {clasNotAccessedCount > 0 ? (
                <div className="text-[9px] text-amber-500 font-extrabold mt-1 flex items-center gap-1 bg-amber-500/10 px-1 py-0.5 rounded">
                  ⚠️ <span>{clasNotAccessedCount} sem 1º acesso</span>
                </div>
              ) : (
                <div className="text-[9px] text-emerald-500 font-extrabold mt-1 flex items-center gap-1 bg-emerald-500/10 px-1 py-0.5 rounded">
                  ✅ <span>Todos acessaram</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Alocações */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Alocações de Fiscais</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-black text-slate-850 dark:text-white">{totalCollabsCount}</span>
                <span className="text-[10px] font-bold text-slate-400">({allocatedCollabsCount} alocados • {confirmedCollabsCount} conf.)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Capacidade Física */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Capacidade de Locais</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-black text-slate-850 dark:text-white">{totalCapacityConfigured.toLocaleString("pt-BR")}</span>
                <span className="text-[10px] font-bold text-slate-400">vagas em {totalBuildingsCount} locais</span>
              </div>
            </div>
          </div>

          {/* Card 4: Tarefas Concluídas */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Progresso de Atividades</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-mono font-black text-slate-855 dark:text-white">{overallActivitiesProgressPct}%</span>
                <span className="text-[10px] font-bold text-slate-400">({actualChecksCompleted}/{totalPossibleChecks} tarefas)</span>
              </div>
            </div>
          </div>

        </div>

        {/* DETAILED STATS OF INDIVIDUAL TASK COMPLETION PROGRESS */}
        <div className="mt-5 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-950/5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450">Progresso dos Marcos Críticos do ENEM</span>
            <div className="flex items-center gap-3 font-mono text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Concluído</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800"></span> Pendente</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1. Visitação */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">1. Visitação</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countVisitation} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countVisitation / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countVisitation / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 2. Indicação de ALA */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">2. Escolha de ALA</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countAlaDefined} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countAlaDefined / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countAlaDefined / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 3. Treinamento */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">3. Treinamento</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countTraining} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countTraining / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countTraining / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 4. Recebimento Malote */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">4. Rec. Malote</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countReceivedMaterial} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countReceivedMaterial / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countReceivedMaterial / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 5. Conferência Material */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">5. Conf. Malote</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countCheckedMaterial} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countCheckedMaterial / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countCheckedMaterial / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 6. Orion Preenchido */}
            <div className="space-y-1 bg-white dark:bg-[#0c1220]/75 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-black text-slate-400">6. Integrar Orion</span>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                <span>{countFilledOrion} de {totalClasCount || 1}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClasCount > 0 ? Math.round((countFilledOrion / totalClasCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalClasCount > 0 ? (countFilledOrion / totalClasCount) * 100 : 0}%` }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PARTE 1: EVENT METADATA CONFIG */}
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20">
          <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-4 pb-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Configurações Gerais do Evento</span>
          </h2>

          {configSuccess && (
            <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-bounce">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Diretivas nacionais propagadas com sucesso para todos os CLAs!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfigSubmit} className="space-y-4 text-sm font-semibold">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Ano de Aplicação</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Data de Alinhamento</label>
                <input
                  type="text"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  placeholder="07/11/2026"
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Dia 1 de Provas (Humanas)</label>
                <input
                  type="text"
                  value={examDate1}
                  onChange={(e) => setExamDate1(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Dia 2 de Provas (Exatas)</label>
                <input
                  type="text"
                  value={examDate2}
                  onChange={(e) => setExamDate2(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#10b981]/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Diretivas Oficiais Cebraspe / INEP</label>
              <textarea
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                rows={2}
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-800 dark:text-white text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Checklist Obrigatório para Lote CLA (divididos por ';')</label>
              <textarea
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
                rows={3}
                placeholder="Ex tarefas: Arrumar salas;Confirmar lanche"
                className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-800 dark:text-white text-xs font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-primary rounded-xl w-full py-3 flex items-center justify-center gap-1.5 font-black text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "CONFIGURANDO SERVIDOR..." : "PROPORGACIONAR DIRETIVAS DE EVENTO"}</span>
            </button>
          </form>
        </div>

        {/* PARTE 2: USER PROFILE CONFIGURE */}
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-150 dark:border-slate-800">
              <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Controle de Perfis Multi-Usuários</span>
              </h2>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                {users.filter(isSuperAdminAddedUser).length} cadastrados
              </span>
            </div>

            <div className="p-3 bg-indigo-500/[0.04] dark:bg-[#070b13]/65 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-indigo-500/10 dark:border-slate-800 flex items-center gap-3 mb-4 text-xs font-bold leading-relaxed">
              <AlertCircle className="w-5 h-5 text-[#10b981] shrink-0" />
              <span>Exibindo apenas usuários vinculados no Menu 4 pelo Super Admin. Clique no usuário ou no botão "Editar Dados" para renomear ou trocar o e-mail.</span>
            </div>

            <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {users.filter(isSuperAdminAddedUser).length === 0 ? (
                <p className="text-xs text-slate-450 dark:text-slate-400 text-center py-10 font-bold">Nenhum perfil de CLA ou SuperAdmin registrado pelo Super Admin ainda.</p>
              ) : (
                users.filter(isSuperAdminAddedUser).map((profile) => {
                  const currentRoles = profile.roles || [profile.role];
                  const allAvailableRoles: UserRole[] = ["SuperAdmin", "CLA"];

                  return (
                    <div
                      key={profile.uid}
                      className="p-3.5 border-2 border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#101726]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-[#10b981]/30 transition"
                    >
                      <div 
                        onClick={() => handleOpenEditUser(profile)}
                        className="min-w-0 flex-1 cursor-pointer group"
                        title="Clique para editar este usuário"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#111827] dark:text-white block truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">{profile.name}</span>
                          {profile.coordinationCode && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold">
                              Coord: {profile.coordinationCode}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono font-bold truncate mb-2">{profile.email}</span>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[9px] uppercase font-extrabold text-slate-450 dark:text-slate-500 mr-1">Perfis:</span>
                          {allAvailableRoles.map((roleOpt) => {
                            const hasRole = currentRoles.includes(roleOpt);
                            return (
                              <button
                                key={roleOpt}
                                type="button"
                                onClick={() => handleRoleToggle(profile, roleOpt)}
                                className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold transition border cursor-pointer ${
                                  hasRole
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/40"
                                    : "bg-slate-100 dark:bg-[#070b13] text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                                }`}
                              >
                                {roleOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                          <span className="text-[9px] uppercase font-extrabold text-[#475569] dark:text-slate-400">Ativo / Principal:</span>
                          <select
                            value={profile.role}
                            onChange={(e) => handlePrimaryRoleChange(profile, e.target.value as UserRole)}
                            className="bg-white dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-extrabold text-slate-705 dark:text-white cursor-pointer focus:outline-hidden"
                          >
                            {currentRoles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(profile)}
                          className="p-2 rounded-lg bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 hover:border-emerald-500/40 transition cursor-pointer"
                          title="Editar Nome e E-mail"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t-2 border-slate-100 dark:border-slate-800 text-[10px] text-slate-450 dark:text-slate-500 font-mono font-bold flex items-center justify-between">
            <span>CALANGUS INTEGRATOR ENGINE</span>
            <span>v2.4 - ONLINE</span>
          </div>
        </div>

        {/* PARTE 3: REGISTRO DE NOVO CLA OU SUPERADMIN */}
        <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 lg:col-span-2">
          <h2 className="text-sm font-display font-black text-slate-855 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-4 pb-2">
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Cadastrar Novo Coordenador (CLA) ou Super Administrador</span>
          </h2>

          <form onSubmit={handleClaRegisterSubmit} className="space-y-4">
            {claSuccess && (
              <div className="p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20">
                {claSuccess}
              </div>
            )}
            {claError && (
              <div className="p-3 bg-rose-500/10 text-rose-800 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20">
                {claError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Perfil de Acesso</label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as "CLA" | "SuperAdmin")}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="CLA">Coordenador (CLA)</option>
                  <option value="SuperAdmin">Super Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Dr. Carlos Silva"
                  value={claName}
                  onChange={(e) => setClaName(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">E-mail do Gmail</label>
                <input
                  type="email"
                  placeholder="nome@gmail.com"
                  value={claEmail}
                  onChange={(e) => setClaEmail(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Código de Coordenação (Numérico)</label>
                {registerRole === "CLA" ? (
                  <input
                    type="text"
                    placeholder="Ex: 8520"
                    value={claCode}
                    onChange={(e) => setClaCode(e.target.value)}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-900 dark:text-white font-mono"
                    required
                  />
                ) : (
                  <div className="w-full border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-[#101726]/40 text-slate-400 dark:text-slate-500 font-mono text-[11px] leading-relaxed select-none">
                    Não Aplicável para SuperAdmin
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={claSubmitting}
              className="btn-3d btn-3d-primary rounded-xl px-6 py-3 flex items-center justify-center gap-1.5 font-black text-xs shadow-md cursor-pointer ml-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{claSubmitting ? "CADASTRANDO..." : registerRole === "SuperAdmin" ? "CADASTRAR SUPER ADMINISTRADOR" : "CADASTRAR NOVO CLA"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
