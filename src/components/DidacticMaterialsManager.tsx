import React, { useState, useEffect } from "react";
import { DidacticMaterial } from "../types";
import { 
  subscribeToDidacticMaterials, 
  saveDidacticMaterial, 
  deleteDidacticMaterial 
} from "../lib/db-services";
import { ENEM_ROLES } from "./CollaboratorManager";
import { 
  BookOpen, Plus, Trash2, Pencil, ExternalLink, Link2, 
  CheckCircle, AlertCircle, HelpCircle, Users, FileText, 
  Check, X, Sparkles, Layers, ShieldCheck, Search
} from "lucide-react";

interface DidacticMaterialsManagerProps {
  currentUserName?: string;
}

export default function DidacticMaterialsManager({ currentUserName }: DidacticMaterialsManagerProps) {
  const [materials, setMaterials] = useState<DidacticMaterial[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [accessUrl, setAccessUrl] = useState("");
  const [instructionText, setInstructionText] = useState("");
  const [allRolesSelected, setAllRolesSelected] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = subscribeToDidacticMaterials((list) => {
      setMaterials(list);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle("");
    setAccessUrl("");
    setInstructionText("");
    setAllRolesSelected(true);
    setSelectedRoles([]);
    setEditingId(null);
    setFormError("");
    setIsAdding(false);
  };

  const handleStartEdit = (mat: DidacticMaterial) => {
    setTitle(mat.title);
    setAccessUrl(mat.accessUrl);
    setInstructionText(mat.instructionText);
    if (!mat.roles || mat.roles.includes("all") || mat.roles.length === 0) {
      setAllRolesSelected(true);
      setSelectedRoles([]);
    } else {
      setAllRolesSelected(false);
      setSelectedRoles(mat.roles);
    }
    setEditingId(mat.id);
    setIsAdding(true);
    setFormError("");
  };

  const toggleRoleSelection = (roleName: string) => {
    if (allRolesSelected) {
      setAllRolesSelected(false);
      setSelectedRoles([roleName]);
      return;
    }
    setSelectedRoles((prev) => {
      if (prev.includes(roleName)) {
        const next = prev.filter((r) => r !== roleName);
        if (next.length === 0) {
          setAllRolesSelected(true);
        }
        return next;
      } else {
        return [...prev, roleName];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Informe o título do material.");
      return;
    }
    if (!accessUrl.trim()) {
      setFormError("Informe o link de acesso ao material.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const targetRoles = allRolesSelected || selectedRoles.length === 0 ? ["all"] : selectedRoles;
      await saveDidacticMaterial({
        id: editingId || undefined,
        title: title.trim(),
        accessUrl: accessUrl.trim(),
        instructionText: instructionText.trim(),
        roles: targetRoles,
        createdBy: currentUserName || "SuperAdmin"
      });

      setFormSuccess(editingId ? "Material atualizado com sucesso!" : "Material didático cadastrado com sucesso!");
      setTimeout(() => setFormSuccess(""), 4000);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar material didático.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (matId: string, matTitle: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o material didático "${matTitle}"?`)) {
      try {
        await deleteDidacticMaterial(matId);
      } catch (err) {
        alert("Erro ao excluir material.");
      }
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.instructionText.toLowerCase().includes(q) ||
      (m.roles || []).some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-[#070b13] p-6 rounded-3xl border-2 border-indigo-500/30 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-300 border-2 border-indigo-400/40 flex items-center justify-center shrink-0 shadow-inner">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30 font-mono">
                SuperAdmin • Conteúdo & Capacitação
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white mt-1">
              Material Didático e Capacitação do ENEM 2026
            </h2>
            <p className="text-xs text-slate-300 font-medium max-w-2xl mt-0.5 leading-relaxed">
              Adicione e gerencie conteúdos instrucionais, apostilas, vídeos e normativas que serão disponibilizados no ambiente do colaborador no menu <strong>MATERIAL DE APOIO</strong>. Quando o colaborador acessar o material, o sistema registrará a leitura em sua ficha para o CLA.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isAdding) {
              resetForm();
            } else {
              setIsAdding(true);
            }
          }}
          className="px-5 py-3 rounded-2xl font-black text-xs cursor-pointer transition shadow-md flex items-center gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 border border-emerald-400"
        >
          {isAdding ? (
            <>
              <X className="w-4 h-4" />
              <span>Fechar Formulário</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Material Didático</span>
            </>
          )}
        </button>
      </div>

      {formSuccess && (
        <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Form Card */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-[#0c1220] border-2 border-indigo-500/30 rounded-3xl space-y-5 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <h3 className="font-display font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>{editingId ? "Editar Material Didático" : "Cadastrar Novo Material Didático"}</span>
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
            >
              Cancelar
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Título do Material <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Manual Oficial do Chefe de Sala e Aplicador ENEM 2026"
                className="w-full bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 p-3 text-xs rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-hidden"
                required
              />
            </div>

            {/* Access Link */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Link de Acesso ao Material (URL / Drive / Vídeo / Apostila) <span className="text-rose-500">*</span></span>
                <span className="text-[9px] text-indigo-500 lowercase font-mono">http:// ou https://</span>
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  value={accessUrl}
                  onChange={(e) => setAccessUrl(e.target.value)}
                  placeholder="https://drive.google.com/... ou https://youtube.com/..."
                  className="w-full bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 pl-10 pr-3 py-3 text-xs rounded-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500/40 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Texto de Instrução & Orientações de Estudo
              </label>
              <textarea
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                rows={4}
                placeholder="Descreva as orientações, capítulos recomendados, o que o fiscal deve prestar atenção, ou o procedimento detalhado..."
                className="w-full bg-slate-50 dark:bg-[#070b13] border-2 border-slate-200 dark:border-slate-800 p-3 text-xs rounded-xl font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* Roles Target Audience */}
            <div className="md:col-span-2 space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                  Funções com Acesso ao Material
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAllRolesSelected(true);
                      setSelectedRoles([]);
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition border ${
                      allRolesSelected
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-white"
                    }`}
                  >
                    ✓ Todas as Funções (Geral)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAllRolesSelected(false);
                      setSelectedRoles(ENEM_ROLES.map((r) => r.name));
                    }}
                    className="px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-indigo-400"
                  >
                    Marcar Todas Específicas
                  </button>
                </div>
              </div>

              {allRolesSelected ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Este material estará visível para <strong>TODOS os colaboradores</strong> em suas respectivas contas.</span>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-2">
                    Selecione as funções que deverão ter acesso a este conteúdo:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {ENEM_ROLES.map((role) => {
                      const isChecked = selectedRoles.includes(role.name);
                      return (
                        <button
                          key={role.name}
                          type="button"
                          onClick={() => toggleRoleSelection(role.name)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer ${
                            isChecked
                              ? "bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs"
                              : "bg-white dark:bg-[#0c1220] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          <span className="truncate">{role.name}</span>
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-700"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Salvando..." : editingId ? "Atualizar Material" : "Salvar e Publicar"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Search & List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar materiais por título, função ou palavra-chave..."
              className="w-full bg-white dark:bg-[#0c1220] border border-slate-300 dark:border-slate-800 pl-10 pr-3 py-2.5 text-xs rounded-xl font-medium text-slate-800 dark:text-white focus:outline-indigo-500 shadow-xs"
            />
          </div>
          <span className="text-xs font-black text-slate-500 dark:text-slate-400">
            Total: {materials.length} material(is) cadastrado(s)
          </span>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="p-12 bg-white dark:bg-[#0c1220] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">Nenhum Material Didático Encontrado</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Clique em <strong>Novo Material Didático</strong> acima para adicionar links de capacitação, apostilas e vídeos para os colaboradores.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMaterials.map((mat) => {
              const isAllRoles = !mat.roles || mat.roles.includes("all") || mat.roles.length === 0;
              return (
                <div
                  key={mat.id}
                  className="p-5 bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 rounded-3xl space-y-4 shadow-sm transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAllRoles ? (
                          <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-emerald-500/30">
                            Todas as Funções
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-indigo-500/30">
                            {mat.roles.length} função(ões) específica(s)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(mat.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(mat)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Editar Material"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(mat.id, mat.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Excluir Material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-display font-black text-slate-900 dark:text-white leading-snug">
                        {mat.title}
                      </h4>
                      {mat.instructionText && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1.5 line-clamp-3 leading-relaxed">
                          {mat.instructionText}
                        </p>
                      )}
                    </div>

                    {!isAllRoles && mat.roles && mat.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {mat.roles.map((r, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold rounded-md"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <a
                      href={mat.accessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <span>Abrir Link do Material</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <span className="text-[10px] text-slate-400 font-medium">
                      Publicado por: {mat.createdBy || "SuperAdmin"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Save(props: any) {
  return <CheckCircle {...props} />;
}
