import { getToken } from "@/services/authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Télécharge un modèle Excel d'import généré par le serveur (même colonnes que celles lues à l'import).
async function telecharger(chemin: string, nomFichier: string): Promise<void> {
  const token = getToken();
  const reponse = await fetch(`${API_BASE_URL}${chemin}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!reponse.ok) {
    throw new Error(reponse.status === 403 ? "Action réservée à l'Admin RH." : "Impossible de télécharger le modèle.");
  }
  const url = URL.createObjectURL(await reponse.blob());
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

export const telechargerModeleSalaries = () => telecharger("/salaries/modele-import", "modele-import-salaries.xlsx");
export const telechargerModeleResponsables = () => telecharger("/responsables/modele-import", "modele-import-responsables.xlsx");
