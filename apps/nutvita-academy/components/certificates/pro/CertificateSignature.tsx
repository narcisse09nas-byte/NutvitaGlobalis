export function CertificateSignature({ directorName }: { directorName: string }) {
  return (
    <div className="nvg-signature">
      <div>{directorName}</div>
      <p>Academic Director</p>
      <strong>NutVitaGlobalis Academy</strong>
    </div>
  );
}