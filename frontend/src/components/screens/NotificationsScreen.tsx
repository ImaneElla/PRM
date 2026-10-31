"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp, ScreenId } from '../../context/AppContext';
import { Bell, Clock, Cog, CheckCircle2, ChevronRight, CheckCheck, UserCheck, ShieldAlert, X } from 'lucide-react';
import type { NotificationItem } from '../../types';

const TYPE_STYLES: Record<
  string,
  { label: string; icon: React.ElementType; tile: string }
> = {
  RETARD: {
    label: 'Retard',
    icon: Clock,
    tile: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
  },
  CRON_SYSTEME: {
    label: 'Système',
    icon: Cog,
    tile: 'bg-[#F5F5F7] text-[#6E6E73]',
  },
  EVALUATION: {
    label: 'Évaluation',
    icon: UserCheck,
    tile: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  },
  VALIDATION: {
    label: 'Validation RH',
    icon: CheckCircle2,
    tile: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
};

const DEFAULT_STYLE = {
  label: 'Alerte',
  icon: ShieldAlert,
  tile: 'bg-[#F5F5F7] text-[#6E6E73]',
};

// Les anciennes notifications contiennent la valeur brute (PROLONGATION_ESSAI) : on l'affiche lisiblement
const LIBELLES_CODES: Record<string, string> = {
  CONFIRMATION_CDI: 'Confirmation CDI',
  PROLONGATION_ESSAI: 'Prolongation essai',
  RUPTURE_CONTRAT: 'Rupture contrat',
};
const lisible = (texte: string) =>
  texte.replace(/\b[A-Z]{2,}(?:_[A-Z]{2,})+\b/g, (code) => {
    if (LIBELLES_CODES[code]) return LIBELLES_CODES[code];
    const mots = code.toLowerCase().replace(/_/g, ' ');
    return mots.charAt(0).toUpperCase() + mots.slice(1);
  });

export default function NotificationsScreen() {
  const {
    notifications,
    navigateTo,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    currentRole
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  // Notification ouverte dans la fenêtre de détails
  const [selection, setSelection] = useState<NotificationItem | null>(null);
  useEffect(() => {
    if (!selection) return;
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && setSelection(null);
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [selection]);

  // Le serveur ne renvoie que les notifications de l'utilisateur connecté (RH partagées pour un admin,
  // les siennes pour un responsable) : pas de filtre supplémentaire par rôle
  const roleNotifications = notifications;

  const visible = filter === 'unread'
    ? roleNotifications.filter(n => !n.estLue)
    : roleNotifications;

  const unreadCount = roleNotifications.filter((n) => !n.estLue).length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 font-sans antialiased pb-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl md:text-[28px] font-semibold tracking-tight text-[#1D1D1F]">
            Centre de Notifications & Alertes
          </h2>
          <p className="mt-1 text-xs text-[#6E6E73]">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes vos notifications sont à jour.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs Filter */}
          <div className="flex items-center rounded-[12px] border border-[#E8E8ED] bg-[#F5F5F7] p-0.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                filter === 'all'
                  ? 'bg-[#1D1D1F] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] font-semibold'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              Toutes ({roleNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                filter === 'unread'
                  ? 'bg-[#E4002B] text-white shadow-[0_2px_8px_rgba(228,0,43,0.20)] font-semibold'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>

          {/* Toujours visible : grisé quand tout est déjà lu */}
          {(
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#E8E8ED] bg-[#F5F5F7] px-3 py-1.5 text-xs font-medium text-[#E4002B] transition-all duration-200 hover:bg-[#FFF0F3] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#F5F5F7]"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout marquer comme lu</span>
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-[20px] border border-[#E8E8ED] bg-white px-6 py-16 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#F5F5F7] text-[#6E6E73]">
            <Bell className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-semibold text-[#1D1D1F]">Aucune notification</p>
          <p className="mt-1 text-xs text-[#6E6E73]">
            {filter === 'unread'
              ? 'Toutes les notifications ont été lues.'
              : 'Les nouvelles alertes, créations de salariés et validations apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[20px] border border-[#E8E8ED] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] divide-y divide-[#F5F5F7]">
          {visible.map((n) => {
            const style = TYPE_STYLES[n.type] ?? DEFAULT_STYLE;
            const Icon = style.icon;
            const clickable = true;

            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markNotificationAsRead(n.id);
                    setSelection({ ...n, estLue: true });
                  }}
                  className={`group flex w-full items-start gap-3.5 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                    !n.estLue
                      ? 'bg-[#FFF8F9] hover:bg-[#FFF0F3]'
                      : 'hover:bg-[#F5F5F7]'
                  }`}
                >
                  {/* Icon tile */}
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.tile}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>

                  {/* Content */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={`truncate text-xs md:text-sm leading-snug text-[#1D1D1F] ${
                          n.estLue ? 'font-medium' : 'font-bold'
                        }`}
                      >
                        {lisible(n.titre)}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono text-[#6E6E73] tabular-nums">
                        {n.dateCreation} {n.heureCreation}
                      </span>
                    </span>

                    <span className="mt-1 block text-xs leading-relaxed text-[#6E6E73] line-clamp-2">
                      {lisible(n.message)}
                    </span>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73]">
                        {style.label}
                      </span>
                      {n.priorite === 'HAUTE' || n.priorite === 'URGENTE' ? (
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                          • {n.priorite}
                        </span>
                      ) : null}
                    </div>
                  </span>

                  {/* Trailing: unread dot + chevron */}
                  <span className="flex h-9 shrink-0 items-center gap-2">
                    {!n.estLue && (
                      <span
                        aria-label="Non lue"
                        className="h-2 w-2 rounded-full bg-[#E4002B] ring-4 ring-[#E4002B]/15"
                      />
                    )}
                    {clickable && (
                      <ChevronRight
                        className="h-4 w-4 text-[#6E6E73] transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2}
                      />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Fenêtre de détails d'une notification */}
      {selection && typeof document !== 'undefined' && createPortal(
        (() => {
          const style = TYPE_STYLES[selection.type] ?? DEFAULT_STYLE;
          const Icon = style.icon;
          const urgente = selection.priorite === 'HAUTE' || selection.priorite === 'URGENTE';
          const destinataire = selection.cibleRole === 'RESPONSABLE' ? 'Responsable concerné'
            : selection.cibleRole === 'TOUS' ? 'Tous les utilisateurs'
            : 'Équipe RH';
          return (
            <div
              className="fixed inset-0 z-[9999] flex overflow-y-auto bg-zinc-900/40 p-4 backdrop-blur-xs"
              onClick={() => setSelection(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Détails de la notification"
                className="m-auto w-full max-w-lg rounded-[20px] border border-[#E8E8ED] bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.tile}`}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-snug text-[#1D1D1F]">{selection.titre}</h3>
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#6E6E73]">
                        {selection.dateCreation} {selection.heureCreation}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelection(null)}
                    aria-label="Fermer"
                    className="cursor-pointer rounded-lg p-1.5 text-[#6E6E73] hover:bg-[#F5F5F7]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#1D1D1F]">{lisible(selection.message)}</p>

                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E8E8ED] pt-4 text-xs">
                  <div>
                    <dt className="text-[#6E6E73]">Type</dt>
                    <dd className="mt-0.5 font-medium text-[#1D1D1F]">{style.label}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6E6E73]">Priorité</dt>
                    <dd className={`mt-0.5 font-medium ${urgente ? 'text-red-600' : 'text-[#1D1D1F]'}`}>
                      {selection.priorite.charAt(0) + selection.priorite.slice(1).toLowerCase()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6E6E73]">Destinataire</dt>
                    <dd className="mt-0.5 font-medium text-[#1D1D1F]">{destinataire}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6E6E73]">État</dt>
                    <dd className="mt-0.5 font-medium text-[#1D1D1F]">Lue</dd>
                  </div>
                </dl>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelection(null)}
                    className="cursor-pointer rounded-[10px] border border-[#E8E8ED] bg-white px-4 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
                  >
                    Fermer
                  </button>
                  {selection.lienEcran && (
                    <button
                      type="button"
                      onClick={() => {
                        const n = selection;
                        setSelection(null);
                        navigateTo(n.lienEcran as ScreenId, { salarieId: n.targetId, periodeId: n.targetId });
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#E4002B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#CC0027]"
                    >
                      Ouvrir le dossier
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}