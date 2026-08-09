import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-[background-color,color,border-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] px-5 text-[var(--primary-foreground)] shadow-[0_8px_18px_rgb(var(--shadow-color)/0.16)] hover:bg-[var(--primary-hover)] hover:shadow-[0_10px_22px_rgb(var(--shadow-color)/0.2)]",
        secondary:
          "border border-[var(--border-strong)] bg-[var(--surface-raised)] px-5 text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)]",
        ghost:
          "px-3 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
        destructive:
          "bg-[var(--destructive)] px-5 text-white shadow-[0_4px_0_var(--destructive-hover)] hover:bg-[var(--destructive-hover)] active:shadow-none",
      },
      size: {
        default: "h-11",
        sm: "h-10 min-h-10 px-4 text-xs",
        lg: "h-13 min-h-13 px-7 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : "button";

    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
