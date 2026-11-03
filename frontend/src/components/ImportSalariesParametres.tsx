"use client";

import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { telechargerModeleSalaries } from "@/lib/telechargerModele";
import type { ImportSalarieResult } from "../services/salarieService";

const COLONNES = [
  "Matricule", "Nom et prénom (ou nom + prénom)", "Poste", "Responsable", "Date d'embauche",
  "Dates d'envoi et de fin des périodes 1 et 2", "Validation période d'essai", "Date d'effet",
  "Axes d'amélioration", "Accompagnement manager / RH",
];

// Import de la liste des salariés avec le suivi de leur période d'essai (fichier Excel de la RH)
export default function ImportSalariesParametres() {
  const { importerSalaries, showToast } = useApp();
  const [resultats, setResultats] = useState<ImportSalarieResult[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const fichierRef = useRef<HTMLInputElement>(null);

  const importer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de réimporter le même fichier
    if (!fichier) return;
    setEnCours(true);
    try {
      setResultats(await importerSalaries(fichier));
    } catch (erreur) {
      showToast(erreur instanceof Error ? erreur.message : "Impossible d'importer le fichier.");
    } finally {
      setEnCours(false);
    }
  };

  const nb = (statut: string) => resultats?.filter((r) => r.statut === statut).length ?? 0;

  return (
    <section className="space-y-3">
      <h3 className="px-4 text-[13px] font-medium text-[#6E6E73]">Import de la liste des salariés</h3>
      <div className="space-y-4 rounded-[20px] border border-black/[0.06] bg-white/80 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-[14px] leading-snug text-[#1D1D1F]">
          Importez votre fichier Excel (.xlsx) : chaque ligne crée un salarié avec son suivi de période d&apos;essai.
        </p>
        <p className="text-[12px] leading-snug text-[#6E6E73]">
          Colonnes reconnues : {COLONNES.join(", ")}. Le matricule, l&apos;e-mail et la société sont déduits si absents ;
          le responsable doit déjà exister dans « Gestion des responsables ». Aucun e-mail n&apos;est envoyé pendant l&apos;import ;
          une ligne en erreur n&apos;empêche pas l&apos;import des autres (500 lignes maximum).
        </p>

        <input ref={fichierRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importer} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enCours}
            onClick={() => fichierRef.current?.click()}
            className="btn-gardient cursor-pointer rounded-xl px-4 py-2 text-[14px] font-medium text-white disabled:opacity-60"
          >
            {enCours ? "Import en cours..." : "Choisir un fichier Excel"}
          </button>
          <button
            type="button"
            onClick={() => telechargerModeleSalaries().catch((err) => showToast(err instanceof Error ? err.message : "Impossible de télécharger le modèle."))}
            className="cursor-pointer rounded-xl border border-black/[0.08] px-4 py-2 text-[14px] font-medium text-[#1D1D1F] hover:bg-black/[0.03]"
          >
            Télécharger le modèle
          </button>
        </div>

        {resultats && (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-[#1D1D1F]">
              {nb("CREE")} créé(s) · {nb("IGNORE")} ignoré(s) · {nb("ERREUR")} en erreur
            </p>
            <div className="max-h-80 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-[#E8E8ED]">
              {resultats.map((r, index) => (
                <div key={`${r.ligne ?? ""}-${r.email ?? index}`} className="flex items-start justify-between gap-3 p-3 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#1D1D1F]">
                      {r.ligne ? <span className="font-normal text-[#6E6E73]">Ligne {r.ligne} · </span> : null}
                      {r.nomComplet || "—"}
                    </p>
                    {r.message && <p className="mt-0.5 text-[11px] text-[#6E6E73]">{r.message}</p>}
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                      r.statut === "CREE"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : r.statut === "IGNORE"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {r.statut === "CREE" ? "Créé" : r.statut === "IGNORE" ? "Ignoré" : "Erreur"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
