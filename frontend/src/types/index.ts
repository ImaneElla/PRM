export type UserRole = 'ADMIN_RH' | 'RESPONSABLE';

export interface User {
  id: number;
  email: string;
  password?: string;
  role: 'ADMIN_RH' | 'RESPONSABLE';
  nom: string;
  prenom: string;
  responsableId?: number; // Si role == RESPONSABLE, lié à l'id du responsable
}

export interface Direction {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface Responsable {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  directionId: number;
  directionName: string;
  societe?: string;
  poste: string;
  photoUrl?: string;
  statutCompte?: StatutCompte;
}

export type StatutCompte = 'AUCUN' | 'INVITE' | 'ACTIF';

export type StatutEssai = 'EN_COURS' | 'RENOUVELEE' | 'CONFIRMEE' | 'RUPTURE';
export type PeriodeType = 'TROIS_MOIS' | 'SIX_MOIS' | 'DEUX_MOIS' | 'CINQ_MOIS' | 'TERMINE';
export type TypePeriode = 'TROIS_MOIS' | 'SIX_MOIS' | 'DEUX_MOIS' | 'CINQ_MOIS';

export interface Salarie {
  id: number;
  matricule?: string;
  nom?: string;
  prenom?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  poste: string;
  dateIntegration?: string; // YYYY-MM-DD
  dateEmbauche: string; // YYYY-MM-DD
  dureeInitialeMois: number; // e.g. 3 ou 6 mois
  dateFinPrevisionnelle: string;
  directionId: number;
  directionName: string;
  responsableId: number;
  responsableNom: string;
  statutEssai: StatutEssai;
  PeriodeActuel: PeriodeType;
  photoUrl?: string;
  bloqueEmails?: boolean;
  actif?: boolean;
  societe?: string;
}

export type StatutPeriode = 
  | 'EN_COURS'
  | 'EN_RELANCE'
  | 'EN_RETARD'
  | 'COMPLETEE'
  | 'VALIDEE_RH'
  | 'RENOUVELEE'
  | 'CONFIRMEE'
  | 'RUPTURE'
  | 'PLANIFIEE' 
  | 'EMAIL_ENVOYE' 
  | 'EN_ATTENTE'
  | 'EN_ATTENTE_DECISION_RH'
  | 'EN_RETARD_CRITIQUE';

export type DecisionPeriode = 'VALIDATION' | 'CONFIRMATION' | 'RENOUVELLEMENT' | 'TITULARISATION' | 'RUPTURE' | 'EN_ATTENTE';

export interface EmailsEnvoyesTracker {
  email1?: string;
  email2?: string;
  email3?: string;
}

export interface PeriodeEvaluation {
  id: number;
  salarieId: number;
  salarieNom: string;
  salarieEmail: string;
  salariePoste: string;
  responsableId: number;
  responsableNom: string;
  responsableEmail: string;
  directionName: string;
  typePeriode: TypePeriode;
  numeroPeriode?: number; // 1 (3 mois) ou 2 (6 mois)
  dateEcheance: string; // Date cible (fin de période)
  dateDeclenchementEmail: string;
  heureDeclenchement: string;
  dateDernierRappel?: string;
  dateValidationEvaluateur?: string; // Date & heure de validation par le responsable
  statut: StatutPeriode;
  joursRetard?: number;
  noteGlobale?: number;
  decisionFinale?: DecisionPeriode;
  motifDecision?: string;
  dateValidationRH?: string;
  tokenAccesSalarie?: string;
  emailsEnvoyes?: EmailsEnvoyesTracker;
  etapeValide?: boolean;
  etapeEV?: boolean;
  etapeEvaluation?: boolean;
  etapeSH?: boolean;
  donneesAnalyseAI?: any;
}

export interface FormulaireEvaluationData {
  periodeId: number;
  nom: string;
  prenom: string;
  dateIntegration: string;
  dateEvaluation: string;
  poste: string;
  directionDivision: string;
  superieurHierarchique: string;
  nomEvaluateur: string;

  objectifsStatut: 'DEPASSE' | 'ATTEINT' | 'PARTIELLEMENT_ATTEINT';
  commentairesObjectifs: string;

  scoresCompetences: { [critereId: string]: number };
  commentairesCompetences: { [critereId: string]: string };

  scoresAptitudes: { [critereId: string]: number };
  commentairesAptitudes: { [critereId: string]: string };

  scoresQSE: { [critereId: string]: number };
  commentairesQSE: { [critereId: string]: string };

  appreciationGenerale: string;
  pointsForts: string;
  axesAmelioration: string;

  recommandationCommentaire: string;
  decisionValidation: 'VALIDATION' | 'RUPTURE' | 'RENOUVELLEMENT' | 'TITULARISATION';
  motifRupture?: string;
  dateEffetDecision: string;

  dateRealisationBilan: string;
  validationDCH?: boolean;
  signatureEvalue: string;
  signatureEvaluateur: string;
  signatureSuperieur: string;
}

export interface EvaluationDetail {
  id: number;
  periodeId: number;
  competencesTechniques: number;
  integrationEquipe: number;
  autonomieRigueur: number;
  atteinteObjectifs: number;
  pointsForts: string;
  axesAmelioration: string;
  avisResponsable: string;
  avisSalarie?: string;
  recommandation: 'VALIDATION' | 'CONFIRMATION' | 'RENOUVELLEMENT' | 'TITULARISATION' | 'RUPTURE';
  dateEvaluation: string;
  signatureResponsable: string;
  signatureSalarie?: string;
  donneesFormulaireComplet?: FormulaireEvaluationData;
  donneesAnalyseAI?: any;
}

export type TypeEmail = 
  | 'EMAIL_1_EN_COURS'
  | 'EMAIL_2_EN_RELANCE'
  | 'EMAIL_3_EN_RETARD'
  | 'CONVOCATION_2M' 
  | 'CONVOCATION_5M' 
  | 'RAPPEL_RETARD_J2' 
  | 'ALERTE_CRITIQUE_J5' 
  | 'CONFIRMATION_RH';

export interface HistoriqueEmail {
  id: number;
  salarieId: number;
  salarieNom: string;
  destinataire: string;
  destinataireNom: string;
  roleDestinataire: 'RESPONSABLE' | 'SALARIE' | 'RH';
  objet: string;
  typeEmail: TypeEmail;
  dateEnvoi: string;
  heureEnvoi: string;
  statut: 'DELIVRE' | 'OUVERT';
  batchCron: boolean;
  contenuCorps: string;
  lienSecurise?: string;
}

export interface NotificationItem {
  id: number;
  titre: string;
  message: string;
  type: 'RETARD' | 'EVALUATION' | 'CRON_SYSTEME' | 'VALIDATION';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
  dateCreation: string;
  heureCreation: string;
  estLue: boolean;
  cibleRole: 'ADMIN_RH' | 'RESPONSABLE' | 'TOUS' | 'ALL_RH';
  lienEcran?: string;
  targetId?: number;
}

// Paramètres Settings
export interface TemplateEmailSetting {
  id: 'email1' | 'email2' | 'email3';
  nom: string;
  delai: string;
  objet: string;
  contenu: string;
}

export interface CompteSetting {
  nomExpediteur: string;
  emailExpediteur: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ProfilSetting {
  nom: string;
  prenom: string;
  email: string;
  societe: string;
  photoUrl?: string;
}

export interface Parametres {
  templatesEmail: TemplateEmailSetting[];
  compte: CompteSetting;
  theme: ThemeMode;
  profil: ProfilSetting;
}
