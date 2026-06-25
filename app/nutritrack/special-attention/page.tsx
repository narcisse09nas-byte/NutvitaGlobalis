

'use client';

import {
  Home,
  Users,
  Map as MapIcon,
  Settings,
  PlusCircle,
  BarChart,
  Warehouse,
  Contact,
  Bed,
  AlertTriangle,
  ClipboardCheck,
  HelpCircle,
  MessageSquareQuote,
  BookOpen,
  Group,
  Send,
  Download,
  CalendarX,
  TrendingDown,
  Eye,
  CalendarPlus,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarProvider,
  SidebarMenuLabel,
} from '@/nutritrack/components/ui/sidebar';
import { collection, getDocs, query, collectionGroup, Timestamp, where, doc, updateDoc } from "@/nutritrack/local-firestore";
import { db } from "@/nutritrack/local-firestore";
import { Child, Visit, CHW } from '@/nutritrack/types';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Logo } from '@/nutritrack/components/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/nutritrack/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/nutritrack/components/ui/table';
import { Button } from '@/nutritrack/components/ui/button';
import { Badge } from '@/nutritrack/components/ui/badge';
import { Skeleton } from '@/nutritrack/components/ui/skeleton';
import { format, isAfter, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PlanHomeVisitDialog } from '@/nutritrack/components/plan-home-visit-dialog';
import { useToast } from '@/nutritrack/hooks/use-toast';


interface AttentionChild extends Child {
    attentionReasons: {
        text: string;
        icon: React.ElementType;
    }[];
    latestVisit: Visit | null;
}

