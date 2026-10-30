import { getToken } from "./authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Modèles des e-mails RH envoyés automatiquement (stockés en base, modifiables par l'Admin RH)
export interface ModeleEmail {
  id: string;
  nom: string;
  delai: number; // jours avant l'échéance ; -1 = lendemain de l'échéance (retard)
  type?: string;
  objet: string;
  contenu: string;
  personnalise: boolean; // différent du texte par défaut
  champs: string[];
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
    else if (typeof json.error === "string") message = `Erreur du serveur (${json.status ?? response.status}).`;
  } catch {
    // Corps non JSON : texte brut
  }
  if (response.status === 403 && !message) message = "Action réservée à l'Admin RH.";
  return new Error(`${operation} : ${message || response.statusText}`);
}

export const modeleEmailService = {
  async lister(): Promise<ModeleEmail[]> {
    const response = await fetch(`${API_BASE_URL}/parametres/modeles-email`, { headers: authHeaders(), cache: "no-store" });
    if (!response.ok) throw await readError(response, "Échec du chargement des modèles d'e-mail");
    return response.json();
  },

  async modifier(id: string, objet: string, contenu: string): Promise<ModeleEmail> {
    const response = await fetch(`${API_BASE_URL}/parametres/modeles-email/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ objet, contenu }),
    });
    if (!response.ok) throw await readError(response, "Échec de l'enregistrement du modèle");
    return response.json();
  },

  async reinitialiser(id: string): Promise<ModeleEmail> {
    const response = await fetch(`${API_BASE_URL}/parametres/modeles-email/${encodeURIComponent(id)}/reinitialiser`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) throw await readError(response, "Échec du rétablissement du modèle");
    return response.json();
  },
};
