import { redirect } from "next/navigation";

export default function LegacyCertificateVerificationPage() {
  redirect("/verify/CAMMS-2026-0001");
}
