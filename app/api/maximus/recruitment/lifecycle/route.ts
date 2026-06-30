import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resend } from '@/lib/api';
import { createEmploymentProposalPdf, createSignatureEnvelope } from '@/lib/signature-documents';

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: 'Authentification requise.' }, { status: 401 }) };
  const { data: admin } = await supabase.from('admin_users').select('role,active').eq('id', user.id).maybeSingle();
  if (!admin?.active || admin.role !== 'super_admin') return { error: NextResponse.json({ message: 'Acces RH requis.' }, { status: 403 }) };
  return { supabase, user };
}

async function email(to: string, subject: string, text: string) {
  await resend('/emails', { from: process.env.MAIL_FROM ?? 'NutVitaGlobalis <contact@nutvitaglobalis.com>', to: [to], subject, text }).catch(() => undefined);
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const [{ data: applications }, { data: interviews }, { data: proposals }] = await Promise.all([
    ctx.supabase.from('maximus_staff_applications').select('id,offer_id,candidate_id,full_name,email,status,written_test_score,interview_score,maximus_job_offers(title,reference,contract_type)').in('status', ['test_graded','invited_to_interview','interview_completed','offer_proposed','offer_accepted','offer_declined','hired']).order('updated_at', { ascending: false }),
    ctx.supabase.from('maximus_recruitment_interviews').select('*,maximus_staff_applications(full_name,email,maximus_job_offers(title,reference)),maximus_interview_panel(*),maximus_interview_evaluations(*)').order('scheduled_at', { ascending: false }),
    ctx.supabase.from('maximus_employment_proposals').select('*,maximus_staff_applications(full_name,email,status,maximus_job_offers(title,reference))').order('created_at', { ascending: false }),
  ]);
  return NextResponse.json({ applications: applications || [], interviews: interviews || [], proposals: proposals || [] });
}

