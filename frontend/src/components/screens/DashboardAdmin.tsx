"use client";

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronRight,
  TrendingUp,
  PlusCircle,
  ClipboardList,
  Download,
  Eye,
  Activity,
  Award,
  Mail,
  Building2,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import DashboardResponsable from './DashboardResponsable';
import ConsulterBouton from '@/components/common/ConsulterBouton';
import { computeDecisionTotals, isRupture, isTitularise } from '@/lib/decisionStats';

// =========================================================================
// 1. DASHBOARD RH / ADMIN (SUPERVISION GLOBALE DE TOUT LE SYSTÈME)
// =========================================================================
function DashboardRH() {
  const {
    salaries,
    periodes,
    navigateTo,
    parametres,
    isDemoMode,
    dashboardStats,
    refreshDashboardData
  } = useApp();

  // Refresh backend dashboard data on mount
  React.useEffect(() => {
    if (!isDemoMode && refreshDashboardData) {
      refreshDashboardData();
    }
  }, [isDemoMode]);

  // Même source de calcul que l'écran Archives (lib/decisionStats)
  const { totalTitularises, totalRuptures, totalFinalisees } =
    computeDecisionTotals(salaries, dashboardStats, !isDemoMode);

  const totalDecisionsFinales = totalFinalisees;

  const tauxTitularisation = totalDecisionsFinales ? Math.round((totalTitularises / totalDecisionsFinales) * 100) : 0;
  const tauxRupture = totalDecisionsFinales ? Math.round((totalRuptures / totalDecisionsFinales) * 100) : 0;
  

  const retards = periodes.filter(p => p.statut === 'EN_RETARD' || p.statut === 'EN_ATTENTE_DECISION_RH');

  const TERMINAL_STATUTS_SALARIE = new Set(['RUPTURE', 'CONFIRMEE', 'Titulaire', 'VALIDE', 'Fin_Essai', 'TITULARISEE', 'ARCHIVE']);
  const TERMINAL_STATUTS_PERIODE = new Set(['RUPTURE', 'CONFIRMEE', 'RENOUVELEE', 'VALIDEE_RH', 'TERMINE', 'CLOTUREE', 'TITULARISEE', 'ARCHIVEE']);

  const periodesEnCours = periodes.filter(p => {

    const sal = salaries.find(s => s.id === p.salarieId);
    if (!sal) return false;

    if (sal.actif === false) return false;
    if (sal.statutEssai && TERMINAL_STATUTS_SALARIE.has(sal.statutEssai as string)) return false;

    if (TERMINAL_STATUTS_PERIODE.has(p.statut)) return false;
    const STATUTS_ACTIFS = ['EN_RELANCE', 'EN_RETARD', 'EN_ATTENTE_DECISION_RH', 'EN_COURS', 'PLANIFIEE', 'EMAIL_ENVOYE', 'EN_ATTENTE'];
    if (!STATUTS_ACTIFS.includes(p.statut)) return false;

    return true;
  });

  const periodesUniques = Object.values(
    periodesEnCours.reduce((acc: any, p) => {
      const exist = acc[p.salarieId];
      if (!exist || new Date(p.dateEcheance) > new Date(exist.dateEcheance)) {
        acc[p.salarieId] = p;
      }
      return acc;
    }, {})
  ) as typeof periodesEnCours;

  // Maximum 5 salariés / périodes affichés
  const periodesAffichees = periodesUniques.slice(0, 5);
  const currentYear = new Date().getFullYear();
  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const DEMO_EVOLUTION = [
    { mois: 'Jan', titularisation: 3, ruptures: 1 },
    { mois: 'Fév', titularisation: 2, ruptures: 2 },
    { mois: 'Mar', titularisation: 3, ruptures: 1 },
    { mois: 'Avr', titularisation: 1, ruptures: 0 },
    { mois: 'Mai', titularisation: 3, ruptures: 1 },
    { mois: 'Juin', titularisation: 1, ruptures: 0 },
    { mois: 'Juil', titularisation: 2, ruptures: 1 },
    { mois: 'Août', titularisation: 3, ruptures: 1 },
    { mois: 'Sep', titularisation: 2, ruptures: 0 },
    { mois: 'Oct', titularisation: 1, ruptures: 1 },
    { mois: 'Nov', titularisation: 0, ruptures: 1 },
    { mois: 'Déc', titularisation: 1, ruptures: 0 },
  ];

  const evolutionAnnuelle = React.useMemo(() => {
    if (isDemoMode) return DEMO_EVOLUTION;

    // Le backend inclut les salariés inactifs (ruptures), absents de la liste `salaries`
    if (dashboardStats?.evolutionMensuelle?.length === 12) {
      return dashboardStats.evolutionMensuelle.map(m => ({
        mois: m.mois,
        titularisation: Number(m.titularisation ?? 0),
        ruptures: Number(m.ruptures ?? 0),
      }));
    }

    // Chaque décision est placée au mois de la date de fin (date effective de titularisation / d'arrêt)
    const base = MOIS.map(mois => ({ mois, titularisation: 0, ruptures: 0 }));

    salaries.forEach(s => {
      const titu = isTitularise(s);
      const rupt = isRupture(s);
      if (!titu && !rupt) return;

      const d = new Date(s.dateFinPrevisionnelle);
      if (isNaN(d.getTime()) || d.getFullYear() !== currentYear) return;

      if (titu) base[d.getMonth()].titularisation++;
      else base[d.getMonth()].ruptures++;
    });

    return base;
  }, [isDemoMode, dashboardStats, salaries, currentYear]);

  const totalTituAnnee = evolutionAnnuelle.reduce((sum, m) => sum + Number(m.titularisation ?? 0), 0);
  const totalRuptAnnee = evolutionAnnuelle.reduce((sum, m) => sum + Number(m.ruptures ?? 0), 0);
  // ---------------------------------------------------------------------
  // Mini calendrier du mois + date du jour
  // ---------------------------------------------------------------------
  const today = new Date();
  const dateDuJour = today.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const moisCourant = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const calYear = today.getFullYear();
  const calMonth = today.getMonth();
  const joursDuMois = new Date(calYear, calMonth + 1, 0).getDate();
  const decalage = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // lundi = 0

  const joursEcheances = new Set(
    periodes
      .map(p => new Date(p.dateEcheance))
      .filter(d => !Number.isNaN(d.getTime()) && d.getFullYear() === calYear && d.getMonth() === calMonth)
      .map(d => d.getDate())
  );

  const cellulesCalendrier: (number | null)[] = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: joursDuMois }, (_, i) => i + 1),
  ];

  // ---------------------------------------------------------------------
  // Export CSV des périodes (Actions rapides)
  // ---------------------------------------------------------------------
  const exporterRapport = () => {
    const entetes = ['Salarié', 'Poste', 'Responsable', 'Type', 'Statut', 'Échéance'];
    const lignes = periodes.map(p => [
      p.salarieNom,
      p.salariePoste,
      p.responsableNom,
      p.typePeriode,
      p.statut,
      p.dateEcheance,
    ]);

    const csv = [entetes, ...lignes]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-periodes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header DRH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p suppressHydrationWarning className="text-[11px] font-semibold text-red-700 capitalize mb-1">
            {dateDuJour}
          </p>
          <h2 className="text-xl md:text-4xl font-bold text-foreground tracking-tight">
            Tableau de bord 
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direction des Ressources Humaines • Supervision globale, Période &amp; alertes automatiques
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={() => refreshDashboardData && refreshDashboardData()}
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
            <span>Actualiser</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigateTo('emails')}
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
            <span>Audit E-mails</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigateTo('periodes')}
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
            <span>Toutes les Périodes</span>
          </Button>
        </div>
      </div>

    

      {/* ================================================================
          GLOBAL KPI CARDS — PREMIUM LIGHT / RED & BLACK
      ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 0 — TOTAL FINALISÉES (SALARIÉS AYANT TERMINÉ LEUR PÉRIODE) */}
        <Card
          onClick={() => navigateTo('archive')}
          className="group relative overflow-hidden cursor-pointer bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20"
        >
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#FFF0F3] border border-[#E4002B]/10 flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                  <Users className="w-5 h-5 text-[#E4002B] group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
                  TOTAL FINALISÉES
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tracking-tight leading-none text-[#1D1D1F]">
                {totalFinalisees}
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mb-1">
                salariés ayant terminé ({totalTitularises} titu + {totalRuptures} rupt)
              </span>
            </div>

            <div className="mt-5">
              <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 hover:bg-[#FFE0E6] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {totalTitularises} Titularisés + {totalRuptures} Ruptures
              </Badge>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
        </Card>

        {/* 1 — TOTAL TITULARISÉS */}
        <Card
          onClick={() => navigateTo('archive')}
          className="group relative overflow-hidden cursor-pointer bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20"
        >
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#FFF0F3] border border-[#E4002B]/10 flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                  <Users className="w-5 h-5 text-[#E4002B] group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
                  Total titularisés
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tracking-tight leading-none text-[#1D1D1F]">
                {totalTitularises}
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mb-1">
                salariés titularisés définitivement
              </span>
            </div>

            <div className="mt-5">
              <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 hover:bg-[#FFE0E6] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Décisions RH finalisées
              </Badge>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
        </Card>

        {/* 2 — TOTAL RUPTURES */}
        <Card
          onClick={() => navigateTo('archive')}
          className="group relative overflow-hidden cursor-pointer bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20"
        >
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#FFF0F3] border border-[#E4002B]/10 flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                  <Clock className="w-5 h-5 text-[#E4002B] group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
                  Total ruptures
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tracking-tight leading-none text-[#1D1D1F]">
                {totalRuptures}
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mb-1">
                salariés en fin de période d’essai
              </span>
            </div>

            <div className="mt-5">
              <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 hover:bg-[#FFE0E6] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3 mr-1" />
                Relances automatiquement arrêtées
              </Badge>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
        </Card>

        {/* 3 — TAUX DE TITULARISATION */}
        <Card
          onClick={() => navigateTo('archive')}
          className="group relative overflow-hidden cursor-pointer bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20"
        >
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors duration-300 group-hover:bg-red-600 ${
                    totalRuptures > 0 ? 'bg-red-50 border-red-100' : 'bg-red-100 border-zinc-200'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 transition-colors group-hover:text-white ${
                      totalRuptures > 0 ? 'text-red-600' : 'text-red-500'
                    }`}
                    strokeWidth={2}
                  />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
                  Taux de titularisation
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span
                className={`text-4xl font-black tracking-tight leading-none ${
                  totalRuptures > 0 ? 'text-[#E4002B]' : 'text-[#1D1D1F]'
                }`}
              >
                {tauxTitularisation}%
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mb-1">
                des décisions finales
              </span>
            </div>

            <div className="mt-5">
              {totalRuptures > 0 ? (
                <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 hover:bg-[#FFE0E6] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Taux de rupture : {tauxRupture}%
                </Badge>
              ) : (
                <Badge className="bg-[#F5F5F7] text-[#6E6E73] border border-[#E8E8ED] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Aucune rupture
                </Badge>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
        </Card>
      </div>

      {/* Main Section: 2 Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols): Graphique Ultra-Design */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden rounded-[20px] border border-[#E8E8ED] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200">
            <div className="p-4 sm:p-5 border-b border-[#E8E8ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3">
             
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                      Dynamique Annuelle des Décisions
                    </h3>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded-full border border-red-200/60">
                      {currentYear}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Comparatif mensuel : Titularisations confirmées vs Ruptures de contrat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{totalTituAnnee} Titularisés</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 text-rose-800 dark:text-rose-300 text-[11px] font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{totalRuptAnnee} Ruptures</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionAnnuelle} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {/* Gradient Titularisation (Teal / Emerald) */}
                      <linearGradient id="gradientTitularisation" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      {/* Gradient Rupture (Red / Rose) */}
                      <linearGradient id="gradientRuptures" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" dark-stroke="#27272a" vertical={false} />

                    <XAxis
                      dataKey="mois"
                      tick={{ fontSize: 11, fill: '#71717a', fontWeight: 500 }}
                      axisLine={{ stroke: '#f4f4f5' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, (max: number) => Math.max(4, max)]}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#71717a', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const titu = Math.round(Number(payload.find(p => p.dataKey === 'titularisation')?.value ?? 0));
                          const rupt = Math.round(Number(payload.find(p => p.dataKey === 'ruptures')?.value ?? 0));
                          return (
                            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs min-w-[170px] space-y-2">
                              <p className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-1.5 flex items-center justify-between">
                                <span>{label} {currentYear}</span>
                                <span className="text-[10px] text-zinc-400 font-normal">Mois complet</span>
                              </p>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                    Titularisations :
                                  </span>
                                  <span className="font-bold text-sm">{titu}</span>
                                </div>
                                <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                                    Ruptures :
                                  </span>
                                  <span className="font-bold text-sm">{rupt}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
                    />

                    <Area
                      type="monotone"
                      dataKey="ruptures"
                      name="Ruptures"
                      stroke="#ef4444"
                      strokeWidth={2.75}
                      fillOpacity={1}
                      fill="url(#gradientRuptures)"
                      dot={{ r: 3.5, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 6.5, strokeWidth: 2, stroke: '#ffffff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="titularisation"
                      name="Titularisation"
                      stroke="#10b981"
                      strokeWidth={2.75}
                      fillOpacity={1}
                      fill="url(#gradientTitularisation)"
                      dot={{ r: 3.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 6.5, strokeWidth: 2, stroke: '#ffffff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
                <span>
                  Vue dynamique synchronisée • {totalDecisionsFinales} décisions totales enregistrées
                </span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Taux de validation global : <strong className="text-emerald-700 dark:text-emerald-400">{tauxTitularisation}%</strong>
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Période d'Évaluation */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#E8E8ED] flex items-center justify-between bg-[#F5F5F7]/40">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Période d&apos;Évaluation
              </h3>

              <Badge
                variant="outline"
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50 shadow-2xs"
              >
                Total : {periodesUniques.length} en cours              </Badge>
            </div>

            <div className="divide-y divide-border/60">
              {periodesAffichees.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Aucune période en cours pour le moment.
                </div>
              ) : (
                periodesAffichees.map((periode) => {
                  const isOverdue = periode.statut === 'EN_RETARD';
                  const is3M = periode.typePeriode === 'TROIS_MOIS';

                  return (
                    <div
                      key={periode.id}
                      className={`p-3.5 transition-colors flex items-center justify-between gap-3 ${
                        isOverdue ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-[#F5F5F7]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center font-medium text-xs shrink-0 bg-red-100 text-black border border-zinc-200/80">
                          {is3M ? 'P1' : 'P2'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => navigateTo('detail-salarie', { salarieId: periode.salarieId })}
                              className="font-semibold text-foreground text-xs hover:underline cursor-pointer truncate tracking-tight"
                            >
                              {periode.salarieNom}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] hidden sm:inline-flex font-normal"
                            >
                              {is3M ? 'Période 1 (3 mois)' : 'Période 2 (6 mois)'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {periode.salariePoste} • Resp : <strong className="text-primary font-medium">{periode.responsableNom}</strong>
                          </p>
                        </div>
                      </div>

                      {/* STATUT + BOUTON DE CONSULTATION À DEUX CHOIX */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shadow-2xs whitespace-nowrap ${
                            periode.statut === 'EN_ATTENTE_DECISION_RH'
                              ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 animate-pulse'
                              : periode.statut === 'EN_RELANCE'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
                              : periode.statut === 'EN_RETARD'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60'
                              : periode.statut === 'EN_COURS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {periode.statut === 'EN_ATTENTE_DECISION_RH'
                            ? 'EN ATTENTE DÉCISION RH'
                            : periode.statut === 'EN_RELANCE'
                            ? 'En relance'
                            : periode.statut === 'EN_RETARD'
                            ? 'En retard'
                            : periode.statut === 'EN_COURS' || periode.statut === 'PLANIFIEE'
                            ? 'En cours'
                            : (periode.statut as string) === 'RENOUVELEE'
                            ? 'Renouvellement'
                            : (periode.statut as string) === 'CONFIRMEE'
                            ? 'Validation / Titularisation'
                            : periode.statut}
                        </span>

                        {(periode.statut === 'COMPLETEE' ||
                          periode.statut === 'VALIDEE_RH' ||
                          (periode.statut as string) === 'CONFIRMEE' ||
                          periode.statut === 'RUPTURE') && (
                          <ConsulterBouton periode={periode} size="sm" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer (maintenant À L'INTÉRIEUR de la Card) */}
            <div className="p-4 border-t border-[#E8E8ED] flex items-center justify-between bg-[#F5F5F7]/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('periodes')}
                className="flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                Voir Toutes les Périodes
              </Button>

              <AlertTriangle className="w-4 h-4 text-red-600" strokeWidth={2} />
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}

// ============================================================================
// 2. MAIN DASHBOARD
// ============================================================================

export default function DashboardAdmin() {
  const { currentRole } = useApp();

  if (currentRole === "RESPONSABLE") {
    return <DashboardResponsable />;
  }

  return <DashboardRH />;
}