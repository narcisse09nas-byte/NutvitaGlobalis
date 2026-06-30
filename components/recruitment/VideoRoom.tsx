'use client';

export default function VideoRoom({
  roomName,
  displayName,
  provider = 'jitsi',
  meetingUrl,
}: {
  roomName: string;
  displayName: string;
  provider?: string;
  meetingUrl?: string;
}) {
  if (provider === 'physical') {
    return <div className="rounded-2xl border bg-white p-8 text-center">
      <p className="text-sm text-slate-500">Reunion presentielle</p>
      <p className="mt-2 text-lg font-black">{meetingUrl || 'Lieu a confirmer'}</p>
    </div>;
  }
  if (provider === 'external') {
    return <div className="rounded-2xl border bg-white p-8 text-center">
      <p className="text-sm text-slate-500">Reunion hebergee sur un service externe</p>
      <a href={meetingUrl} target="_blank" rel="noreferrer" className="btn-primary mt-4 inline-flex">Ouvrir la reunion</a>
    </div>;
  }
  const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  const url = `https://${domain}/${encodeURIComponent(roomName)}#userInfo.displayName=${encodeURIComponent(displayName)}&config.prejoinPageEnabled=true&config.disableDeepLinking=true`;
  return <div className="overflow-hidden rounded-2xl border bg-slate-900">
    <iframe title="Salle d entretien video" src={url} allow="camera; microphone; fullscreen; display-capture; autoplay" className="h-[70vh] min-h-[520px] w-full" />
  </div>;
}
