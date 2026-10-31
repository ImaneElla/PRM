"use client";

import React from 'react';
import { Sparkles, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ConsulterBouton from '@/components/common/ConsulterBouton';
import type { EvaluationDetail, PeriodeEvaluation } from '../../types';
import type { AIAnalysisResult } from './AIAnalysisModule';

interface BilanAnalyseIAProps {
  periode: PeriodeEvaluation;
  titre: string;
  evaluation?: EvaluationDetail;
}

// Card « Analyse IA » : même structure et même style que la card du bilan, mais indépendante,
// avec son propre bouton « Consulter ». Elle est liée à l'évaluation de ce seul bilan.
export default function BilanAnalyseIA({ periode, titre, evaluation }: BilanAnalyseIAProps) {
  const analyse = (evaluation?.donneesAnalyseAI || periode.donneesAnalyseAI) as AIAnalysisResult | undefined;
  const moyenne = typeof analyse?.moyenneGlobale === 'number' ? analyse.moyenneGlobale : null;

  const statut = !evaluation ? 'En attente du bilan' : analyse ? 'Analyse générée' : 'Non générée';

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
        <Badge variant={analyse ? 'appleGreen' : 'secondary'} className="text-[10px]">
          {statut}
        </Badge>
      </div>

      {!evaluation ? (
        <p className="text-muted-foreground text-xs">
          Disponible dès que le responsable <strong className="text-foreground">{periode.responsableNom}</strong> a rempli le bilan.
        </p>
      ) : (
        <div className="space-y-5 pt-1">
          <div className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-white to-white p-4 shadow-[0_2px_12px_rgba(245,158,11,0.08)]">
            <div>
              <p className="text-xs font-medium text-[#6E6E73]">Moyenne calculée</p>
              <div className="mt-1 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${moyenne !== null && i <= Math.round(moyenne) ? 'fill-amber-400 text-amber-400' : 'fill-[#E8E8ED] text-[#E8E8ED]'}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              {moyenne !== null ? moyenne : '—'}
              <span className="ml-1 text-lg font-medium text-[#86868B]">/ 5</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Points forts</p>
              <p className="mt-1 text-lg font-semibold text-[#1D1D1F]">{analyse ? analyse.pointsForts?.length ?? 0 : '—'}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Axes d&apos;amélioration</p>
              <p className="mt-1 text-lg font-semibold text-[#1D1D1F]">{analyse ? analyse.axesAmelioration?.length ?? 0 : '—'}</p>
            </div>
          </div>

          <div className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-r p-4 ${analyse ? 'from-emerald-50 to-white border-emerald-200/70' : 'from-[#F5F5F7] to-white border-[#E8E8ED]'}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-lg ${analyse ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-[#D2D2D7] text-white'}`}>
              <Sparkles className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868B]">Statut de l&apos;analyse</p>
              <p className="text-lg font-semibold leading-tight text-[#1D1D1F]">{statut}</p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <ConsulterBouton periode={periode} cible="analyse" size="sm" />
          </div>
        </div>
      )}
    </Card>
  );
}
