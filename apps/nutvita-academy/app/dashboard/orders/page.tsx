import { OrdersList } from "@/components/marketplace/OrdersList";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Marketplace
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        Mes commandes
      </h1>
      <div className="mt-8">
        <OrdersList />
      </div>
    </div>
  );
}
