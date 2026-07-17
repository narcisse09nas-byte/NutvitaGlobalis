"use client";
import Link from "next/link";
import { useTenant } from "@/hooks/use-tenant";
export default function OrganizationsPage() {
  const { organizations, activeOrganization, switchOrganization } = useTenant();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-bold uppercase tracking-wider text-[#F58220]">
            Multi-tenant
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
            Mes organisations
          </h1>
        </div>
        <Link
          href="/dashboard/organizations/new"
          className="h-fit rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
        >
          Nouvelle organisation
        </Link>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {organizations.map((o) => (
          <article
            key={o.id}
            className={`rounded-[26px] border bg-white p-6 ${activeOrganization?.id === o.id ? "border-[#0B5D3B] ring-2 ring-[#DDF5E8]" : "border-green-100"}`}
          >
            <h2 className="text-2xl font-extrabold text-[#063D2E]">{o.name}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {o.city}, {o.country}
            </p>
            <p className="mt-4 text-sm text-slate-600">{o.description}</p>
            <button
              onClick={() => switchOrganization(o.id)}
              className="mt-6 rounded-full border border-[#0B5D3B] px-5 py-2.5 font-bold text-[#0B5D3B]"
            >
              Activer
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
