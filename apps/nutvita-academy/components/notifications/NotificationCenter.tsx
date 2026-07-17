"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  Bell,
  CheckCheck,
} from "lucide-react";

import { useNotifications } from "@/hooks/use-notifications";
import { useLanguage } from "@/hooks/use-language";

import { NotificationItem } from "@/components/notifications/NotificationItem";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement>(
      null
    );

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const recentNotifications =
    notifications.slice(0, 5);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (current) =>
              !current
          )
        }
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-[#063D2E]"
        aria-label="Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#F58220] px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-[24px] border border-green-100 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-[#063D2E]">
                Notifications
              </h2>

              <p className="text-xs text-slate-500">
                {unreadCount} non lue
                {unreadCount > 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={
                markAllAsRead
              }
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0B5D3B]"
            >
              <CheckCheck
                size={16}
              />

              Tout lire
            </button>
          </div>

          <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto">
            {recentNotifications
              .length === 0 ? (
              <div className="rounded-2xl bg-[#F8FAFC] p-6 text-center text-sm text-slate-500">
                Aucune notification.
              </div>
            ) : (
              recentNotifications.map(
                (notification) => (
                  <NotificationItem
                    key={
                      notification.id
                    }
                    notification={
                      notification
                    }
                    onRead={() =>
                      markAsRead(
                        notification.id
                      )
                    }
                    onDismiss={() =>
                      dismissNotification(
                        notification.id
                      )
                    }
                  />
                )
              )
            )}
          </div>

          <Link
            href="/dashboard/notifications"
            onClick={() =>
              setIsOpen(false)
            }
            className="mt-4 block rounded-full bg-[#0B5D3B] px-5 py-3 text-center text-sm font-bold text-white"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationCenter() {
  const { text } = useLanguage();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            {text("Vos notifications", "Your notifications")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 rounded-full border border-green-200 px-4 py-2 text-sm font-bold text-[#0B5D3B]"
          >
            <CheckCheck size={17} />
            {text("Tout marquer comme lu", "Mark all as read")}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-[#F8FAFC] px-6 py-12 text-center">
          <Bell className="mx-auto text-[#0B5D3B]" size={30} />
          <p className="mt-4 font-bold text-[#063D2E]">
            {text("Aucune notification", "No notifications")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {text("Les nouvelles activités apparaîtront ici.", "New activity will appear here.")}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead(notification.id)}
              onDismiss={() => dismissNotification(notification.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
