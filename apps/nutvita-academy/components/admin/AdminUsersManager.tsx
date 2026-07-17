"use client";

import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import { isLocalSuperAdminEmail } from "@/lib/local-auth";
import type { AcademyRole } from "@/types/admin";
import { useLanguage } from "@/hooks/use-language";

const roleLabels: Record<AcademyRole, { fr: string; en: string }> = {
  student: { fr: "Apprenant", en: "Learner" },
  instructor: { fr: "Formateur", en: "Instructor" },
  admin: { fr: "Administrateur", en: "Administrator" },
  super_admin: { fr: "Super administrateur", en: "Super administrator" },
};

export function AdminUsersManager() {
  const { locale, text } = useLanguage();
  const { data, addUser, updateRole, toggleActive } = useAdmin();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AcademyRole>("instructor");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = addUser({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role,
    });
    if (!result.success) {
      setMessage({ type: "error", text: result.error ?? text("Impossible de créer ce compte.", "Unable to create this account.") });
      return;
    }
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("instructor");
    setMessage({ type: "success", text: text("Le compte a été créé et peut maintenant se connecter.", "The account was created and can now sign in.") });
  }

  return (
    <div className="space-y-7">
      <form onSubmit={submit} className="rounded-[24px] border border-green-100 bg-white p-6">
        <div className="flex items-center gap-3">
          <UserPlus className="text-[#0B5D3B]" />
          <h2 className="text-xl font-extrabold text-[#063D2E]">{text("Créer un compte utilisateur", "Create a user account")}</h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={text("Nom complet", "Full name")} className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#0B5D3B]" />
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={text("Adresse email", "Email address")} className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#0B5D3B]" />
          <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={text("Mot de passe (8 caractères min.)", "Password (8 characters min.)")} className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#0B5D3B]" />
          <select value={role} onChange={(event) => setRole(event.target.value as AcademyRole)} className="h-12 rounded-2xl border border-slate-200 bg-[#FFF8DD] px-4 text-[#063D2E]">
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}
          </select>
        </div>

        {message && <p className={`mt-4 text-sm font-semibold ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>}
        <button type="submit" className="mt-5 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white">{text("Créer le compte", "Create account")}</button>
      </form>

      <div className="overflow-x-auto rounded-[24px] border border-green-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[#063D2E] text-left text-white"><tr><th className="px-5 py-4">{text("Utilisateur", "User")}</th><th className="px-5 py-4">{text("Rôle", "Role")}</th><th className="px-5 py-4">{text("Statut", "Status")}</th><th className="px-5 py-4">Action</th></tr></thead>
          <tbody>
            {data.users.map((item) => {
              const protectedAccount = isLocalSuperAdminEmail(item.email);
              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-5 py-4"><p className="font-bold text-[#063D2E]">{item.fullName}</p><p className="text-xs text-slate-500">{item.email}</p>{protectedAccount && <p className="mt-1 text-xs font-bold text-[#B76A00]">{text("Compte super administrateur protégé", "Protected super administrator account")}</p>}</td>
                  <td className="px-5 py-4">
                    <select disabled={protectedAccount} value={item.role} onChange={(event) => updateRole(item.id, event.target.value as AcademyRole)} className="rounded-xl border border-slate-200 bg-[#FFF8DD] px-3 py-2 text-[#063D2E] disabled:cursor-not-allowed disabled:opacity-70">
                      {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{item.active ? text("Actif", "Active") : text("Désactivé", "Disabled")}</span></td>
                  <td className="px-5 py-4"><button disabled={protectedAccount} type="button" onClick={() => toggleActive(item.id)} className="font-bold text-[#0B5D3B] disabled:cursor-not-allowed disabled:text-slate-400">{protectedAccount ? text("Protégé", "Protected") : item.active ? text("Désactiver", "Disable") : text("Activer", "Enable")}</button></td>
                </tr>
              );
            })}
            {data.users.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">{text("Aucun utilisateur local.", "No local user.")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
