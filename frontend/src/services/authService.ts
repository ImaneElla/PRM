import type { LoginPayload, Role } from "@/types/auth";

// On retire le "/" final et un éventuel "/api" : les chemins ci-dessous commencent déjà par /api.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const TOKEN_KEY = "auth_token";
const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_KEYS = ["userNom", "userPrenom", "userRole", "userEmail", "userMustChangePassword"] as const;
export const AUTH_CHANGED_EVENT = "auth-changed";

export interface AuthUser {
  nom: string;
  prenom: string;
  role: Role;
  email?: string;
  poste?: string;
  societe?: string;
  direction?: string;
  directionId?: number;
  mustChangePassword?: boolean;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

type AuthContext = "login" | "compte";

function extractServerMessage(data: Record<string, unknown> | null): string | null {
  if (!data) return null;

  for (const key of ["message", "error", "detail"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  const raw = data.errors ?? data;
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : Object.values(raw as Record<string, unknown>);

  for (const item of items) {
    if (typeof item === "string" && item.trim()) return item;
    if (item && typeof item === "object") {
      const entry = item as Record<string, unknown>;
      const text = entry.defaultMessage ?? entry.message;
      if (typeof text === "string" && text.trim()) return text;
    }
  }

  return null;
}

function resolveErrorMessage(
  status: number,
  data: Record<string, unknown> | null,
  context: AuthContext
): string {
  if (status === 401) {
    return context === "login"
      ? "Email ou mot de passe incorrect."
      : "Votre session a expiré. Reconnectez-vous.";
  }
  if (status >= 500) {
    return "Le serveur a rencontré un problème. Réessayez plus tard.";
  }

  return (
    extractServerMessage(data) ??
    `Une erreur est survenue (code ${status}). Vérifiez vos informations et réessayez.`
  );
}

function extractToken(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const candidate = data.authToken ?? data.token ?? data.accessToken ?? data.jwt;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function extractAuthUser(data: Record<string, unknown> | null): AuthUser | null {
  if (!data) return null;

  const nom = data.userNom ?? data.nom;
  const prenom = data.userPrenom ?? data.prenom;
  const role = data.userRole ?? data.role;
  const email = data.userEmail ?? data.email;

  if (
    typeof nom !== "string" ||
    typeof prenom !== "string" ||
    (role !== "ADMIN_RH" && role !== "RESPONSABLE")
  ) {
    return null;
  }

  return {
    nom,
    prenom,
    role,
    ...(typeof email === "string" ? { email } : {}),
    mustChangePassword: data.mustChangePassword === true,
  };
}

async function post(
  path: string,
  body: unknown,
  context: AuthContext,
  token?: string | null
): Promise<Record<string, unknown> | null> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError(
      "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
      0
    );
  }

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw new AuthError(resolveErrorMessage(response.status, data, context), response.status);
  }

  return data;
}

function saveSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem("userNom", user.nom);
  localStorage.setItem("userPrenom", user.prenom);
  localStorage.setItem("userRole", user.role);
  if (user.email) localStorage.setItem("userEmail", user.email);
  localStorage.setItem("userMustChangePassword", String(user.mustChangePassword === true));
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  AUTH_USER_KEYS.forEach((key) => sessionStorage.removeItem(key));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const nom = localStorage.getItem("userNom");
  const prenom = localStorage.getItem("userPrenom");
  const role = localStorage.getItem("userRole");
  const email = localStorage.getItem("userEmail") ?? undefined;

  if (!nom || !prenom || (role !== "ADMIN_RH" && role !== "RESPONSABLE")) {
    return null;
  }

  const poste = localStorage.getItem("userPoste") ?? undefined;
  const societe = localStorage.getItem("userSociete") ?? localStorage.getItem("userDirection") ?? undefined;
  const direction = localStorage.getItem("userDirection") ?? societe;
  const directionId = localStorage.getItem("userDirectionId") ? Number(localStorage.getItem("userDirectionId")) : undefined;
  const mustChangePassword = localStorage.getItem("userMustChangePassword") === "true";
  return { nom, prenom, role, email, poste, societe, direction, directionId, mustChangePassword };
}

export function updateAuthUser(updates: Partial<Omit<AuthUser, "role">>): void {
  if (typeof window === "undefined") return;

  const user = getAuthUser();
  if (!user) return;

  const updatedUser = { ...user, ...updates };
  localStorage.setItem("userNom", updatedUser.nom);
  localStorage.setItem("userPrenom", updatedUser.prenom);
  if (updatedUser.email) localStorage.setItem("userEmail", updatedUser.email);
  if (updatedUser.poste !== undefined) localStorage.setItem("userPoste", updatedUser.poste);
  if (updatedUser.societe !== undefined) localStorage.setItem("userSociete", updatedUser.societe);
  if (updatedUser.direction !== undefined) localStorage.setItem("userDirection", updatedUser.direction);
  if (updatedUser.directionId !== undefined) localStorage.setItem("userDirectionId", String(updatedUser.directionId));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

function isTokenUnexpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "="));
    const claims: unknown = JSON.parse(decodedPayload);

    if (
      typeof claims !== "object" ||
      claims === null ||
      !("exp" in claims) ||
      typeof claims.exp !== "number"
    ) {
      return false;
    }

    return Date.now() < claims.exp * 1000;
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return token !== null && isTokenUnexpired(token);
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  AUTH_USER_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  AUTH_USER_KEYS.forEach((key) => sessionStorage.removeItem(key));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/** Connecte l'utilisateur et stocke le token. */
export async function login(payload: LoginPayload): Promise<AuthUser> {
  const data = await post("/api/auth/login", payload, "login");
  const token = extractToken(data);
  const user = extractAuthUser(data);

  if (!token) {
    throw new AuthError("Connexion réussie, mais aucun token n'a été renvoyé par le serveur.", 500);
  }

  if (!user) {
    throw new AuthError("La réponse du serveur ne contient pas les informations du compte.", 500);
  }

  saveSession(token, user);
  return user;
}


export async function changerMotDePasse(motDePasseActuel: string, nouveauMotDePasse: string): Promise<AuthUser> {
  const data = await post("/api/compte/mot-de-passe", { motDePasseActuel, nouveauMotDePasse }, "compte", getToken());
  const token = extractToken(data);
  const user = extractAuthUser(data);

  if (!token || !user) {
    throw new AuthError("La réponse du serveur ne contient pas les informations du compte.", 500);
  }

  saveSession(token, user);
  return user;
}

export async function demanderReinitialisation(email: string): Promise<string> {
  const data = await post("/api/auth/mot-de-passe-oublie", { email }, "compte");
  return extractServerMessage(data) ??
    "Si un compte correspond à cette adresse, un lien de réinitialisation vient d'être envoyé.";
}

export async function reinitialiserMotDePasse(token: string, nouveauMotDePasse: string): Promise<void> {
  await post("/api/auth/reinitialiser-mot-de-passe", { token, nouveauMotDePasse }, "compte");
}