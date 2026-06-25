
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/nutritrack/components/ui/card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    unit?: string;
}

export function StatCard({ title, value, icon: Icon, unit }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value} {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}</div>
      </CardContent>
    </Card>
  );
}


