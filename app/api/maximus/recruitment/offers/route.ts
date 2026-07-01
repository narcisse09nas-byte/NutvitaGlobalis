import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { localMaximusEvents, localMaximusRecords } from '@/lib/maximus-local-store';
import { requireMaximusApi } from '@/lib/maximus-api-auth';

type OfferStatus = 'draft' | 'submitted' | 'endorsed' | 'validated' | 'rejected' | 'published' | 'closed' | 'archived';

const transitions: Record<OfferStatus, OfferStatus[]> = {
  draft: ['submitted'],
  submitted: ['endorsed', 'rejected'],
  endorsed: ['validated', 'rejected'],
  validated: ['published', 'rejected'],
  rejected: ['draft'],
  published: ['closed'],
  closed: ['archived'],
  archived: [],
};

function offerReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  return `J${Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')}`;
}

async function context(required: 'viewer' | 'creator' | 'editor' | 'validator') {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    const cookieStore = await cookies();
    if (cookieStore.get('nutvita_local_admin')?.value !== '1') {
      return { error: NextResponse.json({ message: 'Session administrateur locale requise.' }, { status: 401 }) };
    }
    return {
      local: true as const,
      user: {
        id: 'local-super-admin',
        email: cookieStore.get('nutvita_local_admin_email')?.value || 'local@nutvita.test',
      },
    };
  }
  return requireMaximusApi('hr/recruitment/offers', required);
}

function localOffers() {
  return localMaximusRecords()
    .filter(row => row.module === 'hr/recruitment/offers')
    .map(row => ({
      id: row.id,
      reference: row.reference,
      title: row.title,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      ...row.data,
    }))
    .reverse();
}

async function logEvent(
  ctx: Exclude<Awaited<ReturnType<typeof context>>, { error: NextResponse }>,
  offerId: string,
  eventType: string,
  fromStatus: string | null,
  toStatus: string,
  details: Record<string, unknown> = {},
) {
  if ('local' in ctx) {
    localMaximusEvents().push({
      id: crypto.randomUUID(),
      source_record_id: offerId,
      action: eventType,
      details: { process_type: 'staff', from_status: fromStatus, to_status: toStatus, actor_email: ctx.user.email, ...details },
      created_at: new Date().toISOString(),
    });
    return;
  }
  if ('supabase' in ctx) {
    await ctx.supabase.from('maximus_recruitment_events').insert({
      process_type: 'staff',
      offer_id: offerId,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      details,
      actor_id: ctx.user.id,
      actor_email: ctx.user.email,
    });
  }
}

