import { Award, Ban, CheckCircle2, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import type { ReactNode } from "react";

type VerificationRecord = {
  certificate_number: string;
  status: string;
  recipient_name: string;
  course_title: string;
  course_code: string;
  final_score: number;
  issued_at: string;
  revoked_at: string | null;
};

export async function PublicCertificateVerification({ certificateId }: { certificateId: string }) {
  if (!isSupabaseConfigured()) return <main className="min-h-screen bg-[#F8FAFC] px-6 py-16"><section className="mx-auto max-w-2xl rounded-[30px] border border-amber-200 bg-white p-8 text-center"><Search className="mx-auto text-amber-600" size={48} /><LocalizedText as="h1" className="mt-5 text-3xl font-extrabold text-[#063D2E]" fr="Registre public non configuré" en="Public registry not configured" /><LocalizedText as="p" className="mt-4 text-slate-600" fr="Renseignez les clés Supabase puis appliquez la migration 006 pour activer la vérification publique. Aucun certificat local n’est présenté comme authentique." en="Set the Supabase keys, then apply migration 006 to enable public verification. No local certificate is presented as authentic." /></section></main>;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("verify_certificate", { public_certificate_number: certificateId });
  const record = (data as VerificationRecord[] | null)?.[0] ?? null;
  const valid = record?.status === "valid" && !record.revoked_at;
  return <main className="min-h-screen bg-[#F8FAFC] px-6 py-16"><section className="mx-auto max-w-2xl rounded-[30px] border border-green-100 bg-white p-8 text-center shadow-sm"><div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{valid ? <CheckCircle2 size={42} /> : record ? <Ban size={42} /> : <Search size={42} />}</div><LocalizedText as="p" className="mt-6 font-bold uppercase tracking-[0.16em] text-[#F58220]" fr="Registre public NutVitaGlobalis Academy" en="NutVitaGlobalis Academy public registry" /><LocalizedText as="h1" className="mt-3 text-3xl font-extrabold text-[#063D2E]" fr={valid ? "Certificat authentique" : record ? "Certificat non valide" : "Certificat introuvable"} en={valid ? "Authentic certificate" : record ? "Invalid certificate" : "Certificate not found"} />{error && <LocalizedText as="p" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800" fr="Le registre de vérification n’est pas encore disponible. Vérifiez que la migration Supabase 006 est appliquée." en="The verification registry is not available yet. Check that Supabase migration 006 has been applied." />}{record ? <div className="mt-8 grid gap-4 text-left sm:grid-cols-2"><Field label={<LocalizedText fr="Titulaire" en="Holder" />} value={record.recipient_name} /><Field label={<LocalizedText fr="Formation" en="Course" />} value={`${record.course_code} — ${record.course_title}`} /><Field label={<LocalizedText fr="Numéro" en="Number" />} value={record.certificate_number} /><Field label={<LocalizedText fr="Date de délivrance" en="Issue date" />} value={record.issued_at.slice(0, 10)} /><Field label={<LocalizedText fr="Score final" en="Final score" />} value={`${Number(record.final_score)}%`} /><Field label={<LocalizedText fr="Statut" en="Status" />} value={record.status.toUpperCase()} /></div> : <p className="mt-6 text-slate-600"><LocalizedText fr="Aucun certificat publié ne correspond au numéro" en="No published certificate matches number" /> <strong className="font-mono text-[#063D2E]">{certificateId}</strong>.</p>}<div className="mt-8 flex items-center justify-center gap-2 border-t pt-6 text-sm text-slate-500"><Award size={18} /><LocalizedText fr="Vérification effectuée directement dans le registre serveur." en="Verification performed directly against the server registry." /></div></section></main>;
}

function Field({ label, value }: { label: ReactNode; value: string }) {
  return <div className="rounded-2xl bg-[#F8FAFC] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 font-extrabold text-[#063D2E]">{value}</p></div>;
}
