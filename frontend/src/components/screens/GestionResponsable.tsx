"use client";

import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Responsable, StatutCompte } from '../../types';
import { InvitationResult } from '@/services/responsableService';
import {
  AlertTriangle,
  UserPlus,
  Search,
  Mail,
  Building2,
  Pencil,
  Trash2,
  LayoutList,
  LayoutGrid,
  User,
  X,
  CheckCircle2,
  Users,
  Upload,
  Download,
  Send,
  KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getProfileAvatarColor } from '@/lib/profileAvatar';
import { telechargerModeleResponsables } from '@/lib/telechargerModele';
import { getSocieteLabel, SOCIETES } from '@/lib/societe';

interface FormState {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  societe: string;
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  societe: 'GRP'
};

const STATUT_COMPTE: Record<StatutCompte, { label: string; className: string }> = {
  AUCUN: { label: 'Sans compte', className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  INVITE: { label: 'Invité', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ACTIF: { label: 'Compte actif', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const STATUT_INVITATION: Record<InvitationResult['statut'], { label: string; className: string }> = {
  CREE: { label: 'Invité', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RENVOYEE: { label: 'Invitation renvoyée', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IGNORE: { label: 'Ignoré', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ERREUR: { label: 'Erreur', className: 'bg-red-50 text-red-700 border-red-200' },
};

const getInitials = (firstName: string, lastName: string) => {
  const f = firstName ? firstName[0] : '';
  const l = lastName ? lastName[0] : '';
  return (f + l).toUpperCase() || 'R';
};

export default function GestionResponsable() {
  const {
    responsables = [],
    salaries = [],
    addResponsable,
    inviterResponsable,
    importerResponsables,
    updateResponsable,
    deleteResponsable,
    showToast
  } = useApp();

  // Résultats à afficher après une invitation, un renvoi ou un import CSV
  const [invitationResults, setInvitationResults] = useState<InvitationResult[] | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [invitationEnCoursId, setInvitationEnCoursId] = useState<number | null>(null);
  const fichierCsvRef = useRef<HTMLInputElement>(null);

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = ''; // permet de réimporter le même fichier
    if (!fichier) return;
    setImportEnCours(true);
    try {
      setInvitationResults(await importerResponsables(fichier));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Impossible d'importer le fichier.");
    } finally {
      setImportEnCours(false);
    }
  };

  const handleInviter = async (resp: Responsable) => {
    setInvitationEnCoursId(resp.id);
    try {
      setInvitationResults([await inviterResponsable(resp.id)]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Impossible d'envoyer l'invitation.");
    } finally {
      setInvitationEnCoursId(null);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [selectedResp, setSelectedResp] = useState<Responsable | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const filteredResponsables = responsables.filter((r) => {
    const fullName = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    return (
      fullName.includes(query) ||
      (r.email || '').toLowerCase().includes(query) ||
      getSocieteLabel(r.societe).toLowerCase().includes(query)
    );
  });

  const getSubs = (resp: Responsable) =>
    salaries.filter(
      (s) =>
        s.responsableId === resp.id ||
        (s.responsableNom &&
          s.responsableNom.toLowerCase() === `${resp.firstName} ${resp.lastName}`.toLowerCase())
    );

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({
      ...EMPTY_FORM,
      societe: 'GRP'
    });
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (resp: Responsable) => {
    setIsEditing(true);
    setFormData({
      id: resp.id,
      firstName: resp.firstName,
      lastName: resp.lastName,
      email: resp.email,
      societe: resp.societe || 'GRP'
    });
    setFormError('');
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setFormData(EMPTY_FORM);
    setFormError('');
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.email.trim();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const societe = formData.societe;

    if (!firstName || !lastName || !email || !societe) {
      setFormError('Veuillez renseigner le nom, le prénom, l’adresse e-mail et la société.');
      return;
    }

    const exists = responsables.some(
      (r) => r.email.toLowerCase() === email.toLowerCase() && (!isEditing || r.id !== formData.id)
    );
    if (exists) {
      setFormError('Un responsable avec cette adresse e-mail existe déjà.');
      return;
    }

    try {
      if (isEditing && formData.id) {
        await updateResponsable(formData.id, { firstName, lastName, email, societe });
      } else {
        const resultat = await addResponsable({ firstName, lastName, email, societe });
        if (resultat) setInvitationResults([resultat]);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d’enregistrer le responsable.');
      return;
    }

    closeFormModal();
  };

  const askDelete = (resp: Responsable) => {
    setSelectedResp(resp);
    setFormError('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedResp) return;
    try {
      const deleted = await deleteResponsable(selectedResp.id);
      if (!deleted) return;
      setShowDeleteModal(false);
      setSelectedResp(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible de supprimer le responsable de la base de données.');
    }
  };

  const inputClass =
    'w-full text-xs pl-9 pr-3 py-2 bg-[#F5F5F7]/80 dark:bg-zinc-800/60 border border-[#E8E8ED] dark:border-zinc-700/60 rounded-xl text-[#1D1D1F] dark:text-zinc-100 placeholder:text-[#6E6E73] dark:placeholder:text-[#6E6E73] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all';

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-zinc-100">
            Gestion des Responsables
          </h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#6E6E73] mt-1">
            Annuaire des responsables, affectation des équipes et supervision des bilans d&apos;essai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fichierCsvRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleImportCsv}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fichierCsvRef.current?.click()}
            disabled={importEnCours}
            title="Fichier Excel (.xlsx) avec les colonnes nom, prénom, email (société facultative). Téléchargez le modèle pour partir d'un fichier prêt à remplir"
            className="font-medium cursor-pointer"
          >
            <Upload className="w-4 h-4" strokeWidth={1.75} />
            <span className="pl-2">{importEnCours ? 'Import en cours...' : 'Importer un fichier Excel'}</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => telechargerModeleResponsables().catch((e) => showToast(e instanceof Error ? e.message : "Impossible de télécharger le modèle."))}
            title="Télécharger un fichier Excel d'exemple avec les bonnes colonnes"
            className="font-medium cursor-pointer"
          >
            <Download className="w-4 h-4" strokeWidth={1.75} />
            <span className="pl-2">Modèle Excel</span>
          </Button>
          <Button
            onClick={openAddModal}
            className="btn-gardient text-white font-medium cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4 " strokeWidth={1.75} />
            <span className='pl-2'
            >Ajouter un responsable</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-[#6E6E73] dark:text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2"
              strokeWidth={1.75}
            />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou société..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#F5F5F7]/80 dark:bg-zinc-800/60 border border-[#E8E8ED] dark:border-zinc-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-400 focus:bg-white dark:focus:bg-zinc-900 transition-all text-[#1D1D1F] dark:text-zinc-100 placeholder:text-[#6E6E73] dark:placeholder:text-[#6E6E73]"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#6E6E73] dark:text-[#6E6E73] whitespace-nowrap">
              {filteredResponsables.length} responsable{filteredResponsables.length > 1 ? 's' : ''}
            </span>

            <div className="flex items-center rounded-xl border border-[#E8E8ED] dark:border-zinc-800 bg-[#F5F5F7] dark:bg-zinc-900 p-0.5">
              <button
                type="button"
                title="Vue liste"
                aria-label="Vue liste"
                onClick={() => setViewMode('list')}
                className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-800 shadow-2xs text-red-600 dark:text-red-400'
                    : 'text-[#6E6E73] hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <LayoutList className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                title="Vue cartes"
                aria-label="Vue cartes"
                onClick={() => setViewMode('cards')}
                className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-zinc-800 shadow-2xs text-red-600 dark:text-red-400'
                    : 'text-[#6E6E73] hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        {filteredResponsables.length === 0 ? (
          <Card className="p-12 text-center text-xs text-[#6E6E73] dark:text-[#6E6E73] font-medium border border-[#E8E8ED] dark:border-zinc-800/80 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto mb-3 text-[#6E6E73]">
              <Users className="w-6 h-6" />
            </div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Aucun responsable enregistré</p>
            <p className="text-[#6E6E73] dark:text-[#6E6E73] mt-1">
              {searchTerm
                ? 'Aucun responsable ne correspond à votre recherche.'
                : "Ajoutez un premier responsable pour commencer l'affectation de salariés."}
            </p>
            {!searchTerm && (
              <Button
                onClick={openAddModal}
                size="sm"
                className="mt-4 btn-gardient text-white rounded-xl text-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Ajouter un premier responsable
              </Button>
            )}
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="overflow-hidden border border-[#E8E8ED] dark:border-zinc-800/80 shadow-2xs">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead className="bg-[#F5F5F7] dark:bg-zinc-900/60 border-b border-[#E8E8ED] dark:border-zinc-800 text-[#6E6E73] dark:text-[#6E6E73] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap truncate">Responsable</th>
                  <th className="py-3.5 px-4 whitespace-nowrap truncate">Contact</th>
                  <th className="py-3.5 px-4 whitespace-nowrap truncate">Société</th>
                  <th className="py-3.5 px-4 whitespace-nowrap truncate">Équipe</th>
                  <th className="py-3.5 px-4 whitespace-nowrap truncate text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900 text-[#1D1D1F] dark:text-zinc-100">
                {filteredResponsables.map((resp) => {
                  const subs = getSubs(resp);
                  const fullName = `${resp.firstName} ${resp.lastName}`;

                  return (
                    <tr key={resp.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors group">
                      <td className="py-3 px-4 align-middle whitespace-nowrap overflow-hidden">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 shrink-0 rounded-[10px] border font-bold flex items-center justify-center text-[11px] transition-colors duration-300 ${getProfileAvatarColor(resp.id)}`}>
                            {getInitials(resp.firstName, resp.lastName)}
                          </div>
                          <div className="truncate">
                            <span title={fullName} className="font-semibold tracking-tight block truncate">
                              {fullName}
                            </span>
                            {resp.statutCompte && (
                              <span className={`mt-0.5 inline-block text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${STATUT_COMPTE[resp.statutCompte].className}`}>
                                {STATUT_COMPTE[resp.statutCompte].label}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle whitespace-nowrap overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#6E6E73] shrink-0" />
                          <span title={resp.email} className="truncate font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {resp.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle whitespace-nowrap overflow-hidden">
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate block">
                          {getSocieteLabel(resp.societe)}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-middle whitespace-nowrap overflow-hidden">
                        {subs.length > 0 ? (
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-[11px] font-mono font-bold text-[#1D1D1F] dark:text-zinc-100 shrink-0">
                              {subs.length}
                            </span>
                            {subs.slice(0, 2).map((collab) => (
                              <span
                                key={collab.id}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-[#F5F5F7] dark:bg-zinc-800 text-[#6E6E73] dark:text-zinc-300 border border-[#E8E8ED]/60 dark:border-zinc-700/60 truncate"
                              >
                                {collab.firstName} {collab.lastName}
                              </span>
                            ))}
                            {subs.length > 2 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[#6E6E73] dark:text-[#6E6E73] font-medium shrink-0">
                                +{subs.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#6E6E73] dark:text-[#6E6E73] italic">Aucun collaborateur</span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {resp.statutCompte && resp.statutCompte !== 'ACTIF' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInviter(resp)}
                              disabled={invitationEnCoursId === resp.id}
                              title={resp.statutCompte === 'AUCUN'
                                ? 'Créer son compte et envoyer l’invitation'
                                : 'Renvoyer l’invitation avec un nouveau mot de passe temporaire'}
                              className="text-xs text-[#6E6E73] dark:text-zinc-300 hover:text-[#1D1D1F] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 h-8 px-2 rounded-lg cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(resp)}
                            className="text-xs text-[#6E6E73] dark:text-zinc-300 hover:text-[#1D1D1F] dark:hover:text-zinc-100 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 h-8 px-2.5 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Modifier</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => askDelete(resp)}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 px-2 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResponsables.map((resp) => {
              const subs = getSubs(resp);
              const fullName = `${resp.firstName} ${resp.lastName}`;

              return (
                <Card
                  key={resp.id}
                  className="p-5 rounded-[20px] border border-[#E8E8ED]/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl border font-bold flex items-center justify-center text-xs shadow-2xs transition-colors duration-300 ${getProfileAvatarColor(resp.id)}`}>
                          {getInitials(resp.firstName, resp.lastName)}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-zinc-100 tracking-tight leading-tight">
                            {fullName}
                          </h3>
                          <p className="text-[11px] text-[#6E6E73] dark:text-[#6E6E73] mt-0.5">Responsable N+1</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-3 border-y border-zinc-100 dark:border-zinc-800 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#6E6E73]">
                        <Mail className="w-3.5 h-3.5 text-[#6E6E73] shrink-0" />
                        <span className="truncate font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {resp.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#6E6E73]">
                        <Building2 className="w-3.5 h-3.5 text-[#6E6E73] shrink-0" />
                        <span className="truncate text-[11px] text-zinc-700 dark:text-zinc-300">
                          {getSocieteLabel(resp.societe)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#6E6E73] dark:text-[#6E6E73] text-[11px]">
                          Collaborateurs rattachés
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#1D1D1F] dark:text-zinc-100">
                          {subs.length}
                        </span>
                      </div>

                      {subs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subs.slice(0, 3).map((collab) => (
                            <span
                              key={collab.id}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[#F5F5F7] dark:bg-zinc-800 text-[#6E6E73] dark:text-zinc-300 border border-[#E8E8ED]/60 dark:border-zinc-700/60"
                            >
                              {collab.firstName} {collab.lastName}
                            </span>
                          ))}
                          {subs.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[#6E6E73] dark:text-[#6E6E73] font-medium">
                              +{subs.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#6E6E73] dark:text-[#6E6E73] italic">
                          Aucun collaborateur rattaché
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(resp)}
                      className="text-xs text-[#6E6E73] dark:text-zinc-300 hover:text-[#1D1D1F] dark:hover:text-zinc-100 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 h-8 px-2.5 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Modifier</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => askDelete(resp)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 px-2.5 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Ajout / Modification Responsable */}
      {showFormModal && (
        <div
          onClick={closeFormModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-[20px] border border-[#E8E8ED] dark:border-zinc-800 shadow-2xl max-w-lg w-full p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-[#1D1D1F] dark:text-zinc-100">
                  {isEditing ? 'Modifier le responsable' : 'Inviter un responsable'}
                </h3>
                <p className="text-xs text-[#6E6E73] dark:text-[#6E6E73] mt-0.5">
                  {isEditing
                    ? "Mettre à jour les informations du profil et l'affectation du responsable."
                    : "Son compte est créé avec un mot de passe temporaire envoyé par e-mail, à changer à la première connexion."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={closeFormModal}
                className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-zinc-100 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="resp_prenom" className="text-xs font-medium text-[#1D1D1F] dark:text-zinc-100">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                    <input
                      id="resp_prenom"
                      type="text"
                      name="firstName"
                      required
                      placeholder="ex. Thomas"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="resp_nom" className="text-xs font-medium text-[#1D1D1F] dark:text-zinc-100">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                    <input
                      id="resp_nom"
                      type="text"
                      name="lastName"
                      required
                      placeholder="ex. Bernard"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="resp_email" className="text-xs font-medium text-[#1D1D1F] dark:text-zinc-100">
                  Adresse e-mail <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                  <input
                    id="resp_email"
                    type="email"
                    name="email"
                    required
                    placeholder="responsable@premium.africa"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="resp_societe" className="text-xs font-medium text-[#1D1D1F] dark:text-zinc-100">
                  Société / Entité <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                  <select
                    id="resp_societe"
                    name="societe"
                    required
                    value={formData.societe}
                    onChange={handleChange}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F5F5F7]/80 dark:bg-zinc-800/60 border border-[#E8E8ED] dark:border-zinc-700/60 rounded-xl text-[#1D1D1F] dark:text-zinc-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  >
                    {SOCIETES.map(({ code, label }) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                  <p className="pl-9 text-[11px] text-[#6E6E73]">
                    Choisissez la société de rattachement du responsable.
                  </p>
                </div>
              </div>

              {formError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeFormModal}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="btn-gardient text-white rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEditing ? 'Enregistrer les modifications' : 'Créer le compte et inviter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Résultats des invitations (formulaire, renvoi ou import CSV) */}
      {invitationResults && (
        <div
          onClick={() => setInvitationResults(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-[20px] border border-[#E8E8ED] dark:border-zinc-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-[#1D1D1F] dark:text-zinc-100">
                  {invitationResults.length > 1 || invitationResults[0]?.ligne ? "Résultat de l'import" : "Invitation"}
                </h3>
                <p className="text-xs text-[#6E6E73] mt-0.5">
                  {invitationResults.filter((r) => r.statut === 'CREE' || r.statut === 'RENVOYEE').length} invitation(s) créée(s)
                  {' · '}
                  {invitationResults.filter((r) => r.statut === 'IGNORE' || r.statut === 'ERREUR').length} ligne(s) non traitée(s)
                </p>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setInvitationResults(null)}
                className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-zinc-100 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {invitationResults.some((r) => r.motDePasseTemporaire) && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Certains e-mails n&apos;ont pas pu être envoyés. Transmettez le mot de passe temporaire affiché ci-dessous
                  à la personne concernée : il ne sera plus visible après la fermeture de cette fenêtre.
                </span>
              </div>
            )}

            <div className="overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border border-[#E8E8ED] dark:border-zinc-800 rounded-xl">
              {invitationResults.map((r, index) => (
                <div key={`${r.ligne ?? ''}-${r.email ?? index}`} className="p-3 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1D1D1F] dark:text-zinc-100 truncate">
                      {r.ligne ? <span className="text-[#6E6E73] font-normal">Ligne {r.ligne} · </span> : null}
                      {r.nomComplet || '—'}
                    </p>
                    <p className="font-mono text-[11px] text-[#6E6E73] truncate">{r.email || '—'}</p>
                    {r.message && <p className="text-[11px] text-[#6E6E73] mt-0.5">{r.message}</p>}
                    {r.motDePasseTemporaire && (
                      <p className="mt-1 text-[11px]">
                        Mot de passe temporaire :{' '}
                        <code className="select-all font-mono font-bold text-[#1D1D1F] dark:text-zinc-100 bg-[#F5F5F7] dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          {r.motDePasseTemporaire}
                        </code>
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border font-medium ${STATUT_INVITATION[r.statut].className}`}>
                    {STATUT_INVITATION[r.statut].label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setInvitationResults(null)} className="rounded-xl text-xs cursor-pointer">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-[#E8E8ED] dark:border-zinc-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold tracking-tight text-[#1D1D1F] dark:text-zinc-100">
                Supprimer le responsable
              </h3>
            </div>
            <p className="text-xs text-[#6E6E73] dark:text-[#6E6E73]">
              Vous êtes sûr de vouloir supprimer{' '}
              <strong className="text-[#1D1D1F] dark:text-zinc-100">
                {selectedResp?.firstName} {selectedResp?.lastName}
              </strong>{' '}
              ({selectedResp?.email}) ?
            </p>
            {formError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">{formError}</p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedResp(null);
                }}
                className="rounded-xl text-xs cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs cursor-pointer"
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}