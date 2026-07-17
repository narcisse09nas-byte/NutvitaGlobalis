"use client";

import { FormEvent, useState } from "react";
import { tenantRoleLabels } from "@/config/tenant-permissions";
import { useTenant } from "@/hooks/use-tenant";
import { useLanguage } from "@/hooks/use-language";
import type { TenantRole } from "@/types/tenant";

const roles: TenantRole[] = ["admin", "manager", "instructor", "reviewer", "member", "viewer"];

export function MembersManager() {
  const { activeMembers, inviteMember, updateMemberRole, toggleMemberActive, can } = useTenant();
  const { text } = useLanguage();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("member");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    inviteMember(email, role);
    setEmail("");
  }

  return (
    <div className="space-y-7">
      {can("members.invite") && (
        <form onSubmit={submit} className="rounded-[24px] border border-green-100 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@organisation.org" className="h-12 rounded-2xl border border-slate-200 px-4" />
            <select value={role} onChange={(event) => setRole(event.target.value as TenantRole)} aria-label={text("Rôle", "Role")} className="h-12 rounded-2xl border border-slate-200 px-4">
              {roles.map((item) => <option key={item} value={item}>{tenantRoleLabels[item]}</option>)}
            </select>
            <button className="h-12 rounded-full bg-[#F58220] px-6 font-bold text-white">{text("Inviter", "Invite")}</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-[24px] border border-green-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[#063D2E] text-left text-white">
            <tr><th className="px-5 py-4">{text("Membre", "Member")}</th><th className="px-5 py-4">{text("Rôle", "Role")}</th><th className="px-5 py-4">{text("Statut", "Status")}</th><th className="px-5 py-4">{text("Action", "Action")}</th></tr>
          </thead>
          <tbody>
            {activeMembers.map((member) => (
              <tr key={member.id} className="border-t">
                <td className="px-5 py-4"><b>{member.fullName}</b><div className="text-xs text-slate-500">{member.email}</div></td>
                <td className="px-5 py-4">{member.role === "owner" ? text("Propriétaire", "Owner") : <select value={member.role} disabled={!can("members.update")} onChange={(event) => updateMemberRole(member.id, event.target.value as TenantRole)}>{roles.map((item) => <option key={item} value={item}>{tenantRoleLabels[item]}</option>)}</select>}</td>
                <td className="px-5 py-4">{member.active ? text("Actif", "Active") : text("Désactivé", "Disabled")}</td>
                <td className="px-5 py-4">{member.role !== "owner" && can("members.remove") && <button onClick={() => toggleMemberActive(member.id)} className="font-bold text-[#0B5D3B]">{member.active ? text("Désactiver", "Disable") : text("Activer", "Enable")}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