function SpecialAttentionPageContent() {
  const [attentionChildren, setAttentionChildren] = useState<AttentionChild[]>([]);
  const [chws, setChws] = useState<CHW[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<AttentionChild | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchSpecialAttentionData = useCallback(async () => {
    setLoading(true);

    try {
        const [activeChildrenSnapshot, chwsSnapshot] = await Promise.all([
             getDocs(query(collection(db, "children"), where('status', '==', 'active'))),
             getDocs(collection(db, "chws"))
        ]);
        
        setChws(chwsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CHW)));

        if (activeChildrenSnapshot.empty) {
            setAttentionChildren([]);
            setLoading(false);
            return;
        }

        const activeChildrenMap = new Map<string, Child>();
        activeChildrenSnapshot.forEach(doc => {
            activeChildrenMap.set(doc.id, { id: doc.id, ...doc.data() } as Child);
        });

        const visitsQuery = query(collectionGroup(db, 'visits'));
        const visitsSnapshot = await getDocs(visitsQuery);

        const visitsByChild = new Map<string, Visit[]>();
        visitsSnapshot.forEach(visitDoc => {
            const visitData = { id: visitDoc.id, ...visitDoc.data() } as Visit;
            const childId = visitDoc.ref.parent.parent!.id; 
            
            if (activeChildrenMap.has(childId)) {
                const childVisits = visitsByChild.get(childId) || [];
                childVisits.push(visitData);
                visitsByChild.set(childId, childVisits);
            }
        });

        const childrenToDisplay: AttentionChild[] = [];

        activeChildrenMap.forEach((child, childId) => {
            const childVisits = (visitsByChild.get(childId) || []).sort((a,b) => a.visitDate.toMillis() - b.visitDate.toMillis());
            if (childVisits.length === 0) return;
            
            const latestVisit = childVisits[childVisits.length - 1];
            
            const reasons: { text: string; icon: React.ElementType }[] = [];
            
            // Condition 1: Missed visit
            const nextVisitDate = latestVisit.nextVisitDate;
            if (nextVisitDate && isAfter(new Date(), (nextVisitDate as Timestamp).toDate())) {
                reasons.push({ text: `Missed visit due ${format((nextVisitDate as Timestamp).toDate(), 'PPP')}`, icon: CalendarX });
            }

            // Condition 2: Child losing weight after 2 consecutive visits
            if (childVisits.length >= 3) {
                const lastVisit = childVisits[childVisits.length - 1];
                const secondLastVisit = childVisits[childVisits.length - 2];
                const thirdLastVisit = childVisits[childVisits.length - 3];
                if (lastVisit.weight < secondLastVisit.weight && secondLastVisit.weight < thirdLastVisit.weight) {
                     reasons.push({ text: 'Losing weight after 2 consecutive visits', icon: TrendingDown });
                }
            }

            // Condition 3: Stagnant weight after 21 days in the programme
            const daysInProgram = differenceInDays(new Date(), child.admissionDate.toDate());
            if (daysInProgram > 21) {
                if (latestVisit.weight <= child.weight) {
                    reasons.push({ text: 'Stagnant weight after 21 days', icon: TrendingDown });
                }
            }
            
            // Condition 4: Oedema still present after 21 days for SAM cases
            const initialDiagnosis = typeof child.diagnosis === 'object' ? child.diagnosis?.status : child.diagnosis;
            if (child.oedema === 'yes' && initialDiagnosis === 'SAM') {
                if (daysInProgram > 21) {
                    if (latestVisit.oedema === 'yes') {
                        reasons.push({ text: 'Oedema present > 21 days', icon: ShieldAlert });
                    }
                }
            }

            if (reasons.length > 0) {
                childrenToDisplay.push({
                    ...child,
                    attentionReasons: reasons,
                    latestVisit: latestVisit,
                });
            }
        });
        
        setAttentionChildren(childrenToDisplay);

    } catch (error) {
        console.error("Error fetching special attention data:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecialAttentionData();
  }, [fetchSpecialAttentionData]);
  
  const handlePlanHomeVisit = (child: AttentionChild) => {
      setSelectedChild(child);
      setIsPlanDialogOpen(true);
  };
  
  const handleSaveHomeVisitPlan = async (data: { date: Date; chwId: string }) => {
    if (!selectedChild) return;
    
    try {
        const childRef = doc(db, 'children', selectedChild.id);
        await updateDoc(childRef, {
            needsHomeVisit: 'yes',
            homeVisitDate: Timestamp.fromDate(data.date),
            homeVisitPlan: {
                reason: selectedChild.attentionReasons.map((r: any) => r.text).join(', '),
                chwId: data.chwId,
            }
        });

        toast({ title: "Success", description: "Home visit has been planned." });
        
        setAttentionChildren(prev => prev.map(child => 
            child.id === selectedChild.id 
            ? { ...child, needsHomeVisit: 'yes' }
            : child
        ));
        
    } catch (error) {
        console.error("Error planning home visit:", error);
        toast({ title: 'Error', description: 'Failed to plan the home visit.', variant: 'destructive' });
    } finally {
        setIsPlanDialogOpen(false);
        setSelectedChild(null);
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <SidebarProvider>
            <Sidebar>
            <SidebarHeader>
                <Logo />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                <SidebarMenuLabel>Reporting</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/" group="reporting" tooltip="Dashboard"><Home /><span>Dashboard</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/reports" group="reporting" tooltip="Reports"><BarChart /><span>Reports</span></SidebarMenuButton></SidebarMenuItem>
                
                <SidebarMenuLabel>Operations</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/admissions" group="operations" tooltip="Admissions"><PlusCircle /><span>Admissions</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/children" group="operations" tooltip="Children Register"><Users /><span>Children Register</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/incoming-referrals" group="operations" tooltip="Incoming Referrals"><Download /><span>Incoming Referrals</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/referred-out" group="operations" tooltip="Referred Out"><Send /><span>Referred Out</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/special-attention" group="operations" isActive tooltip="Special Attention"><AlertTriangle /><span>Special Attention</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/stock" group="operations" tooltip="Stock"><Warehouse /><span>Stock</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/supervision" group="operations" tooltip="Supervision"><ClipboardCheck /><span>Supervision</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-activities" group="operations" tooltip="Community Activities"><Group /><span>Community Activities</span></SidebarMenuButton></SidebarMenuItem>
                
                <SidebarMenuLabel>Settings</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/health-areas" group="settings" tooltip="Health Areas"><MapIcon /><span>Health Areas</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-mapping" group="settings" tooltip="Community Mapping"><MapIcon /><span>Community Mapping</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/chws" group="settings" tooltip="CHWs"><Contact /><span>CHWs</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/settings" group="settings" tooltip="Commodities"><Settings /><span>Commodities</span></SidebarMenuButton></SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/feedback" group="feedback" tooltip="Feedback"><MessageSquareQuote /><span>Feedback</span></SidebarMenuButton></SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            </Sidebar>
        </SidebarProvider>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 text-white sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarProvider>
                <SidebarTrigger className="md:hidden text-white" />
              </SidebarProvider>
              <h1 className="text-lg font-semibold">Children Needing Special Attention</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>High-Priority Children</CardTitle>
                <CardDescription>This is a list of active children who may require immediate follow-up based on their latest visit data.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : attentionChildren.length > 0 ? (
                    <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Child ID</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Reason(s) for Attention</TableHead>
                                  <TableHead>Last Visit Data</TableHead>
                                  <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {attentionChildren.map((child) => (
                                  <TableRow key={child.id}>
                                      <TableCell>
                                          <Badge variant="secondary">{child.childCode}</Badge>
                                      </TableCell>
                                      <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                                      <TableCell>
                                          <div className="flex flex-col gap-2">
                                          {child.attentionReasons.map(reason => (
                                              <span key={reason.text} className="flex items-center gap-1.5 text-destructive text-sm">
                                                  <reason.icon className="h-4 w-4" />
                                                  {reason.text}
                                              </span>
                                          ))}
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                          <p>Date: {child.latestVisit ? format((child.latestVisit.visitDate as Timestamp).toDate(), 'PPP') : 'N/A'}</p>
                                          <p>Weight: {child.latestVisit?.weight}kg | MUAC: {child.latestVisit?.muac}mm</p>
                                      </TableCell>
                                      <TableCell className="text-right space-x-2">
                                          {child.needsHomeVisit === 'yes' ? (
                                              <Badge variant="default" className="flex items-center gap-1.5">
                                                  <CheckCircle className="h-4 w-4" />
                                                  Visit Planned
                                              </Badge>
                                          ) : (
                                              <Button variant="outline" size="sm" onClick={() => handlePlanHomeVisit(child)}>
                                                  <CalendarPlus className="mr-2 h-4 w-4" />
                                                  Plan Visit
                                              </Button>
                                          )}
                                          <Button variant="outline" size="sm" onClick={() => router.push(`/nutritrack/children/${child.id}`)}>
                                              <Eye className="mr-2 h-4 w-4" />
                                              View
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-muted-foreground py-10">No children currently need special attention.</p>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>

       <PlanHomeVisitDialog
            isOpen={isPlanDialogOpen}
            onClose={() => setIsPlanDialogOpen(false)}
            onSave={handleSaveHomeVisitPlan}
            child={selectedChild}
            chws={chws}
      />
    </>
  );
}

export default SpecialAttentionPageContent;





