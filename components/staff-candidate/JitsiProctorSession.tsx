'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, MonitorUp, ShieldCheck } from 'lucide-react';

type JitsiApi = {
  addListener: (event: string, listener: (payload: Record<string, unknown>) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  dispose: () => void;
  isVideoMuted?: () => Promise<boolean>;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    __maximusFilePickerUntil?: number;
  }
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: (() => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type EventInput = { event_type: string; severity?: 'info' | 'warning' | 'critical'; details?: Record<string, unknown> };

export default function JitsiProctorSession({
  assignmentId,
  roomName,
  candidateName,
  requireCamera,
  requireScreen,
  trackTabs,
  trackDisconnects,
  trackAudio,
  active,
  onReadiness,
}: {
  assignmentId: string;
  roomName: string;
  candidateName: string;
  requireCamera: boolean;
  requireScreen: boolean;
  trackTabs: boolean;
  trackDisconnects: boolean;
  trackAudio: boolean;
  active: boolean;
  onReadiness: (state: { joined: boolean; camera: boolean; screen: boolean }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const queueRef = useRef<EventInput[]>([]);
  const [joined, setJoined] = useState(false);
  const [camera, setCamera] = useState(!requireCamera);
  const [screen, setScreen] = useState(!requireScreen);
  const [error, setError] = useState('');

  function emit(event: EventInput) {
    queueRef.current.push(event);
    if (queueRef.current.length >= 5 || ['critical', 'warning'].includes(event.severity || '')) void flush();
  }

  async function flush() {
    const events = queueRef.current.splice(0);
    if (!events.length) return;
    const response = await fetch('/api/maximus/recruitment/proctoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: assignmentId,
        events: events.map(event => ({ ...event, client_recorded_at: new Date().toISOString() })),
      }),
    });
    if (!response.ok) queueRef.current.unshift(...events);
  }

  useEffect(() => onReadiness({ joined, camera, screen }), [joined, camera, screen, onReadiness]);

  useEffect(() => {
    let disposed = false;
    const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
    async function mount() {
      if (!window.JitsiMeetExternalAPI) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[data-jitsi-domain="${domain}"]`) as HTMLScriptElement | null;
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Chargement Jitsi impossible.')), { once: true });
            return;
          }
          const script = document.createElement('script');
          script.src = `https://${domain}/external_api.js`;
          script.async = true;
          script.dataset.jitsiDomain = domain;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Chargement Jitsi impossible.'));
          document.head.appendChild(script);
        });
      }
      if (disposed || !hostRef.current || !window.JitsiMeetExternalAPI) return;
      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: hostRef.current,
        width: '100%',
        height: 390,
        lang: 'fr',
        userInfo: { displayName: candidateName },
        configOverwrite: {
          prejoinConfig: { enabled: false },
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          toolbarButtons: ['microphone', 'camera', 'desktop', 'hangup', 'settings'],
        },
        interfaceConfigOverwrite: { TILE_VIEW_MAX_COLUMNS: 2 },
      });
      apiRef.current = api;
      api.addListener('videoConferenceJoined', () => {
        setJoined(true);
        emit({ event_type: 'conference_joined' });
        api.isVideoMuted?.().then(muted => {
          setCamera(!muted);
          if (!muted) emit({ event_type: 'camera_started' });
        }).catch(() => undefined);
      });
      api.addListener('videoConferenceLeft', () => {
        setJoined(false);
        emit({ event_type: 'conference_left', severity: active ? 'critical' : 'warning' });
      });
      api.addListener('videoMuteStatusChanged', payload => {
        const enabled = payload.muted === false;
        setCamera(enabled);
        emit({ event_type: enabled ? 'camera_started' : 'camera_stopped', severity: enabled ? 'info' : 'warning' });
      });
      api.addListener('screenSharingStatusChanged', payload => {
        const enabled = payload.on === true;
        setScreen(enabled);
        emit({ event_type: enabled ? 'screen_started' : 'screen_stopped', severity: enabled ? 'info' : 'critical', details: payload });
      });
      api.addListener('cameraError', payload => {
        setCamera(false);
        setError('La camera ne peut pas etre utilisee. Verifiez les permissions du navigateur.');
        emit({ event_type: 'camera_error', severity: 'critical', details: payload });
      });
      api.addListener('micError', payload => emit({ event_type: 'camera_error', severity: 'warning', details: { source: 'microphone', ...payload } }));
    }
    mount().catch(reason => setError(reason instanceof Error ? reason.message : 'Initialisation Jitsi impossible.'));
    return () => {
      disposed = true;
      void flush();
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [assignmentId, roomName]);

  useEffect(() => {
    const onVisibility = () => {
      if (!trackTabs) return;
      const allowedFileDialog = Boolean(window.__maximusFilePickerUntil && window.__maximusFilePickerUntil > Date.now());
      emit({ event_type: document.hidden ? 'tab_hidden' : 'tab_visible', severity: document.hidden && !allowedFileDialog ? 'warning' : 'info', details: { allowed_file_dialog: allowedFileDialog } });
    };
    const onOnline = () => trackDisconnects && emit({ event_type: 'online' });
    const onOffline = () => trackDisconnects && emit({ event_type: 'offline', severity: 'critical' });
    const onBlur = () => {
      const allowedFileDialog = Boolean(window.__maximusFilePickerUntil && window.__maximusFilePickerUntil > Date.now());
      if (trackTabs) emit({ event_type: 'window_blur', severity: allowedFileDialog ? 'info' : 'warning', details: { allowed_file_dialog: allowedFileDialog } });
    };
    const onFocus = () => trackTabs && emit({ event_type: 'window_focus' });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => {
      emit({ event_type: 'heartbeat', details: { online: navigator.onLine, visible: !document.hidden, camera, screen } });
      void flush();
    }, 15000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [trackTabs, trackDisconnects, camera, screen]);

  useEffect(() => {
    if (!trackAudio || !joined) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = () => emit({ event_type: 'speech_detected', severity: 'warning', details: { transcript_stored: false } });
    recognition.onerror = () => undefined;
    recognition.onend = () => {
      if (active) {
        try { recognition.start(); } catch { /* Browser controls restart availability. */ }
      }
    };
    try { recognition.start(); } catch { return; }
    return () => recognition.stop();
  }, [trackAudio, joined, active]);

  return <section className="rounded-md border bg-slate-50 p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-black">Salle de surveillance</h3><p className="text-xs text-slate-500">Seuls le candidat et les surveillants autorises utilisent cette salle.</p></div>
      <div className="flex gap-2 text-xs font-bold">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${camera ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}><Camera className="h-3.5 w-3.5" />Camera</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${screen ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}><MonitorUp className="h-3.5 w-3.5" />Ecran</span>
      </div>
    </div>
    <div ref={hostRef} className="min-h-[390px] overflow-hidden rounded-md bg-slate-900" />
    <div className="mt-3 flex flex-wrap gap-2">
      {requireCamera && !camera && <button type="button" onClick={() => apiRef.current?.executeCommand('toggleVideo')} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-bold"><Camera className="h-4 w-4" />Activer la camera</button>}
      {requireScreen && !screen && <button type="button" onClick={() => apiRef.current?.executeCommand('toggleShareScreen')} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-sm font-bold text-white"><MonitorUp className="h-4 w-4" />Partager mon ecran</button>}
      {joined && camera && screen && <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" />Exigences satisfaites</span>}
    </div>
    {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
  </section>;
}
