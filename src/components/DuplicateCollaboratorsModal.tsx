import React, { useState, useMemo } from "react";
import { CollaboratorInfo } from "../types";
import FiscalAvatar from "./FiscalAvatar";
import { 
  Copy, Trash2, CheckCircle2, AlertTriangle, Sparkles, X, 
  Search, ShieldAlert, ArrowRight, UserCheck, Image, Camera,
  Layers, Check, HelpCircle, Eye, Info, RefreshCw
} from "lucide-react";

export interface DuplicateGroup {
  id: string;
  reasons: Array<{
    field: "cpf" | "email" | "name" | "whatsapp";
    label: string;
    value: string;
  }>;
  collaborators: CollaboratorInfo[];
  hasPhotos: boolean;
  photoCount: number;
  recommendedIndex: number;
}

interface DuplicateCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: CollaboratorInfo[];
  onUpdate: (id: string, updates: Partial<CollaboratorInfo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewPhoto?: (data: { url: string; name: string; subtitle?: string }) => void;
}

// Helper to normalize strings for comparison
function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function cleanDigits(val?: string): string {
  if (!val) return "";
  return val.replace(/\D/g, "");
}

function cleanEmail(val?: string): string {
  if (!val) return "";
  return val.trim().toLowerCase();
}

/**
 * Identify duplicate collaborator records and cluster them into groups
 */
export function findDuplicateCollaborators(collaborators: CollaboratorInfo[]): DuplicateGroup[] {
  if (!collaborators || collaborators.length < 2) return [];

  const n = collaborators.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const matchReasonsMap = new Map<string, Array<{ field: "cpf" | "email" | "name" | "whatsapp"; label: string; value: string }>>();

  for (let i = 0; i < n; i++) {
    const c1 = collaborators[i];
    const cpf1 = cleanDigits(c1.cpf);
    const email1 = cleanEmail(c1.email);
    const name1 = normalizeName(c1.name);
    const phone1 = cleanDigits(c1.whatsapp);

    for (let j = i + 1; j < n; j++) {
      const c2 = collaborators[j];
      const cpf2 = cleanDigits(c2.cpf);
      const email2 = cleanEmail(c2.email);
      const name2 = normalizeName(c2.name);
      const phone2 = cleanDigits(c2.whatsapp);

      const reasons: Array<{ field: "cpf" | "email" | "name" | "whatsapp"; label: string; value: string }> = [];

      // CPF match (strongest match)
      if (cpf1 && cpf2 && cpf1.length === 11 && cpf1 === cpf2) {
        reasons.push({ field: "cpf", label: "CPF Idêntico", value: c1.cpf });
      }

      // Email match
      if (email1 && email2 && email1.includes("@") && email1 === email2) {
        reasons.push({ field: "email", label: "E-mail Idêntico", value: c1.email });
      }

      // Exact name match (if valid full name)
      if (name1 && name2 && name1.length > 4 && name1.split(" ").length >= 2 && name1 === name2) {
        reasons.push({ field: "name", label: "Nome Idêntico", value: c1.name });
      }

      // WhatsApp match (if valid phone)
      if (phone1 && phone2 && phone1.length >= 10 && phone1 === phone2) {
        reasons.push({ field: "whatsapp", label: "WhatsApp Idêntico", value: c1.whatsapp });
      }

      if (reasons.length > 0) {
        union(i, j);
        const pairKey = `${i}-${j}`;
        matchReasonsMap.set(pairKey, reasons);
      }
    }
  }

  // Group by root parent
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusters.has(root)) {
      clusters.set(root, []);
    }
    clusters.get(root)!.push(i);
  }

  const result: DuplicateGroup[] = [];

  clusters.forEach((indices, root) => {
    if (indices.length > 1) {
      const groupCollabs = indices.map(idx => collaborators[idx]);
      
      // Consolidate reasons
      const allReasonsMap = new Map<string, { field: "cpf" | "email" | "name" | "whatsapp"; label: string; value: string }>();
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const idxA = Math.min(indices[a], indices[b]);
          const idxB = Math.max(indices[a], indices[b]);
          const pairKey = `${idxA}-${idxB}`;
          const reasons = matchReasonsMap.get(pairKey) || [];
          reasons.forEach(r => {
            allReasonsMap.set(`${r.field}:${r.value.toLowerCase()}`, r);
          });
        }
      }

      const photoCount = groupCollabs.filter(c => Boolean(c.photoUrl)).length;
      const hasPhotos = photoCount > 0;

      // Score each collaborator to pick the best recommended primary record
      let bestIndex = 0;
      let highestScore = -1;

      groupCollabs.forEach((c, idx) => {
        let score = 0;
        if (c.photoUrl) score += 50; // heavily reward having a photo
        if (c.assignedRole) score += 20; // reward having assigned role
        if (c.assignedRoom) score += 15; // reward having assigned room
        if (c.status === "Confirmado") score += 10;
        if (c.attendanceStatus === "Confirmado") score += 10;
        if (c.cpf && c.cpf.length >= 11) score += 5;
        if (c.email) score += 5;
        if (c.whatsapp) score += 5;
        if (c.pixKey) score += 5;
        if (c.pastEditions && c.pastEditions.length > 0) score += c.pastEditions.length * 2;
        if (c.orionStatus === "Ok") score += 5;

        if (score > highestScore) {
          highestScore = score;
          bestIndex = idx;
        }
      });

      result.push({
        id: `dup-group-${root}-${groupCollabs[0].id || Math.random()}`,
        reasons: Array.from(allReasonsMap.values()),
        collaborators: groupCollabs,
        hasPhotos,
        photoCount,
        recommendedIndex: bestIndex
      });
    }
  });

  return result;
}

