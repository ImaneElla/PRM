"use client";

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getAuthUser, updateAuthUser } from '../../services/authService';
import { modeleEmailService, ModeleEmail } from '../../services/modeleEmailService';
import { getSocieteLabel, SOCIETES } from '@/lib/societe';
import OutilViderDonnees from '../OutilViderDonnees';

// Description des champs insérables dans un modèle (remplacés automatiquement à l'envoi)
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

const libelleDelai = (delai: number) =>
  delai === -2 ? "Envoyé à tous les administrateurs dès qu'un responsable remplit l'évaluation"
  : delai < 0 ? "Envoyé le lendemain de l'échéance, quand le dossier est bloqué (retard)"
  : `Envoyé automatiquement ${delai} jours avant l'échéance (J-${delai})`;

type IconName = 'gear' | 'mail' | 'check' | 'info' | 'shield' | 'eye' | 'chevron' | 'person';

function SfIcon({
  name,
  className = 'h-4 w-4',
  strokeWidth = 1.7,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const shapes: Record<IconName, React.ReactNode> = {
    gear: (<><path d="M4 8h8M18 8h2M4 16h2M12 16h8" /><circle cx="15" cy="8" r="2.2" /><circle cx="9" cy="16" r="2.2" /></>),
    mail: (<><rect x="3" y="5.5" width="18" height="13" rx="3.5" /><path d="M4 8.5l8 5.2 8-5.2" /></>),
    check: (<path d="M5 12.5l4.5 4.5L19 7.5" />),
    info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" /></>),
    shield: (<><path d="M12 3.5l7 2.5v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" /><path d="M8.8 12l2.3 2.3 4.1-4.3" /></>),
    eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>),
    chevron: (<path d="M9 6l6 6-6 6" />),
    person: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18c1.2-2.3 3.3-3.3 5.5-3.3s4.3 1 5.5 3.3" /></>),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes[name]}
    </svg>
  );
}


const APPLE_red = 'bg-linear-to-br from-[#EE1B3C] to-[#D1002A] border border-[#D1002A] shadow-[0_1px_2px_rgba(209,0,42,0.3),0_6px_16px_-6px_rgba(209,0,42,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110';

const isEmail = (v: string) => v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function Group({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      {title && <h3 className="px-4 text-[13px] font-medium text-[#6E6E73]">{title}</h3>}
      <div className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-2xl backdrop-saturate-[180%] divide-y divide-black/[0.05]">
        {children}
      </div>
      {footer && <p className="px-4 text-[12px] leading-snug text-[#6E6E73]">{footer}</p>}
    </section>
  );
}

