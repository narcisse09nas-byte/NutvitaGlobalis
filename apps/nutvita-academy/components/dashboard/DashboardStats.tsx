import { Card } from "@/components/ui/Card";
import { BookOpen, Clock, CheckCircle, Award } from "lucide-react";

const icons = [BookOpen, Clock, CheckCircle, Award];

export function DashboardStats({
  stats,
}: {
  stats: { label: string; value: string }[];
}) {
  return (
    <div className="grid gap-6 md:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = icons[index];

        return (
          <Card key={stat.label}>
            <Icon
              className={index === 3 ? "text-[#F58220]" : "text-[#0B5D3B]"}
              size={30}
            />

            <p className="mt-4 text-3xl font-extrabold text-[#063D2E]">
              {stat.value}
            </p>

            <p className="text-sm text-slate-600">{stat.label}</p>
          </Card>
        );
      })}
    </div>
  );
}