"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Mail, ShieldCheck, UserPlus, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getAuthUser } from "@/services/authService";
import { adminService, AdminBackendDTO, StatutAdmin } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STATUT: Record<StatutAdmin, { label: string; className: string }> = {
  ACTIF: { label: "Actif", className: "bg-green-50 text-green-700 border-green-200" },
  INVITE: { label: "Invitation en attente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  DESACTIVE: { label: "Désactivé", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

const EMPTY_FORM = { prenom: "", nom: "", email: "" };

const inputClass =
  "w-full text-xs px-3 py-2 h-10 bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] focus:ring-4 focus:ring-black/5 focus:border-[#1D1D1F] focus:bg-white focus:outline-none transition-all duration-200 text-[#1D1D1F] placeholder:text-[#6E6E73]";

export default function GestionAdmins() {
  const { showToast } = useApp();
  const monEmail = getAuthUser()?.email?.toLowerCase();

  const [admins, setAdmins] = useState<AdminBackendDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [actionEnCoursId, setActionEnCoursId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Résultat d'une invitation / d'un renvoi (affiche le lien si l'e-mail n'a pas pu partir)
  const [resultat, setResultat] = useState<AdminBackendDTO | null>(null);

  // showToast change à chaque rendu : on le garde en référence pour ne pas relancer le chargement en boucle
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  });

  const charger = useCallback(async () => {
    try {
      setAdmins(await adminService.lister());
    } catch (error) {
      showToastRef.current(error instanceof Error ? error.message : "Impossible de charger les administrateurs.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const handleInviter = async (e: React.FormEvent) => {
    e.preventDefault();
    const prenom = form.prenom.trim();
    const nom = form.nom.trim();
    const email = form.email.trim();
    if (!prenom || !nom || !email) {
      setFormError("Veuillez renseigner le prénom, le nom et l'adresse e-mail.");
      return;
    }
    setEnvoiEnCours(true);
    try {
      const invite = await adminService.inviter({ prenom, nom, email });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError("");
      setResultat(invite);
      await charger();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible d'envoyer l'invitation.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const executer = async (admin: AdminBackendDTO, action: () => Promise<AdminBackendDTO>, retour?: string) => {
    setActionEnCoursId(admin.id);
    try {
      const misAJour = await action();
      if (misAJour.emailEnvoye !== undefined && misAJour.emailEnvoye !== null) {
        setResultat(misAJour);
      } else if (retour) {
        showToast(retour);
      }
      await charger();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setActionEnCoursId(null);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Administrateurs RH</h1>
          <p className="text-xs text-[#6E6E73] mt-1">
            Invitez d&apos;autres administrateurs par e-mail : chacun choisit son propre mot de passe via un lien
            personnel valable 48 heures.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setFormError("");
            setShowForm(true);
          }}
          className="btn-gardient text-white font-medium cursor-pointer transition-all"
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.75} />
          <span className="pl-2">Inviter un administrateur</span>
        </Button>
      </div>

      <Card className="overflow-hidden border border-[#E8E8ED]/80 shadow-xs">
        {chargement ? (
          <p className="p-6 text-xs text-[#6E6E73]">Chargement...</p>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center text-[#6E6E73]">
            <ShieldCheck className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Aucun administrateur</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {admins.map((admin) => {
              const estMoi = admin.email.toLowerCase() === monEmail;
              const occupe = actionEnCoursId === admin.id;
              return (
                <div key={admin.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1D1D1F] truncate">
                      {`${admin.prenom ?? ""} ${admin.nom ?? ""}`.trim() || "—"}
                      {estMoi && <span className="ml-2 font-normal text-[#6E6E73]">(vous)</span>}
                    </p>
                    <p className="font-mono text-[11px] text-[#6E6E73] truncate">{admin.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${STATUT[admin.statut].className}`}>
                      {STATUT[admin.statut].label}
                    </span>

                    {admin.statut === "INVITE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={occupe}
                        onClick={() => executer(admin, () => adminService.renvoyerInvitation(admin.id))}
                        className="rounded-xl text-xs cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span className="pl-1.5">Renvoyer l&apos;invitation</span>
                      </Button>
                    )}

                    {admin.statut === "DESACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={occupe}
                        onClick={() => executer(admin, () => adminService.reactiver(admin.id), "Administrateur réactivé.")}
                        className="rounded-xl text-xs cursor-pointer"
                      >
                        Réactiver
                      </Button>
                    ) : (
                      !estMoi && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={occupe}
                          onClick={() => {
                            if (window.confirm(`Désactiver ${admin.email} ? Cette personne perdra immédiatement l'accès.`)) {
                              executer(admin, () => adminService.desactiver(admin.id), "Administrateur désactivé.");
                            }
                          }}
                          className="rounded-xl text-xs cursor-pointer text-red-700 hover:text-red-800"
                        >
                          Désactiver
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Invitation */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] border border-[#E8E8ED] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight text-[#1D1D1F]">Inviter un administrateur</h3>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setShowForm(false)}
                className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviter} noValidate className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="Prénom"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="Nom"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <input
                type="email"
                className={inputClass}
                placeholder="Adresse e-mail"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {formError && (
                <p role="alert" className="text-xs text-red-600">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} className="rounded-xl text-xs cursor-pointer">
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={envoiEnCours} className="rounded-xl text-xs cursor-pointer">
                  {envoiEnCours ? "Envoi..." : "Envoyer l'invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Résultat d'invitation */}
      {resultat && (
        <div
          onClick={() => setResultat(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[20px] border border-[#E8E8ED] shadow-2xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-sm font-semibold tracking-tight text-[#1D1D1F]">Invitation</h3>
            <p className="text-xs text-[#6E6E73]">
              <strong className="text-[#1D1D1F]">{resultat.email}</strong> — {resultat.message}
            </p>

            {resultat.lienActivation && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                  <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Transmettez ce lien à la personne par un canal sûr. Il est valable 48 heures, ne sert qu&apos;une
                    fois et ne sera plus affiché après la fermeture de cette fenêtre.
                  </span>
                </div>
                <code className="block select-all break-all font-mono text-[11px] text-[#1D1D1F] bg-[#F5F5F7] px-2 py-1.5 rounded">
                  {resultat.lienActivation}
                </code>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setResultat(null)} className="rounded-xl text-xs cursor-pointer">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
