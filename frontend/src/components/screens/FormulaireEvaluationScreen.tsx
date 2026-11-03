"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  CheckCircle2,
  ArrowLeft,
  Award,
  FileCheck,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  aptitudesPersoItems,
  competencesProItems,
  qseItems,
  type CriterionItem,
} from '@/lib/evaluationCriteria';
import { getSocieteLabel } from '@/lib/societe';

// ============================================================================
// Types & static data
// ============================================================================

type ScoreMap = { [id: string]: number };
type CommentMap = { [id: string]: string };
type ObjectifsStatut = 'DEPASSE' | 'ATTEINT' | 'PARTIELLEMENT_ATTEINT' | null;
type Decision = 'VALIDATION' | 'RUPTURE' | 'RENOUVELLEMENT' | 'TITULARISATION' | null;

// Date d'aujourd'hui (fuseau local) au format YYYY-MM-DD
const getToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Zone de texte qui s'agrandit selon son contenu : tout le texte reste visible, sans barre de défilement
function TexteAuto({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const champ = ref.current;
    if (!champ) return;
    champ.style.height = 'auto';
    champ.style.height = `${champ.scrollHeight + champ.offsetHeight - champ.clientHeight}px`; // bordures comprises
  }, [props.value]);
  return (
    <textarea
      ref={ref}
      {...props}
      className={`texte-formulaire block resize-none overflow-hidden whitespace-pre-wrap wrap-break-word ${className}`}
    />
  );
}

// Commentaire d'un critère : le texte passe à la ligne et la case s'agrandit selon sa longueur (rien n'est coupé)
function CommentaireCritere({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <TexteAuto
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="..."
      className="w-full text-xs leading-snug px-1.5 py-0.5 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-black outline-none"
    />
  );
}

interface CriteriaTableProps {
  title: string;
  items: CriterionItem[];
  scores: ScoreMap;
  comments: CommentMap;
  onScore: (id: string, score: number) => void;
  onComment: (id: string, value: string) => void;
  className?: string;
}

