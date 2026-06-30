import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { localMaximusRecords } from '@/lib/maximus-local-store';

const sources = {
  centralKitchens: { module: 'production/central-kitchens', fields: ['name'] },
  salePoints: { module: 'sales/sale-points', fields: ['name'] },
  ingredients: { module: 'supply/ingredients', fields: ['name'] },
  budgetLines: { module: 'finance/budget-lines', fields: ['code', 'description'] },
  staff: { module: 'hr/staff', fields: ['full_name', 'employee_number'] },
  vendors: { module: 'partnerships/vendors', fields: ['structure_name', 'contact_name'] },
  assets: { module: 'assets/inventory', fields: ['name', 'asset_code'] },
  menus: { module: 'menus', fields: ['name'] },
} as const;

type SourceKey = keyof typeof sources;
type Option = { value: string; label: string };
type OptionRow = { data: Record<string, unknown>; title: string; status?: string };

async function context() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    if ((await cookies()).get('nutvita_local_admin')?.value !== '1') {
      return { error: NextResponse.json({ message: 'Session administrateur locale requise.' }, { status: 401 }) };
    }
    return { local: true as const };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: 'Authentification requise.' }, { status: 401 }) };
  const { data: admin } = await supabase.from('admin_users').select('role,active').eq('id', user.id).maybeSingle();
  if (!admin?.active || admin.role !== 'super_admin') return { error: NextResponse.json({ message: 'Acces super administrateur requis.' }, { status: 403 }) };
  return { supabase };
}

function labelFor(data: Record<string, unknown>, fields: readonly string[]) {
  const parts = fields.map(field => data[field]).filter(Boolean).map(String);
  return parts.join(' - ');
}

function optionsFromRows(rows: OptionRow[], key: SourceKey): Option[] {
  const source = sources[key];
  const seen = new Set<string>();
  return rows
    .filter(row => key !== 'vendors' || row.status === 'validated')
    .filter(row => key !== 'assets' || !row.data.record_type || row.data.record_type === 'asset')
    .filter(row => row && typeof row.data === 'object')
    .map(row => {
      const label = labelFor(row.data, source.fields) || row.title;
      return { value: label, label };
    })
    .filter(option => {
      if (!option.value || seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function GET() {
  const ctx = await context();
  if (ctx.error) return ctx.error;

  const moduleList: string[] = [...new Set(Object.values(sources).map(source => source.module))];
  const rows = ctx.local
    ? localMaximusRecords().filter(row => moduleList.includes(row.module))
    : (await ctx.supabase.from('maximus_records').select('module,title,data,status').in('module', moduleList).order('created_at', { ascending: false })).data || [];

  const payload = Object.keys(sources).reduce((acc, key) => {
    const sourceKey = key as SourceKey;
    acc[sourceKey] = optionsFromRows(rows.filter(row => row.module === sources[sourceKey].module) as any, sourceKey);
    return acc;
  }, {} as Record<SourceKey, Option[]>);

  return NextResponse.json(payload);
}
