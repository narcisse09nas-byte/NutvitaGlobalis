import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { localMaximusEvents, localMaximusRecords, type MaximusLocalRow } from '@/lib/maximus-local-store';
import { maximusWorkflowActionMap, parseWorkflowItems } from '@/lib/maximus-workflows';

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
  if (!admin?.active || admin.role !== 'super_admin') {
    return { error: NextResponse.json({ message: 'Accès super administrateur requis.' }, { status: 403 }) };
  }
  return { supabase };
}

function createLocalTarget(source: MaximusLocalRow, targetModule: string, title: string, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  const target: MaximusLocalRow = {
    id: crypto.randomUUID(),
    module: targetModule,
    title,
    reference: `WF-${Date.now()}`,
    status: 'draft',
    data: { ...data, source_record_id: source.id },
    workflow_key: source.workflow_key || source.id,
    parent_id: source.id,
    created_at: now,
    updated_at: now,
  };
  localMaximusRecords().push(target);
  return target;
}

function runLocalWorkflow(source: MaximusLocalRow, actionId: string) {
  const data = source.data;
  const items = parseWorkflowItems(data.workflow_items || data.menus || data.menus_quantities || data.items);
  let target: MaximusLocalRow | undefined;

  if (actionId === 'plan_production') {
    target = createLocalTarget(source, 'production/planning', `Production - ${source.title}`, {
      plan_name: `Production - ${source.title}`,
      central_kitchen: data.central_kitchen || '',
      sale_point: data.sale_point || '',
      period_start: data.order_date || '',
      period_end: data.order_date || '',
      menus_quantities: data.menus || '',
      workflow_items: items,
    });
  } else if (actionId === 'complete_production') {
    target = createLocalTarget(source, 'sales/delivery-register', `Livraison - ${source.title}`, {
      reference: `BL-${Date.now()}`,
      sale_point: data.sale_point || '',
      delivery_date: data.period_end || data.period_start || '',
      items: data.menus_quantities || '',
      central_kitchen: data.central_kitchen || '',
      workflow_items: items,
    });
  } else if (actionId === 'confirm_delivery') {
    target = createLocalTarget(source, 'sales/reports', `Ventes - ${source.title}`, {
      sale_point: data.sale_point || '',
      report_date: data.delivery_date || '',
      gross_sales: items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
      workflow_items: items,
    });
  } else if (actionId === 'post_sales') {
    const amount = Number(data.gross_sales || items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
    target = createLocalTarget(source, 'finance/cash-deposits', `Dépôt - ${source.title}`, {
      sale_point: data.sale_point || '',
      report_reference: source.reference || source.id,
      amount,
      deposit_date: data.report_date || '',
    });
  }

  localMaximusEvents().push({
    id: crypto.randomUUID(),
    source_record_id: source.id,
    target_record_id: target?.id || null,
    action: actionId,
    details: { source_module: source.module, target_module: target?.module || null },
    created_at: new Date().toISOString(),
  });
  source.data = { ...source.data, workflow_processed_actions: [...(Array.isArray(source.data.workflow_processed_actions) ? source.data.workflow_processed_actions : []), actionId] };
  return target;
}

export async function POST(request: Request) {
  const ctx = await context();
  if (ctx.error) return ctx.error;
  const body = await request.json();
  const recordId = String(body.recordId || '');
  const actionId = String(body.action || '');
  const action = maximusWorkflowActionMap.get(actionId);
  if (!recordId || !action) return NextResponse.json({ message: 'Action de workflow invalide.' }, { status: 400 });

  if (ctx.local) {
    const source = localMaximusRecords().find(row => row.id === recordId);
    if (!source) return NextResponse.json({ message: 'Élément introuvable.' }, { status: 404 });
    if (source.module !== action.sourceModule || source.status !== 'validated') {
      return NextResponse.json({ message: 'Cette action ne correspond pas au module ou au statut actuel.' }, { status: 400 });
    }
    const processed = Array.isArray(source.data.workflow_processed_actions) ? source.data.workflow_processed_actions : [];
    if (processed.includes(actionId)) return NextResponse.json({ message: 'Cette étape a déjà été exécutée.' }, { status: 409 });
    const target = runLocalWorkflow(source, actionId);
    return NextResponse.json({ target, message: action.successMessage });
  }

  const { data, error } = await ctx.supabase.rpc('advance_maximus_workflow', {
    p_record_id: recordId,
    p_action: actionId,
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ result: data, message: action.successMessage });
}

export async function GET() {
  const ctx = await context();
  if (ctx.error) return ctx.error;
  if (ctx.local) {
    return NextResponse.json({
      events: [...localMaximusEvents()].reverse(),
      stockBalances: [],
      trialBalance: [],
      local: true,
    });
  }

  const [eventsResult, stockResult, accountingResult] = await Promise.all([
    ctx.supabase.from('maximus_workflow_events').select('*').order('created_at', { ascending: false }).limit(50),
    ctx.supabase.from('maximus_stock_balances').select('*').order('item_code'),
    ctx.supabase.from('maximus_trial_balance').select('*').order('account_code'),
  ]);
  const error = eventsResult.error || stockResult.error || accountingResult.error;
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({
    events: eventsResult.data || [],
    stockBalances: stockResult.data || [],
    trialBalance: accountingResult.data || [],
  });
}
