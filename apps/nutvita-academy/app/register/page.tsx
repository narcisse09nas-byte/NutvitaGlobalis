import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Créer un compte"
        subtitle="Rejoignez NutVitaGlobalis Academy et commencez votre parcours de certification."
        titleEn="Create an account"
        subtitleEn="Join NutVitaGlobalis Academy and start your certification journey."
      >
        <RegisterForm />
      </AuthCard>
    </AuthLayout>
  );
}
