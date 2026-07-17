import { PricingGrid } from "@/components/billing/PricingGrid";

export default function PlansPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-center font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Abonnements
      </p>

      <h1 className="mt-3 text-center text-4xl font-extrabold text-[#063D2E]">
        Choisissez votre plan
      </h1>

      <p className="mx-auto mt-3 max-w-3xl text-center text-slate-600">
        Cette version simule les paiements en local.
      </p>

      <div className="mt-10">
        <PricingGrid />
      </div>
    </div>
  );
}
