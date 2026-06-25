import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSystemEmail } from '@/lib/system-email';

const roles = ['organization_admin', 'creator', 'verifier', 'validator'];

function normalizeRoles(value: unknown, fallback = 'creator') {
  const incoming = Array.isArray(value) ? value.map(String) : [fallback];
  const valid = [...new Set(incoming.filter(role => roles.includes(role)))];
  return valid.includes('organization_admin') ? roles : valid.length ? valid : ['creator'];
}

export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Non authentifie.' }, { status: 401 });
  const { data: member } = await session
    .from('nutritrack_members')
    .select('*,nutritrack_organizations(name,status)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (
    !member
    || (member.role !== 'organization_admin' && !member.roles?.includes('organization_admin'))
    || member.nutritrack_organizations?.status !== 'approved'
  ) {
    return NextResponse.json({ message: 'Administrateur NutriTrack requis.' }, { status: 403 });
  }

  const body = await request.json();
  const action = String(body.action || 'invite');
  const service = createAdminClient();

  if (action === 'invite') {
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.full_name || '').trim();
    const memberRoles = normalizeRoles(body.roles, String(body.role || 'creator'));
    const role = memberRoles.includes('organization_admin') ? 'organization_admin' : memberRoles[0];
    const facilities = Array.isArray(body.facilities) ? body.facilities.map(String) : [];
    if (!email || !fullName) {
      return NextResponse.json({ message: 'Informations du membre invalides.' }, { status: 400 });
    }
    const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let target = listed.data.users.find(candidate => candidate.email?.toLowerCase() === email);
    let invited = false;
    if (!target) {
      const result = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/mot-de-passe-oublie`,
        data: { full_name: fullName, account_type: 'nutritrack_staff' },
      });
      if (result.error || !result.data.user) {
        return NextResponse.json({ message: result.error?.message || 'Invitation impossible.' }, { status: 400 });
      }
      target = result.data.user;
      invited = true;
    }
    const { data: saved, error } = await service
      .from('nutritrack_members')
      .upsert({
        organization_id: member.organization_id,
        user_id: target.id,
        email,
        full_name: fullName,
        role,
        roles: memberRoles,
        status: 'active',
        invited_by: user.id,
      }, { onConflict: 'organization_id,user_id' })
      .select('*')
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await service.from('nutritrack_member_facilities').delete().eq('member_id', saved.id);
    if (facilities.length) {
      await service.from('nutritrack_member_facilities').insert(
        facilities.map((facility_document_id: string) => ({
          member_id: saved.id,
          facility_document_id,
        })),
      );
    }
    if (!invited) {
      await sendSystemEmail(service, 'nutritrack_staff_invited', email, {
        name: fullName,
        organization: member.nutritrack_organizations.name,
        role: memberRoles.join(', '),
        action_url: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/acces-nutritrack`,
      });
    }
    await service.from('nutritrack_access_logs').insert({
      organization_id: member.organization_id,
      actor_id: user.id,
      action: 'member_invited',
      target_type: 'member',
      target_id: saved.id,
      details: { email, roles: memberRoles, facilities },
    });
    return NextResponse.json({ ok: true, member: saved });
  }

  const targetId = String(body.id || '');
  const { data: target } = await service
    .from('nutritrack_members')
    .select('*')
    .eq('id', targetId)
    .eq('organization_id', member.organization_id)
    .maybeSingle();
  if (!target) return NextResponse.json({ message: 'Membre introuvable.' }, { status: 404 });
  if (target.user_id === user.id && action === 'remove') {
    return NextResponse.json({ message: 'Vous ne pouvez pas retirer votre propre acces.' }, { status: 400 });
  }

  if (action === 'update') {
    const memberRoles = normalizeRoles(body.roles ?? target.roles, String(body.role || target.role));
    const role = memberRoles.includes('organization_admin') ? 'organization_admin' : memberRoles[0];
    const facilities = Array.isArray(body.facilities) ? body.facilities.map(String) : [];
    await service.from('nutritrack_members').update({
      role,
      roles: memberRoles,
      status: body.status === 'suspended' ? 'suspended' : 'active',
    }).eq('id', target.id);
    await service.from('nutritrack_member_facilities').delete().eq('member_id', target.id);
    if (facilities.length) {
      await service.from('nutritrack_member_facilities').insert(
        facilities.map((facility_document_id: string) => ({
          member_id: target.id,
          facility_document_id,
        })),
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'remove') {
    await service.from('nutritrack_members').delete().eq('id', target.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ message: 'Action inconnue.' }, { status: 400 });
}
