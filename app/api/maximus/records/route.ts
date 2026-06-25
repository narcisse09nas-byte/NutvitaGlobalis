import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { maximusModuleMap, maximusStatuses } from '@/lib/maximus-modules';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { localMaximusRecords } from '@/lib/maximus-local-store';
import { parseWorkflowItems } from '@/lib/maximus-workflows';

function normalizeWorkflowData(input: Record<string, unknown>) {
  const data = { ...input };
  const itemSource = data.menus || data.menus_quantities || data.items;
  if (itemSource && !Array.isArray(data.workflow_items)) data.workflow_items = parseWorkflowItems(itemSource);
  if (data.specific_ingredients && !Array.isArray(data.ingredient_items)) {
    data.ingredient_items = parseWorkflowItems(data.specific_ingredients);
  }
  return data;
}

async function context() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    if ((await cookies()).get('nutvita_local_admin')?.value !== '1') {
      return { error: NextResponse.json({ message: 'Session administrateur locale requise.' }, { status: 401 }) };
    }
    return { local: true as const, user: { id: 'local-super-admin' } };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: 'Authentification requise.' }, { status: 401 }) };
  const { data: admin } = await supabase.from('admin_users').select('role,active').eq('id', user.id).maybeSingle();
  if (!admin?.active || admin.role !== 'super_admin') return { error: NextResponse.json({ message: 'Accès super administrateur requis.' }, { status: 403 }) };
  return { supabase, user };
}

export async function GET(request: Request) {
  const module = new URL(request.url).searchParams.get('module') || '';
  if (!maximusModuleMap.has(module)) return NextResponse.json({ message: 'Module Maximus invalide.' }, { status: 400 });
  const ctx = await context();
  if (ctx.error) return ctx.error;
  if (ctx.local) return NextResponse.json({ items: localMaximusRecords().filter(item => item.module === module).reverse() });
  const { data, error } = await ctx.supabase.from('maximus_records').select('*').eq('module', module).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (ctx.error) return ctx.error;
  const body = await request.json();
  const module = String(body.module || '');
  const definition = maximusModuleMap.get(module);
  if (!definition) return NextResponse.json({ message: 'Module Maximus invalide.' }, { status: 400 });
  const data = normalizeWorkflowData(body.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : {});
  const firstField = definition.fields.find(field => field.required) || definition.fields[0];
  const title = String(body.title || data[firstField?.key] || definition.title).trim();
  if (!title) return NextResponse.json({ message: 'Le titre ou le champ principal est obligatoire.' }, { status: 400 });
  if (ctx.local) {
    const now = new Date().toISOString();
    const saved = { id: crypto.randomUUID(), module, title, reference: body.reference || null, status: 'draft', data, created_at: now, updated_at: now };
    localMaximusRecords().push(saved);
    return NextResponse.json({ item: saved });
  }
  const { data: saved, error } = await ctx.supabase.from('maximus_records').insert({
    module, title, reference: body.reference || null, status: 'draft', data,
    created_by: ctx.user.id, updated_by: ctx.user.id,
  }).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ item: saved });
}

export async function PATCH(request: Request) {
  const ctx = await context();
  if (ctx.error) return ctx.error;
  const body = await request.json();
  const id = String(body.id || '');
  const payload: Record<string, unknown> = { updated_by: ctx.user.id };
  if (body.data && typeof body.data === 'object') payload.data = normalizeWorkflowData(body.data as Record<string, unknown>);
  if (body.title) payload.title = String(body.title);
  if (body.reference !== undefined) payload.reference = body.reference || null;
  if (body.status && maximusStatuses.includes(body.status)) payload.status = body.status;
  if (ctx.local) {
    const item = localMaximusRecords().find(row => row.id === id);
    if (!item) return NextResponse.json({ message: 'Élément introuvable.' }, { status: 404 });
    if (payload.data) item.data = payload.data as Record<string, unknown>;
    if (payload.title) item.title = String(payload.title);
    if (payload.reference !== undefined) item.reference = payload.reference ? String(payload.reference) : null;
    if (payload.status) item.status = String(payload.status);
    item.updated_at = new Date().toISOString();
    return NextResponse.json({ item });
  }
  const { data, error } = await ctx.supabase.from('maximus_records').update(payload).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const ctx = await context();
  if (ctx.error) return ctx.error;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'Identifiant requis.' }, { status: 400 });
  if (ctx.local) {
    const index = localMaximusRecords().findIndex(item => item.id === id);
    if (index >= 0) localMaximusRecords().splice(index, 1);
    return NextResponse.json({ ok: true });
  }
  const { error } = await ctx.supabase.from('maximus_records').delete().eq('id', id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
