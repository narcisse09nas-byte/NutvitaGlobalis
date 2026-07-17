import { CreateLiveSessionForm } from "@/components/live/CreateLiveSessionForm";
import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";

export default function NewLiveSessionPage() {
  return (
    <LocalRoleGuard allowedRoles={["instructor", "admin", "super_admin"]}>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          Classes virtuelles
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          Planifier une session
        </h1>

        <div className="mt-8">
          <CreateLiveSessionForm />
        </div>
      </div>
    </LocalRoleGuard>
  );
}
