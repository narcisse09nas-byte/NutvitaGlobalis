"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { PPMNotification } from "@/lib/ppm/types";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<PPMNotification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("ppm_notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (active) setNotifications((data || []) as PPMNotification[]);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = notifications.filter(item => !item.read_at).length;

  async function markRead(notification: PPMNotification) {
    if (notification.read_at) return;
    const now = new Date().toISOString();
    const result = await createClient().from("ppm_notifications").update({ read_at: now }).eq("id", notification.id).select("*").single();
    if (!result.error) setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read_at: now } : item));
  }

  return <div ref={boxRef} className="relative">
    <button onClick={() => setOpen(current => !current)} className="relative rounded-full p-2 text-forest hover:bg-mint" aria-label="Notifications">
      <BellIcon className="h-6" />
      {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
    </button>
    {open && <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-2xl border bg-white p-2 shadow-2xl">
      <p className="px-3 py-2 text-xs font-black uppercase text-slate-400">Notifications</p>
      <div className="max-h-96 overflow-y-auto">
        {notifications.map(item => {
          const content = <div className={`rounded-xl px-3 py-2.5 text-sm ${item.read_at ? "text-slate-500" : "bg-mint/60 font-bold text-forest"}`}>
            <p>{item.title}</p>
            {item.message && <p className="mt-0.5 text-xs font-normal text-slate-500">{item.message}</p>}
            <p className="mt-1 text-[10px] font-normal uppercase text-slate-400">{new Date(item.created_at).toLocaleString("fr-FR")}</p>
          </div>;
          return item.link
            ? <Link key={item.id} href={item.link} onClick={() => markRead(item)} className="block">{content}</Link>
            : <button key={item.id} onClick={() => markRead(item)} className="block w-full text-left">{content}</button>;
        })}
        {!notifications.length && <p className="px-3 py-6 text-center text-sm text-slate-400">Aucune notification.</p>}
      </div>
    </div>}
  </div>;
}
