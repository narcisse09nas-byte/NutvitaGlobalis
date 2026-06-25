
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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, ArrowLeft, Edit, Send, Printer, Contact, Bed, AlertTriangle, ShieldCheck, ClipboardCheck, MessageSquareQuote, HelpCircle, BookOpen, Group, HeartPulse, Download, Clock, TrendingUp, UserCheck, Ban, Skull, Meh, Sparkles } from 'lucide-react';
import { Logo } from '@/nutritrack/components/logo';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/nutritrack/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/nutritrack/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, doc, getDoc, getDocs, query, orderBy, Timestamp } from '@/nutritrack/local-firestore';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Child, Visit, HealthArea, Village, CHW, Diagnosis, InpatientVisit, InpatientMedication, InpatientMeal, Commodity, Treatment } from '@/nutritrack/types';
import { format, differenceInDays } from 'date-fns';
import { Badge } from '@/nutritrack/components/ui/badge';
import { useRouter, useParams } from 'next/navigation';
import { Separator } from '@/nutritrack/components/ui/separator';
import { ChildIdentityCard } from '@/nutritrack/components/child-identity-card';
import { useReactToPrint } from 'react-to-print';
import { getDueVaccines } from '@/nutritrack/lib/vaccination-schedule';
import { calculateWHZ } from '@/nutritrack/lib/health-utils';

