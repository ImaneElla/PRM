"use client";

import React, { useState } from "react";
import { getToken } from "@/services/authService";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Target,
  Calculator,
  Table2,
  Copy,
  Check,
  Brain,
  Zap,
  Star,
  Award,
  ShieldCheck,
  BarChart3,
  Flame,
  ArrowRight,
  Layers,
  FileCheck2,
  AlertCircle
} from "lucide-react";

export interface EvaluationCriterion {
  nom: string;
  note: string;
  commentaire: string;
}

export interface EvaluationData {
  salarieName?: string;
  poste?: string;
  criteres: EvaluationCriterion[];
  appreciationGenerale?: string;
  pointsForts?: string;
  axesAmelioration?: string;
  donneesAnalyseAI?: AIAnalysisResult;
}

export interface SyntheseTableauRow {
  salarie: string;
  point1_pointsForts: string;
  point2_axesAmelioration: string;
  point3_syntheseMoyenne: string;
}

export interface AIAnalysisResult {
  // 'ia' = généré par le modèle ; 'modele-local' = texte générique (Ollama indisponible ou réponse invalide)
  source?: 'ia' | 'modele-local';
  moyenneGlobale?: number;
  pointsForts: string[];
  axesAmelioration: string[];
  planAccompagnement: {
    action: string;
    objectif: string;
    echeance: string;
    moyens: string;
  }[];
  syntheseTableau?: SyntheseTableauRow[];
}

interface AIAnalysisModuleProps {
  data: EvaluationData;
  onApplyToForm?: (pointsFortsText: string, axesAmeliorationText: string, syntheseText: string) => void;
  onSaveAnalysis?: (result: AIAnalysisResult) => void;
}

