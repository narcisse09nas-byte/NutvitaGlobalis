"use client";

import Link from "next/link";

import { Bell, CheckCheck } from "lucide-react";

import type { AcademyNotification } from "@/types/notification";

import { useNotifications } from "@/hooks/use-notifications";
import { useLanguage } from "@/hooks/use-language";

export function DashboardActivity({
  notifications,
}: {
  notifications: AcademyNotification[];
}) {
  const { markAsRead } = useNotifications();
  const { text } = useLanguage();

  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-bold uppercase tracking-[0.14em] text-[#F58220]">
            {text("Activité", "Activity")}
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-[#063D2E]">
            {text("Notifications importantes", "Important notifications")}
          </h2>
        </div>

        <Bell className="text-[#0B5D3B]" />
      </div>

      <div className="mt-6 space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-2xl bg-[#F8FAFC] p-5 text-center">
            <CheckCheck size={28} className="mx-auto text-[#0B5D3B]" />

            <p className="mt-3 text-sm text-slate-500">
              {text("Vous êtes à jour.", "You are all caught up.")}
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const content = (
              <div className="rounded-2xl bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-[#063D2E]">
                    {notification.title}
                  </p>

                  <span className="h-2 w-2 rounded-full bg-[#F58220]" />
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {notification.message}
                </p>
              </div>
            );

            return notification.href ? (
              <Link
                key={notification.id}
                href={notification.href}
                onClick={() => markAsRead(notification.id)}
              >
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            );
          })
        )}
      </div>

      <Link
        href="/dashboard/notifications"
        className="mt-6 inline-flex font-bold text-[#0B5D3B] hover:underline"
      >
        {text("Ouvrir le centre de notifications", "Open notification center")}
      </Link>
    </section>
  );
}
