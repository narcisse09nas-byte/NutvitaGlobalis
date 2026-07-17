"use client";

import type { ElementType, ReactNode } from "react";
import { useLanguage } from "@/hooks/use-language";

type Props = {
  fr: ReactNode;
  en: ReactNode;
  as?: ElementType;
  className?: string;
};

export function LocalizedText({
  fr,
  en,
  as: Component = "span",
  className,
}: Props) {
  const { locale } = useLanguage();
  return (
    <Component className={className}>{locale === "fr" ? fr : en}</Component>
  );
}
