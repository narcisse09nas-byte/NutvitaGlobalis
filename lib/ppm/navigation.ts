// Typed nav-group data for PPMShell, kept as data rather than inlined JSX so later sprints
// can append groups (Portefeuilles, Programmes, Projets, WBS, Budget...) by editing this
// array, not the shell component itself. Sprint 1 deliberately ships a short list — no
// links to sections that don't exist yet.

import type { ComponentType, SVGProps } from "react";
import { ArchiveBoxIcon, BriefcaseIcon, BuildingOffice2Icon, ClipboardDocumentListIcon, HomeIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

export type PPMIcon = ComponentType<SVGProps<SVGSVGElement>>;
export type PPMNavItem = { href: string; label: string; icon: PPMIcon; description?: string };
export type PPMNavGroup = { title: string; items: PPMNavItem[] };

export const PPM_NAV_GROUPS: PPMNavGroup[] = [
  {
    title: "Accueil",
    items: [
      { href: "/op-management", label: "Vue d'ensemble", icon: HomeIcon },
    ],
  },
  {
    title: "Structure",
    items: [
      { href: "/op-management/organisations", label: "Organisations", icon: BuildingOffice2Icon },
      { href: "/op-management/portefeuilles", label: "Portefeuilles", icon: Squares2X2Icon },
      { href: "/op-management/programmes", label: "Programmes", icon: BriefcaseIcon },
      { href: "/op-management/projets", label: "Projets", icon: ClipboardDocumentListIcon },
    ],
  },
  {
    title: "Outils existants",
    items: [
      { href: "/op-management/legacy", label: "NFI, Estimateur besoins et autres outils", icon: ArchiveBoxIcon, description: "Ouvre l'application actuelle (non modifiee)" },
    ],
  },
];
