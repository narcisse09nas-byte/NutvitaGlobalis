import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ApplicantIdentity = {
  full_name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
};

export type ResolvedApplicant =
  | { ok: true; userId: string; user: User; server: SupabaseClient; alreadySignedIn: boolean }
  | { ok: false; status: number; message: string };

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Single entry point for "apply without a separate login step" forms.
 * - If the visitor is already signed in under this exact email, reuses that session (no password needed).
 * - If the email belongs to a different existing account, refuses with a clear "log in instead" message.
 * - Otherwise creates the account with the supplied password and signs the browser in immediately.
 */
export async function resolveApplicantAccount(identity: ApplicantIdentity, accountType: string, extraMetadata: Record<string, unknown> = {}): Promise<ResolvedApplicant> {
  const email = identity.email.trim().toLowerCase();
  if (!identity.full_name.trim() || !isEmail(email)) return { ok: false, status: 400, message: "Nom ou adresse email invalide." };

  const server = await createClient();
  const { data: { user: sessionUser } } = await server.auth.getUser();
  if (sessionUser && sessionUser.email?.toLowerCase() === email) {
    return { ok: true, userId: sessionUser.id, user: sessionUser, server, alreadySignedIn: true };
  }

  const admin = createAdminClient();
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = existing.data.users.find(item => item.email?.toLowerCase() === email);
  if (match) {
    return { ok: false, status: 409, message: "Un compte existe déjà avec cette adresse. Connectez-vous pour continuer, ou utilisez « Mot de passe oublié »." };
  }

  if (!identity.password || identity.password.length < 8) return { ok: false, status: 400, message: "Le mot de passe doit contenir au moins 8 caractères." };
  if (identity.password !== identity.password_confirmation) return { ok: false, status: 400, message: "Les mots de passe ne correspondent pas." };

  const created = await admin.auth.admin.createUser({
    email,
    password: identity.password,
    email_confirm: true,
    user_metadata: { full_name: identity.full_name, account_type: accountType, ...extraMetadata },
  });
  if (created.error || !created.data.user) return { ok: false, status: 400, message: created.error?.message || "Création du compte impossible." };

  await server.auth.signInWithPassword({ email, password: identity.password }).catch(() => null);
  return { ok: true, userId: created.data.user.id, user: created.data.user, server, alreadySignedIn: false };
}
