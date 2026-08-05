import Link from "next/link";
import { LifebuoyIcon } from "@heroicons/react/24/outline";

export default function HelpBox({ title = "Besoin d'aide ?", text, href = "/support", label = "Contacter le support" }: { title?: string; text: string; href?: string; label?: string }) {
  return <div className="mt-6 rounded-2xl bg-white/10 p-4 text-white">
    <p className="font-black">{title}</p>
    <p className="mt-2 text-xs leading-5 text-white/70">{text}</p>
    <Link href={href} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25"><LifebuoyIcon className="h-4 w-4" />{label}</Link>
  </div>;
}
