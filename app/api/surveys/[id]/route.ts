import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const { data, error } = await supabase.from('survey_projects').select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ message: 'Enquete introuvable.' }, { status: 404 });
  return NextResponse.json({ survey: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const body = await request.json();
  const allowedStatuses = ['draft', 'planned', 'collecting', 'analysis', 'completed', 'archived'];
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.description !== undefined) updates.description = String(body.description).trim() || null;
  if (body.country !== undefined) updates.country = String(body.country).trim() || null;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at || null;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at || null;
  if (allowedStatuses.includes(body.status)) updates.status = body.status;
  if (body.configuration && typeof body.configuration === 'object') updates.configuration = body.configuration;
  const { data, error } = await supabase.from('survey_projects').update(updates).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ survey: data });
}
