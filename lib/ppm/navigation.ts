// Typed nav-group data for PPMShell, kept as data rather than inlined JSX so later sprints
// can append groups (Portefeuilles, Programmes, Projets, WBS, Budget...) by editing this
// array, not the shell component itself. Sprint 1 deliberately ships a short list — no
// links to sections that don't exist yet.

import type { ComponentType, SVGProps } from "react";
import { ArchiveBoxIcon, BriefcaseIcon, BuildingOffice2Icon, CalendarDaysIcon, ClipboardDocumentListIcon, HomeIcon, Squares2X2Icon, TruckIcon } from "@heroicons/react/24/outline";

export type PPMIcon = ComponentType<SVGProps<SVGSVGElement>>;
export type PPMNavItem = { href: string; label: string; labelEn: string; icon: PPMIcon; description?: string; descriptionEn?: string };
export type PPMNavGroup = { title: string; titleEn: string; items: PPMNavItem[] };

export const PPM_NAV_GROUPS: PPMNavGroup[] = [
  {
    title: "Accueil", titleEn: "Home",
    items: [
      { href: "/op-management", label: "Vue d'ensemble", labelEn: "Overview", icon: HomeIcon },
    ],
  },
  {
    title: "Structure", titleEn: "Structure",
    items: [
      { href: "/op-management/organisations", label: "Organisations", labelEn: "Organizations", icon: BuildingOffice2Icon },
      { href: "/op-management/portefeuilles", label: "Portefeuilles", labelEn: "Portfolios", icon: Squares2X2Icon },
      { href: "/op-management/programmes", label: "Programmes", labelEn: "Programs", icon: BriefcaseIcon },
      { href: "/op-management/projets", label: "Projets", labelEn: "Projects", icon: ClipboardDocumentListIcon },
      { href: "/op-management/operations", label: "Operations", labelEn: "Operations", icon: TruckIcon },
      { href: "/op-management/taches", label: "Tableau de taches", labelEn: "Task board", icon: CalendarDaysIcon },
    ],
  },
  {
    title: "Outils existants", titleEn: "Existing tools",
    items: [
      { href: "/op-management/legacy", label: "NFI, Estimateur besoins et autres outils", labelEn: "NFI, Needs Estimator and other tools", icon: ArchiveBoxIcon, description: "Ouvre l'application actuelle (non modifiee)", descriptionEn: "Opens the current application (unchanged)" },
    ],
  },
];
