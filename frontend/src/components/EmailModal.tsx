"use client";

import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Mail, Clock, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function EmailModal() {
  const { isEmailModalOpen, selectedEmail, closeEmailModal } = useApp();

  if (!isEmailModalOpen || !selectedEmail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200 font-sans print:hidden">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-[#E8E8ED] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple SF Modal Header */}
        <div className="bg-white text-foreground p-5 flex items-center justify-between border-b border-[#E8E8ED]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
              <Mail className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {selectedEmail.typeEmail.replace(/_/g, ' ')}
                </span>
                {selectedEmail.batchCron && (
                  <Badge variant="appleRed" className="text-[10px] font-mono px-2 py-0">
                    Automatique
                  </Badge>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate max-w-md tracking-tight">
                {selectedEmail.objet}
              </h3>
            </div>
          </div>
          <button 
            onClick={closeEmailModal}
            className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[#F5F5F7] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Metadata info */}
        <div className="bg-secondary/40 border-b border-[#E8E8ED] px-6 py-3.5 text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <span className="text-muted-foreground/80 block font-medium text-[11px]">Destinataire</span>
            <span className="font-semibold text-foreground truncate block">{selectedEmail.destinataireNom}</span>
            <span className="text-muted-foreground text-[11px] block">{selectedEmail.destinataire}</span>
          </div>
          <div>
            <span className="text-muted-foreground/80 block font-medium text-[11px]">Collaborateur</span>
            <span className="font-semibold text-foreground block">{selectedEmail.salarieNom}</span>
          </div>
          <div>
            <span className="text-muted-foreground/80 block font-medium text-[11px]">Horodatage</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} /> {selectedEmail.dateEnvoi}
            </span>
            <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" strokeWidth={1.75} /> {selectedEmail.heureEnvoi}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground/80 block font-medium text-[11px]">Statut</span>
            <Badge variant="appleGreen" className="inline-flex items-center gap-1 text-[11px] mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} /> {selectedEmail.statut}
            </Badge>
          </div>
        </div>

        {/* Email body preview */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="border border-[#E8E8ED] rounded-2xl p-6 bg-white shadow-2xs">
            {/* Corporate Header */}
            <div className="border-b border-[#E8E8ED]/60 pb-4 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image 
                  src="/logo-groupe-premium.png" 
                  alt="Groupe Premium" 
                  width={112} 
                  height={30} style={{ width: "auto", height: "auto" }}
                  className="object-contain"
                />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono font-medium text-muted-foreground block">SYSTÈME RH AUTOMATISÉ</span>
                <span className="text-[11px] text-primary font-semibold">Direction des Ressources Humaines</span>
              </div>
            </div>

            {/* Email title */}
            <h4 className="text-sm md:text-base font-semibold text-foreground mb-4 pb-2 border-b border-[#E8E8ED]/40 tracking-tight">
              {selectedEmail.objet}
            </h4>

            {/* Preformatted text with line breaks */}
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed whitespace-pre-line mb-6 font-sans">
              {selectedEmail.contenuCorps}
            </div>

            {/* Simulated Action CTA button */}
            <div className="my-6 p-4 rounded-xl bg-secondary/60 border border-[#E8E8ED] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Action requise sur le portail RH</p>
                <p className="text-[11px] text-muted-foreground">Accès sécurisé SSO Groupe Premium</p>
              </div>
              <Button 
                onClick={closeEmailModal}
                size="sm"
                className="flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Accéder au portail</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Button>
            </div>

            {/* Corporate Email Footer */}
            <div className="mt-8 pt-4 border-t border-[#E8E8ED]/60 text-center text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground/70">GROUPE PREMIUM • Direction des Ressources Humaines</p>
              <p>Ce message a été généré automatiquement par le gestionnaire des périodes d&apos;essai Groupe Premium.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Conformément aux dispositions du Code du Travail et à la convention collective applicable.</p>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="bg-secondary/40 px-6 py-3 border-t border-[#E8E8ED] flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            ID Log Email : <code className="font-mono text-foreground font-semibold">#EML-{selectedEmail.id}</code>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={closeEmailModal}
            className="cursor-pointer"
          >
            Fermer l&apos;aperçu
          </Button>
        </div>
      </div>
    </div>
  );
}
