import { ClockIcon } from "@heroicons/react/24/outline";

export default function PhasePlaceholder({ title, sprintNote }: { title: string; sprintNote: string }) {
  return <section className="rounded-3xl border border-dashed border-forest/20 bg-white p-8 text-center">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-leaf"><ClockIcon className="h-7" /></span>
    <h2 className="mt-4 text-xl font-black text-forest">{title}</h2>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{sprintNote}</p>
  </section>;
}
