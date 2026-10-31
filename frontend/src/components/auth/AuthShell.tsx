"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Montserrat } from "next/font/google";
import { isAuthenticated } from "@/services/authService";
import { ChevronLeftIcon } from "lucide-react";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="inline-block text-center">
      <p
        className={`pb-1 text-[11px] font-medium tracking-[0.5em] ${
          light ? "text-white" : "text-slate-800"
        }`}
        style={{ paddingLeft: "0.5em" }}
      >
        GROUPE
      </p>
      <div className={`h-[2px] w-full ${light ? "bg-white" : "bg-red-600"}`} />
      <p
        className={`pt-1 text-xl font-extrabold tracking-wide ${
          light ? "text-white" : "text-black"
        }`}
      >
        PREMIUM
      </p>
    </div>
  );
}

function BrandPanel({ showBack }: { showBack: boolean }) {
  return (
    <aside className="relative hidden w-[40%] shrink-0 overflow-hidden bg-gradient-to-b from-[#e3212b] via-[#c4141d] to-[#7e0910] p-9 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="relative z-10 flex items-start justify-between">
        <div className="text-left">
          <Logo light />
        </div>
        {showBack && (
          <Link
            href="/connexion"
            className="rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25 hover:border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeftIcon className="mr-1 inline-block h-3 w-3 animate-pulse" />
              Retour
          </Link>
           ) }
      </div>

      {/* Formes en verre */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-[30%] h-[34%] w-[45%] -skew-y-6 rounded-xl border border-white/30 bg-gradient-to-b from-white/35 to-white/5" />
        <div className="absolute left-[24%] top-[24%] h-[46%] w-[34%] -skew-y-3 rounded-xl border border-white/30 bg-gradient-to-b from-white/35 to-white/5" />
        <div className="absolute left-[56%] top-[35%] h-[36%] w-[46%] -skew-y-6 rounded-xl border border-white/30 bg-gradient-to-b from-white/30 to-white/5" />
        <div className="absolute left-[14%] top-[58%] h-[26%] w-[48%] -skew-y-6 rounded-xl border border-white/30 bg-gradient-to-b from-white/25 to-white/5" />
      </div>

      <div className="relative z-10">
        <h2 className="max-w-xs text-3xl font-bold leading-tight">
          Suivez chaque période d’essai, en toute sérénité.
        </h2>
        <div className="mt-5 flex gap-2" aria-hidden>
          <span className="h-1 w-6 rounded-full bg-white/40" />
          <span className="h-1 w-6 rounded-full bg-white/40" />
          <span className="h-1 w-12 rounded-full bg-white" />
        </div>
      </div>
    </aside>
  );
}

interface AuthShellProps {
  children: ReactNode;
  showBack?: boolean;
  redirectIfAuthenticated?: boolean;
}

export default function AuthShell({ children, showBack = false, redirectIfAuthenticated = true }: AuthShellProps) {
  const router = useRouter();

  useEffect(() => {
    if (redirectIfAuthenticated && isAuthenticated()) {
      router.replace("/");
    }
  }, [router, redirectIfAuthenticated]);

  return (
    <main
      className={`${montserrat.className} flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4 py-8`}
    >
      <div className="flex w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#E8E8ED] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.10)] lg:min-h-[680px]">
        <BrandPanel showBack={showBack} />

        <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-md text-center mx-auto">
            <img src="/logo-groupe-premium.png" alt="Logo" width={205} height={55} className="mx-auto h-16 w-auto" />
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}