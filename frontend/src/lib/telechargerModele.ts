import { getToken } from "@/services/authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Télécharge un modèle Excel d'import généré par le serveur (même colonnes que celles lues à l'import).
async function telecharger(chemin: string, nomFichier: string): Promise<void> {
  const token = getToken();
  const reponse = await fetch(`${API_BASE_URL}${chemin}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!reponse.ok) {
    throw new Error(reponse.status === 403 ? "Action réservée à l'Admin RH." : "Impossible de télécharger le modèle.");
  }
  const contenu = await reponse.blob();
  if (contenu.size === 0) {
    throw new Error("Le serveur a renvoyé un fichier vide. Redémarrez le serveur puis réessayez.");
  }
  // Un classeur .xlsx est une archive ZIP : il commence par « PK ». Sinon le serveur a renvoyé autre chose (page d'erreur…)
  const debut = await contenu.slice(0, 2).text();
  if (debut !== "PK") {
    throw new Error("Le serveur n'a pas renvoyé un fichier Excel valide. Redémarrez le serveur puis réessayez.");
  }
  // Type explicite : le navigateur enregistre un vrai fichier .xlsx
  const url = URL.createObjectURL(new Blob([contenu], { type: TYPE_XLSX }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // Ne pas libérer l'adresse tout de suite : Chrome enregistrerait alors un fichier vide
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const telechargerModeleSalaries = () => telecharger("/salaries/modele-import", "modele-import-salaries.xlsx");
export const telechargerModeleResponsables = () => telecharger("/responsables/modele-import", "modele-import-responsables.xlsx");
