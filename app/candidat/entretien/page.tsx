import CandidateShell from "@/components/candidate/CandidateShell";
import EntretienRegistry, { type InterviewRow } from "@/components/candidate/EntretienRegistry";
import { requireCandidate } from "@/lib/recruitment";
import { getCandidatureCards, getLatestNotifications } from "@/lib/candidate-unified";

export default async function InterviewPage() {
  const { supabase, user } = await requireCandidate();
  const cards = (await getCandidatureCards(supabase, user.id)).filter(c => c.hasInterview);
  const notifications = await getLatestNotifications(supabase, user.id, cards);
  const candidateName = user.user_metadata?.full_name || "Candidat";

  const recruitmentCard = cards.find(c => c.track === "recruitment_dietitian" || c.track === "recruitment_promoter");
  const medicalCards = cards.filter(c => c.track === "medical");
  const staffCards = cards.filter(c => c.track === "staff");

  const rows: InterviewRow[] = [];

  if (recruitmentCard) {
    const { data } = await supabase.from("video_interviews").select("*").eq("application_id", recruitmentCard.applicationId).neq("status", "cancelled").order("scheduled_at", { ascending: false }).limit(1).maybeSingle();
    rows.push({
      key: recruitmentCard.key, track: recruitmentCard.track, applicationTitle: recruitmentCard.title,
      scheduledAt: data?.scheduled_at || null, durationMinutes: data?.duration_minutes || null,
      status: data?.status || "en_attente", provider: data?.provider || "jitsi", meetingUrl: data?.meeting_url || null,
      roomName: data?.room_name || null, candidateName,
    });
  }

  for (const card of medicalCards) {
    const { data } = await supabase.from("medical_specialist_interviews").select("*").eq("application_id", card.applicationId).neq("status", "cancelled").order("scheduled_at", { ascending: false }).limit(1).maybeSingle();
    rows.push({
      key: card.key, track: card.track, applicationTitle: card.title,
      scheduledAt: data?.scheduled_at || null, durationMinutes: data?.duration_minutes || null,
      status: data?.status || "en_attente", provider: "external", meetingUrl: data?.meeting_url || null,
      roomName: data?.meeting_room || null, candidateName,
    });
  }

  for (const card of staffCards) {
    const { data } = await supabase.from("maximus_recruitment_interviews").select("*").eq("application_id", card.applicationId).neq("status", "cancelled").order("scheduled_at", { ascending: false }).limit(1).maybeSingle();
    rows.push({
      key: card.key, track: card.track, applicationTitle: card.title,
      scheduledAt: data?.scheduled_at || null, durationMinutes: data?.duration_minutes || null,
      status: data?.status || "en_attente", provider: data?.provider || "jitsi", meetingUrl: data?.meeting_url || null,
      roomName: data?.room_name || null, candidateName,
    });
  }

  return (
    <CandidateShell email={user.email || ""}>
      <div className="mb-7">
        <h1 className="text-3xl font-black">Entretien</h1>
        <p className="mt-2 text-slate-500">Retrouvez ici les entretiens planifiés pour chacune de vos candidatures.</p>
      </div>
      <EntretienRegistry rows={rows} notifications={notifications} cards={cards} />
    </CandidateShell>
  );
}
