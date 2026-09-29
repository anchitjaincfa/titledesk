import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-ink hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:border-brand",
  accent: "bg-accent text-accent-ink hover:opacity-90",
  ghost: "text-ink hover:bg-line/50",
};
const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
};

type Props = {
  children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; className?: string; href?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({ children, variant = "primary", size = "md", className = "", href, ...rest }: Props) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
