import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion / Sign in | NutVitaGlobalis Academy",
  description: "Accéder à votre espace / Access your NutVitaGlobalis Academy workspace.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
