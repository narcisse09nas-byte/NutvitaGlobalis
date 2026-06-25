import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSystemEmail } from '@/lib/system-email';

export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Non authentifie.' }, { status: 401 });
  const { data: admin } = await session
    .from('admin_users')
    .select('role')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (admin?.role !== 'super_admin') {
    return NextResponse.json({ message: 'Super administrateur requis.' }, { status: 403 });
  }

  const body = await request.json();
  const action = String(body.action || '');
  const organizationId = String(body.id || '');
  const service = createAdminClient();
  const { data: organization } = await service
    .from('nutritrack_organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle();
  if (!organization) return NextResponse.json({ message: 'Organisation introuvable.' }, { status: 404 });

  if (action === 'approve') {
    const now = new Date().toISOString();
    const { error } = await service
      .from('nutritrack_organizations')
      .update({ status: 'approved', reviewed_by: user.id, reviewed_at: now, admin_notes: body.reason || null })
      .eq('id', organizationId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await service
      .from('nutritrack_members')
      .update({
        status: 'active',
        role: 'organization_admin',
        roles: ['organization_admin', 'creator', 'verifier', 'validator'],
      })
      .eq('organization_id', organizationId)
      .eq('user_id', organization.owner_user_id);
    await service.from('nutritrack_access_logs').insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: 'organization_approved',
      target_type: 'organization',
      target_id: organizationId,
      details: { reason: body.reason || null },
    });
    await sendSystemEmail(service, 'nutritrack_request_approved', organization.contact_email, {
      name: organization.contact_name,
      organization: organization.name,
      action_url: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/nutritrack`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const reason = String(body.reason || '').trim();
    if (!reason) return NextResponse.json({ message: 'La raison est obligatoire.' }, { status: 400 });
    await service
      .from('nutritrack_organizations')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: reason,
      })
      .eq('id', organizationId);
    await service.from('nutritrack_access_logs').insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: 'organization_rejected',
      target_type: 'organization',
      target_id: organizationId,
      details: { reason },
    });
    await sendSystemEmail(service, 'nutritrack_request_rejected', organization.contact_email, {
      name: organization.contact_name,
      organization: organization.name,
      reason,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const reason = String(body.reason || '').trim();
    if (!reason) return NextResponse.json({ message: 'La raison est obligatoire.' }, { status: 400 });
    await service.from('admin_activity_logs').insert({
      admin_id: user.id,
      action: 'nutritrack_organization_deleted',
      resource_type: 'nutritrack_organization',
      resource_id: organizationId,
      details: {
        reason,
        organization: organization.name,
        owner_user_id: organization.owner_user_id,
        contact_email: organization.contact_email,
      },
    });
    const { error } = await service.from('nutritrack_organizations').delete().eq('id', organizationId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: 'Action inconnue.' }, { status: 400 });
}
