import { cn } from "@/lib/utils";

type AlertVariant = "success" | "warning" | "danger" | "info";

const styles: Record<AlertVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-orange-200 bg-orange-50 text-orange-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

export function Alert({
  title,
  children,
  variant = "info",
  className,
}: {
  title?: string;
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", styles[variant], className)}>
      {title && <h4 className="mb-1 font-bold">{title}</h4>}
      <div className="text-sm leading-6">{children}</div>
    </div>
  );
}