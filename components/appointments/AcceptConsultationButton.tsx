"use client";

import { useState } from "react";
import { CalendarCheck, X } from "lucide-react";

export default function AcceptConsultationButton({
  requestId,
  requestType,
  requestedStart,
  english = false,
}: {
  requestId: string;
  requestType: "dietetic" | "medical";
  requestedStart?: string | null;
  english?: boolean;
}) {
  const t = (fr: string, en: string) => english ? en : fr;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const initialDate = requestedStart ? new Date(requestedStart) : new Date(Date.now() + 86_400_000);
  const local = new Date(initialDate.getTime() - initialDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/consultation-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "accept",
        request_type: requestType,
        request_id: requestId,
        proposed_start: form.get("proposed_start"),
        duration_minutes: Number(form.get("duration_minutes") || 45),
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.message || t("Acceptation impossible.", "Unable to accept."));
    setMessage(t("Rendez-vous confirmé. Le client a reçu le lien de paiement.", "Appointment confirmed. The client received the payment link."));
    setTimeout(() => location.reload(), 900);
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="btn-primary px-3 py-2">
      <CalendarCheck className="h-4 w-4" /> {t("Accepter / ajuster", "Accept / adjust")}
    </button>
    {open ? <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-12 max-w-xl rounded-[30px] bg-forest p-5 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4 text-white">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-orange">NutVitaGlobalis</p><h2 className="mt-2 text-2xl font-black">{t("Confirmer le rendez-vous", "Confirm appointment")}</h2></div>
          <button type="button" onClick={() => setOpen(false)} aria-label={t("Fermer", "Close")}><X /></button>
        </div>
        <div className="mt-6 grid gap-4 rounded-3xl bg-white p-5">
          <label className="text-sm font-bold">{t("Date et heure proposées", "Proposed date and time")}<input name="proposed_start" type="datetime-local" min={new Date().toISOString().slice(0, 16)} defaultValue={local} required className="admin-input mt-2 w-full" /></label>
          <label className="text-sm font-bold">{t("Durée", "Duration")}<select name="duration_minutes" defaultValue="45" className="admin-input mt-2 w-full"><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label>
          {message ? <p className="rounded-xl bg-mint p-3 text-sm font-bold text-leaf">{message}</p> : null}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t("Annuler", "Cancel")}</button><button disabled={saving} className="btn-primary">{saving ? t("Confirmation…", "Confirming…") : t("Confirmer", "Confirm")}</button></div>
        </div>
      </form>
    </div> : null}
  </>;
}
