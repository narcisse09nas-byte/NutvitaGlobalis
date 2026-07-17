"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  CalendarPlus,
} from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";

import type {
  LiveProvider,
} from "@/types/live-session";
import { useLanguage } from "@/hooks/use-language";

export function CreateLiveSessionForm() {
  const { text } = useLanguage();
  const router =
    useRouter();

  const {
    createSession,
  } = useLiveSessions();

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    provider,
    setProvider,
  ] = useState<LiveProvider>(
    "jitsi"
  );

  const [
    roomName,
    setRoomName,
  ] = useState("");

  const [
    externalUrl,
    setExternalUrl,
  ] = useState("");

  const [startAt, setStartAt] =
    useState("");

  const [endAt, setEndAt] =
    useState("");

  const [capacity, setCapacity] =
    useState(100);

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !title.trim() ||
      !startAt ||
      !endAt
    ) {
      return;
    }

    const session =
      await createSession({
        title: title.trim(),
        description:
          description.trim(),
        provider,
        roomName:
          provider === "jitsi"
            ? roomName.trim() ||
              title
                .trim()
                .toLowerCase()
                .replace(
                  /[^a-z0-9]+/g,
                  "-"
                )
            : undefined,
        externalUrl:
          provider === "jitsi"
            ? undefined
            : externalUrl.trim(),
        startAt:
          new Date(
            startAt
          ).toISOString(),
        endAt:
          new Date(
            endAt
          ).toISOString(),
        timezone:
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone,
        capacity,
      });

    if (session) {
      router.push(
        `/dashboard/live/${session.id}`
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[28px] border border-green-100 bg-white p-7"
    >
      <CalendarPlus className="text-[#0B5D3B]" />

      <h2 className="mt-4 text-2xl font-extrabold text-[#063D2E]">
        {text("Nouvelle classe virtuelle", "New virtual class")}
      </h2>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            {text("Titre", "Title")}
          </span>

          <input
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            {text("Description", "Description")}
          </span>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            {text("Plateforme", "Platform")}
          </span>

          <select
            value={provider}
            onChange={(event) =>
              setProvider(
                event.target
                  .value as LiveProvider
              )
            }
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          >
            <option value="jitsi">
              {text("Jitsi intégré", "Embedded Jitsi")}
            </option>

            <option value="zoom">
              Zoom
            </option>

            <option value="google_meet">
              Google Meet
            </option>

            <option value="external">
              {text("Autre lien", "Other link")}
            </option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            {text("Capacité", "Capacity")}
          </span>

          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(event) =>
              setCapacity(
                Number(
                  event.target.value
                )
              )
            }
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>

        {provider === "jitsi" ? (
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-[#063D2E]">
              {text("Nom de la salle Jitsi", "Jitsi room name")}
            </span>

            <input
              value={roomName}
              onChange={(event) =>
                setRoomName(
                  event.target.value
                )
              }
              placeholder="nutvita-camms-session-01"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4"
            />
          </label>
        ) : (
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-[#063D2E]">
              {text("Lien de réunion", "Meeting link")}
            </span>

            <input
              type="url"
              value={externalUrl}
              onChange={(event) =>
                setExternalUrl(
                  event.target.value
                )
              }
              placeholder="https://..."
              className="h-12 w-full rounded-2xl border border-slate-200 px-4"
            />
          </label>
        )}

        <label>
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            {text("Début", "Start")}
          </span>

          <input
            type="datetime-local"
            value={startAt}
            onChange={(event) =>
              setStartAt(
                event.target.value
              )
            }
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            {text("Fin", "End")}
          </span>

          <input
            type="datetime-local"
            value={endAt}
            onChange={(event) =>
              setEndAt(
                event.target.value
              )
            }
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-7 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
      >
        {text("Créer la session", "Create session")}
      </button>
    </form>
  );
}