export default function ChildDetailPage() {
  const [child, setChild] = useState<Child | null>(null);
  const [healthArea, setHealthArea] = useState<HealthArea | null>(null);
  const [village, setVillage] = useState<Village | null>(null);
  const [chw, setChw] = useState<CHW | null>(null);
  const [outpatientVisits, setOutpatientVisits] = useState<Visit[]>([]);
  const [inpatientVisits, setInpatientVisits] = useState<InpatientVisit[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const childId = params.id as string;

  const printComponentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    onAfterPrint: () => setIsPreviewOpen(false),
  });

  useEffect(() => {
    if (!childId) return;
    
    const fetchChildDetails = async () => {
      setLoading(true);
      try {
        const childDoc = await getDoc(doc(db, "children", childId));
        if (childDoc.exists()) {
          const childData = { id: childDoc.id, ...childDoc.data() } as Child;
          setChild(childData);

          if (childData.healthAreaId) {
              const healthAreaDoc = await getDoc(doc(db, "healthAreas", childData.healthAreaId));
              if (healthAreaDoc.exists()) {
                  setHealthArea({ id: healthAreaDoc.id, ...healthAreaDoc.data() } as HealthArea);
              }
          }
          if (childData.villageId) {
              const villageDoc = await getDoc(doc(db, "villages", childData.villageId));
              if(villageDoc.exists()){
                  setVillage({ id: villageDoc.id, ...villageDoc.data() } as Village);
              }
          }
           if (childData.chwId) {
              const chwDoc = await getDoc(doc(db, "chws", childData.chwId));
              if(chwDoc.exists()){
                  setChw({ id: chwDoc.id, ...chwDoc.data() } as CHW);
              }
          }
          
          const outpatientVisitsQuery = query(collection(db, "children", childId, "visits"), orderBy("visitNumber", "asc"));
          const inpatientVisitsQuery = query(collection(db, "children", childId, "inpatientVisits"), orderBy("date", "asc"));
          const commoditiesQuery = query(collection(db, "commodities"));

          const [outpatientSnapshot, inpatientSnapshot, commoditiesSnapshot] = await Promise.all([
              getDocs(outpatientVisitsQuery),
              getDocs(inpatientVisitsQuery),
              getDocs(commoditiesQuery)
          ]);
          
          setOutpatientVisits(outpatientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Visit[]);
          setInpatientVisits(inpatientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InpatientVisit)));
          setCommodities(commoditiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commodity)));

        } else {
            // handle not found
        }
        
      } catch (error) {
        console.error("Error fetching child details: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChildDetails();
  }, [childId]);
  
  const comorbidities = useMemo(() => {
    if (!child) return [];
    return [
        { field: 'fever', label: 'Fever' },
        { field: 'diarrheaDehydration', label: 'Diarrhea/Dehydration' },
        { field: 'severeVomiting', label: 'Severe Vomiting' },
        { field: 'pneumonia', label: 'Pneumonia' },
        { field: 'subcostalRetraction', label: 'Subcostal Retraction' },
        { field: 'openSkinLesions', label: 'Open Skin Lesions' },
        { field: 'hypothermia', label: 'Hypothermia' },
        { field: 'extremePallor', label: 'Extreme Pallor' },
        { field: 'weakApatheticUnconscious', label: 'Weak/Apathetic' },
        { field: 'seizuresMeaslesEtc', label: 'Seizures/Measles' },
        { field: 'clinicalVitaminADeficiency', label: 'Vit. A Deficiency' },
        { field: 'ivDripOrNgtFeeding', label: 'Needs IV/NGT' }
    ].filter(c => child[c.field as keyof Child] === 'yes');
  }, [child]);

  const vaccinationPercentage = useMemo(() => {
    if (!child || !child.vaccinationAssessmentDone) return null;
    const dueVaccinesList = getDueVaccines(child.age);
    const allDueVaccineNames = [...new Set(dueVaccinesList.flatMap(entry => entry.vaccines.map(v => v.name)))];
    
    if (allDueVaccineNames.length === 0) {
        return child.age > 0 ? 100 : 0;
    }
    
    const yesCount = allDueVaccineNames.reduce((count, vaccineName) => {
        const status = child.vaccinationStatus?.[vaccineName]?.status;
        return status === 'yes' ? count + 1 : count;
    }, 0);

    return Math.round((yesCount / allDueVaccineNames.length) * 100);
  }, [child]);


  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading child details...</div>;
  }

  if (!child) {
    return <div className="flex h-screen items-center justify-center">Child not found.</div>;
  }
  
 const getDiagnosisBadgeVariant = (diagnosis?: any) => {
    if (!diagnosis) return 'outline';
    
    let status: string | undefined;
    if (typeof diagnosis === 'string') {
        status = diagnosis;
    } else if (typeof diagnosis === 'object' && diagnosis !== null && 'status' in diagnosis) {
        status = (diagnosis as any).status;
    }

    if (!status) return 'outline';

    if (status.includes('SAM')) return 'destructive';
    if (status.includes('MAM')) return 'accent';
    return 'default';
  };

  const getDiagnosisText = (diagnosis?: any): string => {
    if (!diagnosis) return 'N/A';
    if (typeof diagnosis === 'string') return diagnosis;
    if (typeof diagnosis === 'object' && diagnosis.status) {
        const isSamPlus = child?.ivDripOrNgtFeeding === 'yes' || child?.appetiteTest === 'fail' || child?.oedemaGrade === '3' || comorbidities.length > 0;
        if (diagnosis.status === 'SAM' && isSamPlus) {
            return "SAM with Medical Complications";
        }
        if (diagnosis.reason && diagnosis.reason !== 'Normal' && diagnosis.reason !== diagnosis.status) {
            return `${diagnosis.status} (${diagnosis.reason})`;
        }
        return diagnosis.status;
    }
    return 'N/A';
  }

  const getStatusVariant = (status: Child['status']) => {
    switch(status) {
        case 'active': return 'default';
        case 'discharged': return 'secondary';
        case 'referred_out': return 'accent';
        case 'defaulter': return 'outline';
        default: return 'outline';
    }
  }

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    if (dateValue instanceof Timestamp) {
      return format(dateValue.toDate(), 'PPP');
    }
    if (typeof dateValue === 'string' || typeof dateValue === 'number' || dateValue instanceof Date) {
        try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return format(date, 'PPP');
            }
        } catch (e) {
            return 'Invalid Date';
        }
    }
    return 'Invalid Date';
  }
  
  const isSamWithComplications = getDiagnosisText(child.diagnosis) === 'SAM with Medical Complications';

  return (
    <>
      <div className="flex min-h-screen bg-background">
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
                  <SidebarMenuItem><SidebarMenuButton href="/nutritrack/children" group="operations" isActive tooltip="Children Register"><Users /><span>Children Register</span></SidebarMenuButton></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuButton href="/nutritrack/incoming-referrals" group="operations" tooltip="Incoming Referrals"><Download /><span>Incoming Referrals</span></SidebarMenuButton></SidebarMenuItem>
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
              <SidebarMenu>
                  <SidebarMenuItem><SidebarMenuButton href="/nutritrack/feedback" group="feedback" tooltip="Feedback"><MessageSquareQuote /><span>Feedback</span></SidebarMenuButton></SidebarMenuItem>
              </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 text-white sm:px-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => router.push('/nutritrack/children')}>
                  <ArrowLeft />
              </Button>
              <h1 className="text-lg font-semibold">Child Details</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => router.push(`/nutritrack/children/${child.id}/vaccination`)} variant="outline" className="text-black">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Assess Vaccination
              </Button>
              <Button onClick={() => setIsPreviewOpen(true)} variant="outline" className="text-black" disabled={!healthArea}>
                <Printer className="mr-2 h-4 w-4" />
                Print ID Card
              </Button>
              {child.status === 'active' && (
                isSamWithComplications ? (
                    <Button onClick={() => router.push(`/nutritrack/children/${child.id}/inpatient-monitoring`)} variant="secondary">
                        <HeartPulse className="mr-2 h-4 w-4" />
                        Daily Monitoring
                    </Button>
                ) : (
                    <Button onClick={() => router.push(`/nutritrack/children/${child.id}/follow-up`)} variant="secondary">
                        New Follow-up
                    </Button>
                )
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <Card className="mb-6">
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <div>
                              <CardTitle className="text-2xl">{child.firstName} {child.lastName}</CardTitle>
                              <CardDescription>Child ID: <Badge variant="secondary">{child.childCode}</Badge></CardDescription>
                          </div>
                          <Badge variant={getStatusVariant(child.status)} className="text-base capitalize">{child.status.replace('_', ' ')}</Badge>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                          <div><span className="font-semibold text-muted-foreground">Age:</span> {child.age} mos</div>
                          <div><span className="font-semibold text-muted-foreground">Sex:</span> {child.sex === 'M' ? 'Male' : 'Female'}</div>
                          <div><span className="font-semibold text-muted-foreground">Health Area:</span> {healthArea?.healthArea || 'N/A'}</div>
                          <div><span className="font-semibold text-muted-foreground">Health Facility:</span> {healthArea?.healthFacilityName || 'N/A'}</div>
                          <div><span className="font-semibold text-muted-foreground">Village:</span> {village?.name || 'N/A'}</div>
                          <div><span className="font-semibold text-muted-foreground">CHW:</span> {chw ? `${chw.firstName} ${chw.lastName}` : 'N/A'}</div>
                          <div><span className="font-semibold text-muted-foreground">Admission:</span> {formatDate(child.admissionDate)}</div>
                          <div><span className="font-semibold text-muted-foreground">Caretaker:</span> {child.caretakerName}</div>
                          <div><span className="font-semibold text-muted-foreground">Phone:</span> {child.caretakerPhone || 'N/A'}</div>
                          <div><span className="font-semibold text-muted-foreground">Type:</span> {child.admissionType}</div>
                          <div><span className="font-semibold text-muted-foreground">Initial W/H Z-Score:</span> {child.whz?.toFixed(2) ?? 'N/A'}</div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Oedema at Admission:</span> 
                            <span className='capitalize ml-1'>{child.oedema} {child.oedema === 'yes' && `(Grade ${child.oedemaGrade})`}</span>
                          </div>
                          <div>
                              <span className="font-semibold text-muted-foreground">Initial Diagnosis:</span>
                              <Badge variant={getDiagnosisBadgeVariant(child.diagnosis)}>{getDiagnosisText(child.diagnosis)}</Badge>
                          </div>
                          <div className='flex items-center gap-2'>
                              <span className="font-semibold text-muted-foreground">Vaccination:</span>
                              {vaccinationPercentage !== null ? (
                                <Badge variant={vaccinationPercentage < 50 ? 'destructive' : vaccinationPercentage < 90 ? 'accent' : 'default'}>{vaccinationPercentage}% Complete</Badge>
                              ) : (
                                <Badge variant='outline'>Not Yet Assessed</Badge>
                              )}
                          </div>
                          <div className="col-span-full">
                                <span className="font-semibold text-muted-foreground">Comorbidities at Admission:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {comorbidities.length > 0 ? comorbidities.map(c => <Badge key={c.field} variant='destructive'>{c.label}</Badge>) : <Badge>None</Badge>}
                                </div>
                          </div>
                          {child.status === 'discharged' && child.discharge && (
                            <>
                                <div><span className="font-semibold text-muted-foreground">Discharge Date:</span> {formatDate(child.discharge.date)}</div>
                                <div>
                                    <span className="font-semibold text-muted-foreground">Discharge Reason:</span>
                                    <span className="ml-2 capitalize">{child.discharge.type.replace(/_/g, ' ')}</span>
                                </div>
                            </>
                          )}
                           {child.status === 'referred_out' && child.discharge && (
                                <>
                                    <div><span className="font-semibold text-muted-foreground">Referral Date:</span> {formatDate(child.discharge.date)}</div>
                                    <div>
                                        <span className="font-semibold text-muted-foreground">Referred To:</span>
                                        <span className="ml-2">{child.discharge.referredToFacilityId}</span>
                                    </div>
                                    <div className="col-span-full"><span className="font-semibold text-muted-foreground">Referral Reason:</span> {child.discharge.referralReason}</div>
                                </>
                            )}
                      </div>
                  </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Visit History</CardTitle>
                    <CardDescription>Chronological record of all visits and monitoring.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isSamWithComplications ? 
                        <InpatientHistoryTable visits={inpatientVisits} child={child} commodities={commodities} /> : 
                        <OutpatientHistoryTable visits={outpatientVisits} child={child} commodities={commodities} />
                    }
                </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>

       <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-max p-8">
          <DialogHeader>
            <DialogTitle>Print Preview</DialogTitle>
            <DialogDescription>
              This is a preview of the child's ID card. Click Print to continue.
            </DialogDescription>
          </DialogHeader>
          {child && healthArea && village ? (
              <div className="flex justify-center">
                 <div ref={printComponentRef}>
                   <ChildIdentityCard child={child} healthArea={healthArea} village={village} />
                 </div>
              </div>
          ) : <p>Loading preview...</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} disabled={!child || !healthArea || !village}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InpatientHistoryTable({ visits, child, commodities }: { visits: InpatientVisit[], child: Child, commodities: Commodity[] }) {
    if (visits.length === 0 && child.status !== 'discharged') return <p className="text-center text-muted-foreground py-10">No inpatient monitoring records found.</p>;

    const admissionDate = child.admissionDate.toDate();

    const getTotalIntake = (meals: InpatientMeal[] | null | undefined): number => {
        if (!meals) return 0;
        return meals.reduce((sum, meal) => sum + (meal.actual || 0), 0);
    }
    
    const commodityMap = new Map(commodities.map(c => [c.id, c]));
    
    const getComplicationsText = (complications: InpatientVisit['complications']) => {
        if (!complications) return 'None';
        const active = Object.entries(complications)
            .filter(([, value]) => value)
            .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
        return active.length > 0 ? active.join(', ') : 'None';
    };

    const curedPerformance = (child.status === 'discharged' && (child.discharge?.type === 'cured' || child.discharge?.type === 'treated_with_success')) ? getCuredPerformance(child, visits) : null;

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Day #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Phase</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Oedema</TableHead>
                        <TableHead>Intake (ml)</TableHead>
                        <TableHead>Complications</TableHead>
                        <TableHead>Discharge</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {visits.map(visit => (
                        <TableRow key={visit.id}>
                            <TableCell>{differenceInDays(visit.date.toDate(), admissionDate)}</TableCell>
                            <TableCell>{format(visit.date.toDate(), 'dd/MM/yy')}</TableCell>
                            <TableCell>{visit.treatmentPhase}</TableCell>
                            <TableCell>{visit.weight.toFixed(1)}</TableCell>
                            <TableCell className="capitalize">{visit.oedema} {visit.oedema === 'yes' && `(${visit.oedemaGrade})`}</TableCell>
                            <TableCell>{getTotalIntake(visit.therapeuticFeeding?.meals)}</TableCell>
                            <TableCell>{getComplicationsText(visit.complications)}</TableCell>
                            <TableCell>N/A</TableCell>
                        </TableRow>
                    ))}
                     {child.status === 'discharged' && child.discharge ? (
                        <TableRow className="bg-secondary font-semibold">
                            <TableCell colSpan={7} className="text-right">
                                Final Outcome:
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1 text-xs">
                                   <p><span className="font-bold capitalize">{child.discharge.type.replace(/_/g, ' ')}</span> on {format(child.discharge.date.toDate(), 'PPP')}</p>
                                   {curedPerformance && (
                                     <>
                                        <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Stay: {curedPerformance.lengthOfStay} days</p>
                                        <p className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Gain: {curedPerformance.weightGain.toFixed(2)} g/kg/day</p>
                                     </>
                                   )}
                                </div>
                            </TableCell>
                        </TableRow>
                     ) : (
                         <TableRow>
                             <TableCell colSpan={8} className="text-center text-muted-foreground">
                                Child is still active in the program.
                            </TableCell>
                         </TableRow>
                     )}
                </TableBody>
            </Table>
        </div>
    );
}

