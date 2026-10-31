"use client";

import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  UserRole,
  Direction,
  Responsable,
  Salarie,
  PeriodeEvaluation,
  EvaluationDetail,
  HistoriqueEmail,
  NotificationItem,
  DecisionPeriode,
  User,
  Parametres,
  EmailsEnvoyesTracker,
  StatutPeriode,
  TypePeriode,
} from '../types';
import { salarieService, SalarieBackendDTO, ImportSalarieResult } from '../services/salarieService';
import { periodeService, PeriodeBackendDTO } from '../services/periodeService';
import { responsableService, InvitationResult } from '../services/responsableService';
import { dashboardService, DashboardStatsDTO } from '../services/dashboardService';
import { evaluationService, RecommandationBackend } from '../services/evaluationService';
import { notificationService } from '../services/notificationService';
import { parametreService } from '../services/parametreService';
import { AUTH_CHANGED_EVENT, getAuthUser } from '../services/authService';

import {
  initialUsers,
  initialDirections,
  initialResponsables,
  initialSalaries,
  initialPeriodes,
  initialEvaluations,
  initialEmails,
  initialNotifications
} from '../data/mockData';

export type ScreenId =
  | 'dashboard' | 'salaries' | 'ajouter-salarie' | 'detail-salarie' | 'periodes'
  | 'formulaire-evaluation' | 'retards' | 'emails' | 'moteur' | 'analyse-ia'
  | 'archive' | 'notifications' | 'responsables' | 'ajouter-responsable'
  | 'gestion-responsable' | 'detail-responsable' | 'dashboard-responsable'
  | 'parametres' | 'aide' | 'gestion-admins';

const initialParametres: Parametres = {
  templatesEmail: [
    {
      id: 'email1',
      nom: 'Email 1 - Notification initiale (J-21)',
      delai: 'J-21 (3 semaines avant l\'échéance)',
      objet: '[GROUPE PREMIUM] Ouverture de l\'évaluation - {salarie} ({periode})',
      contenu: 'Bonjour {responsable},\n\nNous vous informons que l\'évaluation de {salarie} relative à la période « {periode} » est désormais ouverte. Elle doit être finalisée au plus tard le {echeance}.\n\nNous vous invitons à vous connecter à la plateforme afin de la renseigner dans les meilleurs délais.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\nLe service des Ressources Humaines\nGroupe Premium'
    },
    {
      id: 'email2',
      nom: 'Email 2 - Relance intermédiaire (J-14)',
      delai: 'J-14 (2 semaines avant l\'échéance)',
      objet: '[GROUPE PREMIUM] Rappel - Évaluation de {salarie} ({periode})',
      contenu: 'Bonjour {responsable},\n\nSauf erreur de notre part, l\'évaluation de {salarie} relative à la période « {periode} » n\'a pas encore été complétée. Pour rappel, la date limite est fixée au {echeance}.\n\nNous vous remercions de bien vouloir la finaliser dans les prochains jours.\n\nCordialement,\nLe service des Ressources Humaines\nGroupe Premium'
    },
    {
      id: 'email3',
      nom: 'Email 3 - Relance urgente (J-7)',
      delai: 'J-7 (1 semaine avant l\'échéance)',
      objet: '[GROUPE PREMIUM] Urgent - Échéance proche : évaluation de {salarie} ({periode})',
      contenu: 'Bonjour {responsable},\n\nL\'évaluation de {salarie} relative à la période « {periode} » doit impérativement être finalisée avant le {echeance}, soit dans moins d\'une semaine.\n\nÀ défaut, l\'évaluation sera considérée comme en retard. Nous vous remercions de bien vouloir la compléter dès que possible.\n\nPour toute difficulté, n\'hésitez pas à nous contacter.\n\nCordialement,\nLe service des Ressources Humaines\nGroupe Premium'
    }
  ],
  compte: {
    nomExpediteur: 'Direction des Ressources Humaines - Groupe Premium',
    emailExpediteur: 'rh@premium.africa'
  },
  theme: 'light',
  profil: {
    nom: 'Ellaouzi',
    prenom: 'Imane',
    email: 'emanellaouzi.05@gmail.com',
    societe: 'SRM'
  }
};

interface AppContextType {
  currentScreen: ScreenId;
  navigateTo: (screen: ScreenId, params?: { salarieId?: number; periodeId?: number; emailId?: number; responsableId?: number }) => void;
  selectedResponsableId: number; setSelectedResponsableId: (id: number) => void;
  currentRole: UserRole; setCurrentRole: (role: UserRole) => void;
  currentUser: User | null; currentResponsable: Responsable | null;
  selectedSalarieId: number; setSelectedSalarieId: (id: number) => void;
  selectedPeriodeId: number; setSelectedPeriodeId: (id: number) => void;
  selectedEmail: HistoriqueEmail | null;
  openEmailModal: (email: HistoriqueEmail) => void; closeEmailModal: () => void;
  isEmailModalOpen: boolean;
  isAddSalarieModalOpen: boolean; openAddSalarieModal: () => void; closeAddSalarieModal: () => void;
  isSidebarCollapsed: boolean; setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>; toggleSidebar: () => void;
  parametres: Parametres; updateParametres: (newParametres: Partial<Parametres>) => void;
  isLoaded: boolean;
  isDemoMode: boolean; toggleDemoMode: () => void;
  directions: Direction[]; responsables: Responsable[]; users: User[];
  allSalaries: Salarie[]; salaries: Salarie[]; archives: Salarie[];
  allPeriodes: PeriodeEvaluation[]; periodes: PeriodeEvaluation[];
  evaluations: EvaluationDetail[]; emails: HistoriqueEmail[]; notifications: NotificationItem[];
  dashboardStats: DashboardStatsDTO | null;
  refreshDashboardData: () => Promise<void>;
  addSalarie: (data: any) => void; updateSalarie: (id: number, data: any) => Promise<void>;
  deleteSalarie: (id: number) => Promise<void>; restaurerSalarie: (id: number) => Promise<void>;
  addResponsable: (data: { firstName: string; lastName: string; email: string; societe: string; phone?: string; poste?: string; }) => Promise<InvitationResult | undefined>;
  inviterResponsable: (id: number) => Promise<InvitationResult>;
  importerResponsables: (fichier: File) => Promise<InvitationResult[]>;
  importerSalaries: (fichier: File) => Promise<ImportSalarieResult[]>;
  updateResponsable: (id: number, data: any) => Promise<void>; deleteResponsable: (id: number) => Promise<boolean>;
  relancerRetard: (id: number) => Promise<void>; relancerTousLesRetards: () => Promise<void>;
  submitEvaluation: (data: any) => Promise<void>; saveAIAnalysis: (periodeId: number, analysisResult: any) => void; validerDecisionRH: (id: number, decision: DecisionPeriode, motif: string) => Promise<void>;
  triggerCronBatch0900: () => { emailsCount: number; retardsCount: number };
  markNotificationAsRead: (id: number) => void; markAllNotificationsAsRead: () => void;
  toastMessage: string | null; showToast: (msg: string) => void;
}


const SOCIETE_PREFIXES: Record<string, string> = {
  'GRP': 'GRP',
  'PRO': 'PRO',
  'SRM': 'SRM',
  'AFI': 'AFI',
  'CCI': 'CCI',
  'SCP': 'SCP',
};

