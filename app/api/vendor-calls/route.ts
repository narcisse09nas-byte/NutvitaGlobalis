import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('maximus_vendor_calls').select('id,reference,title,category,service_area,requirements,terms_of_reference,closing_at').eq('status', 'published').order('published_at', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const callId = String(body.call_id || '');
  const { data: call } = await supabase.from('maximus_vendor_calls').select('id,closing_at').eq('id', callId).eq('status', 'published').maybeSingle();
  if (!call) return NextResponse.json({ message: 'Cet appel fournisseur n est plus disponible.' }, { status: 404 });
  if (call.closing_at && new Date(call.closing_at) < new Date()) return NextResponse.json({ message: 'La date limite est depassee.' }, { status: 400 });
  const candidateEmail = String(body.email || '').trim().toLowerCase();
  const { data: duplicate } = await supabase.from('maximus_vendor_applications').select('id').eq('call_id', callId).eq('email', candidateEmail).maybeSingle();
  if (duplicate) return NextResponse.json({ message: 'Une candidature existe deja pour cet appel et cette adresse email.' }, { status: 409 });
  const { data, error } = await supabase.from('maximus_vendor_applications').insert({
    call_id: callId,
    company_name: String(body.company_name || ''),
    registration_number: String(body.registration_number || ''),
    contact_name: String(body.contact_name || ''),
    email: candidateEmail,
    phone: String(body.phone || ''),
    country: String(body.country || ''),
    region: String(body.region || ''),
    city: String(body.city || ''),
    address: String(body.address || ''),
    experience_summary: String(body.experience_summary || ''),
    documents: {},
  }).select('id').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await createAdminClient().from('maximus_recruitment_events').insert({ process_type: 'vendor', vendor_application_id: data.id, event_type: 'vendor_application_submitted', to_status: 'submitted', details: { call_id: callId, email: body.email } });
  return NextResponse.json({ item: data });
}