function OutpatientHistoryTable({ visits, child, commodities }: { visits: Visit[], child: Child, commodities: Commodity[] }) {
    if (visits.length === 0) return <p className="text-center text-muted-foreground py-10">No follow-up visits recorded for this child.</p>;

    const formatDate = (date: any) => date ? format((date as Timestamp).toDate(), 'PPP') : 'N/A';
    const commodityMap = new Map(commodities.map(c => [c.id, c.name]));

    return (
        <div className="space-y-4">
            {visits.map((visit, index) => {
                const isLastVisit = index === visits.length - 1;
                const discharge = isLastVisit ? child.discharge : undefined;
                const curedPerformance = (discharge && (discharge.type === 'cured' || discharge.type === 'treated_with_success')) ? getCuredPerformance(child, visits) : null;
                
                return (
                <Card key={visit.id} className="bg-secondary/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Visit #{visit.visitNumber} - {formatDate(visit.visitDate)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <InfoItem label="Weight" value={`${visit.weight} kg`} />
                            <InfoItem label="MUAC" value={`${visit.muac} mm`} />
                            <InfoItem label="Appetite Test" value={visit.appetiteTest || 'N/A'} />
                            <InfoItem label="Danger Signs" value={getDangerSigns(visit)} />
                            <InfoItem label="Nutritional Treatments" value={getTreatments(visit.nutritionalTreatments, commodityMap)} />
                            <InfoItem label="Systematic Treatments" value={getTreatments(visit.systematicTreatments, commodityMap)} />
                            <InfoItem label="Past Home Visit" value={visit.homeVisit ? `Done on ${formatDate(visit.homeVisit.date)}` : 'No'} />
                            <InfoItem label="Sensitization" value={visit.sensitization ? `${visit.sensitization.approach} on ${visit.sensitization.mainTopic}` : 'No'} />
                            <InfoItem label="Future Home Visit" value={child.needsHomeVisit === 'yes' ? `Planned for ${formatDate(child.homeVisitDate)}` : 'No'} />
                            <InfoItem label="Next Follow-up" value={formatDate(visit.nextVisitDate)} />
                            {discharge && <InfoItem label="Discharge Date" value={formatDate(discharge.date)} />}
                            {discharge && <InfoItem label="Discharge Reason" value={discharge.type.replace(/_/g, ' ')} />}
                            {curedPerformance && <InfoItem label="Avg. Weight Gain" value={`${curedPerformance.weightGain.toFixed(2)} g/kg/day`} />}
                            {curedPerformance && <InfoItem label="Length of Stay" value={`${curedPerformance.lengthOfStay} days`} />}
                        </div>
                    </CardContent>
                </Card>
            )})}
        </div>
    );
}

