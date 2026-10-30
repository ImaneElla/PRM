import { getToken } from "./authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface PeriodeBackendDTO {
  id: number;
  salarieId: number;
  salarieNom: string;
  salarieEmail?: string;
  salariePoste?: string;
  responsableId?: number;
  responsableNom?: string;
  responsableEmail?: string;
  directionName?: string;
  typePeriode: string;
  numeroPeriode?: number;
  dateEcheance?: string;
  dateDeclenchementEmail?: string;
  heureDeclenchement?: string;
  dateDernierRappel?: string;
  dateValidationEvaluateur?: string;
  dateValidationRH?: string;
  statut: string;
  decision?: 'RENOUVELEE' | 'CONFIRMEE' | 'RUPTURE' | null;
  joursRetard?: number;
  noteGlobale?: number;
  motifDecision?: string;
  tokenAccesSalarie?: string;
  emailsEnvoyes?: string;
  etapeValide?: boolean;
  etapeEV?: boolean;
  etapeEvaluation?: boolean;
  etapeSH?: boolean;
}

export const periodeService = {
  async getAllPeriodes(): Promise<PeriodeBackendDTO[]> {
    const response = await fetch(`${API_BASE_URL}/periodes`, {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    return await response.json();
  },
};
