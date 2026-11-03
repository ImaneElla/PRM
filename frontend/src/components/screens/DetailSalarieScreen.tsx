"use client";

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Mail, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ShieldCheck, 
  User, 
  Star,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Lock,
  RefreshCw
} from 'lucide-react';
import { DecisionPeriode } from '../../types';
import { getAuthUser } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import ConsulterBouton from '@/components/common/ConsulterBouton';
import BilanAnalyseIA from './BilanAnalyseIA';
import BilanFormulaireCard from '@/components/common/BilanFormulaireCard';
import { getSocieteLabel, SOCIETES } from '@/lib/societe';

const DECISION_OPTIONS: {
  value: string;
  label: string;
  icon: React.ElementType;
  active: string;
  hover: string;
}[] = [
  {
    value: 'CONFIRMATION',
    label: 'Valider',
    icon: CheckCircle2,
    active: 'border-green-600 bg-green-50 text-green-700',
    hover: 'hover:border-green-200',
  },
  {
    value: 'RENOUVELLEMENT',
    label: 'Renouveler',
    icon: RefreshCw,
    active: 'border-blue-600 bg-blue-50 text-blue-700',
    hover: 'hover:border-blue-200',
  },
  {
    value: 'RUPTURE',
    label: "Arrêt de contrat",
    icon: AlertTriangle,
    active: 'border-red-600 bg-red-50 text-red-700',
    hover: 'hover:border-red-200',
  },
];

// Période en retard : signalée « en retard » ou bloquée en attente de décision RH (échéance dépassée)
const estRetard = (statut?: string) => statut === 'EN_RETARD' || statut === 'EN_ATTENTE_DECISION_RH';

