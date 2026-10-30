"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import FormField, {
  EyeIcon,
  LockIcon,
  inputClasses,
  primaryButtonClasses,
} from "@/components/auth/FormField";
import { FormErrors, useAuthForm } from "@/hooks/useAuthForm";
import { reinitialiserMotDePasse } from "@/services/authService";
import { REGLE_MOT_DE_PASSE, erreurNouveauMotDePasse } from "@/lib/motDePasse";

interface ReinitialisationValues {
  nouveau: string;
  confirmation: string;
}

function validate(values: ReinitialisationValues): FormErrors<ReinitialisationValues> {
  return erreurNouveauMotDePasse(values.nouveau, values.confirmation);
}

function ReinitialisationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invitation = searchParams.get("invitation") === "1";
  const [showPassword, setShowPassword] = useState(false);

  const { errors, formError, isSubmitting, handleSubmit, getFieldProps } =
    useAuthForm<ReinitialisationValues>({
      initialValues: { nouveau: "", confirmation: "" },
      validate,
      onSubmit: async (values) => {
        await reinitialiserMotDePasse(token ?? "", values.nouveau);
        router.replace("/connexion?reinitialise=true");
      },
    });

  return (
    <AuthShell>
      <h1 className="mt-10 text-3xl font-bold text-black">
        {invitation ? "Activer votre compte" : "Réinitialiser le mot de passe"}
      </h1>

      {!token ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
        >
          Ce lien est incomplet. Faites une nouvelle demande depuis la page « Mot de passe oublié ».
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-600">
            {invitation
              ? "Bienvenue ! Choisissez le mot de passe de votre compte administrateur."
              : "Choisissez votre nouveau mot de passe."}
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
            <FormField
              id="nouveau"
              icon={<LockIcon />}
              error={errors.nouveau}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"}
                  className="cursor-pointer rounded p-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  <EyeIcon off={showPassword} />
                </button>
              }
            >
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
              {isSubmitting ? "Enregistrement..." : invitation ? "Activer mon compte" : "Enregistrer le mot de passe"}
            </button>
          </form>
        </>
      )}

      <p className="mt-5 text-sm text-slate-600">
        <Link href="/mot-de-passe-oublie" className="font-bold text-red-700 hover:text-red-800">
          Demander un nouveau lien
        </Link>
        {" · "}
        <Link href="/connexion" className="font-bold text-red-700 hover:text-red-800">
          Connexion
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={null}>
      <ReinitialisationForm />
    </Suspense>
  );
}
