import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[12px] border border-[#E8E8ED] bg-[#F5F5F7] px-3 py-2 text-xs text-[#1D1D1F] transition-all duration-200 file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[#6E6E73] focus-visible:outline-none focus-visible:border-[#1D1D1F] focus-visible:ring-[4px] focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
