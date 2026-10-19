import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-civic-accent text-white hover:bg-civic-accentDark disabled:opacity-60",
  secondary:
    "border border-civic-line bg-civic-surface text-civic-ink hover:bg-civic-mist disabled:opacity-60",
  ghost:
    "text-civic-accent hover:text-civic-accentDark disabled:opacity-50",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-card px-4 text-sm font-semibold transition-colors disabled:pointer-events-none";

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${BASE} ${VARIANT[variant]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button type="button" className={buttonClass(variant, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: LinkProps & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
    </Link>
  );
}
