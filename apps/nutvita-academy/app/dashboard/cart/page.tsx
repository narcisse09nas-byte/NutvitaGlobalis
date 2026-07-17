import { CartManager } from "@/components/marketplace/CartManager";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Marketplace
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        Mon panier
      </h1>
      <div className="mt-8">
        <CartManager />
      </div>
    </div>
  );
}
