'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { salarieService } from '@/services/salarieService';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import EmailModal from '@/components/EmailModal';
import DashboardScreen from '@/components/screens/DashboardAdmin';
import SalariesListScreen from '@/components/screens/SalariesListScreen';
import RetardsScreen from '@/components/screens/RetardsScreen';
import AjouterSalarieScreen from '@/components/screens/AjouterSalarieScreen';
import DetailSalarieScreen from '@/components/screens/DetailSalarieScreen';
import EmailsScreen from '@/components/screens/EmailsScreen';
import PeriodesScreen from '@/components/screens/PeriodesScreen';
import FormulaireEvaluationScreen from '@/components/screens/FormulaireEvaluationScreen';
import AjouterResponsable from '@/components/screens/AjouterResponsable';
import GestionResponsable from '@/components/screens/GestionResponsable';
import GestionAdmins from '@/components/screens/GestionAdmins';
import DashboardResponsable from '@/components/screens/DashboardResponsable';
import NotificationsScreen from '@/components/screens/NotificationsScreen';
import ParametresScreen from '@/components/screens/ParametresScreen';
import AideScreen from '@/components/screens/AideScreen';
import AIAnalysisScreen from '@/components/screens/AIAnalysisScreen';
import { getAuthUser } from '@/services/authService';
import ArchivesScreen from '@/components/screens/Archivesscreen';

export default function DashboardApp() {
  const { currentScreen, navigateTo, periodes, showToast } = useApp();
  const [periodeCible, setPeriodeCible] = useState<number | null>(null);

  // Lien d'évaluation reçu par e-mail (page /evaluation/[token]) : on retrouve la période visée
  useEffect(() => {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem('gp_pending_evaluation');
      if (token) sessionStorage.removeItem('gp_pending_evaluation');
    } catch {
      return;
    }
    if (!token) return;
    salarieService.resoudreLienEvaluation(token).then(periodeId => {
      if (periodeId) setPeriodeCible(periodeId);
      else showToast("Ce lien d'évaluation est invalide, expiré ou ne vous est pas destiné.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ... puis on ouvre le formulaire dès que la période est chargée
  useEffect(() => {
    if (periodeCible && periodes.some(p => p.id === periodeCible)) {
      navigateTo('formulaire-evaluation', { periodeId: periodeCible });
      setPeriodeCible(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodeCible, periodes]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'salaries':
        return <SalariesListScreen />;
      case 'retards':
        return <RetardsScreen />;
      case 'ajouter-salarie':
        return <AjouterSalarieScreen />;
      case 'detail-salarie':
        return <DetailSalarieScreen />;
      case 'emails':
        return <EmailsScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'analyse-ia':
        return getAuthUser()?.role === 'ADMIN_RH' ? <AIAnalysisScreen /> : <DashboardResponsable />;
      case 'archive':
        return <ArchivesScreen />;
      case 'moteur':
        return <DashboardScreen />;
      case 'responsables':
      case 'gestion-responsable':
        return <GestionResponsable />;
      case 'gestion-admins':
        return <GestionAdmins />;
      case 'periodes':
        return <PeriodesScreen />;
      case 'formulaire-evaluation':
        return <FormulaireEvaluationScreen />;
      case 'ajouter-responsable':
        return <AjouterResponsable />;
      case 'dashboard-responsable':
        return <DashboardResponsable />;
      case 'parametres':
        return <ParametresScreen />;
      case 'aide':
        return <AideScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="app-shell flex h-screen w-screen max-lg:h-dvh max-lg:w-full overflow-hidden bg-background text-foreground font-sans antialiased print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen max-lg:h-dvh overflow-hidden min-w-0 print:block print:h-auto print:overflow-visible">
        <Header />

        <main className="app-main flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-background print:p-0 print:overflow-visible print:h-auto print:bg-white">
          <div className="app-main-inner max-w-7xl mx-auto space-y-6 print:max-w-none print:mx-0 print:space-y-0">
            <div key={currentScreen} className="screen-enter space-y-6 print:space-y-0">
              {renderScreen()}
            </div>
          </div>
        </main>
      </div>

      <EmailModal />
    </div>
  );
}
