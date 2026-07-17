import { cn } from "@/lib/utils";

export function FeatureCard({
  icon,
  title,
  description,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-green-100 bg-white p-6 shadow-sm transition hover:-translate-y-1",
        className
      )}
    >
      <div className="mb-5 inline-flex rounded-2xl bg-[#DDF5E8] p-3 text-[#0B5D3B]">
        {icon}
      </div>
      <h3 className="text-xl font-extrabold text-[#063D2E]">{title}</h3>
      <p className="mt-3 text-slate-600">{description}</p>
    </div>
  );
}