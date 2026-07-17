import { cn } from "@/lib/utils";

export function StatCard({
  value,
  label,
  description,
  className,
}: {
  value: string;
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-green-100 bg-white p-6 text-center shadow-sm",
        className
      )}
    >
      <p className="text-4xl font-extrabold text-[#0B5D3B]">{value}</p>
      <h3 className="mt-2 font-bold text-[#063D2E]">{label}</h3>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
    </div>
  );
}