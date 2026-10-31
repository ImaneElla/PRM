"use client";

import React from "react";
import { ExternalLink, Star, X } from "lucide-react";
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

const DECISIONS: Record<string, string> = {
  CONFIRMATION: "Titularisation",
  VALIDATION: "Titularisation",
  TITULARISATION: "Titularisation",
  RENOUVELLEMENT: "Renouvellement",
  RUPTURE: "Arrêt de contrat",
};

// Style sobre : texte, traits fins et une seule teinte
const etiquette = "text-xs text-[#6E6E73]";

// Cinq étoiles : pleines selon la note (arrondie), vides ensuite
export function Etoiles({ note }: { note: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(note) ? "fill-[#1D1D1F] text-[#1D1D1F]" : "fill-transparent text-[#C7C7CC]"}`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export function Jauge({ note }: { note: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[#E8E8ED]">
      <div className="h-full rounded-full bg-[#1D1D1F]" style={{ width: `${Math.max(0, Math.min(100, (note / 5) * 100))}%` }} />
    </div>
  );
}

export default function BilanFormulaireCard({ titre, nom, echeance, evaluation, onClose, onOpenFormulaire, embedded = false, footer }: BilanFormulaireCardProps) {
  const form = evaluation?.donneesFormulaireComplet;
  const pointsForts = form?.pointsForts || evaluation?.pointsForts;
  const axes = form?.axesAmelioration || evaluation?.axesAmelioration;

  const criteres = evaluation
    ? [
        { libelle: "Compétences métiers", note: Number(evaluation.competencesTechniques) },
        { libelle: "Intégration d'équipe", note: Number(evaluation.integrationEquipe) },
        { libelle: "Autonomie / QSE", note: Number(evaluation.autonomieRigueur) },
      ]
    : [];
  const noteGlobale = criteres.length
    ? Math.round((criteres.reduce((somme, c) => somme + c.note, 0) / criteres.length) * 10) / 10
    : null;
  const decision = evaluation ? DECISIONS[evaluation.recommandation] ?? "Renouvellement" : null;

  const corps = evaluation ? (
    <div className="divide-y divide-[#E8E8ED]">
      {/* Note globale */}
      <div className="flex items-center justify-between py-4 first:pt-0">
        <div className="space-y-1.5">
          <span className="block text-sm text-[#1D1D1F]">Note globale</span>
          <Etoiles note={noteGlobale ?? 0} />
        </div>
        <span className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">
          {noteGlobale}
          <span className="ml-1 text-base font-normal text-[#86868B]">/ 5</span>
        </span>
      </div>

      {/* Critères */}
      <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-3">
        {criteres.map(({ libelle, note }) => (
          <div key={libelle} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className={etiquette}>{libelle}</span>
              <span className="text-sm font-medium text-[#1D1D1F]">{note} / 5</span>
            </div>
            <Jauge note={note} />
          </div>
        ))}
      </div>

      {/* Avis */}
      {evaluation.avisResponsable && (
        <div className="space-y-1 py-4">
          <p className={etiquette}>Avis du responsable</p>
          <p className="text-sm text-[#1D1D1F]">« {evaluation.avisResponsable} »</p>
        </div>
      )}

      {(pointsForts || axes) && (
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          {pointsForts && (
            <div className="space-y-1">
              <p className={etiquette}>Points forts</p>
              <p className="whitespace-pre-line text-sm text-[#1D1D1F]">{pointsForts}</p>
            </div>
          )}
          {axes && (
            <div className="space-y-1">
              <p className={etiquette}>Axes d&apos;amélioration</p>
              <p className="whitespace-pre-line text-sm text-[#1D1D1F]">{axes}</p>
            </div>
          )}
        </div>
      )}

      {/* Décision */}
      {/* La décision à gauche, le bouton en face à droite */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <div className="text-sm">
          <span className={etiquette}>Décision proposée : </span>
          <span className={`font-semibold ${decision === "Arrêt de contrat" ? "text-[#E4002B]" : "text-[#1F9D55]"}`}>{decision}</span>
        </div>
        {footer ?? (
          <button
            type="button"
            onClick={() => onOpenFormulaire?.()}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#E8E8ED] px-4 py-1.5 text-xs font-medium text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir le formulaire complet
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm text-[#6E6E73]">Ce bilan n&apos;a pas encore été rempli par le responsable.</p>
      <button
        type="button"
        onClick={() => onOpenFormulaire?.()}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E8E8ED] px-4 py-1.5 text-xs font-medium text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Ouvrir le formulaire
      </button>
    </div>
  );

  if (embedded) return corps;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-xl">
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-[#E8E8ED] pb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">{titre}</h3>
          <p className="mt-0.5 text-xs text-[#6E6E73]">
            {nom}
            {echeance && ` · Échéance ${formatDate(echeance)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          aria-label="Fermer"
          className="cursor-pointer rounded-full p-1.5 text-[#6E6E73] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      {corps}
    </section>
  );
}
