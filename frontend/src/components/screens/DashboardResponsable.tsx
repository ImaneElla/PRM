"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ConsulterBouton from "@/components/common/ConsulterBouton";

const TERMINAL_STATUSES = new Set(["COMPLETEE", "VALIDEE_RH", "RUPTURE", "RENOUVELEE", "CONFIRMEE"]);

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date à confirmer"
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function libelleStatut(statut: string, rempli: boolean): string {
  switch (statut) {
    case "EN_COURS": return "En cours";
    case "EN_RELANCE": return "En relance";
    case "EN_RETARD":
    case "EN_RETARD_CRITIQUE": return "En retard";
    case "EN_ATTENTE_DECISION_RH": return "Décision RH";
    case "RUPTURE": return "Arrêt de contrat";
    case "RENOUVELEE": return "Renouvellement";
    case "CONFIRMEE": return "Titularisé";
    case "COMPLETEE":
    case "VALIDEE_RH": return "Bilan finalisé";
    default: return rempli ? "Rempli" : "À remplir";
  }
}

export default function DashboardResponsable() {
  const { salaries, periodes, evaluations, navigateTo } = useApp();

  const activePeriodes = useMemo(
    () => periodes.filter((periode) => !TERMINAL_STATUSES.has(periode.statut)),
    [periodes]
  );
  const latePeriodes = activePeriodes.filter(
    (periode) => periode.statut === "EN_RETARD" || periode.statut === "EN_RETARD_CRITIQUE" || periode.statut === "EN_ATTENTE_DECISION_RH"
  );
  const completedPeriodes = periodes.filter((periode) => TERMINAL_STATUSES.has(periode.statut));
  // Tous les bilans de l'équipe, classés par échéance (les plus proches d'abord)
  const suivi = [...periodes]
    .sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime())
    .slice(0, 10);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-red-700">Espace responsable</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez les salariés de votre équipe et les évaluations à réaliser.
          </p>
        </div>
        <Button
          onClick={() => navigateTo("periodes")}
          className="cursor-pointer self-start sm:self-auto"
        >
          Voir les évaluations
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Mes salariés"
          value={salaries.filter(s => s.actif !== false).length}
          unit={salaries.filter(s => s.actif !== false).length === 1 ? "salarié" : "salariés"}
          chip="Mon équipe"
          onClick={() => navigateTo("salaries")}
        />
        <KpiCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Évaluations actives"
          value={activePeriodes.length}
          unit={activePeriodes.length === 1 ? "évaluation" : "évaluations"}
          chip="En cours de suivi"
          onClick={() => navigateTo("periodes")}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="En retard"
          value={latePeriodes.length}
          unit={latePeriodes.length === 1 ? "évaluation" : "évaluations"}
          chip={latePeriodes.length > 0 ? "Attention requise" : "À jour"}
          detail={latePeriodes.map((periode) => periode.salarieNom).join(", ")}
          danger={latePeriodes.length > 0}
          onClick={() => navigateTo("retards")}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Évaluations terminées"
          value={completedPeriodes.length}
          unit={completedPeriodes.length === 1 ? "évaluation" : "évaluations"}
          chip="Finalisées"
          onClick={() => navigateTo("periodes")}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E8E8ED]/60 p-5">
          <div>
            <h2 className="font-semibold text-foreground">Évaluations à suivre</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les bilans de votre équipe, classés par échéance.
            </p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" />
        </div>

        {suivi.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#E8E8ED]/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Période</th>
                  <th className="px-5 py-3 font-medium">Collaborateur</th>
                  <th className="px-5 py-3 font-medium">Échéance</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {suivi.map((periode) => {
                  const rempli = TERMINAL_STATUSES.has(periode.statut) || evaluations.some((e) => e.periodeId === periode.id);
                  const enRetard = periode.statut === "EN_RETARD" || periode.statut === "EN_RETARD_CRITIQUE" || periode.statut === "EN_ATTENTE_DECISION_RH";
                  return (
                    <tr key={periode.id}>
                      <td className="px-5 py-3.5 align-middle">
                        <span className="inline-flex whitespace-nowrap rounded-full bg-[#F5F5F7] px-2.5 py-1 text-xs font-medium text-[#515154]">
                          {periode.typePeriode === "SIX_MOIS" ? "6 mois" : "3 mois"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <p className="font-medium text-foreground">{periode.salarieNom}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 align-middle text-muted-foreground">
                        {formatDate(periode.dateEcheance)}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <Badge variant={enRetard ? "destructive" : rempli ? "appleGreen" : "secondary"} className="text-[10px]">
                          {libelleStatut(periode.statut, rempli)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right align-middle">
                        {rempli ? (
                          <ConsulterBouton periode={periode} size="sm" />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => navigateTo("detail-salarie", { salarieId: periode.salarieId })}
                          >
                            Dossier
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">
            Aucune évaluation active à afficher.
          </p>
        )}
      </Card>
    </section>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  chip,
  detail,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  chip: string;
  detail?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-[20px] border border-[#E8E8ED] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4002B]/30"
    >
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rotate-12 bg-gradient-to-br from-[#FFF0F3] to-transparent transition-transform duration-500 group-hover:scale-125" />
      <div className="relative z-10">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E4002B]/10 bg-[#FFF0F3] text-[#E4002B] transition-colors duration-200 group-hover:bg-[#E4002B] group-hover:text-white">
              {icon}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73]">
              {label}
            </span>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F7] text-[#E4002B] transition-colors duration-200 group-hover:bg-[#E4002B] group-hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-black leading-none tracking-tight ${danger ? "text-[#E4002B]" : "text-[#1D1D1F]"}`}>
            {value}
          </span>
          <span className="mb-1 text-[11px] font-medium text-[#6E6E73]">{unit}</span>
        </div>
        <div className="mt-5">
          <Badge className="rounded-full border border-[#E4002B]/15 bg-[#FFF0F3] px-2.5 py-1 text-[10px] font-semibold text-[#E4002B]">
            {chip}
          </Badge>
        </div>
        {detail && <p className="mt-2 truncate text-[11px] text-zinc-500">{detail}</p>}
      </div>
      <div className="absolute bottom-0 right-0 h-1 w-16 rounded-tl-full bg-gradient-to-r from-[#E4002B] to-[#1D1D1F]" />
    </Card>
  );
}