import type { ScreenId } from '@/context/AppContext';

// Adresse (lisible) de chaque section de l'application ; le tableau de bord est la racine « / »
export const CHEMINS_ECRANS: Record<ScreenId, string> = {
  'dashboard': '/',
  'salaries': '/salaries',
  'ajouter-salarie': '/salaries',
  'detail-salarie': '/salaries/fiche',
  'periodes': '/periodes',
  'formulaire-evaluation': '/formulaire-evaluation',
  'retards': '/retards',
  'emails': '/emails',
  'moteur': '/moteur',
  'analyse-ia': '/analyse-ia',
  'archive': '/archive',
  'notifications': '/notifications',
  'responsables': '/responsables',
  'ajouter-responsable': '/responsables/nouveau',
  'gestion-responsable': '/gestion-responsables',
  'detail-responsable': '/responsables/fiche',
  'dashboard-responsable': '/tableau-responsable',
  'parametres': '/parametres',
  'aide': '/aide',
  'gestion-admins': '/administrateurs',
};

export function cheminDeLEcran(screen: ScreenId): string {
  return CHEMINS_ECRANS[screen] ?? '/';
}

// Écran correspondant à une adresse (null si l'adresse n'est pas une section de l'application)
export function ecranDuChemin(chemin: string): ScreenId | null {
  const propre = chemin.replace(/\/+$/, '') || '/';
  const trouve = (Object.entries(CHEMINS_ECRANS) as [ScreenId, string][]).find(
    ([ecran, c]) => c === propre && ecran !== 'ajouter-salarie'
  );
  return trouve ? trouve[0] : null;
}
