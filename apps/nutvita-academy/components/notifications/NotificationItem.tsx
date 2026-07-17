"use client";

import Link from "next/link";

import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  Gift,
  Trash2,
} from "lucide-react";

import type {
  AcademyNotification,
} from "@/types/notification";
import { useLanguage } from "@/hooks/use-language";

const notificationIcons = {
  learning: BookOpen,
  quiz: CheckCircle2,
  exam: FileCheck2,
  certificate: Award,
  reward: Gift,
  system: Bell,
};

export function NotificationItem({
  notification,
  onRead,
  onDismiss,
}: {
  notification: AcademyNotification;

  onRead: () => void;
  onDismiss: () => void;
}) {
  const { locale, text } = useLanguage();
  const Icon =
    notificationIcons[
      notification.type
    ];

  const content = (
    <div
      className={`flex min-w-0 flex-1 items-start gap-4 rounded-2xl p-4 transition ${
        notification.readAt
          ? "bg-[#F8FAFC]"
          : "bg-[#DDF5E8]"
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0B5D3B]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-extrabold text-[#063D2E]">
            {
              locale === "en" ? notification.titleEn || notification.title : notification.title
            }
          </p>

          {!notification.readAt && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#F58220]" />
          )}
        </div>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          {
            locale === "en" ? notification.messageEn || notification.message : notification.message
          }
        </p>

        <p className="mt-2 text-xs text-slate-400">
          {new Date(
            notification.createdAt
          ).toLocaleString(
            locale === "fr" ? "fr-FR" : "en-US"
          )}
        </p>
      </div>
    </div>
  );

  return (
    <article className="flex items-start gap-2">
      {notification.href ? (
        <Link
          href={notification.href}
          onClick={onRead}
          className="min-w-0 flex-1"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRead}
          className="min-w-0 flex-1 text-left"
        >
          {content}
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
        aria-label={text("Supprimer la notification", "Delete notification")}
      >
        <Trash2 size={16} />
      </button>
    </article>
  );
}
