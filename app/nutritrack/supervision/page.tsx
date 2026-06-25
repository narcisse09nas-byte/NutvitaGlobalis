
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, Contact, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, Send, Download, ArrowLeft, MoreVertical, Edit, Trash2, Plus, Sparkles, FileText } from 'lucide-react';
import { Logo } from '@/nutritrack/components/logo';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/nutritrack/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/nutritrack/components/ui/form';
import { Input } from '@/nutritrack/components/ui/input';
import { Label } from '@/nutritrack/components/ui/label';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { HealthArea, Supervision, SupervisionChecklistItem } from '@/nutritrack/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/nutritrack/local-firestore';
import { collection, getDocs, addDoc, Timestamp, doc, deleteDoc, updateDoc } from '@/nutritrack/local-firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/nutritrack/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Slider } from '@/nutritrack/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/nutritrack/components/ui/table';
import { Badge } from '@/nutritrack/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/nutritrack/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { summarizeSupervision } from '@/nutritrack/ai/flows/summarize-supervision-flow';
import { Separator } from '@/nutritrack/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/nutritrack/components/ui/radio-group';

const checkListItemSchema = z.object({
  item: z.string(),
  status: z.number().int().min(1).max(5),
  comments: z.string().optional(),
});

type SupervisionComponent = 'outpatient' | 'inpatient' | 'community';

const outpatientChecklistItems = [
    "Admission criteria correctly applied (SAM/MAM)",
    "Child's file correctly filled (anthropometry, clinical signs)",
    "Systematic treatments administered according to protocol",
    "Appetite test performed and interpreted correctly",
    "Correct amount of therapeutic food provided for home",
    "Next visit date correctly scheduled",
    "Sensitization messages provided to caretaker",
    "Stock management of RUTF/RUSF and medicines is adequate",
];
const inpatientChecklistItems = [
    "Phase 1/Transition/Phase 2 criteria correctly applied",
    "Daily monitoring chart filled correctly (vitals, feeding, meds)",
    "Therapeutic milk (F-75/F-100) preparation and administration is correct",
    "Management of medical complications (hypoglycemia, dehydration) follows protocol",
    "Hygiene and infection prevention measures are in place",
    "Patient files are complete and up-to-date",
    "Transition criteria from ITP to OTP are understood and applied",
    "Stock management for inpatient supplies is adequate",
];
const communityChecklistItems = [
    "CHWs have necessary screening materials (MUAC tapes, registers)",
    "Screening data is correctly recorded and reported",
    "Defaulter tracing is actively being done",
    "CHWs conduct regular home visits for at-risk children",
    "Community sensitization sessions (FGDs, counselling) are being held",
    "Referral slips are correctly filled and used",
    "CHW reporting is timely and complete",
    "Linkages between CHWs and health facility are functional",
];


