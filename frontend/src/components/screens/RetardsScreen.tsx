"use client";

import { useApp } from '../../context/AppContext';
import { AlertTriangle, Clock, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import ConsulterBouton from '@/components/common/ConsulterBouton';

export default function RetardsScreen() {
  const { periodes, salaries, navigateTo, currentRole } = useApp();

  const isRH = currentRole === 'ADMIN_RH';

  // Règles de statut :
  // Filtrer uniquement sur les salariés actifs (exclut les salariés archivés ou en arrêt de contrat)
  const activeSalarieIds = new Set(
    salaries.filter(s => s.actif !== false && s.statutEssai !== 'RUPTURE').map(s => s.id)
  );
  const periodesActives = periodes.filter(
    p => activeSalarieIds.has(p.salarieId) &&
         p.statut !== 'RENOUVELEE' &&
         p.statut !== 'CONFIRMEE' &&
         p.statut !== 'COMPLETEE' &&
         p.statut !== 'VALIDEE_RH' &&
         p.statut !== 'RUPTURE'
  );

  const retards  = periodesActives.filter(p => p.statut === 'EN_RETARD' || p.statut === 'EN_ATTENTE_DECISION_RH');
  const relances = periodesActives.filter(p => p.statut === 'EN_RELANCE');
  const alertes  = periodesActives.filter(p => p.statut === 'EN_RETARD' || p.statut === 'EN_RELANCE' || p.statut === 'EN_ATTENTE_DECISION_RH');

  // « Dans 5 jours », « Échéance demain »… (jours restants avant l'échéance)
  const libelleJoursRestants = (date?: string) => {
    const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return 'Relance';
    const fin = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const n = Math.round((fin.getTime() - aujourdhui.getTime()) / 86400000);
    return n <= 0 ? "Échéance aujourd'hui" : n === 1 ? 'Échéance demain' : `Dans ${n} jours`;
  };

  // 2026-04-05 -> 05/04/2026
  const formatDateFr = (date?: string) => {
    const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : date || '—';
  };

  const getStatutConfig = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_DECISION_RH':
        return {
          label: 'Décision RH',
          statutClass: 'border-rose-200 bg-rose-50 text-rose-700',
          dotClass: 'bg-rose-500',
          severity: 'Bloqué J+1',
          severityClass: 'border-rose-200 bg-rose-100 text-rose-800',
          accentClass: 'border-l-[#E4002B]'
        };
      case 'EN_RETARD':
        return {
          label: 'En retard',
          statutClass: 'border-red-200 bg-red-50 text-red-700',
          dotClass: 'bg-red-500',
          severity: 'Critique',
          severityClass: 'border-red-200 bg-red-100 text-red-700',
          accentClass: 'border-l-[#E4002B]'
        };
      case 'EN_RELANCE':
        return {
          label: 'En relance',
          statutClass: 'border-amber-200 bg-amber-50 text-amber-800',
          dotClass: 'bg-amber-500',
          severity: 'Modéré',
          severityClass: 'border-amber-200 bg-amber-50 text-amber-800',
          accentClass: 'border-l-amber-400'
        };
      default:
        return {
          label: statut,
          statutClass: 'border-zinc-200 bg-zinc-100 text-zinc-600',
          dotClass: 'bg-zinc-400',
          severity: 'Normal',
          severityClass: 'border-zinc-200 bg-zinc-100 text-zinc-600',
          accentClass: 'border-l-transparent'
        };
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
            {isRH ? 'Suivi des Retards & Relances' : "Retards d'Évaluation — Mon Équipe"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isRH
              ? "Évaluations en relance (de J-14 jusqu'à l'échéance) et dossiers dont l'échéance est dépassée (décision RH)"
              : 'Évaluations de vos collaborateurs nécessitant impérativement votre saisie'
            }
          </p>
        </div>
      </div>

      {/* Legend Planning */}
      <Card className="p-4 bg-white border border-[#E8E8ED] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] bg-[#F5F5F7] border border-[#E8E8ED]">
            <div>
              <span className="font-bold text-zinc-900 block">Avant 3 semaines (J-21)</span>
              <span className="text-[10px] text-muted-foreground">Notification initiale</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              En cours
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] bg-[#F5F5F7] border border-[#E8E8ED]">
            <div>
              <span className="font-bold text-zinc-900 block">Avant 2 semaines (J-14)</span>
              <span className="text-[10px] text-muted-foreground">Relance intermédiaire</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
              En relance
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] bg-[#F5F5F7] border border-[#E8E8ED]">
            <div>
              <span className="font-bold text-zinc-900 block">Avant 1 semaine (J-7)</span>
              <span className="text-[10px] text-muted-foreground">Relance urgente</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
              En relance
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] bg-[#F5F5F7] border border-[#E8E8ED]">
            <div>
              <span className="font-bold text-zinc-900 block">Échéance dépassée</span>
              <span className="text-[10px] text-muted-foreground">Dossier bloqué</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
              Décision RH
            </Badge>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total alertes */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-linear-to-br from-[#F5F5F7] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-semibold uppercase text-[#6E6E73]">Total Alertes Actives</span>
              <div className="w-11 h-11 rounded-[12px] bg-[#F5F5F7] border border-[#E8E8ED] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#1D1D1F]">
                <Users className="w-5 h-5 text-[#1D1D1F] transition-colors group-hover:text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold leading-none text-[#1D1D1F]">{alertes.length}</p>
              <p className="mb-1 text-[11px] font-medium text-[#6E6E73]">Relances + décisions RH</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-1 w-16 rounded-tl-full bg-linear-to-r from-[#6E6E73] to-[#1D1D1F]" />
        </Card>

        {/* En relance (J-14) */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-amber-200/50">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-linear-to-br from-amber-50 to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-semibold uppercase text-[#6E6E73]">En Relance</span>
              <div className="w-11 h-11 rounded-[12px] bg-amber-50 border border-amber-100/80 flex items-center justify-center transition-colors duration-200 group-hover:bg-[#FF9500]">
                <Clock className="w-5 h-5 text-orange-700 transition-colors group-hover:text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold leading-none text-[#1D1D1F]">{relances.length}</p>
              <p className="mb-1 text-[11px] font-medium text-[#6E6E73]">De J-14 jusqu'à l'échéance</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-1 w-16 rounded-tl-full bg-linear-to-r from-[#FF9500] to-[#1D1D1F]" />
        </Card>

        {/* En retard critique (J-7) */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-linear-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-semibold uppercase text-[#6E6E73]">Décision RH</span>
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center transition-colors duration-300 group-hover:bg-red-600">
                <AlertTriangle className="w-5 h-5 text-red-600 transition-colors group-hover:text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold leading-none text-[#E4002B]">{retards.length}</p>
              <p className="mb-1 text-[11px] font-medium text-[#6E6E73]">Échéance dépassée</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-1 w-16 rounded-tl-full bg-linear-to-r from-[#E4002B] to-[#1D1D1F]" />
        </Card>
      </div>

      {/* Alertes Table */}
      {alertes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-14 h-14 rounded-[16px] bg-[#F5F5F7] flex items-center justify-center mx-auto mb-3 border border-[#E8E8ED]">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={1.75} />
          </div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Aucune alerte détectée</h3>
          <p className="text-xs text-muted-foreground mt-1">Tous les formulaires d&apos;évaluation ont été renseignés dans les délais.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] table-fixed border-collapse text-left text-[13px]">
              <colgroup>
                <col style={{ width: '21%' }} />
                <col style={{ width: '21%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E8E8ED] bg-[#FAFAFC] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73]">
                  <th className="whitespace-nowrap py-3 pl-6 pr-3">Salarié</th>
                  <th className="whitespace-nowrap px-3 py-3">Responsable</th>
                  <th className="whitespace-nowrap px-3 py-3">Bilan</th>
                  <th className="whitespace-nowrap px-3 py-3">Échéance</th>
                  <th className="whitespace-nowrap px-3 py-3">Statut</th>
                  <th className="whitespace-nowrap px-3 py-3">Rappel</th>
                  <th className="whitespace-nowrap py-3 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F3] text-[#1D1D1F]">
                {alertes.map((p) => {
                  const config = getStatutConfig(p.statut);
                  const is3M = p.typePeriode === 'TROIS_MOIS' || p.typePeriode === 'DEUX_MOIS';

                  return (
                    <tr key={p.id} className="transition-colors duration-200 hover:bg-[#F5F5F7]/80">
                      <td className={`border-l-[3px] py-3.5 pl-[21px] pr-3 align-middle ${config.accentClass}`}>
                        <span
                          onClick={() => navigateTo('detail-salarie', { salarieId: p.salarieId })}
                          title={p.salarieNom}
                          className="block cursor-pointer truncate font-semibold tracking-tight text-[#1D1D1F] hover:text-[#E4002B]"
                        >
                          {p.salarieNom}
                        </span>
                        <span title={p.salariePoste} className="block truncate text-[12px] text-[#6E6E73]">{p.salariePoste}</span>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <span title={p.responsableNom} className="block truncate font-medium">{p.responsableNom}</span>
                        <span title={p.responsableEmail} className="block truncate text-[12px] text-[#6E6E73]">{p.responsableEmail}</span>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <span className="inline-flex whitespace-nowrap rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[11px] font-medium text-[#515154]">
                          {is3M ? '3 mois' : '6 mois'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <span className="block whitespace-nowrap font-medium tabular-nums">{formatDateFr(p.dateEcheance)}</span>
                        {p.statut === 'EN_RELANCE' ? (
                          <span className="block whitespace-nowrap text-[12px] font-medium text-amber-700">{libelleJoursRestants(p.dateEcheance)}</span>
                        ) : p.joursRetard && p.joursRetard > 0 ? (
                          <span className="block whitespace-nowrap text-[12px] font-semibold text-rose-700">
                            {p.joursRetard} j de retard
                          </span>
                        ) : (
                          <span className="block whitespace-nowrap text-[12px] font-medium text-rose-700">Alerte J-7</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.statutClass}`}>
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dotClass}`} />
                          {config.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 align-middle tabular-nums text-[#6E6E73]">
                        {p.dateDernierRappel ? formatDateFr(p.dateDernierRappel) : '—'}
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRH ? (
                            <ConsulterBouton periode={p} size="sm" />
                          ) : (
                            <Button
                              onClick={() => navigateTo('formulaire-evaluation', { periodeId: p.id })}
                              size="sm"
                              className="flex cursor-pointer items-center gap-1 whitespace-nowrap font-medium shadow-xs"
                            >
                              <Clock className="h-3 w-3" strokeWidth={1.75} /> Remplir l&apos;évaluation
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
