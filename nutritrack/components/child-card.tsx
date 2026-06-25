
'use client';

import { Child, Visit } from '@/nutritrack/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/nutritrack/components/ui/card';
import { Badge } from '@/nutritrack/components/ui/badge';
import { Button } from '@/nutritrack/components/ui/button';
import { useRouter } from 'next/navigation';
import { AlertCircle, TrendingDown, CalendarX } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { useMemo } from 'react';
import { Timestamp } from '@/nutritrack/local-firestore';

interface ChildCardProps {
  child: Child;
}

export function ChildCard({ child }: ChildCardProps) {
  const router = useRouter();

  const latestVisit = useMemo(() => {
    if (!child.visits || child.visits.length === 0) return null;
    return child.visits[child.visits.length - 1];
  }, [child.visits]);

  const previousVisit = useMemo(() => {
     if (!child.visits || child.visits.length < 2) return null;
     return child.visits[child.visits.length - 2];
  }, [child.visits]);

  const attentionReasons = useMemo(() => {
    const reasons: { text: string; icon: React.ElementType }[] = [];
    if (!latestVisit) return reasons;

    const nextVisitDate = latestVisit.nextVisitDate;
    if (nextVisitDate && isAfter(new Date(), (nextVisitDate as Timestamp).toDate())) {
        reasons.push({ text: `Missed visit due ${format((nextVisitDate as Timestamp).toDate(), 'PPP')}`, icon: CalendarX });
    }

    if(previousVisit) {
        if (latestVisit.weight < previousVisit.weight) {
            reasons.push({ text: 'Weight loss since last visit', icon: TrendingDown });
        }
        if (latestVisit.muac <= previousVisit.muac) {
            reasons.push({ text: 'MUAC stagnated or decreased', icon: TrendingDown });
        }
    }

    return reasons;
  }, [latestVisit, previousVisit]);

  const getVisitDate = (visit: Visit | null) => {
    if (!visit || !visit.visitDate) return 'N/A';
    const date = visit.visitDate;
    if (date instanceof Timestamp) {
        return format(date.toDate(), 'PPP');
    }
    // This fallback might be needed if date is a string, but prefer Timestamp
    return format(new Date(date), 'PPP');
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle className="text-lg">{child.firstName} {child.lastName}</CardTitle>
                 <CardDescription>ID: <Badge variant="secondary">{child.childCode}</Badge></CardDescription>
            </div>
             <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Attention
             </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <p className="font-semibold text-sm">Reason(s) for attention:</p>
        <ul className="space-y-2 text-sm text-destructive">
            {attentionReasons.map(reason => (
                <li key={reason.text} className="flex items-center gap-2">
                    <reason.icon className="h-4 w-4" />
                    <span>{reason.text}</span>
                </li>
            ))}
        </ul>
        <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>Latest Visit: {getVisitDate(latestVisit)}</p>
            <p>Weight: {latestVisit?.weight}kg | MUAC: {latestVisit?.muac}mm</p>
        </div>

      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => router.push(`/nutritrack/children/${child.id}`)}>View Details</Button>
      </CardFooter>
    </Card>
  );
}



