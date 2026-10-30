import { getToken } from "./authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export type RecommandationBackend = 'CONFIRMATION_CDI' | 'PROLONGATION_ESSAI' | 'RUPTURE_CONTRAT';

export interface EvaluationDetailRequestPayload {
  noteCompetencesPro: number;
  noteAptitudesPerso: number;
  noteQSE: number;
  pointsForts?: string;
  axesAmelioration?: string;
  commentairesEvaluateur?: string;
  recommandationEvaluateur: RecommandationBackend;
  jsonReponsesCriteres: string;
}

export interface EvaluationDetailResponseData {
  id: number;
  periodeId: number;
  periodeSuivanteId?: number;
  dateEcheancePeriodeSuivante?: string;
  noteCompetencesPro: number;
  noteAptitudesPerso: number;
  noteQSE: number;
  noteGlobale: number;
  pointsForts?: string;
  axesAmelioration?: string;
  commentairesEvaluateur?: string;
  recommandationEvaluateur: string;
  dateSoumission: string;
  jsonReponsesCriteres?: string;
}

export interface DecisionRHPayload {
  decisionFinale: 'VALIDATION' | 'RENOUVELLEMENT' | 'RUPTURE';
  commentaireRH?: string;
}


function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const evaluationService = {

  async soumettreEvaluation(
    periodeId: number,
    payload: EvaluationDetailRequestPayload
  ): Promise<EvaluationDetailResponseData> {
    const response = await fetch(`${API_BASE_URL}/evaluations/${periodeId}/soumettre`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      let message = `Erreur (${response.status}) lors de la soumission de l'évaluation`;
      try {
        const json = JSON.parse(errText);
        if (json.message) message = json.message;
      } catch {
        if (errText) message = errText;
      }
      throw new Error(message);
    }

    return await response.json();
  },

  async getEvaluationByToken(token: string): Promise<EvaluationDetailResponseData> {
    const response = await fetch(`${API_BASE_URL}/evaluations/access/${token}`, {
      method: "GET",
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Erreur d'accès par token: ${response.status}`);
    }

    return await response.json();
  },

  async getEvaluationByPeriodeId(periodeId: number): Promise<EvaluationDetailResponseData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations/periode/${periodeId}`, {
        method: "GET",
        headers: authHeaders(),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  
  async priseDeDecisionDirecteRH(periodeId: number, payload: DecisionRHPayload): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/evaluations/${periodeId}/decision-directe-rh`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      let message = `Erreur (${response.status}) lors de l'enregistrement de la décision RH`;
      try {
        const json = JSON.parse(errText);
        if (json.message) message = json.message;
      } catch {
        if (errText) message = errText;
      }
      throw new Error(message);
    }
  },
};
