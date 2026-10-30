"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import FormField, { MailIcon, inputClasses, primaryButtonClasses } from "@/components/auth/FormField";
import { FormErrors, useAuthForm } from "@/hooks/useAuthForm";
import { demanderReinitialisation } from "@/services/authService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OubliValues {
  email: string;
}

function validate(values: OubliValues): FormErrors<OubliValues> {
  if (!values.email.trim()) return { email: "Saisissez votre email." };
  if (!EMAIL_PATTERN.test(values.email.trim())) return { email: "Saisissez un email valide." };
  return {};
}

export default function MotDePasseOubliePage() {
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const { errors, formError, isSubmitting, handleSubmit, getFieldProps } =
    useAuthForm<OubliValues>({
      initialValues: { email: "" },
      validate,
      onSubmit: async (values) => {
        setConfirmation(await demanderReinitialisation(values.email.trim()));
      },
    });

  return (
    <AuthShell>
      <h1 className="mt-10 text-3xl font-bold text-black">Mot de passe oublié</h1>
      <p className="mt-3 text-sm text-slate-600">
        Saisissez l&apos;adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>

      {confirmation ? (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-800"
        >
          {confirmation} Le lien est valable 1 heure.
        </div>
      ) : (
        <>
          {formError && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <FormField id="email" icon={<MailIcon />} error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Adresse e-mail"
                {...getFieldProps("email")}
                className={inputClasses()}
              />
            </FormField>

            <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
              {isSubmitting ? "Envoi..." : "Recevoir le lien"}
            </button>
          </form>
        </>
      )}

      <p className="mt-5 text-sm text-slate-600">
        <Link href="/connexion" className="font-bold text-red-700 hover:text-red-800">
          Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  );
}
