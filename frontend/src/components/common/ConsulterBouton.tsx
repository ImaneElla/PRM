"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Eye, ChevronDown, FileText, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PeriodeEvaluation } from "@/types";

interface ConsulterBoutonProps {
  periode?: PeriodeEvaluation | null;
  periodeId?: number;
  salarieId?: number;
  salarieNom?: string;
  className?: string;
  size?: "sm" | "default";
  variant?: "outline" | "solid";
}

export default function ConsulterBouton({
  periode,
  periodeId,
  salarieId,
  salarieNom,
  className = "",
  size = "sm",
  variant = "outline"
}: ConsulterBoutonProps) {
  const { periodes, allPeriodes, navigateTo } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Résolution intelligente de la période et du salarié
  const effectiveSalarieId = periode?.salarieId || salarieId;
  const effectivePeriode =
    periode ||
    (periodeId ? periodes.find((p) => p.id === periodeId) || allPeriodes?.find((p) => p.id === periodeId) : null) ||
    (effectiveSalarieId ? periodes.find((p) => p.salarieId === effectiveSalarieId) || allPeriodes?.find((p) => p.salarieId === effectiveSalarieId) : null);

  const effectivePeriodeId = effectivePeriode?.id || periodeId;
  const displayName = effectivePeriode?.salarieNom || salarieNom || "Collaborateur";

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 260;
    const menuHeight = 180;

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight && rect.top - menuHeight - 6 > 0) {
      top = rect.top - menuHeight - 6;
    }

    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setMenuCoords({ top, left });
  }, []);

  // Gestion de l'ouverture / calcul de position
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Fermer le menu au clic extérieur, scroll ou redimensionnement
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const handleOpenFormulaire = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (effectivePeriodeId) {
      navigateTo("formulaire-evaluation", { periodeId: effectivePeriodeId });
    } else if (effectiveSalarieId) {
      navigateTo("detail-salarie", { salarieId: effectiveSalarieId });
    }
  };

  const handleOpenAnalyseAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    navigateTo("analyse-ia", {
      periodeId: effectivePeriodeId,
      salarieId: effectiveSalarieId
    });
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-200 cursor-pointer select-none ${
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-8 px-3 text-xs"
        } ${
          variant === "solid"
            ? "bg-[#E4002B] text-white hover:bg-[#CC0027] border border-[#CC0027]"
            : "bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] border border-[#E8E8ED] hover:border-[#1D1D1F]/20"
        }`}
        title="Consulter le dossier"
      >
        <Eye className="w-3.5 h-3.5 text-[#6E6E73]" />
        <span>Consulter</span>
        <ChevronDown
          className={`w-3 h-3 text-[#6E6E73] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* DROPDOWN MENU VIA PORTAL — Rendu stable hors du tableau sans décalage */}
      {isOpen &&
        mounted &&
        menuCoords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              width: "260px",
              zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl bg-white border border-[#E8E8ED] shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
          >
            <div className="p-2.5 border-b border-[#E8E8ED] bg-[#F5F5F7]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6E6E73]">
                Options de consultation
              </p>
              <p className="text-xs font-semibold text-[#1D1D1F] truncate mt-0.5">
                {displayName}
              </p>
            </div>

            <div className="p-1.5 space-y-1">
              {/* CHOIX 1 : FORMULAIRE D'ÉVALUATION */}
              <button
                type="button"
                onClick={handleOpenFormulaire}
                className="w-full text-left p-2.5 rounded-lg hover:bg-[#F5F5F7] transition-colors flex items-start gap-2.5 group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1D1D1F] group-hover:text-blue-600 transition-colors">
                    Consulter le Formulaire
                  </p>
                  <p className="text-[11px] text-[#6E6E73] leading-snug mt-0.5">
                    Fiche d&apos;évaluation avec les 24 critères et signatures.
                  </p>
                </div>
              </button>

              {/* CHOIX 2 : ANALYSE IA DU SALARIÉ */}
              <button
                type="button"
                onClick={handleOpenAnalyseAI}
                className="w-full text-left p-2.5 rounded-lg hover:bg-[#F5F5F7] transition-colors flex items-start gap-2.5 group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-[#FFF0F3] text-[#E4002B] group-hover:bg-[#E4002B] group-hover:text-white transition-colors shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#E4002B] transition-colors">
                      Consulter l&apos;Analyse IA
                    </p>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15">
                      IA
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6E6E73] leading-snug mt-0.5">
                    Diagnostic cognitif, points forts, axes &amp; moyenne.
                  </p>
                </div>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
