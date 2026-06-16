import FeedbackForm from "@/components/feedback/FeedbackForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Satisfaction" };

export default async function Page({ searchParams }: { searchParams: Promise<{ service?: string; id?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <main><section className="section bg-mint"><div className="container-site max-w-4xl text-center"><p className="eyebrow">Satisfaction client</p><h1 className="text-4xl font-black md:text-6xl">Evaluer un service</h1></div></section><section className="section"><div className="container-site max-w-2xl"><FeedbackForm clientId={user?.id} serviceType={params.service || "support"} serviceId={params.id} /></div></section></main>;
}
