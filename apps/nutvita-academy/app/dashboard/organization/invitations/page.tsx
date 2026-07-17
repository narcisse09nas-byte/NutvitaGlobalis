"use client";
import { useTenant } from "@/hooks/use-tenant";
import { useLanguage } from "@/hooks/use-language";
export default function Page() {
  const { text } = useLanguage();
  const { activeInvitations, revokeInvitation } = useTenant();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-4xl font-extrabold text-[#063D2E]">Invitations</h1>
      <div className="mt-8 space-y-4">
        {activeInvitations.map((i) => (
          <article key={i.id} className="rounded-[24px] border bg-white p-6">
            <b>{i.email}</b>
            <p className="text-sm text-slate-500">
              {text("Rôle", "Role")} : {i.role} · {text("Statut", "Status")} : {i.status}
            </p>
            {i.status === "pending" && (
              <button
                onClick={() => revokeInvitation(i.id)}
                className="mt-4 font-bold text-red-600"
              >
                {text("Révoquer", "Revoke")}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
