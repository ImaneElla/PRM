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

  const getStatutConfig = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_DECISION_RH':
        return {
          label: 'EN ATTENTE DÉCISION RH',
          badgeVariant: 'destructive' as const,
          severity: 'BLOQUÉ J+1',
          severityClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
          rowClass: 'bg-rose-50/50'
        };
      case 'EN_RETARD':
        return {
          label: 'En retard',
          badgeVariant: 'destructive' as const,
          severity: 'CRITIQUE',
          severityClass: 'bg-red-100 text-red-700 border-red-200',
          rowClass: 'bg-red-50/30'
        };
      case 'EN_RELANCE':
        return {
          label: 'En relance',
          badgeVariant: 'secondary' as const,
          severity: 'MODÉRÉ',
          severityClass: 'bg-amber-50 text-amber-800 border-amber-200',
          rowClass: 'bg-amber-50/20'
        };
      default:
        return {
          label: statut,
          badgeVariant: 'secondary' as const,
          severity: 'NORMAL',
          severityClass: 'bg-zinc-100 text-zinc-600 border-zinc-200',
          rowClass: ''
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
              ? 'Évaluations en relance (J-14 — avant 2 semaines) et en retard critique (J-7 — avant 1 semaine / dépassées)'
              : 'Évaluations de vos collaborateurs nécessitant impérativement votre saisie'
            }
          </p>
        </div>
      </div>

      {/* Legend Planning */}
      <Card className="p-4 bg-white border border-[#E8E8ED] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
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
              <span className="text-[10px] text-muted-foreground">Alerte critique</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
              En retard
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
              <p className="mb-1 text-[11px] font-medium text-[#6E6E73]">En relance + en retard</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-1 w-16 rounded-tl-full bg-linear-to-r from-[#6E6E73] to-[#1D1D1F]" />
        </Card>

        {/* En relance (J-14) */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-amber-200/50">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-linear-to-br from-amber-50 to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-semibold uppercase text-[#6E6E73]">En Relance (J-14)</span>
              <div className="w-11 h-11 rounded-[12px] bg-amber-50 border border-amber-100/80 flex items-center justify-center transition-colors duration-200 group-hover:bg-[#FF9500]">
                <Clock className="w-5 h-5 text-orange-700 transition-colors group-hover:text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold leading-none text-[#1D1D1F]">{relances.length}</p>
              <p className="mb-1 text-[11px] font-medium text-[#6E6E73]">Relance de rappel envoyée</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-1 w-16 rounded-tl-full bg-linear-to-r from-[#FF9500] to-[#1D1D1F]" />
        </Card>

        {/* En retard critique (J-7) */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-linear-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-semibold uppercase text-[#6E6E73]">En Retard Critique (J-7)</span>
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center transition-colors duration-300 group-hover:bg-red-600">
                <AlertTriangle className="w-5 h-5 text-red-600 transition-colors group-hover:text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold leading-none text-[#E4002B]">{retards.length}</p>
              <p className="mb-1 text-[11px] font-medium text-[#6E6E73]">Escalade DRH requise</p>
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
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E8E8ED] text-[#6E6E73] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Salarié</th>
                  <th className="py-3.5 px-4">Responsable</th>
                  <th className="py-3.5 px-4">Type de Bilan</th>
                  <th className="py-3.5 px-4">Échéance</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Sévérité</th>
                  <th className="py-3.5 px-4">Dernier rappel</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {alertes.map((p) => {
                  const config = getStatutConfig(p.statut);
                  const is3M = p.typePeriode === 'TROIS_MOIS' || p.typePeriode === 'DEUX_MOIS';

                  return (
                    <tr key={p.id} className={`hover:bg-[#F5F5F7] transition-all duration-200 ${config.rowClass}`}>
                      <td className="py-3.5 px-4">
                        <span
                          onClick={() => navigateTo('detail-salarie', { salarieId: p.salarieId })}
                          className="font-semibold text-foreground hover:text-primary cursor-pointer block tracking-tight"
                        >
                          {p.salarieNom}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{p.salariePoste}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-foreground">{p.responsableNom}</span>
                        <span className="block text-[11px] text-muted-foreground">{p.responsableEmail}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          {is3M ? 'Période 1 (3 Mois)' : 'Période 2 (6 Mois)'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {p.dateEcheance}
                        {p.statut === 'EN_RELANCE' ? (
                          <span className="block text-amber-700 font-semibold mt-0.5">J-14 • Relance</span>
                        ) : p.joursRetard && p.joursRetard > 0 ? (
                          <span className="block text-rose-700 font-bold mt-0.5">+{p.joursRetard}j de retard</span>
                        ) : (
                          <span className="block text-rose-700 font-semibold mt-0.5">J-7 • Alerte critique</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={config.badgeVariant}
                          className={`text-[10px] ${p.statut === 'EN_RELANCE' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}`}
                        >
                          {config.label}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${config.severityClass}`}>
                          {config.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {p.dateDernierRappel || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRH ? (
                            <ConsulterBouton periode={p} size="sm" />
                          ) : (
                            <Button
                              onClick={() => navigateTo('formulaire-evaluation', { periodeId: p.id })}
                              size="sm"
                              className="flex items-center gap-1 cursor-pointer shadow-xs font-medium"
                            >
                              <Clock className="w-3 h-3" strokeWidth={1.75} /> Remplir l&apos;évaluation
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
