'use client';

import {
  Home,
  Users,
  Map as MapIcon,
  Settings,
  PlusCircle,
  BarChart,
  Warehouse,
  Send,
  Contact,
  UserPlus,
  HeartPulse,
  Bed,
  AlertTriangle,
  ClipboardCheck,
  HelpCircle,
  MessageSquareQuote,
  BookOpen,
  Group,
  Download,
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
import { collection, getDocs, query, where, collectionGroup, Timestamp } from "@/nutritrack/local-firestore";
import { firestore as db } from "@/nutritrack/local-firestore";
import { Child, Visit } from '@/nutritrack/types';
import { useEffect, useState, useCallback } from 'react';
import { ChildCard } from '@/nutritrack/components/child-card';
import { Logo } from '@/nutritrack/components/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/nutritrack/components/ui/card';
import { isAfter } from 'date-fns';
import { Skeleton } from '@/nutritrack/components/ui/skeleton';
import { StatCard } from '@/nutritrack/components/stat-card';

export default function Dashboard() {
  const [stats, setStats] = useState({
      totalAdmissions: 0,
      totalMamAdmissions: 0,
      totalSamAdmissions: 0,
      activeChildren: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
        const allChildrenQuery = query(collection(db, "children"));
        const allChildrenSnapshot = await getDocs(allChildrenQuery);
        const allChildren = allChildrenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Child);
        
        const totalMamAdmissions = allChildren.filter(c => {
            const diag = c.diagnosis;
            return typeof diag === 'object' && diag?.status === 'MAM';
        }).length;
        const totalSamAdmissions = allChildren.filter(c => {
            const diag = c.diagnosis;
            return typeof diag === 'object' && diag?.status === 'SAM';
        }).length;

        const activeChildrenCount = allChildren.filter(c => c.status === 'active').length;
        
        setStats({
            totalAdmissions: allChildren.length,
            totalMamAdmissions: totalMamAdmissions,
            totalSamAdmissions: totalSamAdmissions,
            activeChildren: activeChildrenCount
        });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
      <div className="flex min-h-screen bg-background">
        <Sidebar>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
                <SidebarMenuLabel>Reporting</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/" group="reporting" isActive tooltip='Dashboard'><Home /><span>Dashboard</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/reports" group="reporting" tooltip='Reports'><BarChart /><span>Reports</span></SidebarMenuButton></SidebarMenuItem>
                
                <SidebarMenuLabel>Operations</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/admissions" group="operations" tooltip='Admissions'><PlusCircle /><span>Admissions</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/children" group="operations" tooltip='Children Register'><Users /><span>Children Register</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/incoming-referrals" group="operations" tooltip='Incoming Referrals'><Download /><span>Incoming Referrals</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/referred-out" group="operations" tooltip='Referred Out'><Send /><span>Referred Out</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/special-attention" group="operations" tooltip='Special Attention'><AlertTriangle /><span>Special Attention</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/stock" group="operations" tooltip='Stock'><Warehouse /><span>Stock</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/supervision" group="operations" tooltip='Supervision'><ClipboardCheck /><span>Supervision</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-activities" group="operations" tooltip='Community Activities'><Group /><span>Community Activities</span></SidebarMenuButton></SidebarMenuItem>
                
                <SidebarMenuLabel>Settings</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/health-areas" group="settings" tooltip='Health Areas'><MapIcon /><span>Health Areas</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-mapping" group="settings" tooltip='Community Mapping'><MapIcon /><span>Community Mapping</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/chws" group="settings" tooltip='CHWs'><Contact /><span>CHWs</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/settings" group="settings" tooltip='Commodities'><Settings /><span>Commodities</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/feedback" group="feedback" tooltip='Feedback'><MessageSquareQuote /><span>Feedback</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 text-white sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden text-white" />
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
             <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Program Statistics</CardTitle>
                    <CardDescription>Live overview of key program indicators.</CardDescription>
                </CardHeader>
                 <CardContent>
                    {loading ? (
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                         </div>
                    ) : (
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <StatCard title='Total Admissions' value={stats.totalAdmissions} icon={UserPlus} />
                            <StatCard title='MAM Admissions' value={stats.totalMamAdmissions} icon={Users} />
                            <StatCard title='SAM Admissions' value={stats.totalSamAdmissions} icon={Users} />
                            <StatCard title='Total Active Children' value={stats.activeChildren} icon={HeartPulse} />
                        </div>
                    )}
                 </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
  );
}




