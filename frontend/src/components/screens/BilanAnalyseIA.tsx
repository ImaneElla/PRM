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
  evaluation?: EvaluationDetail;
}

const etiquette = 'text-xs text-[#6E6E73]';

// Card « Analyse IA » : même structure que la card du bilan, indépendante, avec son propre bouton « Consulter ».
// Elle est liée à l'évaluation de ce seul bilan.
export default function BilanAnalyseIA({ periode, titre, evaluation }: BilanAnalyseIAProps) {
  const analyse = (evaluation?.donneesAnalyseAI || periode.donneesAnalyseAI) as AIAnalysisResult | undefined;
  const moyenne = typeof analyse?.moyenneGlobale === 'number' ? analyse.moyenneGlobale : null;
  const statut = !evaluation ? 'En attente du bilan' : analyse ? 'Générée' : 'Non générée';

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8ED]/70">
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
            <ConsulterBouton periode={periode} cible="analyse" size="sm" />
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#E8E8ED]">
          <div className="flex items-center justify-between pb-4">
            <div className="space-y-1.5">
              <span className="block text-sm text-[#1D1D1F]">Moyenne calculée</span>
              <Etoiles note={moyenne ?? 0} />
            </div>
            <span className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">
              {moyenne !== null ? moyenne : '—'}
              <span className="ml-1 text-base font-normal text-[#86868B]">/ 5</span>
            </span>
          </div>

          <div className="space-y-2 py-4">
            <Jauge note={moyenne ?? 0} />
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <p className={etiquette}>Points forts</p>
              <p className="mt-1 text-lg font-semibold text-[#1D1D1F]">{analyse ? analyse.pointsForts?.length ?? 0 : '—'}</p>
            </div>
            <div>
              <p className={etiquette}>Axes d&apos;amélioration</p>
              <p className="mt-1 text-lg font-semibold text-[#1D1D1F]">{analyse ? analyse.axesAmelioration?.length ?? 0 : '—'}</p>
            </div>
          </div>

          {/* Le statut à gauche, le bouton en face à droite */}
          <div className="flex items-center justify-between gap-3 pt-4">
            <div className="text-sm">
              <span className={etiquette}>Statut de l&apos;analyse : </span>
              <span className="font-semibold text-[#1D1D1F]">{analyse ? 'Analyse générée' : 'Non générée'}</span>
            </div>
            <ConsulterBouton periode={periode} cible="analyse" size="sm" />
          </div>
        </div>
      )}
    </Card>
  );
}
