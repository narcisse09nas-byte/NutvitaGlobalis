import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
};

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const safeValue = Math.min(
    100,
    Math.max(0, value)
  );

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
          {label && (
            <span className="font-semibold text-slate-700">
              {label}
            </span>
          )}

          {showPercentage && (
            <span className="font-bold text-[#0B5D3B]">
              {safeValue}%
            </span>
          )}
        </div>
      )}

      <div className="h-3 overflow-hidden rounded-full bg-green-100">
        <div
          className={cn(
            "h-full rounded-full bg-[#0B5D3B] transition-all duration-500"
          )}
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}