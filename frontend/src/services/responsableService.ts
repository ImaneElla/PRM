import { getToken } from "./authService";
import type { StatutCompte } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface ResponsableBackendDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  poste?: string;
  societe: string;
  statutCompte?: StatutCompte;
}

export interface InvitationResult {
  statut: "CREE" | "RENVOYEE" | "IGNORE" | "ERREUR";
  responsableId?: number;
  email?: string;
  nomComplet?: string;
  message?: string;
  emailEnvoye: boolean;
  motDePasseTemporaire?: string;
  ligne?: number;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readError(response: Response, operation: string): Promise<Error> {
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
  return new Error(`${operation} : ${message || response.statusText}`);
}

export const responsableService = {
  async getAllResponsables(): Promise<ResponsableBackendDTO[] | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/responsables`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw await readError(response, "Échec chargement responsables");
      return await response.json();
    } catch (error) {
      console.warn("Connexion backend /responsables indisponible:", error);
      return null;
    }
  },

  // Fiche du responsable connecté (un responsable n'a pas accès à l'annuaire complet)
  async getMoi(): Promise<ResponsableBackendDTO | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/compte/moi`, { headers: authHeaders(), cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn("Connexion backend /compte/moi indisponible:", error);
      return null;
    }
  },

  async createResponsable(payload: Omit<ResponsableBackendDTO, "id">): Promise<ResponsableBackendDTO> {
    const response = await fetch(`${API_BASE_URL}/responsables`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw await readError(response, "Échec création responsable");
    return response.json();
  },

  async updateResponsable(id: number, payload: Omit<ResponsableBackendDTO, "id">): Promise<ResponsableBackendDTO> {
    const response = await fetch(`${API_BASE_URL}/responsables/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw await readError(response, "Échec modification responsable");
    return response.json();
  },

  async inviterResponsable(payload: { firstName: string; lastName: string; email: string; societe?: string }): Promise<InvitationResult> {
    const response = await fetch(`${API_BASE_URL}/responsables/invitations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw await readError(response, "Échec de l'invitation");
    return response.json();
  },

  async inviterResponsableExistant(id: number): Promise<InvitationResult> {
    const response = await fetch(`${API_BASE_URL}/responsables/${id}/invitation`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) throw await readError(response, "Échec de l'invitation");
    return response.json();
  },

  async importerResponsables(fichier: File): Promise<InvitationResult[]> {
    const formData = new FormData();
    formData.append("fichier", fichier);
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/responsables/invitations/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw await readError(response, "Échec de l'import");
    return response.json();
  },

  async deleteResponsable(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/responsables/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok) throw await readError(response, "Échec suppression responsable");
  },
};
