

'use client';

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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart as BarChartIcon, Warehouse, Calendar as CalendarIcon, Contact, HelpCircle, UserPlus, UserMinus, MessageSquareQuote, Group, Send, Bed, AlertTriangle, ClipboardCheck, Download as DownloadIcon, TrendingUp, Clock, UserCheck, Ban, Skull, Meh, Sparkles, FileText, FileSpreadsheet } from 'lucide-react';
import { Logo } from '@/nutritrack/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, query, where, Timestamp, collectionGroup } from '@/nutritrack/local-firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Child, HealthArea, Commodity, StockMovement, Visit, CommodityProgram, Diagnosis, InpatientVisit, CommunityScreening, CommunitySensitization, CommunityHomeVisit, Village, DiagnosisResult, Supervision } from '@/nutritrack/types';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/nutritrack/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { subDays, format, startOfDay, endOfDay, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Button } from '@/nutritrack/components/ui/button';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/nutritrack/components/ui/table';
import { MultiSelect } from '@/nutritrack/components/ui/multi-select';
import { Skeleton } from '@/nutritrack/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/nutritrack/components/ui/tabs';
import { StatCard } from '@/nutritrack/components/stat-card';
import { Badge } from '@/nutritrack/components/ui/badge';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { summarizeHomeVisits } from '@/nutritrack/ai/flows/summarize-home-visits-flow';
import { createClient } from '@/lib/supabase/client';


type Option = { label: string; value: string };

interface ProgramReportData {
    activeBeneficiaries: number;
    admissions: number;
    discharges: number;
    cureRate: number;
    deathRate: number;
    defaulterRate: number;
    admissionsByType: { [key: string]: number };
    dischargesByType: { [key: string]: number };
    avgWeightGain: number; // g/kg/day
    avgLengthOfStay: number; // days
    admissionTrend: { date: string, count: number }[];
}

interface CommunityReportData {
    screenings: {
        totalScreened: number;
        samFound: number;
        mamFound: number;
    };
    sensitization: {
        totalSessions: number;
        totalParticipants: number;
        topTopics: { topic: string; count: number }[];
    };
    homeVisits: {
        totalVisits: number;
        routine: number;
        poorOutcome: number;
        defaulterTracing: number;
        findings: {
            routine: string[];
            poorOutcome: string[];
            defaulter: string[];
        };
    };
}

interface SupervisionReportData {
    totalSupervisions: number;
    avgScoreOutpatient: number;
    avgScoreInpatient: number;
    avgScoreCommunity: number;
    supervisions: Supervision[];
}