export default function AIAnalysisModule({ data, onApplyToForm, onSaveAnalysis }: AIAnalysisModuleProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(data.donneesAnalyseAI || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TABLE' | 'PLAN'>('ALL');

  React.useEffect(() => {
    if (data.donneesAnalyseAI) {
      setAnalysis(data.donneesAnalyseAI);
    }
  }, [data.donneesAnalyseAI]);

  const generateAnalysis = async () => {
    setLoading(true);
    setErrorMessage(null);
    setApplied(false);
    try {
      const response = await fetch("/api/ai-evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Une erreur est survenue pendant l’analyse.");
      }
      setAnalysis(result);
      if (onSaveAnalysis) {
        onSaveAnalysis(result);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue pendant l’analyse.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!analysis || !onApplyToForm) return;
    const pfText = analysis.pointsForts.join("\n• ");
    const axesText = analysis.axesAmelioration.join("\n• ");
    const synthText = analysis.syntheseTableau?.[0]?.point3_syntheseMoyenne || "";
    onApplyToForm(
      pfText ? `• ${pfText}` : "",
      axesText ? `• ${axesText}` : "",
      synthText
    );
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const handleCopySummary = () => {
    if (!analysis) return;
    const summaryText = `--- SYNTHÈSE ANALYSE IA RH ---\nSalarié : ${data.salarieName || 'Collaborateur'} (${data.poste || 'Poste'})\nMoyenne calculée : ${analysis.moyenneGlobale?.toFixed(1) || '-'}/5\n\n1. POINTS FORTS :\n${analysis.pointsForts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n2. AXES D'AMÉLIORATION :\n${analysis.axesAmelioration.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n3. SYNTHÈSE TABLEAU :\n${analysis.syntheseTableau?.[0]?.point3_syntheseMoyenne || ''}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const criteresEvaluesCount = data.criteres?.filter((c) => !c.note.includes("Non évalué")).length || 0;
  const totalCriteres = data.criteres?.length || 24;
  const completionPercent = Math.round((criteresEvaluesCount / totalCriteres) * 100);

  const moyenne = analysis?.moyenneGlobale ?? 0;
  const getScoreBadge = (score: number) => {
    if (score >= 4.0) {
      return {
        label: "Niveau Excellent • Titularisation Favorable",
        color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        badge: "Titularisation Conseillée"
      };
    }
    if (score >= 3.0) {
      return {
        label: "Niveau Satisfaisant • Poursuite / Renouvellement",
        color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
        badge: "Progression Constatée"
      };
    }
    return {
      label: "Vigilance Managériale • Axes Critiques",
      color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      badge: "Vigilance Requise"
    };
  };

  const scoreBadge = getScoreBadge(moyenne);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#E8E8ED] bg-white text-[#1D1D1F] shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all">
      {/* Halo décoratif subtil */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl" />

      {/* EN-TÊTE ULTRA-SOIGNÉ */}
      <div className="relative p-5 border-b border-[#E8E8ED] bg-[#F5F5F7]/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            {/* Salarié concerné par l'analyse */}
            <div className="flex w-full items-center gap-3 pb-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E4002B] to-[#B80022] text-base font-bold text-white shadow-md shadow-[#E4002B]/20">
                {(data.salarieName || '?').trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold leading-tight text-[#1D1D1F]">{data.salarieName || 'Salarié'}</p>
                {data.poste && <p className="truncate text-xs text-[#6E6E73]">{data.poste}</p>}
              </div>

              {/* Note en face du nom */}
              {analysis && analysis.moyenneGlobale !== undefined && (
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <div className="flex items-baseline gap-1 rounded-xl border border-[#E8E8ED] bg-white px-3 py-1.5">
                    <Calculator className="mr-1 h-4 w-4 self-center text-[#E4002B]" />
                    <span className="text-xl font-bold leading-none text-[#1D1D1F]">{analysis.moyenneGlobale.toFixed(1)}</span>
                    <span className="text-xs text-[#86868B]">/ 5.0</span>
                  </div>
                  {onApplyToForm && (
                    <button
                      onClick={handleApply}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#1D1D1F] px-3 py-2 text-xs font-semibold text-white hover:bg-black"
                    >
                      {applied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <FileCheck2 className="h-3.5 w-3.5" />}
                      {applied ? 'Transféré !' : 'Insérer dans le formulaire'}
                    </button>
                  )}
                  <button
                    onClick={handleCopySummary}
                    title="Copier la synthèse"
                    className="cursor-pointer rounded-xl border border-[#E8E8ED] bg-white p-2 text-[#6E6E73] hover:text-[#1D1D1F]"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4002B] text-white font-semibold text-xs uppercase tracking-wider">
                <Brain className="w-3.5 h-3.5" />
                Assistant IA Décisionnel
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73] font-semibold text-xs border border-[#E8E8ED]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#E4002B]" />
                24 Critères Managériaux
              </span>
              <span className="text-xs text-[#6E6E73] flex items-center gap-1.5 font-medium ml-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Audit en temps réel
              </span>
            </div>

            <h3 className="text-xl font-semibold text-[#1D1D1F] tracking-tight flex items-center gap-2">
              Analyse IA &amp; Synthèse en 3 Points
              <Sparkles className="w-5 h-5 text-[#E4002B]" />
            </h3>

            {!analysis && (
            <p className="text-xs text-[#6E6E73] max-w-2xl leading-relaxed">
              Exploite les notes et appréciations du responsable pour dégager : <strong className="text-[#1D1D1F]">1. Points forts</strong>, <strong className="text-[#1D1D1F]">2. Axes d&apos;amélioration &amp; calcul de la moyenne</strong>, et <strong className="text-[#1D1D1F]">3. Synthèse managériale en tableau</strong>.
            </p>
            )}
          </div>

          {/* Action Button & Completion Tracker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="px-3.5 py-2 rounded-[12px] bg-white border border-[#E8E8ED] flex items-center justify-between sm:justify-start gap-3">
              <div className="text-left">
                <span className="text-[10px] uppercase font-semibold text-[#6E6E73] block tracking-wider">
                  Complétion
                </span>
                <span className="text-xs font-semibold text-[#1D1D1F]">
                  {criteresEvaluesCount} / {totalCriteres} notés
                </span>
              </div>
              <div className="w-16 bg-[#E8E8ED] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#E4002B] h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={generateAnalysis}
              disabled={loading}
              className="relative group overflow-hidden inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[12px] border border-[#D1002A] font-semibold text-xs text-white bg-linear-to-br from-[#EE1B3C] to-[#D1002A] shadow-[0_1px_2px_rgba(209,0,42,0.3),0_6px_16px_-6px_rgba(209,0,42,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all duration-200 cursor-pointer hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyse IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-rose-200 group-hover:rotate-12 transition-transform" />
                  <span>{analysis ? "Régénérer" : "Lancer l'Analyse IA"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {analysis?.source === 'modele-local' && (
          <div role="note" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Analyse indicative : l&apos;IA n&apos;a pas pu être utilisée (Ollama est arrêté ou le modèle Llama n'est pas installé).
            Seules la moyenne et le classement des notes sont calculés ; les recommandations sont des modèles génériques.
          </div>
        )}

        {/* NAVIGATION PAR ONGLETS (QUAND ANALYSE PRÊTE) */}
        {analysis && (
          <div className="flex items-stretch gap-2 mt-5 pt-4 border-t border-[#E8E8ED]">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-[#1D1D1F] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                  : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Vue d&apos;Ensemble
            </button>
            <button
              onClick={() => setActiveTab('TABLE')}
              className={`flex-1 justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'TABLE'
                  ? 'bg-[#1D1D1F] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                  : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Tableau Synthétique
            </button>
            {analysis.planAccompagnement && analysis.planAccompagnement.length > 0 && (
              <button
                onClick={() => setActiveTab('PLAN')}
                className={`flex-1 justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'PLAN'
                    ? 'bg-[#1D1D1F] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                    : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Plan d&apos;Accompagnement
              </button>
            )}
          </div>
        )}
      </div>

      {/* ERREUR EVENTUELLE */}
      {errorMessage && (
        <div className="m-6 p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 text-xs text-red-900 dark:text-red-200 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Erreur d&apos;analyse :</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ÉCRAN DE CHARGEMENT */}
      {loading && (
        <div className="p-10 text-center space-y-6">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-[20px] bg-[#E4002B] flex items-center justify-center shadow-[0_8px_24px_rgba(228,0,43,0.30)] animate-pulse">
              <Brain className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-[#1D1D1F]">
              Traitement IA des 24 critères managériaux...
            </h4>
            <p className="text-xs text-[#6E6E73]">
              Calcul de la moyenne globale, identification des forces et formalisation du tableau décisionnel.
            </p>
          </div>
        </div>
      )}

      {/* ÉCRAN VIDE D'INVITATION */}
      {!loading && !analysis && (
        <div className="p-8 sm:p-10 text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-[#E4002B] shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-sm font-semibold text-[#1D1D1F]">
              Prêt pour le diagnostic des 24 critères
            </h4>
            <p className="text-xs text-[#6E6E73] leading-relaxed">
              Cliquez sur <strong className="text-[#1D1D1F]">« Lancer l&apos;Analyse IA »</strong> pour générer automatiquement :
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            <div className="p-4 rounded-[12px] bg-white border border-[#E8E8ED] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Star className="w-3.5 h-3.5" />
                1. Points Forts
              </div>
              <p className="text-xs text-[#6E6E73]">
                Détection des réussites majeures et compétences maîtrisées.
              </p>
            </div>

            <div className="p-4 rounded-[12px] bg-white border border-[#E8E8ED] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                2. Axes &amp; Moyenne
              </div>
              <p className="text-xs text-[#6E6E73]">
                Calcul précis de la moyenne et leviers d&apos;optimisation.
              </p>
            </div>

            <div className="p-4 rounded-[12px] bg-white border border-[#E8E8ED] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                <Table2 className="w-3.5 h-3.5" />
                3. Tableau Synthèse
              </div>
              <p className="text-xs text-[#6E6E73]">
                Format | Salarié | 1 | 2 | 3 | prêt pour validation managériale.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RÉSULTATS DE L'ANALYSE */}
      {!loading && analysis && (
        <div className="p-5 space-y-5">
          {/* CONTENU SELON L'ONGLET ACTIF */}
          {(activeTab === 'ALL' || activeTab === 'TABLE') && (
            <div className="space-y-6">
              {/* 1. POINTS FORTS & 2. AXES D'AMÉLIORATION */}
              {activeTab === 'ALL' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* BLOC 1 : POINTS FORTS */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          1. Identification des Points Forts
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                        {analysis.pointsForts.length} forces majeures
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {analysis.pointsForts.map((pt, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-[12px] bg-white border border-emerald-500/20 flex items-start gap-3"
                        >
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-[#1D1D1F] font-medium leading-relaxed">
                            {pt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BLOC 2 : AXES D'AMÉLIORATION & MOYENNE */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          2. Détection des Axes &amp; Moyenne
                        </h4>
                      </div>
                      {analysis.moyenneGlobale !== undefined && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                          Moyenne : {analysis.moyenneGlobale.toFixed(1)}/5
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {analysis.axesAmelioration.map((axe, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-[12px] bg-white border border-amber-500/20 flex items-start gap-3"
                        >
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-[#1D1D1F] font-medium leading-relaxed">
                            {axe}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* BLOC 3 : SYNTHÈSE GÉNÉRALE EN TABLEAU */}
              <div style={activeTab !== 'TABLE' ? { display: 'none' } : undefined} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-[8px] bg-[#E4002B] text-white">
                      <Table2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
                        3. Synthèse Générale en Tableau
                      </h4>
                      <p className="text-xs text-[#6E6E73]">
                        Format managérial : | Salarié | 1. Points Forts | 2. Axes d&apos;Amélioration | 3. Synthèse &amp; Moyenne |
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[#6E6E73] border border-[#E8E8ED]">
                    Matrice Décisionnelle
                  </span>
                </div>

                <div className="overflow-hidden border border-[#E8E8ED] rounded-[20px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1D1D1F] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#333]">
                          <th className="py-3.5 px-4 w-[22%] border-r border-[#333]">
                            Salarié &amp; Poste
                          </th>
                          <th className="py-3.5 px-4 w-[26%] border-r border-[#333]">
                            1. Points Forts
                          </th>
                          <th className="py-3.5 px-4 w-[26%] border-r border-[#333]">
                            2. Axes d&apos;Amélioration
                          </th>
                          <th className="py-3.5 px-4 w-[26%] bg-[#E4002B]/25 text-white font-semibold">
                            3. Synthèse &amp; Moyenne
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5F5F7]">
                        {(analysis.syntheseTableau && analysis.syntheseTableau.length > 0
                          ? analysis.syntheseTableau
                          : [
                              {
                                salarie: data.salarieName || "Collaborateur",
                                point1_pointsForts: analysis.pointsForts[0] || "Compétences techniques solides et rigueur opérationnelle.",
                                point2_axesAmelioration: analysis.axesAmelioration[0] || "Autonomie sur les tâches complexes et prise d'initiative.",
                                point3_syntheseMoyenne: `Moyenne : ${analysis.moyenneGlobale ? analysis.moyenneGlobale.toFixed(1) : "3.5"}/5 — Progression régulière avec potentiel confirmé.`
                              }
                            ]
                        ).map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#F5F5F7] transition-all duration-200">
                            {/* SALARIÉ */}
                            <td className="py-4 px-4 font-semibold text-[#1D1D1F] border-r border-[#F5F5F7] align-top">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-[10px] bg-[#E4002B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {row.salarie[0]?.toUpperCase() || "S"}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs text-[#1D1D1F] truncate">{row.salarie}</p>
                                  {data.poste && (
                                    <p className="text-xs text-[#6E6E73] truncate">{data.poste}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 1. POINTS FORTS */}
                            <td className="py-4 px-4 text-[#1D1D1F] border-r border-[#F5F5F7] leading-relaxed align-top">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="text-xs font-medium">{row.point1_pointsForts}</span>
                              </div>
                            </td>

                            {/* 2. AXES D'AMÉLIORATION */}
                            <td className="py-4 px-4 text-[#1D1D1F] border-r border-[#F5F5F7] leading-relaxed align-top">
                              <div className="flex items-start gap-2">
                                <TrendingUp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span className="text-xs font-medium">{row.point2_axesAmelioration}</span>
                              </div>
                            </td>

                            {/* 3. SYNTHÈSE & MOYENNE */}
                            <td className="py-4 px-4 text-[#1D1D1F] bg-[#E4002B]/5 leading-relaxed align-top">
                              <div className="space-y-1.5">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-[#E4002B] text-white font-semibold text-xs">
                                  {analysis.moyenneGlobale !== undefined ? `Moyenne : ${analysis.moyenneGlobale.toFixed(1)}/5` : "Synthèse"}
                                </span>
                                <p className="text-xs text-[#1D1D1F] font-medium leading-relaxed">
                                  {row.point3_syntheseMoyenne}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PLAN D'ACCOMPAGNEMENT */}
          {activeTab === 'PLAN' && analysis.planAccompagnement && analysis.planAccompagnement.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[8px] bg-[#1D1D1F] text-white">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
                    Plan d&apos;Accompagnement Recommandé par l&apos;IA
                  </h4>
                  <p className="text-xs text-[#6E6E73]">
                    Mesures opérationnelles pour accompagner la titularisation ou consolider les compétences
                  </p>
                </div>
              </div>

              <div className="overflow-hidden border border-[#E8E8ED] rounded-[16px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F5F7] text-[#6E6E73] border-b border-[#E8E8ED] uppercase font-semibold text-xs">
                    <tr>
                      <th className="py-3 px-3.5">Action d&apos;accompagnement</th>
                      <th className="py-3 px-3.5">Objectif visé</th>
                      <th className="py-3 px-3.5">Moyens / Formations</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Échéance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F7]">
                    {analysis.planAccompagnement.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F5F7] transition-all duration-200">
                        <td className="py-3 px-3.5 font-semibold text-[#1D1D1F]">{item.action}</td>
                        <td className="py-3 px-3.5 text-[#6E6E73] font-medium">{item.objectif}</td>
                        <td className="py-3 px-3.5 text-[#6E6E73] font-medium">{item.moyens}</td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-[#1D1D1F] font-semibold">{item.echeance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}