"use client";

import React, { useState, useMemo, useRef } from "react";
import { useApp } from "../../context/AppContext";
import type { ImportSalarieResult } from "../../services/salarieService";
import { telechargerModeleSalaries } from "@/lib/telechargerModele";
import {
  Search,
  Download,
  Upload,
  UserPlus,
  Clock,
  Building2,
  Grid2X2,
  CalendarDays,
  UserRound,
  Mail,
  Zap,
  CheckCircle2,
  X,
  TriangleAlert,
  LayoutList,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import ConsulterBouton from "@/components/common/ConsulterBouton";
import { getProfileAvatarColor } from "@/lib/profileAvatar";
import { SOCIETES } from "@/lib/societe";

const inputBase =
  "w-full text-xs px-3 py-2 h-10 bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white focus:outline-none transition-all duration-200 text-[#1D1D1F] placeholder:text-[#6E6E73]";

const inputWithIcon =
  "w-full pl-9 pr-3 py-2 h-10 text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white focus:outline-none transition-all duration-200 text-[#1D1D1F] placeholder:text-[#6E6E73]";

const PeriodeLabel = (j: string) =>
  j === "TROIS_MOIS" || j === "DEUX_MOIS"
    ? "Bilan 3 mois"
    : j === "SIX_MOIS" || j === "CINQ_MOIS"
    ? "Bilan 6 mois"
    : "Clôturé";

const statutLabel = (s: string) =>
  s === "EN_COURS"
    ? "En cours"
    : s === "CONFIRMEE"
    ? "Titularisé"
    : s === "RENOUVELEE"
    ? "Renouvellement"
    : "Arrêt de contrat";

const statutVariant = (s: string): "appleGreen" | "secondary" | "destructive" =>
  s === "CONFIRMEE" ? "appleGreen" : s === "RUPTURE" ? "destructive" : "secondary";

const formatDateFr = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
};

const addMonthsFormatted = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return formatDateFr(d.toISOString());
};