function CriteriaTable({
  title,
  items,
  scores,
  comments,
  onScore,
  onComment,
  className = 'pt-4',
}: CriteriaTableProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="font-bold text-xs uppercase tracking-wide text-[#1D1D1F]">{title}</h3>

      <div className="border border-black overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100 border-b border-black text-center font-bold">
              <th className="p-2 border-r border-black w-5/12 text-left">Critères</th>
              <th className="p-2 border-r border-black w-3/12">Évaluation</th>
              <th className="p-2 w-4/12 text-left">Commentaires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-[#F5F5F7]/50">
                <td className="p-2 border-r border-black font-medium leading-tight">
                  {item.label}
                </td>
                <td className="p-2 border-r border-black text-center">
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <label
                        key={score}
                        className="flex items-center gap-0.5 cursor-pointer text-[11px]"
                      >
                        <input
                          type="radio"
                          name={`score-${item.id}`}
                          value={score}
                          checked={scores[item.id] === score}
                          onChange={() => onScore(item.id, score)}
                          className="w-3.5 h-3.5 appearance-none rounded-full border-2 border-zinc-500 bg-white checked:border-[#E4002B] checked:bg-[#E4002B] checked:shadow-[inset_0_0_0_3px_#fff] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                        />
                        <span className="font-bold">{score}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="p-1.5 align-middle">
                  <CommentaireCritere
                    value={comments[item.id] || ''}
                    onChange={(val) => onComment(item.id, val)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Main screen
// ============================================================================

export default function FormulaireEvaluationScreen({ periodeId, onClose }: { periodeId?: number; onClose?: () => void } = {}) {
  const app = useApp();
  const {
    selectedPeriodeId,
    periodes,
    salaries,
    submitEvaluation,
    navigateTo,
    setSelectedPeriodeId,
    showToast,
  } = app;

  const { evaluations } = app;
  // Ouvert dans une fenêtre (onClose) : on la ferme au lieu de changer de section
  const quitter = () => (onClose ? onClose() : navigateTo('periodes'));

  const periode =
    (periodeId ? [...periodes, ...(app.allPeriodes ?? [])].find((p) => p.id === periodeId) : undefined) ||
    periodes.find((p) => p.id === selectedPeriodeId) ||
    periodes.find((p) => p.statut !== 'VALIDEE_RH') ||
    periodes[0];

  const salarie = [...salaries, ...(app.allSalaries ?? [])].find((s) => s.id === periode?.salarieId) || salaries[0];
  const isP1 = periode?.typePeriode === 'TROIS_MOIS' || periode?.typePeriode === 'DEUX_MOIS' || periode?.numeroPeriode === 1;
  const isP2 = periode?.typePeriode === 'SIX_MOIS' || periode?.typePeriode === 'CINQ_MOIS' || periode?.numeroPeriode === 2;

  // submitEvaluation stores the full form in `donneesFormulaireComplet`.
  const existing: any =
    evaluations.find((e) => e.periodeId === periode?.id)?.donneesFormulaireComplet ?? null;

  const isReadOnly =
    !!existing &&
    (periode?.statut === 'COMPLETEE' ||
      periode?.statut === 'VALIDEE_RH' ||
      periode?.statut === 'RENOUVELEE' ||
      periode?.statut === 'CONFIRMEE' ||
      periode?.statut === 'RUPTURE');

  // ---- Form state
  // 1. Renseignements collaborateur
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateIntegration, setDateIntegration] = useState('');
  const [dateEvaluation, setDateEvaluation] = useState(getToday());
  const [poste, setPoste] = useState('');
  const [directionDivision, setDirectionDivision] = useState('');
  const [superieurHierarchique, setSuperieurHierarchique] = useState('');
  const [nomEvaluateur, setNomEvaluateur] = useState('');

  // Evaluation des objectifs
  const [objectifsStatut, setObjectifsStatut] = useState<ObjectifsStatut>(null);
  const [commentairesObjectifs, setCommentairesObjectifs] = useState('');

  // Scores et commentaires
  const [scoresCompetences, setScoresCompetences] = useState<ScoreMap>({});
  const [commentairesCompetences, setCommentairesCompetences] = useState<CommentMap>({});
  const [scoresAptitudes, setScoresAptitudes] = useState<ScoreMap>({});
  const [commentairesAptitudes, setCommentairesAptitudes] = useState<CommentMap>({});
  const [scoresQSE, setScoresQSE] = useState<ScoreMap>({});
  const [commentairesQSE, setCommentairesQSE] = useState<CommentMap>({});

  // Appréciations générales
  const [appreciationGenerale, setAppreciationGenerale] = useState('');
  const [pointsForts, setPointsForts] = useState('');
  const [axesAmelioration, setAxesAmelioration] = useState('');

  // Recommandation
  const [recommandationCommentaire, setRecommandationCommentaire] = useState('');
  const [decisionValidation, setDecisionValidation] = useState<Decision>(null);
  const [dateEffetDecision, setDateEffetDecision] = useState(getToday());

  // Signatures / bilan
  const [dateRealisationBilan, setDateRealisationBilan] = useState(getToday());
  const [signatureEvalue, setSignatureEvalue] = useState('');
  const [signatureEvaluateur, setSignatureEvaluateur] = useState('');
  const [signatureSuperieur, setSignatureSuperieur] = useState('');

  const [soumissionReussie, setSoumissionReussie] = useState(false);
  const [soumissionEnCours, setSoumissionEnCours] = useState(false);

  // ---- Load saved data OR prefill a new form ---------------------------------
  // The form is (re)initialised only when the period changes or when a saved
  // version appears. It is NOT reset on every context update, so typing is safe.
  const loadedKey = useRef<string | null>(null);
  const currentKey = periode ? `${periode.id}-${existing ? 'saved' : 'new'}` : null;

  useEffect(() => {
    if (!periode || !currentKey || loadedKey.current === currentKey) return;
    loadedKey.current = currentKey;

    if (existing) {
      // Reload what was saved
      setNom(existing.nom ?? '');
      setPrenom(existing.prenom ?? '');
      setDateIntegration(existing.dateIntegration ?? '');
      setDateEvaluation(existing.dateEvaluation ?? getToday());
      setPoste(existing.poste ?? '');
      setDirectionDivision(salarie?.societe || 'GRP');
      setSuperieurHierarchique(existing.superieurHierarchique ?? '');
      setNomEvaluateur(existing.nomEvaluateur ?? '');
      setObjectifsStatut(existing.objectifsStatut ?? null);
      setCommentairesObjectifs(existing.commentairesObjectifs ?? '');
      setScoresCompetences(existing.scoresCompetences ?? {});
      setCommentairesCompetences(existing.commentairesCompetences ?? {});
      setScoresAptitudes(existing.scoresAptitudes ?? {});
      setCommentairesAptitudes(existing.commentairesAptitudes ?? {});
      setScoresQSE(existing.scoresQSE ?? {});
      setCommentairesQSE(existing.commentairesQSE ?? {});
      setAppreciationGenerale(existing.appreciationGenerale ?? '');
      setPointsForts(existing.pointsForts ?? '');
      setAxesAmelioration(existing.axesAmelioration ?? '');
      setRecommandationCommentaire(existing.recommandationCommentaire ?? '');
      setDecisionValidation(existing.decisionValidation ?? null);
      setDateEffetDecision(existing.dateEffetDecision ?? getToday());
      setDateRealisationBilan(existing.dateRealisationBilan ?? getToday());
      setSignatureEvalue(existing.signatureEvalue ?? '');
      setSignatureEvaluateur(existing.signatureEvaluateur ?? '');
      setSignatureSuperieur(existing.signatureSuperieur ?? '');
    } else {
      // New evaluation: prefill from the employee, empty everything else
      setNom(salarie?.nom || salarie?.lastName || '');
      setPrenom(salarie?.prenom || salarie?.firstName || '');
      setDateIntegration(salarie?.dateIntegration || salarie?.dateEmbauche || '');
      setPoste(salarie?.poste || '');
      setDirectionDivision(salarie?.societe || 'GRP');
      setSuperieurHierarchique(salarie?.responsableNom || '');
      setNomEvaluateur(salarie?.responsableNom || '');
      setDateEvaluation(getToday());
      setObjectifsStatut(null);
      setCommentairesObjectifs('');
      setScoresCompetences({});
      setCommentairesCompetences({});
      setScoresAptitudes({});
      setCommentairesAptitudes({});
      setScoresQSE({});
      setCommentairesQSE({});
      setAppreciationGenerale('');
      setPointsForts('');
      setAxesAmelioration('');
      setRecommandationCommentaire('');
      setDecisionValidation(isP1 ? 'RENOUVELLEMENT' : 'TITULARISATION');
      setDateEffetDecision(getToday());
      setDateRealisationBilan(getToday());
      setSignatureEvalue('');
      setSignatureEvaluateur('');
      setSignatureSuperieur('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  // ---- Live averages -----------------------------------------------------------
  const allScores = [
    ...Object.values(scoresCompetences),
    ...Object.values(scoresAptitudes),
    ...Object.values(scoresQSE),
  ];
  const moyenneGlobale =
    allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
      : '—';
  const moyenneNum = allScores.length > 0 ? Number(moyenneGlobale) : 0;

  // Calculs moyens par catégorie (pour l'API /evaluations/{periodeId}/soumettre)
  const compVals = Object.values(scoresCompetences);
  const noteCompetencesPro = compVals.length > 0 ? (compVals.reduce((a, b) => a + b, 0) / compVals.length) : (moyenneNum || 4);

  const aptVals = Object.values(scoresAptitudes);
  const noteAptitudesPerso = aptVals.length > 0 ? (aptVals.reduce((a, b) => a + b, 0) / aptVals.length) : (moyenneNum || 4);

  const qseVals = Object.values(scoresQSE);
  const noteQSE = qseVals.length > 0 ? (qseVals.reduce((a, b) => a + b, 0) / qseVals.length) : (moyenneNum || 4);

  // ---- Handlers -----------------------------------------------------------------
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!periode || isReadOnly || soumissionEnCours) return;
    if (!decisionValidation || decisionValidation === 'VALIDATION') {
      showToast('Veuillez choisir une recommandation avant de soumettre le formulaire.');
      return;
    }

    setSoumissionEnCours(true);
    try {
      await submitEvaluation({
        periodeId: periode.id,
        noteCompetencesPro: Number(noteCompetencesPro.toFixed(1)),
        noteAptitudesPerso: Number(noteAptitudesPerso.toFixed(1)),
        noteQSE: Number(noteQSE.toFixed(1)),
        competencesTechniques: moyenneNum,
        integrationEquipe: moyenneNum,
        autonomieRigueur: moyenneNum,
        atteinteObjectifs:
          objectifsStatut === 'DEPASSE'
            ? 5
            : objectifsStatut === 'ATTEINT'
              ? 4
              : objectifsStatut === 'PARTIELLEMENT_ATTEINT'
                ? 3
                : 0,
        pointsForts,
        axesAmelioration,
        avisResponsable: appreciationGenerale,
        avisSalarie: commentairesObjectifs,
        recommandation: decisionValidation,
        motifRupture: decisionValidation === 'RUPTURE' ? recommandationCommentaire : undefined,
        signatureEvaluateur,
        formulaireComplet: {
          periodeId: periode.id,
          nom,
          prenom,
          dateIntegration,
          dateEvaluation,
          poste,
          directionDivision,
          superieurHierarchique,
          nomEvaluateur,
          objectifsStatut: objectifsStatut || 'ATTEINT',
          commentairesObjectifs,
          scoresCompetences,
          commentairesCompetences,
          scoresAptitudes,
          commentairesAptitudes,
          scoresQSE,
          commentairesQSE,
          appreciationGenerale,
          pointsForts,
          axesAmelioration,
          recommandationCommentaire,
          decisionValidation,
          dateEffetDecision,
          dateRealisationBilan,
          signatureEvalue,
          signatureEvaluateur,
          signatureSuperieur,
        },
        donneesAnalyseAI: existing?.donneesAnalyseAI,
      });
      setSoumissionReussie(true);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'La soumission a échoué. Veuillez réessayer.';
      showToast(message);
    } finally {
      setSoumissionEnCours(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // ---- Main render
  return (
    <>
      {/* Success screen (only right after submitting, hidden when printing) */}
      {soumissionReussie && (
        <div className="max-w-2xl mx-auto py-12 px-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 print:hidden">
          <div className="w-16 h-16 bg-[#E4002B]/10 text-[#E4002B] border-2 border-[#E4002B]/20 rounded-full mx-auto flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Évaluation Enregistrée avec Succès !</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              La Fiche d&apos;Objectifs et d&apos;Évaluation de la Période d&apos;Essai pour{' '}
              <strong>
                {prenom} {nom}
              </strong>{' '}
              a été transmise avec succès. {decisionValidation === 'RUPTURE' ? "L'arrêt de contrat a été acté et le dossier a été archivé." : isP1 ? "La Période 1 a été archivée et la Période 2 (6 Mois) a été créée avec le statut En cours." : "La titularisation a été validée et le dossier a été archivé."}
            </p>
          </div>

          <div className="bg-white p-4 rounded-[12px] border border-[#E8E8ED] text-xs text-left space-y-1.5 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collaborateur :</span>
              <span className="font-semibold text-foreground">
                {prenom} {nom}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Échéance :</span>
              <span className="font-semibold text-foreground">
                {periode?.typePeriode === 'TROIS_MOIS' || periode?.numeroPeriode === 1
                  ? 'Bilan 3 Mois (Intermédiaire)'
                  : 'Bilan 6 Mois (Décision finale)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Score calculé :</span>
              <span className="font-bold text-[#E4002B]">{moyenneGlobale} / 5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Décision :</span>
              <span className="font-bold text-foreground">
                {decisionValidation === 'TITULARISATION'
                  ? 'Titularisation recommandée'
                  : decisionValidation === 'RENOUVELLEMENT'
                    ? 'Renouvellement recommandé'
                    : decisionValidation === 'RUPTURE'
                      ? 'Arrêt de contrat recommandé'
                      : 'À renseigner'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </Button>
            <Button
              onClick={() => {
                setSoumissionReussie(false);
                quitter();
              }}
              className="bg-linear-to-br from-[#EE1B3C] to-[#D1002A] border border-[#D1002A] text-white shadow-[0_1px_2px_rgba(209,0,42,0.3),0_6px_16px_-6px_rgba(209,0,42,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour aux évaluations</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main form (hidden on screen when success modal is active, but rendered on print!) */}
      <div className={`max-w-4xl mx-auto space-y-6 pb-16 font-sans print:max-w-none print:mx-0 print:pb-0 print:space-y-0 ${soumissionReussie ? 'hidden print:block' : ''}`}>
        {/* Action Bar (Top Controls) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#E8E8ED] shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={quitter}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Periode</span>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Fiche Officielle Groupe Premium
                </span>
                <Badge variant="appleRed" className="text-[10px]">
                  PS07PR02IN02FO02 v3.0
                </Badge>
                {isReadOnly && (
                  <Badge className="text-[10px] flex items-center gap-1 bg-zinc-100 text-zinc-700 border border-[#E8E8ED]">
                    <Eye className="w-3 h-3" />
                    Consultation
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Formulaire standardisé d&apos;évaluation de période d&apos;essai
              </p>
            </div>
          </div>

          {/* Period Selector (for HR & Manager) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Collaborateur :</span>
            <select
              value={periode?.id}
              onChange={(e) => setSelectedPeriodeId(Number(e.target.value))}
              className="text-xs py-1.5 px-3 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl font-medium text-foreground cursor-pointer focus:ring-1 focus:ring-[#E4002B]"
            >
              {periodes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.salarieNom} — {p.typePeriode === 'TROIS_MOIS' || p.numeroPeriode === 1 ? '3 Mois' : '6 Mois'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Average Badge */}
            <div className="flex items-center gap-1.5 bg-[#E4002B]/10 text-[#E4002B] border border-[#E4002B]/20 px-3 py-1 rounded-xl text-xs font-bold">
              <Award className="w-4 h-4" />
              <span>Moyenne : {moyenneGlobale}/5</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              title="Imprimer ou enregistrer en PDF (exactement comme le document papier)"
              className="flex items-center gap-1.5 rounded-xl border-[#E8E8ED] bg-white hover:bg-[#F5F5F7] text-xs font-medium cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimer / PDF</span>
            </Button>
          </div>
        </div>

        {salarie && (
          <Card className="p-5 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#E8E8ED] bg-[#F5F5F7] text-sm font-bold text-foreground">
                  {salarie.firstName[0]}{salarie.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      {salarie.firstName} {salarie.lastName}
                    </h2>
                    <Badge
                      variant={
                        salarie.statutEssai === 'CONFIRMEE'
                          ? 'appleGreen'
                          : salarie.statutEssai === 'RUPTURE'
                          ? 'destructive'
                          : salarie.statutEssai === 'RENOUVELEE'
                          ? 'appleOrange'
                          : 'appleBlue'
                      }
                      className="text-[10px]"
                    >
                      {salarie.statutEssai === 'CONFIRMEE'
                        ? 'Titularisé'
                        : salarie.statutEssai === 'RUPTURE'
                        ? 'Arrêt de contrat'
                        : salarie.statutEssai === 'RENOUVELEE'
                        ? 'Période renouvelée'
                        : 'Période en cours'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {salarie.poste} · {getSocieteLabel(salarie.societe)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Responsable : <strong className="text-foreground">{salarie.responsableNom}</strong>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-[#E8E8ED] bg-secondary/30 px-4 py-3 text-xs sm:min-w-64">
                <span className="text-muted-foreground">Période :</span>
                <strong className="text-right text-foreground">
                  {isP1 ? 'Période 1 · 3 mois' : 'Période 2 · 6 mois'}
                </strong>
                <span className="text-muted-foreground">Date d&apos;embauche :</span>
                <strong className="text-right font-mono text-foreground">{salarie.dateEmbauche}</strong>
                <span className="text-muted-foreground">Échéance :</span>
                <strong className="text-right font-mono text-foreground">{periode?.dateEcheance || '—'}</strong>
              </div>
            </div>
          </Card>
        )}

        {/* ===================================================================== */}
        {/* THE OFFICIAL DOCUMENT PAPER CONTAINER                                 */}
        {/* ===================================================================== */}
        <form
          id="fiche-evaluation-print"
          onSubmit={handleSubmit}
          className="print-document bg-white text-black shadow-lg border border-zinc-400 p-6 md:p-8 space-y-6 print:border-none print:shadow-none print:p-0"
        >
          {/* When read-only, every input inside is disabled */}
          <fieldset disabled={isReadOnly} className="min-w-0 border-0 p-0 m-0 space-y-6">
            {/* Document Header Table */}
            <div className="border border-black grid grid-cols-12 text-center text-xs">
              {/* Logo Box */}
              <div className="col-span-4 p-4 border-r border-black flex flex-col items-center justify-center bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-groupe-premium.png"
                  alt="Logo Premium RH"
                  width={190}
                  height={80}
                  className="mx-auto"
                />
              </div>

              {/* Title & Reference Box */}
              <div className="col-span-8 flex flex-col justify-between">
                <div className="p-3 font-bold text-sm md:text-base border-b border-black uppercase text-zinc-800 flex items-center justify-center text-center">
                  FICHE D’OBJECTIFS ET D’EVALUATION DE LA PERIODE D’ESSAI
                </div>
                <div className="grid grid-cols-3 text-[11px] print:text-[10px] font-medium divide-x divide-black py-1.5 bg-[#F5F5F7]">
                  <div className="px-2 whitespace-nowrap">
                    Référence : <span className="font-bold font-mono">PS07PR02IN02FO02</span>
                  </div>
                  <div className="px-2 whitespace-nowrap">
                    Etat : <span className="font-bold">Mise à Jour</span>
                  </div>
                  <div className="px-2 whitespace-nowrap">
                    Version n° : <span className="font-bold font-mono">3.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* SECTION 1: Renseignements du collaborateur                    */}
            {/* ============================================================= */}
            <div className="space-y-0 border border-black">
              <div className="bg-[#E4002B] text-white font-bold text-center py-1.5 uppercase text-xs tracking-wider">
                Renseignements du collaborateur
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 text-xs divide-y md:divide-y-0 md:divide-x print:divide-y-0 print:divide-x divide-black cursor-not-allowed ">
                {/* Left Column */}
                <div className="p-3 space-y-2 cursor-not-allowed ">
                  <div className="flex items-center cursor-not-allowed ">
                    <span className="w-36 font-bold">Nom :</span>
                    <input
                      type="text"
                      value={nom}
                      readOnly
                      onChange={(e) => setNom(e.target.value)}
                      className="flex-1 min-w-0 border-b border-zinc-400 focus:border-black outline-none px-1 py-0.5 font-semibold text-xs cursor-not-allowed "
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-36 font-bold">Prénom :</span>
                    <input
                      type="text"
                      value={prenom}
                      readOnly
                      onChange={(e) => setPrenom(e.target.value)}
                      className="flex-1 min-w-0 border-b border-zinc-400 focus:border-black outline-none px-1 py-0.5 font-semibold text-xs cursor-not-allowed "
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-36 font-bold">Date d’intégration :</span>
                    <input
                      type="date"
                      value={dateIntegration}
                      readOnly
                      onChange={(e) => setDateIntegration(e.target.value)}
                      className="flex-1 min-w-0 border-b border-zinc-400 focus:border-black outline-none px-1 py-0.5 text-xs font-mono cursor-not-allowed "
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-36 font-bold">Date de l’évaluation :</span>
                    <input
                      type="date"
                      value={dateEvaluation}
                      readOnly
                      tabIndex={-1}
                      className="flex-1 min-w-0 border-b border-zinc-400 outline-none px-1 py-0.5 text-xs font-mono bg-[#F5F5F7] cursor-not-allowed pointer-events-none "
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center">
                    <span className="w-40 font-bold">Poste :</span>
                    <input
                      type="text"
                      value={poste}
                      readOnly
                      onChange={(e) => setPoste(e.target.value)}
                      className="flex-1 min-w-0 border-b border-zinc-400 focus:border-black outline-none px-1 py-0.5 font-semibold text-xs cursor-not-allowed "
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-40 font-bold">Société :</span>
                    <input
                      type="text"
                      value={getSocieteLabel(directionDivision)}
                      readOnly
                      className="flex-1 min-w-0 border-b border-zinc-400 focus:border-black outline-none px-1 py-0.5 text-xs cursor-not-allowed "
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-40 font-bold">Supérieur Hiérarchique :</span>
                    <input
                      type="text"
                      value={superieurHierarchique}
                      readOnly
                      onChange={(e) => setSuperieurHierarchique(e.target.value)}
                      className="flex-1 min-w-0 border-b border-zinc-400 focus:border-black outline-none px-1 py-0.5 text-xs font-medium cursor-not-allowed "
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-40 font-bold">Nom de l’évaluateur :</span>
                    <input
                      type="text"
                      value={nomEvaluateur}
                      readOnly
                      onChange={(e) => setNomEvaluateur(e.target.value)}
                      className="flex-1 min-w-0 border-b border-zinc-400 focus:border-black outline-none px-1 py-0.5 text-xs font-medium cursor-not-allowed "
                    />
                  </div>
                </div>
              </div>

              {/* Sub-section: Evaluation des objectifs */}
              <div className="border-t border-black p-3 space-y-3">
                <div className="font-bold underline text-xs">Evaluation des objectifs :</div>

                <div className="flex flex-wrap items-center gap-6 text-xs">
                  <span className="font-bold">Objectifs</span>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="objectifs"
                      checked={objectifsStatut === 'DEPASSE'}
                      onChange={() => setObjectifsStatut('DEPASSE')}
                      className="w-4 h-4 appearance-none rounded-full border-2 border-zinc-500 bg-white checked:border-[#E4002B] checked:bg-[#E4002B] checked:shadow-[inset_0_0_0_3px_#fff] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    />
                    <span>Dépassés</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="objectifs"
                      checked={objectifsStatut === 'ATTEINT'}
                      onChange={() => setObjectifsStatut('ATTEINT')}
                      className="w-4 h-4 appearance-none rounded-full border-2 border-zinc-500 bg-white checked:border-[#E4002B] checked:bg-[#E4002B] checked:shadow-[inset_0_0_0_3px_#fff] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    />
                    <span>Atteints</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="objectifs"
                      checked={objectifsStatut === 'PARTIELLEMENT_ATTEINT'}
                      onChange={() => setObjectifsStatut('PARTIELLEMENT_ATTEINT')}
                      className="w-4 h-4 appearance-none rounded-full border-2 border-zinc-500 bg-white checked:border-[#E4002B] checked:bg-[#E4002B] checked:shadow-[inset_0_0_0_3px_#fff] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    />
                    <span>Partiellement atteints</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold">Commentaires synthétiques sur les objectifs :</div>
                  <TexteAuto
                    rows={2}
                    value={commentairesObjectifs}
                    onChange={(e) => setCommentairesObjectifs(e.target.value)}
                    placeholder="Renseignez vos commentaires et réalisations sur les objectifs fixés..."
                    className="w-full text-xs p-2 border border-zinc-300 rounded focus:border-black outline-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* SECTION 2: Grille d’évaluation & Légende                      */}
            {/* ============================================================= */}
            <div className="space-y-4">
              <div className="bg-[#E4002B] text-white font-bold text-center py-1.5 uppercase text-xs tracking-wider">
                Grille d’évaluation
              </div>

              {/* Légende */}
              <div className="border border-black grid grid-cols-12 text-xs">
                <div className="col-span-3 p-3 font-bold border-r border-black flex items-center bg-[#F5F5F7]">
                  Légende :
                </div>
                <div className="col-span-9 divide-y divide-black text-[11px]">
                  <div className="p-1 px-3">
                    <span className="font-bold">1 :</span> Performance exceptionnelle
                  </div>
                  <div className="p-1 px-3">
                    <span className="font-bold">2 :</span> Performance supérieure aux besoins du poste
                  </div>
                  <div className="p-1 px-3">
                    <span className="font-bold">3 :</span> Performance correspondant aux besoins du poste
                  </div>
                  <div className="p-1 px-3">
                    <span className="font-bold">4 :</span> Performance acceptable nécessitant une amélioration
                  </div>
                  <div className="p-1 px-3">
                    <span className="font-bold">5 :</span> Performance insuffisante et inférieure aux besoins du poste
                  </div>
                </div>
              </div>

              <CriteriaTable
                title="Compétences professionnelles & techniques"
                items={competencesProItems}
                scores={scoresCompetences}
                comments={commentairesCompetences}
                onScore={(id, score) => setScoresCompetences((prev) => ({ ...prev, [id]: score }))}
                onComment={(id, val) => setCommentairesCompetences((prev) => ({ ...prev, [id]: val }))}
                className="pt-2"
              />

              <CriteriaTable
                title="Aptitudes personnelles & comportement professionnel"
                items={aptitudesPersoItems}
                scores={scoresAptitudes}
                comments={commentairesAptitudes}
                onScore={(id, score) => setScoresAptitudes((prev) => ({ ...prev, [id]: score }))}
                onComment={(id, val) => setCommentairesAptitudes((prev) => ({ ...prev, [id]: val }))}
              />

              <CriteriaTable
                title="Bonnes pratiques QSE"
                items={qseItems}
                scores={scoresQSE}
                comments={commentairesQSE}
                onScore={(id, score) => setScoresQSE((prev) => ({ ...prev, [id]: score }))}
                onComment={(id, val) => setCommentairesQSE((prev) => ({ ...prev, [id]: val }))}
              />
            </div>

            {/* ============================================================= */}
            {/* SECTION 3: Appréciations générales des performances           */}
            {/* ============================================================= */}
            <div className="space-y-0 border border-black">
              <div className="bg-[#E4002B] text-white font-bold text-center py-1.5 uppercase text-xs tracking-wider">
                Appréciations générales des performances
              </div>

              <div className="p-4 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold block text-[#1D1D1F]">
                    Appréciation générale des performances :
                  </label>
                  <TexteAuto
                    rows={2}
                    value={appreciationGenerale}
                    onChange={(e) => setAppreciationGenerale(e.target.value)}
                    className="w-full p-2 border border-zinc-300 rounded focus:border-black outline-none text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold block text-[#1D1D1F]">Principaux points forts observés :</label>
                  <TexteAuto
                    rows={2}
                    value={pointsForts}
                    onChange={(e) => setPointsForts(e.target.value)}
                    className="w-full p-2 border border-zinc-300 rounded focus:border-black outline-none text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold block text-[#1D1D1F]">Axes d’amélioration identifiés :</label>
                  <TexteAuto
                    rows={2}
                    value={axesAmelioration}
                    onChange={(e) => setAxesAmelioration(e.target.value)}
                    className="w-full p-2 border border-zinc-300 rounded focus:border-black outline-none text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* SECTION 4: Recommandation                                     */}
            {/* ============================================================= */}
            <div className="space-y-0 border border-black">
              <div className="bg-[#E4002B] text-white font-bold text-center py-1.5 uppercase text-xs tracking-wider">
                Recommandation
              </div>

              <div className="p-3 border-b border-black">
                <TexteAuto
                  rows={2}
                  value={recommandationCommentaire}
                  onChange={(e) => setRecommandationCommentaire(e.target.value)}
                  placeholder="Renseignez ici la synthèse et les éléments motivant la recommandation..."
                  className="w-full p-2 text-xs border border-zinc-300 rounded focus:border-black outline-none"
                />
              </div>

              <div className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                    <input
                      type="radio"
                      name="decision"
                      checked={decisionValidation === 'RENOUVELLEMENT'}
                      onChange={() => setDecisionValidation('RENOUVELLEMENT')}
                      className="w-4 h-4 shrink-0 appearance-none rounded-full border-2 border-zinc-500 bg-white checked:border-[#E4002B] checked:bg-[#E4002B] checked:shadow-[inset_0_0_0_3px_#fff] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    />
                    <span>Renouvellement</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                    <input
                      type="radio"
                      name="decision"
                      checked={decisionValidation === 'TITULARISATION'}
                      onChange={() => setDecisionValidation('TITULARISATION')}
                      className="w-4 h-4 shrink-0 appearance-none rounded-full border-2 border-zinc-500 bg-white checked:border-[#E4002B] checked:bg-[#E4002B] checked:shadow-[inset_0_0_0_3px_#fff] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    />
                    <span>{isP2 ? 'Titularisation / Validation (Fin P2)' : 'Titularisation'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-red-700">
                    <input
                      type="radio"
                      name="decision"
                      checked={decisionValidation === 'RUPTURE'}
                      onChange={() => setDecisionValidation('RUPTURE')}
                      className="w-4 h-4 shrink-0 appearance-none rounded-full border-2 border-zinc-500 bg-white checked:border-[#E4002B] checked:bg-[#E4002B] checked:shadow-[inset_0_0_0_3px_#fff] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    />
                    <span>Arrêt de contrat (Rupture)</span>
                  </label>
                </div>

                {decisionValidation === 'RUPTURE' && (
                  <div className="pt-2 border-t border-[#E8E8ED] space-y-1">
                    <label className="font-bold text-red-700 block">
                      Motif de l&apos;arrêt de contrat (facultatif) :
                    </label>
                    <TexteAuto
                      rows={2}
                      value={recommandationCommentaire}
                      onChange={(e) => setRecommandationCommentaire(e.target.value)}
                      placeholder="Précisez ici le motif ou les raisons de l'arrêt de contrat..."
                      className="w-full p-2 text-xs border border-red-300 bg-red-50/30 rounded focus:border-red-600 outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#E8E8ED]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold shrink-0">Date d’effet :</span>
                    <input
                      type="date"
                      value={dateEffetDecision}
                      onChange={(e) => setDateEffetDecision(e.target.value)}
                      className="border-b border-black px-1 py-0.5 text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* SECTION 5: Validation & Signatures                            */}
            {/* ============================================================= */}
            <div className="space-y-6 pt-2 font-sans">
              <table className="w-full border-collapse text-black" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th className="border border-black p-1.5 align-top text-center font-normal">
                      <div className="text-sm font-bold">Validation DCH</div>
                      <div className="text-[11px]">Mme Saida KARDOUSSI</div>
                    </th>
                    <th className="border border-black p-1.5 align-top text-center font-normal">
                      <div className="text-sm font-bold">Evalué</div>
                      <div className="text-[11px]">
                        Nom : {prenom} {nom}
                      </div>
                    </th>
                    <th className="border border-black p-1.5 align-top text-center font-normal">
                      <div className="text-sm font-bold">Evaluateur</div>
                      <div className="text-[11px]">Nom : {nomEvaluateur}</div>
                    </th>
                    <th className="border border-black p-1.5 align-top text-center font-normal">
                      <div className="text-sm font-bold">Supérieur hiérarchique</div>
                      <div className="text-[11px]">Nom : {superieurHierarchique}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black h-40"></td>
                    <td className="border border-black h-40"></td>
                    <td className="border border-black h-40"></td>
                    <td className="border border-black h-40"></td>
                  </tr>
                </tbody>
              </table>

              {/* Date de réalisation du bilan */}
              <div className="flex items-center justify-end gap-2 text-sm pr-2">
                <span>Date de réalisation du bilan :</span>
                <input
                  type="date"
                  value={dateRealisationBilan}
                  readOnly
                  tabIndex={-1}
                  className="border-b border-dotted border-black px-2 py-0.5 text-sm outline-none font-sans bg-transparent cursor-not-allowed pointer-events-none"
                />
              </div>
            </div>
          </fieldset>

          {/* Bottom bar (outside the fieldset so Print still works in read-only) */}
          <div className="pt-6 border-t border-zinc-300 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="text-xs text-[#6E6E73]">
              Fiche certifiée conforme à la procédure{' '}
              <span className="font-mono font-semibold">PS07PR02IN02FO02</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </Button>

              {!isReadOnly && (
                <Button
                  type="submit"
                  disabled={!decisionValidation || decisionValidation === 'VALIDATION' || soumissionEnCours}
                  className="bg-linear-to-br from-[#EE1B3C] to-[#D1002A] border border-[#D1002A] text-white shadow-[0_1px_2px_rgba(209,0,42,0.3),0_6px_16px_-6px_rgba(209,0,42,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 flex items-center gap-1.5 cursor-pointer text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{soumissionEnCours ? 'Soumission...' : 'Enregistrer & Soumettre l’Évaluation'}</span>
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
}