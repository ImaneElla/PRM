import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-[13px] font-medium transition-[transform,box-shadow,background-color,border-color,color,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-br from-[#EE1B3C] to-[#D1002A] text-white shadow-[0_1px_2px_rgba(209,0,42,0.3),0_6px_16px_-6px_rgba(209,0,42,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#D1002A]",
        destructive:
          "bg-[#E4002B] text-white hover:bg-[#c4001f] shadow-[0_4px_14px_rgba(228,0,43,0.22)]",
        outline:
          "border border-[#E8E8ED] bg-[#F5F5F7] text-[#1D1D1F] hover:bg-white hover:border-[#D1D1D6]",
        secondary:
          "bg-[#F5F5F7] text-[#1D1D1F] border border-[#E8E8ED] hover:bg-white",
        ghost:
          "text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]",
        link:
          "text-[#E4002B] underline-offset-4 hover:underline",
        apple:
          "bg-[#F5F5F7] text-[#1D1D1F] border border-[#E8E8ED] hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-semibold",
      },
      size: {
        default: "h-10 px-[18px] py-[10px]",
        sm: "h-8 rounded-[10px] px-3 text-[11px]",
        lg: "h-11 rounded-[14px] px-6 text-sm",
        icon: "h-9 w-9 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };