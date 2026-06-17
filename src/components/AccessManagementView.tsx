import React, { useState } from "react";
import { UserProfile, UserRole } from "../types";
import { createPreRegisteredUser, addCollaborator, saveUserProfile } from "../lib/db-services";
import { Users, UserPlus, ShieldAlert, Mail, PlusCircle, CheckCircle, AlertCircle } from "lucide-react";

interface AccessManagementViewProps {
  currentUser: UserProfile;
  colegas: UserProfile[];
  activeClaId: string;
  readOnly?: boolean;
}

export default function AccessManagementView({ currentUser, colegas, activeClaId, readOnly = false }: AccessManagementViewProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ALA" | "Colaborador">("Colaborador");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ALA is restricted to registering Colaborador only
  const allowedRole = currentUser.role === "ALA" ? "Colaborador" : role;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Por favor, digite o nome completo.");
      return;
    }
    if (!email.trim() || !email.toLowerCase().endsWith("@gmail.com")) {
      setErrorMsg("Por favor, informe um endereço do Gmail (@gmail.com) válido.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create User account profile
      const newTeammate: Omit<UserProfile, "uid"> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: allowedRole,
        claId: activeClaId,
        coordinationCode: currentUser.coordinationCode || ""
      };

      await createPreRegisteredUser(newTeammate);

      // 2. If registering a Colaborador, also register inside the collaborators collection
      if (allowedRole === "Colaborador") {
        await addCollaborator({
          claId: activeClaId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          status: "Pendente",
          isReserve: true,
          cpf: "",
          birthDate: "",
          whatsapp: "",
          education: "Ensino Superior Completo",
          disability: "Nenhuma",
          hasWorkedEnem: false,
          pastEditions: [],
          pixKey: "",
          specialRole: "Nenhuma",
          languages: [],
          orionStatus: "Ok",
          orionErrors: [],
          orionSynced: true
        });
      }

      setSuccessMsg(`Cadastro de ${name} (${allowedRole}) concluído com sucesso!`);
      setName("");
      setEmail("");
      setRole("Colaborador");
    } catch (err) {
      console.error(err);
      setErrorMsg("Houve um problema ao realizar o cadastro. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="access-management-container">
      {/* Description header */}
      <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/20">
        <h2 className="text-sm font-display font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-emerald-500 flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-emerald-500" />
          <span>Controle de Acessos e Equipe</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
          {currentUser.role === "CLA" 
            ? "Como Coordenador (CLA), você pode registrar seus Assistentes Locais (ALA) e Fiscais de Apoio (Colaboradores). "
            : readOnly 
            ? "Como Assistente (ALA), você possui permissão de apenas visualização para este menu de equipe." 
            : "Como Assistente (ALA), você possui permissão para cadastrar Fiscais de Apoio (Colaboradores). "}
          Todos os cadastrados devem efetuar login via Gmail com o endereço de e-mail registrado abaixo para receber liberação automática.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Registration Form */}
        {!readOnly && (
          <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/15 md:col-span-1">
            <h3 className="text-xs font-display font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              <span>Cadastrar Membro</span>
            </h3>

            <form onSubmit={handleRegister} className="space-y-4 text-xs font-semibold">
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold rounded-xl border border-emerald-500/20">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 text-rose-800 dark:text-rose-400 font-bold rounded-xl border border-rose-500/20">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">E-mail (Gmail Obrigatório)</label>
                <input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-800 dark:text-white"
                  required
                />
              </div>

              {currentUser.role === "CLA" && (
                <div>
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Função / Perfil</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726]/80 text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="ALA">ALA (Assistente)</option>
                    <option value="Colaborador">Colaborador (Fiscal)</option>
                  </select>
                </div>
              )}

              {currentUser.role === "ALA" && (
                <div>
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Função / Perfil</label>
                  <div className="w-full border-2 border-dashed border-indigo-500/30 rounded-xl px-3 py-2 bg-indigo-500/5 text-indigo-400 font-mono font-bold text-center">
                    COLABORADOR (FISCAL)
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-3d btn-3d-primary py-3 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs cursor-pointer shadow-md text-white border-b-4 border-emerald-800"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{loading ? "CADASTRANDO..." : "CADASTRAR"}</span>
              </button>
            </form>
          </div>
        )}

        {/* Access List */}
        <div className={`bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#cbd5e1] dark:shadow-[6px_6px_0px_0px_#10b981]/15 ${readOnly ? "md:col-span-3" : "md:col-span-2"}`}>
          <h3 className="text-xs font-display font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Membros e Usuários Cadastrados</span>
          </h3>

          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {colegas.length === 0 ? (
              <div className="text-slate-450 text-center py-10 font-bold flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-400">Nenhum membro da equipe cadastrado para esta coordenação de local.</span>
              </div>
            ) : (
              colegas.map((member) => {
                const isPreRegistered = member.uid.startsWith("pre_");
                return (
                  <div
                    key={member.uid}
                    className="p-3.5 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#101726]/40 flex items-center justify-between text-xs font-semibold"
                  >
                    <div>
                      <span className="font-extrabold text-[#111827] dark:text-white block">{member.name}</span>
                      <span className="text-[10px] text-slate-450 block font-mono font-bold truncate">{member.email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPreRegistered ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-mono font-black border bg-amber-500/10 border-amber-500/40 text-amber-500`}>
                          Aguardando Cadastro
                        </span>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-mono font-black border bg-emerald-500/10 border-emerald-500/40 text-emerald-500`}>
                          Ativo e Conectado
                        </span>
                      )}
                      
                      {currentUser.role === "CLA" && member.uid !== currentUser.uid ? (
                        <select
                          value={member.role}
                          onChange={async (e) => {
                            const newRole = e.target.value as "ALA" | "Colaborador";
                            const updatedMember: UserProfile = {
                              ...member,
                              role: newRole,
                              roles: member.roles?.includes("SuperAdmin") 
                                ? (["SuperAdmin", newRole] as UserRole[]) 
                                : ([newRole] as UserRole[])
                            };
                            await saveUserProfile(updatedMember);
                          }}
                          className="px-2 py-0.5 text-[9px] font-extrabold rounded-lg border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101726]/80 text-[#475569] dark:text-emerald-450 uppercase cursor-pointer focus:outline-hidden"
                        >
                          <option value="Colaborador">Colaborador</option>
                          <option value="ALA">ALA</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#101726] border-2 border-slate-200 dark:border-slate-800 font-extrabold text-[9px] text-[#475569] dark:text-emerald-450 uppercase">
                          {member.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
