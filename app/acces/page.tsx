import { redirect } from "next/navigation";

export const metadata = { title: "Se connecter" };

export default function AccessPage() {
  redirect("/connexion");
}
