"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/services/authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Caches de données conservés dans le navigateur (l'interface) : supprimés avec la base
const CLES_CACHE = [
  "gp_salaries", "gp_periodes", "gp_evaluations", "gp_emails", "gp_notifications",
  "gp_responsables", "gp_directions", "gp_users", "gp_ai_analyses",
];

function entetes(): Record<string, string> {
  const token = getToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// OUTIL TEMPORAIRE : visible seulement si le serveur a ALLOW_DATA_RESET=true. À retirer avant la mise en production.
export default function OutilViderDonnees() {
  const [actif, setActif] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let annule = false;
    fetch(`${API_BASE_URL}/outils/donnees/etat`, { headers: entetes(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { actif: false }))
      .then((d) => { if (!annule) setActif(d.actif === true); })
      .catch(() => {});
    return () => { annule = true; };
  }, []);

  if (!actif) return null;

  const vider = async () => {
    const saisie = window.prompt(
      "ATTENTION : cette action supprime DÉFINITIVEMENT tous les salariés, périodes, évaluations, e-mails, notifications, " +
      "responsables (et leurs comptes) de la base, ainsi que les données gardées dans ce navigateur.\n\n" +
      "Les comptes Admin RH, les modèles d'e-mail et les paramètres sont conservés.\n\nTapez VIDER pour confirmer :"
    );
    if (saisie === null) return;
    setEnCours(true);
    setMessage("");
    try {
      const reponse = await fetch(`${API_BASE_URL}/outils/donnees/vider`, {
        method: "POST",
        headers: entetes(),
        body: JSON.stringify({ confirmation: saisie.trim() }),
      });
      if (!reponse.ok) {
        const texte = await reponse.text();
        let detail = texte;
        try { detail = JSON.parse(texte).message || texte; } catch { /* texte brut */ }
        throw new Error(detail || `Erreur ${reponse.status}`);
      }
      try { CLES_CACHE.forEach((cle) => localStorage.removeItem(cle)); } catch { /* stockage indisponible */ }
      window.location.reload();
    } catch (erreur) {
      setMessage(erreur instanceof Error ? erreur.message : "Impossible de vider les données.");
      setEnCours(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/60 p-4">
      <p className="text-[13px] font-semibold text-red-800">Outil temporaire — réservé au développement</p>
      <p className="mt-1 text-[12px] text-red-700">
        Vide la base de données (salariés, périodes, évaluations, e-mails, notifications, responsables) et les données
        gardées dans ce navigateur. Les comptes Admin RH, les modèles d&apos;e-mail et les paramètres sont conservés.
      </p>
      <button
        type="button"
        onClick={vider}
        disabled={enCours}
        className="mt-3 cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {enCours ? "Suppression en cours…" : "Vider les données (base + interface)"}
      </button>
      {message && <p role="alert" className="mt-2 text-[12px] font-medium text-red-700">{message}</p>}
    </div>
  );
}
