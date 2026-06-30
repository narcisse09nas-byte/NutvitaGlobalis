'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, MonitorUp, RefreshCw, Wifi, WifiOff } from 'lucide-react';

type Assignment = {
  id: string;
  status: string;
  proctor_room?: string;
  last_heartbeat_at?: string;
  camera_started_at?: string;
  screen_started_at?: string;
  started_at?: string;
  expires_at?: string;
  event_counts: Record<string, number>;
  recent_events: Array<{ id: string; event_type: string; severity: string; created_at: string; details?: Record<string, unknown> }>;
  maximus_written_tests?: {
    title: string;
    proctoring_mode: 'activity' | 'live';
    require_camera: boolean;
    require_screen_share: boolean;
    track_audio_activity: boolean;
    track_face_presence: boolean;
  };
  maximus_staff_applications?: { full_name: string; email: string; maximus_job_offers?: { title: string; reference: string } };
};

export default function TestProctoringCockpit() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [domain, setDomain] = useState('meet.jit.si');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch('/api/maximus/recruitment/proctoring', { cache: 'no-store' });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) return setError(payload.message || 'Chargement impossible.');
    setItems(payload.items || []);
    setDomain(payload.jitsi_domain || 'meet.jit.si');
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const monitored = useMemo(() => items.filter(item => selected.includes(item.id) && item.proctor_room), [items, selected]);

  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 5 ? [...current, id] : current);
  }

  return <div className="grid gap-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-3xl font-black">Surveillance des tests</h2><p className="mt-1 text-sm text-slate-500">Cockpit humain de surveillance video, limite a cinq candidats simultanes pour maitriser les couts.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
    </div>
    {error && <p className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-end justify-between gap-4"><div><h3 className="text-xl font-black">Sessions surveillees</h3><p className="mt-1 text-sm text-slate-500">Selectionnez les salles a afficher dans la mosaïque.</p></div><b>{selected.length}/5</b></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Voir</th><th className="p-3">Candidat</th><th className="p-3">Epreuve</th><th className="p-3">Mode</th><th className="p-3">Connexion</th><th className="p-3">Camera</th><th className="p-3">Ecran</th><th className="p-3">Onglet</th><th className="p-3">Audio</th><th className="p-3">Visage</th><th className="p-3">Statut</th></tr></thead>
        <tbody>{items.length ? items.map(item => {
          const online = item.last_heartbeat_at && Date.now() - new Date(item.last_heartbeat_at).getTime() < 45000;
          const live = item.maximus_written_tests?.proctoring_mode === 'live';
          return <tr key={item.id} className="border-b align-top">
            <td className="p-3"><input type="checkbox" checked={selected.includes(item.id)} disabled={!item.proctor_room || (!selected.includes(item.id) && selected.length >= 5)} onChange={() => toggle(item.id)} /></td>
            <td className="p-3 font-semibold">{item.maximus_staff_applications?.full_name}<span className="block text-xs font-normal text-slate-400">{item.maximus_staff_applications?.email}</span></td>
            <td className="p-3">{item.maximus_written_tests?.title}<span className="block text-xs text-slate-400">{item.maximus_staff_applications?.maximus_job_offers?.reference}</span></td>
            <td className="p-3">{live ? 'Video + ecran' : 'Journal'}</td>
            <td className="p-3">{online ? <State icon={Wifi} label="En ligne" ok /> : <State icon={WifiOff} label={item.started_at ? 'Hors ligne' : 'N/A'} />}</td>
            <td className="p-3">{live ? <Metric count={item.event_counts.camera_stopped || 0} active={Boolean(item.camera_started_at)} /> : 'N/A'}</td>
            <td className="p-3">{live ? <Metric count={item.event_counts.screen_stopped || 0} active={Boolean(item.screen_started_at)} /> : 'N/A'}</td>
            <td className="p-3">{item.event_counts.tab_hidden || 0} sortie(s)</td>
            <td className="p-3">{item.maximus_written_tests?.track_audio_activity ? item.event_counts.speech_detected ? `${item.event_counts.speech_detected} episode(s)` : 'N/A' : 'Non collecte'}</td>
            <td className="p-3">{item.maximus_written_tests?.track_face_presence ? 'N/A' : 'Non collecte'}</td>
            <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{item.status}</span></td>
          </tr>;
        }) : <tr><td colSpan={11} className="h-28 text-center text-slate-500">Aucune session surveillee.</td></tr>}</tbody>
      </table></div>
    </section>

    {monitored.length > 0 && <section>
      <h3 className="mb-4 text-xl font-black">Mosaïque en direct</h3>
      <div className="grid gap-4 xl:grid-cols-2">{monitored.map(item => <article key={item.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b p-4"><div><h4 className="font-black">{item.maximus_staff_applications?.full_name}</h4><p className="text-xs text-slate-500">{item.maximus_written_tests?.title}</p></div><span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">LIVE</span></header>
        <iframe title={`Surveillance ${item.maximus_staff_applications?.full_name}`} src={`https://${domain}/${encodeURIComponent(item.proctor_room || '')}#config.prejoinConfig.enabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.disableDeepLinking=true&interfaceConfig.TILE_VIEW_MAX_COLUMNS=2`} allow="camera; microphone; fullscreen; display-capture; autoplay" className="h-[430px] w-full border-0" />
      </article>)}</div>
    </section>}

    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <h3 className="flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4" />Lecture responsable</h3>
      <p className="mt-2 leading-6">Une sortie d onglet, un bruit ou une perte de visage ne prouve pas une fraude. Ces éléments doivent être contextualisés par un surveillant, documentés et permettre au candidat de fournir une explication.</p>
    </section>
  </div>;
}

function State({ icon: Icon, label, ok = false }: { icon: typeof Wifi; label: string; ok?: boolean }) {
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${ok ? 'text-emerald-700' : 'text-slate-500'}`}><Icon className="h-3.5 w-3.5" />{label}</span>;
}

function Metric({ count, active }: { count: number; active: boolean }) {
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${active && count === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{active ? count ? `${count} interruption(s)` : 'Active' : 'N/A'}</span>;
}
