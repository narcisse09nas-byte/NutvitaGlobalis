"use client";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import ChildGrowthPromo from "./ChildGrowthPromo";
import { stripLocale } from "@/lib/i18n";

export default function SiteChrome({children}:{children:React.ReactNode}) {
  const pathname = usePathname();
  const cleanPath = stripLocale(pathname).pathname;
  const privateArea = cleanPath.startsWith("/admin") || cleanPath.startsWith("/candidat") || cleanPath.startsWith("/partenaire") || cleanPath.startsWith("/espace-client") || cleanPath.startsWith("/checkout") || cleanPath === "/inscription" || cleanPath === "/connexion" || cleanPath === "/mot-de-passe-oublie";
  if (privateArea) return <>{children}</>;
  return <><Header/><main>{children}{cleanPath === "/" && <ChildGrowthPromo/>}</main><Footer/></>;
}
