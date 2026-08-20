"use client";
import { createClient } from "@/lib/supabase/client";

export default function DocumentLink({ bucket, path, label }: { bucket: string; path: string; label: string }) {
  async function open() {
    const { data, error } = await createClient().storage.from(bucket).createSignedUrl(path, 120);
    if (!error && data) window.open(data.signedUrl, "_blank");
  }
  return <button onClick={open} type="button" className="rounded-lg bg-slate-50 px-3 py-2 text-left text-sm font-bold text-leaf hover:bg-mint">{label}</button>;
}
