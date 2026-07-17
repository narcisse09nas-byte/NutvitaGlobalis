"use server";

import {
  redirect,
} from "next/navigation";

import {
  getPublicEnvironment,
} from "@/lib/env";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export async function signInAction(
  formData: FormData
) {
  const email =
    String(
      formData.get("email") ?? ""
    )
      .trim()
      .toLowerCase();

  const password =
    String(
      formData.get("password") ??
        ""
    );

  const nextPath =
    String(
      formData.get("next") ??
        "/dashboard"
    );

  if (!email || !password) {
    redirect(
      "/auth/sign-in?error=missing_fields"
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirect(
      `/auth/sign-in?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect(
    nextPath.startsWith("/")
      ? nextPath
      : "/dashboard"
  );
}

export async function signUpAction(
  formData: FormData
) {
  const fullName =
    String(
      formData.get(
        "fullName"
      ) ?? ""
    ).trim();

  const email =
    String(
      formData.get("email") ?? ""
    )
      .trim()
      .toLowerCase();

  const password =
    String(
      formData.get("password") ??
        ""
    );

  if (
    !fullName ||
    !email ||
    password.length < 8
  ) {
    redirect(
      "/auth/sign-up?error=invalid_fields"
    );
  }

  const environment =
    getPublicEnvironment();

  const supabase =
    await createSupabaseServerClient();

  const { error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:
            fullName,
        },
        emailRedirectTo:
          `${environment.siteUrl}/auth/callback`,
      },
    });

  if (error) {
    redirect(
      `/auth/sign-up?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect(
    "/auth/check-email"
  );
}

export async function signOutAction() {
  const supabase =
    await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect(
    "/auth/sign-in"
  );
}
