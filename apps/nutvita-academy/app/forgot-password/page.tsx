import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Mot de passe oublié"
        subtitle="Entrez votre email pour recevoir un lien de réinitialisation."
        titleEn="Forgot password"
        subtitleEn="Enter your email address to receive a reset link."
      >
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
