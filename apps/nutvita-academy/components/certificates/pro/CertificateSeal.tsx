import { ShieldCheck } from "lucide-react";

export function CertificateSeal() {
  return (
    <div className="nvg-seal">
      <div className="nvg-seal-inner">
        <ShieldCheck size={28} />
        <p>EXCELLENCE</p>
        <p>KNOWLEDGE</p>
        <p>IMPACT</p>
        <span>★</span>
      </div>
    </div>
  );
}