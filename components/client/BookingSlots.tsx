"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BookingSlots({ bookingId, initial = [] }: { bookingId: string; initial?: string[] }) {
  const [slots, setSlots] = useState<string[]>(initial), [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Array.from(new FormData(event.currentTarget).getAll("slot")).map(String).filter(Boolean);
    const { error } = await createClient().from("consultation_bookings").update({ preferred_slots: values }).eq("id", bookingId);
    if (error) setMessage(error.message); else { setSlots(values); setMessage("Vos disponibilites ont ete transmises."); }
  }
  return <form onSubmit={save} className="mt-4 grid gap-3"><p className="text-sm text-slate-500">Proposez jusqu a trois creneaux. L equipe confirmera la date finale.</p>{[0,1,2].map(index=><input key={index} name="slot" type="datetime-local" defaultValue={slots[index]?.slice(0,16)||""} className="admin-input"/>)}<button className="btn-secondary justify-self-start px-4 py-2">Enregistrer mes creneaux</button>{message&&<p className="text-sm font-bold text-leaf">{message}</p>}</form>;
}
