import { getToken } from "./authService";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export interface ParametresBackend {
  id?: number;
  nomExpediteur: string;
  emailExpediteur: string;
}

export const parametreService = {
  async getParametres(): Promise<ParametresBackend | null> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/parametres`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateParametres(data: Partial<ParametresBackend>): Promise<ParametresBackend | null> {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/parametres`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
};
