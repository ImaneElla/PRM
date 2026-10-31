"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Eye, X, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getAuthUser } from "@/services/authService";
import { PeriodeEvaluation } from "@/types";
import BilanFormulaireCard from "./BilanFormulaireCard";
import AIAnalysisModule, { EvaluationData } from "@/components/screens/AIAnalysisModule";
import { aptitudesPersoItems, competencesProItems, qseItems } from "@/lib/evaluationCriteria";

interface ConsulterBoutonProps {
  periode?: PeriodeEvaluation | null;
  periodeId?: number;
  salarieId?: number;
  salarieNom?: string;
  className?: string;
  size?: "sm" | "default";
  variant?: "outline" | "solid";
  // Ce que la fenêtre affiche : le bilan / formulaire seul, ou l'analyse IA seule
  cible?: "bilan" | "analyse";
}

function buildCriteria(
  items: { id: string; label: string }[],
  scores: Record<string, number> = {},
  comments: Record<string, string> = {}
) {
  return items.map((item) => ({
    nom: item.label,
    note: scores[item.id] === undefined ? "Non évalué" : `${scores[item.id]}/5`,
    commentaire: comments[item.id] ?? "",
  }));
}


export default function ConsulterBouton({
  periode,
  periodeId,
  salarieId,
  salarieNom,
  className = "",
  size = "sm",
  variant = "outline",
  cible = "bilan"
}: ConsulterBoutonProps) {
  const { periodes, allPeriodes, evaluations, navigateTo, saveAIAnalysis } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Résolution de la période et du salarié consultés
  const effectiveSalarieId = periode?.salarieId || salarieId;
  const effectivePeriode =
    periode ||
    (periodeId ? periodes.find((p) => p.id === periodeId) || allPeriodes?.find((p) => p.id === periodeId) : null) ||
    (effectiveSalarieId ? periodes.find((p) => p.salarieId === effectiveSalarieId) || allPeriodes?.find((p) => p.salarieId === effectiveSalarieId) : null);

  const effectivePeriodeId = effectivePeriode?.id || periodeId;
  const displayName = effectivePeriode?.salarieNom || salarieNom || "Collaborateur";

  // Le bilan consulté : sa propre évaluation, jamais celle d'un autre bilan
  const evaluation = effectivePeriodeId ? evaluations.find((e) => e.periodeId === effectivePeriodeId) : undefined;
  const form = evaluation?.donneesFormulaireComplet;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const ouvrirFormulaire = () => {
    setIsOpen(false);
    if (effectivePeriodeId) {
      navigateTo("formulaire-evaluation", { periodeId: effectivePeriodeId });
    } else if (effectiveSalarieId) {
      navigateTo("detail-salarie", { salarieId: effectiveSalarieId });
    }
  };

  // Données de l'analyse : construites uniquement à partir de l'évaluation de ce bilan
  const donneesAnalyse: EvaluationData | null = evaluation
    ? {
        salarieName: displayName,
        poste: form?.poste || effectivePeriode?.salariePoste || "Poste non renseigné",
        criteres: form
          ? [
              ...buildCriteria(competencesProItems, form.scoresCompetences, form.commentairesCompetences),
              ...buildCriteria(aptitudesPersoItems, form.scoresAptitudes, form.commentairesAptitudes),
              ...buildCriteria(qseItems, form.scoresQSE, form.commentairesQSE),
            ]
          : [
              { nom: "Compétences métiers", note: `${evaluation.competencesTechniques}/5`, commentaire: "" },
              { nom: "Intégration d'équipe", note: `${evaluation.integrationEquipe}/5`, commentaire: "" },
              { nom: "Autonomie / QSE", note: `${evaluation.autonomieRigueur}/5`, commentaire: "" },
              { nom: "Évaluation globale", note: `${evaluation.atteinteObjectifs}/5`, commentaire: "" },
            ],
        appreciationGenerale:
          [form?.appreciationGenerale, form?.commentairesObjectifs, evaluation.avisResponsable].filter(Boolean).join("\n") ||
          "Bilan professionnel de la période.",
        pointsForts: form?.pointsForts || evaluation.pointsForts,
        axesAmelioration: form?.axesAmelioration || evaluation.axesAmelioration,
        donneesAnalyseAI: evaluation.donneesAnalyseAI || effectivePeriode?.donneesAnalyseAI,
      }
    : null;

  const typeBilan = effectivePeriode?.typePeriode === "SIX_MOIS" || effectivePeriode?.numeroPeriode === 2 ? "Bilan 6 mois" : "Bilan 3 mois";

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-200 cursor-pointer select-none ${
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-8 px-3 text-xs"
        } ${
          variant === "solid"
            ? "bg-[#E4002B] text-white hover:bg-[#CC0027] border border-[#CC0027]"
            : "bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] border border-[#E8E8ED] hover:border-[#1D1D1F]/20"
        }`}
        title={cible === "analyse" ? "Consulter l'analyse IA" : "Consulter le bilan"}
      >
        <Eye className="w-3.5 h-3.5 text-[#6E6E73]" />
        <span>Consulter</span>
      </button>

      {isOpen && mounted && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex overflow-hidden bg-zinc-900/40 p-4 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="m-auto max-h-full w-full max-w-3xl space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {cible === "bilan" && (
                <BilanFormulaireCard
                  titre={typeBilan}
                  nom={displayName}
                  echeance={effectivePeriode?.dateEcheance}
                  evaluation={evaluation}
                  onClose={() => setIsOpen(false)}
                  onOpenFormulaire={ouvrirFormulaire}
                />
              )}

              {/* Card Analyse IA : uniquement l'analyse, liée aux données de ce bilan */}
              {cible === "analyse" && getAuthUser()?.role === "ADMIN_RH" && (donneesAnalyse && effectivePeriodeId ? (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      aria-label="Fermer"
                      className="cursor-pointer rounded-full bg-white p-1.5 text-[#6E6E73] shadow-md hover:bg-[#F5F5F7]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <AIAnalysisModule
                    key={effectivePeriodeId}
                    data={donneesAnalyse}
                    onSaveAnalysis={(resultat) => saveAIAnalysis(effectivePeriodeId, resultat)}
                  />
                </div>
              ) : (
                <section className="rounded-[20px] border border-dashed border-[#E8E8ED] bg-white p-6 text-xs text-[#6E6E73] shadow-2xl">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-semibold text-[#1D1D1F]">
                      <Sparkles className="h-4 w-4 text-[#E4002B]" /> Analyse IA · {typeBilan}
                    </p>
                    <button type="button" onClick={() => setIsOpen(false)} aria-label="Fermer" className="cursor-pointer rounded-lg p-1.5 hover:bg-[#F5F5F7]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1">Disponible dès que le responsable a rempli ce bilan.</p>
                </section>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
