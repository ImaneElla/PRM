"use client";

import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LifeBuoy,
  HelpCircle,
  Search,
  ChevronDown,
  Rocket,
  Activity,
  Mail,
  FileText,
  Settings,
  UserRound,
  Calendar,
  Clock,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ============================================================================
// CONTACT SUPPORT (affiché en bas de page, sur les deux onglets)
// ============================================================================
// Contact support affiché dans l'aide : configurable (NEXT_PUBLIC_SUPPORT_NOM / _ROLE / _EMAIL)
const SUPPORT_NOM = process.env.NEXT_PUBLIC_SUPPORT_NOM || 'Imane Ellaouzi';
const SUPPORT_ROLE = process.env.NEXT_PUBLIC_SUPPORT_ROLE || 'Développement informatique & support RH';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'emanellaouzi.05@gmail.com';

// ============================================================================
// DONNÉES FAQ
// ============================================================================
type Role = 'ADMIN_RH' | 'RESPONSABLE';
type HelpItem = { q: string; a: string };
type HelpSection = {
  id: string;
  title: string;
  icon: React.ElementType;
  roles: Role[];
  items: HelpItem[];
};

const SECTIONS: HelpSection[] = [
  {
    id: 'demarrage',
    title: 'Pour bien démarrer',
    icon: Rocket,
    roles: ['ADMIN_RH', 'RESPONSABLE'],
    items: [
      {
        q: 'À quoi sert cette application ?',
        a: "Elle suit les périodes d'essai des salariés : une première évaluation à 3 mois, puis une seconde à 6 mois. Le système calcule les échéances, envoie les relances par email et centralise les décisions.",
      },
      {
        q: 'Que trouve-t-on sur le tableau de bord ?',
        a: "Des indicateurs (périodes actives, en cours, en relance), la liste des évaluations à traiter, les prochaines échéances et, pour les RH, le planning et le journal des emails automatiques.",
      },
      {
        q: 'Comment naviguer ?',
        a: 'Utilisez le menu à gauche : tableau de bord, salariés, périodes, retards, notifications et réglages. Cliquer sur un indicateur ouvre directement la liste correspondante.',
      },
    ],
  },
  {
    id: 'statuts',
    title: "Statuts d'une période",
    icon: Activity,
    roles: ['ADMIN_RH', 'RESPONSABLE'],
    items: [
      {
        q: 'Que signifie « En cours » ?',
        a: "L'évaluation est ouverte et l'échéance est encore loin (plus de 14 jours). Le responsable a reçu le premier email (J-21).",
      },
      {
        q: 'Que signifie « En relance » ?',
        a: "L'échéance approche (de 14 à 8 jours avant, J-14). Un deuxième email de relance a été envoyé au responsable. Le formulaire doit être rempli rapidement.",
      },
      {
        q: 'Que signifie « En retard » ?',
        a: "Il reste 7 jours ou moins avant l'échéance (J-7). Un troisième email urgent est envoyé et la période apparaît dans les alertes. Passé l'échéance, le statut devient « Décision RH ».",
      },
      {
        q: 'Que signifie « Décision RH » ?',
        a: "L'échéance est dépassée (dès le lendemain, J+1). Le formulaire est verrouillé, le dossier est bloqué et la RH doit enregistrer la décision (titularisation, renouvellement ou arrêt). Un e-mail de retard est envoyé au responsable.",
      },
      {
        q: 'Que signifient « Complétée » et « Validée RH » ?',
        a: "« Complétée » : le responsable a rempli et soumis le formulaire. « Validée RH » : les RH ont pris connaissance de la décision et l'ont confirmée.",
      },
      {
        q: 'Que signifie « Rupture » ?',
        a: "Le responsable a indiqué une rupture de la période d'essai dans le formulaire. Plus aucun email n'est envoyé pour ce salarié.",
      },
    ],
  },
  {
    id: 'emails',
    title: 'Emails automatiques',
    icon: Mail,
    roles: ['ADMIN_RH', 'RESPONSABLE'],
    items: [
      {
        q: 'Quand les emails sont-ils envoyés ?',
        a: 'Automatiquement, sans action manuelle : Email 1 à J-21 (notification initiale), Email 2 à J-14 (relance intermédiaire), Email 3 à J-7 (relance urgente).',
      },
      {
        q: 'Un email peut-il être envoyé plusieurs fois ?',
        a: "Non. Chaque email n'est envoyé qu'une seule fois par période. Dès que le formulaire est soumis, les relances restantes sont annulées.",
      },
      {
        q: 'Où retrouver les emails envoyés ?',
        a: 'Dans le « Journal des Emails Automatiques » du tableau de bord RH. Cliquez sur « Voir » pour ouvrir le contenu complet.',
      },
    ],
  },
  {
    id: 'formulaire',
    title: 'Remplir une évaluation',
    icon: FileText,
    roles: ['RESPONSABLE'],
    items: [
      {
        q: 'Comment remplir le formulaire ?',
        a: "Depuis le tableau de bord ou « Mes Évaluations », cliquez sur « Remplir » (ou « Formulaire ») en face du salarié, complétez les champs puis soumettez.",
      },
      {
        q: "Pourquoi n'y a-t-il pas de bouton sur certaines lignes ?",
        a: "Quand la période est « En cours », aucune action n'est demandée pour l'instant. Le bouton « Remplir » apparaît en cas de retard.",
      },
      {
        q: "Que se passe-t-il si je valide la période d'essai à 3 mois ?",
        a: 'Le système passe automatiquement le salarié à la période de 6 mois, avec le statut « En cours », et relance le cycle des emails.',
      },
      {
        q: 'Que se passe-t-il si je choisis « Rupture » ?',
        a: "La période prend le statut « Rupture », aucun email n'est plus envoyé pour ce salarié et la période de 6 mois n'est pas créée.",
      },
      {
        q: 'Puis-je revoir un formulaire déjà soumis ?',
        a: 'Oui. Le bouton « Consulter » ouvre le formulaire en lecture seule.',
      },
    ],
  },
  {
    id: 'rh',
    title: 'Suivi RH',
    icon: UserRound,
    roles: ['ADMIN_RH'],
    items: [
      {
        q: 'Comment ajouter un salarié ?',
        a: "Cliquez sur « Nouveau Salarié » dans le tableau de bord, renseignez ses informations et son responsable. Les périodes de 3 et 6 mois sont calculées automatiquement.",
      },
      {
        q: 'Quand le bouton « Consulter » est-il disponible ?',
        a: 'Uniquement une fois que le responsable a rempli le formulaire. Avant cela, la période reste en suivi sans action possible côté RH.',
      },
      {
        q: 'Comment suivre les retards ?',
        a: "L'indicateur « Évaluations en relance » et la page « Retards » listent les périodes à régulariser, avec le responsable concerné.",
      },
    ],
  },
  {
    id: 'reglages',
    title: 'Réglages',
    icon: Settings,
    roles: ['ADMIN_RH', 'RESPONSABLE'],
    items: [
      {
        q: 'Comment changer le thème ?',
        a: 'Dans Réglages > Thème : clair, sombre ou automatique (suit votre appareil). Le choix est mémorisé.',
      },
      {
        q: 'Comment modifier mon profil ?',
        a: "Dans Réglages > Profil : prénom, nom, email et société. N'oubliez pas de cliquer sur « Enregistrer ».",
      },
      {
        q: 'Comment modifier les emails de relance ?',
        a: "Réservé aux RH. Dans Réglages > Relances, modifiez l'objet et le message des 3 emails. Variables disponibles : {salarie}, {echeance}, {responsable}, {periode}.",
      },
      {
        q: "Comment changer l'adresse d'envoi ?",
        a: "Réservé aux RH. Dans Réglages > Expéditeur, modifiez le nom et l'adresse email utilisés pour toutes les relances.",
      },
    ],
  },
];

