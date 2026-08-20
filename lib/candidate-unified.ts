import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applicationStatuses, type ApplicationStatus } from "@/lib/recruitment-data";

export type CandidatureTrack = "recruitment_dietitian" | "recruitment_promoter" | "medical" | "staff";

export type CandidatureCard = {
  key: string;
  track: CandidatureTrack;
  applicationId: string;
  title: string;
  subtitle?: string;
  status: string;
  statusLabel: string;
  submittedAt: string | null;
  updatedAt: string | null;
  percent: number;
  hasTest: boolean;
  hasInterview: boolean;
  dossierHref: string;
};

export const medicalStatusLabels: Record<string, string> = {
  pending: "Dossier en attente",
  additional_documents: "Documents complémentaires demandés",
  interview_invited: "Invité à l'entretien",
  interview_scheduled: "Entretien planifié",
  interview_completed: "Entretien terminé",
  recruited: "Retenu",
  rejected: "Non retenu",
  inconclusive: "Non concluant",
  disabled: "Dossier désactivé",
};

export const staffStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Candidature soumise",
  under_review: "En cours d'analyse",
  invited_to_test: "Invité au test écrit",
  test_in_progress: "Test en cours",
  test_submitted: "Test soumis",
  test_graded: "Test corrigé",
  invited_to_interview: "Invité à l'entretien",
  interview_completed: "Entretien terminé",
  offer_proposed: "Proposition d'embauche",
  offer_accepted: "Proposition acceptée",
  offer_declined: "Proposition déclinée",
  hired: "Recruté",
  rejected: "Non retenu",
  withdrawn: "Candidature retirée",
};

function recruitmentPercent(status: ApplicationStatus) {
  if (["selected", "rejected", "integrated"].includes(status)) return 100;
  if (["invited_to_interview", "interview_completed"].includes(status)) return 75;
  if (["invited_to_test", "test_completed"].includes(status)) return 50;
  if (["submitted", "under_review", "incomplete", "preselected"].includes(status)) return 25;
  return 5;
}
function medicalPercent(status: string) {
  if (["recruited", "rejected", "inconclusive", "disabled"].includes(status)) return 100;
  if (["interview_scheduled", "interview_completed"].includes(status)) return 75;
  if (status === "interview_invited") return 60;
  if (status === "additional_documents") return 35;
  return 20;
}
function staffPercent(status: string) {
  if (["hired", "rejected", "withdrawn", "offer_declined"].includes(status)) return 100;
  if (["offer_proposed", "offer_accepted"].includes(status)) return 90;
  if (["invited_to_interview", "interview_completed"].includes(status)) return 75;
  if (["invited_to_test", "test_in_progress", "test_submitted", "test_graded"].includes(status)) return 50;
  if (["submitted", "under_review"].includes(status)) return 25;
  return 5;
}

export async function getCandidatureCards(supabase: SupabaseClient, userId: string): Promise<CandidatureCard[]> {
  const [{ data: recruitment }, { data: medical }, { data: staff }] = await Promise.all([
    supabase.from("recruitment_applications").select("id,recruitment_type,status,submitted_at,updated_at,job_offer_id").eq("candidate_id", userId).maybeSingle(),
    supabase.from("medical_specialist_applications").select("id,specialty,status,applied_at,updated_at").eq("candidate_id", userId).order("applied_at", { ascending: false }),
    supabase.from("maximus_staff_applications").select("id,status,submitted_at,created_at,updated_at,maximus_job_offers(title,reference)").eq("candidate_id", userId).order("created_at", { ascending: false }),
  ]);

  const cards: CandidatureCard[] = [];

  if (recruitment) {
    const status = recruitment.status as ApplicationStatus;
    const isPromoter = recruitment.recruitment_type === "promoter";
    cards.push({
      key: `recruitment:${recruitment.id}`,
      track: isPromoter ? "recruitment_promoter" : "recruitment_dietitian",
      applicationId: recruitment.id,
      title: isPromoter ? "Candidature promoteur" : "Candidature diététicien-nutritionniste",
      subtitle: recruitment.job_offer_id ? "Offre publiée" : "Candidature spontanée",
      status,
      statusLabel: applicationStatuses[status] || status,
      submittedAt: recruitment.submitted_at,
      updatedAt: recruitment.updated_at,
      percent: recruitmentPercent(status),
      hasTest: true,
      hasInterview: true,
      dossierHref: isPromoter ? "/candidat/dossier?type=promoter" : "/candidat/dossier",
    });
  }

  for (const item of medical || []) {
    cards.push({
      key: `medical:${item.id}`,
      track: "medical",
      applicationId: item.id,
      title: "Candidature médecin spécialiste",
      subtitle: item.specialty || undefined,
      status: item.status,
      statusLabel: medicalStatusLabels[item.status] || item.status,
      submittedAt: item.applied_at,
      updatedAt: item.updated_at,
      percent: medicalPercent(item.status),
      hasTest: false,
      hasInterview: true,
      dossierHref: "/medecin-candidat",
    });
  }

  for (const item of staff || []) {
    const offer = Array.isArray(item.maximus_job_offers) ? item.maximus_job_offers[0] : item.maximus_job_offers;
    cards.push({
      key: `staff:${item.id}`,
      track: "staff",
      applicationId: item.id,
      title: (offer as { title?: string } | null)?.title || "Candidature Staff",
      subtitle: (offer as { reference?: string } | null)?.reference,
      status: item.status,
      statusLabel: staffStatusLabels[item.status] || item.status,
      submittedAt: item.submitted_at,
      updatedAt: item.updated_at,
      percent: staffPercent(item.status),
      hasTest: true,
      hasInterview: true,
      dossierHref: "/staff-candidat",
    });
  }

  return cards;
}

export type CandidateNotification = { title: string; message: string; created_at: string };

export async function getLatestNotifications(supabase: SupabaseClient, userId: string, cards: CandidatureCard[]): Promise<Record<string, CandidateNotification | null>> {
  const notifications: Record<string, CandidateNotification | null> = {};
  const recruitmentCard = cards.find(c => c.track === "recruitment_dietitian" || c.track === "recruitment_promoter");
  const medicalCards = cards.filter(c => c.track === "medical");
  const staffCards = cards.filter(c => c.track === "staff");

  const [{ data: recruitmentNotif }, { data: medicalNotif }, { data: staffNotif }] = await Promise.all([
    recruitmentCard ? supabase.from("recruitment_notifications").select("title,message,created_at").eq("candidate_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    medicalCards.length ? supabase.from("medical_specialist_notifications").select("title_fr,message_fr,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    staffCards.length ? supabase.from("maximus_candidate_notifications").select("application_id,title,message,created_at").eq("candidate_id", userId).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  if (recruitmentCard && recruitmentNotif) notifications[recruitmentCard.key] = recruitmentNotif;
  for (const card of medicalCards) if (medicalNotif) notifications[card.key] = { title: medicalNotif.title_fr, message: medicalNotif.message_fr, created_at: medicalNotif.created_at };
  for (const card of staffCards) {
    const own = (staffNotif || []).find(n => n.application_id === card.applicationId);
    const fallback = (staffNotif || []).find(n => !n.application_id);
    const pick = own || fallback;
    if (pick) notifications[card.key] = { title: pick.title, message: pick.message, created_at: pick.created_at };
  }
  return notifications;
}
