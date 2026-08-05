"use client";

export default function PrintCardButton() {
  return <button onClick={() => window.print()} className="btn-primary">Télécharger / imprimer ma carte</button>;
}
