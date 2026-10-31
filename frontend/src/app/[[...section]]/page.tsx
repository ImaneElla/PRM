"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DashboardApp from "@/components/DashboardApp";
import { AUTH_CHANGED_EVENT, getAuthUser, isAuthenticated } from "@/services/authService";

export default function ApplicationPage() {
  const router = useRouter();
  const authorized = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(AUTH_CHANGED_EVENT, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener(AUTH_CHANGED_EVENT, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    isAuthenticated,
    () => false
  );

  const mustChangePassword = authorized && getAuthUser()?.mustChangePassword === true;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/connexion");
    } else if (getAuthUser()?.mustChangePassword) {
      // Mot de passe temporaire : changement obligatoire avant d'accéder à l'application
      router.replace("/changer-mot-de-passe");
    }
  }, [router]);

  if (!authorized || mustChangePassword) return null;

  return <DashboardApp />;
}
