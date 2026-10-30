
import { getToken } from "./authService";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders(): Record<string, string> {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface HistoriqueEmailDTO {
  id: number;
  salarieId?: number;
  salarieNom: string;
  destinataire: string;
  destinataireNom: string;
  roleDestinataire: string;
  objet: string;
  typeEmail: string;
  dateEnvoi: string;
  heureEnvoi: string;
  statut: string;
  batchCron: boolean;
  contenuCorps?: string;
  lienSecurise?: string;
}

export interface DashboardStatsDTO {
  totalSalariesActifs: number;
  totalEvaluationsEnCours: number;
  totalEvaluationsEnRelance: number;
  totalEvaluationsEnRetardCritique: number;
  totalEvaluationsCompletees: number;

  // KPI calculés par le backend
  totalFinalisees: number;
  totalTitularises: number;
  totalRuptures: number;
  tauxTitularisation: number;
  tauxRupture: number;

  repartitionParSociete: Record<string, number>;
  derniersEmailsEnvoyes: HistoriqueEmailDTO[];
  evolutionMensuelle?: Array<{ mois: string; titularisation: number; ruptures: number }>;
}

type DashboardStatsResponse = Partial<DashboardStatsDTO>;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapDashboardStats(
  data: DashboardStatsResponse
): DashboardStatsDTO {
  return {
    totalSalariesActifs: toNumber(data.totalSalariesActifs),
    totalEvaluationsEnCours: toNumber(data.totalEvaluationsEnCours),
    totalEvaluationsEnRelance: toNumber(data.totalEvaluationsEnRelance),
    totalEvaluationsEnRetardCritique: toNumber(
      data.totalEvaluationsEnRetardCritique
    ),
    totalEvaluationsCompletees: toNumber(data.totalEvaluationsCompletees),

    // Utiliser les valeurs renvoyées par le backend, sans les recalculer
    totalFinalisees: toNumber(data.totalFinalisees),
    totalTitularises: toNumber(data.totalTitularises),
    totalRuptures: toNumber(data.totalRuptures),
    tauxTitularisation: toNumber(data.tauxTitularisation),
    tauxRupture: toNumber(data.tauxRupture),

    repartitionParSociete: data.repartitionParSociete ?? {},
    derniersEmailsEnvoyes: data.derniersEmailsEnvoyes ?? [],
    evolutionMensuelle: data.evolutionMensuelle ?? [],
  };
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStatsDTO | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data: DashboardStatsResponse = await response.json();

      return mapDashboardStats(data);
    } catch (error) {
      console.warn(
        "Connexion backend /dashboard/stats indisponible:",
        error
      );
      return null;
    }
  },

  async getAuditEmails(): Promise<HistoriqueEmailDTO[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/audit-emails`, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(
        "Connexion backend /dashboard/audit-emails indisponible:",
        error
      );
      return [];
    }
  },
};
