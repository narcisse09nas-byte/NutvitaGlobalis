import { NextResponse } from "next/server";
import { generateAndStoreContract } from "@/lib/contract-pdf";
import { resend } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  const id = String(body.id || "");
  const action = String(body.action || "");
  const { data: contract } = await supabase.from("contracts").select("*").eq("id", id).single();
  if (!contract) return NextResponse.json({ message: "Contrat introuvable." }, { status: 404 });
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", user.id).eq("active", true).maybeSingle();
  const isParty = contract.party_user_id === user.id;
  if (!admin && !isParty) return NextResponse.json({ message: "Acces refuse." }, { status: 403 });

  try {
    const privileged = createAdminClient();
    let updates: Record<string, unknown> = {};
    if (action === "generate" && admin) {
      await generateAndStoreContract(privileged, id);
    } else if (action === "send" && admin) {
      updates = { status: "sent", sent_at: new Date().toISOString() };
      await generateAndStoreContract(privileged, id);
      try {
        await resend("/emails", {
          from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
          to: [contract.party_email],
          subject: `Signature requise - ${contract.title}`,
          text: `Bonjour ${contract.party_name},\n\nVotre contrat NutVitaGlobalis est pret. Connectez-vous a votre espace securise pour le consulter et le signer.\n\nEquipe NutVitaGlobalis`,
        });
      } catch (error) {
        console.error("Contract email", error);
      }
    } else if (action === "open" && isParty && ["sent", "signed_by_nutvita"].includes(contract.status)) {
      updates = { status: contract.status === "sent" ? "opened" : contract.status, opened_at: contract.opened_at || new Date().toISOString(), received_at: contract.received_at || new Date().toISOString(), receipt_acknowledged_by: user.id };
    } else if (action === "archive" && admin) {
      updates = { status: "archived", archived_at: new Date().toISOString() };
    } else {
      return NextResponse.json({ message: "Action non autorisee." }, { status: 400 });
    }
    if (Object.keys(updates).length) {
      const updated = await privileged.from("contracts").update(updates).eq("id", id);
      if (updated.error) throw updated.error;
    }
    await privileged.from("contract_audit_logs").insert({
      contract_id: id,
      actor_id: user.id,
      event_type: action,
      ip_address: requestIp(request),
      user_agent: request.headers.get("user-agent"),
      details: { previous_status: contract.status },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Action impossible." }, { status: 500 });
  }
}
