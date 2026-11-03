"use client";

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Mail, 
  Clock, 
  Calendar, 
  ExternalLink, 
  Search, 
  Zap, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Filter,
  RefreshCw,
  User,
  Inbox,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function EmailsScreen() {
  const { emails = [], openEmailModal, refreshDashboardData } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterBatch, setFilterBatch] = useState<string>('ALL');

  const matchesTypeFilter = (email: (typeof emails)[number]) => {
    const type = email.typeEmail.toUpperCase();
    const subject = email.objet.toUpperCase();
    const isAlert =
      type.includes('RETARD') ||
      type.includes('ALERTE') ||
      /\b(URGENT|RETARD|ALERTE)\b/.test(subject);

    if (filterType === '3M') {
      return type.includes('3M') || /3\s*(M|MOIS)\b/.test(subject);
    }
    if (filterType === '6M') {
      return type.includes('6M') || /6\s*(M|MOIS)\b/.test(subject);
    }
    if (filterType === 'ALERTS') {
      return isAlert;
    }
    return filterType === 'ALL' || email.typeEmail === filterType;
  };

  const filtered = emails.filter((email) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      email.objet.toLowerCase().includes(query) ||
      email.salarieNom.toLowerCase().includes(query) ||
      email.destinataireNom.toLowerCase().includes(query);
    const matchesBatch =
      filterBatch === 'ALL' ||
      (filterBatch === 'CRON' ? email.batchCron : !email.batchCron);

    return matchesSearch && matchesTypeFilter(email) && matchesBatch;
  });

  // Métriques d'en-tête dynamiques
  const totalEmails = emails.length;
  const cronEmails = emails.filter(e => e.batchCron).length;
  const alertEmails = emails.filter(e => e.typeEmail.includes('RETARD') || e.typeEmail.includes('ALERTE')).length;
  const successEmails = emails.filter(e => e.statut === 'DELIVRE' || e.statut === 'OUVERT').length;

  return (
    <div className="space-y-6 font-sans">
      {/* En-tête principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Journal des Emails &amp; Notifications
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suivi temps réel des communications automatiques et des relances manuelles (/api/dashboard/audit-emails).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshDashboardData && refreshDashboardData()}
            className="text-xs cursor-pointer gap-1.5 border-[#E8E8ED] hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser depuis la BD</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setFilterType('ALL');
              setFilterBatch('ALL');
            }}
            className="text-xs cursor-pointer gap-1.5 border-[#E8E8ED] hover:bg-secondary/60"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Réinitialiser filtres</span>
          </Button>
        </div>
      </div>

      {/* Cartes KPI Unifiées */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {/* KPI 1 : Total Envoyés */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#FFF0F3] border border-[#E4002B]/10 flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                  <Send className="w-5 h-5 text-[#E4002B] group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
                  Total Envoyés
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tracking-tight leading-none text-[#1D1D1F]">
                {totalEmails}
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mb-1">
                communications
              </span>
            </div>
            <div className="mt-5">
              <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <Mail className="w-3 h-3 mr-1 inline-block" />
                Journal global
              </Badge>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
        </Card>

        {/* KPI 2 : Batch Cron */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#FFF0F3] border border-[#E4002B]/10 flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                  <Zap className="w-5 h-5 text-[#E4002B] group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
                  Automatique
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tracking-tight leading-none text-[#1D1D1F]">
                {cronEmails}
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mb-1">
                automatiques
              </span>
            </div>
            <div className="mt-5">
              <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <Zap className="w-3 h-3 mr-1 inline-block" />
                Quotidien
              </Badge>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
        </Card>

      

        {/* KPI 4 : Délivrés / Ouverts */}
        <Card className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#E4002B]/20">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-[#FFF0F3] to-transparent rotate-12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#FFF0F3] border border-[#E4002B]/10 flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                  <CheckCircle2 className="w-5 h-5 text-[#E4002B] group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6E6E73]">
                  Délivrés / Ouverts
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#E4002B] transition-colors duration-200">
                <ChevronRight className="w-4 h-4 text-[#E4002B] group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tracking-tight leading-none text-[#1D1D1F]">
                {successEmails}
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mb-1">
                reçus (100%)
              </span>
            </div>
            <div className="mt-5">
              <Badge className="bg-[#FFF0F3] text-[#E4002B] border border-[#E4002B]/15 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3 mr-1 inline-block" />
                Délivré
              </Badge>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-16 h-1 bg-gradient-to-r from-[#E4002B] to-[#1D1D1F] rounded-tl-full" />
        </Card>
      </div>

      {/* Barre de Recherche et Filtres */}
      <Card className="p-3.5 border-[#E8E8ED]/80 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Rechercher par objet, nom du salarié, destinataire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-10 text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] focus:outline-none focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white transition-all duration-200 text-[#1D1D1F] placeholder:text-[#6E6E73]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0 px-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrer :</span>
            </div>

            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="w-full md:w-auto text-xs bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] px-3 py-2 h-10 text-[#1D1D1F] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none cursor-pointer font-medium transition-all duration-200"
            >
              <option value="ALL">Tous les types d&apos;emails</option>
              <option value="3M">3 mois</option>
              <option value="6M">6 mois</option>
              <option value="ALERTS">Alertes</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tableau interactif */}
      <Card className="overflow-hidden border-[#E8E8ED]/80 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8E8ED] text-[#6E6E73] font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Objet &amp; Détails</th>
                <th className="py-3.5 px-4">Collaborateur</th>
                <th className="py-3.5 px-4">Destinataire</th>
                <th className="py-3.5 px-4">Date / Horaire</th>
                <th className="py-3.5 px-4">Déclencheur</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
                        <Inbox className="w-6 h-6 strokeWidth={1.5}" />
                      </div>
                      <p className="text-xs font-medium">Aucun email ne correspond à vos critères de recherche.</p>
                      <button 
                        onClick={() => { setSearchTerm(''); setFilterType('ALL'); setFilterBatch('ALL'); }}
                        className="text-xs text-red-600 underline font-medium hover:text-red-700 cursor-pointer"
                      >
                        Effacer les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((mail) => (
                  <tr key={mail.id} className="hover:bg-[#F5F5F7] transition-all duration-200 group">
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-secondary/70 flex items-center justify-center text-muted-foreground shrink-0 group-hover:bg-red-100/60 group-hover:text-red-600 transition-colors">
                          <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </div>
                        <span className="font-semibold text-foreground text-xs tracking-tight line-clamp-1 max-w-xs group-hover:text-red-700 transition-colors">
                          {mail.objet}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.75} />
                        <span className="font-semibold text-foreground">{mail.salarieNom}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <div>
                        <span className="font-medium text-foreground block">{mail.destinataireNom}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{mail.destinataire}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-middle font-mono text-[11px]">
                      <span className="flex items-center gap-1 text-foreground">
                        <Calendar className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
                        {mail.dateEnvoi}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground text-[10px] mt-0.5">
                        <Clock className="w-3 h-3" strokeWidth={1.75} />
                        {mail.heureEnvoi}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      {mail.batchCron ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200/60">
                          <Zap className="w-3 h-3 text-red-600 fill-red-600" strokeWidth={1.5} />
                          Automatique
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F5F5F7] text-muted-foreground border border-[#E8E8ED]">
                          Manuel
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <Badge variant="appleGreen" className="text-[10px] font-mono">
                        {mail.statut}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 align-middle text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openEmailModal(mail)} 
                        className="cursor-pointer ml-auto flex items-center gap-1 h-7 text-xs border-[#E8E8ED]/80 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors shadow-2xs"
                      >
                        <span>Aperçu</span>
                        <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}