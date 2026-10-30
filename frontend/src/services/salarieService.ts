import { getToken } from "./authService";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";


function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface SalarieBackendDTO {
  id: number;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  poste?: string;
  societe?: string;
  dateEmbauche: string;
  dateFinPrevisionnelle: string;
  periodeInitialeId?: number;
  directionId?: number;
  directionName?: string;
  responsableId?: number;
  responsableNomComplet?: string;
  statutEssai: string;
  actif: boolean;
}

export interface SalarieCreatePayload {
  societe: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  poste?: string;
  dateEmbauche: string;
  directionId?: number;
  responsableId?: number;
}

export interface ImportSalarieResult {
  statut: "CREE" | "IGNORE" | "ERREUR";
  ligne?: number;
  salarieId?: number;
  matricule?: string;
  email?: string;
  nomComplet?: string;
  message?: string;
}

export const salarieService = {
  /* Import en masse depuis un CSV : chaque ligne est traitée indépendamment côté serveur. */
  async importerSalaries(fichier: File): Promise<ImportSalarieResult[]> {
    const formData = new FormData();
    formData.append("fichier", fichier);
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/salaries/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const json = JSON.parse(text);
        if (typeof json.message === "string" && json.message) message = json.message;
        else if (typeof json.error === "string") message = `Erreur du serveur (${json.status ?? response.status}). Réessayez ; si le problème continue, redémarrez le serveur ou contactez l'administrateur.`;
      } catch {
        // Corps non JSON : texte brut
      }
      if (response.status === 403 && !message) message = "Action réservée à l'Admin RH.";
      throw new Error(`Échec de l'import : ${message || response.statusText}`);
    }
    return await response.json();
  },

  async getAllSalaries(): Promise<SalarieBackendDTO[] | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/salaries?inclureInactifs=true`, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn("Connexion backend /salaries indisponible, fallback local:", error);
      return null;
    }
  },

  async getSalarieById(id: number): Promise<SalarieBackendDTO | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/salaries/${id}`, {
        method: "GET",
        headers: authHeaders(),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Erreur getSalarieById(${id}):`, error);
      return null;
    }
  },

  async createSalarie(payload: SalarieCreatePayload): Promise<SalarieBackendDTO> {
    const response = await fetch(`${API_BASE_URL}/salaries`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Échec création salarié: ${errorText || response.statusText}`);
    }
    return await response.json();
  },

  async updateSociete(id: number, societe: string): Promise<SalarieBackendDTO> {
    const url = new URL(`${API_BASE_URL}/salaries/${id}/societe`);
    url.searchParams.set("societe", societe);
    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: authHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Échec modification société: ${errorText || response.statusText}`);
    }
    return await response.json();
  },

  async deleteSalarie(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/salaries/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Échec suppression salarié: ${errorText || response.statusText}`);
    }
  },

  /* Réactive un dossier archivé (persisté en base) et rouvre sa dernière période clôturée. */
  async restaurerSalarie(id: number): Promise<SalarieBackendDTO> {
    const response = await fetch(`${API_BASE_URL}/salaries/${id}/restauration`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const json = JSON.parse(text);
        if (typeof json.message === "string" && json.message) message = json.message;
        else if (typeof json.error === "string") message = `Erreur du serveur (${json.status ?? response.status}). Réessayez ; si le problème continue, redémarrez le serveur ou contactez l'administrateur.`;
      } catch {
        // Corps non JSON : texte brut
      }
      throw new Error(`Échec de la restauration : ${message || response.statusText}`);
    }
    return await response.json();
  },

  /* Résout le lien d'évaluation reçu par e-mail : renvoie la période à ouvrir. */
  async resoudreLienEvaluation(token: string): Promise<number | null> {
    const response = await fetch(`${API_BASE_URL}/evaluations/lien/${encodeURIComponent(token)}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.periodeId === "number" ? data.periodeId : null;
  },

  /* Clôture le dossier suite à une démission ou rupture de période d'essai. */
  async cloturerDemission(id: number, motif?: string): Promise<void> {
    const url = new URL(`${API_BASE_URL}/salaries/${id}/demission`);
    if (motif) url.searchParams.append("motif", motif);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Erreur clôture démission: ${response.statusText}`);
    }
  },
};
