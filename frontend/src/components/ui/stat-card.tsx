import { LucideIcon, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Accent = "red" | "blue" | "green" | "purple" | "orange" | "pink";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  status?: string;
  onClick?: () => void;
  accent?: Accent;
}

const themes = {
  red: {
    light: "bg-red-50",
    border: "border-red-100",
    text: "text-red-600",
    hoverBorder: "hover:border-red-200",
    hoverBg: "group-hover:bg-red-600",
    gradient: "from-red-50",
  },

  blue: {
    light: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-600",
    hoverBorder: "hover:border-blue-200",
    hoverBg: "group-hover:bg-blue-600",
    gradient: "from-blue-50",
  },

  green: {
    light: "bg-green-50",
    border: "border-green-100",
    text: "text-green-600",
    hoverBorder: "hover:border-green-200",
    hoverBg: "group-hover:bg-green-600",
    gradient: "from-green-50",
  },

  purple: {
    light: "bg-purple-50",
    border: "border-purple-100",
    text: "text-purple-600",
    hoverBorder: "hover:border-purple-200",
    hoverBg: "group-hover:bg-purple-600",
    gradient: "from-purple-50",
  },

  orange: {
    light: "bg-orange-50",
    border: "border-orange-100",
    text: "text-orange-600",
    hoverBorder: "hover:border-orange-200",
    hoverBg: "group-hover:bg-orange-600",
    gradient: "from-orange-50",
  },

  pink: {
    light: "bg-pink-50",
    border: "border-pink-100",
    text: "text-pink-600",
    hoverBorder: "hover:border-pink-200",
    hoverBg: "group-hover:bg-pink-600",
    gradient: "from-pink-50",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  status,
  onClick,
  accent = "red",
}: StatCardProps) {
  const theme = themes[accent];

  return (
    <Card
      onClick={onClick}
      className={`
        group relative overflow-hidden
        ${onClick ? "cursor-pointer" : ""}
        bg-white
        border border-[#E8E8ED]
        rounded-[20px]
        p-5
        shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]
        transition-all duration-200 ease-out
        hover:-translate-y-px
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        ${theme.hoverBorder}
      `}
    >
      {/* Decorative shape */}
      <div
        className={`
          absolute -right-8 -bottom-8
          w-32 h-32
          bg-gradient-to-br ${theme.gradient}
          to-transparent
          rotate-12
          transition-transform duration-500
          group-hover:scale-125
        `}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            
            {/* Icon */}
            <div
              className={`
                w-11 h-11
                rounded-xl
                ${theme.light}
                border ${theme.border}
                flex items-center justify-center
                ${theme.hoverBg}
                transition-colors duration-300
              `}
            >
              <Icon
                className={`
                  w-5 h-5
                  ${theme.text}
                  group-hover:text-white
                  transition-colors
                `}
                strokeWidth={2}
              />
            </div>

            {/* Title */}
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">
              {title}
            </span>
          </div>

          {/* Arrow */}
          {onClick && (
            <div
              className={`
                w-8 h-8
                rounded-full
                ${theme.light}
                flex items-center justify-center
                ${theme.hoverBg}
                transition-colors
              `}
            >
              <ChevronRight
                className={`
                  w-4 h-4
                  ${theme.text}
                  group-hover:text-white
                  transition-colors
                `}
              />
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-end gap-3">
          <span className="text-4xl font-black tracking-tight leading-none text-zinc-950">
            {value}
          </span>

          <span className="text-[11px] text-zinc-500 font-medium mb-1">
            {description}
          </span>
        </div>

        {/* Status */}
        {status && (
          <div className="mt-5">
            <Badge
              className={`
                ${theme.light}
                ${theme.text}
                border ${theme.border}
                text-[10px]
                font-semibold
                px-2.5 py-1
                hover:${theme.light}
              `}
            >
              {status}
            </Badge>
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div
        className={`
          absolute bottom-0 right-0
          w-16 h-1
          bg-gradient-to-r
          ${theme.text.replace("text-", "from-")}
          to-zinc-900
          rounded-tl-full
        `}
      />
    </Card>
  );
}