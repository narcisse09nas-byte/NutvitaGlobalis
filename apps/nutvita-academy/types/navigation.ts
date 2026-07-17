import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavigationSection = {
  title: string;
  items: NavigationItem[];
};