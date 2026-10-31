'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserPlus, ArrowLeft, Mail, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';


interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  societe: string;
}

const inputClass =
  'w-full text-xs pl-9 pr-3 py-2 h-10 bg-[#F5F5F7] border border-[#E8E8ED] rounded-[12px] text-[#1D1D1F] placeholder:text-[#6E6E73] focus:ring-[4px] focus:ring-black/5 focus:border-[#1D1D1F] focus:outline-none transition-all duration-200';

const labelClass = 'text-xs font-medium text-[#1D1D1F]';

export default function AjouterResponsable() {
  const { navigateTo, addResponsable } = useApp();

  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    societe: 'GRP'
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setError('Veuillez renseigner le nom, prénom et une adresse e-mail.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Adresse e-mail invalide.');
      return;
    }

    try {
      await addResponsable({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        societe: formData.societe
      });
      setIsSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Impossible d’enregistrer le responsable.');
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setError('');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      societe: 'GRP'
    });
  };


  const initials =
    formData.firstName || formData.lastName
      ? `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`.toUpperCase()
      : '?';

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8E8ED] pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateTo('responsables')}
            className="h-9 w-9 border-[#E8E8ED] hover:bg-[#F5F5F7] cursor-pointer rounded-[10px] transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 text-[#1D1D1F]" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">
              Ajouter un Responsable
            </h1>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              Créer un profil de Responsable N+1 pour la gestion des évaluations
            </p>
          </div>
        </div>
      </div>

      {isSubmitted ? (
        /* Success state */
        <Card className="p-8 text-center border border-emerald-200 bg-emerald-50/40 rounded-[20px]">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">
            Responsable ajouté avec succès
          </h3>
          <p className="text-xs text-[#6E6E73] mt-1">
            Le profil de{' '}
            <strong className="text-[#1D1D1F]">
              {formData.firstName} {formData.lastName}
            </strong>{' '}
            ({formData.email}) a été enregistré.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Button
              variant="outline"
              className="text-xs cursor-pointer rounded-xl"
              onClick={() => navigateTo('responsables')}
            >
              Retour à l&apos;annuaire
            </Button>
            <Button className="btn-gradient text-white text-xs cursor-pointer rounded-[10px] active:scale-[0.98]" onClick={resetForm}>
              Ajouter un autre
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card className="lg:col-span-2 p-6 border border-[#E8E8ED] shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[20px] bg-white">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Prénom + Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      name="firstName"
                      required
                      placeholder="Thomas"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      name="lastName"
                      required
                      placeholder="Bernard"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email (full width) */}
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Adresse e-mail <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                  <input
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

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E8ED]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigateTo('responsables')}
                  className="text-xs cursor-pointer border-[#E8E8ED] rounded-[10px] transition-all duration-200"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="btn-gradient text-white text-xs cursor-pointer flex items-center gap-1.5 rounded-[10px] transition-all duration-200 active:scale-[0.98]"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Enregistrer le responsable
                </Button>
              </div>
            </form>
          </Card>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="p-5 border border-[#E8E8ED] bg-[#F5F5F7]/60 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6E6E73] mb-4">
                Aperçu du Responsable
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-[14px] bg-[#FFF0F3] border border-[#E4002B]/15 flex items-center justify-center text-[#E4002B] font-bold text-sm">
                  {initials}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-[#1D1D1F]">
                    {formData.firstName} {formData.lastName || 'Nom'}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5 text-xs text-[#6E6E73] border-t border-[#E8E8ED]/80 pt-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#6E6E73] shrink-0" />
                  <span className="truncate">{formData.email || 'Adresse email requise'}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}