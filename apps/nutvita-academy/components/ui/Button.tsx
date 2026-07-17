import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  className?: string;
};

export function Button({
  children,
  href,
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-[#0B5D3B] text-white hover:bg-[#063D2E]",
    secondary: "bg-[#F58220] text-white hover:bg-orange-600",
    outline:
      "border border-[#0B5D3B] text-[#0B5D3B] bg-white hover:bg-[#DDF5E8]",
    ghost: "text-[#0B5D3B] hover:bg-[#DDF5E8]",
  };

  const classes = cn(
    "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    styles[variant],
    className
  );

  if (href) return <Link href={href} className={classes}>{children}</Link>;

  return <button className={classes} {...props}>{children}</button>;
}