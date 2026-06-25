import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getNutriTrackAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null, organization: null };

  const { data: member } = await supabase
    .from('nutritrack_members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  const { data: organization } = member
    ? await supabase
        .from('nutritrack_organizations')
        .select('*')
        .eq('id', member.organization_id)
        .maybeSingle()
    : { data: null };
  return { supabase, user, member, organization };
}

export async function requireNutriTrackAccess() {
  const context = await getNutriTrackAccess();
  if (!context.user) redirect('/acces-nutritrack?connexion=requise');
  if (
    !context.member
    || context.member.status !== 'active'
    || context.organization?.status !== 'approved'
  ) {
    redirect('/acces-nutritrack');
  }
  return context as typeof context & {
    user: NonNullable<typeof context.user>;
    member: NonNullable<typeof context.member>;
    organization: NonNullable<typeof context.organization>;
  };
}
