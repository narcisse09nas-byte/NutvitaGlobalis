import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]",
        className
      )}
    >
      {children}
    </span>
  );
}