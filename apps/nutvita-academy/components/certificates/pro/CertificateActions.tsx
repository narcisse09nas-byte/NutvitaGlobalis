"use client";

import { Button } from "@/components/ui/Button";

export function CertificateActions() {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-4">
      <Button href="/dashboard" variant="outline">
        Retour au dashboard
      </Button>

      <Button variant="secondary" onClick={() => window.print()}>
        Imprimer / Télécharger PDF
      </Button>
    </div>
  );
}