const InfoItem = ({ label, value }: { label: string, value: string | React.ReactNode }) => (
    <div className="flex flex-col">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="text-base capitalize">{value}</p>
    </div>
);

const getDangerSigns = (visit: Visit) => {
    const signs = [];
    if(visit.fever === 'yes') signs.push('Fever');
    if(visit.diarrheaDehydration === 'yes') signs.push('Diarrhea');
    if(visit.severeVomiting === 'yes') signs.push('Vomiting');
    if(visit.pneumonia === 'yes') signs.push('Pneumonia');
    return signs.length > 0 ? signs.join(', ') : 'None';
}

const getTreatments = (treatments: Treatment[], commodityMap: Map<string, string>) => {
    if(!treatments || treatments.length === 0) return 'None';
    return treatments.map(t => {
        const name = commodityMap.get(t.commodityId) || 'Unknown';
        return `${name}: ${t.quantity} units (Batch: ${t.batchNumber})`;
    }).join(', ');
}

const getCuredPerformance = (child: Child, visits: (Visit | InpatientVisit)[]) => {
    const dischargeDate = child.discharge?.date?.toDate();
    if (!dischargeDate || visits.length === 0) return null;

    // The last visit recorded is the one that triggered the discharge. Use its weight.
    const lastVisit = visits[visits.length - 1];
    const exitWeight = lastVisit.weight;

    // Use all visits (including inpatient) to find the minimum weight
    const allVisitsWithAdmission = [
        { weight: child.weight, date: child.admissionDate.toDate() },
        ...visits.map(v => ({ weight: v.weight, date: v.visitDate.toDate() }))
    ];

    const { minWeight, minWeightDate } = allVisitsWithAdmission.reduce(
        (min, current) => (current.weight < min.minWeight ? { minWeight: current.weight, minWeightDate: current.date } : min),
        { minWeight: Infinity, minWeightDate: new Date() }
    );
    
    const lengthOfStay = differenceInDays(dischargeDate, child.admissionDate.toDate());
    
    let weightGain = 0;
    const daysForGain = differenceInDays(dischargeDate, minWeightDate);
    
    if (minWeight > 0 && exitWeight > minWeight && daysForGain > 0) {
        const weightGainGrams = (exitWeight - minWeight) * 1000;
        weightGain = weightGainGrams / minWeight / daysForGain;
    }
    
    return { lengthOfStay, weightGain };
}




