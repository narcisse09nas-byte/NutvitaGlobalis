import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PlayCircle } from "lucide-react";

export function ContinueLearning({
  course,
}: {
  course: {
    code: string;
    title: string;
    subtitle: string;
    progress: number;
    nextHref: string;
  };
}) {
  return (
    <Card>
      <div className="flex flex-col justify-between gap-6 md:flex-row">
        <div>
          <Badge>{course.code}</Badge>

          <h2 className="mt-4 text-2xl font-extrabold text-[#063D2E]">
            {course.title}
          </h2>

          <p className="mt-3 text-slate-600">{course.subtitle}</p>

          <div className="mt-5 h-3 rounded-full bg-green-100">
            <div
              className="h-3 rounded-full bg-[#0B5D3B]"
              style={{ width: `${course.progress}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Progression : {course.progress}%
          </p>
        </div>

        <div className="flex items-center">
          <Button href={course.nextHref} variant="secondary">
            <PlayCircle size={16} className="mr-2" />
            Continuer
          </Button>
        </div>
      </div>
    </Card>
  );
}