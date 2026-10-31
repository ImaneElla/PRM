"use client";

import React from "react";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
  Star,
  Quote,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { EvaluationDetail } from "@/types";

interface BilanFormulaireCardProps {
  titre: string;
  nom: string;
  echeance?: string;
  evaluation?: EvaluationDetail;
  onClose?: () => void;
  onOpenFormulaire?: () => void;
  // Intégré dans la carte d'un écran : seulement le corps, sans en-tête ni cadre propres
  embedded?: boolean;
  // Remplace le bouton « Ouvrir le formulaire complet »
  footer?: React.ReactNode;
}

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const [a, m, j] = iso.split("T")[0].split("-");
  return a && m && j ? `${j}/${m}/${a}` : iso;
};

// Couleur de la barre selon la note sur 5
const couleurNote = (note: number) =>
  note >= 4 ? "from-emerald-400 to-emerald-500" : note >= 3 ? "from-amber-400 to-orange-400" : "from-rose-400 to-red-500";

const DECISIONS: Record<string, { label: string; detail: string; icone: React.ElementType; style: string; pastille: string }> = {
  CONFIRMATION: {
    label: "Titularisation",
    detail: "Le responsable recommande de confirmer le salarié.",
    icone: CheckCircle2,
    style: "from-emerald-50 to-white border-emerald-200/70",
    pastille: "bg-emerald-500 text-white shadow-emerald-500/30",
  },
  RENOUVELLEMENT: {
    label: "Renouvellement",
    detail: "Le responsable recommande de prolonger la période d'essai.",
    icone: RefreshCw,
    style: "from-blue-50 to-white border-blue-200/70",
    pastille: "bg-blue-500 text-white shadow-blue-500/30",
  },
  RUPTURE: {
    label: "Arrêt de contrat",
    detail: "Le responsable recommande de mettre fin à la période d'essai.",
    icone: XCircle,
    style: "from-rose-50 to-white border-rose-200/70",
    pastille: "bg-red-500 text-white shadow-red-500/30",
  },
};
DECISIONS.VALIDATION = DECISIONS.CONFIRMATION;
DECISIONS.TITULARISATION = DECISIONS.CONFIRMATION;

export default function BilanFormulaireCard({ titre, nom, echeance, evaluation, onClose, onOpenFormulaire, embedded = false, footer }: BilanFormulaireCardProps) {
  const form = evaluation?.donneesFormulaireComplet;
  const pointsForts = form?.pointsForts || evaluation?.pointsForts;
  const axes = form?.axesAmelioration || evaluation?.axesAmelioration;

  const criteres = evaluation
    ? [
        { libelle: "Compétences métiers", note: evaluation.competencesTechniques, icone: Briefcase },
        { libelle: "Intégration d'équipe", note: evaluation.integrationEquipe, icone: Users },
        { libelle: "Autonomie / QSE", note: evaluation.autonomieRigueur, icone: ShieldCheck },
      ]
    : [];
  const noteGlobale = criteres.length
    ? Math.round((criteres.reduce((somme, c) => somme + Number(c.note), 0) / criteres.length) * 10) / 10
    : null;
  const decision = evaluation ? DECISIONS[evaluation.recommandation] ?? DECISIONS.RENOUVELLEMENT : null;

  return (
    <section className={embedded ? "" : "overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]"}>
      {/* En-tête */}
      {!embedded && (
      <header className="relative overflow-hidden border-b border-[#E8E8ED]/70 bg-gradient-to-br from-[#FFF5F7] via-white to-[#F5F7FF] px-7 pb-6 pt-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#E4002B]/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E4002B] to-[#B80022] text-white shadow-lg shadow-[#E4002B]/25">
              <FileText className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E4002B]">Bilan / Formulaire</p>
              <h3 className="text-[22px] font-semibold leading-tight tracking-tight text-[#1D1D1F]">{titre}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#6E6E73]">
                <span className="font-medium text-[#1D1D1F]">{nom}</span>
                {echeance && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#E8E8ED] bg-white/80 px-2.5 py-0.5">
                    <CalendarDays className="h-3 w-3" />
                    Échéance {formatDate(echeance)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Fermer"
            className="cursor-pointer rounded-full border border-[#E8E8ED] bg-white/80 p-2 text-[#6E6E73] transition hover:bg-white hover:text-[#1D1D1F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>
      )}

      {evaluation ? (
        <div className={embedded ? "space-y-5 pt-1" : "space-y-5 px-7 py-6"}>
          {/* Note globale */}
          <div className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-white to-white p-4 shadow-[0_2px_12px_rgba(245,158,11,0.08)]">
            <div>
              <p className="text-xs font-medium text-[#6E6E73]">Note globale d&apos;évaluation</p>
              <div className="mt-1 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${noteGlobale !== null && i <= Math.round(noteGlobale) ? "fill-amber-400 text-amber-400" : "fill-[#E8E8ED] text-[#E8E8ED]"}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              {noteGlobale}
              <span className="ml-1 text-lg font-medium text-[#86868B]">/ 5</span>
            </p>
          </div>

          {/* Critères */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {criteres.map(({ libelle, note, icone: Icone }) => (
              <div key={libelle} className="rounded-2xl border border-[#E8E8ED] bg-gradient-to-b from-white to-[#F8F8FA] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0F0F5] text-[#515154]">
                    <Icone className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-lg font-semibold text-[#1D1D1F]">
                    {note}
                    <span className="text-xs font-medium text-[#86868B]"> / 5</span>
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium text-[#6E6E73]">{libelle}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8E8ED]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${couleurNote(Number(note))}`}
                    style={{ width: `${Math.max(0, Math.min(100, (Number(note) / 5) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Avis du responsable */}
          {evaluation.avisResponsable && (
            <div className="relative rounded-2xl border border-[#E8E8ED] bg-gradient-to-br from-[#F8F8FA] to-white p-5">
              <Quote className="absolute right-4 top-4 h-6 w-6 text-[#E4002B]/15" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868B]">Avis du responsable</p>
              <p className="mt-2 text-[15px] italic leading-relaxed text-[#1D1D1F]">« {evaluation.avisResponsable} »</p>
            </div>
          )}

          {(pointsForts || axes) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pointsForts && (
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Points forts</p>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-[#1D1D1F]">{pointsForts}</p>
                </div>
              )}
              {axes && (
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Axes d&apos;amélioration</p>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-[#1D1D1F]">{axes}</p>
                </div>
              )}
            </div>
          )}

          {/* Décision proposée */}
          {decision && (
            <div className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-r p-4 ${decision.style}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-lg ${decision.pastille}`}>
                <decision.icone className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868B]">Décision proposée</p>
                <p className="text-lg font-semibold leading-tight text-[#1D1D1F]">{decision.label}</p>
                <p className="mt-0.5 text-xs text-[#6E6E73]">{decision.detail}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            {footer ?? (
              <button
                type="button"
                onClick={() => onOpenFormulaire?.()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-b from-[#F0173F] to-[#C8002A] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(228,0,43,0.3)] transition hover:brightness-105 active:scale-[0.98]"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
                Ouvrir le formulaire complet
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-7 py-8 text-center">
          <p className="text-sm text-[#6E6E73]">Ce bilan n&apos;a pas encore été rempli par le responsable.</p>
          <button
            type="button"
            onClick={() => onOpenFormulaire?.()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-b from-[#F0173F] to-[#C8002A] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(228,0,43,0.3)]"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir le formulaire
          </button>
        </div>
      )}
    </section>
  );
}
