import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { localMaximusRecords } from '@/lib/maximus-local-store';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    const offers = localMaximusRecords()
      .filter(row => row.module === 'hr/recruitment/offers' && row.status === 'published')
      .map(row => ({ id: row.id, reference: row.reference, title: row.title, status: row.status, created_at: row.created_at, updated_at: row.updated_at, ...row.data }));
    if (id) {
      const item = offers.find(offer => offer.id === id);
      return item ? NextResponse.json({ item }) : NextResponse.json({ message: 'Offre introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ items: offers });
  }
  if (!hasSupabaseConfig()) return NextResponse.json({ items: [] });
  const supabase = await createClient();
  let query = supabase.from('maximus_job_offers').select('*').eq('status', 'published');
  if (id) {
    const { data, error } = await query.eq('id', id).maybeSingle();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return data ? NextResponse.json({ item: data }) : NextResponse.json({ message: 'Offre introuvable.' }, { status: 404 });
  }
  const { data, error } = await query.order('published_at', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}