export async function POST(request: Request) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  const action = String(body.action || '');
  const applicationId = String(body.application_id || '');
  const { data: application } = await ctx.supabase.from('maximus_staff_applications').select('*,maximus_job_offers(title,reference,contract_type)').eq('id', applicationId).single();
  if (!application) return NextResponse.json({ message: 'Candidature introuvable.' }, { status: 404 });

  if (action === 'schedule_interview') {
    const scheduledAt = new Date(String(body.scheduled_at || ''));
    if (Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ message: 'Date d entretien invalide.' }, { status: 400 });
    const provider = ['jitsi', 'external', 'physical'].includes(String(body.provider)) ? String(body.provider) : 'external';
    const roomName = provider === 'jitsi' ? `NVG-INTERVIEW-${application.id.replaceAll('-', '').slice(0, 16).toUpperCase()}` : `NVG-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const meetingUrl = provider === 'jitsi'
      ? `https://${process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si'}/${roomName}`
      : String(body.meeting_url || '').trim();
    if (provider === 'external' && !/^https:\/\//i.test(meetingUrl)) return NextResponse.json({ message: 'Un lien HTTPS valide est requis.' }, { status: 400 });
    if (provider === 'physical' && !meetingUrl) return NextResponse.json({ message: 'Indiquez le lieu de l entretien.' }, { status: 400 });
    const { data: interview, error } = await ctx.supabase.from('maximus_recruitment_interviews').insert({
      application_id: application.id,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: Number(body.duration_minutes || 45),
      provider,
      room_name: roomName,
      meeting_url: meetingUrl,
      agenda: String(body.agenda || ''),
      created_by: ctx.user.id,
    }).select('*').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    const panel = String(body.panel_emails || '').split(/[\n,;]+/).map((value: string) => value.trim().toLowerCase()).filter(Boolean);
    if (panel.length) await ctx.supabase.from('maximus_interview_panel').insert(panel.map((panelEmail: string) => ({ interview_id: interview.id, email: panelEmail, role: 'jury' })));
    await ctx.supabase.from('maximus_staff_applications').update({ status: 'invited_to_interview' }).eq('id', application.id);
    const accessLabel = provider === 'physical' ? `Lieu: ${meetingUrl}` : `Lien: ${meetingUrl}`;
    await ctx.supabase.from('maximus_candidate_notifications').insert({ candidate_id: application.candidate_id, application_id: application.id, title: 'Invitation a l entretien', message: `Votre entretien est programme le ${scheduledAt.toLocaleString('fr-FR')}. ${accessLabel}`, action_url: provider === 'physical' ? null : meetingUrl });
    await Promise.allSettled([application.email, ...panel].map(recipient => email(recipient, 'Entretien de recrutement NutVitaGlobalis', `Entretien: ${application.maximus_job_offers?.title}\nDate: ${scheduledAt.toLocaleString('fr-FR')}\n${accessLabel}`)));
    return NextResponse.json({ item: interview });
  }

  if (action === 'evaluate_interview') {
    const interviewId = String(body.interview_id || '');
    const scores = [body.technical_score, body.communication_score, body.culture_score].map(Number);
    if (scores.some(score => score < 0 || score > 100)) return NextResponse.json({ message: 'Les notes doivent etre comprises entre 0 et 100.' }, { status: 400 });
    const overall = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 100) / 100;
    const { error } = await ctx.supabase.from('maximus_interview_evaluations').upsert({
      interview_id: interviewId,
      evaluator_email: ctx.user.email,
      evaluator_id: ctx.user.id,
      technical_score: scores[0],
      communication_score: scores[1],
      culture_score: scores[2],
      overall_score: overall,
      recommendation: body.recommendation,
      comments: String(body.comments || ''),
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'interview_id,evaluator_email' });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    const { data: evaluations } = await ctx.supabase.from('maximus_interview_evaluations').select('overall_score').eq('interview_id', interviewId).not('submitted_at', 'is', null);
    const values = (evaluations || []).map(item => Number(item.overall_score)).filter(Number.isFinite);
    const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    await ctx.supabase.from('maximus_recruitment_interviews').update({ status: 'completed' }).eq('id', interviewId);
    await ctx.supabase.from('maximus_staff_applications').update({ status: 'interview_completed', interview_score: average, final_score: application.written_test_score == null ? average : (Number(application.written_test_score) + average) / 2 }).eq('id', application.id);
    return NextResponse.json({ average });
  }

  if (action === 'propose_employment') {
    const { data, error } = await ctx.supabase.from('maximus_employment_proposals').upsert({
      application_id: application.id,
      position_title: String(body.position_title || application.maximus_job_offers?.title || ''),
      contract_type: String(body.contract_type || application.maximus_job_offers?.contract_type || ''),
      proposed_start_date: body.proposed_start_date || null,
      salary_amount: Number(body.salary_amount || 0) || null,
      salary_currency: String(body.salary_currency || 'XAF'),
      terms: String(body.terms || ''),
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_by: ctx.user.id,
    }, { onConflict: 'application_id' }).select('*').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    try {
      const service = createAdminClient();
      if (data.signature_envelope_id) {
        await service.from('signature_envelopes').update({ status: 'cancelled' }).eq('id', data.signature_envelope_id).in('status', ['draft','sent','viewed','partially_signed']);
      }
      const fileBytes = await createEmploymentProposalPdf({
        candidateName: application.full_name,
        position: data.position_title,
        contractType: data.contract_type,
        startDate: data.proposed_start_date,
        salary: data.salary_amount,
        currency: data.salary_currency,
        terms: data.terms,
      });
      const envelope = await createSignatureEnvelope({
        supabase: service,
        senderId: ctx.user.id,
        senderEmail: ctx.user.email,
        title: `Proposition d embauche - ${data.position_title}`,
        message: 'Veuillez lire attentivement la proposition jointe, puis la signer electroniquement pour confirmer votre accord.',
        fileBytes,
        fileName: `Proposition-${application.maximus_job_offers?.reference || application.id}.pdf`,
        recipientName: application.full_name,
        recipientEmail: application.email,
        recipientUserId: application.candidate_id,
        relatedType: 'employment_proposal',
        relatedId: data.id,
      });
      await service.from('maximus_employment_proposals').update({ signature_envelope_id: envelope.id }).eq('id', data.id);
      data.signature_envelope_id = envelope.id;
    } catch (signatureError) {
      console.error('Employment proposal signature envelope', signatureError);
      return NextResponse.json({ message: 'La proposition a ete creee, mais son document de signature n a pas pu etre envoye.' }, { status: 500 });
    }
    await ctx.supabase.from('maximus_staff_applications').update({ status: 'offer_proposed' }).eq('id', application.id);
    await ctx.supabase.from('maximus_candidate_notifications').insert({ candidate_id: application.candidate_id, application_id: application.id, title: 'Proposition d embauche', message: 'Une proposition d embauche vous attend dans votre espace candidat.', action_url: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/staff-candidat` });
    await email(application.email, 'Proposition d embauche NutVitaGlobalis', 'Votre proposition d embauche vous a ete envoyee en piece jointe et via un lien personnel de signature.');
    return NextResponse.json({ item: data });
  }

  if (action === 'hire') {
    if (application.status !== 'offer_accepted') return NextResponse.json({ message: 'Le candidat doit accepter la proposition avant la finalisation.' }, { status: 400 });
    const now = new Date().toISOString();
    const reference = `S${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`;
    const service = createAdminClient();
    await service.auth.admin.updateUserById(application.candidate_id, { user_metadata: { account_type: 'staff', full_name: application.full_name, recruited_via: 'maximus' } });
    const { data: staff, error } = await ctx.supabase.from('maximus_records').insert({
      module: 'hr/staff',
      title: application.full_name,
      reference,
      status: 'draft',
      data: { full_name: application.full_name, email: application.email, position: application.maximus_job_offers?.title, recruitment_application_id: application.id, start_date: body.start_date || null },
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    }).select('id').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await ctx.supabase.from('maximus_records').insert({
      module: 'hr/onboarding',
      title: `Onboarding - ${application.full_name}`,
      reference: `O${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`,
      status: 'draft',
      parent_id: staff.id,
      data: { employee: application.full_name, staff_record_id: staff.id, recruitment_application_id: application.id, start_date: body.start_date || null },
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    });
    await ctx.supabase.from('maximus_staff_applications').update({ status: 'hired' }).eq('id', application.id);
    await ctx.supabase.from('maximus_candidate_notifications').insert({ candidate_id: application.candidate_id, application_id: application.id, title: 'Bienvenue chez NutVitaGlobalis', message: 'Votre recrutement est finalise. Votre parcours d integration a ete cree.' });
    await email(application.email, 'Bienvenue chez NutVitaGlobalis', 'Votre recrutement est finalise. Notre equipe vous contactera pour votre parcours d integration.');
    await ctx.supabase.from('maximus_recruitment_events').insert({ process_type: 'staff', offer_id: application.offer_id, staff_application_id: application.id, event_type: 'candidate_hired', from_status: 'offer_accepted', to_status: 'hired', details: { staff_record_id: staff.id, completed_at: now }, actor_id: ctx.user.id, actor_email: ctx.user.email });
    return NextResponse.json({ staff_record_id: staff.id });
  }
  return NextResponse.json({ message: 'Action invalide.' }, { status: 400 });
}
