import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function ModuleProgressList({
  modules,
}: {
  modules: {
    title: string;
    status: string;
    progress: number;
    href: string;
  }[];
}) {
  return (
    <Card className="mt-6">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        Modules de la certification
      </h2>

      <div className="mt-5 space-y-4">
        {modules.map((module, index) => (
          <div
            key={module.title}
            className="rounded-2xl bg-[#F8FAFC] p-4"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <p className="font-bold text-[#063D2E]">
                  Module {index + 1}
                </p>
                <p className="text-sm text-slate-600">{module.title}</p>
              </div>

              <Badge>{module.status}</Badge>
            </div>

            <div className="mt-4 h-2 rounded-full bg-green-100">
              <div
                className="h-2 rounded-full bg-[#0B5D3B]"
                style={{ width: `${module.progress}%` }}
              />
            </div>

            <Button href={module.href} variant="outline" className="mt-4">
              Ouvrir
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}