export default function DetailSalarieScreen() {
  const { 
    selectedSalarieId, 
    salaries, 
    periodes, 
    evaluations, 
    emails, 
    navigateTo, 
    openEmailModal, 
    relancerRetard, 
    validerDecisionRH,
    currentRole,
    updateSalarie,
    deleteSalarie,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'PARCOURS' | 'EMAILS'>('PARCOURS');
  const [showDecisionModal, setShowDecisionModal] = useState<boolean>(false);
  const [showConfirmDecisionModal, setShowConfirmDecisionModal] = useState<boolean>(false);
  const [decisionType, setDecisionType] = useState<DecisionPeriode | null>(null);
  const [decisionMotif, setDecisionMotif] = useState<string>('');

  // Modales d'édition et de suppression
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const salarie = salaries.find(s => s.id === selectedSalarieId) || salaries[0];

  // État du formulaire de modification
  const [editFormData, setEditFormData] = useState({
    firstName: salarie?.firstName || '',
    lastName: salarie?.lastName || '',
    email: salarie?.email || '',
    poste: salarie?.poste || '',
    responsableNom: salarie?.responsableNom || '',
    societe: salarie?.societe || 'GRP'
  });

  const salariePeriodes = periodes.filter(p => p.salarieId === salarie?.id);
  const salarieEmails = emails.filter(e => e.salarieId === salarie?.id);

  if (!salarie) {
    return (
      <div className="p-12 text-center space-y-4 font-sans">
        <p className="text-muted-foreground text-sm">Aucun salarié sélectionné ou la liste est actuellement vide.</p>
        <Button onClick={() => navigateTo('salaries')} size="sm">
          Retour à la gestion des salariés
        </Button>
      </div>
    );
  }

  const periode3M = salariePeriodes.find(p => p.typePeriode === 'TROIS_MOIS' || p.typePeriode === 'DEUX_MOIS' || p.numeroPeriode === 1);
  const periode6M = salariePeriodes.find(p => p.typePeriode === 'SIX_MOIS' || p.typePeriode === 'CINQ_MOIS' || p.numeroPeriode === 2);

  const sortedSalariePeriodes = [...salariePeriodes].sort((a, b) => {
    const isA3M = a.typePeriode === 'TROIS_MOIS' || a.typePeriode === 'DEUX_MOIS' || a.numeroPeriode === 1;
    const isB3M = b.typePeriode === 'TROIS_MOIS' || b.typePeriode === 'DEUX_MOIS' || b.numeroPeriode === 1;
    if (isA3M && !isB3M) return -1;
    if (!isA3M && isB3M) return 1;
    return new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
  });

  const isTerminee = (statut?: string) => statut === 'COMPLETEE' || statut === 'VALIDEE_RH';
  const isPeriodeCloturee = (statut?: string) =>
    isTerminee(statut) || statut === 'RENOUVELEE' || statut === 'CONFIRMEE';
  const isTitularisee = (periode?: typeof periode3M) =>
    !!periode &&
    (periode.statut === 'CONFIRMEE' ||
      periode.decisionFinale === 'CONFIRMATION' ||
      periode.decisionFinale === 'TITULARISATION' ||
      (salarie.statutEssai === 'CONFIRMEE' &&
        !['RENOUVELEE', 'RUPTURE'].includes(periode.statut)));
  const isPeriode3MTitularisee = isTitularisee(periode3M);
  const isPeriode6MTitularisee = isTitularisee(periode6M);
  const isPeriode3MRenouvelee =
    periode3M?.statut === 'RENOUVELEE' || periode3M?.decisionFinale === 'RENOUVELLEMENT';
  const isPeriode6MRenouvelee =
    periode6M?.statut === 'RENOUVELEE' || periode6M?.decisionFinale === 'RENOUVELLEMENT';

  // La décision "Fin de période" a été prise pour ce salarié
  const decisionRupture =
    salarie.statutEssai === 'RUPTURE' ||
    salariePeriodes.some(p => p.statut === 'RUPTURE');

  // Les étapes non terminées sont bloquées (affichées en gris, sans action possible)
  const troisMoisBloque = decisionRupture && !isTerminee(periode3M?.statut);
  const sixMoisBloque = decisionRupture && !isTerminee(periode6M?.statut);

  // Ouverture du modal de décision : on repart d'un formulaire vide
  const openDecisionModal = () => {
    setDecisionType(null); // aucune décision sélectionnée au départ
    setDecisionMotif('');
    setShowConfirmDecisionModal(false);
    setShowDecisionModal(true);
  };

  // Modèles de motif prêts à compléter (un par décision)
  const nomComplet = `${salarie.firstName} ${salarie.lastName}`;

  const motifModeles: Record<string, string> = {
    CONFIRMATION: `Suite à l'évaluation de la période d'essai de ${nomComplet} et en concertation avec ${salarie.responsableNom}, il a été décidé de le titulariser définitivement.\n\nMotif : `,
    RENOUVELLEMENT: `Suite à l'évaluation de la période d'essai de ${nomComplet} et en concertation avec ${salarie.responsableNom}, il a été décidé de renouveler sa période d'essai afin de poursuivre son évaluation.\n\nMotif : `,
    RUPTURE: `Suite à l'évaluation de la période d'essai de ${nomComplet} et en concertation avec ${salarie.responsableNom}, il a été décidé de procéder à l'arrêt du contrat.\n\nMotif : `,
  };

  const decisionLabel =
    DECISION_OPTIONS.find(o => o.value === decisionType)?.label ?? '';

  const handleConfirmDecision = async () => {
    if (!decisionType) return;

    // La décision cible toujours la période en cours (la plus ancienne non terminée)
    const STATUTS_CLOTURES = ['VALIDEE_RH', 'RUPTURE', 'RENOUVELEE', 'CONFIRMEE', 'COMPLETEE'];
    const activeP =
      [...salariePeriodes]
        .sort((a, b) => (a.numeroPeriode ?? 0) - (b.numeroPeriode ?? 0))
        .find(p => !STATUTS_CLOTURES.includes(p.statut)) || salariePeriodes[0];
    if (activeP) {
      try {
        await validerDecisionRH(activeP.id, decisionType, decisionMotif);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Impossible d'enregistrer la décision.");
        return;
      }
    }
    setShowConfirmDecisionModal(false);
    setShowDecisionModal(false);

    // Le renouvellement archive la période clôturée, sans archiver le salarié.
    if (
      decisionType === 'CONFIRMATION' ||
      decisionType === 'TITULARISATION' ||
      decisionType === 'RUPTURE' ||
      decisionType === 'RENOUVELLEMENT'
    ) {
      navigateTo('archive');
    }
  };

  // Soumission des modifications du salarié
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSalarie(salarie.id, editFormData);
      setShowEditModal(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de modifier la société du salarié.');
    }
  };

  // Confirmation de la suppression du salarié
  const handleDeleteSalarie = async () => {
    try {
      await deleteSalarie(salarie.id);
      setShowDeleteModal(false);
      navigateTo('salaries');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de supprimer le salarié de la base de données.');
    }
  };

  const authUser = typeof window !== 'undefined' ? getAuthUser() : null;
  const isRH = currentRole === 'ADMIN_RH' && authUser?.role !== 'RESPONSABLE';

  return (
    <div className="space-y-6 font-sans">
      {/* Navigation et actions du haut */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateTo('salaries')}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Retour à la liste des salariés</span>
        </Button>

        <div className="flex items-center gap-2">
          {/* Actions réservées strictement à l'Administrateur RH */}
          {isRH && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditFormData({
                    firstName: salarie.firstName,
                    lastName: salarie.lastName,
                    email: salarie.email,
                    poste: salarie.poste,
                    responsableNom: salarie.responsableNom,
                    societe: salarie.societe || 'GRP',
                  });
                  setShowEditModal(true);
                }}
                className="flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Modifier</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Supprimer</span>
              </Button>

              {!decisionRupture && (
                <Button
                  size="sm"
                  onClick={openDecisionModal}
                  className="flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
                >
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                  <span>Valider Décision RH</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Salarie Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] border border-[#E8E8ED] text-foreground font-bold flex items-center justify-center text-xl shrink-0 shadow-2xs">
              {salarie.firstName[0]}{salarie.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {salarie.firstName} {salarie.lastName}
                </h2>
                <Badge
                  variant={
                    decisionRupture ? 'destructive' :
                    salarie.statutEssai === 'CONFIRMEE' ? 'appleGreen' :
                    salarie.statutEssai === 'RENOUVELEE' ? 'appleOrange' : 'appleBlue'
                  }
                  className="text-xs"
                >
                  {decisionRupture ? 'Arrêt de contrat' :
                   salarie.statutEssai === 'EN_COURS' ? 'Période d\'essai en cours' :
                   salarie.statutEssai === 'CONFIRMEE' ? 'Titularisé' :
                   'Période renouvelée'}
                </Badge>
                <span className="text-xs bg-[#F5F5F7] text-muted-foreground px-2 py-0.5 rounded-md font-mono border border-[#E8E8ED]/60">
                  Matricule {salarie.matricule || 'N/A'}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground/80">{salarie.poste}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                  {getSocieteLabel(salarie.societe)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                  Responsable : <strong className="text-foreground">{salarie.responsableNom}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                  {salarie.email}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-secondary/40 border border-[#E8E8ED] text-xs space-y-1.5 shrink-0 min-w-56">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Embauche :</span>
              <span className="font-mono font-bold text-foreground">{salarie.dateEmbauche}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Durée initiale :</span>
              <span className="font-medium text-foreground"> 6 mois</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fin prévisionnelle :</span>
              <span className="font-mono font-bold text-primary">{salarie.dateFinPrevisionnelle}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Bandeau : arrêt de contrat */}
      {decisionRupture && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-700">Arrêt de contrat</p>
            <p className="mt-0.5 text-xs text-red-700/80">
              La décision RH a été enregistrée pour {salarie.firstName} {salarie.lastName}.
              Les évaluations non terminées sont bloquées et les relances automatiques sont arrêtées.
            </p>
          </div>
        </div>
      )}

      {/* Visual Timeline of Trial Milestones */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Parcours Chronologique & Periode de la Période d&apos;Essai
          </h3>
          <span className="text-xs text-muted-foreground font-mono">
            Automatique
          </span>
        </div>

        {/* Timeline Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative pt-2">
          {/* Step 1: Entrée */}
          <div className="border border-[#E8E8ED] rounded-xl p-4 bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="appleGreen" className="text-[10px]">
                Étape 1 • Réalisée
              </Badge>
              <CheckCircle2 className="w-4 h-4 text-apple-green" strokeWidth={2} />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Date d&apos;Embauche</h4>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{salarie.dateEmbauche}</p>
            <p className="text-[11px] text-muted-foreground mt-2">Prise de fonction officielle</p>
          </div>

          {/* Step 2: Bilan 3 Mois */}
          {troisMoisBloque ? (
            <div className="border border-dashed border-[#E8E8ED] rounded-xl p-4 bg-secondary/40 opacity-60 grayscale select-none">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-[10px]">Bloqué</Badge>
                <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <h4 className="text-xs font-semibold text-foreground">Bilan 3 Mois </h4>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{periode3M?.dateEcheance || '—'}</p>
              <p className="text-[11px] text-muted-foreground mt-2">Arrêt de contrat</p>
            </div>
          ) : (
            <div className={`border rounded-xl p-4 ${
              isPeriode3MTitularisee || isPeriodeCloturee(periode3M?.statut) ? 'border-apple-green/30 bg-apple-green-subtle/40' :
              estRetard(periode3M?.statut) ? 'border-destructive/30 bg-destructive/5' :
              'border-[#E8E8ED] bg-white'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  variant={
                    isPeriode3MTitularisee || isPeriodeCloturee(periode3M?.statut) ? 'appleGreen' :
                    estRetard(periode3M?.statut) ? 'destructive' :
                    'appleBlue'
                  }
                  className="text-[10px]"
                >
                  {isPeriode3MTitularisee ? 'Titularisé' :
                   isPeriode3MRenouvelee ? 'Renouvellement' :
                   estRetard(periode3M?.statut) ? `Retard +${periode3M.joursRetard}j` :
                   isPeriodeCloturee(periode3M?.statut) ? 'Validé' :
                   periode3M ? 'En cours' : 'Planifié'}
                </Badge>
                {isPeriode3MTitularisee || isPeriodeCloturee(periode3M?.statut) ? (
                  <CheckCircle2 className="w-4 h-4 text-apple-green" strokeWidth={2} />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                )}
              </div>
              <h4 className="text-xs font-semibold text-foreground">Bilan 3 Mois </h4>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{periode3M?.dateEcheance || '—'}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Email à 09:00</span>
                {estRetard(periode3M?.statut) && !decisionRupture && (
                  <Button
                    size="sm"
                    onClick={() => relancerRetard(periode3M.id)}
                    className="text-[10px] h-6 px-2"
                  >
                    Relancer
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Bilan 6 Mois */}
          {sixMoisBloque ? (
            <div className="border border-dashed border-[#E8E8ED] rounded-xl p-4 bg-secondary/40 opacity-60 grayscale select-none">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-[10px]">Bloqué</Badge>
                <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <h4 className="text-xs font-semibold text-foreground">Bilan 6 Mois (Décision)</h4>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">—</p>
              <p className="text-[11px] text-muted-foreground mt-2">Bloqué : Arrêt de contrat</p>
            </div>
          ) : (
            <div className={`border rounded-xl p-4 ${
              isPeriode6MTitularisee || isPeriodeCloturee(periode6M?.statut) ? 'border-apple-green/30 bg-apple-green-subtle/40' :
              estRetard(periode6M?.statut) ? 'border-destructive/30 bg-destructive/5' :
              'border-[#E8E8ED] bg-white'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  variant={
                    isPeriode6MTitularisee || isPeriodeCloturee(periode6M?.statut) ? 'appleGreen' :
                    estRetard(periode6M?.statut) ? 'destructive' :
                    'applePurple'
                  }
                  className="text-[10px]"
                >
                  {isPeriode6MTitularisee ? 'Titularisé' :
                   isPeriode6MRenouvelee ? 'Renouvellement' :
                   estRetard(periode6M?.statut) ? `Retard +${periode6M.joursRetard}j` :
                   isPeriodeCloturee(periode6M?.statut) ? 'Validé' :
                   periode6M ? 'En cours' : 'À venir'}
                </Badge>
                {isPeriode6MTitularisee || isPeriodeCloturee(periode6M?.statut) ? (
                  <CheckCircle2 className="w-4 h-4 text-apple-green" strokeWidth={2} />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                )}
              </div>
              <h4 className="text-xs font-semibold text-foreground">Bilan 6 Mois (Décision)</h4>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{periode6M?.dateEcheance || '—'}</p>
              <p className="text-[11px] text-muted-foreground mt-2">Avis N+1 requis</p>
            </div>
          )}

          {/* Step 4: Terme Final */}
          <div className={`border rounded-xl p-4 ${
            decisionRupture
              ? 'border-red-200 bg-red-50/60'
              : salarie.statutEssai === 'CONFIRMEE'
              ? 'border-apple-green/30 bg-apple-green-subtle/40'
              : 'border-[#E8E8ED] bg-secondary/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant={decisionRupture ? 'destructive' : salarie.statutEssai === 'CONFIRMEE' ? 'appleGreen' : 'secondary'}
                className="text-[10px]"
              >
                {decisionRupture ? 'Arrêt de contrat' : salarie.statutEssai === 'CONFIRMEE' ? 'Titularisé' : 'Étape 4 • Décision'}
              </Badge>
              {salarie.statutEssai === 'CONFIRMEE' ? (
                <CheckCircle2 className="w-4 h-4 text-apple-green" strokeWidth={2} />
              ) : (
                <ShieldCheck className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              )}
            </div>
            <h4 className="text-xs font-semibold text-foreground">Terme Période d&apos;Essai</h4>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{salarie.dateFinPrevisionnelle}</p>
            <p className="text-[11px] text-muted-foreground mt-2">
              {decisionRupture
                ? 'Arrêt de contrat'
                : salarie.statutEssai === 'CONFIRMEE'
                ? 'Période d’essai terminée'
                : 'Titularisation ou renouvellement'}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs Switcher */}
      {isRH ? (
        <div className="flex border-b border-[#E8E8ED] gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('PARCOURS')}
            className={`pb-3 transition-colors cursor-pointer ${
              activeTab === 'PARCOURS'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Bilans d&apos;Évaluation ({salariePeriodes.length})
          </button>
          <button
            onClick={() => setActiveTab('EMAILS')}
            className={`pb-3 transition-colors cursor-pointer ${
              activeTab === 'EMAILS'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Emails &amp; Convocations Transmises ({salarieEmails.length})
          </button>
        </div>
      ) : (
        <div className="border-b border-[#E8E8ED] pb-3 text-xs font-semibold text-foreground">
          Bilans d&apos;Évaluation du Collaborateur ({salariePeriodes.length})
        </div>
      )}

      {/* Tab Content: Bilans */}
      {activeTab === 'PARCOURS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedSalariePeriodes.map((p) => {
            const evalDetail = evaluations.find(e => e.periodeId === p.id);
            const isCompleted =
              p.statut === 'COMPLETEE' ||
              p.statut === 'VALIDEE_RH' ||
              p.statut === 'RENOUVELEE' ||
              p.statut === 'CONFIRMEE';
            const is3M = p.typePeriode === 'TROIS_MOIS' || p.typePeriode === 'DEUX_MOIS' || p.numeroPeriode === 1;

            // Carte "morte" : fin de période d'essai et bilan jamais rempli
            const bloquee = decisionRupture && !isCompleted && !evalDetail;
            // Bilan à afficher en détail (terminé, ou rupture saisie avec une fiche)
            const showEval = (isCompleted || p.statut === 'RUPTURE') && !!evalDetail;

            // Note globale : valeur enregistrée, sinon moyenne des critères
            const noteCalculee =
              p.noteGlobale ??
              (evalDetail
                ? (Number(evalDetail.competencesTechniques) + Number(evalDetail.integrationEquipe)) / 2
                : null);
            const noteAffichee =
              noteCalculee != null && !Number.isNaN(Number(noteCalculee))
                ? Number(Number(noteCalculee).toFixed(1))
                : null;

            if (bloquee) {
              return (
                <Card
                  key={p.id}
                  className="p-5 space-y-3 bg-secondary/40 border-dashed opacity-60 grayscale select-none"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8E8ED]/70">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-[#F5F5F7] text-muted-foreground flex items-center justify-center font-bold text-xs">
                        {is3M ? '3M' : '6M'}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground tracking-tight">
                          {is3M ? 'Bilan d\'intégration 3 mois' : 'Bilan stratégique 6 mois'}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">Échéance : {p.dateEcheance}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Bloqué
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ce bilan est bloqué : la période d&apos;essai de {salarie.firstName} {salarie.lastName} est terminée.
                    Aucune évaluation ne peut plus être remplie.
                  </p>
                </Card>
              );
            }

            return (
              <div key={p.id} className="space-y-4">
              <Card className="p-5 space-y-4 border-t-4 border-t-[#E4002B]">
                <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-2xs">
                      {is3M ? '3M' : '6M'}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground tracking-tight">
                        {is3M ? 'Bilan d\'intégration 3 mois' : 'Bilan stratégique 6 mois'}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Échéance : {p.dateEcheance}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      estRetard(p.statut) || p.statut === 'RUPTURE' ? 'destructive' :
                      p.statut === 'RENOUVELEE' ? 'appleOrange' :
                      isCompleted ? 'appleGreen' : 'secondary'
                    }
                    className="text-[10px]"
                  >
                    {p.statut === 'EN_COURS'
                      ? 'En cours'
                      : p.statut === 'EN_RELANCE'
                      ? 'En relance'
                      : p.statut === 'EN_ATTENTE_DECISION_RH'
                      ? 'Décision RH'
                      : estRetard(p.statut)
                      ? 'En retard'
                      : p.statut === 'RUPTURE'
                      ? 'Arrêt de contrat'
                      : p.statut === 'RENOUVELEE'
                      ? 'Renouvellement'
                      : p.statut === 'CONFIRMEE'
                      ? 'Titularisé'
                      : p.statut === 'COMPLETEE' || p.statut === 'VALIDEE_RH'
                      ? 'Bilan finalisé'
                      : is3M
                      ? 'Renouvellement'
                      : 'Validation / Titularisation'}
                  </Badge>
                </div>

                {showEval && evalDetail ? (
                  <BilanFormulaireCard
                    embedded
                    titre={is3M ? 'Bilan 3 mois' : 'Bilan 6 mois'}
                    nom={nomComplet}
                    echeance={p.dateEcheance}
                    evaluation={evalDetail}
                    footer={<ConsulterBouton periode={p} size="sm" />}
                  />
                ) : (
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground text-xs">
                      Ce bilan n&apos;a pas encore été finalisé par le manager <strong className="text-foreground">{p.responsableNom}</strong>.
                    </p>
                    {estRetard(p.statut) && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
                          <span>Retard de {p.joursRetard} jours constaté</span>
                        </div>
                        <p className="text-[11px] text-destructive/80">
                          L&apos;échéance est dépassée : le formulaire est verrouillé et la décision RH est requise.
                        </p>
                      </div>
                    )}
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigateTo('formulaire-evaluation', { periodeId: p.id })}
                        className="cursor-pointer"
                      >
                        Remplir l&apos;évaluation
                      </Button>
                      {isRH && estRetard(p.statut) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => relancerRetard(p.id)}
                          className="cursor-pointer flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" strokeWidth={1.75} />
                          <span>Relancer N+1</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>

                {/* L'analyse IA est réservée aux administrateurs */}
                {isRH && (
                  <BilanAnalyseIA
                    periode={p}
                    titre={is3M ? 'Bilan 3 mois' : 'Bilan 6 mois'}
                    evaluation={evalDetail}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content: Emails */}
      {activeTab === 'EMAILS' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#E8E8ED] bg-secondary/30 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Audit des Emails Transmis pour ce Dossier
            </h4>
            <span className="text-xs text-muted-foreground">
              {salarieEmails.length} message{salarieEmails.length > 1 ? 's' : ''} archivé{salarieEmails.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {salarieEmails.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Aucun email n&apos;a encore été généré pour ce collaborateur.
              </div>
            ) : (
              salarieEmails.map((email) => (
                <div key={email.id} className="p-4 hover:bg-[#F5F5F7] transition-all duration-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-foreground flex items-center justify-center shrink-0 border border-[#E8E8ED]">
                      <Mail className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground tracking-tight">{email.objet}</span>
                        {email.batchCron && (
                          <Badge variant="appleRed" className="text-[10px] px-1.5 py-0">
                            Automatique
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Envoyé à : <strong className="text-foreground">{email.destinataireNom}</strong> ({email.destinataire}) • {email.dateEnvoi} à {email.heureEnvoi}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEmailModal(email)}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <span>Voir l&apos;email</span>
                    <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Modal d'édition des informations du salarié */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border border-[#E8E8ED] shadow-[0_24px_64px_rgba(0,0,0,0.12)] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8ED]">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" strokeWidth={1.75} />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  Modifier les informations du salarié
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Nom</label>
                  <input
                    type="text"
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Poste</label>
                  <input
                    type="text"
                    value={editFormData.poste}
                    onChange={(e) => setEditFormData({ ...editFormData, poste: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Société / Entité</label>
                  <select
                    value={editFormData.societe}
                    onChange={(e) => setEditFormData({ ...editFormData, societe: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    {SOCIETES.map(({ code, label }) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Le matricule sera automatiquement adapté à la nouvelle société.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Manager N+1</label>
                <input
                  type="text"
                  value={editFormData.responsableNom}
                  onChange={(e) => setEditFormData({ ...editFormData, responsableNom: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8ED]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm">
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border border-[#E8E8ED] shadow-[0_24px_64px_rgba(0,0,0,0.12)] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold tracking-tight">Supprimer le salarié</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer <strong className="text-foreground">{salarie.firstName} {salarie.lastName}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSalarie}
              >
                Confirmer la suppression
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {isRH && showDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border border-[#E8E8ED] shadow-[0_24px_64px_rgba(0,0,0,0.12)] max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8ED]">
              <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.75} />
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Validation Officielle de la Décision RH
              </h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Cette décision validera le parcours de période d&apos;essai de <strong className="text-foreground">{salarie.firstName} {salarie.lastName}</strong> et lui adressera un email formel de notification.
            </p>

            <div className="space-y-3">
              {/* Décision : 3 boutons cliquables */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Décision RH
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DECISION_OPTIONS.map(({ value, label, icon: Icon, active, hover }) => {
                    const selected = decisionType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDecisionType(value as DecisionPeriode)}
                        aria-pressed={selected}
                        className={`flex flex-col items-center justify-center gap-1.5 text-xs px-3 py-3 rounded-xl border-2 font-semibold cursor-pointer transition-all ${
                          selected
                            ? active
                            : `border-[#E8E8ED] bg-secondary/50 text-foreground ${hover}`
                        }`}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Motif avec modèle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-foreground">
                    Motif / Synthèse RH <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    disabled={!decisionType}
                    onClick={() => decisionType && setDecisionMotif(motifModeles[decisionType])}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Utiliser un modèle
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={decisionMotif}
                  onChange={(e) => setDecisionMotif(e.target.value)}
                  className="w-full text-xs p-3 bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                  placeholder="Écrivez le motif de la décision prise en concertation avec le responsable hiérarchique..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDecisionModal(false)}
                className="cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                disabled={!decisionType || decisionMotif.trim() === ''}
                onClick={() => setShowConfirmDecisionModal(true)}
                className="cursor-pointer shadow-xs"
              >
                Enregistrer et Notifier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de la décision */}
      {showDecisionModal && showConfirmDecisionModal && decisionType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border border-[#E8E8ED] shadow-[0_24px_64px_rgba(0,0,0,0.12)] max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div
              className={`flex items-center gap-2.5 ${
                decisionType === 'RUPTURE' ? 'text-destructive' : 'text-foreground'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold tracking-tight">
                Confirmer la décision : {decisionLabel}
              </h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Êtes-vous sûr de vouloir enregistrer la décision «&nbsp;{decisionLabel}&nbsp;» pour{' '}
              <strong className="text-foreground">{nomComplet}</strong> ?
              Un email de notification sera envoyé et cette action est irréversible.
            </p>

            <div className="rounded-xl border border-[#E8E8ED] bg-secondary/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Motif enregistré
              </p>
              <p className="text-xs text-foreground whitespace-pre-wrap">{decisionMotif}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmDecisionModal(false)}
                className="cursor-pointer"
              >
                Retour
              </Button>
              <Button
                variant={decisionType === 'RUPTURE' ? 'destructive' : 'default'}
                size="sm"
                onClick={handleConfirmDecision}
                className="cursor-pointer"
              >
                Oui, confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}