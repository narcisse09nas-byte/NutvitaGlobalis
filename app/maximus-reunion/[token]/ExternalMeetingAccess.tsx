"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, ShieldCheck, Video } from "lucide-react";
import VideoRoom from "@/components/recruitment/VideoRoom";

type Row = Record<string, any>;

export default function ExternalMeetingAccess({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Row | null>(null);
  const [message, setMessage] = useState("");
  const [joined, setJoined] = useState(false);
  useEffect(() => { fetch(`/api/maximus/meetings/external/${token}`).then(async response => ({ response, body: await response.json() })).then(({ response, body }) => response.ok ? setInvitation(body.invitation) : setMessage(body.message)); }, [token]);
  async function action(value: "accept" | "decline") {
    const response = await fetch(`/api/maximus/meetings/external/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value }) });
    if (response.ok && value === "accept") setJoined(true);
    if (response.ok && value === "decline") setMessage("Invitation declinee.");
  }
  if (message) return <main className="grid min-h-screen place-items-center bg-[#123d32] p-5"><p className="max-w-lg bg-white p-7 font-bold text-red-700">{message}</p></main>;
  if (!invitation) return <main className="grid min-h-screen place-items-center bg-[#123d32] text-white">Verification de l invitation...</main>;
  const meeting = Array.isArray(invitation.maximus_meetings) ? invitation.maximus_meetings[0] : invitation.maximus_meetings;
  if (joined && meeting.provider !== "physical") return <main className="min-h-screen bg-slate-950 p-4"><div className="mx-auto max-w-7xl"><header className="mb-3 text-white"><p className="text-xs font-black uppercase text-[#ef7f3b]">Reunion externe Maximus</p><h1 className="text-2xl font-black text-white">{meeting.title}</h1></header><VideoRoom roomName={meeting.room_name} displayName={invitation.full_name} provider={meeting.provider} meetingUrl={meeting.meeting_url}/></div></main>;
  return <main className="min-h-screen bg-[#123d32] p-5"><section className="mx-auto mt-12 max-w-2xl bg-white p-8 shadow-2xl"><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Invitation confidentielle</p><h1 className="mt-2 text-3xl font-black">Reunion Maximus</h1><h2 className="mt-7 text-2xl font-black">{meeting.title}</h2><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p className="flex items-center gap-2"><Calendar className="h-4 text-emerald-700"/>{new Date(meeting.scheduled_at).toLocaleString("fr-FR")}</p><p className="flex items-center gap-2"><Clock className="h-4 text-emerald-700"/>{meeting.duration_minutes} minutes</p>{meeting.location && <p className="flex items-center gap-2"><MapPin className="h-4 text-emerald-700"/>{meeting.location}</p>}</div>{meeting.agenda && <div className="mt-6 border-l-4 border-[#ef7f3b] bg-slate-50 p-4"><b>Ordre du jour</b><p className="mt-2 whitespace-pre-wrap text-sm">{meeting.agenda}</p></div>}<p className="mt-6 flex gap-2 text-xs text-slate-500"><ShieldCheck className="h-4"/>Ce lien est personnel. Ne le transferez pas.</p><div className="mt-7 flex flex-wrap gap-3">{meeting.provider === "physical" ? <button onClick={() => action("accept")} className="rounded-md bg-[#24945f] px-5 py-3 font-bold text-white">Confirmer ma presence</button> : <button onClick={() => action("accept")} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 font-bold text-white"><Video className="h-5"/>Accepter et rejoindre</button>}<button onClick={() => action("decline")} className="rounded-md border px-5 py-3 font-bold">Decliner</button></div></section></main>;
}
