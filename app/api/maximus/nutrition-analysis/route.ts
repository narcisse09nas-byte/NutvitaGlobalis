import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { analyzeMaximusMenu } from '@/lib/maximus-nutrition-analysis';

async function authorized() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    return (await cookies()).get('nutvita_local_admin')?.value === '1';
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: admin } = await supabase.from('admin_users').select('role,active').eq('id', user.id).maybeSingle();
  return Boolean(admin?.active && admin.role === 'super_admin');
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ message: 'Accès Maximus requis.' }, { status: 401 });
  const body = await request.json();
  const menu = body.menu && typeof body.menu === 'object' ? body.menu as Record<string, unknown> : null;
  const language = body.language === 'fr' ? 'fr' : 'en';
  if (!menu || !String(menu.name || menu.title || '').trim()) {
    return NextResponse.json({ message: 'Menu invalide ou incomplet.' }, { status: 400 });
  }
  const servings = Number(menu.servings || 0);
  if (!menu.ingredients || !servings || servings <= 0) {
    return NextResponse.json({ message: 'Le menu doit contenir des ingrédients et un nombre de portions valide.' }, { status: 400 });
  }
  const analysis = await analyzeMaximusMenu(menu, language);
  return NextResponse.json({ analysis });
}
