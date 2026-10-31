"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import FormField, {
  EyeIcon,
  LockIcon,
  MailIcon,
  inputClasses,
  primaryButtonClasses,
} from "@/components/auth/FormField";
import { FormErrors, useAuthForm } from "@/hooks/useAuthForm";
import { login } from "@/services/authService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ConnexionValues {
  email: string;
  password: string;
}

/** Vérifie les champs, un message par champ invalide. */
function validate(values: ConnexionValues): FormErrors<ConnexionValues> {
  const errors: FormErrors<ConnexionValues> = {};

  if (!values.email.trim()) {
    errors.email = "Saisissez votre email.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Saisissez un email valide.";
  }

  if (!values.password) {
    errors.password = "Saisissez votre mot de passe.";
  }

  return errors;
}

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false); // TODO: à transmettre à login() si l'API le gère

  // Vrai quand on revient de la page de réinitialisation du mot de passe.
  const motDePasseReinitialise = searchParams.get("reinitialise") === "true";

  const { errors, formError, isSubmitting, handleSubmit, getFieldProps } =
    useAuthForm<ConnexionValues>({
      initialValues: { email: "", password: "" },
      validate,
      onSubmit: async (values) => {
        const user = await login({ email: values.email.trim(), password: values.password });
        // Première connexion avec le mot de passe temporaire : changement obligatoire
        router.replace(user.mustChangePassword ? "/changer-mot-de-passe" : "/");
      },
    });

  return (
    <AuthShell>
      <h1 className="mt-10 text-3xl font-bold text-black">Connexion</h1>
      <p className="mt-3 text-sm text-slate-600">
        Connectez-vous pour accéder à votre espace de suivi.
      </p>

      <div className="mt-6 space-y-4">
        {motDePasseReinitialise && !formError && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-800"
          >
            Votre mot de passe a été réinitialisé. Connectez-vous avec le nouveau.
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
          >
            {formError}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate suppressHydrationWarning className="mt-4 space-y-4">
        <FormField id="email" icon={<MailIcon />} error={errors.email}>
          <input suppressHydrationWarning
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Adresse e-mail"
            {...getFieldProps("email")}
            className={inputClasses()}
          />
        </FormField>

        <FormField
          id="password"
          icon={<LockIcon />}
          error={errors.password}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="cursor-pointer rounded p-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <EyeIcon off={showPassword} />
            </button>
          }
        >
          <input suppressHydrationWarning
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Mot de passe"
            {...getFieldProps("password")}
            className={inputClasses()}
          />
        </FormField>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600">
            <input suppressHydrationWarning
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-red-600"
            />
            Se souvenir de moi
          </label>
          <Link href="/mot-de-passe-oublie" className="font-bold text-red-700 hover:text-red-800">
            Mot de passe oublié ?
          </Link>
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Pas encore de compte ? Votre accès est créé par la Direction des Ressources Humaines.
      </p>
    </AuthShell>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  );
}