function IconTile({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.12)] ${color}`}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  invalid,
  children,
}: {
  label: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-[48px] cursor-text items-center gap-4 px-4 py-2.5 transition-colors focus-within:bg-black/[0.02]">
      <span className={`w-36 shrink-0 text-[15px] ${invalid ? 'text-[#E4002B]' : 'text-[#1D1D1F]'}`}>{label}</span>
      <div className="flex-1">{children}</div>
    </label>
  );
}

const inputClass =
  'w-full bg-transparent text-right text-[15px] text-[#6E6E73] outline-none placeholder:text-[#6E6E73]/50 focus:text-[#1D1D1F]';

const SAMPLE: Record<string, string> = {
  '{nom_salarie}': 'Yassine El Amrani',
  '{salarie}': 'Yassine El Amrani',
  '{date_echeance}': '28/10/2026',
  '{echeance}': '28/10/2026',
  '{date_limite}': '28/10/2026',
  '{nom_manager}': 'Sara Benkirane',
  '{responsable}': 'Sara Benkirane',
  '{lien_evaluation}': 'https://…/evaluation/xxxxxxxx',
  '{lien_application}': 'https://…/connexion',
  '{identifiant}': 'sara.benkirane@exemple.com',
  '{jours_retard}': '2',
};
const fillSample = (text: string) =>
  Object.entries(SAMPLE).reduce((acc, [k, v]) => acc.split(k).join(v), text);

export default function ParametresScreen() {
  const {
    parametres,
    updateParametres,
    updateResponsable,
    addResponsable,
    currentRole,
    currentResponsable,
    responsables,
    directions,
    showToast,
  } = useApp();
  const isRH = currentRole === 'ADMIN_RH';

  // Modèles d'e-mail RH : chargés depuis le serveur (ce sont eux qui sont réellement envoyés)
  const [templates, setTemplates] = useState<ModeleEmail[]>([]);
  const [templatesInitiaux, setTemplatesInitiaux] = useState<ModeleEmail[]>([]);
  const [templatesEtat, setTemplatesEtat] = useState<'chargement' | 'ok' | 'erreur'>('chargement');
  const [templateEnCoursId, setTemplateEnCoursId] = useState<string | null>(null);
  const [compte, setCompte] = useState(parametres.compte);

  const [profil, setProfil] = useState(parametres.profil);

  const [respProfil, setRespProfil] = useState({
    firstName: currentResponsable?.firstName ?? '',
    lastName: currentResponsable?.lastName ?? '',
    email: currentResponsable?.email ?? '',
    poste: currentResponsable?.poste ?? '',
    societe: currentResponsable?.societe ?? 'GRP',
    directionId: currentResponsable?.directionId ?? 1,
  });

  const [saved, setSaved] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'emails' | 'compte' | 'profil'>('profil');

  // Charge les modèles d'e-mail réellement utilisés à l'envoi (Admin RH uniquement)
  useEffect(() => {
    if (!isRH) return;
    let annule = false;
    modeleEmailService.lister()
      .then((modeles) => {
        if (annule) return;
        setTemplates(modeles);
        setTemplatesInitiaux(modeles);
        setTemplatesEtat('ok');
      })
      .catch(() => {
        if (!annule) setTemplatesEtat('erreur');
      });
    return () => {
      annule = true;
    };
  }, [isRH]);

  const modeleModifie = (modele: ModeleEmail) => {
    const initial = templatesInitiaux.find((t) => t.id === modele.id);
    return !!initial && (initial.objet !== modele.objet || initial.contenu !== modele.contenu);
  };

  const handleReinitialiserModele = async (id: string) => {
    if (!window.confirm('Rétablir le texte par défaut de cet e-mail ? Vos modifications seront perdues.')) return;
    setTemplateEnCoursId(id);
    try {
      const retabli = await modeleEmailService.reinitialiser(id);
      setTemplates((prev) => prev.map((t) => (t.id === id ? retabli : t)));
      setTemplatesInitiaux((prev) => prev.map((t) => (t.id === id ? retabli : t)));
      showToast('Texte par défaut retabli.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de rétablir le texte par défaut.');
    } finally {
      setTemplateEnCoursId(null);
    }
  };

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) return;

    const frame = requestAnimationFrame(() => {
      if (authUser.role === 'ADMIN_RH') {
        setProfil((previous) => ({
          ...previous,
          nom: authUser.nom,
          prenom: authUser.prenom,
          email: authUser.email ?? previous.email,
        }));
        return;
      }

      const matchingResponsable = authUser.email
        ? responsables.find(
            (responsable) => responsable.email.toLowerCase() === authUser.email?.toLowerCase()
          )
        : undefined;

      const fallbackDirId = directions[0]?.id || 1;

      setRespProfil((previous) => ({
        ...previous,
        firstName: authUser.prenom || previous.firstName,
        lastName: authUser.nom || previous.lastName,
        email: authUser.email ?? previous.email,
        poste: authUser.poste || matchingResponsable?.poste || previous.poste || 'Responsable de Département',
        societe: authUser.societe || matchingResponsable?.societe || previous.societe || 'GRP',
        directionId: authUser.directionId || matchingResponsable?.directionId || previous.directionId || fallbackDirId,
      }));
    });

    return () => cancelAnimationFrame(frame);
  }, [isRH, responsables]);

  const handleTemplateChange = (
    id: string,
    field: 'objet' | 'contenu',
    value: string
  ) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const emailsValid = isRH
    ? isEmail(profil.email)
    : isEmail(respProfil.email);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailsValid) return;

    if (isRH) {
      // Enregistre sur le serveur les modèles d'e-mail modifiés (ils sont utilisés dès le prochain envoi)
      const modifies = templates.filter(modeleModifie);
      for (const modele of modifies) {
        if (!modele.objet.trim() || !modele.contenu.trim()) {
          showToast(`Échec de l'enregistrement : l'objet et le message de « ${modele.nom} » sont obligatoires.`);
          return;
        }
      }
      for (const modele of modifies) {
        try {
          const enregistre = await modeleEmailService.modifier(modele.id, modele.objet, modele.contenu);
          setTemplates((prev) => prev.map((t) => (t.id === modele.id ? enregistre : t)));
          setTemplatesInitiaux((prev) => prev.map((t) => (t.id === modele.id ? enregistre : t)));
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Échec de l'enregistrement du modèle d'e-mail.");
          return;
        }
      }
      updateParametres({ compte: { ...compte, emailExpediteur: profil.email }, profil });
      updateAuthUser({
        nom: profil.nom,
        prenom: profil.prenom,
        email: profil.email,
        societe: profil.societe,
      });
    } else {
      const authenticatedEmail = getAuthUser()?.email?.trim().toLowerCase();
      const matchingResponsable = authenticatedEmail
        ? responsables.find(
            (responsable) => responsable.email.toLowerCase() === authenticatedEmail
          )
        : undefined;
      const responsableToUpdate =
        matchingResponsable ??
        (currentResponsable?.email.toLowerCase() === respProfil.email.trim().toLowerCase()
          ? currentResponsable
          : null);

      if (responsableToUpdate) {
        try {
          await updateResponsable(responsableToUpdate.id, {
            firstName: respProfil.firstName,
            lastName: respProfil.lastName,
            email: respProfil.email,
            poste: respProfil.poste,
            societe: respProfil.societe,
            directionId: respProfil.directionId,
          });
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Impossible de mettre à jour le profil.');
          return;
        }
      } else {
        try {
          await addResponsable({
            firstName: respProfil.firstName,
            lastName: respProfil.lastName,
            email: respProfil.email,
            poste: respProfil.poste || 'Responsable de Département',
            societe: respProfil.societe,
          });
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Impossible de créer le profil.');
          return;
        }
      }
      updateAuthUser({
        nom: respProfil.lastName,
        prenom: respProfil.firstName,
        email: respProfil.email,
        poste: respProfil.poste,
        societe: respProfil.societe,
        directionId: respProfil.directionId,
      });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: 'profil' | 'emails' | 'compte'; label: string; rhOnly?: boolean }[] = [
    { id: 'profil', label: 'Profil' },
    { id: 'emails', label: 'Relances', rhOnly: true },
    { id: 'compte', label: 'Expéditeur', rhOnly: true },
  ];
  const visibleTabs = tabs.filter((t) => !t.rhOnly || isRH);
  const activeIndex = Math.max(0, visibleTabs.findIndex((t) => t.id === activeTab));

  return (
    <div
      className="mx-auto max-w-2xl space-y-6 pb-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[#6E6E73]">
          <SfIcon name="gear" className="h-4 w-4" />
          <span className="text-[13px] font-medium">{isRH ? 'Système RH' : 'Application'}</span>
        </div>
        <h2 className="text-[34px] font-bold leading-none tracking-[-0.03em] text-[#1D1D1F]">Réglages</h2>
      </div>

      <div
        className="relative flex rounded-[12px] bg-black/[0.06] p-[3px]"
        role="tablist"
        aria-label="Sections des réglages"
      >
        <div
          className="pointer-events-none absolute bottom-[3px] top-[3px] left-[3px] rounded-[9px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 6px) / ${visibleTabs.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative z-10 flex-1 cursor-pointer whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4002B]/40 ${
              activeTab === t.id ? 'font-semibold text-[#1D1D1F]' : 'font-medium text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-7">
        {isRH && activeTab === 'emails' && (
          <div className="space-y-7">
            <Group
              title="Variables disponibles"
              footer="Insérez ces variables dans l’objet ou le corps du message : elles seront remplacées automatiquement à l’envoi."
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <IconTile color="bg-orange-500">
                  <SfIcon name="info" />
                </IconTile>
                <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-2">
                  {Object.entries(DESCRIPTION_CHAMPS).map(([v, d]) => (
                    <div key={v} className="flex items-baseline gap-2">
                      <code className="rounded-[6px] bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px] text-[#1D1D1F]">
                        {v}
                      </code>
                      <span className="text-[#6E6E73]">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Group>

            {templatesEtat === 'chargement' && (
              <p className="px-4 text-[13px] text-[#6E6E73]">Chargement des modèles d’e-mail…</p>
            )}
            {templatesEtat === 'erreur' && (
              <p role="alert" className="px-4 text-[13px] text-[#E4002B]">
                Impossible de charger les modèles d’e-mail depuis le serveur. Vérifiez que le serveur est démarré (et à jour), puis rechargez la page.
              </p>
            )}

            {templates.map((tmpl, idx) => (
              <Group
                key={tmpl.id}
                title={`Email ${idx + 1} · ${tmpl.nom}`}
                footer={`${libelleDelai(tmpl.delai)}. Les modifications sont utilisées dès le prochain envoi.`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <IconTile color="bg-[#FF3B30]">
                    <SfIcon name="mail" />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-[#1D1D1F]">{tmpl.nom}</p>
                    <p className="truncate text-[12px] text-[#6E6E73]">{libelleDelai(tmpl.delai)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      modeleModifie(tmpl)
                        ? 'bg-amber-100 text-amber-800'
                        : tmpl.personnalise
                        ? 'bg-[#0A84FF]/10 text-[#0A84FF]'
                        : 'bg-black/[0.05] text-[#6E6E73]'
                    }`}
                  >
                    {modeleModifie(tmpl) ? 'Non enregistré' : tmpl.personnalise ? 'Personnalisé' : 'Par défaut'}
                  </span>
                </div>

                <Row label="Objet">
                  <input
                    type="text"
                    value={tmpl.objet}
                    onChange={(e) => handleTemplateChange(tmpl.id, 'objet', e.target.value)}
                    className={inputClass}
                  />
                </Row>

                <div className="space-y-1 px-4 py-3">
                  <span className="text-[15px] text-[#1D1D1F]">Message</span>
                  <textarea
                    rows={12}
                    value={tmpl.contenu}
                    onChange={(e) => handleTemplateChange(tmpl.id, 'contenu', e.target.value)}
                    className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-[#6E6E73] outline-none focus:text-[#1D1D1F]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewId(previewId === tmpl.id ? null : tmpl.id)}
                  aria-expanded={previewId === tmpl.id}
                  className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:bg-black/[0.03]"
                >
                  <IconTile color="bg-[#0A84FF]">
                    <SfIcon name="eye" />
                  </IconTile>
                  <span className="flex-1 text-[15px] text-[#1D1D1F]">Aperçu</span>
                  <SfIcon
                    name="chevron"
                    className={`h-3.5 w-3.5 text-[#C7C7CC] transition-transform duration-200 ${previewId === tmpl.id ? 'rotate-90' : ''}`}
                    strokeWidth={2.4}
                  />
                </button>
                {(tmpl.personnalise || modeleModifie(tmpl)) && (
                  <button
                    type="button"
                    disabled={templateEnCoursId === tmpl.id}
                    onClick={() => handleReinitialiserModele(tmpl.id)}
                    className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[15px] text-[#E4002B] transition-colors hover:bg-black/[0.03] disabled:opacity-50"
                  >
                    Rétablir le texte par défaut
                  </button>
                )}
                {previewId === tmpl.id && (
                  <div className="space-y-2 bg-[#F5F5F7]/70 px-4 py-4">
                    <p className="text-[12px] text-[#6E6E73]">
                      De : {compte.nomExpediteur || 'Expéditeur'} &lt;{profil.email || '—'}&gt;
                    </p>
                    <p className="text-[15px] font-semibold text-[#1D1D1F]">{fillSample(tmpl.objet)}</p>
                    <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#1D1D1F]">
                      {fillSample(tmpl.contenu)}
                    </p>
                  </div>
                )}
              </Group>
            ))}
          </div>
        )}

        {isRH && activeTab === 'compte' && (
          <Group
            title="Compte expéditeur"
            footer="Toutes les relances automatiques utilisent cette adresse comme expéditeur (en-tête From)."
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <IconTile color="bg-[#34C759]">
                <SfIcon name="shield" />
              </IconTile>
              <div>
                <p className="text-[15px] font-medium text-[#1D1D1F]">Expéditeur des emails</p>
                <p className="text-[12px] text-[#6E6E73]">Affiché dans les relances et convocations.</p>
              </div>
            </div>

            <Row label="Nom">
              <input
                type="text"
                value={compte.nomExpediteur}
                onChange={(e) => setCompte({ ...compte, nomExpediteur: e.target.value })}
                placeholder="Direction des Ressources Humaines"
                className={inputClass}
              />
            </Row>

            <Row label="Adresse email">
              <input
                type="email"
                value={profil.email}
                readOnly
                title="Liée à l'adresse de votre compte (non modifiable)"
                className={`${inputClass} cursor-not-allowed opacity-60`}
              />
            </Row>
            <p className="px-4 py-2 text-[12px] text-[#6E6E73]">
              Adresse liée à votre compte : elle ne peut pas être modifiée.
            </p>
          </Group>
        )}

        {activeTab === 'profil' && (
          <div className="space-y-7">
            <Group>
              <div className="flex flex-col items-center gap-1 px-4 py-7 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#E4002B] to-[#1D1D1F] text-[28px] font-semibold uppercase text-white shadow-[0_4px_16px_rgba(228,0,43,0.30)]">
                  {isRH ? (
                    <>
                      {profil.prenom?.[0]}
                      {profil.nom?.[0]}
                    </>
                  ) : (
                    <>
                      {respProfil.firstName?.[0]}
                      {respProfil.lastName?.[0]}
                    </>
                  )}
                </div>
                <h4 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                  {isRH ? `${profil.prenom} ${profil.nom}` : `${respProfil.firstName} ${respProfil.lastName}`}
                </h4>
                <p className="text-[14px] text-[#6E6E73]">
                  {isRH ? getSocieteLabel(profil.societe) : respProfil.poste || getSocieteLabel(respProfil.societe)}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1 text-[12px] font-medium text-[#6E6E73]">
                  <SfIcon name="person" className="h-3.5 w-3.5" />
                  {isRH ? 'Compte Administrateur DRH' : 'Compte Responsable'}
                </span>
              </div>
            </Group>

                        <Group
              title="Informations personnelles"
              footer={isRH ? 'Informations du compte Admin RH.' : 'Informations du compte Responsable connecté.'}
            >
              {isRH ? (
                <>
                  <Row label="Prénom">
                    <input
                      type="text"
                      value={profil.prenom}
                      onChange={(e) => setProfil({ ...profil, prenom: e.target.value })}
                      className={inputClass}
                    />
                  </Row>
                  <Row label="Nom">
                    <input
                      type="text"
                      value={profil.nom}
                      onChange={(e) => setProfil({ ...profil, nom: e.target.value })}
                      className={inputClass}
                    />
                  </Row>
                  <Row label="Adresse email" invalid={!isEmail(profil.email)}>
                    <input
                      type="email"
                      value={profil.email}
                      readOnly
                      title="Adresse du compte (non modifiable)"
                      className={`${inputClass} cursor-not-allowed opacity-60`}
                    />
                  </Row>
                  <Row label="Société">
                    <select
                      value={profil.societe || 'GRP'}
                      onChange={(e) => setProfil({ ...profil, societe: e.target.value })}
                      className={`${inputClass} cursor-pointer`}
                    >
                      {SOCIETES.map(({ code, label }) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </Row>
                </>
              ) : (
                <>
                  <Row label="Prénom">
                    <input
                      type="text"
                      value={respProfil.firstName}
                      onChange={(e) => setRespProfil({ ...respProfil, firstName: e.target.value })}
                      className={inputClass}
                    />
                  </Row>
                  <Row label="Nom">
                    <input
                      type="text"
                      value={respProfil.lastName}
                      onChange={(e) => setRespProfil({ ...respProfil, lastName: e.target.value })}
                      className={inputClass}
                    />
                  </Row>
                  <Row label="Adresse email" invalid={!isEmail(respProfil.email)}>
                    <input
                      type="email"
                      value={respProfil.email}
                      readOnly
                      title="Adresse du compte (non modifiable)"
                      className={`${inputClass} cursor-not-allowed opacity-60`}
                    />
                  </Row>
                  <Row label="Poste">
                    <input
                      type="text"
                      value={respProfil.poste}
                      onChange={(e) => setRespProfil({ ...respProfil, poste: e.target.value })}
                      className={inputClass}
                    />
                  </Row>
                  <Row label="Société">
                    <select
                      value={respProfil.societe || 'GRP'}
                      onChange={(e) => setRespProfil({ ...respProfil, societe: e.target.value })}
                      className={`${inputClass} cursor-pointer`}
                    >
                      {SOCIETES.map(({ code, label }) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </Row>
                </>
              )}
            </Group>
          </div>
        )}

        <div className="sticky bottom-4 z-10 rounded-[20px] border border-black/[0.06] bg-white/80 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.10)] backdrop-blur-2xl backdrop-saturate-[180%]">
          <button
            type="submit"
            disabled={!emailsValid}
            className={`flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] text-[16px] font-semibold text-white transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4002B]/40 disabled:cursor-not-allowed disabled:opacity-40 ${APPLE_red}`}
          >
            {saved && <SfIcon name="check" className="h-5 w-5" strokeWidth={2.6} />}
            {saved ? 'Enregistré' : 'Enregistrer les modifications'}
          </button>
          {!emailsValid && (
            <p className="px-2 pt-1.5 text-center text-[12px] text-[#E4002B]">
              Corrigez l’adresse email pour enregistrer.
            </p>
          )}
        </div>
      </form>

      {isRH && <OutilViderDonnees />}
    </div>
  );
}