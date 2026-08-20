import CandidateShell from "@/components/candidate/CandidateShell";
import RecruitmentTestPanel from "@/components/candidate/RecruitmentTestPanel";
import CandidateWrittenTests from "@/components/staff-candidate/CandidateWrittenTests";
import TestEcritClient from "@/components/candidate/TestEcritClient";
import { requireCandidate } from "@/lib/recruitment";
import { getCandidatureCards } from "@/lib/candidate-unified";

export default async function TestPage() {
  const { supabase, user } = await requireCandidate();
  const cards = (await getCandidatureCards(supabase, user.id)).filter(c => c.hasTest);

  const recruitmentCard = cards.find(c => c.track === "recruitment_dietitian" || c.track === "recruitment_promoter");
  const staffCard = cards.find(c => c.track === "staff");

  let recruitmentSlot = null;
  if (recruitmentCard) {
    const { data: app } = await supabase.from("recruitment_applications").select("status,full_name").eq("candidate_id", user.id).maybeSingle();
    const { data: attempt } = await supabase.from("recruitment_test_attempts").select("id,status,reviewer_comments").eq("application_id", recruitmentCard.applicationId).maybeSingle();
    const { data: comments } = attempt ? await supabase.from("test_candidate_comments").select("id,message,created_at").eq("track", "recruitment").eq("test_ref_id", attempt.id).order("created_at", { ascending: false }) : { data: [] };
    recruitmentSlot = <RecruitmentTestPanel
      applicationTitle={recruitmentCard.title}
      candidateId={user.id}
      candidateName={app?.full_name || user.user_metadata.full_name || ""}
      applicationStatus={app?.status || ""}
      attempt={attempt || null}
      comments={comments || []}
    />;
  }

  return (
    <CandidateShell email={user.email || ""}>
      <div className="mb-7">
        <h1 className="text-3xl font-black">Test écrit</h1>
        <p className="mt-2 text-slate-500">Retrouvez ici les épreuves écrites associées à vos candidatures.</p>
      </div>
      <TestEcritClient cards={cards} recruitmentSlot={recruitmentSlot} staffSlot={staffCard ? <CandidateWrittenTests /> : null} />
    </CandidateShell>
  );
}
