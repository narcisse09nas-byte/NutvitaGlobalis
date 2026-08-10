'use client';

import { useEffect, useRef, useState } from 'react';

type JitsiApi = { dispose: () => void };
type JitsiConstructor = new (domain: string, options: Record<string, unknown>) => JitsiApi;
type SecureSession = { domain: string; roomName: string; jwt: string; displayName: string };

async function loadJitsi(scriptUrl: string) {
  const globalWindow = window as unknown as { JitsiMeetExternalAPI?: JitsiConstructor };
  if (globalWindow.JitsiMeetExternalAPI) return globalWindow.JitsiMeetExternalAPI;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-jaas-script="${scriptUrl}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Chargement du service video impossible.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = scriptUrl; script.async = true; script.dataset.jaasScript = scriptUrl;
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Chargement du service video impossible.'));
    document.head.appendChild(script);
  });
  if (!globalWindow.JitsiMeetExternalAPI) throw new Error('Le service video est indisponible.');
  return globalWindow.JitsiMeetExternalAPI;
}

export default function VideoRoom({ roomName, displayName, provider = 'jitsi', meetingUrl, externalAccessToken, heightClassName = 'h-[70vh] min-h-[520px]' }: {
  roomName: string; displayName: string; provider?: string; meetingUrl?: string; externalAccessToken?: string; heightClassName?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(provider === 'jitsi');
  useEffect(() => {
    if (provider !== 'jitsi') return;
    let disposed = false;
    async function mount() {
      setLoading(true); setError('');
      const response = await fetch('/api/video/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ room_name: roomName, external_access_token: externalAccessToken }) });
      const session = await response.json() as SecureSession & { message?: string };
      if (!response.ok) throw new Error(session.message || 'Acces video refuse.');
      const appId = session.roomName.split('/')[0];
      const Constructor = await loadJitsi(`https://${session.domain}/${appId}/external_api.js`);
      if (disposed || !hostRef.current) return;
      apiRef.current = new Constructor(session.domain, { roomName: session.roomName, jwt: session.jwt, parentNode: hostRef.current, width: '100%', height: '100%', lang: 'fr', userInfo: { displayName: session.displayName || displayName }, configOverwrite: { prejoinConfig: { enabled: true }, disableDeepLinking: true, enableWelcomePage: false } });
      setLoading(false);
    }
    mount().catch(reason => { if (!disposed) { setLoading(false); setError(reason instanceof Error ? reason.message : 'Initialisation video impossible.'); } });
    return () => { disposed = true; apiRef.current?.dispose(); apiRef.current = null; };
  }, [provider, roomName, displayName, externalAccessToken]);
  if (provider === 'physical') return <div className="rounded-2xl border bg-white p-8 text-center"><p className="text-sm text-slate-500">Reunion presentielle</p><p className="mt-2 text-lg font-black">{meetingUrl || 'Lieu a confirmer'}</p></div>;
  if (provider === 'external') return <div className="rounded-2xl border bg-white p-8 text-center"><p className="text-sm text-slate-500">Reunion hebergee sur un service externe</p><a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 inline-flex">Ouvrir la reunion</a></div>;
  return <div className={`relative overflow-hidden rounded-2xl border bg-slate-900 ${heightClassName}`}>
    {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-slate-900 text-sm font-bold text-white">Ouverture de la salle securisee...</div>}
    <div ref={hostRef} className="h-full w-full" />
    {error && <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/95 p-6 text-center"><p className="max-w-lg rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p></div>}
  </div>;
}
