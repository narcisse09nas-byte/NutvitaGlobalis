import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { resend } from '@/lib/api';

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ items: [] });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const [{ data, error }, { data: notifications }, { data: interviews }, { data: proposals }] = await Promise.all([
    supabase.from('maximus_staff_applications')
      .select('*,maximus_job_offers(id,reference,title,department,location,contract_type)')
      .eq('candidate_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('maximus_candidate_notifications')
      .select('*')
      .eq('candidate_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('maximus_recruitment_interviews')
      .select('*,maximus_staff_applications!inner(candidate_id,maximus_job_offers(title,reference))')
      .eq('maximus_staff_applications.candidate_id', user.id)
      .order('scheduled_at', { ascending: false }),
    supabase.from('maximus_employment_proposals')
      .select('*,maximus_staff_applications!inner(candidate_id,maximus_job_offers(title,reference))')
      .eq('maximus_staff_applications.candidate_id', user.id)
      .order('created_at', { ascending: false }),
  ]);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [], notifications: notifications || [], interviews: interviews || [], proposals: proposals || [] });
}

export async function PATCH(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ message: 'Supabase doit etre configure.' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.account_type !== 'staff_candidate') return NextResponse.json({ message: 'Compte candidat Staff requis.' }, { status: 401 });
  const body = await request.json();
  const proposalId = String(body.proposal_id || '');
  const response = String(body.response || '');
  if (response !== 'declined') return NextResponse.json({ message: 'L acceptation exige la signature electronique de la proposition.' }, { status: 400 });
  const { data: proposal } = await supabase.from('maximus_employment_proposals')
    .select('id,application_id,status,signature_envelope_id,maximus_staff_applications!inner(candidate_id)')
    .eq('id', proposalId)
    .eq('maximus_staff_applications.candidate_id', user.id)
    .eq('status', 'sent')
    .maybeSingle();
  if (!proposal) return NextResponse.json({ message: 'Proposition introuvable ou deja traitee.' }, { status: 404 });
  const service = createAdminClient();
  const { error } = await service.from('maximus_employment_proposals').update({ status: 'declined', candidate_response: String(body.note || ''), responded_at: new Date().toISOString() }).eq('id', proposalId);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await service.from('maximus_staff_applications').update({ status: 'offer_declined' }).eq('id', proposal.application_id);
  await service.from('maximus_recruitment_events').insert({ process_type: 'staff', staff_application_id: proposal.application_id, event_type: 'employment_offer_declined', from_status: 'offer_proposed', to_status: 'offer_declined', actor_id: user.id, actor_email: user.email });
  if (proposal.signature_envelope_id) {
    await service.from('signature_envelopes').update({ status: 'declined' }).eq('id', proposal.signature_envelope_id);
    await service.from('signature_recipients').update({ status: 'declined', decline_reason: String(body.note || '') }).eq('envelope_id', proposal.signature_envelope_id).in('status', ['pending', 'sent', 'viewed']);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ message: 'Supabase doit etre configure.' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Connectez-vous avec votre compte candidat Staff.' }, { status: 401 });
  if (user.user_metadata?.account_type !== 'staff_candidate') {
    return NextResponse.json({ message: 'Ce parcours requiert un compte candidat Staff distinct.' }, { status: 403 });
  }
  const body = await request.json();
  const offerId = String(body.offer_id || '');
  const { data: offer } = await supabase.from('maximus_job_offers').select('id,status,closing_at').eq('id', offerId).eq('status', 'published').maybeSingle();
  if (!offer) return NextResponse.json({ message: 'Cette offre n est plus disponible.' }, { status: 404 });
  if (offer.closing_at && new Date(offer.closing_at) < new Date()) return NextResponse.json({ message: 'La date limite de candidature est depassee.' }, { status: 400 });
  const profile = {
    id: user.id,
    email: user.email || String(body.email || ''),
    full_name: String(body.full_name || user.user_metadata?.full_name || ''),
    phone: String(body.phone || user.user_metadata?.whatsapp_phone || ''),
    country: String(body.country || user.user_metadata?.country || ''),
    region: String(body.region || user.user_metadata?.state_region || ''),
    city: String(body.city || user.user_metadata?.city || ''),
  };
  const { error: profileError } = await supabase.from('maximus_candidate_profiles').upsert(profile);
  if (profileError) return NextResponse.json({ message: profileError.message }, { status: 400 });
  const row = {
    offer_id: offerId,
    candidate_id: user.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    address: String(body.address || ''),
    professional_title: String(body.professional_title || ''),
    highest_degree: String(body.highest_degree || ''),
    years_experience: Number(body.years_experience || 0),
    cover_letter: String(body.cover_letter || ''),
    documents: body.documents && typeof body.documents === 'object' ? body.documents : {},
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('maximus_staff_applications').insert(row).select('*').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ message: 'Vous avez deja postule a cette offre.' }, { status: 409 });
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  const service = createAdminClient();
  await service.from('maximus_recruitment_events').insert({
    process_type: 'staff',
    offer_id: offerId,
    staff_application_id: data.id,
    event_type: 'application_submitted',
    to_status: 'submitted',
    actor_id: user.id,
    actor_email: user.email,
  });
  await service.from('maximus_candidate_notifications').insert({
    candidate_id: user.id,
    application_id: data.id,
    title: 'Candidature recue',
    message: 'Votre candidature Staff a ete transmise. Vous serez informe de chaque prochaine etape dans cet espace.',
    action_url: '/staff-candidat',
  });
  await resend('/emails', {
    from: process.env.MAIL_FROM ?? 'NutVitaGlobalis <contact@nutvitaglobalis.com>',
    to: [profile.email],
    subject: 'Confirmation de votre candidature Staff NutVitaGlobalis',
    text: `Bonjour ${profile.full_name},\n\nVotre candidature a bien ete recue. Vous pourrez suivre son statut depuis votre espace candidat Staff.\n\nEquipe NutVitaGlobalis`,
  }).catch(() => undefined);
  return NextResponse.json({ item: data });
}
