import {
  signUpAction,
} from "@/lib/auth/actions";
import { LocalizedText } from "@/components/i18n/LocalizedText";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-12">
      <form
        action={signUpAction}
        className="w-full max-w-md rounded-[28px] border border-green-100 bg-white p-8"
      >
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          NutVitaGlobalis Academy
        </p>

        <LocalizedText as="h1" className="mt-3 text-3xl font-extrabold text-[#063D2E]" fr="Créer un compte" en="Create an account" />

        {params.error && (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            <LocalizedText fr="Inscription impossible. Vérifiez les informations saisies." en="Unable to register. Check the information entered." />
          </p>
        )}

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            <LocalizedText fr="Nom complet" en="Full name" />
          </span>

          <input
            name="fullName"
            required
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            <LocalizedText fr="Adresse email" en="Email address" />
          </span>

          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold text-[#063D2E]">
            <LocalizedText fr="Mot de passe" en="Password" />
          </span>

          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
        >
          <LocalizedText fr="Créer mon compte" en="Create my account" />
        </button>

        <a
          href="/auth/sign-in"
          className="mt-5 block text-center font-bold text-[#0B5D3B]"
        >
          <LocalizedText fr="J’ai déjà un compte" en="I already have an account" />
        </a>
      </form>
    </main>
  );
}
