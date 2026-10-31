/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { useApp, ScreenId } from '../context/AppContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  AlertTriangle,
  Bell,
  Briefcase,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  PanelLeft,
  Settings,
  Sparkles,
  Box,
  Mail,
} from 'lucide-react';
import Image from 'next/image';


function SfIcon({ id, active }: { id: string; active?: boolean }) {
  const shapes: Record<string, React.ReactNode> = {
    'dashboard': (<><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>),
    'salaries': (<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3.1 2.4-5 5.5-5s5.5 1.9 5.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16.6 14.2c2.5 0 4.4 1.6 4.4 4.3" /></>),
    'gestion-responsable': (<><rect x="3" y="7.5" width="18" height="12" rx="3" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18" /></>),
    'periodes': (<><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" /></>),
    'retards': (<><path d="M10.3 4.8a2 2 0 0 1 3.4 0l7.2 12.5a2 2 0 0 1-1.7 3H4.8a2 2 0 0 1-1.7-3z" /><path d="M12 10v4" /><circle cx="12" cy="17" r=".5" /></>),
    'analyse-ia': (<><path d="M10 4c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5C7.7 9.9 9.4 8.2 10 4z" /><path d="M18 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" /></>),
    'emails': (<><rect x="3" y="5.5" width="18" height="13" rx="3.5" /><path d="M4 8.5l8 5.2 8-5.2" /></>),
    'archive': (<><rect x="3" y="4.5" width="18" height="4.5" rx="1.8" /><path d="M5 9v8.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V9M10 13h4" /></>),
    'notifications': (<><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>),
    'parametres': (<><path d="M4 8h8M18 8h2M4 16h2M12 16h8" /><circle cx="15" cy="8" r="2.2" /><circle cx="9" cy="16" r="2.2" /></>),
  };
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.22 : 0} stroke="currentColor" strokeWidth={active ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes[id] ?? shapes['dashboard']}
    </svg>
  );
}

export default function Sidebar() {
  const {
    currentScreen,
    navigateTo,
    periodes,
    salaries,
    notifications,
    emails = [],
    currentRole,
    isSidebarCollapsed: sidebarReduite,
    isMobileMenuOpen,
    setMobileMenuOpen,
    toggleSidebar
  } = useApp();

  // Téléphone / tablette : le menu est un tiroir plein format, jamais réduit
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const requete = window.matchMedia('(max-width: 1023px)');
    const maj = () => setMobile(requete.matches);
    maj();
    requete.addEventListener('change', maj);
    return () => requete.removeEventListener('change', maj);
  }, []);
  const isSidebarCollapsed = sidebarReduite && !mobile;

  const [isAdminOpen] = useState(true);
  const [isSystemOpen, setIsSystemOpen] = useState(true);

  const isRH = currentRole === 'ADMIN_RH';
  const retardsCount = periodes.filter(p => p.statut === 'EN_RETARD' || p.statut === 'EN_ATTENTE_DECISION_RH').length;
  const unreadNotifsCount = notifications.filter(n => !n.estLue).length;
  const enCoursCount = salaries.filter(s => s.statutEssai === 'EN_COURS' || s.statutEssai === 'RENOUVELEE').length;
  const emailsCount = emails.length;

  const generalItems = [
    { id: 'dashboard', label: isRH ? 'Tableau de Bord RH' : 'Tableau de Bord', icon: LayoutDashboard, roleVisibility: ['ADMIN_RH', 'RESPONSABLE'] },
    { id: 'periodes', label: isRH ? 'Périodes d\'évaluation' : 'Évaluations à réaliser', icon: CalendarCheck, roleVisibility: ['ADMIN_RH', 'RESPONSABLE'] },
    { id: 'gestion-responsable', label: 'Gestion des responsables', icon: Briefcase, roleVisibility: ['ADMIN_RH'] },
    { id: 'salaries', label: isRH ? 'Gestion des salariés' : 'Mes salariés affectés', icon: Users, badge: isRH ? enCoursCount : salaries.filter(s => s.actif !== false).length, roleVisibility: ['ADMIN_RH', 'RESPONSABLE'] },
    { id: 'retards', label: isRH ? 'Suivi des retards' : 'Retards équipe', icon: AlertTriangle, badge: retardsCount > 0 ? `${retardsCount}` : undefined, badgeVariant: 'destructive', roleVisibility: ['ADMIN_RH', 'RESPONSABLE'] },
    { id: 'analyse-ia', label: 'Analyse IA', icon: Sparkles, roleVisibility: ['ADMIN_RH'] },
  ] as any;

  const systemItems = [
    { id: 'gestion-admins', label: 'Administrateurs', icon: ShieldCheck, roleVisibility: ['ADMIN_RH'] },
    { id: 'emails', label: isRH ? 'Audit des E-mails' : 'Historique des E-mails', icon: Mail, badge: emailsCount > 0 ? emailsCount : undefined, roleVisibility: ['ADMIN_RH'] },
    { id: 'archive', label: 'Archive', icon: Box, roleVisibility: ['ADMIN_RH'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined, badgeVariant: 'destructive', roleVisibility: ['ADMIN_RH', 'RESPONSABLE'] },
    { id: 'parametres', label: 'Paramètres', icon: Settings, roleVisibility: ['ADMIN_RH', 'RESPONSABLE'] },
  ] as any;

  const adminItems: { id: ScreenId; label: string; icon: typeof UserPlus }[] = [
  ];

  const renderItem = (item: any) => {
    const isActive = currentScreen === item.id;
    return (
      <button
        key={item.id}
        onClick={() => navigateTo(item.id)}
        title={isSidebarCollapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-[12px] text-[14px] font-medium transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group cursor-pointer relative overflow-hidden active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4002B]/40
          ${isActive
            ? 'bg-[#E4002B]/[0.09] dark:bg-[#ff453a]/[0.16] text-[#C4001F] dark:text-[#ff6961] font-semibold'
            : 'text-[#1D1D1F] dark:text-white/80 hover:bg-black/[0.05] dark:hover:bg-white/10'
          }`}
      >
        {isActive && (
          <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-[#E4002B]" />
        )}

        <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'} relative z-10 min-w-0`}>
          <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors relative shrink-0
            ${isActive ? 'text-[#E4002B] dark:text-[#ff6961]' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-[#E4002B]'}`}>
            <SfIcon id={item.id} active={isActive} />
            {isSidebarCollapsed && item.badge && (
              <span suppressHydrationWarning className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#E4002B] text-white text-[9px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-black">{typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}</span>
            )}
          </div>
          {!isSidebarCollapsed && <span className="tracking-[-0.01em] truncate">{item.label}</span>}
        </div>

        {!isSidebarCollapsed && (
          <div className="flex items-center gap-1.5 relative z-10">
            {item.badge !== undefined && (
              <span suppressHydrationWarning className={`text-[11px] min-w-5 text-center px-1.5 py-px rounded-full font-semibold
                ${isActive
                  ? 'bg-[#E4002B]/15 text-[#C4001F] dark:text-[#ff6961]'
                  : item.badgeVariant === 'destructive'
                    ? 'bg-[#E4002B] text-white'
                    : 'bg-black/[0.06] dark:bg-white/10 text-[#6E6E73] dark:text-zinc-300'
                }`}>
                {item.badge}
              </span>
            )}
            {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#E4002B]/50" strokeWidth={2.5} />}
          </div>
        )}
      </button>
    );
  };

  return (
    <>
    {isMobileMenuOpen && (
      <div className="fixed inset-0 z-40 bg-white/70 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-hidden />
    )}
    <aside className={`${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} w-[85vw] max-w-72 fixed inset-y-0 left-0 z-50 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto max-lg:bg-white max-lg:dark:bg-[#1c1c1e] bg-white/70 backdrop-blur-2xl backdrop-saturate-[180%] text-black border-r border-black/[0.06] flex flex-col shrink-0 h-screen max-lg:h-dvh select-none font-sans [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display',Inter,sans-serif] overflow-hidden transition-all duration-300 print:hidden`}>

      {/* Brand Header */}
      <div className={`px-4 h-16 flex items-center shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {isSidebarCollapsed ? (
          <div onClick={() => navigateTo('dashboard')} className="w-11 h-11 rounded-[14px] bg-white/80 dark:bg-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-center p-1.5 cursor-pointer hover:scale-105 transition-transform duration-200">
            <Image
              src="/logo-groupe-premium.png"
              alt="Logo"
              width={205}
              height={55}
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div onClick={() => navigateTo('dashboard')} className="p-1 flex items-center cursor-pointer ml-10">
              <Image src="/logo-groupe-premium.png" alt="Groupe Premium" width={132} height={35} style={{ width: "auto", height: "auto" }} className="object-contain" priority />
            </div>
            <button onClick={mobile ? () => setMobileMenuOpen(false) : toggleSidebar} aria-label="Réduire le menu" className="w-8 h-8 rounded-[10px] text-[#86868B] hover:text-[#1D1D1F]  hover:bg-black/[0.06] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95">
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Role */}
      <div className={`mx-3 mb-2 p-2.5 rounded-[16px] bg-white/80 dark:bg-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_24px_rgba(0,0,0,0.04)] flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isRH ? 'bg-linear-to-br from-[#EE1B3C] to-[#D1002A]' : 'bg-[#F5F5F7] dark:bg-[#2c2c2e]'}`}>
            {isRH ? <ShieldCheck className="w-4 h-4 text-white" /> : <Briefcase className="w-4 h-4 text-[#6E6E73] dark:text-zinc-300" />}
          </div>
          {!isSidebarCollapsed && (
            <div className="leading-tight">
              <span className="text-[#86868B] text-[11px] block font-medium">Rôle connecté</span>
              <span className="font-semibold text-[#1D1D1F] dark:text-white text-[13px]">{isRH ? 'DRH / Admin' : 'Responsable'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-3 px-3 space-y-5 overflow-y-auto">
        {/* SECTION 1: GÉNÉRAL */}
        <div>
          {!isSidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[12px] font-semibold text-[#86868B]">
              Général
            </div>
          )}
          <div className="space-y-0.5">
            {generalItems.filter((item: any) => item.roleVisibility.includes(isRH ? 'ADMIN_RH' : 'RESPONSABLE')).map(renderItem)}
          </div>
        </div>

        {/* SECTION 2: AUDIT & SYSTÈME (AUDIT EMAIL, ARCHIVE, NOTIFICATIONS, PARAMÈTRES) */}
        <div>
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSystemOpen(prev => !prev)}
              aria-expanded={isSystemOpen}
              className="w-full px-3 pb-1.5 text-[12px] font-semibold text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>Audit &amp; Système</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isSystemOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
          )}
          {isSidebarCollapsed && <div className="mx-3 mb-2 h-px bg-black/[0.06] dark:bg-white/10" />}
          {(!isSidebarCollapsed ? isSystemOpen : true) && (
            <div className="space-y-0.5">
              {systemItems.filter((item: any) => item.roleVisibility.includes(isRH ? 'ADMIN_RH' : 'RESPONSABLE')).map(renderItem)}
            </div>
          )}
        </div>

        {isRH && (
          <>
            {isAdminOpen && adminItems.length > 0 && (
              <div className="space-y-0.5 pt-2 border-t border-black/[0.06] dark:border-white/10">
                {adminItems.map(renderItem)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pied de sidebar */}
      <div className="mt-auto py-3 border-t border-black/[0.06] dark:border-white/10">
        <p className="text-center text-[11px] font-medium text-[#86868B]">
          {isSidebarCollapsed ? 'v1.0' : 'Version 1.0.0'}
        </p>
      </div>
    </aside>
    </>
  );
}