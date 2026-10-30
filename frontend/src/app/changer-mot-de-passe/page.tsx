"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import FormField, {
  EyeIcon,
  LockIcon,
  inputClasses,
  primaryButtonClasses,
} from "@/components/auth/FormField";
import { FormErrors, useAuthForm } from "@/hooks/useAuthForm";
import { changerMotDePasse, getAuthUser, isAuthenticated, logout } from "@/services/authService";
import { REGLE_MOT_DE_PASSE, erreurNouveauMotDePasse } from "@/lib/motDePasse";

interface ChangementValues {
  actuel: string;
  nouveau: string;
  confirmation: string;
}

function validate(values: ChangementValues): FormErrors<ChangementValues> {
  const errors: FormErrors<ChangementValues> = { ...erreurNouveauMotDePasse(values.nouveau, values.confirmation) };
  if (!values.actuel) {
    errors.actuel = "Saisissez votre mot de passe actuel.";
  } else if (values.nouveau && values.nouveau === values.actuel) {
    errors.nouveau = "Le nouveau mot de passe doit être différent de l'actuel.";
  }
  return errors;
}

export default function ChangerMotDePassePage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [premiereConnexion, setPremiereConnexion] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/connexion");
      return;
    }
    setPremiereConnexion(getAuthUser()?.mustChangePassword === true);
  }, [router]);

  const { errors, formError, isSubmitting, handleSubmit, getFieldProps } =
    useAuthForm<ChangementValues>({
      initialValues: { actuel: "", nouveau: "", confirmation: "" },
      validate,
      onSubmit: async (values) => {
        await changerMotDePasse(values.actuel, values.nouveau);
        router.replace("/dashboard");
      },
    });

  const seDeconnecter = () => {
    logout();
    router.replace("/connexion");
  };

  const toggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"}
      className="cursor-pointer rounded p-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
    >
      <EyeIcon off={showPassword} />
    </button>
  );

  return (
    <AuthShell redirectIfAuthenticated={false}>
      <h1 className="mt-10 text-3xl font-bold text-black">Nouveau mot de passe</h1>
      <p className="mt-3 text-sm text-slate-600">
        {premiereConnexion
          ? "Pour sécuriser votre compte, remplacez le mot de passe temporaire reçu par e-mail avant de continuer."
          : "Choisissez un nouveau mot de passe pour votre compte."}
      </p>

      {formError && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <FormField id="actuel" icon={<LockIcon />} error={errors.actuel} trailing={toggle}>
          <input
            id="actuel"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={premiereConnexion ? "Mot de passe temporaire" : "Mot de passe actuel"}
            {...getFieldProps("actuel")}
            className={inputClasses()}
          />
        </FormField>

        <FormField id="nouveau" icon={<LockIcon />} error={errors.nouveau}>
          <input
            id="nouveau"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Nouveau mot de passe"
            {...getFieldProps("nouveau")}
            className={inputClasses()}
          />
        </FormField>

        <FormField id="confirmation" icon={<LockIcon />} error={errors.confirmation}>
          <input
            id="confirmation"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Confirmer le nouveau mot de passe"
            {...getFieldProps("confirmation")}
            className={inputClasses()}
          />
        </FormField>

        <p className="text-left text-xs text-slate-500">{REGLE_MOT_DE_PASSE}</p>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
          {isSubmitting ? "Enregistrement..." : "Enregistrer et continuer"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        <button type="button" onClick={seDeconnecter} className="cursor-pointer font-bold text-red-700 hover:text-red-800">
          Se déconnecter
        </button>
      </p>
    </AuthShell>
  );
}