export default function SalariesListScreen() {
  const {
    salaries = [],
    responsables = [],
    periodes = [],
    addSalarie,
    importerSalaries,
    showToast,
    navigateTo,
    currentRole,
    isAddSalarieModalOpen,
    openAddSalarieModal,
    closeAddSalarieModal,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSociete, setSelectedSociete] = useState<string>("ALL");
  const [selectedStatut, setSelectedStatut] = useState<string>("ALL");

  // Filtre demandé depuis le tableau de bord (ex. « Total titularisés » -> Titularisé), appliqué une seule fois
  React.useEffect(() => {
    try {
      const demande = sessionStorage.getItem("gp_filtre_salaries");
      if (demande) {
        sessionStorage.removeItem("gp_filtre_salaries");
        setSelectedStatut(demande);
      }
    } catch {
      // stockage indisponible : pas de filtre préréglé
    }
  }, []);
  const [selectedPeriode, setSelectedPeriode] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const buildEmptyForm = () => ({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    poste: "",
    societe: "GRP",
    responsableId: responsables[0]?.id || 1,
    dateEmbauche: new Date().toISOString().slice(0, 10),
  });

  const [form, setForm] = useState(buildEmptyForm);

  // Résultats affichés après un import CSV
  const [importResults, setImportResults] = useState<ImportSalarieResult[] | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const fichierCsvRef = useRef<HTMLInputElement>(null);

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de réimporter le même fichier
    if (!fichier) return;
    setImportEnCours(true);
    try {
      setImportResults(await importerSalaries(fichier));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Impossible d'importer le fichier.");
    } finally {
      setImportEnCours(false);
    }
  };

  const handleOpenAddModal = () => {
    setForm(buildEmptyForm());
    openAddSalarieModal();
  };

  const handleNameChange = (firstName: string, lastName: string) => {
    setForm((prev) => {
      const next = { ...prev, firstName, lastName };
      if (firstName.trim() && lastName.trim()) {
        const clean = (v: string) =>
          v
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "");
        next.email = `${clean(firstName)}${clean(lastName)}@premium.africa`;
      }
      return next;
    });
  };

  const calculated3M = addMonthsFormatted(form.dateEmbauche, 3);
  const calculated6M = addMonthsFormatted(form.dateEmbauche, 6);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.poste ||
      !form.dateEmbauche
    ) {
      return;
    }

    addSalarie({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      poste: form.poste,
      dateEmbauche: form.dateEmbauche,
      dureeInitialeMois: 6,
      societe: form.societe,
      responsableId: form.responsableId,
    } as Parameters<typeof addSalarie>[0]);

    closeAddSalarieModal();
  };

  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      if (s.actif === false) return false;

      const matchesSearch =
        `${s.firstName} ${s.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.poste.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSociete =
        selectedSociete === "ALL" || (s.societe || "GRP") === selectedSociete;

      const matchesStatut =
        selectedStatut === "ALL" || s.statutEssai === selectedStatut;

      const matchesPeriode =
        selectedPeriode === "ALL" ||
        s.PeriodeActuel === selectedPeriode ||
        (selectedPeriode === "TROIS_MOIS" && s.PeriodeActuel === "DEUX_MOIS") ||
        (selectedPeriode === "SIX_MOIS" && s.PeriodeActuel === "CINQ_MOIS");

      return matchesSearch && matchesSociete && matchesStatut && matchesPeriode;
    });
  }, [salaries, searchTerm, selectedSociete, selectedStatut, selectedPeriode]);

  const isRH = currentRole === "ADMIN_RH";

  const openEvaluation = (salarieId: number) => {
    const salariePeriodes = periodes.filter((p) => p.salarieId === salarieId);
    const activeP =
      salariePeriodes.find((p) => p.statut !== "VALIDEE_RH") ||
      salariePeriodes[0];

    if (activeP) {
      navigateTo("formulaire-evaluation", { periodeId: activeP.id });
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* ===================== HEADER ===================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
            {isRH ? "Salariés en Période d'Essai" : "Mes Salariés Affectés"}
          </h2>

          <p className="text-xs text-muted-foreground">
            {isRH
              ? `Total : ${filteredSalaries.length} collaborateur${
                  filteredSalaries.length > 1 ? "s répertoriés" : " répertorié"
                }`
              : `équipe Gestion de Patrimoine • ${
                  filteredSalaries.length
                } collaborateur${
                  filteredSalaries.length > 1
                    ? "s sous votre responsabilité"
                    : " sous votre responsabilité"
                }`}
          </p>
        </div>

        {isRH && (
          <div className="flex flex-nowrap items-center gap-2 shrink-0 whitespace-nowrap overflow-x-auto [&_button]:shrink-0">
            <input
              ref={fichierCsvRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleImportCsv}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fichierCsvRef.current?.click()}
              disabled={importEnCours}
              title="Fichier Excel (.xlsx) avec les colonnes nom, prénom, email, poste, date d'embauche (société, téléphone et e-mail du responsable facultatifs). Téléchargez le modèle pour partir d'un fichier prêt à remplir"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" strokeWidth={1.75} />
              <span>{importEnCours ? "Import en cours..." : "Importer un fichier Excel"}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => telechargerModeleSalaries().catch((e) => showToast(e instanceof Error ? e.message : "Impossible de télécharger le modèle."))}
              title="Télécharger un fichier Excel d'exemple avec les bonnes colonnes"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" strokeWidth={1.75} />
              <span>Modèle Excel</span>
            </Button>
            <Button
              onClick={handleOpenAddModal}
              size="default"
              className="btn-gradient flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.75} />
              <span>Ajouter un salarié</span>
            </Button>
          </div>
        )}
      </div>

      {/* ===================== FILTRES ===================== */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={1.75}
            />

            <input
              type="text"
              placeholder="Rechercher par nom, prénom, email ou intitulé de poste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 h-10 text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] focus:outline-none focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white transition-all duration-200 text-[#1D1D1F] placeholder:text-[#6E6E73]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {isRH && (
              <select
                value={selectedSociete}
                onChange={(e) => setSelectedSociete(e.target.value)}
                className="text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] px-3 py-2 h-10 text-[#1D1D1F] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none cursor-pointer transition-all duration-200"
              >
                <option value="ALL">Toutes les Sociétés</option>
                {SOCIETES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            )}

            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] px-3 py-2 h-10 text-[#1D1D1F] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none cursor-pointer transition-all duration-200"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="EN_COURS">En cours d&apos;essai</option>
              <option value="RENOUVELEE">Renouvelée</option>
              <option value="CONFIRMEE">Titularisé</option>
              <option value="RUPTURE">Arrêt de contrat</option>
            </select>

            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value)}
              className="text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] px-3 py-2 h-10 text-[#1D1D1F] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none cursor-pointer transition-all duration-200"
            >
              <option value="ALL">Toutes les Périodes</option>
              <option value="TROIS_MOIS">Bilan 3 Mois</option>
              <option value="SIX_MOIS">Bilan 6 Mois</option>
              <option value="TERMINE">Période Clôturée</option>
            </select>

            <div className="h-6 w-px bg-border hidden lg:block mx-0.5" />

            {/* Sélecteur de vue (Liste / Grille) */}
            <div className="flex items-center p-0.5 bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] gap-0.5 shrink-0">
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-7 w-7 p-0 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-[#E8E8ED]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Vue en liste"
              >
                <LayoutList className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Button>

              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-7 w-7 p-0 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-[#E8E8ED]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Vue en cartes"
              >
                <Grid2X2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ===================== LISTE / GRILLE ===================== */}
      {filteredSalaries.length === 0 ? (
        <Card className="py-12">
          <div className="text-center text-muted-foreground">
            <UserRound className="w-8 h-8 mx-auto mb-3 opacity-50" />

            <p className="text-sm font-medium">Aucun collaborateur trouvé</p>

            <p className="text-xs mt-1">
              Aucun collaborateur ne correspond aux critères de recherche
              sélectionnés.
            </p>
          </div>
        </Card>
      ) : viewMode === "list" ? (
        <Card className="overflow-hidden border border-[#E8E8ED]/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>

              <thead className="border-b border-[#E8E8ED] text-[#6E6E73] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Collaborateur</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Poste & Société</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Responsable N+1</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Dates Clés</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60 text-foreground">
                {filteredSalaries.map((salarie) => {
                  const hasOverdue = periodes.some(
                    (p) => p.salarieId === salarie.id && p.statut === "EN_RETARD"
                  );

                  return (
                    <tr
                      key={salarie.id}
                      className={`hover:bg-[#F5F5F7] transition-all duration-200 ${
                        hasOverdue ? "bg-destructive/5" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-[10px] border font-bold flex items-center justify-center text-xs shrink-0 ${getProfileAvatarColor(salarie.id)}`}>
                            {salarie.firstName[0]}
                            {salarie.lastName[0]}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                title={`${salarie.firstName} ${salarie.lastName}`}
                                onClick={() =>
                                  navigateTo("detail-salarie", {
                                    salarieId: salarie.id,
                                  })
                                }
                                className="font-semibold text-foreground hover:text-primary cursor-pointer text-xs tracking-tight truncate text-left"
                              >
                                {salarie.firstName} {salarie.lastName}
                              </button>

                              {salarie.matricule && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-[#F5F5F7] px-1.5 py-0.5 rounded-md border border-[#E8E8ED]/60 shrink-0">
                                  {salarie.matricule}
                                </span>
                              )}
                            </div>

                            <span
                              title={salarie.email}
                              className="text-[11px] text-muted-foreground block truncate mt-0.5"
                            >
                              {salarie.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap overflow-hidden">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Building2
                              className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                              strokeWidth={1.75}
                            />
                            <p
                              title={salarie.poste}
                              className="font-semibold text-foreground text-xs truncate"
                            >
                              {salarie.poste}
                            </p>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate pl-5 mt-0.5">
                            Société : {salarie.societe || 'GRP'}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-semibold shrink-0 ${getProfileAvatarColor(salarie.responsableId || salarie.responsableNom || 'responsable')}`}>
                            {salarie.responsableNom ? salarie.responsableNom[0] : "R"}
                          </div>
                          <p
                            title={salarie.responsableNom}
                            className="font-medium text-foreground text-xs truncate"
                          >
                            {salarie.responsableNom || "—"}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap overflow-hidden font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <div className="truncate text-foreground">
                            <span className="text-muted-foreground font-sans text-[10px] uppercase font-semibold mr-1.5">
                              Entrée:
                            </span>
                            {salarie.dateEmbauche}
                          </div>
                          <div className="truncate text-muted-foreground">
                            <span className="text-muted-foreground font-sans text-[10px] uppercase font-semibold mr-1.5">
                              Terme:
                            </span>
                            {salarie.dateFinPrevisionnelle}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigateTo("detail-salarie", {
                                salarieId: salarie.id,
                              })
                            }
                            className="cursor-pointer h-8 px-3 rounded-lg border-[#E8E8ED] hover:bg-[#F5F5F7] text-foreground text-xs font-medium inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                            Détail
                          </Button>
                          {['CONFIRMEE', 'RUPTURE'].includes(salarie.statutEssai) && (
                            <ConsulterBouton
                              salarieId={salarie.id}
                              salarieNom={`${salarie.firstName} ${salarie.lastName}`}
                              size="sm"
                            />
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSalaries.map((salarie) => {
            const hasOverdue = periodes.some(
              (p) => p.salarieId === salarie.id && p.statut === "EN_RETARD"
            );

            return (
              <Card
                key={salarie.id}
                className={`overflow-hidden transition-all duration-200 ease-out hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-px ${
                  hasOverdue ? "border-destructive/30 bg-destructive/5" : ""
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-[12px] border font-bold flex items-center justify-center text-xs shrink-0 ${getProfileAvatarColor(salarie.id)}`}>
                        {salarie.firstName[0]}
                        {salarie.lastName[0]}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              navigateTo("detail-salarie", {
                                salarieId: salarie.id,
                              })
                            }
                            className="font-semibold text-foreground hover:text-primary cursor-pointer text-sm tracking-tight text-left"
                          >
                            {salarie.firstName} {salarie.lastName}
                          </button>

                          {salarie.matricule && (
                            <span className="text-[9px] font-mono text-muted-foreground bg-[#F5F5F7] px-1.5 py-0.5 rounded border border-[#E8E8ED]/60">
                              {salarie.matricule}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">
                            {salarie.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={statutVariant(salarie.statutEssai)}
                      className="text-[10px] font-normal shrink-0"
                    >
                      {statutLabel(salarie.statutEssai)}
                    </Badge>
                  </div>

                  <div className="h-px bg-border/60 my-4" />

                  <div className="mb-4">
                    <p className="text-sm font-semibold text-foreground">
                      {salarie.poste}
                    </p>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3" strokeWidth={1.75} />
                      <span>Société : {salarie.societe || 'GRP'}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-secondary/50 border border-[#E8E8ED]/50 p-3">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
                        Responsable
                      </p>

                      <p className="text-xs font-medium text-foreground truncate">
                        {salarie.responsableNom}
                      </p>

                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Responsable
                      </p>
                    </div>

                    <div className="rounded-xl bg-secondary/50 border border-[#E8E8ED]/50 p-3">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
                        Période actuelle
                      </p>

                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-1 text-[10px] font-normal"
                      >
                        <Clock className="w-3 h-3" strokeWidth={1.75} />
                        {PeriodeLabel(salarie.PeriodeActuel)}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-secondary/30 border border-[#E8E8ED]/40 p-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays
                        className="w-4 h-4 text-muted-foreground"
                        strokeWidth={1.75}
                      />

                      <div className="flex-1">
                        <div className="flex justify-between gap-2 text-[10px]">
                          <span className="text-muted-foreground">Entrée</span>

                          <span className="font-mono font-medium text-foreground">
                            {salarie.dateEmbauche}
                          </span>
                        </div>

                        <div className="flex justify-between gap-2 text-[10px] mt-1">
                          <span className="text-muted-foreground">Terme</span>

                          <span className="font-mono text-muted-foreground">
                            {salarie.dateFinPrevisionnelle}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {hasOverdue && (
                    <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 relative flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                        <TriangleAlert className="w-4 h-4 text-yellow-600" />
                      </div>

                      <span className="text-[10px] text-rose-700 font-medium">
                        Retard &gt; 2 jours
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E8E8ED] bg-[#F5F5F7]/60 px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigateTo("detail-salarie", {
                          salarieId: salarie.id,
                        })
                      }
                      className="cursor-pointer text-xs"
                    >
                      Détail
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => openEvaluation(salarie.id)}
                      className="btn-gradient cursor-pointer text-xs"
                    >
                      Évaluer
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL AJOUT SALARIÉ ===================== */}
      {isAddSalarieModalOpen && (
        <div
          onClick={closeAddSalarieModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[8px] animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] border border-[#E8E8ED] shadow-[0_24px_64px_rgba(0,0,0,0.12)] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Créer un Salarié &amp; Automatiser le Suivi d&apos;Essai
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  L&apos;enregistrement calcule automatiquement les Périodes
                  d&apos;évaluation à 3 mois et 6 mois et programme les envois à
                  09:00.
                </p>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                onClick={closeAddSalarieModal}
                className="h-8 w-8 shrink-0 rounded-[10px] flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-5">
              {/* ============ 1. IDENTITÉ ============ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#E8E8ED]">
                  <div className="w-6 h-6 rounded-[8px] bg-[#E4002B]/10 text-[#E4002B] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-semibold text-foreground tracking-tight">
                    Identité du Collaborateur
                  </h4>
                </div>

                {/* Prénom + Nom */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Prénom <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Alexandre"
                      value={form.firstName}
                      onChange={(e) => handleNameChange(e.target.value, form.lastName)}
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Nom <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Moreau"
                      value={form.lastName}
                      onChange={(e) => handleNameChange(form.firstName, e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* Email + Responsable (toujours côte à côte, même sur mobile) */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Email Professionnel <span className="text-primary">*</span>
                    </label>
                    <div className="relative w-full">
                      <Mail
                        className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        strokeWidth={1.75}
                      />
                      <input
                        type="email"
                        required
                        placeholder="prenom.nom@premium.africa"
                        value={form.email}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            email: e.target.value.trim().toLowerCase(),
                          }))
                        }
                        className={`${inputWithIcon} font-mono lowercase truncate`}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Responsable <span className="text-primary">*</span>
                    </label>
                    <select
                      value={form.responsableId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          responsableId: Number(e.target.value),
                        }))
                      }
                      className={`${inputBase} cursor-pointer truncate`}
                    >
                      {responsables.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.firstName} {r.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ============ 2. AFFECTATION ============ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#E8E8ED]">
                  <div className="w-6 h-6 rounded-lg bg-[#F5F5F7] text-foreground flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-semibold text-foreground tracking-tight">
                    Affectation Métier &amp; Poste
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Intitulé du poste <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Analyste Financier"
                      value={form.poste}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, poste: e.target.value }))
                      }
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Société / Entité <span className="text-primary">*</span>
                    </label>
                    <select
                      required
                      value={form.societe}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, societe: e.target.value }))
                      }
                      className={`${inputBase} cursor-pointer`}
                    >
                      {SOCIETES.map(({ code, label }) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ============ 3. PARAMÉTRAGE ============ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#E8E8ED]">
                  <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">
                      Paramétrage de la Période d&apos;Essai &amp; Calcul des échéances
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Convention collective &amp; accords Groupe Premium
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Date d&apos;Embauche <span className="text-primary">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={form.dateEmbauche}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, dateEmbauche: e.target.value }))
                      }
                      className={`${inputBase} font-mono`}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-[#E8E8ED] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Zap className="w-4 h-4" strokeWidth={1.75} />
                    <span>Calculateur Automatique de Période Groupe Premium</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-[#E8E8ED] shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Période 1</span>
                        <Badge variant="appleBlue" className="text-[10px]">
                          3 Mois
                        </Badge>
                      </div>
                      <p className="font-bold text-foreground text-sm font-mono">
                        {calculated3M || "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Mail auto envoyé à{" "}
                        <strong className="text-foreground">09:00:00</strong>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#E8E8ED] shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Période 2</span>
                        <Badge variant="applePurple" className="text-[10px]">
                          6 Mois
                        </Badge>
                      </div>
                      <p className="font-bold text-foreground text-sm font-mono">
                        {calculated6M || "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Bilan final avant confirmation
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5 border-t border-[#E8E8ED]/60">
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-apple-green"
                      strokeWidth={2}
                    />
                    <span>Détection automatique des retards.</span>
                  </div>
                </div>
              </div>

              {/* ============ BOUTONS ============ */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E8ED]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeAddSalarieModal}
                  className="cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="btn-gradient flex items-center gap-2 shadow-xs cursor-pointer px-4"
                >
                  <UserPlus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Enregistrer le salarié</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Résultats de l'import CSV */}
      {importResults && (
        <div
          onClick={() => setImportResults(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[20px] border border-[#E8E8ED] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-[#1D1D1F]">
                  Résultat de l&apos;import
                </h3>
                <p className="text-xs text-[#6E6E73] mt-0.5">
                  {importResults.filter((r) => r.statut === "CREE").length} salarié(s) créé(s)
                  {" · "}
                  {importResults.filter((r) => r.statut !== "CREE").length} ligne(s) non traitée(s)
                </p>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setImportResults(null)}
                className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importResults.length === 0 ? (
              <p className="text-xs text-[#6E6E73]">Aucune ligne à importer dans ce fichier.</p>
            ) : (
              <div className="overflow-y-auto divide-y divide-zinc-100 border border-[#E8E8ED] rounded-xl">
                {importResults.map((r, index) => (
                  <div key={`${r.ligne ?? ""}-${r.email ?? index}`} className="p-3 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1D1D1F] truncate">
                        {r.ligne ? <span className="text-[#6E6E73] font-normal">Ligne {r.ligne} · </span> : null}
                        {r.nomComplet || "—"}
                      </p>
                      <p className="font-mono text-[11px] text-[#6E6E73] truncate">{r.email || "—"}</p>
                      {r.message && <p className="text-[11px] text-[#6E6E73] mt-0.5">{r.message}</p>}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                        r.statut === "CREE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : r.statut === "IGNORE"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {r.statut === "CREE" ? "Créé" : r.statut === "IGNORE" ? "Ignoré" : "Erreur"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setImportResults(null)} className="rounded-xl text-xs cursor-pointer">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}