export default function DuplicateCollaboratorsModal({
  isOpen,
  onClose,
  collaborators,
  onUpdate,
  onDelete,
  onViewPhoto
}: DuplicateCollaboratorsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrimaryMap, setSelectedPrimaryMap] = useState<Record<string, string>>({});
  const [selectedToDeleteMap, setSelectedToDeleteMap] = useState<Record<string, Record<string, boolean>>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [ignoredGroups, setIgnoredGroups] = useState<Record<string, boolean>>({});

  // Compute duplicate groups
  const duplicateGroups = useMemo(() => {
    if (!isOpen) return [];
    return findDuplicateCollaborators(collaborators);
  }, [collaborators, isOpen]);

  // Filter groups
  const visibleGroups = useMemo(() => {
    let groups = duplicateGroups.filter(g => !ignoredGroups[g.id]);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      groups = groups.filter(g => {
        const matchesReason = g.reasons.some(r => r.value.toLowerCase().includes(q) || r.label.toLowerCase().includes(q));
        const matchesCollab = g.collaborators.some(c => 
          c.name.toLowerCase().includes(q) || 
          (c.cpf && c.cpf.includes(q)) || 
          (c.email && c.email.toLowerCase().includes(q))
        );
        return matchesReason || matchesCollab;
      });
    }
    return groups;
  }, [duplicateGroups, ignoredGroups, searchQuery]);

  if (!isOpen) return null;

  const totalDuplicatesCount = duplicateGroups.reduce((acc, g) => acc + (g.collaborators.length - 1), 0);

  /**
   * Smart merge a single duplicate group into one consolidated rich collaborator record
   * ALWAYS PRESERVING PHOTOS if any exist!
   */
  const handleMergeGroup = async (group: DuplicateGroup) => {
    if (group.collaborators.length < 2) return;
    setIsProcessing(true);

    try {
      // 1. Pick or find the designated target ID
      const chosenTargetId = selectedPrimaryMap[group.id] || group.collaborators[group.recommendedIndex]?.id || group.collaborators[0].id!;
      const primaryCollab = group.collaborators.find(c => c.id === chosenTargetId) || group.collaborators[0];
      const otherCollabs = group.collaborators.filter(c => c.id !== primaryCollab.id);

      // 2. Resolve photo: ensure ANY existing photo across all duplicates is preserved!
      const photoWinner = group.collaborators.find(c => Boolean(c.photoUrl))?.photoUrl || primaryCollab.photoUrl || "";

      // 3. Consolidate past editions
      const editionsMap = new Map<number, string>();
      group.collaborators.forEach(c => {
        if (c.pastEditions && Array.isArray(c.pastEditions)) {
          c.pastEditions.forEach(p => {
            if (p.year && (!editionsMap.has(p.year) || !editionsMap.get(p.year))) {
              editionsMap.set(p.year, p.role || "Fiscal");
            }
          });
        }
      });
      const consolidatedEditions = Array.from(editionsMap.entries()).map(([year, role]) => ({ year, role }));

      // 4. Consolidate languages
      const langSet = new Set<string>();
      group.collaborators.forEach(c => {
        if (c.languages && Array.isArray(c.languages)) {
          c.languages.forEach(l => langSet.add(l));
        }
      });

      // 5. Consolidate status & role details
      const assignedRole = group.collaborators.find(c => Boolean(c.assignedRole))?.assignedRole || primaryCollab.assignedRole || "";
      const assignedRoom = group.collaborators.find(c => Boolean(c.assignedRoom))?.assignedRoom || primaryCollab.assignedRoom || "";
      const isConfirmed = group.collaborators.some(c => c.status === "Confirmado");
      const isAttendanceConfirmed = group.collaborators.some(c => c.attendanceStatus === "Confirmado");
      const specialRole = group.collaborators.find(c => c.specialRole && c.specialRole !== "Nenhuma")?.specialRole || primaryCollab.specialRole || "Nenhuma";
      const disability = group.collaborators.find(c => c.disability && c.disability !== "Nenhuma")?.disability || primaryCollab.disability || "Nenhuma";
      const foodRestrictions = group.collaborators.find(c => Boolean(c.foodRestrictions))?.foodRestrictions || primaryCollab.foodRestrictions || "";
      const snackPreference = group.collaborators.find(c => Boolean(c.snackPreference))?.snackPreference || primaryCollab.snackPreference || "Padrão";
      const pixKey = group.collaborators.find(c => Boolean(c.pixKey))?.pixKey || primaryCollab.pixKey || primaryCollab.cpf;
      const referencePerson = group.collaborators.find(c => Boolean(c.referencePerson))?.referencePerson || primaryCollab.referencePerson || "";

      // 6. Best formatting for core strings
      const name = group.collaborators.reduce((prev, curr) => (curr.name.length > prev.length ? curr.name : prev), primaryCollab.name);
      const email = group.collaborators.find(c => c.email && c.email.includes("@"))?.email || primaryCollab.email || "";
      const whatsapp = group.collaborators.find(c => cleanDigits(c.whatsapp).length >= 10)?.whatsapp || primaryCollab.whatsapp || "";
      const birthDate = group.collaborators.find(c => Boolean(c.birthDate))?.birthDate || primaryCollab.birthDate || "";
      const cpf = group.collaborators.find(c => cleanDigits(c.cpf).length === 11)?.cpf || primaryCollab.cpf;

      // 7. Update primary record with consolidated fields
      const updates: Partial<CollaboratorInfo> = {
        name,
        cpf,
        email,
        whatsapp,
        birthDate,
        pixKey,
        photoUrl: photoWinner,
        assignedRole,
        assignedRoom,
        status: isConfirmed ? "Confirmado" : primaryCollab.status,
        attendanceStatus: isAttendanceConfirmed ? "Confirmado" : primaryCollab.attendanceStatus,
        specialRole,
        disability,
        foodRestrictions,
        snackPreference,
        referencePerson,
        pastEditions: consolidatedEditions,
        hasWorkedEnem: consolidatedEditions.length > 0 || group.collaborators.some(c => c.hasWorkedEnem),
        languages: Array.from(langSet)
      };

      if (primaryCollab.id) {
        await onUpdate(primaryCollab.id, updates);
      }

      // 8. Delete secondary duplicate records
      for (const other of otherCollabs) {
        if (other.id) {
          await onDelete(other.id);
        }
      }

      setActionSuccessMsg(`Grupo mesclado com sucesso! Mantido cadastro de "${name}" com fotos e dados consolidados.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Erro ao mesclar grupo de duplicatas:", err);
      alert("Ocorreu um erro ao mesclar os cadastros. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Delete specific selected duplicates and keep the chosen one,
   * ALWAYS PRESERVING PHOTOS to the winner if any existed in the discarded ones!
   */
  const handleDeleteSelectedInGroup = async (group: DuplicateGroup) => {
    const chosenWinnerId = selectedPrimaryMap[group.id] || group.collaborators[group.recommendedIndex]?.id || group.collaborators[0].id!;
    const winnerCollab = group.collaborators.find(c => c.id === chosenWinnerId) || group.collaborators[0];
    
    const groupSelection = selectedToDeleteMap[group.id] || {};
    // If no specific checkboxes were checked, default to deleting all others except winner
    const collabsToDelete = group.collaborators.filter(c => {
      if (c.id === winnerCollab.id) return false;
      if (Object.keys(groupSelection).length === 0) return true;
      return groupSelection[c.id!];
    });

    if (collabsToDelete.length === 0) {
      alert("Nenhum cadastro duplicado selecionado para exclusão.");
      return;
    }

    if (!confirm(`Confirma a exclusão de ${collabsToDelete.length} cadastro(s) duplicado(s), mantendo "${winnerCollab.name}"? Fotos e dados essenciais serão preservados no cadastro mantido.`)) {
      return;
    }

    setIsProcessing(true);

    try {
      // Check if any collaborator to be deleted has a photo while winner has none
      let updatedPhoto = winnerCollab.photoUrl;
      if (!updatedPhoto) {
        const photoDonor = collabsToDelete.find(c => Boolean(c.photoUrl));
        if (photoDonor?.photoUrl) {
          updatedPhoto = photoDonor.photoUrl;
        }
      }

      // Fill in any missing vital fields in winner from deleted records
      const missingUpdates: Partial<CollaboratorInfo> = {};
      if (updatedPhoto && updatedPhoto !== winnerCollab.photoUrl) {
        missingUpdates.photoUrl = updatedPhoto;
      }
      if (!winnerCollab.email) {
        const foundEmail = collabsToDelete.find(c => Boolean(c.email))?.email;
        if (foundEmail) missingUpdates.email = foundEmail;
      }
      if (!winnerCollab.whatsapp) {
        const foundPhone = collabsToDelete.find(c => Boolean(c.whatsapp))?.whatsapp;
        if (foundPhone) missingUpdates.whatsapp = foundPhone;
      }
      if (!winnerCollab.pixKey) {
        const foundPix = collabsToDelete.find(c => Boolean(c.pixKey))?.pixKey;
        if (foundPix) missingUpdates.pixKey = foundPix;
      }

      if (Object.keys(missingUpdates).length > 0 && winnerCollab.id) {
        await onUpdate(winnerCollab.id, missingUpdates);
      }

      // Delete the selected duplicates
      for (const toDel of collabsToDelete) {
        if (toDel.id) {
          await onDelete(toDel.id);
        }
      }

      setActionSuccessMsg(`${collabsToDelete.length} cadastro(s) duplicado(s) removido(s). Cadastro de "${winnerCollab.name}" preservado com sucesso.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Erro ao excluir duplicatas:", err);
      alert("Erro ao excluir os cadastros duplicados.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Merge ALL duplicate groups automatically in batch
   */
  const handleMergeAllGroups = async () => {
    if (visibleGroups.length === 0) return;
    
    if (!confirm(`Deseja mesclar automaticamente TODOS os ${visibleGroups.length} grupos de duplicatas encontrados? Todas as fotos, cargos e dados serão consolidados nos cadastros principais.`)) {
      return;
    }

    setIsProcessing(true);
    let mergedCount = 0;

    try {
      for (const group of visibleGroups) {
        await handleMergeGroup(group);
        mergedCount++;
      }
      setActionSuccessMsg(`Excelente! ${mergedCount} grupos de duplicatas foram mesclados e limpos com sucesso.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (e) {
      console.error(e);
      alert("Erro durante a mesclagem em lote.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-left">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b-2 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 dark:bg-[#070b13]/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Localizador e Unificador de Duplicados
                </h2>
                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {duplicateGroups.length} {duplicateGroups.length === 1 ? "GRUPO ENCONTRADO" : "GRUPOS ENCONTRADOS"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revise registros redundantes por CPF, e-mail ou nome. Exclua excessos ou mescle todos mantendo fotos e dados completos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {visibleGroups.length > 1 && (
              <button
                type="button"
                onClick={handleMergeAllGroups}
                disabled={isProcessing}
                className="btn-3d py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mesclar Todos os Grupos ({visibleGroups.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK SUCCESS MESSAGE */}
        {actionSuccessMsg && (
          <div className="m-4 p-3.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* TOOLBAR & SEARCH */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por nome, CPF ou e-mail nos grupos duplicados..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-emerald-500" />
              <span>Fotos sempre preservadas</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>
              Total de cadastros a limpar: <strong className="text-rose-500">{totalDuplicatesCount}</strong>
            </span>
          </div>
        </div>

        {/* MODAL BODY / DUPLICATE GROUPS LIST */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {duplicateGroups.length === 0 ? (
            <div className="p-16 text-center space-y-3 bg-slate-50 dark:bg-[#070b13]/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <h3 className="text-base font-black text-slate-850 dark:text-white">
                Nenhum Cadastro Duplicado Encontrado!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Todos os colaboradores cadastrados possuem CPFs, e-mails e identificações exclusivas. Sua equipe está 100% íntegra e sem duplicidades.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-3d btn-3d-primary px-6 py-2.5 text-xs font-black rounded-xl text-white mt-2 cursor-pointer"
              >
                Fechar e Voltar à Lista
              </button>
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Nenhum grupo corresponde ao filtro de busca "{searchQuery}".
            </div>
          ) : (
            visibleGroups.map((group, groupIdx) => {
              const currentWinnerId = selectedPrimaryMap[group.id] || group.collaborators[group.recommendedIndex]?.id || group.collaborators[0].id!;
              const groupToDeleteSelection = selectedToDeleteMap[group.id] || {};

              return (
                <div
                  key={group.id}
                  className="p-5 sm:p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070b13]/60 space-y-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* GROUP HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          GRUPO #{groupIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {group.collaborators.length} cadastros duplicados encontrados
                        </span>
                        {group.hasPhotos && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            <span>{group.photoCount} com Foto</span>
                          </span>
                        )}
                      </div>

                      {/* DUPLICATE REASONS TAGS */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Identificado por:</span>
                        {group.reasons.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono ${
                              r.field === "cpf"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : r.field === "email"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                : r.field === "name"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {r.label}: {r.value}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* GROUP ACTIONS */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMergeGroup(group)}
                        disabled={isProcessing}
                        className="btn-3d py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Unifica todos os dados, preservando a melhor foto e todos os históricos em 1 único registro"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mesclar Este Grupo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSelectedInGroup(group)}
                        disabled={isProcessing}
                        className="btn-3d py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Exclui os registros redundantes e mantém o selecionado, salvando a foto caso exista em outro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Duplicados</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIgnoredGroups(prev => ({ ...prev, [group.id]: true }))}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                        title="Ignorar este grupo (não são a mesma pessoa)"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>

                  {/* COMPARATIVE CARDS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {group.collaborators.map((collab, cIdx) => {
                      const isWinner = collab.id === currentWinnerId;
                      const isRecommended = cIdx === group.recommendedIndex;
                      const isMarkedToDelete = groupToDeleteSelection[collab.id!] ?? !isWinner;

                      return (
                        <div
                          key={collab.id || cIdx}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                            isWinner
                              ? "bg-white dark:bg-[#101726] border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                              : "bg-white/80 dark:bg-[#0c1220] border-slate-200 dark:border-slate-800 opacity-90"
                          }`}
                        >
                          {/* TOP CARD BAR: WINNER SELECTION */}
                          <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`winner-${group.id}`}
                                  checked={isWinner}
                                  onChange={() => {
                                    setSelectedPrimaryMap(prev => ({ ...prev, [group.id]: collab.id! }));
                                  }}
                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className={`text-xs font-extrabold ${isWinner ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                                  {isWinner ? "⭐ Registro Principal (Manter)" : "Registro Secundário"}
                                </span>
                              </label>

                              {isRecommended && (
                                <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                  Sugerido
                                </span>
                              )}
                            </div>

                            {/* COLLABORATOR DETAILS */}
                            <div className="pt-3 flex items-start gap-3">
                              {/* Avatar & Photo Badge */}
                              <div className="relative shrink-0">
                                <FiscalAvatar
                                  photoUrl={collab.photoUrl}
                                  name={collab.name}
                                  size="md"
                                  onClick={collab.photoUrl && onViewPhoto ? () => onViewPhoto({
                                    url: collab.photoUrl!,
                                    name: collab.name,
                                    subtitle: `CPF: ${collab.cpf} • Função: ${collab.assignedRole || "Não Atribuída"}`
                                  }) : undefined}
                                />
                                {collab.photoUrl ? (
                                  <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 text-white rounded-full shadow-xs" title="Foto Presente">
                                    <Camera className="w-2.5 h-2.5" />
                                  </span>
                                ) : (
                                  <span className="absolute -bottom-1 -right-1 p-0.5 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full" title="Sem Foto">
                                    <X className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-0.5">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate" title={collab.name}>
                                  {collab.name}
                                </h4>
                                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                  <span>CPF:</span>
                                  <strong className={group.reasons.some(r => r.field === "cpf") ? "text-rose-600 dark:text-rose-400 font-bold" : ""}>
                                    {collab.cpf || "Não informado"}
                                  </strong>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={collab.email}>
                                  ✉️ {collab.email || "Sem e-mail"}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  📱 {collab.whatsapp || "Sem telefone"}
                                </div>
                              </div>
                            </div>

                            {/* EXTRA SPECS */}
                            <div className="mt-3 p-2.5 bg-slate-50 dark:bg-[#070b13] rounded-xl border border-slate-200/80 dark:border-slate-800 text-[10px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Cargo:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]">
                                  {collab.assignedRole || "Não Atribuído"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Sala:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {collab.assignedRoom || "Sem Sala"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Condição:</span>
                                <span className={`font-bold ${collab.isReserve ? "text-amber-500" : "text-emerald-500"}`}>
                                  {collab.isReserve ? "Reserva" : "Efetivo"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Status / Presença:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {collab.status} • {collab.attendanceStatus || "Pendente"}
                                </span>
                              </div>
                              {collab.createdAt && (
                                <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/60 dark:border-slate-800/60 text-slate-400">
                                  <span>Cadastrado em:</span>
                                  <span className="font-mono">{new Date(collab.createdAt).toLocaleDateString("pt-BR")}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ACTION BUTTON ON INDIVIDUAL CARD */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            {!isWinner ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPrimaryMap(prev => ({ ...prev, [group.id]: collab.id! }));
                                }}
                                className="w-full py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span>Definir como Principal</span>
                              </button>
                            ) : (
                              <span className="w-full py-1.5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 border border-emerald-500/20">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Cadastro Selecionado</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#070b13]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-500 shrink-0" />
            <span>
              Ao mesclar ou excluir, qualquer foto existente em um registro descartado é <strong>automaticamente transferida</strong> para o cadastro mantido.
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer"
            >
              Fechar
            </button>
            {visibleGroups.length > 0 && (
              <button
                type="button"
                onClick={handleMergeAllGroups}
                disabled={isProcessing}
                className="btn-3d py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mesclar Todos ({visibleGroups.length})</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
