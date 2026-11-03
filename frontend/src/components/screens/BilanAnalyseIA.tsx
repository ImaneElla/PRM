"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ConsulterBouton from '@/components/common/ConsulterBouton';
import { Etoiles, Jauge } from '@/components/common/BilanFormulaireCard';
import type { EvaluationDetail, PeriodeEvaluation } from '../../types';
import type { AIAnalysisResult } from './AIAnalysisModule';

interface BilanAnalyseIAProps {
  periode: PeriodeEvaluation;
  titre: string;
  labelBouton?: string;
  evaluation?: EvaluationDetail;
}

const etiquette = 'text-xs text-[#6E6E73]';

// Liste à puces d'une cellule du tableau de synthèse
function Liste({ elements }: { elements?: string[] }) {
  if (!elements || elements.length === 0) return <span className="text-[#86868B]">—</span>;
  return (
    <ul className="list-disc space-y-1 pl-3.5 wrap-break-word">
      {elements.map((element, i) => (
        <li key={i}>{element}</li>
      ))}
    </ul>
  );
}

// Card « Analyse IA » : même structure que la card du bilan, indépendante, avec son propre bouton « Consulter ».
// Elle est liée à l'évaluation de ce seul bilan.
export default function BilanAnalyseIA({ periode, titre, evaluation, labelBouton }: BilanAnalyseIAProps) {
  const analyse = (evaluation?.donneesAnalyseAI || periode.donneesAnalyseAI) as AIAnalysisResult | undefined;
  const moyenne = typeof analyse?.moyenneGlobale === 'number' ? analyse.moyenneGlobale : null;
  const statut = !evaluation ? 'En attente du bilan' : analyse ? 'Générée' : 'Non générée';

  return (
    <Card className="p-5 space-y-4 border-t-4 border-t-[#E4002B]">
      <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D7]">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
            <Sparkles className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-tight">Analyse IA · {titre}</h4>
            <p className="text-[11px] text-muted-foreground">Échéance : {periode.dateEcheance}</p>
          </div>
        </div>
        <Badge variant={analyse ? 'appleGreen' : 'secondary'} className="text-[10px]">{statut}</Badge>
      </div>

      {!evaluation ? (
        <p className="text-sm text-[#6E6E73]">
          Disponible dès que le responsable <span className="text-[#1D1D1F]">{periode.responsableNom}</span> a rempli le bilan.
        </p>
      ) : !analyse ? (
        // Pas encore d'analyse : seulement une description, le statut et le bouton
        <div className="space-y-4">
          <p className="text-sm text-[#6E6E73]">
            L&apos;analyse IA de ce bilan n&apos;a pas encore été générée. Ouvrez-la pour la lancer à partir des notes et de l&apos;avis du responsable.
          </p>
          <div className="flex items-center justify-between gap-3 border-t border-[#E8E8ED] pt-4">
            <div className="text-sm">
              <span className={etiquette}>Statut de l&apos;analyse : </span>
              <span className="font-semibold text-[#1D1D1F]">Non générée</span>
            </div>
            <ConsulterBouton periode={periode} cible="analyse" size="sm" label={labelBouton} />
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#E8E8ED]">
          <div className="flex items-center justify-between pb-4">
            <div className="space-y-1.5">
              <span className="block text-sm text-[#1D1D1F]">Moyenne calculée</span>
              <Etoiles note={moyenne ?? 0} />
            </div>
            <span className="text-4xl font-bold tracking-tight text-[#E4002B]">
              {moyenne !== null ? moyenne : '—'}
              <span className="ml-1 text-base font-normal text-[#86868B]">/ 5</span>
            </span>
          </div>

          <div className="space-y-2 py-4">
            <Jauge note={moyenne ?? 0} />
          </div>

          {/* Synthèse générale en tableau : le contenu réel de l'analyse */}
          <div className="space-y-2 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">Synthèse générale en tableau</p>
            <div className="overflow-x-auto rounded-xl border border-[#E8E8ED]">
              <table className="w-full table-fixed border-collapse text-left text-[11px] leading-snug">
                <thead>
                  <tr className="bg-[#1D1D1F] text-[10px] font-semibold uppercase tracking-wider text-white">
                    <th className="w-1/3 border-r border-[#333] px-2.5 py-2">Points forts</th>
                    <th className="w-1/3 border-r border-[#333] px-2.5 py-2">Axes d&apos;amélioration</th>
                    <th className="w-1/3 bg-[#E4002B]/80 px-2.5 py-2">Synthèse &amp; moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top text-[#1D1D1F]">
                    <td className="border-r border-[#E8E8ED] px-2.5 py-2">
                      <Liste elements={analyse.pointsForts} />
                    </td>
                    <td className="border-r border-[#E8E8ED] px-2.5 py-2">
                      <Liste elements={analyse.axesAmelioration} />
                    </td>
                    <td className="px-2.5 py-2 wrap-break-word">
                      {analyse.syntheseTableau?.[0]?.point3_syntheseMoyenne ||
                        (moyenne !== null ? `Moyenne : ${moyenne}/5` : '—')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Le statut à gauche, le bouton en face à droite */}
          <div className="flex items-center justify-between gap-3 pt-4">
            <div className="text-sm">
              <span className={etiquette}>Statut de l&apos;analyse : </span>
              <span className={`font-semibold ${analyse ? 'text-[#1F9D55]' : 'text-[#D97706]'}`}>{analyse ? 'Analyse générée' : 'Non générée'}</span>
            </div>
            <ConsulterBouton periode={periode} cible="analyse" size="sm" label={labelBouton} />
          </div>
        </div>
      )}
    </Card>
  );
}
