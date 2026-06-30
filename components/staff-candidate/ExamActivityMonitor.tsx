'use client';

import { useEffect } from 'react';

export default function ExamActivityMonitor({ assignmentId, trackTabs, trackDisconnects }: {
  assignmentId: string;
  trackTabs: boolean;
  trackDisconnects: boolean;
}) {
  useEffect(() => {
    const send = (event_type: string, severity: 'info' | 'warning' | 'critical' = 'info', details: Record<string, unknown> = {}) => {
      void fetch('/api/maximus/recruitment/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId, event_type, severity, details, client_recorded_at: new Date().toISOString() }),
        keepalive: true,
      });
    };
    send('session_started');
    const visibility = () => {
      const allowed = Boolean(window.__maximusFilePickerUntil && window.__maximusFilePickerUntil > Date.now());
      if (trackTabs) send(document.hidden ? 'tab_hidden' : 'tab_visible', document.hidden && !allowed ? 'warning' : 'info', { allowed_file_dialog: allowed });
    };
    const offline = () => trackDisconnects && send('offline', 'critical');
    const online = () => trackDisconnects && send('online');
    const blur = () => {
      const allowed = Boolean(window.__maximusFilePickerUntil && window.__maximusFilePickerUntil > Date.now());
      if (trackTabs) send('window_blur', allowed ? 'info' : 'warning', { allowed_file_dialog: allowed });
    };
    const focus = () => trackTabs && send('window_focus');
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    const timer = window.setInterval(() => send('heartbeat', 'info', { online: navigator.onLine, visible: !document.hidden }), 15000);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      window.clearInterval(timer);
    };
  }, [assignmentId, trackTabs, trackDisconnects]);
  return null;
}
