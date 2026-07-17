import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-green-100 bg-white p-6 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}