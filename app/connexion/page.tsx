import AccountAuth from "@/components/client/AccountAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getCurrentLocale } from "@/lib/i18n-server";

export const metadata = { title: "Connexion" };

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string; identifiant?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const target = params.redirect || "/choisir-acces";
  const serviceLabel = target.startsWith("/surveys") ? "Support Food Security and Nutrition Survey" : undefined;
  return <main className="grid min-h-screen place-items-center bg-forest p-5"><div className="fixed right-5 top-5"><LanguageSwitcher compact /></div><AccountAuth mode="login" redirectTo={target} initialIdentifier={params.identifiant || ""} locale={locale} serviceLabel={serviceLabel}/></main>;
}
