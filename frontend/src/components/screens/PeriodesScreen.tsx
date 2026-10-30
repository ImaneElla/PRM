"use client";

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getSocieteLabel } from '@/lib/societe';
import {
  AlertTriangle,
  Clock,
  CalendarDays,
  ChevronRight,
  Search,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import ConsulterBouton from '@/components/common/ConsulterBouton';
import { PeriodeEvaluation } from '../../types';

type KpiFilter = 'ALL' | 'ACTIVES' | 'ATTENTE' | 'RETARD';

// En cours + relance (sans EN_ATTENTE / EMAIL_ENVOYE)
const ATTENTE_STATUTS = ['EN_COURS', 'EN_RELANCE'];
// Retard : J-7 uniquement
const RETARD_STATUTS = ['EN_RETARD', 'EN_ATTENTE_DECISION_RH'];
// Formulaire rempli par le responsable
const FINALISEES_STATUTS = ['COMPLETEE', 'VALIDEE_RH', 'RENOUVELEE', 'CONFIRMEE'];
// Périodes non actives : complétées, validées RH ou en rupture
const INACTIVES_STATUTS = [...FINALISEES_STATUTS, 'RUPTURE'];
const STATUTS_ARCHIVES = ['RENOUVELEE', 'CONFIRMEE', 'RUPTURE'];

/* ---------- KPI card (design d'origine) ---------- */
interface KpiCardProps {
  icon: React.ElementType;
  title: string;
  value: React.ReactNode;
  unit: string;
  chip: string;
  detail?: React.ReactNode;
  danger?: boolean;
  active: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

function KpiCard({
  icon: Icon,
  title,
  value,
  unit,
  chip,
  detail,
  danger = false,
  active,
  onClick,
  children,
}: KpiCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative overflow-hidden bg-white border rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4002B]/30 ${
        active ? 'border-[#E4002B] ring-1 ring-[#E4002B]/30' : 'border-[#E8E8ED]'
      }`}
    >
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-red-50 border border-red-100/80 flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
              <Icon
                className="w-5 h-5 text-[#E4002B] group-hover:text-white transition-colors"
                strokeWidth={2}
              />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
              {title}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
            <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <span
            className={`text-4xl font-black tracking-tight leading-none ${
              danger ? 'text-[#E4002B]' : 'text-[#1D1D1F]'
            }`}
          >
            {value}
          </span>
          <span className="text-[11px] text-[#6E6E73] font-medium mb-1">{unit}</span>
        </div>

        <div className="mt-5">
          <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 text-[10px] font-semibold px-2.5 py-1 rounded-full">
            {chip}
          </Badge>
        </div>

        {detail && <p className="mt-2 text-[11px] text-zinc-500 truncate">{detail}</p>}
        {children}
      </div>
      <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
    </Card>
  );
}

export default function PeriodesScreen() {
  const { periodes = [], salaries = [], navigateTo, currentRole } = useApp();

  const isRH = currentRole === 'ADMIN_RH';
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatut, setFilterStatut] = useState<string>('ALL');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('ALL');

  const normalize = (v?: string | null) =>
    (v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const query = normalize(search.trim());
  const societeBySalarieId = new Map(salaries.map((salarie) => [salarie.id, salarie.societe]));
  const activeSalarieIds = new Set(
    salaries.filter((salarie) => salarie.actif !== false).map((salarie) => salarie.id)
  );
  const periodesVisibles = periodes.filter(
    (periode) =>
      activeSalarieIds.has(periode.salarieId) &&
      !STATUTS_ARCHIVES.includes(periode.statut)
  );

  const filtered = periodesVisibles.filter((p) => {
    const matchType = filterType === 'ALL' || p.typePeriode === filterType;
    const matchStatut =
      filterStatut === 'ALL'
        ? true
        : filterStatut === 'RENOUVELLEMENT'
          ? (p.statut === 'RENOUVELEE' || p.decisionFinale === 'RENOUVELLEMENT')
          : filterStatut === 'VALIDATION'
            ? (p.statut === 'CONFIRMEE' || p.statut === 'VALIDEE_RH' || p.decisionFinale === 'CONFIRMATION')
            : p.statut === filterStatut;
    const matchKpi =
      kpiFilter === 'ALL' ||
      (kpiFilter === 'ACTIVES' && !INACTIVES_STATUTS.includes(p.statut)) ||
      (kpiFilter === 'ATTENTE' && ATTENTE_STATUTS.includes(p.statut)) ||
      (kpiFilter === 'RETARD' && RETARD_STATUTS.includes(p.statut));
    const matchSearch =
      query === '' ||
      normalize(p.salarieNom).includes(query) ||
      normalize(p.salariePoste).includes(query) ||
      normalize(p.responsableNom).includes(query) ||
      normalize(getSocieteLabel(societeBySalarieId.get(p.salarieId))).includes(query);
    return matchType && matchStatut && matchKpi && matchSearch;
  });

  /* ---------- KPI data ---------- */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysFromToday = (d?: string | null) => {
    if (!d) return null;
    const t = new Date(d).getTime();
    return isNaN(t) ? null : Math.round((t - today.getTime()) / 86400000);
  };

  // 1. Total périodes actives (sans complétées / validées RH / ruptures)
  const actives = periodesVisibles.filter((p) => !INACTIVES_STATUTS.includes(p.statut));
  const totalActives = actives.length;
  const nbSalaries = new Set(actives.map((p) => p.salarieId)).size;

  // 2. Salariés liés à En cours + En relance
  const enAttente = periodesVisibles.filter((p) => ATTENTE_STATUTS.includes(p.statut));
  const nbSalariesEnAttente = new Set(enAttente.map((p) => p.salarieId)).size;

  // 3. En retard (J-7), hors complétées / ruptures
  const enRetard = periodesVisibles.filter((p) => RETARD_STATUTS.includes(p.statut));
  const enRetardCount = enRetard.length;

  const prochaine = [...enAttente]
    .filter((p) => daysFromToday(p.dateEcheance) !== null)
    .sort(
      (a, b) =>
        (daysFromToday(a.dateEcheance) as number) -
        (daysFromToday(b.dateEcheance) as number)
    )[0];
  const prochaineJours = prochaine ? daysFromToday(prochaine.dateEcheance) : null;

  const responsablesEnRetard = Array.from(
    new Set(enRetard.map((p) => p.responsableNom).filter(Boolean))
  );

  const toggleKpi = (k: KpiFilter) => {
    setFilterStatut('ALL');
    setKpiFilter((prev) => (prev === k ? 'ALL' : k));
  };

  const statutLabel = (s: string, p?: PeriodeEvaluation) => {
    switch (s) {
      case 'EN_ATTENTE_DECISION_RH': return 'Décision RH';
      case 'EN_COURS': return 'En cours';
      case 'EN_RELANCE': return 'En relance';
      case 'EN_RETARD':
      case 'EN_RETARD_CRITIQUE': return 'En retard';
      case 'RENOUVELEE': return 'Renouvellement';
      case 'CONFIRMEE': return 'Validation / Titularisation';
      case 'COMPLETEE':
      case 'VALIDEE_RH':
        if (p?.decisionFinale === 'RUPTURE') return 'Arrêt de contrat';
        if (p?.decisionFinale === 'RENOUVELLEMENT' || p?.numeroPeriode === 1 || p?.typePeriode === 'TROIS_MOIS') return 'Renouvellement';
        return 'Validation / Titularisation';
      case 'RUPTURE': return 'Arrêt de contrat';
      case 'PLANIFIEE': return 'En cours';
      case 'EMAIL_ENVOYE': return 'Mail envoyé';
      default: return s;
    }
  };

  const getStatutBadgeVariant = (s: string, p?: PeriodeEvaluation): 'destructive' | 'appleGreen' | 'secondary' | 'appleOrange' => {
    switch (s) {
      case 'EN_ATTENTE_DECISION_RH': return 'destructive';
      case 'EN_RETARD':
      case 'EN_RETARD_CRITIQUE': return 'destructive';
      case 'RUPTURE': return 'destructive';
      case 'RENOUVELEE': return 'appleOrange';
      case 'CONFIRMEE': return 'appleGreen';
      case 'COMPLETEE':
      case 'VALIDEE_RH':
        if (p?.decisionFinale === 'RUPTURE') return 'destructive';
        if (p?.decisionFinale === 'RENOUVELLEMENT' || p?.numeroPeriode === 1 || p?.typePeriode === 'TROIS_MOIS') return 'appleOrange';
        return 'appleGreen';
      default: return 'secondary';
    }
  };

  // Date de clôture : remplie automatiquement quand la période est
  // complétée, validée RH ou en rupture. Sinon "—".
  const dateCloture = (p: any) => {
    if (!INACTIVES_STATUTS.includes(p.statut)) return '—';
    const d =
      p.dateValidationEvaluateur ??
      p.dateValidationRH ??
      p.dateRupture ??
      p.updatedAt ??
      null;
    if (d) return d;
    // Aucune date fournie par l'API : on met la date du jour
    return new Date().toISOString().slice(0, 10);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {isRH
              ? 'Périodes d’Évaluation (Supervision Globale)'
              : 'Évaluations à Réaliser — Mon Équipe'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRH
              ? `${filtered.length} période${filtered.length > 1 ? 's' : ''} — Bilans Période 1 (3 mois) et Période 2 (6 mois)`
              : `${filtered.length} évaluation${filtered.length > 1 ? 's associées' : ' associée'}`}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={CalendarDays}
          title="Total Périodes Actives"
          value={totalActives}
          unit={totalActives > 1 ? 'évaluations' : 'évaluation'}
          chip="Hors complétées et ruptures"
          detail={`${nbSalaries} salarié${nbSalaries > 1 ? 's' : ''} concerné${nbSalaries > 1 ? 's' : ''}`}
          active={kpiFilter === 'ACTIVES'}
          onClick={() => toggleKpi('ACTIVES')}
        />

        <KpiCard
          icon={Clock}
          title="En Cours & Relance"
          value={nbSalariesEnAttente}
          unit={nbSalariesEnAttente > 1 ? 'salariés' : 'salarié'}
          chip={
            prochaine && prochaineJours !== null
              ? prochaineJours < 0
                ? `Dépassée de ${Math.abs(prochaineJours)} j`
                : prochaineJours === 0
                  ? "Échéance aujourd'hui"
                  : `Échéance dans ${prochaineJours} j`
              : 'Aucun en cours'
          }
          detail={prochaine?.salarieNom}
          active={kpiFilter === 'ATTENTE'}
          onClick={() => toggleKpi('ATTENTE')}
        />

        <KpiCard
          icon={AlertTriangle}
          title="En Retard (J-7)"
          value={enRetardCount}
          unit={enRetardCount > 1 ? 'évaluations' : 'évaluation'}
          chip={enRetardCount > 0 ? 'Attention requise' : 'À jour'}
          detail={responsablesEnRetard.join(', ')}
          danger={enRetardCount > 0}
          active={kpiFilter === 'RETARD'}
          onClick={() => toggleKpi('RETARD')}
        />
      </div>

      {/* FILTERS */}
      <Card className="p-3.5 border-[#E8E8ED]/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un salarié, poste, responsable..."
              className="w-full text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] pl-9 pr-3 py-2 text-[#1D1D1F] placeholder:text-[#6E6E73] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none font-medium h-10 transition-all duration-200"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] px-3 py-2 text-[#1D1D1F] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none cursor-pointer font-medium h-10 transition-all duration-200"
          >
            <option value="ALL">Toutes les périodes</option>
            <option value="TROIS_MOIS">Période 1 (3 Mois)</option>
            <option value="SIX_MOIS">Période 2 (6 Mois)</option>
          </select>

          <select
            value={filterStatut}
            onChange={(e) => {
              setFilterStatut(e.target.value);
              setKpiFilter('ALL');
            }}
            className="text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] px-3 py-2 text-[#1D1D1F] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none cursor-pointer font-medium h-10 transition-all duration-200"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="EN_COURS">En cours (J-21)</option>
            <option value="EN_RELANCE">En relance (J-14)</option>
            <option value="EN_RETARD">En retard (J-7)</option>
            <option value="EN_ATTENTE_DECISION_RH">Décision RH (échéance dépassée)</option>
          </select>
        </div>
      </Card>

      {/* TABLE */}
      <Card className="overflow-hidden border-[#E8E8ED]/80 shadow-2xs">
        <table className="w-full table-fixed text-left text-xs border-collapse">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead className="border-b border-[#E8E8ED] text-[#6E6E73] font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-6 whitespace-nowrap truncate">Période</th>
              <th className="py-3.5 px-3 whitespace-nowrap truncate">Salarié</th>
              <th className="py-3.5 px-3 whitespace-nowrap truncate">Responsable</th>
              <th className="py-3.5 px-3 whitespace-nowrap truncate">Société</th>
              <th className="py-3.5 px-3 whitespace-nowrap truncate">Échéance</th>
              <th className="py-3.5 px-3 whitespace-nowrap truncate">Date de Clôture</th>
              <th className="py-3.5 px-3 whitespace-nowrap truncate">Statut</th>
              <th className="py-3.5 px-3 whitespace-nowrap truncate text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-foreground bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground font-medium"
                >
                  Aucune période ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                // Le formulaire est rempli par le responsable (complétée, validée RH ou rupture)
                const formulaireRempli =
                  FINALISEES_STATUTS.includes(p.statut) || p.statut === 'RUPTURE';

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-[#F5F5F7] transition-all duration-200 group ${
                      p.statut === 'EN_RETARD' ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-6 align-middle whitespace-nowrap overflow-hidden">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold whitespace-nowrap"
                      >
                        {p.typePeriode === 'TROIS_MOIS' || p.typePeriode === 'DEUX_MOIS'
                          ? 'Periode 1 (3 mois)'
                          : 'Periode 2 (6 mois)'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3 align-middle whitespace-nowrap overflow-hidden">
                      <span
                        onClick={() =>
                          navigateTo('detail-salarie', { salarieId: p.salarieId })
                        }
                        title={p.salarieNom}
                        className="font-semibold text-foreground hover:text-red-600 cursor-pointer block truncate tracking-tight transition-colors"
                      >
                        {p.salarieNom}
                      </span>
                      <span
                        title={p.salariePoste}
                        className="block truncate text-[10px] text-muted-foreground"
                      >
                        {p.salariePoste}
                      </span>
                    </td>

                    <td
                      title={p.responsableNom}
                      className="py-3.5 px-3 align-middle whitespace-nowrap truncate font-medium text-foreground"
                    >
                      {p.responsableNom}
                    </td>

                    <td
                      title={getSocieteLabel(societeBySalarieId.get(p.salarieId))}
                      className="py-3.5 px-3 align-middle whitespace-nowrap truncate text-muted-foreground"
                    >
                      {getSocieteLabel(societeBySalarieId.get(p.salarieId))}
                    </td>

                    <td className="py-3.5 px-3 align-middle whitespace-nowrap truncate font-mono text-[11px]">
                      {p.dateEcheance}
                    </td>

                    <td className="py-3.5 px-3 align-middle whitespace-nowrap truncate font-mono text-[11px] text-zinc-700">
                      {dateCloture(p)}
                    </td>

                    <td className="py-3.5 px-3 align-middle whitespace-nowrap overflow-hidden">
                      <Badge
                        variant={getStatutBadgeVariant(p.statut, p) as any}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${
                          p.statut === 'EN_RELANCE'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : p.statut === 'RUPTURE'
                              ? 'bg-rose-950 text-white border-rose-950'
                              : ''
                        }`}
                      >
                        {statutLabel(p.statut, p)}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3 align-middle whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigateTo('detail-salarie', { salarieId: p.salarieId })
                          }
                          className="text-xs h-7 cursor-pointer flex items-center gap-1"
                          title="Voir la fiche individuelle et le parcours"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                          <span>Détails</span>
                        </Button>

                        {['COMPLETEE', 'VALIDEE_RH', 'CONFIRMEE', 'RUPTURE'].includes(p.statut) && (
                          <ConsulterBouton periode={p} size="sm" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}