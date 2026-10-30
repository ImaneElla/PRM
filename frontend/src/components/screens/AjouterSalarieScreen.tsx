"use client";

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  UserPlus, 
  Mail, 
  CheckCircle2, 
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SOCIETES } from '@/lib/societe';

export default function AjouterSalarieScreen() {
  const { responsables, addSalarie, navigateTo } = useApp();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('06 ');
  const [poste, setPoste] = useState('');
  const [responsableId, setResponsableId] = useState<number>(responsables[0]?.id || 1);
  const [dateEmbauche, setDateEmbauche] = useState<string>('2026-10-01');
  const [dureeInitialeMois, setDureeInitialeMois] = useState<number>(4);
  const [societe, setSociete] = useState<string>('GRP');

  const handleNameChange = (fn: string, ln: string) => {
    setFirstName(fn);
    setLastName(ln);
    if (fn.trim() && ln.trim()) {
      const cleanFn = fn.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
      const cleanLn = ln.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
      setEmail(`${cleanFn}.${cleanLn}@premium.africa`);
    }
  };

 const formatDateFr = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`; 
  } catch {
    return '—';
  }
};

const addMonthsFormatted = (dateStr: string, months: number): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + months);
    return formatDateFr(d.toISOString());
  } catch {
    return '';
  }
};

  const calculated3M = addMonthsFormatted(dateEmbauche, 3);
  const calculated6M = addMonthsFormatted(dateEmbauche, 6);
  const calculatedFin = addMonthsFormatted(dateEmbauche, dureeInitialeMois);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !poste || !dateEmbauche) {
      alert("Veuillez renseigner tous les champs obligatoires.");
      return;
    }

    addSalarie({
      firstName,
      lastName,
      email,
      phone,
      poste,
      dateEmbauche,
      dureeInitialeMois,
      societe,
      responsableId
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
            Créer un Salarié & Automatiser le Suivi d&apos;Essai
          </h2>
          <p className="text-xs text-muted-foreground">
            L&apos;enregistrement calcule automatiquement la Période 1 (3 mois) et programme les envois à 09:00.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateTo('salaries')}
          className="cursor-pointer"
        >
          Annuler
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Identité */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8ED]/70">
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-2xs">
              1
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Identité du Collaborateur
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Prénom <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Alexandre"
                value={firstName}
                onChange={(e) => handleNameChange(e.target.value, lastName)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white focus:outline-none transition-all text-foreground"
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
                value={lastName}
                onChange={(e) => handleNameChange(firstName, e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white focus:outline-none transition-all text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Email Professionnel <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
                <input
                  type="email"
                  required
                  placeholder="prenom.nom@premium.africa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white focus:outline-none font-mono text-foreground"
                />
              </div>
            </div>
         
         
          </div>
        </Card>

        {/* Step 2: Affectation Métier */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8ED]/70">
            <div className="w-7 h-7 rounded-xl bg-[#F5F5F7] text-foreground flex items-center justify-center font-bold text-xs shadow-2xs">
              2
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Affectation Métier & Manager Référent
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Intitulé du Poste <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Conseiller Patrimonial Senior"
                value={poste}
                onChange={(e) => setPoste(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white focus:outline-none text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Société / Entité <span className="text-primary">*</span>
              </label>
              <select
                required
                value={societe}
                onChange={(e) => setSociete(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none text-foreground cursor-pointer"
              >
                {SOCIETES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Le matricule sera attribué automatiquement par le serveur au format{' '}
                <strong className="font-mono text-foreground">{societe} + 6 chiffres</strong>.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Responsable Évaluateur (N+1) <span className="text-primary">*</span>
              </label>
              <select
                value={responsableId}
                onChange={(e) => setResponsableId(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none text-foreground cursor-pointer"
              >
                {responsables.map(r => (
                  <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.poste})</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Step 3: Période d'essai & Calcul Automatique */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8ED]/70">
            <div className="w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-2xs">
              3
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Paramétrage de la Période d&apos;Essai & Calcul des Échéances
              </h3>
              <p className="text-[11px] text-muted-foreground">Convention collective & accords Groupe Premium</p>
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
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none font-mono text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Durée Initiale Contractuelle
              </label>
              <select
                value={dureeInitialeMois}
                onChange={(e) => setDureeInitialeMois(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none text-foreground cursor-pointer"
              >
                <option value={3}>3 mois</option>
                <option value={6}>6 mois</option>
              </select>
            </div>
          </div>

          {/* Apple SF Style Milestone Calculation Card */}
          <div className="mt-4 p-4 rounded-2xl bg-[#F5F5F7] border border-[#E8E8ED] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Zap className="w-4 h-4" strokeWidth={1.75} />
                <span>Calculateur Automatique de Périodes Groupe Premium</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#E8E8ED] shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Période 1</span>
                  <Badge variant="appleBlue" className="text-[10px]">3 Mois</Badge>
                </div>
                <p className="font-bold text-foreground text-sm font-mono">{calculated3M || '—'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mail auto envoyé à <strong className="text-foreground">09:00:00</strong> (J-21)
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E8ED] shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Période 2 (si validée)</span>
                  <Badge variant="applePurple" className="text-[10px]">6 Mois</Badge>
                </div>
                <p className="font-bold text-foreground text-sm font-mono">{calculated6M || '—'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Générée automatiquement sur validation P1
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E8ED] shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Terme Initial</span>
                  <Badge variant="appleGreen" className="text-[10px]">Arrêt de contrat</Badge>
                </div>
                <p className="font-bold text-foreground text-sm font-mono">{calculatedFin || '—'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Durée contractuelle : {dureeInitialeMois} mois
                </p>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5 border-t border-[#E8E8ED]/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-apple-green" strokeWidth={2} />
              <span>
                Suivi automatique de relance : 3 emails envoyés à J-21 (EN_COURS), J-14 (EN_RELANCE) et J-7 (EN_RETARD).
              </span>
            </div>
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigateTo('salaries')}
            className="cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            className="flex items-center gap-2 shadow-xs cursor-pointer px-6"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.75} />
            <span>Enregistrer le salarié et programmer le suivi</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
