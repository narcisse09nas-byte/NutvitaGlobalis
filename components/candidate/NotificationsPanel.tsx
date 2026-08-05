"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function NotificationsPanel({ initial }: { initial: Row[] }) {
  const [notifications, setNotifications] = useState(initial);
  const unread = notifications.filter(item => !item.read_at);

  async function markAllRead() {
    if (!unread.length) return;
    const now = new Date().toISOString();
    const supabase = createClient();
    await supabase.from("recruitment_notifications").update({ read_at: now }).in("id", unread.map(item => item.id));
    setNotifications(notifications.map(item => item.read_at ? item : { ...item, read_at: now }));
  }

  return <div className="rounded-2xl border bg-white p-6">
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xl font-black">Notifications{unread.length > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-orange px-1.5 text-xs font-black text-white">{unread.length}</span>}</h2>
      {unread.length > 0 && <button onClick={markAllRead} className="text-xs font-black text-leaf">✓ Tout marquer comme lu</button>}
    </div>
    <div className="mt-5 grid gap-3">
      {notifications.slice(0, 8).map(item => <div key={item.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
        <div className="flex-1">
          <b className="text-forest">{item.title}</b>
          <p className="mt-1 text-sm text-slate-600">{item.message}</p>
          <span className="mt-2 block text-xs text-slate-400">{new Date(item.created_at).toLocaleString("fr-FR")}</span>
        </div>
        {!item.read_at && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange" aria-label="Non lu" />}
      </div>)}
      {!notifications.length && <p className="text-sm text-slate-400">Aucune notification.</p>}
    </div>
  </div>;
}
