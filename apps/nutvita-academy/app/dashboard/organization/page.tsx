"use client";
import Link from "next/link";
import { useTenant } from "@/hooks/use-tenant";
import { useLanguage } from "@/hooks/use-language";
export default function Page() {
  const { text } = useLanguage();
  const { activeOrganization, activeMembers, activeMembership } = useTenant();
  if (!activeOrganization)
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Link
          href="/dashboard/organizations/new"
          className="rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
        >
          {text("Créer une organisation", "Create an organization")}
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section
        className="rounded-[30px] p-8 text-white"
        style={{ background: activeOrganization.branding.primaryColor }}
      >
        <p className="uppercase tracking-wider text-white/70">
          {text("Organisation active", "Active organization")}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold">
          {activeOrganization.name}
        </h1>
        <p className="mt-3 text-white/80">{activeOrganization.description}</p>
      </section>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/dashboard/organization/members"
          className="rounded-[24px] border bg-white p-6"
        >
          <b>{text("Membres", "Members")}</b>
          <p className="mt-2 text-3xl font-extrabold">{activeMembers.length}</p>
        </Link>
        <Link
          href="/dashboard/organization/invitations"
          className="rounded-[24px] border bg-white p-6"
        >
          <b>{text("Invitations", "Invitations")}</b>
        </Link>
        <Link
          href="/dashboard/organization/settings"
          className="rounded-[24px] border bg-white p-6"
        >
          <b>{text("Paramètres", "Settings")}</b>
        </Link>
        <Link
          href="/dashboard/organization/billing"
          className="rounded-[24px] border bg-white p-6"
        >
          <b>{text("Rôle", "Role")}</b>
          <p>{activeMembership?.role}</p>
        </Link>
      </div>
    </div>
  );
}
