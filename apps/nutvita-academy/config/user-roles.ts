import type { LocalUserRole } from "@/types/local-auth";

export type UserRoleDefinition = {
  label: string;
  description: string;
};

export const userRoles: Record<
  LocalUserRole,
  UserRoleDefinition
> = {
  student: {
    label: "Apprenant",
    description:
      "Accès aux formations, quiz, examens et certificats.",
  },

  instructor: {
    label: "Formateur",
    description:
      "Accès à la gestion pédagogique des formations.",
  },

  admin: {
    label: "Administrateur",
    description:
      "Accès à la gestion des utilisateurs et des contenus.",
  },

  super_admin: {
    label: "Super administrateur",
    description:
      "Accès complet à l’ensemble de la plateforme.",
  },
};