function generateMatricule(societe: string, existingSalaries: Array<{matricule?: string}>): string {
  const prefix = SOCIETE_PREFIXES[societe] || societe || 'GRP';
  let maxNum = 0;
  for (const s of existingSalaries) {
    if (s.matricule && s.matricule.startsWith(prefix)) {
      const numPart = parseInt(s.matricule.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
    }
  }
  const nextNum = maxNum + 1;
  return prefix + String(nextNum).padStart(6, '0');
}

function mapSalarieBackend(bs: SalarieBackendDTO): Salarie {
  return {
    id: bs.id,
    matricule: bs.matricule,
    nom: bs.lastName,
    prenom: bs.firstName,
    firstName: bs.firstName,
    lastName: bs.lastName,
    email: bs.email,
    phone: bs.phone || '',
    poste: bs.poste || '',
    societe: bs.societe || 'GRP',
    dateIntegration: bs.dateEmbauche,
    dateEmbauche: bs.dateEmbauche,
    dureeInitialeMois: 3,
    dateFinPrevisionnelle: bs.dateFinPrevisionnelle,
    directionId: bs.directionId || 1,
    directionName: bs.directionName || '',
    responsableId: bs.responsableId || 1,
    responsableNom: bs.responsableNomComplet || '',
    statutEssai: bs.statutEssai as any,
    PeriodeActuel: 'TROIS_MOIS',
    actif: bs.actif,
    bloqueEmails: !bs.actif
  } as Salarie;
}

const DECISION_PAR_ISSUE: Record<string, DecisionPeriode> = {
  RENOUVELEE: 'RENOUVELLEMENT',
  CONFIRMEE: 'CONFIRMATION',
  RUPTURE: 'RUPTURE',
};

const parseEmailsEnvoyes = (raw?: string): EmailsEnvoyesTracker => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// Une période clôturée prend le statut de sa décision (RENOUVELEE / CONFIRMEE / RUPTURE), comme dans les écrans
function mapPeriodeBackend(bp: PeriodeBackendDTO): PeriodeEvaluation {
  const statut = bp.decision ?? (bp.statut === 'EN_RETARD_CRITIQUE' ? 'EN_RETARD' : bp.statut);
  return {
    id: bp.id,
    salarieId: bp.salarieId,
    salarieNom: bp.salarieNom,
    salarieEmail: bp.salarieEmail || '',
    salariePoste: bp.salariePoste || '',
    responsableId: bp.responsableId || 0,
    responsableNom: bp.responsableNom || '',
    responsableEmail: bp.responsableEmail || '',
    directionName: bp.directionName || '',
    typePeriode: bp.typePeriode as TypePeriode,
    numeroPeriode: bp.numeroPeriode,
    dateEcheance: bp.dateEcheance || '',
    dateDeclenchementEmail: bp.dateDeclenchementEmail || '',
    heureDeclenchement: bp.heureDeclenchement || '09:00:00',
    dateDernierRappel: bp.dateDernierRappel || undefined,
    dateValidationEvaluateur: bp.dateValidationEvaluateur || undefined,
    statut: statut as StatutPeriode,
    joursRetard: bp.joursRetard || undefined,
    noteGlobale: bp.noteGlobale ?? undefined,
    decisionFinale: bp.decision ? DECISION_PAR_ISSUE[bp.decision] : 'EN_ATTENTE',
    motifDecision: bp.motifDecision || undefined,
    dateValidationRH: bp.dateValidationRH || undefined,
    tokenAccesSalarie: bp.tokenAccesSalarie || undefined,
    emailsEnvoyes: parseEmailsEnvoyes(bp.emailsEnvoyes),
    etapeValide: bp.etapeValide ?? undefined,
    etapeEV: bp.etapeEV ?? undefined,
    etapeEvaluation: bp.etapeEvaluation ?? undefined,
    etapeSH: bp.etapeSH ?? undefined,
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const user = getAuthUser();
      if (user?.role) return user.role;
    }
    return 'ADMIN_RH';
  });
  const [selectedSalarieId, setSelectedSalarieId] = useState<number>(0);
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number>(0);
  const [selectedResponsableId, setSelectedResponsableId] = useState<number>(0);
  const [selectedEmail, setSelectedEmail] = useState<HistoriqueEmail | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAddSalarieModalOpen, setIsAddSalarieModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Après un rechargement de la page, on revient sur le même écran (et le même dossier ouvert)
  const navigationRestauree = React.useRef(false);
  React.useEffect(() => {
    try {
      const brut = sessionStorage.getItem('gp_navigation');
      const sauvegarde = brut ? JSON.parse(brut) : null;
      if (sauvegarde && sauvegarde.role === getAuthUser()?.role) {
        if (sauvegarde.screen) setCurrentScreen(sauvegarde.screen);
        if (sauvegarde.salarieId) setSelectedSalarieId(sauvegarde.salarieId);
        if (sauvegarde.periodeId) setSelectedPeriodeId(sauvegarde.periodeId);
        if (sauvegarde.responsableId) setSelectedResponsableId(sauvegarde.responsableId);
      }
    } catch {
      // stockage indisponible : on reste sur l'écran par défaut
    }
    navigationRestauree.current = true;
  }, []);
  React.useEffect(() => {
    if (!navigationRestauree.current) return;
    try {
      sessionStorage.setItem('gp_navigation', JSON.stringify({
        role: getAuthUser()?.role,
        screen: currentScreen,
        salarieId: selectedSalarieId,
        periodeId: selectedPeriodeId,
        responsableId: selectedResponsableId,
      }));
    } catch {
      // ignoré
    }
  }, [currentScreen, selectedSalarieId, selectedPeriodeId, selectedResponsableId]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Le mode démo n'existe que si NEXT_PUBLIC_ENABLE_DEMO=true (jamais en production)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const [realDirections, setRealDirections] = useState<Direction[]>([]);
  const [realResponsables, setRealResponsables] = useState<Responsable[]>([]);
  const [realUsers, setRealUsers] = useState<User[]>([]);
  const [realSalariesList, setRealSalariesList] = useState<Salarie[]>([]);
  const [realPeriodesList, setRealPeriodesList] = useState<PeriodeEvaluation[]>([]);
  const [realEvaluations, setRealEvaluations] = useState<EvaluationDetail[]>([]);
  const [realEmails, setRealEmails] = useState<HistoriqueEmail[]>([]);
  const [realNotifications, setRealNotifications] = useState<NotificationItem[]>([]);
  const [parametres, setParametres] = useState<Parametres>(initialParametres);
  const [aiAnalysesMap, setAiAnalysesMap] = useState<Record<number, any>>({});
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsDTO | null>(null);

  React.useEffect(() => {
    const syncAuthenticatedRole = () => {
      const user = getAuthUser();
      if (user) setCurrentRoleState(user.role);
    };

    syncAuthenticatedRole();
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthenticatedRole);
    window.addEventListener('storage', syncAuthenticatedRole);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthenticatedRole);
      window.removeEventListener('storage', syncAuthenticatedRole);
    };
  }, []);

  const annuaireAdminCharge = React.useRef(false);

  const refreshDashboardData = React.useCallback(async () => {
    try {
      const stats = await dashboardService.getDashboardStats();
      if (stats) {
        setDashboardStats(stats);
      }
      const audit = await dashboardService.getAuditEmails();
      if (audit && audit.length > 0) {
        const mappedEmails: HistoriqueEmail[] = audit.map(a => ({
          id: a.id,
          salarieId: a.salarieId || 0,
          salarieNom: a.salarieNom,
          destinataire: a.destinataire,
          destinataireNom: a.destinataireNom,
          roleDestinataire: (a.roleDestinataire as any) || 'RESPONSABLE',
          objet: a.objet,
          typeEmail: a.typeEmail as any,
          dateEnvoi: a.dateEnvoi,
          heureEnvoi: a.heureEnvoi,
          statut: (a.statut as any) || 'DELIVRE',
          batchCron: a.batchCron,
          contenuCorps: a.contenuCorps || a.objet,
          lienSecurise: a.lienSecurise
        }));
        setRealEmails(mappedEmails);
      }
    } catch (e) {
      console.warn('Erreur refreshDashboardData:', e);
    }

    // La base est la source de vérité des salariés (archivés compris) et des périodes
    try {
      const [backendSalaries, backendPeriodes] = await Promise.all([
        salarieService.getAllSalaries(),
        periodeService.getAllPeriodes(),
      ]);
      if (backendSalaries) setRealSalariesList(backendSalaries.map(mapSalarieBackend));
      setRealPeriodesList(backendPeriodes.map(mapPeriodeBackend));
    } catch (e) {
      console.warn('Backend /salaries ou /periodes indisponible:', e);
    }

    // Responsables : un responsable reçoit uniquement sa propre fiche (c'est elle qui lui permet de retrouver son équipe) ;
    // l'Admin RH reçoit l'annuaire complet, chargé une fois après la connexion
    try {
      const auth = getAuthUser();
      if (auth?.role === 'RESPONSABLE') {
        const moi = await responsableService.getMoi();
        if (moi) {
          setRealResponsables([{ ...moi, phone: moi.phone || '', poste: moi.poste || '', directionId: 1, directionName: 'Direction Générale' }]);
        }
      } else if (auth?.role === 'ADMIN_RH' && !annuaireAdminCharge.current) {
        const liste = await responsableService.getAllResponsables();
        if (liste) {
          annuaireAdminCharge.current = true;
          setRealResponsables(liste.map(r => ({ ...r, phone: r.phone || '', poste: r.poste || '', directionId: 1, directionName: 'Direction Générale' })));
        }
      }
    } catch (e) {
      console.warn('Chargement des responsables impossible:', e);
    }

    // Notifications : rechargées régulièrement pour que les nouvelles apparaissent sans recharger la page
    try {
      setRealNotifications(await notificationService.getAllRH());
    } catch (e) {
      console.warn('Notifications indisponibles:', e);
    }
  }, []);

  const openAddSalarieModal = () => setIsAddSalarieModalOpen(true);
  const closeAddSalarieModal = () => setIsAddSalarieModalOpen(false);
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = (key: string) => {
          const v = localStorage.getItem(key);
          return v ? JSON.parse(v) : [];
        };
        // Salariés, périodes et responsables viennent uniquement de la base (pas de cache local ni de données fictives)
        setRealSalariesList([]);
        setRealPeriodesList([]);
        setRealEvaluations(saved('gp_evaluations'));
        setRealEmails(saved('gp_emails'));
        setRealNotifications(saved('gp_notifications'));
        setRealResponsables([]);
        const rawDirections = saved('gp_directions');
        setRealDirections(rawDirections && rawDirections.length > 0 ? rawDirections : initialDirections);
        setRealUsers(saved('gp_users'));

        const savedAI = localStorage.getItem('gp_ai_analyses');
        if (savedAI) setAiAnalysesMap(JSON.parse(savedAI));

        const savedParametres = localStorage.getItem('gp_parametres');
        if (savedParametres) setParametres(JSON.parse(savedParametres));

        responsableService.getAllResponsables().then(backendResponsables => {
          if (backendResponsables) {
            setRealResponsables(backendResponsables.map(responsable => ({
              ...responsable,
              phone: responsable.phone || '',
              poste: responsable.poste || '',
              directionId: 1,
              directionName: 'Direction Générale'
            })));
          }
        });
        notificationService.getAllRH()
          .then(setRealNotifications)
          .catch(err => console.warn('Backend /notifications indisponible:', err));

        parametreService.getParametres().then(backendParams => {
          if (backendParams) {
            setParametres(prev => ({
              ...prev,
              compte: {
                ...prev.compte,
                nomExpediteur: backendParams.nomExpediteur || prev.compte.nomExpediteur,
                emailExpediteur: backendParams.emailExpediteur || prev.compte.emailExpediteur
              }
            }));
          }
        }).catch(() => {});

        refreshDashboardData();
      } catch (err) {
        console.error('Error loading', err);
      }
      setIsLoaded(true);
    }
  }, [refreshDashboardData]);

  React.useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('gp_demo_mode', String(isDemoMode));
    }
  }, [isDemoMode, isLoaded]);

  // Après chaque action réussie (création, modification, suppression, relance…), la page se recharge
  // pour afficher des données à jour. Les écrans dont le résultat doit rester lisible (connexion, imports,
  // invitations avec lien d'activation, formulaire d'évaluation, IA) sont exclus.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const EXCLUS = ['/auth/', '/import', '/invitation', '/evaluations', '/ai-evaluate', '/modeles-email', '/outils', '/notifications'];
    const fetchOriginal = window.fetch;
    let minuterie: ReturnType<typeof setTimeout> | undefined;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const reponse = await fetchOriginal(...args);
      try {
        const requete = args[0];
        const url = typeof requete === 'string' ? requete : requete instanceof URL ? requete.href : requete.url;
        const methode = (args[1]?.method || (typeof requete === 'object' && 'method' in requete ? requete.method : 'GET')).toUpperCase();
        const modifie = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(methode);
        if (reponse.ok && modifie && url.includes('/api/') && !EXCLUS.some(e => url.includes(e))) {
          clearTimeout(minuterie);
          minuterie = setTimeout(() => window.location.reload(), 1500);
        }
      } catch {
        // Ne jamais gêner l'appel d'origine
      }
      return reponse;
    };

    return () => {
      window.fetch = fetchOriginal;
      clearTimeout(minuterie);
    };
  }, []);

  React.useEffect(() => {
    if (!isLoaded || isDemoMode) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshDashboardData();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isLoaded, isDemoMode, refreshDashboardData]);

  React.useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('gp_ai_analyses', JSON.stringify(aiAnalysesMap));
    }
  }, [aiAnalysesMap, isLoaded]);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => {
      const next = !prev;
      showToast(next ? "Mode Démo / Présentation activé" : "Mode Réel activé (données réelles)");
      return next;
    });
  };

  const directions = useMemo(() => isDemoMode ? initialDirections : (realDirections.length > 0 ? realDirections : initialDirections), [isDemoMode, realDirections]);
  const responsables = useMemo(() => isDemoMode ? initialResponsables : realResponsables, [isDemoMode, realResponsables]);
  const users = useMemo(() => isDemoMode ? initialUsers : realUsers, [isDemoMode, realUsers]);
  const salariesList = useMemo(() => isDemoMode ? initialSalaries : realSalariesList, [isDemoMode, realSalariesList]);
  const periodesList = useMemo(() => {
    const list = isDemoMode ? initialPeriodes : realPeriodesList;
    return list.map(p => ({
      ...p,
      statut: (p.statut === 'PLANIFIEE' || (p.statut as string) === 'EMAIL_ENVOYE') ? ('EN_COURS' as const) : p.statut,
      donneesAnalyseAI: aiAnalysesMap[p.id] || p.donneesAnalyseAI
    }));
  }, [isDemoMode, realPeriodesList, aiAnalysesMap]);
  const evaluations = useMemo(() => {
    const list = isDemoMode ? initialEvaluations : realEvaluations;
    return list.map(e => ({
      ...e,
      donneesAnalyseAI: aiAnalysesMap[e.periodeId] || e.donneesAnalyseAI
    }));
  }, [isDemoMode, realEvaluations, aiAnalysesMap]);
  // Les évaluations déjà remplies sont relues dans la base : le formulaire est donc déjà en place
  // (et consultable) même si le responsable l'a rempli depuis un autre navigateur ou un autre poste.
  const evaluationsChargees = React.useRef<Set<number>>(new Set());
  React.useEffect(() => {
    if (!isLoaded || isDemoMode) return;
    const STATUTS_REMPLIS = ['COMPLETEE', 'VALIDE', 'VALIDEE_RH', 'RENOUVELEE', 'CONFIRMEE', 'RUPTURE', 'ROMPU'];
    const aCharger = realPeriodesList.filter(p =>
      STATUTS_REMPLIS.includes(p.statut as string) &&
      !evaluationsChargees.current.has(p.id) &&
      !realEvaluations.some(e => e.periodeId === p.id));
    aCharger.forEach(async (periode) => {
      evaluationsChargees.current.add(periode.id);
      const distante = await evaluationService.getEvaluationByPeriodeId(periode.id);
      if (!distante) return;
      let formulaire: any;
      try { formulaire = distante.jsonReponsesCriteres ? JSON.parse(distante.jsonReponsesCriteres) : undefined; } catch { /* JSON illisible */ }
      const recommandation: EvaluationDetail['recommandation'] =
        distante.recommandationEvaluateur === 'RUPTURE_CONTRAT' ? 'RUPTURE'
          : distante.recommandationEvaluateur === 'PROLONGATION_ESSAI' ? 'RENOUVELLEMENT'
            : 'CONFIRMATION';
      const evaluation: EvaluationDetail = {
        id: distante.id,
        periodeId: periode.id,
        competencesTechniques: distante.noteCompetencesPro,
        integrationEquipe: distante.noteAptitudesPerso,
        autonomieRigueur: distante.noteQSE,
        atteinteObjectifs: distante.noteGlobale,
        pointsForts: distante.pointsForts || '',
        axesAmelioration: distante.axesAmelioration || '',
        avisResponsable: distante.commentairesEvaluateur || '',
        recommandation,
        dateEvaluation: (distante.dateSoumission || '').split('T')[0],
        signatureResponsable: 'Validé',
        donneesFormulaireComplet: formulaire && Object.keys(formulaire).length > 0 ? formulaire : undefined,
      };
      setRealEvaluations(prev => prev.some(e => e.periodeId === periode.id) ? prev : [evaluation, ...prev]);
    });
  }, [isLoaded, isDemoMode, realPeriodesList, realEvaluations]);
  const emails = useMemo(() => isDemoMode ? initialEmails : realEmails, [isDemoMode, realEmails]);
  const notifications = useMemo(() => isDemoMode ? initialNotifications : realNotifications, [isDemoMode, realNotifications]);

  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_salaries', JSON.stringify(realSalariesList)); }, [realSalariesList, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_periodes', JSON.stringify(realPeriodesList)); }, [realPeriodesList, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_evaluations', JSON.stringify(realEvaluations)); }, [realEvaluations, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_emails', JSON.stringify(realEmails)); }, [realEmails, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_notifications', JSON.stringify(realNotifications)); }, [realNotifications, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_responsables', JSON.stringify(realResponsables)); }, [realResponsables, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_directions', JSON.stringify(realDirections)); }, [realDirections, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_users', JSON.stringify(realUsers)); }, [realUsers, isLoaded]);
  React.useEffect(() => { if (isLoaded) localStorage.setItem('gp_parametres', JSON.stringify(parametres)); }, [parametres, isLoaded]);

  React.useEffect(() => {
    if (!isLoaded || isDemoMode) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    setRealPeriodesList(prev => prev.map(p => {
      if (p.statut === 'COMPLETEE' || p.statut === 'VALIDEE_RH' || p.statut === 'RUPTURE' || p.statut === 'RENOUVELEE' || p.statut === 'CONFIRMEE') return p;
      const echeance = new Date(p.dateEcheance); echeance.setHours(0, 0, 0, 0);
      const diffDays = Math.round((echeance.getTime() - today.getTime()) / 86400000);
      let newStatut: PeriodeEvaluation['statut'] = p.statut;
      let newJoursRetard = p.joursRetard;

      if (diffDays > 14) {
        newStatut = 'EN_COURS';
        newJoursRetard = undefined;
      } else if (diffDays > 7) {
        newStatut = 'EN_RELANCE';
        newJoursRetard = undefined;
      } else if (diffDays >= 0) {
        newStatut = 'EN_RETARD';
        newJoursRetard = undefined;
      } else {
        // Échéance dépassée (dès le lendemain) : « Décision RH »
        newStatut = 'EN_ATTENTE_DECISION_RH';
        newJoursRetard = Math.abs(diffDays);
      }

      if (newStatut === p.statut && newJoursRetard === p.joursRetard) return p;
      return { ...p, statut: newStatut, joursRetard: newJoursRetard };
    }));
  }, [isLoaded, isDemoMode]);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', parametres.theme === 'dark' || (parametres.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
    }
  }, [parametres.theme]);

  const updateParametres = (newParams: Partial<Parametres>) => {
    setParametres(prev => {
      const updated = { ...prev, ...newParams };
      if (updated.compte?.nomExpediteur && updated.compte?.emailExpediteur) {
        parametreService.updateParametres({
          nomExpediteur: updated.compte.nomExpediteur,
          emailExpediteur: updated.compte.emailExpediteur
        }).catch(() => {});
      }
      return updated;
    });
    showToast("Paramètres mis à jour.");
  };

  const currentResponsable = useMemo(() => {
    const auth = typeof window !== 'undefined' ? getAuthUser() : null;
    if (auth && (auth.role === 'RESPONSABLE' || currentRole === 'RESPONSABLE')) {
      const byEmailOrName = responsables.find(r =>
        (auth.email && r.email?.trim().toLowerCase() === auth.email.trim().toLowerCase()) ||
        (r.lastName?.toLowerCase() === auth.nom?.toLowerCase() && r.firstName?.toLowerCase() === auth.prenom?.toLowerCase())
      );
      if (byEmailOrName) return byEmailOrName;
    }
    if (selectedResponsableId > 0) {
      const byId = responsables.find(r => r.id === selectedResponsableId);
      if (byId) return byId;
    }
    return currentRole === 'RESPONSABLE' ? (responsables[0] || null) : null;
  }, [responsables, selectedResponsableId, currentRole]);

  const currentUser = useMemo(() => {
    if (currentRole === 'ADMIN_RH') return users.find(u => u.role === 'ADMIN_RH') || users[0] || null;
    if (currentRole === 'RESPONSABLE' && currentResponsable) return users.find(u => u.responsableId === currentResponsable.id) || null;
    return users[0] || null;
  }, [currentRole, currentResponsable, users]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    setCurrentScreen('dashboard');
    showToast(role === 'RESPONSABLE' ? `Connecté: ${currentResponsable ? `${currentResponsable.firstName} ${currentResponsable.lastName}` : 'Responsable'}` : "Connecté: DRH");
  };

  const salaries = useMemo(() => {
    if (currentRole !== 'RESPONSABLE') return salariesList;
    if (!currentResponsable) return [];
    const respId = currentResponsable.id;
    const respLastName = currentResponsable.lastName?.toLowerCase().trim();
    const respFullName = `${currentResponsable.firstName} ${currentResponsable.lastName}`.toLowerCase().trim();

    return salariesList.filter(s => {
      if (respId && s.responsableId === respId) return true;
      if (s.responsableNom) {
        const nom = s.responsableNom.toLowerCase().trim();
        if (respFullName && nom === respFullName) return true;
        if (respLastName && nom.includes(respLastName)) return true;
      }
      return false;
    });
  }, [salariesList, currentRole, currentResponsable]);

  const archives = useMemo(() => salaries.filter(s => s.actif === false), [salaries]);

  const periodes = useMemo(() => {
    if (currentRole !== 'RESPONSABLE') return periodesList;
    if (!currentResponsable) return [];
    const respId = currentResponsable.id;
    const respLastName = currentResponsable.lastName?.toLowerCase().trim();
    const respFullName = `${currentResponsable.firstName} ${currentResponsable.lastName}`.toLowerCase().trim();
    const mySalarieIds = new Set(salaries.map(s => s.id));

    return periodesList.filter(p => {
      if (p.salarieId && mySalarieIds.has(p.salarieId)) return true;
      if (respId && p.responsableId === respId) return true;
      if (p.responsableNom) {
        const nom = p.responsableNom.toLowerCase().trim();
        if (respFullName && nom === respFullName) return true;
        if (respLastName && nom.includes(respLastName)) return true;
      }
      return false;
    });
  }, [periodesList, salaries, currentRole, currentResponsable]);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 4000); };

  const navigateTo = (screen: ScreenId, params?: any) => {
    if (params?.salarieId) setSelectedSalarieId(params.salarieId);
    if (params?.periodeId) setSelectedPeriodeId(params.periodeId);
    if (params?.responsableId) setSelectedResponsableId(params.responsableId);
    if (params?.emailId) { const email = emails.find(e => e.id === params.emailId); if (email) setSelectedEmail(email); }
    if (screen === 'ajouter-salarie') { setCurrentScreen('salaries'); setIsAddSalarieModalOpen(true); return; }
    setCurrentScreen(screen);
  };

  const openEmailModal = (email: HistoriqueEmail) => { setSelectedEmail(email); setIsEmailModalOpen(true); };
  const closeEmailModal = () => setIsEmailModalOpen(false);
  const addMonthsToDate = (dateStr: string, months: number) => { const d = new Date(dateStr); d.setMonth(d.getMonth() + months); return d.toISOString().split('T')[0]; };

  const resolveDirection = (name: string, fallbackId?: number): Direction | undefined => {
    const directionName = name.trim();
    const normalizeName = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const knownDirections = [...directions, ...realDirections];
    const existingDirection = directionName
      ? knownDirections.find(d => normalizeName(d.name.trim()) === normalizeName(directionName))
      : knownDirections.find(d => d.id === fallbackId);

    if (existingDirection || !directionName) return existingDirection;

    const newDirectionId = knownDirections.length > 0
      ? Math.max(...knownDirections.map(d => d.id)) + 1
      : 1;
    const baseCode = directionName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase()
      .slice(0, 50) || 'DIRECTION';
    let code = baseCode;
    let suffix = 2;
    while (knownDirections.some(d => d.code.toLocaleUpperCase() === code)) {
      const suffixText = `-${suffix++}`;
      code = `${baseCode.slice(0, 50 - suffixText.length)}${suffixText}`;
    }

    const newDirection: Direction = {
      id: newDirectionId,
      name: directionName,
      code,
      description: ''
    };
    setRealDirections(prev => [...prev, newDirection]);
    return newDirection;
  };

  const addSalarie = (data: any) => {
    if (isDemoMode) {
      showToast("Désactivez le mode Démo pour créer des données réelles permanentes.");
    }
    const directionName = String(data.directionName ?? '').trim();
    const resolvedDirection = resolveDirection(directionName, data.directionId ?? directions[0]?.id);
    const responsable = responsables.find(r => r.id === data.responsableId);
    const newId = realSalariesList.length > 0 ? Math.max(...realSalariesList.map(s => s.id)) + 1 : 1;
    // Comme côté serveur : la 1re période (bilan 3 mois) échoit à +3 mois, la fin d'essai du salarié est à +6 mois
    const echeance3M = addMonthsToDate(data.dateEmbauche, 3);
    const dateFinPrevisionnelle = addMonthsToDate(data.dateEmbauche, 6);
    const matricule = data.matricule || generateMatricule(data.societe || 'GRP', realSalariesList);
    const newSalarie: Salarie = {
      id: newId,
      matricule,
      nom: data.lastName,
      prenom: data.firstName,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? '',
      poste: data.poste ?? '',
      dateIntegration: data.dateEmbauche,
      dateEmbauche: data.dateEmbauche,
      dureeInitialeMois: 3,
      dateFinPrevisionnelle,
      directionId: resolvedDirection?.id ?? data.directionId,
      directionName: resolvedDirection?.name ?? directionName,
      responsableId: data.responsableId,
      responsableNom: responsable ? `${responsable.firstName} ${responsable.lastName}` : '',
      statutEssai: 'EN_COURS',
      PeriodeActuel: 'TROIS_MOIS',
      societe: data.societe || 'GRP',
      bloqueEmails: false,
      actif: true
    };
    setRealSalariesList(prev => [newSalarie, ...prev]);
    const periode3M: PeriodeEvaluation = {
      id: realPeriodesList.length > 0 ? Math.max(...realPeriodesList.map(p => p.id)) + 1 : 1,
      salarieId: newId,
      salarieNom: `${data.firstName} ${data.lastName}`,
      salarieEmail: data.email,
      salariePoste: data.poste,
      responsableId: data.responsableId,
      responsableNom: responsable ? `${responsable.firstName} ${responsable.lastName}` : '',
      responsableEmail: responsable ? responsable.email : '',
      directionName: resolvedDirection?.name ?? directionName,
      typePeriode: 'TROIS_MOIS',
      numeroPeriode: 1,
      dateEcheance: echeance3M,
      dateDeclenchementEmail: echeance3M,
      heureDeclenchement: '09:00:00',
      statut: 'EN_COURS',
      decisionFinale: 'EN_ATTENTE',
      tokenAccesSalarie: `sec-eval-${newId}-3m-${Date.now().toString(36)}`,
      emailsEnvoyes: {}
    };
    setRealPeriodesList(prev => [periode3M, ...prev]);

    salarieService.createSalarie({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      poste: data.poste,
      dateEmbauche: data.dateEmbauche,
      societe: data.societe ,
      directionId: resolvedDirection?.id ?? data.directionId,
      responsableId: data.responsableId
    }).then(created => {
      if (created) {
        setSelectedSalarieId(currentId => currentId === newId ? created.id : currentId);
        setRealSalariesList(prev => prev.map(s => s.id === newId ? {
          ...s,
          id: created.id,
          matricule: created.matricule,
          societe: created.societe || data.societe || 'GRP'
        } : s));
        setRealPeriodesList(prev => prev.map(p => p.salarieId === newId ? {
          ...p,
          id: created.periodeInitialeId ?? p.id,
          salarieId: created.id
        } : p));
      }
    }).catch(err => {
      console.warn("Échec enregistrement backend salarié, conservé localement:", err);
    });

    showToast(`Salarié ${data.firstName} ${data.lastName} créé.`);
    setSelectedSalarieId(newId); navigateTo('detail-salarie', { salarieId: newId });
  };

  const updateSalarie = async (id: number, data: any) => {
    const current = realSalariesList.find(s => s.id === id) || salariesList.find(s => s.id === id);
    let updatedIdentity: { societe?: string; matricule?: string } = {};
    if (data.societe && data.societe !== current?.societe) {
      if (isDemoMode) {
        updatedIdentity = {
          societe: data.societe,
          matricule: generateMatricule(data.societe, realSalariesList)
        };
      } else {
        const updated = await salarieService.updateSociete(id, data.societe);
        updatedIdentity = { societe: updated.societe, matricule: updated.matricule };
      }
    }
    setRealSalariesList(prev => prev.map(s => s.id === id
      ? { ...s, ...data, ...updatedIdentity, nom: data.lastName, prenom: data.firstName }
      : s));
    showToast(data.societe && data.societe !== current?.societe
      ? 'Salarié mis à jour. Société et matricule modifiés.'
      : 'Salarié mis à jour.');
  };
  const deleteSalarie = async (id: number) => {
    if (isDemoMode) {
      throw new Error('Désactivez le mode Démo pour supprimer un salarié de la base de données.');
    }
    await salarieService.deleteSalarie(id);
    // Suppression définitive : aucune donnée liée au salarié ne reste non plus dans le navigateur
    const periodeIds = realPeriodesList.filter(p => p.salarieId === id).map(p => p.id);
    setRealSalariesList(prev => prev.filter(s => s.id !== id));
    setRealPeriodesList(prev => prev.filter(p => p.salarieId !== id));
    setRealEvaluations(prev => prev.filter(e => !periodeIds.includes(e.periodeId)));
    setRealEmails(prev => prev.filter(e => e.salarieId !== id));
    setRealNotifications(prev => prev.filter(n => n.targetId !== id));
    setAiAnalysesMap(prev => Object.fromEntries(
      Object.entries(prev).filter(([periodeId]) => !periodeIds.includes(Number(periodeId)))
    ));
    notificationService.getAllRH().then(setRealNotifications).catch(() => {});
    refreshDashboardData();
    showToast('Salarié et toutes ses données supprimés définitivement.');
  };
  const restaurerSalarie = async (id: number) => {
    if (isDemoMode) {
      setRealSalariesList(prev => prev.map(s => s.id === id ? { ...s, actif: true } : s));
      showToast('Salarié restauré.');
      return;
    }
    try {
      await salarieService.restaurerSalarie(id);
      await refreshDashboardData();
      showToast('Salarié restauré.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de restaurer le salarié.');
    }
  };

  const addResponsable = async (data: { firstName: string; lastName: string; email: string; societe: string; phone?: string; poste?: string; }) => {
    const direction = resolveDirection('', directions[0]?.id) ?? initialDirections[0];
    if (!direction) {
      showToast('Impossible de créer le responsable : aucune affectation interne disponible.');
      return;
    }
    if (isDemoMode) {
      throw new Error('Désactivez le mode Démo pour enregistrer un responsable en base.');
    }
    // Crée le responsable et son compte, puis envoie l'invitation avec un mot de passe temporaire
    const resultat = await responsableService.inviterResponsable({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      societe: data.societe
    });
    await rechargerResponsables();
    if (resultat.responsableId) setSelectedResponsableId(resultat.responsableId);
    return resultat;
  };

  const rechargerResponsables = async () => {
    const backendResponsables = await responsableService.getAllResponsables();
    if (backendResponsables) {
      setRealResponsables(backendResponsables.map(responsable => ({
        ...responsable,
        phone: responsable.phone || '',
        poste: responsable.poste || '',
        directionId: 1,
        directionName: 'Direction Générale'
      })));
    }
  };

  const inviterResponsable = async (id: number) => {
    const resultat = await responsableService.inviterResponsableExistant(id);
    await rechargerResponsables();
    return resultat;
  };

  const importerResponsables = async (fichier: File) => {
    if (isDemoMode) {
      throw new Error('Désactivez le mode Démo pour importer des responsables en base.');
    }
    const resultats = await responsableService.importerResponsables(fichier);
    await rechargerResponsables();
    return resultats;
  };
  const importerSalaries = async (fichier: File) => {
    if (isDemoMode) {
      throw new Error('Désactivez le mode Démo pour importer des salariés en base.');
    }
    const resultats = await salarieService.importerSalaries(fichier);
    await refreshDashboardData();
    return resultats;
  };
  const updateResponsable = async (id: number, data: any) => {
    if (isDemoMode) {
      throw new Error('Désactivez le mode Démo pour modifier un responsable en base.');
    }
    const updated = await responsableService.updateResponsable(id, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      poste: data.poste,
      societe: data.societe
    });
    setRealResponsables(prev => prev.map(r => r.id === id ? {
      ...r,
      ...updated,
      phone: updated.phone || '',
      poste: updated.poste || ''
    } : r));
    setRealSalariesList(prev => prev.map(s => s.responsableId === id ? { ...s, responsableNom: `${data.firstName} ${data.lastName}` } : s));
    showToast('Responsable mis à jour en base de données.');
  };
  const deleteResponsable = async (id: number) => {
    if (isDemoMode) {
      showToast('Désactivez le mode Démo pour supprimer un responsable de la base de données.');
      return false;
    }
    if (realSalariesList.some(s => s.responsableId === id)) {
      showToast('Impossible : des salariés sont affectés à ce responsable.');
      return false;
    }
    await responsableService.deleteResponsable(id);
    setRealResponsables(prev => prev.filter(r => r.id !== id));
    showToast('Responsable supprimé de la base de données.');
    return true;
  };

  // Relance réelle : l'e-mail est envoyé par le serveur, le message reflète le résultat (envoyé ou échec)
  const relancerRetard = async (periodeId: number) => {
    if (isDemoMode) { showToast('Mode démo : aucune relance réelle envoyée.'); return; }
    try {
      const resultat = await periodeService.relancer(periodeId);
      showToast(resultat.envoye ? resultat.message : `Échec : ${resultat.message}`);
      await refreshDashboardData();
    } catch (error) {
      showToast(`Échec : ${error instanceof Error ? error.message : 'la relance a échoué.'}`);
    }
  };
  const relancerTousLesRetards = async () => {
    if (isDemoMode) { showToast('Mode démo : aucune relance réelle envoyée.'); return; }
    try {
      const { envoyees, echecs } = await periodeService.relancerTout();
      if (envoyees === 0 && echecs === 0) showToast('Aucune relance à envoyer.');
      else if (envoyees === 0) showToast(`Échec : aucune relance n'a pu être envoyée (${echecs} échec(s)). Vérifiez la configuration e-mail.`);
      else showToast(`${envoyees} relance(s) envoyée(s)${echecs > 0 ? `, ${echecs} échec(s)` : ''}.`);
      await refreshDashboardData();
    } catch (error) {
      showToast(`Échec : ${error instanceof Error ? error.message : 'les relances ont échoué.'}`);
    }
  };

  const saveAIAnalysis = (periodeId: number, analysisResult: any) => {
    setAiAnalysesMap(prev => ({ ...prev, [periodeId]: analysisResult }));
    setRealEvaluations(prev => {
      const idx = prev.findIndex(e => e.periodeId === periodeId);
      if (idx !== -1) {
        return prev.map(e => e.periodeId === periodeId ? { ...e, donneesAnalyseAI: analysisResult } : e);
      }
      const newEval: EvaluationDetail = {
        id: (prev.length > 0 ? Math.max(...prev.map(e => e.id)) : 100) + 1,
        periodeId,
        competencesTechniques: Math.round(analysisResult.moyenneGlobale || 4),
        integrationEquipe: Math.round(analysisResult.moyenneGlobale || 4),
        autonomieRigueur: Math.round(analysisResult.moyenneGlobale || 4),
        atteinteObjectifs: Math.round(analysisResult.moyenneGlobale || 4),
        pointsForts: Array.isArray(analysisResult.pointsForts) ? analysisResult.pointsForts.join('\n• ') : '',
        axesAmelioration: Array.isArray(analysisResult.axesAmelioration) ? analysisResult.axesAmelioration.join('\n• ') : '',
        avisResponsable: analysisResult.syntheseTableau?.[0]?.point3_syntheseMoyenne || '',
        recommandation: 'VALIDATION',
        dateEvaluation: new Date().toISOString().split('T')[0],
        signatureResponsable: 'Généré par IA',
        donneesAnalyseAI: analysisResult,
      };
      return [newEval, ...prev];
    });
    setRealPeriodesList(prev => prev.map(p => p.id === periodeId ? { ...p, donneesAnalyseAI: analysisResult } : p));
    showToast('Analyse IA enregistrée avec succès.');
  };

  const submitEvaluation = async (data: any) => {
    const analysisForPeriode = aiAnalysesMap[data.periodeId] || data.donneesAnalyseAI;
    let periodeSuivante: PeriodeEvaluation | undefined;

    let recommandationEvaluateur: RecommandationBackend = 'CONFIRMATION_CDI';
    if (data.recommandation === 'RUPTURE') {
      recommandationEvaluateur = 'RUPTURE_CONTRAT';
    } else if (data.recommandation === 'RENOUVELLEMENT' || data.recommandation === 'PROLONGATION_ESSAI') {
      recommandationEvaluateur = 'PROLONGATION_ESSAI';
    } else {
      recommandationEvaluateur = 'CONFIRMATION_CDI';
    }

    if (!isDemoMode && data.periodeId) {
      try {
        const noteComp = data.noteCompetencesPro || data.competencesTechniques || 4;
        const noteApt = data.noteAptitudesPerso || data.integrationEquipe || 4;
        const noteQse = data.noteQSE || data.autonomieRigueur || 4;

        const result = await evaluationService.soumettreEvaluation(data.periodeId, {
          noteCompetencesPro: Number(noteComp),
          noteAptitudesPerso: Number(noteApt),
          noteQSE: Number(noteQse),
          pointsForts: data.pointsForts || '',
          axesAmelioration: data.axesAmelioration || '',
          commentairesEvaluateur: data.avisResponsable || data.formulaireComplet?.appreciationGenerale || '',
          recommandationEvaluateur,
          jsonReponsesCriteres: JSON.stringify(data.formulaireComplet || {}),
        });
        const periodeCourante = realPeriodesList.find(p => p.id === data.periodeId);
        if (result.periodeSuivanteId && periodeCourante && result.dateEcheancePeriodeSuivante) {
          periodeSuivante = {
            ...periodeCourante,
            id: result.periodeSuivanteId,
            typePeriode: 'SIX_MOIS',
            numeroPeriode: 2,
            dateEcheance: result.dateEcheancePeriodeSuivante,
            dateDeclenchementEmail: result.dateEcheancePeriodeSuivante,
            statut: 'EN_COURS',
            joursRetard: undefined,
            noteGlobale: undefined,
            decisionFinale: 'EN_ATTENTE',
            motifDecision: undefined,
            dateValidationRH: undefined,
            dateValidationEvaluateur: undefined,
            etapeValide: undefined,
            etapeEV: undefined,
            etapeEvaluation: undefined,
            etapeSH: undefined,
            emailsEnvoyes: {},
          };
        }

        refreshDashboardData();
      } catch (err: any) {
        // Rien n'est marqué comme évalué localement si la base refuse : le formulaire affiche l'erreur
        throw err instanceof Error ? err : new Error(String(err));
      }
    }

    const newEval: EvaluationDetail = {
      id: (realEvaluations.length > 0 ? Math.max(...realEvaluations.map(e => e.id)) : (initialEvaluations.length > 0 ? Math.max(...initialEvaluations.map(e => e.id)) : 0)) + 1,
      periodeId: data.periodeId,
      competencesTechniques: data.competencesTechniques || 4,
      integrationEquipe: data.integrationEquipe || 4,
      autonomieRigueur: data.autonomieRigueur || 4,
      atteinteObjectifs: data.atteinteObjectifs || 4,
      pointsForts: data.pointsForts || '',
      axesAmelioration: data.axesAmelioration || '',
      avisResponsable: data.avisResponsable || '',
      avisSalarie: data.avisSalarie || '',
      recommandation: data.recommandation || 'VALIDATION',
      dateEvaluation: data.dateEvaluation || new Date().toISOString().split('T')[0],
      signatureResponsable: data.signatureResponsable || 'Validé',
      donneesFormulaireComplet: data.formulaireComplet,
      donneesAnalyseAI: analysisForPeriode,
    };
    setRealEvaluations(prev => [newEval, ...prev.filter(e => e.periodeId !== data.periodeId)]);

    const periodeActuelle = realPeriodesList.find(p => p.id === data.periodeId) || periodesList.find(p => p.id === data.periodeId);
    const salarieId = periodeActuelle?.salarieId;
    const isP1 = periodeActuelle?.typePeriode === 'TROIS_MOIS' || periodeActuelle?.typePeriode === 'DEUX_MOIS' || periodeActuelle?.numeroPeriode === 1;
    const isP2 = periodeActuelle?.typePeriode === 'SIX_MOIS' || periodeActuelle?.typePeriode === 'CINQ_MOIS' || periodeActuelle?.numeroPeriode === 2;
    const isRupture = data.recommandation === 'RUPTURE';

    let statutFinalPeriode: PeriodeEvaluation['statut'] = 'COMPLETEE';
    let decisionFinalePeriode: DecisionPeriode = 'CONFIRMATION';
    if (isRupture) {
      statutFinalPeriode = 'RUPTURE';
      decisionFinalePeriode = 'RUPTURE';
    } else if (isP1) {
      statutFinalPeriode = 'RENOUVELEE';
      decisionFinalePeriode = 'RENOUVELLEMENT';
    } else {
      statutFinalPeriode = 'CONFIRMEE';
      decisionFinalePeriode = 'CONFIRMATION';
    }

    setRealPeriodesList(prev => {
      const base = prev.length > 0 ? prev : (periodesList.length > 0 ? periodesList : initialPeriodes);
      let updated = base.map(p => p.id === data.periodeId
        ? {
            ...p,
            statut: statutFinalPeriode,
            decisionFinale: decisionFinalePeriode,
            dateValidationEvaluateur: new Date().toISOString().split('T')[0],
            donneesAnalyseAI: analysisForPeriode
          }
        : p);

      if (isRupture && salarieId) {
        updated = updated.map(p => p.salarieId === salarieId ? {
          ...p,
          statut: 'RUPTURE' as const,
          decisionFinale: 'RUPTURE' as const,
          joursRetard: undefined,
          motifDecision: data.motifRupture || p.motifDecision
        } : p);
      }

      if (!isRupture && isP1 && periodeActuelle && salarieId) {
        const existingP2Index = updated.findIndex(p => p.salarieId === salarieId && (p.numeroPeriode === 2 || p.typePeriode === 'SIX_MOIS'));
        if (existingP2Index >= 0) {
          const existingP2 = updated[existingP2Index];
          if (existingP2.statut !== 'COMPLETEE' && existingP2.statut !== 'CONFIRMEE' && existingP2.statut !== 'VALIDEE_RH') {
            updated[existingP2Index] = {
              ...existingP2,
              statut: 'EN_COURS',
              decisionFinale: 'EN_ATTENTE',
              joursRetard: undefined
            };
          }
        } else {
          const echeanceBase = periodeActuelle.dateEcheance || new Date().toISOString().split('T')[0];
          const nextEcheance = addMonthsToDate(echeanceBase, 3);
          const nextP2: PeriodeEvaluation = {
            ...periodeActuelle,
            id: (updated.length > 0 ? Math.max(...updated.map(p => p.id)) : 100) + 1,
            typePeriode: 'SIX_MOIS',
            numeroPeriode: 2,
            dateEcheance: nextEcheance,
            dateDeclenchementEmail: nextEcheance,
            statut: 'EN_COURS',
            decisionFinale: 'EN_ATTENTE',
            motifDecision: undefined,
            noteGlobale: undefined,
            joursRetard: undefined,
            dateValidationRH: undefined,
            dateValidationEvaluateur: undefined
          };
          updated = [nextP2, ...updated];
        }
      }

      if (periodeSuivante) {
        const pSuiv: PeriodeEvaluation = { ...periodeSuivante, statut: 'EN_COURS' };
        if (!updated.some(p => p.id === pSuiv.id)) {
          return [pSuiv, ...updated];
        }
      }
      return updated;
    });

    if (salarieId) {
      setRealSalariesList(prev => {
        const base = prev.length > 0 ? prev : (salariesList.length > 0 ? salariesList : initialSalaries);
        return base.map(s => {
          if (s.id === salarieId) {
            if (isRupture) {
              return {
                ...s,
                statutEssai: 'RUPTURE',
                dateFinPrevisionnelle: new Date().toISOString().slice(0, 10),
                actif: false,
                bloqueEmails: true,
                PeriodeActuel: 'TERMINE'
              };
            } else if (isP1) {
              return {
                ...s,
                statutEssai: 'RENOUVELEE',
                PeriodeActuel: 'SIX_MOIS',
                actif: true
              };
            } else if (isP2) {
              return {
                ...s,
                statutEssai: 'CONFIRMEE',
                dateFinPrevisionnelle: new Date().toISOString().slice(0, 10),
                PeriodeActuel: 'TERMINE',
                actif: false,
                bloqueEmails: true
              };
            }
          }
          return s;
        });
      });
    }

    const toastText = isRupture
      ? "Arrêt de contrat enregistré. Le dossier a été archivé."
      : isP1
      ? "Période 1 évaluée (Renouvellement). Passage automatique à la Période 2 (6 Mois)."
      : "Période 2 évaluée (Validation / Titularisation). Dossier archivé avec succès.";
    showToast(toastText);
  };

  const validerDecisionRH = async (periodeId: number, decision: DecisionPeriode, motif: string) => {
    if (!isDemoMode) {
      // Enregistrement en base d'abord : l'erreur remonte à l'écran et rien n'est modifié localement
      await evaluationService.priseDeDecisionDirecteRH(periodeId, {
        decisionFinale: decision === 'RUPTURE' ? 'RUPTURE' : decision === 'RENOUVELLEMENT' ? 'RENOUVELLEMENT' : 'VALIDATION',
        commentaireRH: motif,
      });
    }

    const periodeCourante = realPeriodesList.find(p => p.id === periodeId) || periodesList.find(p => p.id === periodeId);
    const salarieId = periodeCourante?.salarieId;
    const isP1 = periodeCourante?.numeroPeriode === 1 || periodeCourante?.typePeriode === 'TROIS_MOIS';
    const isP2 = periodeCourante?.numeroPeriode === 2 || periodeCourante?.typePeriode === 'SIX_MOIS';

    setRealPeriodesList(prev => {
      const base = prev.length > 0 ? prev : (periodesList.length > 0 ? periodesList : initialPeriodes);
      let nextList = base.map(p => {
        if (p.id === periodeId) {
          return {
            ...p,
            statut: decision === 'RUPTURE' ? ('RUPTURE' as const) : decision === 'RENOUVELLEMENT' ? ('RENOUVELEE' as const) : ('CONFIRMEE' as const),
            decisionFinale: decision,
            motifDecision: motif,
            dateValidationRH: new Date().toISOString().split('T')[0]
          };
        }
        return p;
      });

      if (decision === 'RUPTURE' && salarieId) {
        nextList = nextList.map(p => p.salarieId === salarieId ? {
          ...p,
          statut: 'RUPTURE' as const,
          decisionFinale: 'RUPTURE' as const,
          joursRetard: undefined,
          motifDecision: motif || p.motifDecision
        } : p);
      }

      if (decision === 'RENOUVELLEMENT' && isP1 && periodeCourante && salarieId) {
        const existingP2Index = nextList.findIndex(p => p.salarieId === salarieId && (p.numeroPeriode === 2 || p.typePeriode === 'SIX_MOIS'));
        if (existingP2Index >= 0) {
          const existingP2 = nextList[existingP2Index];
          if (existingP2.statut !== 'COMPLETEE' && existingP2.statut !== 'CONFIRMEE' && existingP2.statut !== 'VALIDEE_RH') {
            nextList[existingP2Index] = {
              ...existingP2,
              statut: 'EN_COURS',
              decisionFinale: 'EN_ATTENTE',
              joursRetard: undefined
            };
          }
        } else {
          const nextDate = addMonthsToDate(periodeCourante.dateEcheance || new Date().toISOString().split('T')[0], 3);
          const p2: PeriodeEvaluation = {
            ...periodeCourante,
            id: (nextList.length > 0 ? Math.max(...nextList.map(p => p.id)) : 100) + 1,
            typePeriode: 'SIX_MOIS',
            numeroPeriode: 2,
            dateEcheance: nextDate,
            dateDeclenchementEmail: nextDate,
            statut: 'EN_COURS',
            decisionFinale: 'EN_ATTENTE',
            motifDecision: undefined,
            noteGlobale: undefined,
            joursRetard: undefined
          };
          nextList = [p2, ...nextList];
        }
      }
      return nextList;
    });

    if (salarieId) {
      setRealSalariesList(prev => {
        const base = prev.length > 0 ? prev : (salariesList.length > 0 ? salariesList : initialSalaries);
        return base.map(s => {
          if (s.id === salarieId) {
            if (decision === 'RUPTURE') {
              return { ...s, statutEssai: 'RUPTURE', dateFinPrevisionnelle: new Date().toISOString().slice(0, 10), actif: false, bloqueEmails: true, PeriodeActuel: 'TERMINE' };
            }
            if (decision === 'CONFIRMATION') {
              return { ...s, statutEssai: 'CONFIRMEE', dateFinPrevisionnelle: new Date().toISOString().slice(0, 10), actif: false, bloqueEmails: true, PeriodeActuel: 'TERMINE' };
            }
            if (decision === 'RENOUVELLEMENT') {
              return { ...s, statutEssai: 'RENOUVELEE', PeriodeActuel: 'SIX_MOIS', actif: true };
            }
          }
          return s;
        });
      });
    }

    showToast(`Décision ${decision === 'CONFIRMATION' ? 'Validation / Titularisation' : decision === 'RENOUVELLEMENT' ? 'Renouvellement' : 'Arrêt de contrat'} validée.`);
    if (!isDemoMode) refreshDashboardData();
  };
  const triggerCronBatch0900 = () => { showToast('Batch exécuté.'); return { emailsCount: 0, retardsCount: 0 }; };
  const markNotificationAsRead = (id: number) => {
    setRealNotifications(prev => prev.map(n => n.id === id ? { ...n, estLue: true } : n));
    if (!isDemoMode) {
      notificationService.markAsRead(id).catch(err => {
        console.error('Échec du marquage de la notification comme lue:', err);
        showToast('Impossible de synchroniser le statut de lecture avec le serveur.');
      });
    }
  };
  const markAllNotificationsAsRead = () => {
    setRealNotifications(prev => prev.map(n => ({ ...n, estLue: true })));
    if (!isDemoMode) {
      notificationService.markAllAsRead().catch(err => {
        console.error('Échec du marquage des notifications comme lues:', err);
        showToast('Impossible de synchroniser les notifications avec le serveur.');
      });
    }
  };

  return (
    <AppContext.Provider value={{
        currentScreen, navigateTo, selectedResponsableId, setSelectedResponsableId, currentRole, setCurrentRole, currentUser, currentResponsable,
        selectedSalarieId, setSelectedSalarieId, selectedPeriodeId, setSelectedPeriodeId, selectedEmail, openEmailModal, closeEmailModal,
        isEmailModalOpen, isAddSalarieModalOpen, openAddSalarieModal, closeAddSalarieModal, isSidebarCollapsed, setIsSidebarCollapsed, toggleSidebar,
        parametres, updateParametres, isLoaded, isDemoMode, toggleDemoMode, directions, responsables, users, allSalaries: salariesList, salaries, archives, allPeriodes: periodesList, periodes,
        evaluations, emails, notifications, dashboardStats, refreshDashboardData, addSalarie, updateSalarie, deleteSalarie, restaurerSalarie, addResponsable, inviterResponsable, importerResponsables, importerSalaries, updateResponsable, deleteResponsable,
        relancerRetard, relancerTousLesRetards, submitEvaluation, saveAIAnalysis, validerDecisionRH, triggerCronBatch0900, markNotificationAsRead, markAllNotificationsAsRead,
        toastMessage, showToast
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}