function SupervisionChecklistForm({ 
    items, 
    onSave,
    isSubmitting,
    supervisorName,
    supervisorFunction,
    facilityName,
    component,
}: { 
    items: string[], 
    onSave: (data: any) => void,
    isSubmitting: boolean,
    supervisorName: string,
    supervisorFunction: string,
    facilityName: string,
    component: SupervisionComponent,
}) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingActionPlan, setIsGeneratingActionPlan] = useState(false);
    const form = useForm({
        resolver: zodResolver(z.object({
            checklist: z.array(checkListItemSchema).length(items.length),
            recommendations: z.string().optional(),
            actionPlan: z.string().optional(),
        })),
        defaultValues: {
            checklist: items.map(item => ({ item, status: 3, comments: '' })),
            recommendations: '',
            actionPlan: '',
        },
    });
    
    const handleGenerateRecommendations = async () => {
        setIsGenerating(true);
        try {
            const checklist = form.getValues('checklist');
            if (!supervisorName || !facilityName) {
                toast({ title: 'Error', description: 'Please ensure supervisor and facility are selected.', variant: 'destructive'});
                return;
            }
            const result = await summarizeSupervision({
                checklist,
                supervisorName,
                supervisorFunction,
                facilityName,
                component,
            });
            form.setValue('recommendations', result.recommendations);
            toast({ title: 'Success', description: 'AI recommendations have been generated.'});
        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            toast({ title: 'Error', description: 'Could not generate recommendations.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleGenerateActionPlan = async () => {
        setIsGeneratingActionPlan(true);
        try {
            const checklist = form.getValues('checklist');
            if (!supervisorName || !facilityName) {
                toast({ title: 'Error', description: 'Please ensure supervisor and facility are selected.', variant: 'destructive'});
                return;
            }
            const result = await summarizeSupervision({
                checklist,
                supervisorName,
                supervisorFunction,
                facilityName,
                component,
            });
            form.setValue('actionPlan', result.actionPlan);
            toast({ title: 'Success', description: 'AI action plan has been generated.'});
        } catch (error) {
            console.error('Error generating AI action plan:', error);
            toast({ title: 'Error', description: 'Could not generate action plan.', variant: 'destructive' });
        } finally {
            setIsGeneratingActionPlan(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 mt-6">
                <Card>
                    <CardHeader><CardTitle>Supervision Checklist</CardTitle></CardHeader>
                    <CardContent>
                        {items.map((item, index) => (
                            <FormField
                                key={index}
                                control={form.control}
                                name={`checklist.${index}.status`}
                                render={({ field }) => (
                                <FormItem className="mb-6 p-4 border rounded-md">
                                    <FormLabel className="font-semibold">{index + 1}. {items[index]}</FormLabel>
                                    <FormControl>
                                        <div className="pt-2">
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>1</span>
                                            <span>2</span>
                                            <span>3</span>
                                            <span>4</span>
                                            <span>5</span>
                                        </div>
                                        <Slider
                                            defaultValue={[field.value]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            max={5}
                                            min={1}
                                            step={1}
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                            <span>1 - Needs Improvement</span>
                                            <span>3 - Acceptable</span>
                                            <span>5 - Excellent</span>
                                        </div>
                                        </div>
                                    </FormControl>
                                    <FormField
                                        control={form.control}
                                        name={`checklist.${index}.comments`}
                                        render={({ field }) => (
                                            <FormItem className="mt-4">
                                                <FormControl>
                                                    <Input placeholder="Comments / Observations..." {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </FormItem>
                                )}
                            />
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Recommendations & Action Plan</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="recommendations" render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center">
                                    <FormLabel>Main Recommendations</FormLabel>
                                    <Button type="button" size="sm" variant="outline" onClick={handleGenerateRecommendations} disabled={isGenerating}>
                                        <Sparkles className="mr-2 h-4 w-4"/>
                                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                                    </Button>
                                </div>
                                <FormControl>
                                    <Textarea placeholder="List key recommendations based on the findings..." {...field} rows={4} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="actionPlan" render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center">
                                    <FormLabel>Action Plan (with deadlines)</FormLabel>
                                    <Button type="button" size="sm" variant="outline" onClick={handleGenerateActionPlan} disabled={isGeneratingActionPlan}>
                                        <Sparkles className="mr-2 h-4 w-4"/>
                                        {isGeneratingActionPlan ? 'Generating...' : 'Generate with AI'}
                                    </Button>
                                </div>
                                <FormControl>
                                    <Textarea placeholder="List actions to be taken, responsible persons, and deadlines..." {...field} rows={4} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
                 <div className='flex justify-end'>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Supervision Record'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

const supervisionDetailsSchema = z.object({
    supervisionDate: z.date(),
    supervisorName: z.string().min(1, 'Supervisor name is required.'),
    supervisorSex: z.enum(['M', 'F']),
    supervisorFunction: z.string().min(1, 'Supervisor function is required.'),
    selectedFacilityId: z.string().min(1, 'Health facility is required.'),
    selectedComponent: z.enum(['outpatient', 'inpatient', 'community']),
});

type SupervisionDetailsFormValues = z.infer<typeof supervisionDetailsSchema>;

export default function SupervisionPage() {
    const { toast } = useToast();
    const [healthAreas, setHealthAreas] = useState<HealthArea[]>([]);
    const [supervisions, setSupervisions] = useState<Supervision[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [supervisionToDelete, setSupervisionToDelete] = useState<string | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [supervisionToView, setSupervisionToView] = useState<Supervision | null>(null);

    const form = useForm<SupervisionDetailsFormValues>({
        resolver: zodResolver(supervisionDetailsSchema),
        defaultValues: {
            supervisionDate: new Date(),
            supervisorName: '',
            supervisorSex: 'M',
            supervisorFunction: '',
            selectedFacilityId: '',
        },
    });

    const selectedFacilityId = form.watch('selectedFacilityId');
    const selectedComponent = form.watch('selectedComponent');
    const supervisorName = form.watch('supervisorName');
    const supervisorFunction = form.watch('supervisorFunction');

    const fetchSupervisionData = useCallback(async () => {
        setLoading(true);
        try {
            const [healthAreasSnapshot, supervisionsSnapshot] = await Promise.all([
                getDocs(collection(db, 'healthAreas')),
                getDocs(collection(db, 'supervisions'))
            ]);
            setHealthAreas(healthAreasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HealthArea[]);
            setSupervisions(supervisionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supervision[]);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: 'Error', description: 'Failed to fetch supervision data.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSupervisionData();
    }, [fetchSupervisionData]);
    
    const handleSave = (checklistData: {checklist: any[], recommendations?: string, actionPlan?: string}) => {
        const formValues = form.getValues();
        if (!formValues.selectedComponent || !formValues.supervisionDate || !formValues.supervisorName || !formValues.selectedFacilityId || !formValues.supervisorFunction) {
            toast({ title: 'Error', description: 'Please fill in all supervision details.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        
        toast({ title: 'Success!', description: `Supervision record for ${formValues.selectedComponent} component saved.` });
        handleCancel();
        
        const saveData = {
            date: Timestamp.fromDate(formValues.supervisionDate),
            supervisorName: formValues.supervisorName,
            supervisorSex: formValues.supervisorSex,
            supervisorFunction: formValues.supervisorFunction,
            facilityId: formValues.selectedFacilityId,
            component: formValues.selectedComponent,
            ...checklistData
        };

        addDoc(collection(db, 'supervisions'), saveData)
            .then(() => fetchSupervisionData())
            .catch((error) => {
                console.error("Error saving supervision in background:", error);
                toast({ title: 'Save Failed', description: 'Could not save supervision record in the background.', variant: 'destructive' });
            }).finally(() => {
                setIsSubmitting(false);
            });
    };
    
    const handleDelete = async () => {
        if (!supervisionToDelete) return;
        
        const originalSupervisions = supervisions;
        setSupervisions(prev => prev.filter(s => s.id !== supervisionToDelete));
        setIsConfirmDeleteOpen(false);
        toast({ title: 'Success', description: 'Supervision record has been deleted.' });
        
        try {
            await deleteDoc(doc(db, 'supervisions', supervisionToDelete));
        } catch (error) {
            console.error("Error deleting supervision record:", error);
            setSupervisions(originalSupervisions);
            toast({ title: 'Error', description: 'Failed to delete supervision record.', variant: 'destructive' });
        } finally {
            setSupervisionToDelete(null);
        }
    };
    
    const resetFormState = () => {
        form.reset();
    }

    const availableComponents = useMemo(() => {
        if (!selectedFacilityId) return [];
        const facility = healthAreas.find(f => f.id === selectedFacilityId);
        if (!facility) return [];
        
        const components: { value: SupervisionComponent, label: string }[] = [];
        if (facility.programs?.includes('OTP') || facility.programs?.includes('TSFP')) {
            components.push({ value: 'outpatient', label: 'Outpatient Care (OTP/TSFP)' });
        }
        if (facility.programs?.includes('ITP')) {
            components.push({ value: 'inpatient', label: 'Inpatient Care (ITP)' });
        }
        components.push({ value: 'community', label: 'Community Component' });

        return components;
    }, [selectedFacilityId, healthAreas]);
    
    const checklistItems = useMemo(() => {
        switch(selectedComponent) {
            case 'outpatient': return outpatientChecklistItems;
            case 'inpatient': return inpatientChecklistItems;
            case 'community': return communityChecklistItems;
            default: return [];
        }
    }, [selectedComponent]);

    const handleCancel = () => {
        setIsFormOpen(false);
        resetFormState();
    }
  
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
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/special-attention" group="operations" tooltip="Special Attention"><AlertTriangle /><span>Special Attention</span></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/stock" group="operations" tooltip="Stock"><Warehouse /><span>Stock</span></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/supervision" group="operations" isActive tooltip="Supervision"><ClipboardCheck /><span>Supervision</span></SidebarMenuButton></SidebarMenuItem>
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
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-primary px-4 text-white sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarProvider>
              <SidebarTrigger className="md:hidden text-white" />
            </SidebarProvider>
            <h1 className="text-lg font-semibold">Program Supervision</h1>
          </div>
          {!isFormOpen && (
              <Button variant="secondary" onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record New Supervision
              </Button>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {isFormOpen ? (
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Supervision Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <Form {...form}>
                           <form className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                               <FormField control={form.control} name="supervisionDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date of Supervision</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                               <FormField control={form.control} name="supervisorName" render={({ field }) => (<FormItem><FormLabel>Supervisor Name</FormLabel><FormControl><Input placeholder="Supervisor's full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                               <FormField control={form.control} name="supervisorSex" render={({ field }) => (
                                   <FormItem>
                                       <FormLabel>Supervisor Sex</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4 pt-2">
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="M" /></FormControl><FormLabel className="font-normal">Male</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="F" /></FormControl><FormLabel className="font-normal">Female</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                   </FormItem>
                               )} />
                               <FormField control={form.control} name="supervisorFunction" render={({ field }) => (<FormItem><FormLabel>Supervisor Function</FormLabel><FormControl><Input placeholder="e.g., Program Manager" {...field} /></FormControl><FormMessage /></FormItem>)} />
                               <FormField control={form.control} name="selectedFacilityId" render={({ field }) => (
                                   <FormItem>
                                       <FormLabel>Health Facility Supervised</FormLabel>
                                       <Select onValueChange={(v) => { field.onChange(v); form.resetField('selectedComponent'); }} value={field.value}>
                                           <FormControl><SelectTrigger><SelectValue placeholder="Select a facility" /></SelectTrigger></FormControl>
                                           <SelectContent>{healthAreas.map(ha => (<SelectItem key={ha.id} value={ha.id}>{ha.healthFacilityName}</SelectItem>))}</SelectContent>
                                       </Select>
                                       <FormMessage />
                                   </FormItem>
                               )} />
                               <FormField control={form.control} name="selectedComponent" render={({ field }) => (
                                   <FormItem>
                                       <FormLabel>Program Component</FormLabel>
                                       <Select onValueChange={field.onChange} value={field.value} disabled={!selectedFacilityId}>
                                           <FormControl><SelectTrigger><SelectValue placeholder="Select a component" /></SelectTrigger></FormControl>
                                           <SelectContent>
                                               {availableComponents.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                                           </SelectContent>
                                       </Select>
                                       <FormMessage />
                                   </FormItem>
                               )} />
                           </form>
                       </Form>
                    </CardContent>
                </Card>
                
                {selectedComponent && (
                    <SupervisionChecklistForm 
                        items={checklistItems} 
                        onSave={handleSave} 
                        isSubmitting={isSubmitting}
                        supervisorName={supervisorName}
                        supervisorFunction={supervisorFunction}
                        facilityName={healthAreas.find(h => h.id === selectedFacilityId)?.healthFacilityName || ''}
                        component={selectedComponent}
                    />
                )}

                 <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Log
                    </Button>
                </div>
            </div>
          ) : (
             <Card>
                 <CardHeader>
                     <CardTitle>Supervision Log</CardTitle>
                     <CardDescription>A summary of all past supervision visits.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <SupervisionLogTable 
                        supervisions={supervisions} 
                        healthAreas={healthAreas} 
                        loading={loading}
                        onDelete={(id) => {
                            setSupervisionToDelete(id);
                            setIsConfirmDeleteOpen(true);
                        }}
                        onViewDetails={(supervision) => {
                            setSupervisionToView(supervision);
                            setIsDetailDialogOpen(true);
                        }}
                     />
                 </CardContent>
             </Card>
          )}
        </main>
      </SidebarInset>
    </div>
    <ConfirmationDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Supervision Record"
        description="Are you sure you want to permanently delete this supervision record? This action cannot be undone."
    />
     <SupervisionDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        supervision={supervisionToView}
        healthAreaName={healthAreas.find(ha => ha.id === supervisionToView?.facilityId)?.healthFacilityName || 'Unknown'}
    />
    </>
  );
}


function SupervisionLogTable({ 
    supervisions, 
    healthAreas, 
    loading, 
    onDelete,
    onViewDetails
}: { 
    supervisions: Supervision[], 
    healthAreas: HealthArea[], 
    loading: boolean, 
    onDelete: (id: string) => void,
    onViewDetails: (supervision: Supervision) => void
}) {
    
    const healthAreaMap = useMemo(() => new Map(healthAreas.map(ha => [ha.id, ha.healthFacilityName])), [healthAreas]);

    const calculateScore = (checklist: { status: number }[]) => {
        if (!checklist || checklist.length === 0) return 0;
        const total = checklist.reduce((sum, item) => sum + item.status, 0);
        const percentage = (total / (checklist.length * 5)) * 100;
        return Math.round(percentage);
    };

    if (loading) {
        return <p>Loading supervision log...</p>;
    }

    if (supervisions.length === 0) {
        return <p className="text-center text-muted-foreground py-10">No supervision records found.</p>
    }
    
    const sortedSupervisions = [...supervisions].sort((a,b) => b.date.toMillis() - a.date.toMillis());

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Health Facility</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedSupervisions.map(s => {
                    const score = calculateScore(s.checklist);
                    return (
                        <TableRow key={s.id}>
                            <TableCell>{format(s.date.toDate(), 'PPP')}</TableCell>
                            <TableCell>{s.supervisorName}</TableCell>
                            <TableCell>{healthAreaMap.get(s.facilityId) || s.facilityId}</TableCell>
                            <TableCell><Badge variant="secondary" className="capitalize">{s.component}</Badge></TableCell>
                            <TableCell className="max-w-xs">
                                <AISummary supervision={s} facilityName={healthAreaMap.get(s.facilityId) || 'the facility'} />
                            </TableCell>
                            <TableCell className="text-right font-bold">{score}%</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => onViewDetails(s)}>
                                          <FileText className="mr-2 h-4 w-4" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(s.id)}>
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function AISummary({ supervision, facilityName }: { supervision: Supervision, facilityName: string }) {
    const [summary, setSummary] = useState(supervision.summary || '');
    const [isLoading, setIsLoading] = useState(!supervision.summary);

    useEffect(() => {
        if (supervision.summary) {
            setSummary(supervision.summary);
            setIsLoading(false);
            return;
        }

        const generateSummary = async () => {
            setIsLoading(true);
            try {
                const result = await summarizeSupervision({
                    checklist: supervision.checklist,
                    supervisorName: supervision.supervisorName,
                    supervisorFunction: supervision.supervisorFunction,
                    facilityName: facilityName,
                    component: supervision.component,
                });
                setSummary(result.summary);
                // Save the generated summary back to Firestore
                const supervisionRef = doc(db, 'supervisions', supervision.id);
                updateDoc(supervisionRef, { summary: result.summary });

            } catch (error) {
                console.error('Error generating AI summary:', error);
                setSummary('Could not generate summary.');
            } finally {
                setIsLoading(false);
            }
        };
        
        generateSummary();
    }, [supervision, facilityName]);

    if (isLoading) {
        return <p className="text-xs text-muted-foreground">Generating summary...</p>;
    }

    return <p className="text-xs">{summary}</p>;
}

function SupervisionDetailDialog({ 
    isOpen, 
    onClose, 
    supervision, 
    healthAreaName 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    supervision: Supervision | null; 
    healthAreaName: string;
}) {
    if (!supervision) return null;
    
    const score = supervision.checklist.reduce((sum, item) => sum + item.status, 0);
    const maxScore = supervision.checklist.length * 5;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Supervision Details</DialogTitle>
                    <DialogDescription>
                        Full report for the supervision visit conducted on {format(supervision.date.toDate(), 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><strong>Facility:</strong> {healthAreaName}</p>
                        <p><strong>Supervisor:</strong> {supervision.supervisorName}</p>
                         <p><strong>Sex:</strong> {supervision.supervisorSex === 'M' ? 'Male' : 'Female'}</p>
                        <p><strong>Function:</strong> {supervision.supervisorFunction}</p>
                        <p><strong>Component:</strong> <Badge variant="secondary" className="capitalize">{supervision.component}</Badge></p>
                        <p><strong>Final Score:</strong> <Badge>{percentage}%</Badge></p>
                    </div>
                    <Separator/>
                    <div>
                        <h4 className="font-semibold mb-2">Checklist Items</h4>
                        <div className="space-y-3">
                        {supervision.checklist.map((item, index) => (
                            <div key={index} className="p-3 border rounded-md">
                                <p className="font-medium">{item.item}</p>
                                <p className="text-sm"><strong>Score:</strong> {item.status}/5</p>
                                {item.comments && <p className="text-sm text-muted-foreground"><strong>Comments:</strong> {item.comments}</p>}
                            </div>
                        ))}
                        </div>
                    </div>
                     <Separator/>
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations</h4>
                        <p className="text-sm whitespace-pre-wrap">{supervision.recommendations || 'No recommendations recorded.'}</p>
                    </div>
                     <Separator/>
                     <div>
                        <h4 className="font-semibold mb-2">Action Plan</h4>
                        <p className="text-sm whitespace-pre-wrap">{supervision.actionPlan || 'No action plan recorded.'}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}





