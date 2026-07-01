import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { requireMaximusApi } from '@/lib/maximus-api-auth';
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

function referenceInitial(module: string, title: string) {
  const source = title || module.split('/').at(-1) || 'M';
  const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (normalized.match(/[A-Za-z]/)?.[0] || 'M').toUpperCase();
}

function candidateReference(module: string, title: string) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  return `${referenceInitial(module, title)}${suffix}`;
}

async function generateReference(ctx: Awaited<ReturnType<typeof context>>, module: string, title: string) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = candidateReference(module, title);
    if ('local' in ctx && ctx.local) {
      if (!localMaximusRecords().some(item => item.reference === candidate)) return candidate;
      continue;
    }
    if ('supabase' in ctx && ctx.supabase) {
      const { data } = await ctx.supabase.from('maximus_records').select('id').eq('reference', candidate).maybeSingle();
      if (!data) return candidate;
    }
  }
  return candidateReference(module, title);
}

async function context(module: string, required: 'viewer' | 'editor' | 'creator' | 'validator') {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    if ((await cookies()).get('nutvita_local_admin')?.value !== '1') {
      return { error: NextResponse.json({ message: 'Session administrateur locale requise.' }, { status: 401 }) };
    }
    return { local: true as const, user: { id: 'local-super-admin' } };
  }
  return requireMaximusApi(module, required);
}

async function recordModule(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '';
  const { data } = await supabase.from('maximus_records').select('module').eq('id', id).maybeSingle();
  return String(data?.module || '');
}

export async function GET(request: Request) {
  const module = new URL(request.url).searchParams.get('module') || '';
  if (!maximusModuleMap.has(module)) return NextResponse.json({ message: 'Module Maximus invalide.' }, { status: 400 });
  const ctx = await context(module, 'viewer');
  if ('error' in ctx && ctx.error) return ctx.error;
  if ('local' in ctx) return NextResponse.json({ items: localMaximusRecords().filter(item => item.module === module).reverse() });
  const { data, error } = await ctx.supabase.from('maximus_records').select('*').eq('module', module).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const module = String(body.module || '');
  const definition = maximusModuleMap.get(module);
  if (!definition) return NextResponse.json({ message: 'Module Maximus invalide.' }, { status: 400 });
  const ctx = await context(module, 'creator');
  if ('error' in ctx && ctx.error) return ctx.error;
  const data = normalizeWorkflowData(body.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : {});
  const firstField = definition.fields.find(field => field.required) || definition.fields[0];
  const title = String(body.title || data[firstField?.key] || definition.title).trim();
  if (!title) return NextResponse.json({ message: 'Le titre ou le champ principal est obligatoire.' }, { status: 400 });
  const reference = String(body.reference || '').trim() || await generateReference(ctx, module, definition.title);
  if ('local' in ctx) {
    const now = new Date().toISOString();
    const saved = { id: crypto.randomUUID(), module, title, reference, status: 'draft', data, created_at: now, updated_at: now };
    localMaximusRecords().push(saved);
    return NextResponse.json({ item: saved });
  }
  const { data: saved, error } = await ctx.supabase.from('maximus_records').insert({
    module, title, reference, status: 'draft', data,
    created_by: ctx.user.id, updated_by: ctx.user.id,
  }).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ item: saved });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ message: 'Identifiant requis.' }, { status: 400 });
  const module = hasLocalAdminMode() && !hasSupabaseConfig()
    ? String(localMaximusRecords().find(row => row.id === id)?.module || '')
    : await recordModule(id);
  if (!maximusModuleMap.has(module)) return NextResponse.json({ message: 'Element Maximus introuvable ou inaccessible.' }, { status: 404 });
  const required = ['validated', 'rejected', 'archived'].includes(String(body.status || '')) ? 'validator' : 'editor';
  const ctx = await context(module, required);
  if ('error' in ctx && ctx.error) return ctx.error;
  const payload: Record<string, unknown> = { updated_by: ctx.user.id };
  if (body.data && typeof body.data === 'object') payload.data = normalizeWorkflowData(body.data as Record<string, unknown>);
  if (body.title) payload.title = String(body.title);
  if (body.reference !== undefined) payload.reference = body.reference || null;
  if (body.status && maximusStatuses.includes(body.status)) payload.status = body.status;
  if ('local' in ctx) {
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
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'Identifiant requis.' }, { status: 400 });
  const module = hasLocalAdminMode() && !hasSupabaseConfig()
    ? String(localMaximusRecords().find(row => row.id === id)?.module || '')
    : await recordModule(id);
  if (!maximusModuleMap.has(module)) return NextResponse.json({ message: 'Element Maximus introuvable ou inaccessible.' }, { status: 404 });
  const ctx = await context(module, 'validator');
  if ('error' in ctx && ctx.error) return ctx.error;
  if ('local' in ctx) {
    const index = localMaximusRecords().findIndex(item => item.id === id);
    if (index >= 0) localMaximusRecords().splice(index, 1);
    return NextResponse.json({ ok: true });
  }
  const { error } = await ctx.supabase.from('maximus_records').delete().eq('id', id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
