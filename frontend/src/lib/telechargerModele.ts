import { getToken } from "@/services/authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Récupère un classeur Excel généré par le serveur et vérifie qu'il s'agit bien d'un vrai .xlsx
async function recupererExcel(chemin: string, messageErreur: string): Promise<{ contenu: Blob; reponse: Response }> {
  const token = getToken();
  const reponse = await fetch(`${API_BASE_URL}${chemin}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!reponse.ok) {
    throw new Error(reponse.status === 403 ? "Action réservée à l'Admin RH." : messageErreur);
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
  return { contenu, reponse };
}

function enregistrer(contenu: Blob, nomFichier: string): void {
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

// Modèle d'import : uniquement les en-têtes de colonnes à remplir (ce n'est PAS un export des données)
async function telechargerModele(chemin: string, nomFichier: string): Promise<void> {
  const { contenu } = await recupererExcel(chemin, "Impossible de télécharger le modèle.");
  enregistrer(contenu, nomFichier);
}

export const telechargerModeleSalaries = () => telechargerModele("/salaries/modele-import", "modele-import-salaries.xlsx");
export const telechargerModeleResponsables = () => telechargerModele("/responsables/modele-import", "modele-import-responsables.xlsx");

/* Export des salariés réellement enregistrés en base. Renvoie le nombre de salariés exportés (0 : rien n'est téléchargé). */
export async function exporterSalariesExcel(inclureInactifs = false): Promise<number> {
  const { contenu, reponse } = await recupererExcel(
    `/salaries/export?inclureInactifs=${inclureInactifs}`,
    "Impossible d'exporter les salariés."
  );
  const nombre = Number(reponse.headers.get("X-Nombre-Salaries") ?? "-1");
  if (nombre === 0) return 0;
  const nomServeur = /filename="?([^";]+)"?/i.exec(reponse.headers.get("Content-Disposition") ?? "")?.[1];
  enregistrer(contenu, nomServeur || `salaries-${new Date().toISOString().slice(0, 10)}.xlsx`);
  return nombre;
}
