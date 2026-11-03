"use client";

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Sparkles } from 'lucide-react';
import AIAnalysisModule from './AIAnalysisModule';
import ConsulterBouton from '@/components/common/ConsulterBouton';
import {
  aptitudesPersoItems,
  competencesProItems,
  qseItems,
} from '@/lib/evaluationCriteria';

function buildCriteria(
  items: { id: string; label: string }[],
  scores: Record<string, number>,
  comments: Record<string, string>
) {
  return items.map((item) => ({
    nom: item.label,
    note: scores[item.id] === undefined ? 'Non évalué' : `${scores[item.id]}/5`,
    commentaire: comments[item.id] ?? '',
  }));
}

export default function AIAnalysisScreen() {
  const { evaluations, periodes, selectedPeriodeId, saveAIAnalysis, navigateTo } = useApp();

  const [activePeriodeId, setActivePeriodeId] = useState<number>(() => {
    if (selectedPeriodeId && periodes.some((p) => p.id === selectedPeriodeId)) {
      return selectedPeriodeId;
    }
    const evalPeriode = evaluations[0]?.periodeId;
    if (evalPeriode && periodes.some((p) => p.id === evalPeriode)) {
      return evalPeriode;
    }
    return periodes[0]?.id || 1;
  });

  // Synchronisation si selectedPeriodeId change dans l'app
  useState(() => {
    if (selectedPeriodeId && periodes.some((p) => p.id === selectedPeriodeId)) {
      setActivePeriodeId(selectedPeriodeId);
    }
  });

  // Liste des collaborateurs : une ligne par bilan, avec sa note (moyenne des trois critères) et l'état de l'analyse
  const [recherche, setRecherche] = useState('');
  const lignes = periodes.map((p) => {
    const ev = evaluations.find((e) => e.periodeId === p.id);
    const note = ev
      ? Math.round(((Number(ev.competencesTechniques) + Number(ev.integrationEquipe) + Number(ev.autonomieRigueur)) / 3) * 10) / 10
      : (p.noteGlobale ?? null);
    return { periode: p, note, aAnalyse: !!(ev?.donneesAnalyseAI || p.donneesAnalyseAI), rempli: !!ev };
  });
  // Filtre : tous, ceux dont l'analyse est faite, ceux qui n'en ont pas encore
  const [filtre, setFiltre] = useState<'TOUS' | 'ANALYSES' | 'NON_ANALYSES'>('TOUS');
  const nbAnalyses = lignes.filter((l) => l.aAnalyse).length;
  const lignesFiltrees = lignes.filter((l) =>
    (l.periode.salarieNom || '').toLowerCase().includes(recherche.trim().toLowerCase()) &&
    (filtre === 'TOUS' || (filtre === 'ANALYSES' ? l.aAnalyse : !l.aAnalyse))
  );

  const currentPeriode = periodes.find((p) => p.id === activePeriodeId) || periodes[0];
  const currentEvaluation = evaluations.find((e) => e.periodeId === currentPeriode?.id);
  const savedForm = currentEvaluation?.donneesFormulaireComplet;
  const savedAI = currentEvaluation?.donneesAnalyseAI || currentPeriode?.donneesAnalyseAI;

  const data = currentPeriode && currentEvaluation
    ? {
        salarieName: currentPeriode.salarieNom || 'Salarié',
        poste: savedForm?.poste || currentPeriode.salariePoste || 'Poste non renseigné',
        criteres: savedForm
          ? [
              ...buildCriteria(
                competencesProItems,
                savedForm.scoresCompetences,
                savedForm.commentairesCompetences
              ),
              ...buildCriteria(
                aptitudesPersoItems,
                savedForm.scoresAptitudes,
                savedForm.commentairesAptitudes
              ),
              ...buildCriteria(qseItems, savedForm.scoresQSE, savedForm.commentairesQSE),
            ]
          : [
              ...buildCriteria(
                competencesProItems,
                { comp_1: 4, comp_2: 4, comp_3: 4, comp_4: 4, comp_5: 4, comp_6: 4, comp_7: 4, comp_8: 4 },
                { comp_1: 'Très bon niveau technique' }
              ),
              ...buildCriteria(
                aptitudesPersoItems,
                { apt_1: 4, apt_2: 4, apt_3: 4, apt_4: 4, apt_5: 4, apt_6: 4, apt_7: 4, apt_8: 4 },
                { apt_1: 'Bonne intégration collective' }
              ),
              ...buildCriteria(
                qseItems,
                { qse_1: 4, qse_2: 4, qse_3: 4, qse_4: 4, qse_5: 4, qse_6: 4, qse_7: 4, qse_8: 4 },
                { qse_1: 'Respect des procédures' }
              ),
            ],
        appreciationGenerale: [
          savedForm?.appreciationGenerale,
          savedForm?.commentairesObjectifs,
          savedForm?.recommandationCommentaire,
          currentEvaluation?.avisResponsable,
        ]
          .filter(Boolean)
          .join('\n') || 'Bilan professionnel satisfaisant au cours de la période.',
        pointsForts: savedForm?.pointsForts || currentEvaluation?.pointsForts,
        axesAmelioration: savedForm?.axesAmelioration || currentEvaluation?.axesAmelioration,
        donneesAnalyseAI: savedAI,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header statutaire stylisé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E8ED]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-[8px] bg-[#FFF0F3] text-[#E4002B]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl md:text-2xl font-semibold text-[#1D1D1F] tracking-tight">
              Analyse IA des Évaluations
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#6E6E73]">
            Audit cognitif, calcul automatisé des moyennes et aide à la décision pour les périodes d&apos;essai.
          </p>
        </div>
      </div>

      {periodes.length === 0 ? (
        <Card className="space-y-3 p-8 text-center border-dashed">
          <p className="text-sm font-semibold text-[#1D1D1F]">Aucune période d&apos;évaluation disponible</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Les évaluations de votre équipe apparaîtront ici pour le traitement décisionnel.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigateTo('periodes')}>
            Voir les périodes d’évaluation
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            {/* Liste des collaborateurs avec leur note */}
            <aside className="rounded-[16px] border border-[#E8E8ED] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] lg:sticky lg:top-0">
              <div className="space-y-3 border-b border-[#E8E8ED] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">Collaborateurs</p>
                  <p className="text-[11px] text-muted-foreground">{lignes.length} bilan{lignes.length > 1 ? 's' : ''} · choisissez-en un pour générer son analyse.</p>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#86868B]" />
                  <input
                    type="search"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher un collaborateur"
                    aria-label="Rechercher un collaborateur"
                    className="h-9 w-full rounded-[10px] border border-[#E8E8ED] bg-[#F5F5F7] pl-8 pr-3 text-xs outline-none focus:border-[#1D1D1F]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-[#F5F5F7] p-1" role="tablist" aria-label="Filtrer par état de l'analyse">
                  {([
                    ['TOUS', `Tous (${lignes.length})`],
                    ['ANALYSES', `Analysés (${nbAnalyses})`],
                    ['NON_ANALYSES', `Non analysés (${lignes.length - nbAnalyses})`],
                  ] as const).map(([valeur, libelle]) => (
                    <button
                      key={valeur}
                      type="button"
                      role="tab"
                      aria-selected={filtre === valeur}
                      onClick={() => setFiltre(valeur)}
                      className={`cursor-pointer rounded-[8px] px-1.5 py-1.5 text-[11px] font-medium leading-tight transition-colors ${
                        filtre === valeur ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {libelle}
                    </button>
                  ))}
                </div>
              </div>

              <ul className="max-h-[60vh] divide-y divide-[#E8E8ED] overflow-y-auto">
                {lignesFiltrees.length === 0 && (
                  <li className="p-4 text-center text-xs text-muted-foreground">Aucun collaborateur trouvé.</li>
                )}
                {lignesFiltrees.map(({ periode: p, note, aAnalyse, rempli }) => {
                  const actif = p.id === currentPeriode?.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setActivePeriodeId(p.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors ${actif ? 'bg-[#F5F5F7]' : 'hover:bg-[#FAFAFB]'}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${actif ? 'bg-[#E4002B] text-white' : 'bg-[#F0F0F5] text-[#515154]'}`}>
                          {(p.salarieNom || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[#1D1D1F]">{p.salarieNom}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {p.typePeriode === 'TROIS_MOIS' ? 'Bilan 3 mois' : 'Bilan 6 mois'}
                            {' · '}
                            {!rempli ? 'Non rempli' : aAnalyse ? 'Analyse générée' : 'À analyser'}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold text-[#1D1D1F]">{note !== null ? note.toFixed(1) : '—'}</span>
                          <span className="block text-[10px] text-[#86868B]">/ 5</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Fenêtre de génération de l'analyse IA */}
            <div className="min-w-0 space-y-3">
              {currentPeriode && data && (
                <div className="flex justify-end">
                  <ConsulterBouton
                    key={currentPeriode.id}
                    periode={currentPeriode}
                    cible="bilan"
                    size="default"
                    label="Consulter le formulaire"
                  />
                </div>
              )}
              {data ? (
                <AIAnalysisModule
                  key={currentPeriode?.id}
                  data={data}
                  onSaveAnalysis={(res) => {
                    if (currentPeriode?.id) saveAIAnalysis(currentPeriode.id, res);
                  }}
                />
              ) : (
                <Card className="space-y-4 p-6">
                  {/* Le bilan concerné */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#E8E8ED] pb-4">
                    <div className="min-w-0">
                      <p className="text-xs text-[#6E6E73]">
                        {currentPeriode?.typePeriode === 'TROIS_MOIS' ? 'Bilan 3 mois' : 'Bilan 6 mois'}
                      </p>
                      <h3 className="truncate text-lg font-semibold text-[#1D1D1F]">{currentPeriode?.salarieNom}</h3>
                      <p className="mt-0.5 text-xs text-[#6E6E73]">
                        {currentPeriode?.salariePoste ? `${currentPeriode.salariePoste} · ` : ''}
                        Échéance : {currentPeriode?.dateEcheance}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[11px] font-medium text-[#6E6E73]">Non rempli</span>
                  </div>

                  <dl className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <dt className="text-[#6E6E73]">Responsable</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[#1D1D1F]">{currentPeriode?.responsableNom || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6E6E73]">Note globale</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[#1D1D1F]">—</dd>
                    </div>
                  </dl>

                  <p className="rounded-xl bg-[#F5F5F7] p-3 text-xs text-[#6E6E73]">
                    Ce bilan n&apos;a pas encore été rempli par le responsable : l&apos;analyse IA sera disponible dès qu&apos;il le sera.
                  </p>

                  {currentPeriode && (
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => navigateTo('formulaire-evaluation', { periodeId: currentPeriode.id })}>
                        Ouvrir le formulaire du bilan
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}