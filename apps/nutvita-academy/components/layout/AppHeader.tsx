import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function AppHeader() {
  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-extrabold text-[#063D2E]">
          NutVita<span className="text-[#F58220]">Globalis</span> Academy
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          <Link href="/courses">Formations</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/courses/camms">CAMMS</Link>
        </nav>

        <div className="flex gap-3">
          <Button href="/login" variant="outline">Login</Button>
          <Button href="/register" variant="secondary">Register</Button>
        </div>
      </div>
    </header>
  );
}