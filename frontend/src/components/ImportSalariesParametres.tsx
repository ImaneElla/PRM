"use client";

import { useState } from "react";
import { useApp } from "../context/AppContext";
import { exporterSalariesExcel, telechargerModeleSalaries } from "@/lib/telechargerModele";

const COLONNES = [
  "Matricule", "Nom et prénom (ou nom + prénom)", "Poste", "Responsable", "Date d'embauche",
  "Dates d'envoi et de fin des périodes 1 et 2", "Validation période d'essai", "Date d'effet",
  "Axes d'amélioration", "Accompagnement manager / RH",
];

const BOUTON_ROUGE = "btn-gardient cursor-pointer rounded-xl px-4 py-2 text-[14px] font-medium text-white disabled:opacity-60";

// Modèle d'import et export Excel de la liste des salariés (l'import lui-même se fait depuis la page « Salariés »)
export default function ImportSalariesParametres() {
  const { showToast } = useApp();

  // Export des salariés réellement enregistrés (différent du modèle, qui ne contient que les en-têtes)
  const [exportEnCours, setExportEnCours] = useState(false);
  const exporter = async () => {
    setExportEnCours(true);
    try {
      const nombre = await exporterSalariesExcel();
      showToast(nombre === 0 ? "Aucun salarié actif à exporter." : `${nombre} salarié${nombre > 1 ? "s exportés" : " exporté"} dans le fichier Excel.`);
    } catch (erreur) {
      showToast(erreur instanceof Error ? erreur.message : "Impossible d'exporter les salariés.");
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="px-4 text-[13px] font-medium text-[#6E6E73]">Import de la liste des salariés</h3>
      <div className="space-y-4 rounded-[20px] border border-black/[0.06] bg-white/80 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-[14px] leading-snug text-[#1D1D1F]">
          Importez votre fichier Excel (.xlsx) depuis la page « Salariés » : chaque ligne crée un salarié avec son suivi de période d&apos;essai.
        </p>
        <p className="text-[12px] leading-snug text-[#6E6E73]">
          Colonnes reconnues : {COLONNES.join(", ")}. Le matricule, l&apos;e-mail et la société sont déduits si absents ;
          le responsable doit déjà exister dans « Gestion des responsables ». Aucun e-mail n&apos;est envoyé pendant l&apos;import ;
          une ligne en erreur n&apos;empêche pas l&apos;import des autres (500 lignes maximum).
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => telechargerModeleSalaries().catch((err) => showToast(err instanceof Error ? err.message : "Impossible de télécharger le modèle."))}
            className={BOUTON_ROUGE}
          >
            Télécharger le modèle vide
          </button>
          <button
            type="button"
            disabled={exportEnCours}
            onClick={exporter}
            title="Fichier Excel avec les salariés actifs enregistrés dans l'application"
            className={BOUTON_ROUGE}
          >
            {exportEnCours ? "Export en cours..." : "Exporter les salariés (Excel)"}
          </button>
        </div>
      </div>
    </section>
  );
}
