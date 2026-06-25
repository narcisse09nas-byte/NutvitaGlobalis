import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const { data, error } = await supabase.from('survey_projects').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ surveys: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const body = await request.json();
  const title = String(body.title || '').trim();
  const allowedTypes = ['food_security', 'nutrition', 'mixed', 'other'];
  if (!title || !allowedTypes.includes(body.survey_type)) {
    return NextResponse.json({ message: 'Titre et type d enquete requis.' }, { status: 400 });
  }
  const { data, error } = await supabase.from('survey_projects').insert({
    owner_user_id: user.id,
    title,
    survey_type: body.survey_type,
    country: String(body.country || '').trim() || null,
    description: String(body.description || '').trim() || null,
    status: 'planned',
    starts_at: body.starts_at || null,
    ends_at: body.ends_at || null,
  }).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ survey: data });
}
