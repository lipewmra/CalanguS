import React, { useState, useEffect } from "react";
import { CateringInfo, Quote, CollaboratorInfo } from "../types";
import { Coffee, PlusCircle, Check, Receipt, ClipboardCheck, Trash2, Utensils, AlertTriangle, Info, MapPin } from "lucide-react";

interface CateringProps {
  initialCatering: CateringInfo | null;
  claId: string;
  collaborators: CollaboratorInfo[];
  onSave: (catering: CateringInfo) => Promise<void>;
  readOnly?: boolean;
}

export default function CateringView({ initialCatering, claId, collaborators, onSave, readOnly = false }: CateringProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [supplier, setSupplier] = useState("");
  const [priceLanche, setPriceLanche] = useState(12.50);
  const [priceRefeicao, setPriceRefeicao] = useState(25.00);
  const [lancheItems, setLancheItems] = useState<string[]>([]);
  const [refeicaoItems, setRefeicaoItems] = useState<string[]>([]);
  const [newLancheItem, setNewLancheItem] = useState("");
  const [newRefeicaoItem, setNewRefeicaoItem] = useState("");
  const [hasNf, setHasNf] = useState(true);

  // Legacy fallback states
  const [day1Arrival, setDay1Arrival] = useState(false);
  const [day1Checker, setDay1Checker] = useState("");
  const [day2Arrival, setDay2Arrival] = useState(false);
  const [day2Checker, setDay2Checker] = useState("");
  const [day1Deliveries, setDay1Deliveries] = useState<Record<string, boolean>>({});
  const [day2Deliveries, setDay2Deliveries] = useState<Record<string, boolean>>({});

  // Individual new snack/meal deliveries and arrivals states to satisfy separate tracking
  const [day1SnackArrival, setDay1SnackArrival] = useState(false);
  const [day1SnackChecker, setDay1SnackChecker] = useState("");
  const [day1MealArrival, setDay1MealArrival] = useState(false);
  const [day1MealChecker, setDay1MealChecker] = useState("");

  const [day2SnackArrival, setDay2SnackArrival] = useState(false);
  const [day2SnackChecker, setDay2SnackChecker] = useState("");
  const [day2MealArrival, setDay2MealArrival] = useState(false);
  const [day2MealChecker, setDay2MealChecker] = useState("");

  const [day1SnackDeliveries, setDay1SnackDeliveries] = useState<Record<string, boolean>>({});
  const [day1MealDeliveries, setDay1MealDeliveries] = useState<Record<string, boolean>>({});
  const [day2SnackDeliveries, setDay2SnackDeliveries] = useState<Record<string, boolean>>({});
  const [day2MealDeliveries, setDay2MealDeliveries] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab2] = useState<"quotes" | "day1" | "day2">("quotes");
  const [success, setSuccess] = useState(false);
  const [releasedToCollab, setReleasedToCollab] = useState(false);

  useEffect(() => {
    if (initialCatering) {
      setQuotes(initialCatering.quotes || []);
      setDay1Arrival(initialCatering.day1?.arrivalConfirmed || false);
      setDay1Checker(initialCatering.day1?.conferidoPor || "");
      setDay2Arrival(initialCatering.day2?.arrivalConfirmed || false);
      setDay2Checker(initialCatering.day2?.conferidoPor || "");
      setDay1Deliveries(initialCatering.day1?.deliveredSlices || {});
      setDay2Deliveries(initialCatering.day2?.deliveredSlices || {});
      setReleasedToCollab(initialCatering.releasedToCollaborators || false);

      // Restore states with fallback
      setDay1SnackArrival(initialCatering.day1?.snackArrivalConfirmed !== undefined 
        ? initialCatering.day1.snackArrivalConfirmed 
        : (initialCatering.day1?.arrivalConfirmed || false));
      setDay1SnackChecker(initialCatering.day1?.snackConferidoPor || initialCatering.day1?.conferidoPor || "");
      
      setDay1MealArrival(initialCatering.day1?.mealArrivalConfirmed !== undefined 
        ? initialCatering.day1.mealArrivalConfirmed 
        : (initialCatering.day1?.arrivalConfirmed || false));
      setDay1MealChecker(initialCatering.day1?.mealConferidoPor || initialCatering.day1?.conferidoPor || "");

      setDay2SnackArrival(initialCatering.day2?.snackArrivalConfirmed !== undefined 
        ? initialCatering.day2.snackArrivalConfirmed 
        : (initialCatering.day2?.arrivalConfirmed || false));
      setDay2SnackChecker(initialCatering.day2?.snackConferidoPor || initialCatering.day2?.conferidoPor || "");
      
      setDay2MealArrival(initialCatering.day2?.mealArrivalConfirmed !== undefined 
        ? initialCatering.day2.mealArrivalConfirmed 
        : (initialCatering.day2?.arrivalConfirmed || false));
      setDay2MealChecker(initialCatering.day2?.mealConferidoPor || initialCatering.day2?.conferidoPor || "");

      setDay1SnackDeliveries(initialCatering.day1?.deliveredSnacks || initialCatering.day1?.deliveredSlices || {});
      setDay1MealDeliveries(initialCatering.day1?.deliveredMeals || initialCatering.day1?.deliveredSlices || {});
      setDay2SnackDeliveries(initialCatering.day2?.deliveredSnacks || initialCatering.day2?.deliveredSlices || {});
      setDay2MealDeliveries(initialCatering.day2?.deliveredMeals || initialCatering.day2?.deliveredSlices || {});
    } else {
      setQuotes([]);
    }
  }, [initialCatering]);

  const [proposalType, setProposalType] = useState<"lanche" | "refeicao">("lanche");

  const selectedQuotes = quotes.filter(q => q.selected);
  const activeLancheQuote = selectedQuotes.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || 
                             quotes.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || null;
  const activeRefeicaoQuote = selectedQuotes.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || 
                               quotes.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || null;

  const activeQuote = quotes.find(q => q.selected) || quotes[0] || null;
  const totalCollaborators = collaborators.length;

  const getPriceLanche = (q: Quote) => {
    if (q.type === "refeicao") return 0;
    return q.priceLanche !== undefined ? q.priceLanche : q.pricePerUnit;
  };

  const getPriceRefeicao = (q: Quote) => {
    if (q.type === "lanche") return 0;
    return q.priceRefeicao !== undefined ? q.priceRefeicao : q.pricePerUnit;
  };

  const estimatedTotalCost = (
    (activeLancheQuote ? getPriceLanche(activeLancheQuote) : 0) +
    (activeRefeicaoQuote ? getPriceRefeicao(activeRefeicaoQuote) : 0)
  ) * totalCollaborators * 2;

  const saveCateringData = async (
    updatedQuotes: Quote[],
    d1Arr = day1Arrival,
    d1Chk = day1Checker,
    d2Arr = day2Arrival,
    d2Chk = day2Checker,
    d1Del = day1Deliveries,
    d2Del = day2Deliveries,
    isReleased = releasedToCollab,
    // Add additional parameters for modern structure
    d1SnackArr = day1SnackArrival,
    d1SnackChk = day1SnackChecker,
    d1MealArr = day1MealArrival,
    d1MealChk = day1MealChecker,
    d2SnackArr = day2SnackArrival,
    d2SnackChk = day2SnackChecker,
    d2MealArr = day2MealArrival,
    d2MealChk = day2MealChecker,
    d1SnackDel = day1SnackDeliveries,
    d1MealDel = day1MealDeliveries,
    d2SnackDel = day2SnackDeliveries,
    d2MealDel = day2MealDeliveries
  ) => {
    const selectedS = updatedQuotes.filter(q => q.selected);
    const actL = selectedS.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || 
                  updatedQuotes.find(q => q.type === "lanche" || q.type === "ambos" || !q.type) || null;
    const actR = selectedS.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || 
                  updatedQuotes.find(q => q.type === "refeicao" || q.type === "ambos" || !q.type) || null;

    const priceL = actL ? (actL.type === "refeicao" ? 0 : (actL.priceLanche !== undefined ? actL.priceLanche : actL.pricePerUnit)) : 0;
    const priceR = actR ? (actR.type === "lanche" ? 0 : (actR.priceRefeicao !== undefined ? actR.priceRefeicao : actR.pricePerUnit)) : 0;
    const combinedPrice = priceL + priceR;

    let combinedMenu = "";
    if (actL && actR) {
      if (actL === actR) {
        combinedMenu = actL.menu;
      } else {
        combinedMenu = `${actL.menu} | ${actR.menu}`;
      }
    } else if (actL) {
      combinedMenu = actL.menu;
    } else if (actR) {
      combinedMenu = actR.menu;
    }

    const info: CateringInfo = {
      id: initialCatering?.id,
      claId,
      quotes: updatedQuotes,
      releasedToCollaborators: isReleased,
      day1: {
        menuSelected: combinedMenu,
        pricePerUnit: combinedPrice,
        arrivalConfirmed: d1Arr || d1SnackArr || d1MealArr,
        conferidoPor: d1Chk || d1SnackChk || d1MealChk || "",
        deliveredSlices: d1Del,
        // Modernized tracking
        deliveredSnacks: d1SnackDel,
        deliveredMeals: d1MealDel,
        snackArrivalConfirmed: d1SnackArr,
        snackConferidoPor: d1SnackChk,
        mealArrivalConfirmed: d1MealArr,
        mealConferidoPor: d1MealChk
      },
      day2: {
        menuSelected: combinedMenu,
        pricePerUnit: combinedPrice,
        arrivalConfirmed: d2Arr || d2SnackArr || d2MealArr,
        conferidoPor: d2Chk || d2SnackChk || d2MealChk || "",
        deliveredSlices: d2Del,
        // Modernized tracking
        deliveredSnacks: d2SnackDel,
        deliveredMeals: d2MealDel,
        snackArrivalConfirmed: d2SnackArr,
        snackConferidoPor: d2SnackChk,
        mealArrivalConfirmed: d2MealArr,
        mealConferidoPor: d2MealChk
      }
    };

    try {
      await onSave(info);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLancheItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLancheItem.trim()) return;
    setLancheItems([...lancheItems, newLancheItem.trim()]);
    setNewLancheItem("");
  };

  const removeLancheItem = (index: number) => {
    setLancheItems(lancheItems.filter((_, i) => i !== index));
  };

  const handleAddRefeicaoItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefeicaoItem.trim()) return;
    setRefeicaoItems([...refeicaoItems, newRefeicaoItem.trim()]);
    setNewRefeicaoItem("");
  };

  const removeRefeicaoItem = (index: number) => {
    setRefeicaoItems(refeicaoItems.filter((_, i) => i !== index));
  };

  const handleAddQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) return;

    if (proposalType === "lanche" && lancheItems.length === 0) {
      alert("Por favor, adicione individualmente pelo menos 1 item para o cardápio de Lanche.");
      return;
    }
    if (proposalType === "refeicao" && refeicaoItems.length === 0) {
      alert("Por favor, adicione individualmente pelo menos 1 item para o cardápio de Refeição.");
      return;
    }

    const finalPriceLanche = proposalType === "lanche" ? Number(priceLanche) : 0;
    const finalPriceRefeicao = proposalType === "refeicao" ? Number(priceRefeicao) : 0;
    const finalLancheItems = proposalType === "lanche" ? lancheItems : [];
    const finalRefeicaoItems = proposalType === "refeicao" ? refeicaoItems : [];

    const calculatedPrice = finalPriceLanche + finalPriceRefeicao;
    const calculatedMenu = proposalType === "lanche"
      ? `Lanche: ${finalLancheItems.join(", ")}.`
      : `Refeição: ${finalRefeicaoItems.join(", ")}.`;

    const hasSameTypeSelected = quotes.some(q => q.selected && (q.type === proposalType || (!q.type && proposalType === "lanche")));

    const newQuote: Quote = {
      supplier,
      type: proposalType,
      pricePerUnit: calculatedPrice,
      priceLanche: finalPriceLanche,
      priceRefeicao: finalPriceRefeicao,
      lancheItems: finalLancheItems,
      refeicaoItems: finalRefeicaoItems,
      menu: calculatedMenu,
      issuesInvoice: hasNf,
      selected: !hasSameTypeSelected,
    };

    const newQuotesList = [...quotes, newQuote];
    setQuotes(newQuotesList);
    setSupplier("");
    setPriceLanche(12.50);
    setPriceRefeicao(25.00);
    setLancheItems([]);
    setRefeicaoItems([]);
    saveCateringData(newQuotesList);
  };

  const selectQuote = (index: number) => {
    const targetType = quotes[index].type || "ambos";
    const updated = quotes.map((q, idx) => {
      if (idx === index) return { ...q, selected: true };
      const qType = q.type || "ambos";
      if (targetType === "ambos") {
        return { ...q, selected: false };
      } else {
        if (qType === targetType || qType === "ambos") {
          return { ...q, selected: false };
        }
      }
      return q;
    });
    setQuotes(updated);
    saveCateringData(updated);
  };

  const removeQuote = (index: number) => {
    const removedType = quotes[index].type || "ambos";
    const updated = quotes.filter((_, idx) => idx !== index);
    const wasSelected = quotes[index].selected;
    if (wasSelected && updated.length > 0) {
      const match = updated.find(q => (q.type || "ambos") === removedType);
      if (match) {
        match.selected = true;
      } else if (!updated.some(q => q.selected)) {
        updated[0].selected = true;
      }
    }
    setQuotes(updated);
    saveCateringData(updated);
  };

  const toggleDeliveryItem = (collabId: string, day: 1 | 2, type: "snack" | "meal") => {
    if (type === "snack") {
      if (day === 1) {
        const updated = { ...day1SnackDeliveries, [collabId]: !day1SnackDeliveries[collabId] };
        setDay1SnackDeliveries(updated);
        saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
          day1SnackArrival, day1SnackChecker, day1MealArrival, day1MealChecker,
          day2SnackArrival, day2SnackChecker, day2MealArrival, day2MealChecker,
          updated, day1MealDeliveries, day2SnackDeliveries, day2MealDeliveries
        );
      } else {
        const updated = { ...day2SnackDeliveries, [collabId]: !day2SnackDeliveries[collabId] };
        setDay2SnackDeliveries(updated);
        saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
          day1SnackArrival, day1SnackChecker, day1MealArrival, day1MealChecker,
          day2SnackArrival, day2SnackChecker, day2MealArrival, day2MealChecker,
          day1SnackDeliveries, day1MealDeliveries, updated, day2MealDeliveries
        );
      }
    } else {
      if (day === 1) {
        const updated = { ...day1MealDeliveries, [collabId]: !day1MealDeliveries[collabId] };
        setDay1MealDeliveries(updated);
        saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
          day1SnackArrival, day1SnackChecker, day1MealArrival, day1MealChecker,
          day2SnackArrival, day2SnackChecker, day2MealArrival, day2MealChecker,
          day1SnackDeliveries, updated, day2SnackDeliveries, day2MealDeliveries
        );
      } else {
        const updated = { ...day2MealDeliveries, [collabId]: !day2MealDeliveries[collabId] };
        setDay2MealDeliveries(updated);
        saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
          day1SnackArrival, day1SnackChecker, day1MealArrival, day1MealChecker,
          day2SnackArrival, day2SnackChecker, day2MealArrival, day2MealChecker,
          day1SnackDeliveries, day1MealDeliveries, day2SnackDeliveries, updated
        );
      }
    }
  };

  const toggleDaySnackArrival = (day: 1 | 2, checkerName: string) => {
    if (day === 1) {
      const nextVal = !day1SnackArrival;
      setDay1SnackArrival(nextVal);
      setDay1SnackChecker(nextVal ? checkerName : "");
      saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
        nextVal, nextVal ? checkerName : "", day1MealArrival, day1MealChecker,
        day2SnackArrival, day2SnackChecker, day2MealArrival, day2MealChecker,
        day1SnackDeliveries, day1MealDeliveries, day2SnackDeliveries, day2MealDeliveries
      );
    } else {
      const nextVal = !day2SnackArrival;
      setDay2SnackArrival(nextVal);
      setDay2SnackChecker(nextVal ? checkerName : "");
      saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
        day1SnackArrival, day1SnackChecker, day1MealArrival, day1MealChecker,
        nextVal, nextVal ? checkerName : "", day2MealArrival, day2MealChecker,
        day1SnackDeliveries, day1MealDeliveries, day2SnackDeliveries, day2MealDeliveries
      );
    }
  };

  const toggleDayMealArrival = (day: 1 | 2, checkerName: string) => {
    if (day === 1) {
      const nextVal = !day1MealArrival;
      setDay1MealArrival(nextVal);
      setDay1MealChecker(nextVal ? checkerName : "");
      saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
        day1SnackArrival, day1SnackChecker, nextVal, nextVal ? checkerName : "",
        day2SnackArrival, day2SnackChecker, day2MealArrival, day2MealChecker,
        day1SnackDeliveries, day1MealDeliveries, day2SnackDeliveries, day2MealDeliveries
      );
    } else {
      const nextVal = !day2MealArrival;
      setDay2MealArrival(nextVal);
      setDay2MealChecker(nextVal ? checkerName : "");
      saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, releasedToCollab,
        day1SnackArrival, day1SnackChecker, day1MealArrival, day1MealChecker,
        day2SnackArrival, day2SnackChecker, nextVal, nextVal ? checkerName : "",
        day1SnackDeliveries, day1MealDeliveries, day2SnackDeliveries, day2MealDeliveries
      );
    }
  };

  return (
    <div className="bg-white dark:bg-[#0c1220]/90 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[6px_6px_0px_0px_#e2e8f0] dark:shadow-[6px_6px_0px_0px_#10b981]/20 transition-all duration-300" id="catering-lanches-panel">
      
      {readOnly && (
        <div className="mb-6 p-4 bg-indigo-500/10 text-indigo-850 dark:text-indigo-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-indigo-500/20">
          <span className="text-slate-400">ℹ️</span>
          <span><strong>Modo de Leitura (ALA):</strong> Você tem acesso aos custos de alimentação do exame, lista de restrições alimentares e controle de entregas, mas as alterações no cardápio, cotações e de recebimento são restritas ao CLA.</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-black text-slate-850 dark:text-white flex items-center gap-2">
              <span>Módulo de Alimentação (Lanches & Refeições)</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">LOGÍSTICA</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Faça cotações detalhadas de lanches e refeições, gerencie os cardápios individuais e controle as duas remessas separadamente.</p>
          </div>
        </div>

        {/* STATS BRIEF CARD */}
        {(activeLancheQuote || activeRefeicaoQuote) && (
          <div className="bg-indigo-500/5 dark:bg-[#070b13]/60 border-2 border-indigo-500/15 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-left md:text-right shadow-sm max-w-sm relative" id="active-catering-header-widget">
            <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest font-mono mb-1">Fornecedores Ativos</span>
            <div className="font-mono font-bold text-[10px] text-slate-800 dark:text-slate-100 space-y-0.5">
              {activeLancheQuote && (
                <div className="truncate">
                  <span>🥪 Lanche: {activeLancheQuote.supplier} (R$ {getPriceLanche(activeLancheQuote).toFixed(2)})</span>
                </div>
              )}
              {activeRefeicaoQuote && (
                <div className="truncate">
                  <span>🍽️ Refeição: {activeRefeicaoQuote.supplier} (R$ {getPriceRefeicao(activeRefeicaoQuote).toFixed(2)})</span>
                </div>
              )}
            </div>
            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-black font-mono mt-1">
              Custo Estimado (2 dias): R$ {estimatedTotalCost.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* WARNING SYSTEM FOR FOOD RESTRICTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-slate-50 dark:bg-[#070b13]/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-black text-indigo-550 dark:text-indigo-400 tracking-wider">Liberação de Cardápio:</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Libere os cardápios listados acima para consulta e escolha de preferências de todos os fiscais.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (readOnly) return;
              const nextVal = !releasedToCollab;
              setReleasedToCollab(nextVal);
              saveCateringData(quotes, day1Arrival, day1Checker, day2Arrival, day2Checker, day1Deliveries, day2Deliveries, nextVal);
            }}
            disabled={readOnly}
            className={`btn-3d px-3 py-2 text-[10px] font-black rounded-lg cursor-pointer shrink-0 uppercase tracking-wide ${releasedToCollab ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-850 dark:text-slate-300"} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {releasedToCollab ? "✓ Cardápio Liberado" : "Liberar Cardápio"}
          </button>
        </div>

        <div className="p-4 bg-amber-500/5 dark:bg-amber-500/5 rounded-xl border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 font-black text-xs shrink-0 mt-0.5">⚠️</span>
            <div>
              <span className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">Restrições de Fiscais Recebidas:</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 font-semibold">
                {collaborators.filter(c => c.foodRestrictions && c.foodRestrictions.trim() !== "").length} fiscais reportaram intolerâncias ou restrições alimentares ativas.
              </p>
            </div>
          </div>
          
          {collaborators.filter(c => c.foodRestrictions && c.foodRestrictions.trim() !== "").length > 0 && (
            <div className="mt-2 text-[9px] max-h-16 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/40 rounded p-1.5 border border-slate-150 dark:border-slate-850">
              {collaborators
                .filter(c => c.foodRestrictions && c.foodRestrictions.trim() !== "")
                .map((collab, idx) => (
                  <div key={idx} className="py-1 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="font-bold text-slate-700 dark:text-slate-350">{collab.name} ({collab.assignedRoom || "Reserva"}):</span>
                    <span className="text-rose-500 dark:text-rose-400 font-mono font-bold italic truncate max-w-xs">{collab.foodRestrictions}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab2("quotes")}
          className={`pb-3 px-4 text-xs font-black tracking-wider uppercase transition cursor-pointer ${activeTab === "quotes" ? "border-b-4 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "text-slate-550 hover:text-slate-850"}`}
        >
          1. Gestão de Cardápios & Cotações
        </button>
        <button
          onClick={() => setActiveTab2("day1")}
          className={`pb-3 px-4 text-xs font-black tracking-wider uppercase transition cursor-pointer ${activeTab === "day1" ? "border-b-4 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "text-slate-550 hover:text-slate-850"}`}
        >
          2. Primeiro Domingo (Dia 1)
        </button>
        <button
          onClick={() => setActiveTab2("day2")}
          className={`pb-3 px-4 text-xs font-black tracking-wider uppercase transition cursor-pointer ${activeTab === "day2" ? "border-b-4 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "text-slate-550 hover:text-slate-850"}`}
        >
          3. Segundo Domingo (Dia 2)
        </button>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 border-2 border-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-550" />
          <span>Alimentação atualizada com sucesso no Firestore!</span>
        </div>
      )}

      {/* TAB 1: QUOTES */}
      {activeTab === "quotes" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form to create Quote */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-[#070b13]/60 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[4px_4px_0px_0px_#cbd5e1] dark:shadow-[4px_4px_0px_0px_#1e293b]">
              {readOnly ? (
                <div>
                  <h3 className="text-xs font-display font-black text-slate-800 dark:text-white mb-4 uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2 flex items-center gap-1">
                    <span>🥪</span> Modo de Leitura
                  </h3>
                  <div className="p-3.5 bg-indigo-500/10 border-2 border-indigo-550/25 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold leading-relaxed">
                    Adição, edição e exclusão de orçamentos e do cardápio detalhado é restrita à coordenação CLA. Como assistente ALA, você pode acompanhar e avaliar o andamento financeiro dos fornecedores.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-display font-black text-slate-800 dark:text-white mb-2 uppercase tracking-wider border-b-2 border-slate-100 dark:border-slate-850 pb-2 flex items-center gap-1.5">
                    <span>📋</span> Criar Nova Proposta de Cardápio
                  </h3>
                  
                  {/* Selector for LANCHE or REFEIÇÃO */}
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Tipo de Alimentação Proposta
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProposalType("lanche");
                        }}
                        className={`p-2.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer select-none ${
                          proposalType === "lanche"
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                            : "border-slate-205 dark:border-slate-800 text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span>🥪</span> Lanche
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProposalType("refeicao");
                        }}
                        className={`p-2.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer select-none ${
                          proposalType === "refeicao"
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400"
                            : "border-slate-205 dark:border-slate-800 text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span>🍽️</span> Refeição
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAddQuoteSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Fornecedor / Padaria / Empresa</label>
                      <input
                        type="text"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="Ex: Refeições Comilão Ltda"
                        className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:outline-none text-xs font-semibold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Preço Unitário ({proposalType === "lanche" ? "do Lanche" : "da Refeição"})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-400 dark:text-slate-500">R$</span>
                          {proposalType === "lanche" ? (
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={priceLanche}
                              onChange={(e) => setPriceLanche(Number(e.target.value))}
                              className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-2 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:outline-none text-xs font-mono font-extrabold"
                              required
                            />
                          ) : (
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={priceRefeicao}
                              onChange={(e) => setPriceRefeicao(Number(e.target.value))}
                              className="w-full border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-2 py-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:outline-none text-xs font-mono font-extrabold"
                              required
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 py-1">
                      <input
                        type="checkbox"
                        id="new-quote-nf"
                        checked={hasNf}
                        onChange={(e) => setHasNf(e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 border-2 cursor-pointer"
                      />
                      <label htmlFor="new-quote-nf" className="text-xs text-slate-700 dark:text-slate-350 font-extrabold select-none cursor-pointer">
                        Fornecedor emite Nota Fiscal (NF-e)?
                      </label>
                    </div>

                    {proposalType === "lanche" ? (
                      <div className="border-t pt-3 dark:border-slate-800 space-y-2">
                        <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                          Itens do Cardápio de Lanche 🥪
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newLancheItem}
                            onChange={(e) => setNewLancheItem(e.target.value)}
                            placeholder="Ex: Pão de Batata c/ Presunto"
                            className="flex-1 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:outline-none text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={(e) => { handleAddLancheItem(e); }}
                            className="p-2 py-1 bg-indigo-500 hover:bg-slate-950 text-white rounded-lg text-xs font-bold"
                          >
                            Adicionar
                          </button>
                        </div>
                        
                        {lancheItems.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">Nenhum item do lanche incluído.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-1 bg-white dark:bg-[#101726]/40 border rounded-lg">
                            {lancheItems.map((item, index) => (
                              <span key={index} className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-md border border-indigo-200/30">
                                {item}
                                <button type="button" onClick={() => removeLancheItem(index)} className="text-rose-500 hover:text-rose-700 focus:outline-none">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-t pt-3 dark:border-slate-800 space-y-2">
                        <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                          Itens do Cardápio de Refeição 🍽️
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newRefeicaoItem}
                            onChange={(e) => setNewRefeicaoItem(e.target.value)}
                            placeholder="Ex: Supremo de Frango Recheado"
                            className="flex-1 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 bg-white dark:bg-[#101726] text-slate-900 dark:text-white focus:outline-none text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={(e) => { handleAddRefeicaoItem(e); }}
                            className="p-2 py-1 bg-teal-500 hover:bg-slate-950 text-white rounded-lg text-xs font-bold"
                          >
                            Adicionar
                          </button>
                        </div>

                        {refeicaoItems.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">Nenhum item da refeição incluído.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-1 bg-white dark:bg-[#101726]/40 border rounded-lg">
                            {refeicaoItems.map((item, index) => (
                              <span key={index} className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-bold px-2 py-0.5 rounded-md border border-teal-200/30">
                                {item}
                                <button type="button" onClick={() => removeRefeicaoItem(index)} className="text-rose-500 hover:text-rose-700 focus:outline-none">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-3d btn-3d-secondary rounded-xl w-full py-2.5 flex items-center justify-center gap-1.5 font-extrabold shadow-md mt-4 text-xs uppercase"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>SALVAR COTAÇÃO DE {proposalType === "lanche" ? "LANCHE 🥪" : "REFEIÇÃO 🍽️"}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* List and History of Quotes */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-sm font-display font-black text-slate-850 dark:text-slate-200 uppercase tracking-widest pl-1 border-l-4 border-indigo-500">
                Histórico de Cotações com Cardápios Individuais
              </h3>
              
              {quotes.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-805 rounded-2xl text-center text-slate-400 text-xs font-bold">
                  Nenhuma cotação de preços ou cardápio adicionado até o momento.
                </div>
              ) : (
                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                  {quotes.map((quote, idx) => {
                    const qType = quote.type || "ambos";
                    const lItems = quote.lancheItems || (quote.menu.includes("Lanche:") ? quote.menu.split("Refeição:")[0].replace("Lanche:", "").split(",").map(i => i.trim()).filter(Boolean) : []);
                    const rItems = quote.refeicaoItems || (quote.menu.includes("Refeição:") ? quote.menu.split("Refeição:")[1].split(",").map(i => i.trim()).filter(Boolean) : []);
                    
                    return (
                      <div
                        key={idx}
                        className={`p-5 border-2 rounded-2xl space-y-4 transition shadow-xs ${quote.selected ? "bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500 shadow-md" : "bg-white dark:bg-[#101726]/30 border-slate-200 dark:border-slate-800"}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                <span>{quote.supplier}</span>
                                {qType === "lanche" && (
                                  <span className="text-[9px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200/30">
                                    🥪 LANCHE
                                  </span>
                                )}
                                {qType === "refeicao" && (
                                  <span className="text-[9px] bg-teal-500/15 text-teal-700 dark:text-teal-400 font-extrabold px-2 py-0.5 rounded-full border border-teal-200/30">
                                    🍽️ REFEIÇÃO
                                  </span>
                                )}
                                {qType === "ambos" && (
                                  <span className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350 font-extrabold px-2 py-0.5 rounded-full">
                                    🍔 COMBO AMBOS
                                  </span>
                                )}
                              </h4>
                              {quote.issuesInvoice ? (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/10 flex items-center gap-0.5">
                                  ✓ EMITE NF
                                </span>
                              ) : (
                                <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded-full border border-rose-500/10">
                                  SEM NOTA FISCAL
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-xs font-black font-mono">
                              {qType !== "refeicao" && <span className="text-indigo-650 dark:text-indigo-400">Lanche: R$ {getPriceLanche(quote).toFixed(2)}</span>}
                              {qType !== "lanche" && <span className="text-teal-650 dark:text-teal-400">Refeição: R$ {getPriceRefeicao(quote).toFixed(2)}</span>}
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 rounded-md">Custo Total: R$ {quote.pricePerUnit.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {!quote.selected ? (
                              !readOnly ? (
                                <button
                                  type="button"
                                  onClick={() => selectQuote(idx)}
                                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-300 font-extrabold text-xs px-3 py-1.5 rounded-xl border border-slate-250 dark:border-slate-700 cursor-pointer transition active:scale-95"
                                >
                                  Escolher Esta
                                </button>
                              ) : null
                            ) : (
                              <span className="text-xs bg-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm">
                                <Check className="w-3.5 h-3.5" /> Selecionada e Ativa
                              </span>
                            )}
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removeQuote(idx)}
                                className="text-slate-400 hover:text-rose-500 p-2 transition cursor-pointer"
                                title="Excluir Cotação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Visual Breakdown of items individually */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t dark:border-slate-800">
                          {/* Lanches */}
                          <div className="bg-indigo-500/[0.02] dark:bg-slate-900/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950/40">
                            <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                              <span>🥪</span> Itens do Lanche ({lItems.length})
                            </span>
                            {lItems.length === 0 ? (
                              <span className="text-xs text-slate-400 italic block">Nenhum lanche cadastrado.</span>
                            ) : (
                              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-bold">
                                {lItems.map((item, itemIdx) => (
                                  <li key={itemIdx} className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Refeição */}
                          <div className="bg-teal-500/[0.02] dark:bg-slate-900/40 p-3 rounded-xl border border-teal-100 dark:border-teal-950/40">
                            <span className="text-[10px] font-black text-teal-650 dark:text-teal-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                              <span>🍽️</span> Itens da Refeição ({rItems.length})
                            </span>
                            {rItems.length === 0 ? (
                              <span className="text-xs text-slate-400 italic block">Nenhuma refeição cadastrada.</span>
                            ) : (
                              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-bold">
                                {rItems.map((item, itemIdx) => (
                                  <li key={itemIdx} className="flex items-center gap-1.5 text-slate-850 dark:text-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAY 1 */}
      {activeTab === "day1" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Step 1: Confirmação de chegada de lanches e refeições de forma independente */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs font-display font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b-2 border-slate-100 dark:border-slate-850 pb-2 uppercase tracking-wider">
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                <span>1. Conferência Fervorosa (Lanche vs Refeição)</span>
              </h3>
              
              {/* Lanchinho */}
              <div className="bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <div className="space-y-2 mb-3">
                  <span className="block text-[10px] font-black text-indigo-550 dark:text-indigo-400 uppercase tracking-wider">
                    Remessa 1: Lanches 🥪
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">Confirme quando a remessa matinal de lanches adentrar o portão.</p>
                  <input
                    type="text"
                    placeholder="Nome do Fiscal Auditor"
                    value={day1SnackChecker}
                    onChange={(e) => setDay1SnackChecker(e.target.value)}
                    className="w-full text-xs font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white"
                    disabled={day1SnackArrival || readOnly}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { if (!readOnly) toggleDaySnackArrival(1, day1SnackChecker || "Auditor ALA"); }}
                  disabled={readOnly}
                  className={`w-full py-2 rounded-xl text-[10px] font-black tracking-wider transition uppercase cursor-pointer ${day1SnackArrival ? "bg-indigo-650 text-white hover:bg-indigo-700" : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-400 border border-indigo-500/20"}`}
                >
                  {day1SnackArrival ? "✔ Lanches Conferidos no Prédio" : "Confirmar Recebimento de Lanches"}
                </button>
              </div>

              {/* Almoço / Refeição */}
              <div className="bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <div className="space-y-2 mb-3">
                  <span className="block text-[10px] font-black text-teal-555 dark:text-teal-400 uppercase tracking-wider">
                    Remessa 2: Refeições Completas 🍽️
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">Confirme quando o caminhão de isotérmicos trouxer as refeições quentes.</p>
                  <input
                    type="text"
                    placeholder="Nome do Coordenador de Apoio"
                    value={day1MealChecker}
                    onChange={(e) => setDay1MealChecker(e.target.value)}
                    className="w-full text-xs font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white"
                    disabled={day1MealArrival || readOnly}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { if (!readOnly) toggleDayMealArrival(1, day1MealChecker || "Logística Executiva"); }}
                  disabled={readOnly}
                  className={`w-full py-2 rounded-xl text-[10px] font-black tracking-wider transition uppercase cursor-pointer ${day1MealArrival ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-400 border border-teal-500/20"}`}
                >
                  {day1MealArrival ? "✔ Refeições Conferidas no Prédio" : "Confirmar Recebimento de Refeições"}
                </button>
              </div>
            </div>

            {/* Step 2: Entrega para colaboradores modularizada */}
            <div className="lg:col-span-8 bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b-2 border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-display font-extrabold text-slate-850 dark:text-slate-200 uppercase tracking-widest">
                  2. Checklist de Distribuição Individual de Alimentos
                </h3>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/25">
                    Lanches: {Object.values(day1SnackDeliveries).filter(Boolean).length}/{totalCollaborators}
                  </span>
                  <span className="text-[9px] font-black bg-teal-500/10 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/25">
                    Refeições: {Object.values(day1MealDeliveries).filter(Boolean).length}/{totalCollaborators}
                  </span>
                </div>
              </div>

              {!day1SnackArrival && !day1MealArrival && (
                <div className="bg-amber-500/10 dark:bg-amber-955/20 p-3 rounded-xl border border-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-400 mb-4">
                  Aviso: Realize a recepção de pelo menos uma remessa no painel lateral esquerdo para liberar o checklist individual.
                </div>
              )}

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {collaborators.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8 font-bold">Nenhum colaborador registrado no prédio ainda.</p>
                ) : (
                  collaborators.map((c) => {
                    const restrictionsList = c.foodRestrictions ? c.foodRestrictions.trim() : "";
                    const hasPref = c.snackPreference || "Padrão";
                    
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-slate-50/[0.4] dark:bg-[#070b13]/20 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 hover:bg-slate-100/50 dark:hover:bg-[#070b13]/40 transition"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="font-extrabold text-slate-850 dark:text-white text-xs block truncate">{c.name}</span>
                            <div className="flex gap-2 items-center flex-wrap pt-0.5">
                              <span className="text-[9px] font-mono text-slate-400 uppercase">{c.cpf}</span>
                              <span className="text-[9px] font-mono bg-slate-150 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 rounded">
                                {c.isReserve ? "RESERVA CORREDOR" : (c.assignedRoom || "Sem Sala")}
                              </span>
                              {hasPref !== "Padrão" && (
                                <span className="text-[9px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold px-1 rounded border border-indigo-200/20">
                                  {hasPref}
                                </span>
                              )}
                              {restrictionsList && (
                                <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-1 rounded flex items-center gap-0.5 border border-rose-200/20 animate-pulse">
                                  RESTRIÇÃO: {restrictionsList}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {/* Lanche Toggle button */}
                            <button
                              type="button"
                              onClick={() => { if (!readOnly) toggleDeliveryItem(c.id!, 1, "snack"); }}
                              disabled={!day1SnackArrival || readOnly}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border ${day1SnackDeliveries[c.id!] ? "bg-indigo-600 text-white border-indigo-700" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-indigo-500/10"} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              <span>🥪</span>
                              <span>{day1SnackDeliveries[c.id!] ? "Lanche Entregue ✔" : "Lanche"}</span>
                            </button>

                            {/* Refeição Toggle button */}
                            <button
                              type="button"
                              onClick={() => { if (!readOnly) toggleDeliveryItem(c.id!, 1, "meal"); }}
                              disabled={!day1MealArrival || readOnly}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border ${day1MealDeliveries[c.id!] ? "bg-teal-600 text-white border-teal-750" : "bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-350 hover:bg-teal-500/10"} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              <span>🍽️</span>
                              <span>{day1MealDeliveries[c.id!] ? "Refeição Entregue ✔" : "Refeição"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DAY 2 */}
      {activeTab === "day2" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Step 1: Confirmação de chegada de lanches e refeições de forma independente */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs font-display font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b-2 border-slate-100 dark:border-slate-850 pb-2 uppercase tracking-wider">
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                <span>1. Conferência Fervorosa (Lanche vs Refeição)</span>
              </h3>
              
              {/* Lanchinho */}
              <div className="bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <div className="space-y-2 mb-3">
                  <span className="block text-[10px] font-black text-indigo-555 dark:text-indigo-400 uppercase tracking-wider">
                    Remessa 1: Lanches 🥪
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">Confirme quando a remessa matinal do 2º Domingo adentrar o colégio.</p>
                  <input
                    type="text"
                    placeholder="Nome do Fiscal Auditor"
                    value={day2SnackChecker}
                    onChange={(e) => setDay2SnackChecker(e.target.value)}
                    className="w-full text-xs font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white"
                    disabled={day2SnackArrival || readOnly}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { if (!readOnly) toggleDaySnackArrival(2, day2SnackChecker || "Auditor ALA Dia 2"); }}
                  disabled={readOnly}
                  className={`w-full py-2 rounded-xl text-[10px] font-black tracking-wider transition uppercase cursor-pointer ${day2SnackArrival ? "bg-indigo-650 text-white hover:bg-indigo-700" : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-400 border border-indigo-500/20"}`}
                >
                  {day2SnackArrival ? "✔ Lanches Conferidos no Prédio" : "Confirmar Recebimento de Lanches"}
                </button>
              </div>

              {/* Almoço / Refeição */}
              <div className="bg-slate-50 dark:bg-[#070b13]/60 border-2 border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <div className="space-y-2 mb-3">
                  <span className="block text-[10px] font-black text-teal-555 dark:text-teal-400 uppercase tracking-wider">
                    Remessa 2: Refeições Completas 🍽️
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">Confirme quando o caminhão de isotérmicos trouxer o almoço do 2º Domingo.</p>
                  <input
                    type="text"
                    placeholder="Nome do Coordenador de Apoio"
                    value={day2MealChecker}
                    onChange={(e) => setDay2MealChecker(e.target.value)}
                    className="w-full text-xs font-semibold border-2 border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-[#101726] text-slate-900 dark:text-white"
                    disabled={day2MealArrival || readOnly}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { if (!readOnly) toggleDayMealArrival(2, day2MealChecker || "Logística Executiva Dia 2"); }}
                  disabled={readOnly}
                  className={`w-full py-2 rounded-xl text-[10px] font-black tracking-wider transition uppercase cursor-pointer ${day2MealArrival ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-400 border border-teal-500/20"}`}
                >
                  {day2MealArrival ? "✔ Refeições Conferidas no Prédio" : "Confirmar Recebimento de Refeições"}
                </button>
              </div>
            </div>

            {/* Step 2: Entrega para colaboradores modularizada */}
            <div className="lg:col-span-8 bg-white dark:bg-[#0c1220] border-2 border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b-2 border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-display font-extrabold text-slate-850 dark:text-slate-200 uppercase tracking-widest">
                  2. Checklist de Distribuição Individual de Alimentos
                </h3>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/25">
                    Lanches: {Object.values(day2SnackDeliveries).filter(Boolean).length}/{totalCollaborators}
                  </span>
                  <span className="text-[9px] font-black bg-teal-500/10 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/25">
                    Refeições: {Object.values(day2MealDeliveries).filter(Boolean).length}/{totalCollaborators}
                  </span>
                </div>
              </div>

              {!day2SnackArrival && !day2MealArrival && (
                <div className="bg-amber-500/10 dark:bg-amber-955/20 p-3 rounded-xl border border-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-400 mb-4">
                  Aviso: Realize a recepção de pelo menos uma remessa no painel lateral esquerdo para liberar o checklist individual.
                </div>
              )}

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {collaborators.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8 font-bold">Nenhum colaborador registrado no prédio ainda.</p>
                ) : (
                  collaborators.map((c) => {
                    const restrictionsList = c.foodRestrictions ? c.foodRestrictions.trim() : "";
                    const hasPref = c.snackPreference || "Padrão";
                    
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-slate-50/[0.4] dark:bg-[#070b13]/20 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 hover:bg-slate-100/50 dark:hover:bg-[#070b13]/40 transition"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="font-extrabold text-slate-850 dark:text-white text-xs block truncate">{c.name}</span>
                            <div className="flex gap-2 items-center flex-wrap pt-0.5">
                              <span className="text-[9px] font-mono text-slate-400 uppercase">{c.cpf}</span>
                              <span className="text-[9px] font-mono bg-slate-150 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 rounded">
                                {c.isReserve ? "RESERVA CORREDOR" : (c.assignedRoom || "Sem Sala")}
                              </span>
                              {hasPref !== "Padrão" && (
                                <span className="text-[9px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold px-1 rounded border border-indigo-200/20">
                                  {hasPref}
                                </span>
                              )}
                              {restrictionsList && (
                                <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-1 rounded flex items-center gap-0.5 border border-rose-200/20 animate-pulse">
                                  RESTRIÇÃO: {restrictionsList}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {/* Lanche Toggle button */}
                            <button
                              type="button"
                              onClick={() => { if (!readOnly) toggleDeliveryItem(c.id!, 2, "snack"); }}
                              disabled={!day2SnackArrival || readOnly}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border ${day2SnackDeliveries[c.id!] ? "bg-indigo-650 text-white border-indigo-700" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-indigo-500/10"} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              <span>🥪</span>
                              <span>{day2SnackDeliveries[c.id!] ? "Lanche Entregue ✓" : "Lanche"}</span>
                            </button>

                            {/* Refeição Toggle button */}
                            <button
                              type="button"
                              onClick={() => { if (!readOnly) toggleDeliveryItem(c.id!, 2, "meal"); }}
                              disabled={!day2MealArrival || readOnly}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border ${day2MealDeliveries[c.id!] ? "bg-teal-600 text-white border-teal-750" : "bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-350 hover:bg-teal-500/10"} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              <span>🍽️</span>
                              <span>{day2MealDeliveries[c.id!] ? "Refeição Entregue ✓" : "Refeição"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
