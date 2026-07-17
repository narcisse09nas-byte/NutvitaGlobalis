"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PlatformSessionPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const values = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = values.get("access_token");
    const refreshToken = values.get("refresh_token");
    const requested = values.get("next") || "/academy/dashboard";
    const next = requested.startsWith("/academy/dashboard") ? requested : "/academy/dashboard";
    window.history.replaceState(null, "", window.location.pathname);
    if (!accessToken || !refreshToken) {
      setError("Session centrale manquante.");
      return;
    }
    void createSupabaseBrowserClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: sessionError }) => {
      if (sessionError) {
        setError("La session Academy n’a pas pu être ouverte. Vérifiez que les deux projets utilisent le même projet Supabase.");
        return;
      }
      window.location.replace(next);
    });
  }, []);

  return <main className="grid min-h-screen place-items-center bg-[#F8FAFC] p-6"><section className="w-full max-w-md rounded-3xl border bg-white p-8 text-center"><h1 className="text-2xl font-extrabold text-[#063D2E]">Ouverture de NutVitaGlobalis Academy</h1><p className="mt-4 text-slate-600">{error || "Transfert sécurisé de votre session en cours…"}</p>{error && <a href="/connexion" className="mt-6 inline-flex rounded-full bg-[#F58220] px-6 py-3 font-bold text-white">Revenir à la connexion générale</a>}</section></main>;
}
