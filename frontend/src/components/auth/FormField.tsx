import type { ReactNode } from "react";

interface FormFieldProps {
  id: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  error?: string;
  children: ReactNode;
}

export function inputClasses(): string {
  return "w-full bg-transparent py-3.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed";
}


export const primaryButtonClasses =
  "w-full cursor-pointer rounded-[14px] bg-linear-to-br from-[#EE1B3C] to-[#D1002A] border border-[#D1002A] px-4 py-4 text-sm font-semibold text-white " +
  "shadow-[0_1px_2px_rgba(209,0,42,0.3),0_6px_16px_-6px_rgba(209,0,42,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E4002B]/60 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const secondaryButtonClasses =
  "w-full cursor-pointer rounded-[14px] border border-[#E8E8ED] bg-[#F5F5F7] px-4 py-4 text-sm font-semibold text-[#1D1D1F] " +
  "transition-all duration-200 hover:bg-white active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1F]";

export default function FormField({ id, icon, trailing, error, children }: FormFieldProps) {
  return (
    <div className="text-left">
      <div
        className={`flex items-center gap-3 rounded-[12px] border bg-white px-4 transition-all duration-200 focus-within:ring-[4px] ${
          error
            ? "border-[#E4002B] focus-within:ring-[#E4002B]/10"
            : "border-[#E8E8ED] focus-within:border-[#1D1D1F] focus-within:ring-black/5"
        }`}
      >
        {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
        {children}
        {trailing && <span className="shrink-0 text-slate-500">{trailing}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 px-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const MailIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const UserIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);
export const EyeIcon = ({ off = false }: { off?: boolean }) => (
  <svg {...base}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);