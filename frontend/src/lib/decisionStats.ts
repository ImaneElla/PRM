import { Salarie } from '../types';
import { DashboardStatsDTO } from '../services/dashboardService';

const STATUTS_TITULARISE = new Set(['CONFIRMEE', 'VALIDE', 'Titulaire', 'TITULARISEE', 'TITULARISE']);
const STATUTS_RUPTURE = new Set(['RUPTURE']);

export const isTitularise = (s: Salarie) => STATUTS_TITULARISE.has(String(s.statutEssai));
export const isRupture = (s: Salarie) => STATUTS_RUPTURE.has(String(s.statutEssai));

export interface DecisionTotals {
  totalTitularises: number;
  totalRuptures: number;
  totalFinalisees: number;
}

export function computeDecisionTotals(
  salaries: Salarie[],
  dashboardStats: DashboardStatsDTO | null | undefined,
  useBackendStats: boolean
): DecisionTotals {
  if (useBackendStats && dashboardStats) {
    const totalTitularises = Number(dashboardStats.totalTitularises ?? 0);
    const totalRuptures = Number(dashboardStats.totalRuptures ?? 0);
    return {
      totalTitularises,
      totalRuptures,
      totalFinalisees: Number(dashboardStats.totalFinalisees ?? totalTitularises + totalRuptures),
    };
  }
  const totalTitularises = salaries.filter(isTitularise).length;
  const totalRuptures = salaries.filter(isRupture).length;
  return { totalTitularises, totalRuptures, totalFinalisees: totalTitularises + totalRuptures };
}
