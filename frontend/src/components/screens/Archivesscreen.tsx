"use client";

import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PeriodeEvaluation, Salarie } from '../../types';
import {
  Archive,
  Search,
  Eye,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import ConsulterBouton from '@/components/common/ConsulterBouton';
import { getSocieteLabel } from '@/lib/societe';
import { computeDecisionTotals, isRupture, isTitularise } from '@/lib/decisionStats';

const issueLabel = (s: Salarie) =>
  isRupture(s)
    ? "Arrêt de contrat"
    : isTitularise(s)
    ? 'Titularisé'
    : s.statutEssai;

const issueVariant = (s: Salarie): 'destructive' | 'appleGreen' | 'appleOrange' | 'secondary' =>
  isRupture(s)
    ? 'destructive'
    : isTitularise(s)
    ? 'appleGreen'
    : s.statutEssai === 'RENOUVELEE'
    ? 'appleOrange'
    : 'secondary';

const archivedPeriodIssue = (periode: PeriodeEvaluation) => {
  if (periode.statut === 'RUPTURE' || periode.decisionFinale === 'RUPTURE') {
    return 'RUPTURE';
  }
  if (periode.statut === 'RENOUVELEE' || periode.decisionFinale === 'RENOUVELLEMENT') {
    return 'RENOUVELEE';
  }
  return 'CONFIRMEE';
};

const archivedPeriodLabel = (periode: PeriodeEvaluation) => {
  const issue = archivedPeriodIssue(periode);
  return issue === 'RUPTURE'
    ? 'Arrêt de contrat'
    : issue === 'RENOUVELEE'
    ? 'Renouvellement'
    : 'Titularisation';
};

export default function ArchivesScreen() {
  const { archives, salaries, periodes, navigateTo, restaurerSalarie, currentRole, dashboardStats, isDemoMode } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<'ALL' | 'RUPTURE' | 'CONFIRMEE' | 'RENOUVELEE'>('ALL');
  const [toRestore, setToRestore] = useState<Salarie | null>(null);

  const isRH = currentRole === 'ADMIN_RH';
  const archivedPeriods = useMemo(
    () => periodes.filter((periode) => ['RENOUVELEE', 'CONFIRMEE', 'RUPTURE'].includes(periode.statut)),
    [periodes]
  );
  const societeBySalarieId = new Map(salaries.map((salarie) => [salarie.id, salarie.societe]));
  const closedPeriods = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return archivedPeriods
      .filter((periode) => {
        const matchesIssue = selectedIssue === 'ALL' || archivedPeriodIssue(periode) === selectedIssue;
        const matchesSearch = [
          periode.salarieNom,
          periode.salariePoste,
          periode.responsableNom,
          getSocieteLabel(societeBySalarieId.get(periode.salarieId)),
        ].some((value) => value.toLowerCase().includes(query));
        return matchesIssue && matchesSearch;
      })
      .sort((a, b) => String(b.dateValidationRH || '').localeCompare(String(a.dateValidationRH || '')));
  }, [archivedPeriods, searchTerm, selectedIssue, salaries]);

  // Salariés archivés ou ayant une décision finale (un titularisé reste actif côté backend)
  const archivedEmployeesWithoutPeriod = useMemo(
    () =>
      salaries.filter(
        (salarie) =>
          (salarie.actif === false || isTitularise(salarie) || isRupture(salarie)) &&
          !archivedPeriods.some((periode) => periode.salarieId === salarie.id)
      ),
    [salaries, archivedPeriods]
  );

  // Date et motif de la dernière décision enregistrée pour le salarié
  const getDecisionInfo = (salarieId: number) => {
    const ps = periodes.filter(p => p.salarieId === salarieId);
    const last =
      [...ps]
        .filter(p => p.dateValidationRH)
        .sort((a, b) => String(b.dateValidationRH).localeCompare(String(a.dateValidationRH)))[0] ||
      ps.find(p => p.statut === 'RUPTURE') ||
      ps[0];

    return {
      date:
        last?.dateValidationRH ||
        (last?.dateValidationEvaluateur ? String(last.dateValidationEvaluateur).split(' ')[0] : '—'),
      motif: last?.motifDecision || '',
    };
  };

  const filteredEmployeesWithoutPeriod = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return archivedEmployeesWithoutPeriod.filter(s => {
      const matchesSearch =
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.poste.toLowerCase().includes(q);
      const matchesIssue =
        selectedIssue === 'ALL' ||
        (selectedIssue === 'CONFIRMEE' && isTitularise(s)) ||
        (selectedIssue === 'RUPTURE' && isRupture(s));
      return matchesSearch && matchesIssue;
    });
  }, [archivedEmployeesWithoutPeriod, searchTerm, selectedIssue]);

  // Mêmes totaux que le tableau de bord : un salarié = une décision finale
  const {
    totalTitularises: countConfirmes,
    totalRuptures: countRuptures,
    totalFinalisees,
  } = computeDecisionTotals(salaries, dashboardStats, isRH && !isDemoMode);
  const countRenouvellements = archivedPeriods.filter(
    (periode) => archivedPeriodIssue(periode) === 'RENOUVELEE'
  ).length;

  const handleRestore = () => {
    if (toRestore) restaurerSalarie(toRestore.id);
    setToRestore(null);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] border border-[#E8E8ED] flex items-center justify-center">
          <Archive className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">Archives</h2>
          <p className="text-xs text-muted-foreground">
            Retrouvez ici les renouvellements, titularisations et arrêts de contrat. Un renouvellement archive la période,
            mais le salarié reste actif pour la suivante.
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total finalisées</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalFinalisees}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Titularisés</p>
          <p className="text-2xl font-bold text-apple-green mt-1">{countConfirmes}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Arrêts de contrat</p>
          <p className="text-2xl font-bold text-destructive mt-1">{countRuptures}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Périodes renouvelées</p>
          <p className="text-2xl font-bold text-foreground mt-1">{countRenouvellements}</p>
        </Card>
      </div>

      {/* Filtres et liste unique des archives */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={1.75}
            />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou poste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-secondary/50 border border-[#E8E8ED] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={selectedIssue}
            onChange={(e) =>
              setSelectedIssue(e.target.value as 'ALL' | 'RUPTURE' | 'CONFIRMEE' | 'RENOUVELEE')
            }
            className="text-xs bg-secondary/50 border border-[#E8E8ED] rounded-xl px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer w-full md:w-auto"
          >
            <option value="ALL">Toutes les issues</option>
            <option value="CONFIRMEE">Titularisés</option>
            <option value="RENOUVELEE">Renouvellements</option>
            <option value="RUPTURE">Arrêt de contrat</option>
          </select>
        </div>
      </Card>

      {closedPeriods.length === 0 && filteredEmployeesWithoutPeriod.length === 0 ? (
        <Card className="py-12">
          <div className="text-center text-muted-foreground">
            <UserRound className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Aucune archive ne correspond aux filtres</p>
            <p className="text-xs mt-1">
              Les périodes renouvelées, titularisées ou arrêtées apparaîtront ici.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-[#E8E8ED]/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-[#E8E8ED] text-[#6E6E73] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Période</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Salarié</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Responsable</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Date de clôture</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Décision</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60 text-foreground">
                {closedPeriods.map((periode) => {
                  const salarieArchive = archives.find((s) => s.id === periode.salarieId);
                  const issue = archivedPeriodIssue(periode);
                  return (
                    <tr key={`periode-${periode.id}`} className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {periode.numeroPeriode ? `Période ${periode.numeroPeriode}` : periode.typePeriode.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold">{periode.salarieNom}</p>
                        <p className="text-[11px] text-muted-foreground">{periode.salariePoste}</p>
                      </td>
                      <td className="py-3.5 px-4">{periode.responsableNom || '—'}</td>
                      <td className="py-3.5 px-4 font-mono">
                        {periode.dateValidationRH || periode.dateValidationEvaluateur || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={issue === 'RUPTURE' ? 'destructive' : issue === 'CONFIRMEE' ? 'appleGreen' : 'appleOrange'}
                          className="text-[10px] font-normal"
                        >
                          {archivedPeriodLabel(periode)}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateTo('detail-salarie', { salarieId: periode.salarieId })}
                            className="cursor-pointer h-8 px-3 rounded-lg text-xs inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Dossier
                          </Button>
                          <ConsulterBouton
                            periode={periode}
                            salarieNom={periode.salarieNom}
                            size="default"
                          />
                          {isRH && salarieArchive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setToRestore(salarieArchive)}
                              className="cursor-pointer h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                              Restaurer
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEmployeesWithoutPeriod.map((s) => {
                  const info = getDecisionInfo(s.id);
                  return (
                    <tr key={`salarie-${s.id}`} className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">Dossier salarié</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold">{s.firstName} {s.lastName}</p>
                        <p className="text-[11px] text-muted-foreground">{s.poste}</p>
                      </td>
                      <td className="py-3.5 px-4">{s.responsableNom || '—'}</td>
                      <td className="py-3.5 px-4 font-mono">{info.date}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={issueVariant(s)} className="text-[10px] font-normal">
                          {issueLabel(s)}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateTo('detail-salarie', { salarieId: s.id })}
                            className="cursor-pointer h-8 px-3 rounded-lg text-xs inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Dossier
                          </Button>
                          <ConsulterBouton
                            salarieId={s.id}
                            salarieNom={`${s.firstName} ${s.lastName}`}
                            size="default"
                          />
                          {isRH && s.actif === false && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setToRestore(s)}
                              className="cursor-pointer h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                              Restaurer
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

      {/* Modal de confirmation de restauration */}
      {toRestore && (
        <div
          onClick={() => setToRestore(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] border border-[#E8E8ED] shadow-[0_24px_64px_rgba(0,0,0,0.12)] max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-primary" strokeWidth={1.75} />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  Restaurer le salarié
                </h3>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setToRestore(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">
                {toRestore.firstName} {toRestore.lastName}
              </strong>{' '}
              sera retiré des archives et réapparaîtra dans la liste des salariés.
            </p>

            {toRestore.statutEssai === 'RUPTURE' && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Sa période d&apos;essai reste en statut « Arrêt de contrat » : les évaluations restent bloquées et
                  les relances automatiques arrêtées.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setToRestore(null)} className="cursor-pointer">
                Annuler
              </Button>
              <Button size="sm" onClick={handleRestore} className="cursor-pointer flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                Oui, restaurer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}