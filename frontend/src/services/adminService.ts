import { getToken } from "./authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export type StatutAdmin = "INVITE" | "ACTIF" | "DESACTIVE";

export interface AdminBackendDTO {
  id: number;
  email: string;
  nom?: string;
  prenom?: string;
  statut: StatutAdmin;
  emailEnvoye?: boolean;
  lienActivation?: string;
  message?: string;
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

async function post(path: string, operation: string, body?: unknown): Promise<AdminBackendDTO> {
  const response = await fetch(`${API_BASE_URL}/admins${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw await readError(response, operation);
  return response.json();
}

export const adminService = {
  async lister(): Promise<AdminBackendDTO[]> {
    const response = await fetch(`${API_BASE_URL}/admins`, { headers: authHeaders(), cache: "no-store" });
    if (!response.ok) throw await readError(response, "Échec du chargement des administrateurs");
    return response.json();
  },

  inviter(payload: { prenom: string; nom: string; email: string }) {
    return post("/invitations", "Échec de l'invitation", payload);
  },

  renvoyerInvitation(id: number) {
    return post(`/${id}/invitation`, "Échec du renvoi de l'invitation");
  },

  desactiver(id: number) {
    return post(`/${id}/desactivation`, "Échec de la désactivation");
  },

  async supprimer(id: number): Promise<AdminBackendDTO> {
    const response = await fetch(`${API_BASE_URL}/admins/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!response.ok) throw await readError(response, "Échec de la suppression");
    return response.json();
  },

  reactiver(id: number) {
    return post(`/${id}/reactivation`, "Échec de la réactivation");
  },
};
