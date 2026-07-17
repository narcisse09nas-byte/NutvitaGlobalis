import { LocalizedText } from "@/components/i18n/LocalizedText";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6">
      <div className="max-w-xl rounded-[28px] border border-green-100 bg-white p-10 text-center">
        <LocalizedText as="h1" className="text-3xl font-extrabold text-[#063D2E]" fr="Vérifiez votre messagerie" en="Check your inbox" />
        <LocalizedText as="p" className="mt-4 leading-7 text-slate-600" fr="Un lien de confirmation a été envoyé à votre adresse email." en="A confirmation link has been sent to your email address." />
        <a href="/auth/sign-in" className="mt-7 inline-flex rounded-full bg-[#F58220] px-6 py-3 font-bold text-white">
          <LocalizedText fr="Retour à la connexion" en="Back to sign in" />
        </a>
      </div>
    </main>
  );
}
