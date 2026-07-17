import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/Button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-green-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
        <Icon size={30} />
      </div>

      <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-lg text-slate-600">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Button
          href={actionHref}
          variant="secondary"
          className="mt-6"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}