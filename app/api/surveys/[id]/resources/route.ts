import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const resources = {
  team: { table: 'survey_team_members', order: 'created_at' },
  clusters: { table: 'survey_clusters', order: 'created_at' },
  samples: { table: 'survey_samples', order: 'created_at' },
  forms: { table: 'survey_forms', order: 'created_at' },
  responses: { table: 'survey_responses', order: 'submitted_at' },
  reports: { table: 'survey_analysis_reports', order: 'created_at' },
} as const;

type Resource = keyof typeof resources;

function getResource(request: Request) {
  const value = new URL(request.url).searchParams.get('resource') as Resource;
  return resources[value] ? value : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = getResource(request);
  if (!resource) return NextResponse.json({ message: 'Ressource invalide.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const definition = resources[resource];
  const { data, error } = await supabase.from(definition.table).select('*').eq('survey_id', id).order(definition.order, { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = getResource(request);
  if (!resource) return NextResponse.json({ message: 'Ressource invalide.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const body = await request.json();
  if (resource === 'responses' && body.source_type !== 'imported') {
    const { data, error } = await supabase.rpc('register_local_survey_response', {
      p_survey_id: id,
      p_form_id: body.form_id,
      p_cluster_id: body.cluster_id,
      p_village_code: body.village_code,
      p_village_name: body.village_name,
      p_enumerator_id: body.enumerator_id,
      p_answers: body.answers || {},
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ item: data });
  }
  const payload = { ...body, survey_id: id };
  delete payload.id;
  if (resource === 'forms' && !payload.created_by) payload.created_by = user.id;
  if (resource === 'responses' && !payload.submitted_by) payload.submitted_by = user.id;
  if (resource === 'responses' && payload.source_type === 'imported') {
    const batch = String(payload.import_batch || 'IMPORT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    const row = Math.max(1, Number(payload.source_row) || 1);
    payload.response_reference = `IMP-${batch || 'IMPORT'}-${String(row).padStart(6, '0')}`;
    payload.cluster_reference = payload.cluster_reference || 'IMPORT';
    payload.sequence_no = null;
  }
  if (resource === 'reports' && !payload.created_by) payload.created_by = user.id;
  const { data, error } = await supabase.from(resources[resource].table).insert(payload).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = getResource(request);
  if (!resource) return NextResponse.json({ message: 'Ressource invalide.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const body = await request.json();
  const itemId = String(body.id || new URL(request.url).searchParams.get('item') || '');
  if (!itemId) return NextResponse.json({ message: 'Identifiant de ressource requis.' }, { status: 400 });
  const payload = { ...body };
  delete payload.id;
  delete payload.survey_id;
  const { data, error } = await supabase.from(resources[resource].table).update(payload).eq('id', itemId).eq('survey_id', id).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = getResource(request);
  const itemId = new URL(request.url).searchParams.get('item');
  if (!resource || !itemId) return NextResponse.json({ message: 'Ressource invalide.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const { error } = await supabase.from(resources[resource].table).delete().eq('id', itemId).eq('survey_id', id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
