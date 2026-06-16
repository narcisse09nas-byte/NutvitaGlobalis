import { NextResponse } from "next/server";
import { generateAndStoreContract } from "@/lib/contract-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json();
  const contractId = String(body.contract_id || "");
  const signaturePath = String(body.signature_path || "");
  const signerName = String(body.signer_name || "").trim();
  const { data: contract } = await supabase
    .from("contracts")
    .select("*, contract_signatures(*)")
    .eq("id", contractId)
    .single();
  if (!contract || !signaturePath || !signerName) {
    return NextResponse.json({ message: "Signature invalide." }, { status: 400 });
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();
  const isParty = contract.party_user_id === user.id;
  if (!admin && !isParty) return NextResponse.json({ message: "Acces refuse." }, { status: 403 });

  const role = admin ? "nutvita" : contract.contract_type === "partner" ? "partner" : "client";
  if (contract.contract_signatures?.some((signature: Record<string, unknown>) => signature.signer_role === role)) {
    return NextResponse.json({ message: "Cette partie a deja signe." }, { status: 409 });
  }

  const signedAt = new Date().toISOString();
  const hashInput = new TextEncoder().encode(`${contractId}|${user.id}|${role}|${signedAt}|${signaturePath}`);
  const digest = await crypto.subtle.digest("SHA-256", hashInput);
  const signatureHash = Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, "0")).join("");
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    // Authorization uses the user's session; privileged writes happen only after that check.
    const privileged = createAdminClient();
    const inserted = await privileged.from("contract_signatures").insert({
      contract_id: contractId,
      signer_id: user.id,
      signer_role: role,
      signer_name: signerName,
      signature_path: signaturePath,
      signed_at: signedAt,
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
      signature_hash: signatureHash,
      consent_text: "Je reconnais avoir lu le document et accepte de le signer electroniquement.",
    });
    if (inserted.error) throw inserted.error;

    const roles = [...(contract.contract_signatures || []).map((signature: Record<string, unknown>) => signature.signer_role), role];
    const complete = roles.includes("nutvita") && roles.includes(contract.contract_type === "partner" ? "partner" : "client");
    const status = complete ? "completed" : role === "nutvita" ? "signed_by_nutvita" : "signed_by_party";
    const updated = await privileged.from("contracts").update({ status, completed_at: complete ? signedAt : null }).eq("id", contractId);
    if (updated.error) throw updated.error;
    await privileged.from("contract_audit_logs").insert({
      contract_id: contractId,
      actor_id: user.id,
      event_type: "signed",
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
      details: { role, hash: signatureHash },
    });
    await generateAndStoreContract(privileged, contractId);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "La signature n'a pas pu etre finalisee." }, { status: 500 });
  }
}