const STATUTS_LEGENDE: { label: string; hint: string; className: string }[] = [
  { label: 'En cours', hint: 'J-21', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'En relance', hint: 'J-14', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  { label: 'En retard', hint: 'J-7', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  { label: 'Décision RH', hint: 'J+1 après l’échéance', className: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: 'Renouvellement', hint: 'Fin P1 validée', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  { label: 'Validation / Titularisation', hint: 'Fin P2 validée', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { label: 'Rupture', hint: 'Plus d’emails', className: 'bg-rose-950 text-white border-rose-950' },
];

// ============================================================================
// ONGLET 1 : GUIDE (première page)
// ============================================================================
function GuideTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card 1: Périodes 3M / 6M */}
      <Card className="p-5 space-y-3 rounded-2xl border-[#E8E8ED]">
        <div className="flex items-center gap-3 pb-2 border-b border-[#E8E8ED]">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Frise des Périodes d&apos;Essai</h3>
            <p className="text-[11px] text-muted-foreground">Calendrier et échéances légales</p>
          </div>
        </div>
        <div className="text-xs space-y-2 text-muted-foreground leading-relaxed">
          <p>
            L&apos;application gère automatiquement les deux étapes clés de la période d&apos;essai d&apos;un salarié :
          </p>
          <ul className="list-disc pl-4 space-y-1 text-foreground">
            <li>
              <strong>Période 1 (3 mois) :</strong> générée automatiquement lors de la création d&apos;un nouveau salarié.
            </li>
            <li>
              <strong>Période 2 (6 mois) :</strong> générée automatiquement dès que la Période 1 est validée.
            </li>
          </ul>
        </div>
      </Card>

      {/* Card 2: Cycle des relances */}
      <Card className="p-5 space-y-3 rounded-2xl border-[#E8E8ED]">
        <div className="flex items-center gap-3 pb-2 border-b border-[#E8E8ED]">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Cycle des 3 Relances Automatiques</h3>
            <p className="text-[11px] text-muted-foreground">Notifications automatiques quotidiennes à 09:00</p>
          </div>
        </div>
        <div className="text-xs space-y-2 text-muted-foreground">
          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-[#E8E8ED]">
            <span><strong>Email 1 (J-21) :</strong> Notification initiale</span>
            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">En cours</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-[#E8E8ED]">
            <span><strong>Email 2 (J-14) :</strong> Relance intermédiaire</span>
            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-800">En relance</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-[#E8E8ED]">
            <span><strong>Email 3 (J-7) :</strong> Relance urgente / retard</span>
            <Badge variant="destructive" className="text-[10px]">En retard</Badge>
          </div>
        </div>
      </Card>

      {/* Card 3: Rôles */}
      <Card className="p-5 space-y-3 rounded-2xl border-[#E8E8ED]">
        <div className="flex items-center gap-3 pb-2 border-b border-[#E8E8ED]">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Rôles &amp; Habilitations</h3>
            <p className="text-[11px] text-muted-foreground">Espaces ADMIN_RH et RESPONSABLE</p>
          </div>
        </div>
        <div className="text-xs space-y-2 text-muted-foreground leading-relaxed">
          <p>Deux types d&apos;accès distincts sont configurés dans l&apos;application :</p>
          <ul className="list-disc pl-4 space-y-1 text-foreground">
            <li>
              <strong>DRH / Admin RH :</strong> supervision globale, création des salariés &amp; responsables, paramétrage des relances et validation finale RH.
            </li>
            <li>
              <strong>Responsable :</strong> accès restreint à la consultation et à la réalisation des fiches d&apos;évaluation de ses salariés affectés.
            </li>
          </ul>
        </div>
      </Card>

      {/* Card 4: Formulaire */}
      <Card className="p-5 space-y-3 rounded-2xl border-[#E8E8ED]">
        <div className="flex items-center gap-3 pb-2 border-b border-[#E8E8ED]">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Formulaire d&apos;Évaluation RH</h3>
            <p className="text-[11px] text-muted-foreground">Processus de saisie et choix stratégiques</p>
          </div>
        </div>
        <div className="text-xs space-y-2 text-muted-foreground leading-relaxed">
          <p>
            Le formulaire comporte 3 parties (Renseignement, Évaluation, Recommandation) et enregistre automatiquement la date et l&apos;heure de validation.
          </p>
          <p className="text-foreground">
            <strong>Options de décision :</strong> confirmation définitive, passage à la période de 6 mois, ou Rupture (les relances sont alors automatiquement stoppées).
          </p>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// ONGLET 2 : QUESTIONS (FAQ avec recherche)
// ============================================================================
function QuestionsTab({ role }: { role: Role }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const normalize = (v: string) =>
    v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const query = normalize(search.trim());

  const visibleSections = useMemo(() => {
    return SECTIONS.filter((s) => s.roles.includes(role))
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (it) =>
            query === '' ||
            normalize(it.q).includes(query) ||
            normalize(it.a).includes(query) ||
            normalize(s.title).includes(query)
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [role, query]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          strokeWidth={2}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans l'aide (ex : relance, rupture, thème...)"
          className="w-full text-sm bg-white border border-[#E8E8ED] rounded-2xl pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* Légende des statuts */}
      {query === '' && (
        <Card className="p-4 rounded-2xl border-[#E8E8ED]">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600 mb-3">
            Les statuts en un coup d&apos;œil
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUTS_LEGENDE.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-xl border border-[#E8E8ED] bg-secondary/30 px-2.5 py-1.5"
              >
                <Badge variant="outline" className={`text-[10px] ${s.className}`}>
                  {s.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{s.hint}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sections */}
      {visibleSections.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl border-[#E8E8ED]">
          <p className="text-sm font-semibold text-foreground">Aucun résultat</p>
          <p className="text-xs text-muted-foreground mt-1">
            Essayez un autre mot-clé ou parcourez les rubriques.
          </p>
        </Card>
      ) : (
        visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id} className="overflow-hidden rounded-2xl border-[#E8E8ED]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8E8ED] bg-secondary/20">
                <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  {section.title}
                </h3>
              </div>

              <div className="divide-y divide-border/60">
                {section.items.map((item, idx) => {
                  const key = `${section.id}-${idx}`;
                  const isOpen = open === key || query !== '';
                  return (
                    <div key={key}>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen && query === '' ? null : key)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left cursor-pointer hover:bg-[#F5F5F7] transition-all duration-200"
                      >
                        <span className="text-[13px] font-medium text-foreground">{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
                            isOpen ? 'rotate-180 text-red-600' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="px-5 pb-4 text-[13px] leading-relaxed text-muted-foreground">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ============================================================================
// ÉCRAN AIDE
// ============================================================================
const DESCRIPTION_CHAMPS: Record<string, string> = {
  '{nom_manager}': 'Nom du responsable évaluateur',
  '{nom_salarie}': 'Nom et prénom du salarié',
  '{date_echeance}': "Date de fin de période (JJ/MM/AAAA)",
  '{date_limite}': "Date limite de l'évaluation",
  '{lien_evaluation}': "Lien direct vers le formulaire d'évaluation",
  '{lien_application}': "Lien vers la page de connexion",
  '{identifiant}': "Identifiant de connexion (e-mail du responsable)",
  '{jours_retard}': 'Nombre de jours de retard (e-mail de retard)',
  '{nom_admin}': "Nom de l'administrateur destinataire",
  '{matricule}': 'Matricule du salarié',
  '{note_globale}': "Note globale de l'évaluation",
  '{recommandation}': 'Recommandation du responsable',
  '{date_soumission}': "Date de soumission de l'évaluation",
};

// Onglet réservé aux RH : variables utilisables dans les modèles d'e-mail
function VariablesTab() {
  return (
    <Card className="p-5 rounded-2xl border-[#E8E8ED] space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">Variables des e-mails</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Insérez ces variables dans l&apos;objet ou le corps du message (Réglages &gt; Relances) : elles seront remplacées automatiquement à l&apos;envoi.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
        {Object.entries(DESCRIPTION_CHAMPS).map(([v, d]) => (
          <div key={v} className="flex items-baseline gap-2">
            <code className="rounded-[6px] bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px] text-[#1D1D1F] shrink-0">
              {v}
            </code>
            <span className="text-[#6E6E73]">{d}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AideScreen() {
  const { navigateTo, currentRole } = useApp();
  const role: Role = currentRole === 'ADMIN_RH' ? 'ADMIN_RH' : 'RESPONSABLE';

  const [tab, setTab] = useState<'guide' | 'questions' | 'variables'>('guide');

  const tabs: { id: 'guide' | 'questions' | 'variables'; label: string; icon: React.ElementType }[] = [
    { id: 'guide', label: 'Guide', icon: BookOpen },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    ...(role === 'ADMIN_RH' ? [{ id: 'variables' as const, label: 'Variables des e-mails', icon: Mail }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LifeBuoy className="w-6 h-6 text-red-600" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Aide &amp; Guide d&apos;Utilisation
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {role === 'ADMIN_RH'
              ? "Documentation de la plateforme de suivi des périodes d'essai (espace RH)."
              : "Documentation pour les responsables : évaluer vos collaborateurs en toute simplicité."}
          </p>
        </div>

        <Button
          onClick={() => navigateTo('dashboard')}
          variant="outline"
          className="text-xs font-semibold rounded-xl cursor-pointer"
        >
          Retour au Tableau de bord
        </Button>
      </div>

      {/* Navigation (onglets) */}
      <div className="flex items-center gap-2 p-1.5 bg-secondary/50 border border-[#E8E8ED] rounded-2xl w-fit text-xs font-medium">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-white text-foreground font-bold shadow-xs border border-[#E8E8ED]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 text-red-600" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu de l'onglet */}
      {tab === 'guide' ? <GuideTab /> : tab === 'variables' && role === 'ADMIN_RH' ? <VariablesTab /> : <QuestionsTab role={role} />}

      {/* Contact support (fin de page) */}
      <Card className="p-5 rounded-2xl border-[#E8E8ED] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <p className="text-[11px] text-muted-foreground">
            Une question qui n&apos;est pas dans ce guide ?
          </p>
          <p className="text-sm font-bold text-foreground">{SUPPORT_NOM}</p>
          <p className="text-[11px] text-muted-foreground">{SUPPORT_ROLE}</p>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
        >
          <Mail className="w-4 h-4" />
          {SUPPORT_EMAIL}
        </a>
      </Card>
      <div className="text-[11px] text-muted-foreground text-center">
      <button className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex justify-center align-center text-center">
        &copy; {new Date().getFullYear()} Premium Essai Manager
      </button>
     </div>
    </div>
  );
} 