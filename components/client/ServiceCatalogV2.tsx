"use client";
import { useMemo, useState } from "react";
import { AppWindow, ArrowRight, BarChart3, BriefcaseBusiness, Crown, GraduationCap, HeartPulse, Info, Salad, Stethoscope, Users } from "lucide-react";
import type { ClientServiceCatalogSettings } from "@/data/client-service-catalog";

type Row = Record<string, any>;
type Choice = { service: string; role: string };
type Card = ClientServiceCatalogSettings["cards"][number];

const icons: Record<string, typeof HeartPulse> = { stethoscope: Stethoscope, medical: Stethoscope, chart: BarChart3, crown: Crown, child: HeartPulse, family: Users, academy: GraduationCap, apps: AppWindow, meal: Salad, briefcase: BriefcaseBusiness };
const tier = (v: string) => ["basic", "standard"].includes(String(v).toLowerCase()) ? "standard" : String(v).toLowerCase();
const TIERED_SERVICES = ["health_tracking", "child_growth"];

// plans: catalog of currently purchasable (active=true) plans — used to build checkout links.
// allPlans: every subscription_plans row regardless of active flag — used only to resolve what a
// client's existing subscription.plan_id actually is, so a plan later deactivated/superseded by a
// catalog change never makes an already-paying client look unentitled (mirrors the resolution
// getClientEntitlements() already does server-side for lib/client.ts's own access checks).
export default function ServiceCatalogV2({ settings, plans, children, subscriptions = [], choices = [], allPlans = [], english = false }: {
  settings: ClientServiceCatalogSettings; plans: Row[]; children: Row[]; subscriptions?: Row[]; choices?: Choice[]; allPlans?: Row[]; english?: boolean;
}) {
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || "");
  const t = (fr: string, en: string) => english ? (en || fr) : fr;

  const planById = useMemo(() => {
    const map = new Map<string, Row>();
    for (const p of allPlans) map.set(p.id, p);
    for (const p of plans) if (!map.has(p.id)) map.set(p.id, p);
    return map;
  }, [plans, allPlans]);

  const planFor = (c: Card) => plans.find(p => p.service_type === c.service_type && tier(p.tier) === tier(c.tier));
  const active = useMemo(() => subscriptions.filter(s => s.status === "active" && (!s.expires_at || +new Date(s.expires_at) > Date.now())), [subscriptions]);
  const choice = (s: string) => choices.find(x => x.service === s);

  // Resolves the plan behind the client's current active subscription for a service_type — via
  // the subscription's own plan_id, never by re-guessing "the" plan a card ought to map to, so
  // duplicate/renamed/deactivated catalog rows can't desync entitlement from what was actually bought.
  function ownedPlan(serviceType: string) {
    const match = active.find(s => {
      const p = planById.get(s.plan_id);
      if (!p || p.service_type !== serviceType) return false;
      if (serviceType === "child_growth" && selectedChild && s.child_id && s.child_id !== selectedChild) return false;
      return true;
    });
    return match ? planById.get(match.plan_id) : undefined;
  }

  function hasAccess(c: Card) {
    if (TIERED_SERVICES.includes(c.service_type)) {
      const owned = ownedPlan(c.service_type);
      return Boolean(owned && tier(owned.tier) === tier(c.tier));
    }
    return Boolean(choice(c.service_type === "medical_consultation" ? "medical_consultation" : c.service_type));
  }

  function details(c: Card) { location.href = c.destination; }

  function open(c: Card) {
    const granted = hasAccess(c);
    const map: Record<string, string> = { teleconsultation: "teleconsultation", academy: "academy", medical_consultation: "medical_consultation" };
    if (map[c.service_type] && granted) { const ch = choice(map[c.service_type]); location.href = `/api/access/open?service=${map[c.service_type]}&role=${ch?.role || "client"}`; return; }
    if (c.service_type === "medical_consultation") { location.href = "/consultations-medicales/specialistes"; return; }
    if (c.service_type === "teleconsultation") { location.href = "/nutritionnistes"; return; }
    if (c.service_type === "health_tracking" && granted) { location.href = "/api/access/open?service=health&role=client"; return; }
    if (c.service_type === "child_growth" && granted) { location.href = "/api/access/open?service=child_growth&role=client"; return; }
    // Not yet owned at this tier (including the "upgrade to Premium" case) — send straight to
    // checkout for this card's plan. No longer gated on unrelated `choices` (teleconsultation/
    // medical/academy access records), which could otherwise strand a brand-new client with none
    // of those on `c.destination` instead of the purchase page.
    const plan = planFor(c);
    if (plan) { const child = c.service_type === "child_growth" ? `&child_id=${encodeURIComponent(selectedChild)}` : ""; location.href = `/checkout?type=subscription&id=${encodeURIComponent(plan.id)}${child}`; return; }
    location.href = c.destination;
  }

  const hasConsultation = Boolean(choice("teleconsultation") || choice("medical_consultation"));

  return <div className="grid gap-8">
    {children.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4"><label className="font-black">{english ? "Child concerned" : "Enfant concerné"}</label><select className="admin-input max-w-xs" value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>{children.map(c => <option key={c.id} value={c.id}>{c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ")}</option>)}</select></div>}
    <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr))]">
      {settings.cards.filter(c => c.active && !(hasConsultation && c.service_type === "health_tracking")).map(c => {
        const Icon = icons[c.icon] || HeartPulse;
        const granted = hasAccess(c);
        const premium = tier(c.tier) === "premium";
        const ownedTier = TIERED_SERVICES.includes(c.service_type) ? (() => { const owned = ownedPlan(c.service_type); return owned ? tier(owned.tier) : null; })() : null;
        const blocked = tier(c.tier) === "standard" && ownedTier === "premium";
        const upgradeable = premium && !granted && ownedTier === "standard";
        const label = blocked ? t("Inclus dans Premium", "Included in Premium") : granted ? t("Ouvrir le service", "Open service") : upgradeable ? t("Passer à Premium", "Upgrade to Premium") : t(c.primary_label, c.primary_label_en);
        return <article key={c.id} className="group grid min-h-[250px] overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:grid-cols-[minmax(0,1fr)_38%]">
          <div className="flex min-w-0 flex-col p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-mint text-leaf"><Icon className="h-7 w-7" /></span>
              <div><h2 className="break-words text-xl font-black leading-tight">{t(c.title, c.title_en)}</h2>{c.badge && <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${premium ? "bg-orange/15 text-orange" : "bg-mint"}`}>{t(c.badge, c.badge_en)}</span>}</div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">{t(c.description, c.description_en)}</p>
            <div className="mt-auto flex flex-wrap gap-3 pt-5">
              <button onClick={() => details(c)} className="rounded-full border border-leaf px-4 py-2 text-sm font-black">{t(c.secondary_label, c.secondary_label_en)}</button>
              <button disabled={blocked} onClick={() => open(c)} className={`rounded-full px-4 py-2 text-sm font-black text-white disabled:bg-slate-300 ${premium ? "bg-orange" : "bg-leaf"}`}>{label}<ArrowRight className="ml-2 inline h-4" /></button>
            </div>
          </div>
          <img src={c.image_url} alt="" className="hidden h-full min-h-[250px] w-full object-cover sm:block" />
        </article>;
      })}
    </div>
    <section className="grid items-center gap-6 rounded-3xl bg-gradient-to-r from-[#eaf6ef] to-white p-7 lg:grid-cols-[1.25fr_repeat(4,1fr)]">
      <div><h2 className="text-2xl font-black">{t(settings.footer_title, settings.footer_title_en)}</h2><p className="mt-2 text-sm text-slate-600">{t(settings.footer_text, settings.footer_text_en)}</p></div>
      {[english ? "Scientific expertise" : "Expertise scientifique", english ? "Security and privacy" : "Sécurité et confidentialité", english ? "Measurable impact" : "Impact mesurable", english ? "Responsive support" : "Support réactif"].map((label, i) => <div key={label} className="flex items-center gap-3 border-l border-slate-200 pl-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-mint text-leaf">{i === 0 ? <Info /> : i === 1 ? <HeartPulse /> : i === 2 ? <BarChart3 /> : <Users />}</span><b className="text-sm">{label}</b></div>)}
    </section>
  </div>;
}
