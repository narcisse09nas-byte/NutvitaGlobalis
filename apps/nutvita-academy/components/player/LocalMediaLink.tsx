"use client";

import { useEffect, useState } from "react";
import { isLocalMediaUrl, resolveLocalMedia } from "@/lib/local-media-storage";
import { useLanguage } from "@/hooks/use-language";

export function LocalMediaLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const { text } = useLanguage();
  const [resolved, setResolved] = useState(isLocalMediaUrl(href) ? "" : href);
  useEffect(() => {
    let objectUrl = "";
    if (!isLocalMediaUrl(href)) { setResolved(href); return; }
    void resolveLocalMedia(href).then((url) => { objectUrl = url; setResolved(url); });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [href]);
  return <a href={resolved || undefined} target="_blank" rel="noreferrer" aria-disabled={!resolved} className={className}>{resolved ? children : text("Préparation du document…", "Preparing document…")}</a>;
}
