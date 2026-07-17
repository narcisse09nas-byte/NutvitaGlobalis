type PublicEnvironment = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
  appEnv: string;
};

function requireEnvironment(
  name: string,
  value: string | undefined
): string {
  if (!value) {
    throw new Error(
      `Variable d’environnement manquante : ${name}`
    );
  }

  return value;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getPublicEnvironment(): PublicEnvironment {
  return {
    supabaseUrl: requireEnvironment(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    supabaseAnonKey: requireEnvironment(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    siteUrl:
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000",
    appEnv:
      process.env.APP_ENV ??
      process.env.NODE_ENV ??
      "development",
  };
}

export function getServiceRoleKey(): string {
  return requireEnvironment(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getFlutterwaveEnvironment() {
  return {
    secretKey: requireEnvironment("FLW_SECRET_KEY", process.env.FLW_SECRET_KEY),
    webhookSecret: requireEnvironment("FLW_WEBHOOK_SECRET", process.env.FLW_WEBHOOK_SECRET),
  };
}

export function isFlutterwaveConfigured() {
  return Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_SECRET);
}