export async function GET() {
  const ctx = await context('viewer');
  if ('error' in ctx) return ctx.error;
  if ('local' in ctx) return NextResponse.json({ items: localOffers() });
  const { data, error } = await ctx.supabase.from('maximus_job_offers').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const ctx = await context('creator');
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  const title = String(body.title || '').trim();
  const department = String(body.department || '').trim();
  const contractType = String(body.contract_type || '').trim();
  const summary = String(body.summary || '').trim();
  const terms = String(body.terms_of_reference || '').trim();
  if (!title || !department || !contractType || !summary || !terms) {
    return NextResponse.json({ message: 'Poste, departement, contrat, resume et TOR sont obligatoires.' }, { status: 400 });
  }
  const reference = offerReference();
  const payload = {
    reference,
    title,
    department,
    contract_type: contractType,
    location: String(body.location || '').trim() || null,
    country: String(body.country || '').trim() || null,
    region: String(body.region || '').trim() || null,
    summary,
    terms_of_reference: terms,
    responsibilities: String(body.responsibilities || '').trim() || null,
    requirements: String(body.requirements || '').trim() || null,
    application_instructions: String(body.application_instructions || '').trim() || null,
    closing_at: body.closing_at || null,
    status: 'draft' as OfferStatus,
  };
  if ('local' in ctx) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      module: 'hr/recruitment/offers',
      title,
      reference,
      status: 'draft',
      data: payload,
      created_at: now,
      updated_at: now,
    };
    localMaximusRecords().push(row);
    await logEvent(ctx, row.id, 'offer_created', null, 'draft');
    return NextResponse.json({ item: { id: row.id, created_at: now, updated_at: now, ...payload } });
  }
  const { data, error } = await ctx.supabase.from('maximus_job_offers').insert({
    ...payload,
    created_by: ctx.user.id,
  }).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await logEvent(ctx, data.id, 'offer_created', null, 'draft');
  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
  const ctx = await context('validator');
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ message: 'Offre requise.' }, { status: 400 });

  if ('local' in ctx) {
    const row = localMaximusRecords().find(item => item.id === id && item.module === 'hr/recruitment/offers');
    if (!row) return NextResponse.json({ message: 'Offre introuvable.' }, { status: 404 });
    const current = row.status as OfferStatus;
    if (body.action) {
      const next = String(body.action) as OfferStatus;
      if (!transitions[current]?.includes(next)) return NextResponse.json({ message: `Transition ${current} vers ${next} interdite.` }, { status: 400 });
      row.status = next;
      row.data = {
        ...row.data,
        status: next,
        rejection_reason: next === 'rejected' ? String(body.note || '').trim() : row.data.rejection_reason,
        published_at: next === 'published' ? new Date().toISOString() : row.data.published_at,
      };
      row.updated_at = new Date().toISOString();
      await logEvent(ctx, id, `offer_${next}`, current, next, { note: String(body.note || '') });
    } else {
      if (!['draft', 'rejected'].includes(current)) return NextResponse.json({ message: 'Seules les offres en brouillon ou rejetees sont modifiables.' }, { status: 400 });
      row.title = String(body.title || row.title);
      row.data = { ...row.data, ...body.fields, title: row.title };
      row.updated_at = new Date().toISOString();
      await logEvent(ctx, id, 'offer_updated', current, current);
    }
    return NextResponse.json({ item: { id: row.id, reference: row.reference, title: row.title, status: row.status, created_at: row.created_at, updated_at: row.updated_at, ...row.data } });
  }

  const { data: existing } = await ctx.supabase.from('maximus_job_offers').select('*').eq('id', id).single();
  if (!existing) return NextResponse.json({ message: 'Offre introuvable.' }, { status: 404 });
  const current = existing.status as OfferStatus;
  let update: Record<string, unknown>;
  let eventType: string;
  let nextStatus = current;
  if (body.action) {
    nextStatus = String(body.action) as OfferStatus;
    if (!transitions[current]?.includes(nextStatus)) {
      return NextResponse.json({ message: `Transition ${current} vers ${nextStatus} interdite.` }, { status: 400 });
    }
    update = {
      status: nextStatus,
      rejection_reason: nextStatus === 'rejected' ? String(body.note || '').trim() || 'Motif non precise.' : existing.rejection_reason,
      published_at: nextStatus === 'published' ? new Date().toISOString() : existing.published_at,
      endorsed_by: nextStatus === 'endorsed' ? ctx.user.id : existing.endorsed_by,
      validated_by: nextStatus === 'validated' ? ctx.user.id : existing.validated_by,
    };
    eventType = `offer_${nextStatus}`;
  } else {
    if (!['draft', 'rejected'].includes(current)) {
      return NextResponse.json({ message: 'Seules les offres en brouillon ou rejetees sont modifiables.' }, { status: 400 });
    }
    const allowed = [
      'title','department','contract_type','location','country','region','summary',
      'terms_of_reference','responsibilities','requirements','application_instructions','closing_at',
    ];
    update = Object.fromEntries(allowed.filter(key => body.fields?.[key] !== undefined).map(key => [key, body.fields[key] || null]));
    eventType = 'offer_updated';
  }
  const { data, error } = await ctx.supabase.from('maximus_job_offers').update(update).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await logEvent(ctx, id, eventType, current, nextStatus, { note: String(body.note || '') });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const ctx = await context('validator');
  if ('error' in ctx) return ctx.error;
  const id = new URL(request.url).searchParams.get('id') || '';
  if ('local' in ctx) {
    const rows = localMaximusRecords();
    const index = rows.findIndex(item => item.id === id && item.module === 'hr/recruitment/offers');
    if (index < 0) return NextResponse.json({ message: 'Offre introuvable.' }, { status: 404 });
    if (!['draft', 'rejected'].includes(rows[index].status)) return NextResponse.json({ message: 'Seules les offres en brouillon ou rejetees peuvent etre supprimees.' }, { status: 400 });
    const hasApplications = rows.some(item => item.module === 'hr/recruitment/applications' && item.data.offer_id === id);
    if (hasApplications) return NextResponse.json({ message: 'Cette offre contient deja des candidatures et doit etre archivee.' }, { status: 400 });
    rows.splice(index, 1);
    return NextResponse.json({ ok: true });
  }
  const { data: offer } = await ctx.supabase.from('maximus_job_offers').select('status').eq('id', id).single();
  if (!offer) return NextResponse.json({ message: 'Offre introuvable.' }, { status: 404 });
  if (!['draft', 'rejected'].includes(offer.status)) return NextResponse.json({ message: 'Seules les offres en brouillon ou rejetees peuvent etre supprimees.' }, { status: 400 });
  const { count } = await ctx.supabase.from('maximus_staff_applications').select('id', { count: 'exact', head: true }).eq('offer_id', id);
  if (count) return NextResponse.json({ message: 'Cette offre contient deja des candidatures et doit etre archivee.' }, { status: 400 });
  const { error } = await ctx.supabase.from('maximus_job_offers').delete().eq('id', id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
