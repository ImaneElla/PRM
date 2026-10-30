"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Lien reçu par e-mail : on mémorise le jeton puis on passe par le tableau de bord, qui redirige vers la
// connexion si besoin. Une fois connecté, le tableau de bord ouvre directement le bon formulaire.
const EVALUATION_EN_ATTENTE_KEY = "gp_pending_evaluation"; // lue par DashboardApp

export default function LienEvaluationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();

  useEffect(() => {
    try {
      sessionStorage.setItem(EVALUATION_EN_ATTENTE_KEY, String(params.token));
    } catch {
      // Stockage indisponible : l'utilisateur retrouvera sa liste d'évaluations à faire
    }
    router.replace("/dashboard");
  }, [params.token, router]);

  return null;
}
