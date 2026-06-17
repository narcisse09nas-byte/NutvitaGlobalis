"use client";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Question = { id: string; category: string; type: "qcm" | "multi_qcm" | "open" | "case_study" | "file_upload"; prompt: string; options?: string[]; points: number; allow_external_window?: boolean; file_instructions?: string };
type TestData = { attempt_id: string; expires_at: string; status: string; answers: Record<string, any>; questions: Question[]; settings?: { title?: string; instructions?: string; camera_required?: boolean } };

export default function WrittenTest({ eligible, completed, candidateId, candidateName }: { eligible: boolean; completed: boolean; candidateId: string; candidateName: string }) {
  const [test, setTest] = useState<TestData | null>(null), [seconds, setSeconds] = useState(0), [message, setMessage] = useState(""), [loading, setLoading] = useState(false), [identity, setIdentity] = useState(false), [photo, setPhoto] = useState<Blob | null>(null), [camera, setCamera] = useState(false), [cameraSkipped, setCameraSkipped] = useState(false), [switches, setSwitches] = useState(0), [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null), video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null), router = useRouter();
  const log = useCallback(async (type: string, details: Record<string, unknown> = {}) => { if (test) await createClient().rpc("log_test_event", { p_attempt_id: test.attempt_id, p_event_type: type, p_details: details }); }, [test]);

  async function enableCamera() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (video.current) video.current.srcObject = stream.current;
      setCamera(true); setCameraSkipped(false);
    } catch {
      setCameraSkipped(true);
      setMessage("Camera non activee. Vous pouvez continuer, mais cette absence sera signalee a l equipe et pourrait vous porter prejudice.");
    }
  }
  function capture() {
    if (!video.current) return;
    const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth || 640; canvas.height = video.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => { if (blob) { setPhoto(blob); setMessage("Photo capturee. Vous pouvez commencer le test."); } }, "image/jpeg", 0.82);
    stream.current?.getTracks().forEach(track => track.stop()); setCamera(false);
  }
  async function start() {
    if (!identity) { setMessage("Confirmez d abord votre identite."); return; }
    setLoading(true);
    const previousAttempt = sessionStorage.getItem("nutvita-test-attempt"), supabase = createClient();
    const { data, error } = await supabase.rpc("start_recruitment_test");
    if (error) { setMessage(error.message); setLoading(false); return; }
    const current = data as TestData; setTest(current);
    if (photo) {
      const path = `${candidateId}/test-identity/${crypto.randomUUID()}.jpg`;
      const uploaded = await supabase.storage.from("recruitment-documents").upload(path, photo, { contentType: "image/jpeg" });
      if (!uploaded.error) await supabase.rpc("confirm_test_identity", { p_photo_path: path });
    } else {
      await supabase.rpc("log_test_event", { p_attempt_id: current.attempt_id, p_event_type: "camera_not_enabled", p_details: { candidate: candidateName } });
    }
    await supabase.rpc("log_test_event", { p_attempt_id: current.attempt_id, p_event_type: previousAttempt === current.attempt_id ? "reconnected" : "started", p_details: { identity_name: candidateName, camera_enabled: Boolean(photo) } });
    sessionStorage.setItem("nutvita-test-attempt", current.attempt_id); setLoading(false);
  }
  useEffect(() => () => stream.current?.getTracks().forEach(track => track.stop()), []);
  useEffect(() => { if (!test) return; const tick = () => { const left = Math.max(0, Math.floor((new Date(test.expires_at).getTime() - Date.now()) / 1000)); setSeconds(left); if (left === 0) submit(true); }; tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, [test]);
  useEffect(() => { if (!test) return; const visibility = () => { if (document.hidden) { const allowed = Boolean(activeQuestion?.allow_external_window); setSwitches(value => { const next = value + 1; log("tab_hidden", { count: next, question_id: activeQuestion?.id, external_window_allowed: allowed }); return next; }); } else log("tab_visible"); }; window.addEventListener("offline", () => log("connection_lost")); window.addEventListener("online", () => log("reconnected")); document.addEventListener("visibilitychange", visibility); return () => document.removeEventListener("visibilitychange", visibility); }, [test, log, activeQuestion]);
  function answer(id: string, value: any) { if (!test) return; const next = { ...test, answers: { ...test.answers, [id]: value } }; setTest(next); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(async () => { const { error } = await createClient().rpc("save_recruitment_test_answers", { p_answers: next.answers }); setMessage(error ? error.message : "Reponses sauvegardees automatiquement."); }, 700); }
  async function uploadAnswer(question: Question, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || !test) return;
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-"), path = `${candidateId}/test-answers/${test.attempt_id}/${question.id}-${crypto.randomUUID()}-${safe}`;
    const uploaded = await createClient().storage.from("recruitment-documents").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (uploaded.error) setMessage(uploaded.error.message); else answer(question.id, { name: file.name, path });
  }
  async function submit(expired = false) { if (!test) return; if (!expired && seconds > 0 && !confirm("Terminer et soumettre definitivement le test ?")) return; await log("submission_requested", { expired }); const { data, error } = await createClient().rpc("submit_recruitment_test"); if (error) { setMessage(error.message); return; } await fetch("/api/recruitment/test-complete", { method: "POST" }); sessionStorage.removeItem("nutvita-test-attempt"); setMessage(`Test termine. Score QCM automatique : ${data}%.`); setTest(null); router.refresh(); }
  if (completed) return <Panel title="Test ecrit termine" text="Votre tentative et son journal ont ete enregistres. Les evenements de surveillance sont examines uniquement par un humain." />;
  if (!eligible) return <Panel title="Test non disponible" text="Le test sera accessible uniquement apres une invitation officielle dans votre espace candidat." />;
  if (!test) return <div className="rounded-2xl border bg-white p-8"><h2 className="text-2xl font-black">Confirmation d'identite</h2><p className="mt-3 leading-7 text-slate-500">Confirmez votre identite. La camera est recommandee pour une verification raisonnable, mais le test ne sera pas bloque si votre appareil ne permet pas son activation.</p><label className="mt-5 flex gap-3 rounded-xl bg-mint p-4"><input type="checkbox" checked={identity} onChange={e => setIdentity(e.target.checked)} className="h-5 w-5" /><span>Je confirme etre <b>{candidateName || "le candidat associe a ce compte"}</b>.</span></label><div className="mt-5">{camera ? <><video ref={video} autoPlay playsInline muted className="max-h-80 w-full rounded-2xl bg-slate-900 object-cover" /><button onClick={capture} className="btn-primary mt-3">Capturer la photo</button></> : photo ? <div className="rounded-xl bg-mint p-4 font-bold text-forest">Photo capturee avec succes.</div> : <div className="flex flex-wrap gap-3"><button onClick={enableCamera} className="btn-secondary">Activer la camera</button><button onClick={() => { setCameraSkipped(true); setMessage("Camera non activee. Cette information sera visible par l'administration."); }} className="btn-secondary">Continuer sans camera</button></div>}</div>{cameraSkipped && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">La camera n'est pas activee. Cela pourrait etre pris en compte dans l'evaluation.</p>}<p className="mt-5 text-sm text-slate-500">Une seule tentative. Les changements d'onglet sont journalises sans blocage automatique.</p>{message && <p className="mt-4 text-sm font-semibold text-orange">{message}</p>}<button onClick={start} disabled={loading || !identity} className="btn-primary mt-6 disabled:opacity-50">{loading ? "Preparation..." : "Commencer le test"}</button></div>;
  return <div><div className="sticky top-3 z-20 mb-6 flex items-center justify-between rounded-2xl bg-forest p-5 text-white shadow-xl"><div><b>{test.settings?.title || "Test en cours"}</b><p className="text-xs text-white/60">Sauvegarde automatique · Sorties detectees : {switches}</p></div><div className="text-2xl font-black text-orange">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div></div>{test.settings?.instructions && <p className="mb-5 rounded-xl bg-white p-4 text-sm text-slate-600">{test.settings.instructions}</p>}{switches >= 3 && <p className="mb-5 rounded-xl bg-orange/10 p-4 text-sm font-bold text-orange">Plusieurs sorties de page ont ete detectees. Elles seront examinees par l'equipe.</p>}<div className="grid gap-5">{test.questions.map((q, i) => <section key={q.id} onFocus={() => setActiveQuestion(q)} onMouseEnter={() => setActiveQuestion(q)} className="rounded-2xl border bg-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-leaf">{q.category} · {q.points} point(s)</p><h2 className="mt-3 text-lg font-black">{i + 1}. {q.prompt}</h2>{q.allow_external_window && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Cette question autorise temporairement l'ouverture d'une autre fenetre pour produire ou consulter un fichier de travail.</p>}{q.type === "qcm" ? <div className="mt-5 grid gap-3">{q.options?.map(option => <label key={option} className="flex cursor-pointer gap-3 rounded-xl border p-4"><input type="radio" name={q.id} checked={test.answers[q.id] === option} onChange={() => answer(q.id, option)} />{option}</label>)}</div> : q.type === "multi_qcm" ? <div className="mt-5 grid gap-3">{q.options?.map(option => { const current = Array.isArray(test.answers[q.id]) ? test.answers[q.id] : []; return <label key={option} className="flex cursor-pointer gap-3 rounded-xl border p-4"><input type="checkbox" checked={current.includes(option)} onChange={() => answer(q.id, current.includes(option) ? current.filter((x: string) => x !== option) : [...current, option])} />{option}</label> })}</div> : q.type === "file_upload" ? <div className="mt-5"><p className="mb-3 text-sm text-slate-500">{q.file_instructions || "Joignez votre fichier de reponse."}</p><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={e => uploadAnswer(q, e)} />{test.answers[q.id]?.name && <p className="mt-2 text-sm font-bold text-leaf">{test.answers[q.id].name}</p>}</div> : <textarea rows={q.type === "case_study" ? 9 : 5} className="admin-input mt-5" value={test.answers[q.id] || ""} onChange={e => answer(q.id, e.target.value)} placeholder="Votre reponse..." />}</section>)}</div>{message && <p className="my-4 text-sm font-semibold text-leaf">{message}</p>}<button onClick={() => submit(false)} className="btn-primary mt-6">Terminer le test</button></div>;
}
function Panel({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border bg-white p-8"><h2 className="text-2xl font-black">{title}</h2><p className="mt-3 text-slate-500">{text}</p></div> }