export default function ReportsPage() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<{
    community: CommunityReportData | null;
    tsfp: ProgramReportData | null;
    otp: ProgramReportData | null;
    itp: ProgramReportData | null;
    supervision: SupervisionReportData | null;
  }>({ community: null, tsfp: null, otp: null, itp: null, supervision: null });
  
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [healthAreas, setHealthAreas] = useState<HealthArea[]>([]);
  
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [allVisits, setAllVisits] = useState<(Visit | InpatientVisit)[]>([]);
  const [allVillages, setAllVillages] = useState<Village[]>([]);
  const [allCommunityScreenings, setAllCommunityScreenings] = useState<CommunityScreening[]>([]);
  const [allCommunitySensitizations, setAllCommunitySensitizations] = useState<CommunitySensitization[]>([]);
  const [allCommunityHomeVisits, setAllCommunityHomeVisits] = useState<CommunityHomeVisit[]>([]);
  const [allSupervisions, setAllSupervisions] = useState<Supervision[]>([]);

  // Filter states
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedHealthAreas, setSelectedHealthAreas] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [canExportOrganization, setCanExportOrganization] = useState(false);

  useEffect(() => {
    const loadPermissions = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from('nutritrack_members')
        .select('role,roles')
        .eq('user_id', user.id)
        .maybeSingle();
      setCanExportOrganization(
        member?.role === 'organization_admin'
        || Boolean(member?.roles?.includes('organization_admin')),
      );
    };
    loadPermissions();
  }, []);

  const countryOptions = useMemo(() => Array.from(new Set(healthAreas.map(ha => ha.country))).map(c => ({ label: c, value: c })), [healthAreas]);

  const regionOptions = useMemo(() => {
    let filtered = healthAreas;
    if (selectedCountries.length > 0) {
      filtered = filtered.filter(ha => selectedCountries.includes(ha.country));
    }
    return Array.from(new Set(filtered.map(ha => ha.region))).map(r => ({ label: r, value: r }));
  }, [healthAreas, selectedCountries]);
  
  const districtOptions = useMemo(() => {
    let filtered = healthAreas;
    if (selectedCountries.length > 0) {
      filtered = filtered.filter(ha => selectedCountries.includes(ha.country));
    }
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(ha => selectedRegions.includes(ha.region));
    }
    return Array.from(new Set(filtered.map(ha => ha.healthDistrict))).map(d => ({ label: d, value: d }));
  }, [healthAreas, selectedCountries, selectedRegions]);
  
  const healthAreaOptions = useMemo(() => {
    let filtered = healthAreas;
    if (selectedCountries.length > 0) {
        filtered = filtered.filter(ha => selectedCountries.includes(ha.country));
    }
    if (selectedRegions.length > 0) {
        filtered = filtered.filter(ha => selectedRegions.includes(ha.region));
    }
    if (selectedDistricts.length > 0) {
        filtered = filtered.filter(ha => selectedDistricts.includes(ha.healthDistrict));
    }
    return Array.from(new Set(filtered.map(ha => ha.healthArea))).map(haName => ({ label: haName, value: haName }));
  }, [healthAreas, selectedCountries, selectedRegions, selectedDistricts]);

  const facilityOptions = useMemo(() => {
    let filtered = healthAreas;
     if (selectedCountries.length > 0) {
        filtered = filtered.filter(ha => selectedCountries.includes(ha.country));
    }
    if (selectedRegions.length > 0) {
        filtered = filtered.filter(ha => selectedRegions.includes(ha.region));
    }
    if (selectedDistricts.length > 0) {
        filtered = filtered.filter(ha => selectedDistricts.includes(ha.healthDistrict));
    }
    if (selectedHealthAreas.length > 0) {
        filtered = filtered.filter(ha => selectedHealthAreas.includes(ha.healthArea));
    }
    return filtered.map(ha => ({ label: ha.healthFacilityName, value: ha.id }));
  }, [healthAreas, selectedCountries, selectedRegions, selectedDistricts, selectedHealthAreas]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [haSnapshot, childrenSnapshot, villagesSnapshot, visitsSnapshot, inpatientVisitsSnapshot, screeningSnapshot, sensitizationSnapshot, homeVisitSnapshot, supervisionSnapshot] = await Promise.all([
                    getDocs(collection(db, 'healthAreas')),
                    getDocs(collection(db, 'children')),
                    getDocs(collection(db, 'villages')),
                    getDocs(collectionGroup(db, 'visits')),
                    getDocs(collectionGroup(db, 'inpatientVisits')),
                    getDocs(collection(db, 'communityScreenings')),
                    getDocs(collection(db, 'communitySensitizations')),
                    getDocs(collection(db, 'communityHomeVisits')),
                    getDocs(collection(db, 'supervisions')),
                ]);
                setHealthAreas(haSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as HealthArea[]);
                setAllChildren(childrenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Child));
                setAllVillages(villagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Village));
                const allVisitsData = visitsSnapshot.docs.map(doc => ({ ...doc.data(), childId: doc.ref.parent.parent!.id } as Visit & { childId: string }));
                const allInpatientVisitsData = inpatientVisitsSnapshot.docs.map(doc => ({ ...doc.data(), childId: doc.ref.parent.parent!.id } as InpatientVisit & { childId: string }));
                setAllVisits([...allVisitsData, ...allInpatientVisitsData]);
                setAllCommunityScreenings(screeningSnapshot.docs.map(doc => doc.data() as CommunityScreening));
                setAllCommunitySensitizations(sensitizationSnapshot.docs.map(doc => doc.data() as CommunitySensitization));
                setAllCommunityHomeVisits(homeVisitSnapshot.docs.map(doc => doc.data() as CommunityHomeVisit));
                setAllSupervisions(supervisionSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Supervision));

            } catch (error) {
                console.error("Error fetching initial data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchInitialData();
    }, []);

    const processData = useCallback(() => {
        if (loading) return;
        
        setIsProcessing(true);
        
        const start = startDate ? startOfDay(startDate) : new Date(0);
        const end = endDate ? endOfDay(endDate) : new Date();
        
        const applicableFacilityIds = healthAreas.filter(ha => 
            (selectedCountries.length === 0 || selectedCountries.includes(ha.country)) &&
            (selectedRegions.length === 0 || selectedRegions.includes(ha.region)) &&
            (selectedDistricts.length === 0 || selectedDistricts.includes(ha.healthDistrict)) &&
            (selectedHealthAreas.length === 0 || selectedHealthAreas.includes(ha.healthArea)) &&
            (selectedFacilities.length === 0 || selectedFacilities.includes(ha.id))
        ).map(ha => ha.id);

        const childrenInFacilities = allChildren.filter(c => applicableFacilityIds.includes(c.healthAreaId));
        
        // --- Community Data ---
        const villageMap = new Map(allVillages.map(v => [v.id, v]));

        const screeningsInPeriod = allCommunityScreenings.filter(s => {
            const sDate = s.date.toDate();
            const village = villageMap.get(s.villageId);
            if (!village) return false;
            return sDate >= start && sDate <= end && applicableFacilityIds.includes(village.healthAreaId);
        });
        const sensitizationsInPeriod = allCommunitySensitizations.filter(s => {
            const sDate = s.date.toDate();
            const village = villageMap.get(s.villageId);
            if (!village) return false;
            return sDate >= start && sDate <= end && applicableFacilityIds.includes(village.healthAreaId);
        });
        const homeVisitsInPeriod = allCommunityHomeVisits.filter(s => {
            const sDate = s.date.toDate();
            const village = villageMap.get(s.villageId);
            if (!village) return false;
            return sDate >= start && sDate <= end && applicableFacilityIds.includes(village.healthAreaId);
        });

        const topicCounts = sensitizationsInPeriod.reduce((acc, s) => {
            const topic = s.topic === 'Other' ? (s.otherTopic || 'Other') : s.topic;
            acc[topic] = (acc[topic] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const findings = homeVisitsInPeriod.reduce((acc, v) => {
            if(v.findingsRoutine) acc.routine.push(v.findingsRoutine);
            if(v.findingsPoorOutcome) acc.poorOutcome.push(v.findingsPoorOutcome);
            if(v.findingsDefaulter) acc.defaulter.push(v.findingsDefaulter);
            return acc;
        }, { routine: [] as string[], poorOutcome: [] as string[], defaulter: [] as string[] });

        const communityData: CommunityReportData = {
            screenings: {
                totalScreened: screeningsInPeriod.reduce((sum, s) => sum + s.childrenScreened, 0),
                samFound: screeningsInPeriod.reduce((sum, s) => sum + s.samCasesFound, 0),
                mamFound: screeningsInPeriod.reduce((sum, s) => sum + s.mamCasesFound, 0),
            },
            sensitization: {
                totalSessions: sensitizationsInPeriod.length,
                totalParticipants: sensitizationsInPeriod.reduce((sum, s) => sum + s.participantsMale + s.participantsFemale, 0),
                topTopics: Object.entries(topicCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([topic, count]) => ({ topic, count })),
            },
            homeVisits: {
                totalVisits: homeVisitsInPeriod.reduce((sum, v) => sum + (v.routineVisits || 0) + (v.poorOutcomeVisits || 0) + (v.defaulterTracinVisits || 0), 0),
                routine: homeVisitsInPeriod.reduce((sum, v) => sum + (v.routineVisits || 0), 0),
                poorOutcome: homeVisitsInPeriod.reduce((sum, v) => sum + (v.poorOutcomeVisits || 0), 0),
                defaulterTracing: homeVisitsInPeriod.reduce((sum, v) => sum + (v.defaulterTracinVisits || 0), 0),
                findings: findings,
            }
        };
        
        const getAdmissionTrend = (admissions: Child[]) => {
            const rangeDuration = differenceInDays(end, start);
            let intervalDates;
            let formatString: string;

            if (rangeDuration <= 31) {
                intervalDates = eachDayOfInterval({ start, end });
                formatString = 'MMM d';
            } else if (rangeDuration <= 90) {
                intervalDates = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
                formatString = `w ('${format(start, 'yyyy')}')`;
            } else {
                intervalDates = eachMonthOfInterval({ start, end });
                formatString = 'MMM yyyy';
            }
            
            const trend = intervalDates.map(date => ({ date: format(date, formatString), count: 0 }));
            
            admissions.forEach(admission => {
                const admissionDate = admission.admissionDate.toDate();
                const formattedDate = format(admissionDate, formatString);
                const trendItem = trend.find(t => t.date === formattedDate);
                if (trendItem) {
                    trendItem.count++;
                }
            });

            return trend;
        };


        const generateProgramReport = (program: 'TSFP' | 'OTP' | 'ITP'): ProgramReportData => {
            
            const wasAdmittedWithComplications = (child: Child) => {
                return child.appetiteTest === 'fail'
                    || child.oedemaGrade === '3'
                    || child.ivDripOrNgtFeeding === 'yes'
                    || child.fever === 'yes'
                    || child.diarrheaDehydration === 'yes'
                    || child.severeVomiting === 'yes'
                    || child.pneumonia === 'yes'
                    || child.subcostalRetraction === 'yes'
                    || child.openSkinLesions === 'yes'
                    || child.hypothermia === 'yes'
                    || child.extremePallor === 'yes'
                    || child.weakApatheticUnconscious === 'yes'
                    || child.seizuresMeaslesEtc === 'yes'
                    || child.clinicalVitaminADeficiency === 'yes';
            };

            let cohort: Child[];

            if (program === 'TSFP') {
                cohort = childrenInFacilities.filter(c => (c.diagnosis as DiagnosisResult)?.status === 'MAM');
            } else if (program === 'OTP') {
                cohort = childrenInFacilities.filter(c => (c.diagnosis as DiagnosisResult)?.status === 'SAM' && !wasAdmittedWithComplications(c));
            } else { // ITP
                cohort = childrenInFacilities.filter(c => (c.diagnosis as DiagnosisResult)?.status === 'SAM' && wasAdmittedWithComplications(c));
            }
            
            const admissions = cohort.filter(c => {
                const admissionDate = c.admissionDate.toDate();
                return admissionDate >= start && admissionDate <= end;
            });
            const discharges = cohort.filter(c => c.discharge && c.discharge.date.toDate() >= start && c.discharge.date.toDate() <= end);
            const active = cohort.filter(c => c.status === 'active');
            
            const dischargesByType = discharges.reduce((acc, c) => {
                const type = c.discharge!.type;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as {[key: string]: number});
            
            const admissionsByType = admissions.reduce((acc, c) => {
                const type = c.admissionType;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as {[key: string]: number});
            
            const totalDischargesForRates = (dischargesByType.cured || 0) + (dischargesByType.dead || 0) + (dischargesByType.defaulter || 0) + (dischargesByType.non_respondent || 0);
            
            const curedChildren = discharges.filter(c => c.discharge?.type === 'cured' || c.discharge?.type === 'treated_with_success');
            let totalStay = 0, totalGain = 0, validGainCount = 0;
            curedChildren.forEach(child => {
                totalStay += differenceInDays(child.discharge!.date.toDate(), child.admissionDate.toDate());
                const visits = allVisits
                    .filter(v => v.childId === child.id)
                    .sort((a, b) => a.visitDate.toMillis() - b.visitDate.toMillis());
                if (visits.length > 0) {
                    const exitWeight = (visits[visits.length - 1] as Visit).weight;
                    const minWeight = Math.min(child.weight, ...visits.map(v => (v as Visit).weight));
                    if (exitWeight > minWeight) {
                        const gain = (exitWeight - minWeight) * 1000; // in grams
                        const days = differenceInDays(visits[visits.length - 1].visitDate.toDate(), child.admissionDate.toDate());
                        if (days > 0 && minWeight > 0) {
                            totalGain += gain / minWeight / days;
                            validGainCount++;
                        }
                    }
                }
            });

            return {
                activeBeneficiaries: active.length,
                admissions: admissions.length,
                discharges: discharges.length,
                cureRate: totalDischargesForRates > 0 ? (((dischargesByType.cured || 0) + (dischargesByType.treated_with_success || 0)) / totalDischargesForRates) * 100 : 0,
                deathRate: totalDischargesForRates > 0 ? ((dischargesByType.dead || 0) / totalDischargesForRates) * 100 : 0,
                defaulterRate: totalDischargesForRates > 0 ? ((dischargesByType.defaulter || 0) / totalDischargesForRates) * 100 : 0,
                admissionsByType,
                dischargesByType,
                avgWeightGain: validGainCount > 0 ? totalGain / validGainCount : 0,
                avgLengthOfStay: curedChildren.length > 0 ? totalStay / curedChildren.length : 0,
                admissionTrend: getAdmissionTrend(admissions),
            };
        };

        const supervisionsInPeriod = allSupervisions.filter(s => {
            const sDate = s.date.toDate();
            return sDate >= start && sDate <= end && applicableFacilityIds.includes(s.facilityId);
        });

        const calculateAvgScore = (component: Supervision['component']) => {
            const relevantSupervisions = supervisionsInPeriod.filter(s => s.component === component);
            if (relevantSupervisions.length === 0) return 0;
            const totalScore = relevantSupervisions.reduce((sum, sup) => {
                const checklistScore = sup.checklist.reduce((cSum, cItem) => cSum + cItem.status, 0);
                const maxScore = sup.checklist.length * 5;
                return sum + (maxScore > 0 ? (checklistScore / maxScore) * 100 : 0);
            }, 0);
            return totalScore / relevantSupervisions.length;
        };

        const supervisionData: SupervisionReportData = {
            totalSupervisions: supervisionsInPeriod.length,
            avgScoreOutpatient: calculateAvgScore('outpatient'),
            avgScoreInpatient: calculateAvgScore('inpatient'),
            avgScoreCommunity: calculateAvgScore('community'),
            supervisions: supervisionsInPeriod,
        };

        setReportData({
            community: communityData,
            tsfp: generateProgramReport('TSFP'),
            otp: generateProgramReport('OTP'),
            itp: generateProgramReport('ITP'),
            supervision: supervisionData,
        });
        
        setIsProcessing(false);
    }, [loading, startDate, endDate, healthAreas, allChildren, allVisits, allVillages, allCommunityScreenings, allCommunitySensitizations, allCommunityHomeVisits, allSupervisions, selectedCountries, selectedRegions, selectedDistricts, selectedHealthAreas, selectedFacilities]);

    useEffect(() => {
        if (!loading) {
            processData();
        }
    }, [loading, processData]);
    
    const handleDownload = async (format: 'json' | 'csv' | 'excel') => {
        setIsDownloading(true);
        try {
          const response = await fetch(`/api/nutritrack/export?format=${format}`);
          if (!response.ok) throw new Error((await response.json()).message || 'Export impossible.');
          const blob = await response.blob();
          const disposition = response.headers.get('content-disposition') || '';
          const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `nutritrack-export.${format}`;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          link.click();
          URL.revokeObjectURL(link.href);
        } catch (error) {
          toast({ title: 'Export impossible', description: error instanceof Error ? error.message : 'Veuillez reessayer.', variant: 'destructive' });
        } finally {
          setIsDownloading(false);
        }
    };

    const handlePdfReport = async () => {
      setIsGeneratingPdf(true);
      try {
        const facilityNames = selectedFacilities.map(id => healthAreas.find(area => area.id === id)?.healthFacilityName || id);
        const response = await fetch('/api/nutritrack/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              startDate: startDate?.toISOString().slice(0, 10),
              endDate: endDate?.toISOString().slice(0, 10),
              countries: selectedCountries,
              regions: selectedRegions,
              districts: selectedDistricts,
              healthAreas: selectedHealthAreas,
              facilities: facilityNames,
            },
            reportData,
          }),
        });
        if (!response.ok) throw new Error((await response.json()).message || 'Generation impossible.');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rapport-nutritrack-${new Date().toISOString().slice(0, 10)}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        toast({ title: 'Rapport indisponible', description: error instanceof Error ? error.message : 'Veuillez reessayer.', variant: 'destructive' });
      } finally {
        setIsGeneratingPdf(false);
      }
    };
    
  if (loading) {
    return <div className="p-6">Loading initial data...</div>;
  }
  
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader><Logo /></SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
                <SidebarMenuLabel>Reporting</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/" group="reporting" tooltip="Dashboard"><Home /><span>Dashboard</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/reports" group="reporting" isActive tooltip="Reports"><BarChartIcon /><span>Reports</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuLabel>Operations</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/admissions" group="operations" tooltip="Admissions"><PlusCircle /><span>Admissions</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/children" group="operations" tooltip="Children Register"><Users /><span>Children Register</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/incoming-referrals" group="operations" tooltip="Incoming Referrals"><DownloadIcon /><span>Incoming Referrals</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/referred-out" group="operations" tooltip="Referred Out"><Send /><span>Referred Out</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/special-attention" group="operations" tooltip="Special Attention"><AlertTriangle /><span>Special Attention</span></SidebarMenuButton></SidebarMenuItem>
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
            <SidebarMenu><SidebarMenuItem><SidebarMenuButton href="/nutritrack/feedback" group="feedback" tooltip="Feedback"><MessageSquareQuote /><span>Feedback</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-30 flex flex-col gap-2 border-b bg-primary px-4 py-2 text-white sm:px-6">
                 <div className="flex h-14 items-center justify-between gap-4">
                    <div className="flex items-center gap-2"><SidebarTrigger className="md:hidden text-white" /><h1 className="text-lg font-semibold">Program Reports</h1></div>
                     <div className="flex items-center gap-2">
                        <Popover><PopoverTrigger asChild><Button id="start-date" variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal text-black", !startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "LLL dd, y") : <span>Start date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent></Popover>
                         <Popover><PopoverTrigger asChild><Button id="end-date" variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal text-black", !endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "LLL dd, y") : <span>End date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent></Popover>
                         <Button variant="secondary" onClick={handlePdfReport} disabled={isGeneratingPdf || isProcessing}>
                           <FileText className="mr-2 h-4 w-4" />{isGeneratingPdf ? 'Generation...' : 'Rapport PDF avec IA'}
                         </Button>
                         {canExportOrganization && (
                           <details className="relative">
                             <summary className="flex h-10 cursor-pointer list-none items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground">
                               <FileSpreadsheet className="mr-2 h-4 w-4" />Exporter les donnees
                             </summary>
                             <div className="absolute right-0 top-12 z-50 grid min-w-44 gap-1 rounded-md border bg-white p-2 text-slate-900 shadow-lg">
                               <button className="rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={() => handleDownload('excel')}>Excel (.xls)</button>
                               <button className="rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={() => handleDownload('csv')}>CSV</button>
                               <button className="rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={() => handleDownload('json')}>JSON complet</button>
                             </div>
                           </details>
                         )}
                    </div>
                 </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <MultiSelect options={countryOptions} selected={selectedCountries} onChange={setSelectedCountries} placeholder="All Countries" className="w-[180px]" />
                    <MultiSelect options={regionOptions} selected={selectedRegions} onChange={setSelectedRegions} placeholder="All Regions" className="w-[180px]" />
                    <MultiSelect options={districtOptions} selected={selectedDistricts} onChange={setSelectedDistricts} placeholder="All Districts" className="w-[180px]" />
                    <MultiSelect options={healthAreaOptions} selected={selectedHealthAreas} onChange={setSelectedHealthAreas} placeholder="All Health Areas" className="w-[180px]" />
                    <MultiSelect options={facilityOptions} selected={selectedFacilities} onChange={setSelectedFacilities} placeholder="All Health Facilities" className="w-[220px]" />
                </div>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
             {isProcessing ? <div className='flex justify-center items-center h-64'><p>Generating reports for the selected filters...</p></div> :
                <Tabs defaultValue="community">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="community">Community</TabsTrigger>
                        <TabsTrigger value="mam">MAM (TSFP)</TabsTrigger>
                        <TabsTrigger value="sam">SAM (OTP)</TabsTrigger>
                        <TabsTrigger value="sam_plus">SAM+ (ITP)</TabsTrigger>
                        <TabsTrigger value="supervision">Supervision</TabsTrigger>
                    </TabsList>
                    <TabsContent value="community"><CommunityReportTab data={reportData.community} /></TabsContent>
                    <TabsContent value="mam"><ProgramReportTab data={reportData.tsfp} programName="MAM (TSFP)" chartColor="hsl(var(--chart-2))" /></TabsContent>
                    <TabsContent value="sam"><ProgramReportTab data={reportData.otp} programName="SAM (OTP)" chartColor="hsl(var(--chart-3))" /></TabsContent>
                    <TabsContent value="sam_plus"><ProgramReportTab data={reportData.itp} programName="SAM+ (ITP)" chartColor="hsl(var(--chart-5))" /></TabsContent>
                    <TabsContent value="supervision"><SupervisionReportTab data={reportData.supervision} healthAreas={healthAreas} /></TabsContent>
                </Tabs>
              }
            </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

// --- Report Tab Components ---

const AISummaryCard = ({ findings }: { findings: CommunityReportData['homeVisits']['findings'] }) => {
    const { toast } = useToast();
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const hasFindings = findings.routine.length > 0 || findings.poorOutcome.length > 0 || findings.defaulter.length > 0;
    
    const handleGenerateSummary = async () => {
        setIsLoading(true);
        try {
            const result = await summarizeHomeVisits({
                findingsRoutine: findings.routine,
                findingsPoorOutcome: findings.poorOutcome,
                findingsDefaulter: findings.defaulter,
            });
            setSummary(result.summary);
        } catch (error) {
            console.error("Error generating AI summary:", error);
            toast({ title: 'Error', description: 'Could not generate AI summary.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!hasFindings) return null;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI-Powered Summary of Home Visit Findings</CardTitle>
                <CardDescription>A qualitative summary of key themes from CHW visit notes.</CardDescription>
            </CardHeader>
            <CardContent>
                {summary ? (
                    <p className="text-sm whitespace-pre-wrap">{summary}</p>
                ) : (
                    <div className="flex justify-center">
                        <Button onClick={handleGenerateSummary} disabled={isLoading}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            {isLoading ? 'Generating...' : 'Generate AI Summary'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const CommunityReportTab = ({ data }: { data: CommunityReportData | null }) => {
    if (!data) return <Card><CardContent className="p-6 text-center text-muted-foreground">No community data for the selected period.</CardContent></Card>;
    
    return (
        <div className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Children Screened" value={data.screenings.totalScreened} icon={Users} />
                <StatCard title="Total Sensitization Sessions" value={data.sensitization.totalSessions} icon={MessageSquareQuote} />
                <StatCard title="Total Home Visits" value={data.homeVisits.totalVisits} icon={Home} />
            </div>
            <Card>
                <CardHeader><CardTitle>Screening Summary</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Indicator</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            <TableRow><TableCell>Total Children Screened</TableCell><TableCell className="text-right font-bold">{data.screenings.totalScreened}</TableCell></TableRow>
                            <TableRow><TableCell>SAM Cases Found</TableCell><TableCell className="text-right font-bold text-destructive">{data.screenings.samFound}</TableCell></TableRow>
                            <TableRow><TableCell>MAM Cases Found</TableCell><TableCell className="text-right font-bold text-accent-foreground">{data.screenings.mamFound}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Sensitization &amp; Home Visits</CardTitle></CardHeader>
                    <CardContent>
                        <h3 className="font-semibold mb-2">Top 5 Sensitization Topics</h3>
                        <Table>
                            <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead className="text-right"># of Sessions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.sensitization.topTopics.length > 0 ? data.sensitization.topTopics.map(t => (
                                    <TableRow key={t.topic}><TableCell>{t.topic}</TableCell><TableCell className="text-right">{t.count}</TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={2} className="text-center">No sensitization data.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                        <h3 className="font-semibold mt-4 mb-2">Home Visits by Type</h3>
                        <Table>
                            <TableBody>
                                <TableRow><TableCell>Routine Visits</TableCell><TableCell className="text-right">{data.homeVisits.routine}</TableCell></TableRow>
                                <TableRow><TableCell>Poor Treatment Outcome</TableCell><TableCell className="text-right">{data.homeVisits.poorOutcome}</TableCell></TableRow>
                                <TableRow><TableCell>Defaulter Tracing</TableCell><TableCell className="text-right">{data.homeVisits.defaulterTracing}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <AISummaryCard findings={data.homeVisits.findings} />
            </div>
        </div>
    )
}

const chartConfig = {
  admissions: { label: "Admissions" },
} satisfies ChartConfig

const ProgramReportTab = ({ data, programName, chartColor }: { data: ProgramReportData | null, programName: string, chartColor: string }) => {
    if (!data) return <Card><CardContent className="p-6 text-center text-muted-foreground">No data for {programName} in the selected period.</CardContent></Card>;

    const performanceIndicators = [
        { icon: UserCheck, label: 'Cure Rate', value: `${data.cureRate.toFixed(1)}%` },
        { icon: Ban, label: 'Defaulter Rate', value: `${data.defaulterRate.toFixed(1)}%` },
        { icon: Skull, label: 'Death Rate', value: `${data.deathRate.toFixed(1)}%` },
        { icon: Clock, label: 'Avg. Length of Stay', value: `${data.avgLengthOfStay.toFixed(1)} days` },
        { icon: TrendingUp, label: 'Avg. Weight Gain', value: `${data.avgWeightGain.toFixed(2)} g/kg/day` },
    ];
    
    return (
        <div className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Active Beneficiaries" value={data.activeBeneficiaries} icon={Users} />
                <StatCard title="Admissions" value={data.admissions} icon={UserPlus} />
                <StatCard title="Discharges" value={data.discharges} icon={UserMinus} />
            </div>

            <Card>
                <CardHeader><CardTitle>Admission Trend</CardTitle></CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <AreaChart accessibilityLayer data={data.admissionTrend} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} />
                            <Tooltip content={<ChartTooltipContent indicator="line" />} />
                            <Area dataKey="count" type="natural" fill={chartColor} fillOpacity={0.4} stroke={chartColor} stackId="a" />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Performance Indicators</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {performanceIndicators.map(indicator => (
                        <StatCard key={indicator.label} title={indicator.label} value={indicator.value} icon={indicator.icon} />
                    ))}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Admissions by Type</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                {Object.entries(data.admissionsByType).map(([type, value]) => (
                                    <TableRow key={type}><TableCell className="capitalize">{type.replace(/_/g, ' ')}</TableCell><TableCell className="text-right font-bold">{value}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Discharges by Reason</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableBody>
                                {Object.entries(data.dischargesByType).map(([type, value]) => (
                                    <TableRow key={type}><TableCell className="capitalize">{type.replace(/_/g, ' ')}</TableCell><TableCell className="text-right font-bold">{value}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

const SupervisionReportTab = ({ data, healthAreas }: { data: SupervisionReportData | null, healthAreas: HealthArea[] }) => {
    if (!data) return <Card><CardContent className="p-6 text-center text-muted-foreground">No supervision data for the selected period.</CardContent></Card>;

    const healthAreaMap = useMemo(() => new Map(healthAreas.map(ha => [ha.id, ha.healthFacilityName])), [healthAreas]);

    const calculateScore = (checklist: { status: number }[]) => {
        if (!checklist || checklist.length === 0) return 0;
        const total = checklist.reduce((sum, item) => sum + item.status, 0);
        return Math.round((total / (checklist.length * 5)) * 100);
    };
    
    return (
        <div className="space-y-4 mt-4">
             <div className="grid gap-4 md:grid-cols-4">
                <StatCard title="Total Supervisions" value={data.totalSupervisions} icon={ClipboardCheck} />
                <StatCard title="Avg. Outpatient Score" value={`${data.avgScoreOutpatient.toFixed(0)}%`} icon={Users} />
                <StatCard title="Avg. Inpatient Score" value={`${data.avgScoreInpatient.toFixed(0)}%`} icon={Bed} />
                <StatCard title="Avg. Community Score" value={`${data.avgScoreCommunity.toFixed(0)}%`} icon={Group} />
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Supervision Log</CardTitle>
                    <CardDescription>Details of supervision visits conducted in the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Facility</TableHead>
                                <TableHead>Component</TableHead>
                                <TableHead>Supervisor</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.supervisions.length > 0 ? data.supervisions.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>{format(s.date.toDate(), 'PPP')}</TableCell>
                                    <TableCell>{healthAreaMap.get(s.facilityId) || 'Unknown'}</TableCell>
                                    <TableCell><Badge variant="secondary" className="capitalize">{s.component}</Badge></TableCell>
                                    <TableCell>{s.supervisorName}</TableCell>
                                    <TableCell className="text-right font-bold">{calculateScore(s.checklist)}%</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center">No supervisions recorded.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

    




