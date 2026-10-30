"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { AUTH_CHANGED_EVENT, getAuthUser, logout } from "../services/authService";
import type { AuthUser } from "../services/authService";

function getInitials(prenom: string, nom: string): string {
  const p = prenom?.trim()[0] ?? "";
  const n = nom?.trim()[0] ?? "";
  return (p + n).toUpperCase() || "U";
}

/* Icônes style SF Symbols : trait fin, extrémités arrondies. Couleur héritée (currentColor). */
type IconName = "panel" | "bell" | "chevron" | "user" | "help" | "logout" | "sparkles" | "database" | "check" | "search" | "xmark";

function SfIcon({ name, className = "w-[18px] h-[18px]", strokeWidth = 1.6 }: { name: IconName; className?: string; strokeWidth?: number }) {
  const shapes: Record<IconName, React.ReactNode> = {
    panel: (<><rect x="3" y="4.5" width="18" height="15" rx="4" /><path d="M9.5 4.5v15" /></>),
    bell: (<><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>),
    chevron: (<path d="M6 9l6 6 6-6" />),
    user: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18c1.2-2.3 3.3-3.3 5.5-3.3s4.3 1 5.5 3.3" /></>),
    help: (<><circle cx="12" cy="12" r="9" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9" /><circle cx="12" cy="16.7" r=".5" /></>),
    logout: (<><path d="M9 4.5H7a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h2" /><path d="M14 8l4 4-4 4M18 12H9" /></>),
    sparkles: (<><path d="M10 4c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5C7.7 9.9 9.4 8.2 10 4z" /><path d="M18 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" /></>),
    database: (<><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" /></>),
    check: (<><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>),
    search: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L20 20" /></>),
    xmark: (<><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" /><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" stroke="#fff" strokeWidth={2} /></>),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes[name]}
    </svg>
  );
}

const SEARCH_PAGES: { id: string; label: string; rhOnly?: boolean }[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "salaries", label: "Salariés" },
  { id: "gestion-responsable", label: "Gestion des sociétés", rhOnly: true },
  { id: "gestion-admins", label: "Administrateurs", rhOnly: true },
  { id: "periodes", label: "Périodes d'évaluation" },
  { id: "retards", label: "Retards" },
  { id: "analyse-ia", label: "Analyse IA", rhOnly: true },
  { id: "emails", label: "E-mails" },
  { id: "archive", label: "Archive", rhOnly: true },
  { id: "notifications", label: "Notifications" },
  { id: "parametres", label: "Paramètres" },
  { id: "aide", label: "Aide & Support" },
];

export default function Header() {
  const router = useRouter();
  const {
    currentScreen,
    navigateTo,
    currentRole,
    notifications,
    salaries,
    triggerCronBatch0900,
    toastMessage,
    periodes,
    isSidebarCollapsed,
    toggleSidebar,
    isDemoMode,
    toggleDemoMode,
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isCronRunning, setIsCronRunning] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isRH = currentRole === "ADMIN_RH";

  const profilePrenom = authUser?.prenom ?? "";
  const profileNom = authUser?.nom ?? "";
  const profileLabel = authUser?.role ?? "";

  const initials = getInitials(profilePrenom, profileNom);
  const fullName = `${profilePrenom} ${profileNom}`.trim() || "Utilisateur";

  const unreadNotifs = notifications.filter((n) => !n.estLue);

  // Recherche : pages + salariés (correspondance sur tous les champs texte)
  const q = query.trim().toLowerCase();
  const pageResults = q ? SEARCH_PAGES.filter((p) => (!p.rhOnly || isRH) && p.label.toLowerCase().includes(q)) : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salarieResults: any[] = q
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((salaries ?? []) as any[])
        .filter((s) =>
          Object.values(s)
            .filter((v) => typeof v === "string" || typeof v === "number")
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
        .slice(0, 5)
    : [];
  const hasResults = pageResults.length + salarieResults.length > 0;

  const closeSearch = () => {
    setQuery("");
    setIsSearchOpen(false);
  };

  useEffect(() => {
    const syncAuthUser = () => setAuthUser(getAuthUser());
    syncAuthUser();
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthUser);
    window.addEventListener("storage", syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener("storage", syncAuthUser);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const retardsCount = periodes.filter((p) => p.statut === "EN_RETARD" || p.statut === "EN_ATTENTE_DECISION_RH").length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsProfileMenuOpen(false);
      setIsNotifMenuOpen(false);
      setIsSearchOpen(false);
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInputRef.current?.focus();
      setIsSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setIsNotifMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getScreenTitle = (): string => {
    switch (currentScreen) {
      case "dashboard":
        return isRH ? "Supervision des Périodes d'Essai" : "Tableau de Bord Manager";
      case "salaries":
        return isRH ? "Répertoire des Salariés en Période d'Essai" : "Mes Salariés Affectés";
      case "ajouter-salarie":
        return "Intégration d'un Nouveau Salarié";
      case "detail-salarie":
        return "Fiche Individuelle & Parcours d'Évaluation";
      case "periodes":
        return isRH ? "Suivi des Périodes d'Évaluation " : "Évaluations à Réaliser — Mon Équipe";
      case "formulaire-evaluation":
        return "Fiche Officielle d'Évaluation";
      case "analyse-ia":
        return "Analyse IA des évaluations";
      case "archive":
        return "Archives des salariés";
      case "retards":
        return isRH ? "Centre de Surveillance des Retards (> 2 Jours)" : "Suivi des Évaluations en Souffrance";
      case "emails":
        return "Journal d'Audit des Emails Automatiques";
      case "notifications":
        return "Centre de Notifications & Alertes";
      case "responsables":
      case "gestion-responsable":
        return "Annuaire des Responsables";
      case "gestion-admins":
        return "Administrateurs RH";
      case "ajouter-responsable":
        return "Ajouter un Responsable";
      case "dashboard-responsable":
        return "Tableau de Bord Manager";
      case "moteur":
        return "Moteur d'Automatisation & Règles Système";
      case "aide":
        return "Aide & Support RH";
      case "parametres":
        return "Paramètres & Réglages";
      default:
        return "Groupe Premium - Essai Manager";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCronClick = () => {
    if (isCronRunning) return;
    setIsCronRunning(true);
    setTimeout(() => {
      triggerCronBatch0900();
      setIsCronRunning(false);
    }, 800);
  };

  const menuItem =
    "w-full text-left px-3 py-2 rounded-[10px] flex items-center gap-2.5 text-[13px] transition-colors cursor-pointer active:scale-[0.99] focus-visible:outline-none";

  return (
    <>
      <header
        className="
          h-16 bg-white/70 backdrop-blur-2xl backdrop-saturate-[180%] border-b border-black/[0.06]
          px-5 md:px-6 flex items-center justify-between
          sticky top-0 z-30 font-sans [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display',Inter,sans-serif] print:hidden
        "
      >
        <div className="flex items-center gap-3 min-w-0">
          {isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="
                w-8 h-8 rounded-[10px] text-primary hover:bg-black/[0.06]
                flex items-center justify-center transition-all duration-200 active:scale-95
                cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
              "
              title="Développer la barre latérale"
              aria-label="Développer la barre latérale"
            >
              <SfIcon name="panel" />
            </button>
          )}

          <div className="min-w-0">
            {/* Fil d'Ariane */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium leading-none mb-1">
              <span className="text-muted-foreground">Groupe Premium</span>
              <SfIcon name="chevron" className="w-2.5 h-2.5 -rotate-90 text-muted-foreground/60" strokeWidth={2.4} />
              <span className="text-primary font-semibold">
                {isRH ? "Espace DRH & Admin" : currentRole === "RESPONSABLE" ? "Espace Responsable" : "Espace Collaborateur"}
              </span>
            </div>

            {/* Titre */}
            <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-[-0.02em] leading-tight truncate max-w-[380px] md:max-w-[560px]">
              {getScreenTitle()}
            </h1>
          </div>
        </div>

        {/* Barre de recherche — style Réglages iOS */}
        <div ref={searchRef} className="relative hidden md:block flex-1 max-w-xs mx-4 focus-within:max-w-sm transition-[max-width] duration-300">
          <div className="relative">
            <SfIcon name="search" className="w-4 h-4 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Rechercher"
              aria-label="Rechercher un salarié ou une page"
              className="
                w-full h-9 rounded-[10px] bg-black/[0.06] hover:bg-black/[0.08] focus:bg-black/[0.08]
                pl-9 pr-16 text-[14px] text-foreground placeholder:text-[#86868B] outline-none
                transition-colors focus-visible:ring-2 focus-visible:ring-primary/30
                [&::-webkit-search-cancel-button]:hidden
              "
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#6E6E73] cursor-pointer"
              >
                <SfIcon name="xmark" className="w-4 h-4" />
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#86868B] pointer-events-none">Ctrl K</span>
            )}
          </div>

          {isSearchOpen && q && (
            <div
              className="
                absolute left-0 right-0 mt-2 bg-white/85 backdrop-blur-2xl backdrop-saturate-[180%] rounded-[20px]
                shadow-[0_8px_32px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.06] p-1.5 z-50
                max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150
              "
              role="listbox"
              aria-label="Résultats de recherche"
            >
              {!hasResults && (
                <div className="px-4 py-6 text-center">
                  <SfIcon name="search" className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-[13px] font-medium text-foreground">Aucun résultat</p>
                  <p className="text-xs text-muted-foreground">Vérifiez l&apos;orthographe ou essayez un autre terme.</p>
                </div>
              )}

              {salarieResults.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[12px] font-semibold text-[#86868B]">Salariés</p>
                  {salarieResults.map((s, i) => {
                    const name = `${s.prenom ?? ""} ${s.nom ?? ""}`.trim() || String(s.id ?? "Salarié");
                    const sub = s.poste ?? s.departement ?? "";
                    return (
                      <button
                        key={s.id ?? i}
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          closeSearch();
                          navigateTo("detail-salarie" as Parameters<typeof navigateTo>[0], { salarieId: s.id });
                        }}
                        className={`${menuItem} text-foreground hover:bg-black/[0.05] focus-visible:bg-black/[0.05]`}
                      >
                        <div className="w-7 h-7 rounded-[8px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <SfIcon name="user" className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        </div>
                        <span className="min-w-0">
                          <span className="block font-medium truncate">{name}</span>
                          {sub && <span className="block text-[11px] text-muted-foreground truncate">{String(sub)}</span>}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {pageResults.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[12px] font-semibold text-[#86868B]">Pages</p>
                  {pageResults.map((p) => (
                    <button
                      key={p.id}
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        closeSearch();
                        navigateTo(p.id as Parameters<typeof navigateTo>[0]);
                      }}
                      className={`${menuItem} text-foreground hover:bg-black/[0.05] focus-visible:bg-black/[0.05]`}
                    >
                      <div className="w-7 h-7 rounded-[8px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <SfIcon name="panel" className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      </div>
                      <span className="font-medium">{p.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mode démo : visible uniquement si NEXT_PUBLIC_ENABLE_DEMO=true (jamais en production) */}
          {process.env.NEXT_PUBLIC_ENABLE_DEMO === "true" && (
          <button
            onClick={toggleDemoMode}
            type="button"
            className={`
              h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] border
              ${isDemoMode
                ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                : "bg-secondary/70 text-muted-foreground border-[#E8E8ED]/80 hover:text-foreground hover:bg-[#F5F5F7]"
              }
            `}
            title={isDemoMode ? "Désactiver les données de test (Revenir aux données réelles)" : "Activer les données de démo pour présentation"}
          >
            {isDemoMode ? (
              <>
                <SfIcon name="sparkles" className="w-4 h-4 text-amber-600 animate-pulse" />
                <span className="hidden sm:inline">Mode Démo</span>
                <span className="font-semibold text-amber-900 dark:text-amber-200 text-[10px] bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded-full">
                  Actif
                </span>
              </>
            ) : (
              <>
                <SfIcon name="database" className="w-4 h-4 text-muted-foreground" />
                <span className="hidden sm:inline">Données réelles</span>
                <span className="text-[10px] font-semibold bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">
                  Vide / Réel
                </span>
              </>
            )}
          </button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => {
                setIsNotifMenuOpen((v) => !v);
                setIsProfileMenuOpen(false);
              }}
              aria-label="Centre de notifications"
              aria-haspopup="true"
              aria-expanded={isNotifMenuOpen}
              className="
                w-9 h-9 flex items-center justify-center text-muted-foreground
                hover:text-foreground rounded-full hover:bg-black/[0.06]
                transition-all duration-200 active:scale-95 relative cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
              "
              title="Centre de notifications"
            >
              <SfIcon name="bell" className="w-[19px] h-[19px]" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-white" />
              )}
            </button>

            {isNotifMenuOpen && (
              <div
                className="
                  absolute right-0 mt-2 w-80 bg-white/85 backdrop-blur-2xl backdrop-saturate-[180%] rounded-[20px]
                  shadow-[0_8px_32px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.06] py-2 z-50
                  animate-in fade-in slide-in-from-top-2 duration-150
                "
              >
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Notifications</span>
                  <button
                    onClick={() => {
                      setIsNotifMenuOpen(false);
                      navigateTo("notifications");
                    }}
                    className="text-xs text-primary hover:opacity-70 font-medium cursor-pointer transition-opacity"
                  >
                    Voir tout ({notifications.length})
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.05]">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <SfIcon name="bell" className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Aucune notification</p>
                    </div>
                  ) : (
                    notifications.slice(0, 4).map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 text-xs hover:bg-black/[0.04] transition-colors cursor-pointer ${!n.estLue ? "bg-primary/5" : ""}`}
                        onClick={() => {
                          setIsNotifMenuOpen(false);
                          if (n.lienEcran) {
                            navigateTo(n.lienEcran as Parameters<typeof navigateTo>[0], {
                              salarieId: n.targetId,
                              periodeId: n.targetId,
                            });
                          } else {
                            navigateTo("notifications");
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              n.type === "RETARD"
                                ? "bg-destructive/15 text-destructive"
                                : n.type === "CRON_SYSTEME"
                                ? "bg-[#F5F5F7] text-foreground"
                                : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                            }`}
                          >
                            {n.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{n.heureCreation}</span>
                        </div>
                        <p className="font-semibold text-foreground line-clamp-1">{n.titre}</p>
                        <p className="text-muted-foreground text-[11px] line-clamp-2 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profil */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => {
                setIsProfileMenuOpen((v) => !v);
                setIsNotifMenuOpen(false);
              }}
              aria-label="Menu profil utilisateur"
              aria-haspopup="true"
              aria-expanded={isProfileMenuOpen}
              className="
                flex items-center gap-2 rounded-full
                hover:bg-black/[0.05] transition-all duration-200 active:scale-[0.98]
                pl-1 pr-2.5 py-1 cursor-pointer focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-primary/40
              "
            >
              <div
                className="
                  w-8 h-8 rounded-full bg-gradient-to-br from-[#A50000] to-[#5C0000]
                  text-white font-semibold flex items-center justify-center text-[11px]
                  shadow-[0_1px_3px_rgba(0,0,0,0.2)] shrink-0
                "
                aria-hidden="true"
              >
                {initials}
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-semibold text-foreground leading-none truncate max-w-[120px]">{fullName}</p>
                <p className="text-[11px] text-muted-foreground leading-none mt-1 truncate max-w-[120px]">{profileLabel}</p>
              </div>

              <SfIcon
                name="chevron"
                className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isProfileMenuOpen ? "rotate-180" : ""}`}
                strokeWidth={2.2}
              />
            </button>

            {isProfileMenuOpen && (
              <div
                className="
                  absolute right-0 mt-2 w-72 bg-white/85 backdrop-blur-2xl backdrop-saturate-[180%] rounded-[20px]
                  shadow-[0_8px_32px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.06] p-1.5 z-50
                  animate-in fade-in slide-in-from-top-2 duration-150
                "
                role="menu"
                aria-label="Menu profil"
              >
                <div className="px-3 py-3 flex items-center gap-3 mb-1">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#A50000] to-[#5C0000] text-white font-semibold flex items-center justify-center text-sm shadow-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-tight truncate">{fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{profileLabel}</p>
                  </div>
                </div>

                <div className="mx-2 border-t border-black/[0.06]" />

                <div className="pt-1">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigateTo("parametres");
                    }}
                    className={`${menuItem} text-foreground hover:bg-black/[0.05] focus-visible:bg-black/[0.05]`}
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <SfIcon name="user" className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <span className="font-medium">Mon profil</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigateTo("aide");
                    }}
                    className={`${menuItem} text-foreground hover:bg-black/[0.05] focus-visible:bg-black/[0.05]`}
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <SfIcon name="help" className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <span className="font-medium">Aide &amp; Support</span>
                  </button>
                </div>

                <div className="mx-2 my-1 border-t border-black/[0.06]" />

                <button
                  role="menuitem"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                    router.replace("/connexion");
                  }}
                  className={`${menuItem} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 focus-visible:bg-red-50`}
                >
                  <div className="w-7 h-7 rounded-[8px] bg-red-50 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                    <SfIcon name="logout" className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="font-medium">Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {toastMessage && (
        <div
          className="
            fixed bottom-6 right-6 z-50 bg-white/85 backdrop-blur-2xl backdrop-saturate-[180%]
            text-foreground pl-3 pr-5 py-2.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-black/[0.06]
            flex items-center gap-2.5
            animate-in slide-in-from-bottom-5 duration-200 print:hidden
          "
          role={/^(échec|impossible|erreur|action impossible|désactivez)/i.test(toastMessage) ? "alert" : "status"}
          aria-live="polite"
        >
          {/^(échec|impossible|erreur|action impossible|désactivez)/i.test(toastMessage)
            ? <SfIcon name="xmark" className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2} />
            : <SfIcon name="check" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />}
          <span className="text-[13px] font-medium tracking-tight">{toastMessage}</span>
        </div>
      )}
    </>
  );
}