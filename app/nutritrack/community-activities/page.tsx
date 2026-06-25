'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, Contact, Bed, AlertTriangle, ClipboardCheck, MessageSquareQuote, BookOpen, Group, Send, Download, ChevronsUpDown, Check, Plus, Trash2, MoreVertical, Edit, ArrowLeft } from 'lucide-react';
import { Logo } from '@/nutritrack/components/logo';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/nutritrack/components/ui/form';
import { Input } from '@/nutritrack/components/ui/input';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/nutritrack/components/ui/tabs';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, addDoc, Timestamp, query, orderBy, where, writeBatch, doc } from '@/nutritrack/local-firestore';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { HealthArea, Village, CHW, CommunityScreening, CommunitySensitization, CommunityHomeVisit, CommunityCulinaryDemo } from '@/nutritrack/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/nutritrack/components/ui/select';
import { Checkbox } from '@/nutritrack/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/nutritrack/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/nutritrack/components/ui/table';
import { Badge } from '@/nutritrack/components/ui/badge';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/nutritrack/components/ui/dropdown-menu';

const sensitizationTopics = [
    'Exclusive Breastfeeding', 'Breastfeeding Techniques', 'Milk Expression and Cup-Feeding', 
    'Breastfeeding on Demand', 'Introduction to Complementary Feeding', 'Food Variety',
    'Feeding Frequency', 'Sick Child Feeding', 'Growth Monitoring', 'Good Hygiene',
    'Environmental Cleanliness', 'Separation from Baby', 'HIV and Breastfeeding', 'Other'
];

const fgdSessionSchema = z.object({
  id: z.string().optional(),
  topic: z.string().min(1, 'Topic is required.'),
  otherTopic: z.string().optional(),
  participantsMale: z.coerce.number().int().min(0).default(0),
  participantsFemale: z.coerce.number().int().min(0).default(0),
}).superRefine((data, ctx) => {
    if (data.topic === 'Other' && !data.otherTopic) {
        ctx.addIssue({ code: 'custom', message: 'Please specify topic.', path: ['otherTopic'] });
    }
});

const counsellingSessionSchema = z.object({
  id: z.string().optional(),
  topic: z.string().min(1, 'Topic is required.'),
  otherTopic: z.string().optional(),
  participantsMale: z.coerce.number().int().min(0).default(0),
  participantsFemale: z.coerce.number().int().min(0).default(0),
}).superRefine((data, ctx) => {
    if (data.topic === 'Other' && !data.otherTopic) {
        ctx.addIssue({ code: 'custom', message: 'Please specify topic.', path: ['otherTopic'] });
    }
});

const culinaryDemoSessionSchema = z.object({
    id: z.string().optional(),
    topic: z.string().min(3, "Please specify the recipe or topic."),
    participantsMaleNoMal: z.coerce.number().int().min(0).default(0),
    participantsFemaleNoMal: z.coerce.number().int().min(0).default(0),
    participantsMaleMAM: z.coerce.number().int().min(0).default(0),
    participantsFemaleMAM: z.coerce.number().int().min(0).default(0),
    participantsMaleSAM: z.coerce.number().int().min(0).default(0),
    participantsFemaleSAM: z.coerce.number().int().min(0).default(0),
});

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  chwId: z.string().min(1, "A CHW must be selected."),
  villageId: z.string().min(1, "A village must be selected."),
  
  screening: z.object({
    id: z.string().optional(),
    childrenScreened: z.coerce.number().int().min(0, "Must be a positive number.").default(0),
    samCasesFound: z.coerce.number().int().min(0, "Must be a positive number.").default(0),
    mamCasesFound: z.coerce.number().int().min(0, "Must be a positive number.").default(0),
    notes: z.string().optional(),
  }).optional(),
  
  sensitization: z.object({
    fgdSessions: z.array(fgdSessionSchema).optional(),
    counsellingSessions: z.array(counsellingSessionSchema).optional(),
  }).optional(),
  
  homeVisit: z.object({
    id: z.string().optional(),
    routineVisits: z.coerce.number().int().min(0).default(0),
    poorOutcomeVisits: z.coerce.number().int().min(0).default(0),
    defaulterTracinVisits: z.coerce.number().int().min(0).default(0),
    mamChildrenReached: z.coerce.number().int().min(0).default(0),
    samChildrenReached: z.coerce.number().int().min(0).default(0),
    findingsRoutine: z.string().optional(),
    findingsPoorOutcome: z.string().optional(),
    findingsDefaulter: z.string().optional(),
  }).optional(),
  
  culinaryDemo: z.object({
    demoSessions: z.array(culinaryDemoSessionSchema).optional(),
  }).optional()
});

type FormValues = z.infer<typeof formSchema>;

export interface AggregatedActivity {
    date: string;
    chwId: string;
    villageId: string;
    documentIds: string[];
    screening?: CommunityScreening;
    sensitization?: CommunitySensitization[];
    homeVisit?: CommunityHomeVisit;
    culinaryDemo?: CommunityCulinaryDemo[];
}


function CommunityActivitiesPageContent() {
    const { toast } = useToast();
    const [chws, setChws] = useState<CHW[]>([]);
    const [villages, setVillages] = useState<Village[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLog, setLoadingLog] = useState(true);
    const [activeTab, setActiveTab] = useState('screening');
    const [activityLog, setActivityLog] = useState<AggregatedActivity[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const [editingActivity, setEditingActivity] = useState<AggregatedActivity | null>(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<AggregatedActivity | null>(null);
    const [selectedRows, setSelectedRows] = useState<AggregatedActivity[]>([]);

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: undefined,
            chwId: '',
            villageId: '',
            screening: { childrenScreened: 0, samCasesFound: 0, mamCasesFound: 0, notes: '' },
            sensitization: { fgdSessions: [], counsellingSessions: [] },
            homeVisit: { routineVisits: 0, poorOutcomeVisits: 0, defaulterTracinVisits: 0, mamChildrenReached: 0, samChildrenReached: 0, findingsRoutine: '', findingsPoorOutcome: '', findingsDefaulter: '' },
            culinaryDemo: { demoSessions: [] }
        }
    });

    const { fields: fgdFields, append: appendFgd, remove: removeFgd } = useFieldArray({ control: form.control, name: "sensitization.fgdSessions" });
    const { fields: counsellingFields, append: appendCounselling, remove: removeCounselling } = useFieldArray({ control: form.control, name: "sensitization.counsellingSessions" });
    const { fields: demoFields, append: appendDemo, remove: removeDemo } = useFieldArray({ control: form.control, name: "culinaryDemo.demoSessions" });
    
    const watchedChwId = form.watch('chwId');

    const fetchFormData = useCallback(async () => {
        setLoading(true);
        try {
            const [chwsSnapshot, villagesSnapshot] = await Promise.all([
                getDocs(collection(db, 'chws')),
                getDocs(collection(db, 'villages')),
            ]);
            setChws(chwsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CHW));
            setVillages(villagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Village));
        } catch (error) {
            console.error("Error fetching form data:", error);
            toast({ title: "Error", description: "Failed to load required data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchActivityLog = useCallback(async () => {
        setLoadingLog(true);
        try {
            const [screenings, sensitizations, homeVisits, culinaryDemos] = await Promise.all([
                getDocs(query(collection(db, 'communityScreenings'), orderBy('date', 'desc'))),
                getDocs(query(collection(db, 'communitySensitizations'), orderBy('date', 'desc'))),
                getDocs(query(collection(db, 'communityHomeVisits'), orderBy('date', 'desc'))),
                getDocs(query(collection(db, 'communityCulinaryDemos'), orderBy('date', 'desc'))),
            ]);

            const log: Record<string, AggregatedActivity> = {};

            const processDocs = (docs: any[], type: keyof Omit<AggregatedActivity, 'date' | 'chwId' | 'villageId' | 'documentIds'>) => {
                docs.forEach(docSnap => {
                    const data = { id: docSnap.id, ...docSnap.data() } as any;
                    const dateStr = format(data.date.toDate(), 'yyyy-MM-dd');
                    const key = `${dateStr}-${data.chwId}-${data.villageId}`;
                    
                    if (!log[key]) {
                        log[key] = { date: dateStr, chwId: data.chwId, villageId: data.villageId, documentIds: [] };
                    }

                    log[key].documentIds.push(docSnap.id);

                    if (type === 'sensitization' || type === 'culinaryDemo') {
                        if (!log[key][type]) {
                            (log[key] as any)[type] = [];
                        }
                        (log[key] as any)[type]!.push(data);
                    } else {
                        (log[key] as any)[type] = data;
                    }
                });
            };

            processDocs(screenings.docs, 'screening');
            processDocs(sensitizations.docs, 'sensitization');
            processDocs(homeVisits.docs, 'homeVisit');
            processDocs(culinaryDemos.docs, 'culinaryDemo');
            
            const sortedLog = Object.values(log).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setActivityLog(sortedLog);

        } catch (error) {
            console.error("Error fetching activity log:", error);
            toast({ title: "Error", description: "Failed to load activity log.", variant: "destructive" });
        } finally {
            setLoadingLog(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchFormData();
        fetchActivityLog();
    }, [fetchFormData, fetchActivityLog]);
    
    const closeAndResetForm = useCallback(() => {
        setIsFormOpen(false);
        setEditingActivity(null);
        form.reset({
            date: undefined,
            chwId: '',
            villageId: '',
            screening: { childrenScreened: 0, samCasesFound: 0, mamCasesFound: 0, notes: '' },
            sensitization: { fgdSessions: [], counsellingSessions: [] },
            homeVisit: { routineVisits: 0, poorOutcomeVisits: 0, defaulterTracinVisits: 0, mamChildrenReached: 0, samChildrenReached: 0, findingsRoutine: '', findingsPoorOutcome: '', findingsDefaulter: '' },
            culinaryDemo: { demoSessions: [] }
        });
    }, [form]);
    
    const handleEdit = (activity: AggregatedActivity) => {
        setEditingActivity(activity);
        form.reset({
            date: new Date(activity.date),
            chwId: activity.chwId,
            villageId: activity.villageId,
            screening: activity.screening,
            sensitization: {
                fgdSessions: activity.sensitization?.filter(s => s.type === 'FGD'),
                counsellingSessions: activity.sensitization?.filter(s => s.type === 'Counselling'),
            },
            homeVisit: activity.homeVisit,
            culinaryDemo: {
                demoSessions: activity.culinaryDemo
            }
        });
        setIsFormOpen(true);
    };

    const onSubmit = (data: FormValues) => {
        const hasData = (obj: any, keysToIgnore: string[] = ['id']) => {
            if (!obj) return false;
            for (const key in obj) {
                if(keysToIgnore.includes(key)) continue;
                const value = obj[key];
                if (Array.isArray(value) && value.length > 0) return true;
                if (typeof value === 'number' && value > 0) return true;
                if (typeof value === 'string' && value.length > 0) return true;
            }
            return false;
        };
        
        const screeningHasData = hasData(data.screening, ['id', 'notes']);
        const homeVisitHasData = hasData(data.homeVisit, ['id', 'findingsRoutine', 'findingsPoorOutcome', 'findingsDefaulter']);
        const sensitizationHasData = (data.sensitization?.fgdSessions && data.sensitization.fgdSessions.length > 0) || (data.sensitization?.counsellingSessions && data.sensitization.counsellingSessions.length > 0);
        const culinaryDemoHasData = data.culinaryDemo?.demoSessions && data.culinaryDemo.demoSessions.length > 0;

        if (!screeningHasData && !homeVisitHasData && !sensitizationHasData && !culinaryDemoHasData) {
            toast({ title: "No Data", description: "Please enter data for at least one activity.", variant: "destructive" });
            return;
        }

        // Optimistic UI Update
        toast({ title: "Success", description: `Activity ${editingActivity ? 'updated' : 'recorded'} successfully.` });
        closeAndResetForm();
        fetchActivityLog();

        try {
            const batch = writeBatch(db);
            const commonData = { date: Timestamp.fromDate(data.date), chwId: data.chwId, villageId: data.villageId };

            if (editingActivity?.documentIds) {
                editingActivity.documentIds.forEach(id => {
                     batch.delete(doc(db, 'communityScreenings', id));
                     batch.delete(doc(db, 'communitySensitizations', id));
                     batch.delete(doc(db, 'communityHomeVisits', id));
                     batch.delete(doc(db, 'communityCulinaryDemos', id));
                });
            }
            
            if (screeningHasData) {
                batch.set(doc(collection(db, 'communityScreenings')), { ...commonData, ...data.screening });
            }
            if (data.sensitization?.fgdSessions && data.sensitization.fgdSessions.length > 0) {
                data.sensitization.fgdSessions.forEach(s => batch.set(doc(collection(db, 'communitySensitizations')), { ...commonData, type: 'FGD', ...s }));
            }
            if (data.sensitization?.counsellingSessions && data.sensitization.counsellingSessions.length > 0) {
                data.sensitization.counsellingSessions.forEach(s => batch.set(doc(collection(db, 'communitySensitizations')), { ...commonData, type: 'Counselling', ...s }));
            }
            if (homeVisitHasData) {
                batch.set(doc(collection(db, 'communityHomeVisits')), { ...commonData, ...data.homeVisit });
            }
            if (culinaryDemoHasData) {
                data.culinaryDemo!.demoSessions!.forEach(s => batch.set(doc(collection(db, 'communityCulinaryDemos')), { ...commonData, ...s }));
            }

            batch.commit().catch(error => {
                console.error("Error saving activity in background:", error);
                toast({ title: "Save Failed", description: "An error occurred while saving the activity in the background.", variant: "destructive" });
            });
        } catch (error) {
            console.error("Error preparing activity save:", error);
            toast({ title: "Save Failed", description: "An error occurred while preparing the activity data.", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        const activitiesToDelete = activityToDelete ? [activityToDelete] : selectedRows;
        if (activitiesToDelete.length === 0) return;
        
        try {
            const batch = writeBatch(db);
            activitiesToDelete.forEach(activity => {
                 activity.documentIds.forEach(id => {
                     batch.delete(doc(db, 'communityScreenings', id));
                     batch.delete(doc(db, 'communitySensitizations', id));
                     batch.delete(doc(db, 'communityHomeVisits', id));
                     batch.delete(doc(db, 'communityCulinaryDemos', id));
                });
            });

            await batch.commit();
            
            toast({ title: "Success", description: `${activitiesToDelete.length} activity record(s) deleted.` });
            
            await fetchActivityLog();
        } catch (error) {
            console.error("Error deleting activity:", error);
            toast({ title: "Error", description: "Failed to delete activity record(s).", variant: "destructive" });
        } finally {
            setIsConfirmDeleteOpen(false);
            setActivityToDelete(null);
            setSelectedRows([]);
        }
    };
    
    const filteredVillages = useMemo(() => {
        if (!watchedChwId) return [];
        const selectedChw = chws.find(c => c.id === watchedChwId);
        if (!selectedChw) return [];
        return villages.filter(v => v.id === selectedChw.villageId);
    }, [watchedChwId, chws, villages]);

    useEffect(() => {
        if (filteredVillages.length === 1 && !editingActivity) {
            form.setValue('villageId', filteredVillages[0].id);
        } else if (!editingActivity) {
            form.setValue('villageId', '');
        }
    }, [watchedChwId, filteredVillages, editingActivity, form]);

    const { isSubmitting } = form.formState;

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
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/supervision" group="operations" tooltip="Supervision"><ClipboardCheck /><span>Supervision</span></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-activities" group="operations" isActive tooltip="Community Activities"><Group /><span>Community Activities</span></SidebarMenuButton></SidebarMenuItem>
              
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
            <SidebarTrigger className="md:hidden text-white" />
            <h1 className="text-lg font-semibold">Community Activities</h1>
          </div>
          {!isFormOpen && (
              <div className="flex items-center gap-2">
                {selectedRows.length > 0 && (
                    <Button variant="destructive" onClick={() => setIsConfirmDeleteOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected ({selectedRows.length})
                    </Button>
                )}
                <Button onClick={() => { setIsFormOpen(true); setEditingActivity(null); }} variant="secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    Record New Activity
                </Button>
              </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
            {isFormOpen && (
              <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='mb-6'>
                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Activity Details</CardTitle>
                        <CardDescription>Select the date, CHW, and village where the activities took place. This information will apply to all forms below.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col space-y-2">
                                <FormLabel>Date</FormLabel>
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground",)}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsDatePickerOpen(false);}} initialFocus /></PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )} />

                           <FormField control={form.control} name="chwId" render={({ field }) => (
                                <FormItem className="flex flex-col space-y-2">
                                <FormLabel>Activity Done By</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                        >
                                            {field.value ? chws.find(c => c.id === field.value)?.firstName + ' ' + chws.find(c => c.id === field.value)?.lastName : "Select CHW"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search CHW..." />
                                            <CommandList><CommandEmpty>No CHW found.</CommandEmpty>
                                            <CommandGroup>
                                                {chws.map((chw) => (
                                                    <CommandItem value={`${chw.firstName} ${chw.lastName}`} key={chw.id} onSelect={() => { form.setValue("chwId", chw.id) }}>
                                                        <Check className={cn("mr-2 h-4 w-4", chw.id === field.value ? "opacity-100" : "opacity-0")} />
                                                        {chw.firstName} {chw.lastName}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="villageId" render={({ field }) => (
                                <FormItem className="flex flex-col space-y-2">
                                <FormLabel>Village / Quartier</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!watchedChwId}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={!watchedChwId ? "Select CHW first" : "Select village"} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredVillages.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="max-w-3xl mx-auto mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="screening">Mass Screening</TabsTrigger>
                        <TabsTrigger value="sensitization">Sensitization</TabsTrigger>
                        <TabsTrigger value="home-visit">Home Visits</TabsTrigger>
                        <TabsTrigger value="culinary-demo">Culinary Demo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="screening">
                        <Card>
                            <CardHeader>
                                <CardTitle>Record Mass Screening</CardTitle>
                                <CardDescription>Log a community-level screening session for acute malnutrition.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="screening.childrenScreened" render={({ field }) => (<FormItem><FormLabel># Children Screened</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="screening.samCasesFound" render={({ field }) => (<FormItem><FormLabel># SAM Cases Found</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="screening.mamCasesFound" render={({ field }) => (<FormItem><FormLabel># MAM Cases Found</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name="screening.notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional notes about the screening..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="sensitization">
                        <Card>
                            <CardHeader>
                                <CardTitle>Record Sensitization Session</CardTitle>
                                <CardDescription>Log community sensitization activities by adding one or more sessions.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4 rounded-md border p-4">
                                     <h3 className='font-bold text-base'>Focus Group Discussions (FGD)</h3>
                                     {fgdFields.map((field, index) => (
                                        <div key={field.id} className="p-3 border rounded-md space-y-3 relative">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive hover:bg-destructive/10" onClick={() => removeFgd(index)}><Trash2 className="h-4 w-4" /></Button>
                                            <FormField control={form.control} name={`sensitization.fgdSessions.${index}.topic`} render={({ field }) => (<FormItem><FormLabel>FGD Topic</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger></FormControl><SelectContent>{sensitizationTopics.map(topic => (<SelectItem key={topic} value={topic}>{topic}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                            {form.watch(`sensitization.fgdSessions.${index}.topic`) === 'Other' && <FormField control={form.control} name={`sensitization.fgdSessions.${index}.otherTopic`} render={({ field }) => (<FormItem><FormLabel>Specify Other Topic</FormLabel><FormControl><Input placeholder="e.g., Handwashing" {...field} /></FormControl><FormMessage /></FormItem>)} />}
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`sensitization.fgdSessions.${index}.participantsMale`} render={({ field }) => (<FormItem><FormLabel># Male Participants</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`sensitization.fgdSessions.${index}.participantsFemale`} render={({ field }) => (<FormItem><FormLabel># Female Participants</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                     ))}
                                     <Button type="button" variant="outline" size="sm" onClick={() => appendFgd({ topic: '', participantsMale: 0, participantsFemale: 0 })}><Plus className="mr-2 h-4 w-4" />Add FGD Session</Button>
                                </div>

                                <div className="space-y-4 rounded-md border p-4">
                                    <h3 className='font-bold text-base'>Individual Counselling Sessions</h3>
                                     {counsellingFields.map((field, index) => (
                                        <div key={field.id} className="p-3 border rounded-md space-y-3 relative">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive hover:bg-destructive/10" onClick={() => removeCounselling(index)}><Trash2 className="h-4 w-4" /></Button>
                                            <FormField control={form.control} name={`sensitization.counsellingSessions.${index}.topic`} render={({ field }) => (<FormItem><FormLabel>Counselling Topic</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger></FormControl><SelectContent>{sensitizationTopics.map(topic => (<SelectItem key={topic} value={topic}>{topic}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                            {form.watch(`sensitization.counsellingSessions.${index}.topic`) === 'Other' && <FormField control={form.control} name={`sensitization.counsellingSessions.${index}.otherTopic`} render={({ field }) => (<FormItem><FormLabel>Specify Other Topic</FormLabel><FormControl><Input placeholder="e.g., Feeding techniques" {...field} /></FormControl><FormMessage /></FormItem>)} />}
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`sensitization.counsellingSessions.${index}.participantsMale`} render={({ field }) => (<FormItem><FormLabel># Male Participants</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`sensitization.counsellingSessions.${index}.participantsFemale`} render={({ field }) => (<FormItem><FormLabel># Female Participants</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                     ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendCounselling({ topic: '', participantsMale: 0, participantsFemale: 0 })}><Plus className="mr-2 h-4 w-4" />Add Counselling Session</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="home-visit">
                        <Card>
                            <CardHeader>
                                <CardTitle>Record Home Visits</CardTitle>
                                <CardDescription>Log households visited by the CHW, categorized by reason.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4 rounded-md border p-4">
                                    <h4 className="font-medium">Number of Households Visited by Reason</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="homeVisit.routineVisits" render={({ field }) => (<FormItem><FormLabel>Routine Visits</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="homeVisit.poorOutcomeVisits" render={({ field }) => (<FormItem><FormLabel>Poor Treatment Outcome</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="homeVisit.defaulterTracinVisits" render={({ field }) => (<FormItem><FormLabel>Defaulter Tracing</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </div>
                                <div className="space-y-4 rounded-md border p-4">
                                    <h4 className="font-medium">Number of Malnourished Children Reached (children already in TSFP/OTP)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="homeVisit.mamChildrenReached" render={({ field }) => (<FormItem><FormLabel>MAM Children</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="homeVisit.samChildrenReached" render={({ field }) => (<FormItem><FormLabel>SAM Children</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </div>
                                <div className="space-y-4 rounded-md border p-4">
                                    <h4 className="font-medium">Main Findings by Visit Reason</h4>
                                    <FormField control={form.control} name="homeVisit.findingsRoutine" render={({ field }) => (<FormItem><FormLabel>Findings from Routine Visits</FormLabel><FormControl><Textarea placeholder="e.g., IYCF counselling, hygiene promotion..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="homeVisit.findingsPoorOutcome" render={({ field }) => (<FormItem><FormLabel>Findings from Poor Outcome Visits</FormLabel><FormControl><Textarea placeholder="e.g., Adherence issues, sharing of RUTF..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="homeVisit.findingsDefaulter" render={({ field }) => (<FormItem><FormLabel>Findings from Defaulter Tracing</FormLabel><FormControl><Textarea placeholder="e.g., Family moved, child is well..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="culinary-demo">
                        <Card>
                            <CardHeader>
                                <CardTitle>Record Culinary Demonstration</CardTitle>
                                <CardDescription>Log one or more culinary demonstration sessions conducted in the community.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {demoFields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-md space-y-4 relative">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeDemo(index)}><Trash2 className="h-4 w-4" /></Button>
                                        <h4 className="font-bold text-base">Demonstration Session #{index + 1}</h4>
                                        <FormField control={form.control} name={`culinaryDemo.demoSessions.${index}.topic`} render={({ field }) => (<FormItem><FormLabel>Recipe / Topic</FormLabel><FormControl><Input placeholder="e.g., Enriched porridge recipe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <div className="space-y-2 pt-2">
                                            <h5 className="font-medium text-sm">Participants from HH without malnourished children</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`culinaryDemo.demoSessions.${index}.participantsMaleNoMal`} render={({ field }) => (<FormItem><FormLabel>Male</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`culinaryDemo.demoSessions.${index}.participantsFemaleNoMal`} render={({ field }) => (<FormItem><FormLabel>Female</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                         <div className="space-y-2 pt-2">
                                            <h5 className="font-medium text-sm">Participants from HH with MAM children (TSFP program)</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`culinaryDemo.demoSessions.${index}.participantsMaleMAM`} render={({ field }) => (<FormItem><FormLabel>Male</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`culinaryDemo.demoSessions.${index}.participantsFemaleMAM`} render={({ field }) => (<FormItem><FormLabel>Female</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                         <div className="space-y-2 pt-2">
                                            <h5 className="font-medium text-sm">Participants from HH with SAM children (OTP program)</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`culinaryDemo.demoSessions.${index}.participantsMaleSAM`} render={({ field }) => (<FormItem><FormLabel>Male</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`culinaryDemo.demoSessions.${index}.participantsFemaleSAM`} render={({ field }) => (<FormItem><FormLabel>Female</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendDemo({ topic: '', participantsMaleNoMal: 0, participantsFemaleNoMal: 0, participantsMaleMAM: 0, participantsFemaleMAM: 0, participantsMaleSAM: 0, participantsFemaleSAM: 0 })}><Plus className="mr-2 h-4 w-4" />Add Demo Session</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                <div className="flex justify-end mt-8 gap-2 max-w-3xl mx-auto">
                    <Button variant="outline" type="button" onClick={closeAndResetForm}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Log
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : editingActivity ? 'Update Activity' : 'Save Activity'}
                    </Button>
                </div>
              </form>
              </Form>
            )}

             {!isFormOpen && (
                <Card className="max-w-7xl mx-auto mt-6">
                    <CardHeader>
                        <CardTitle>Activity Log</CardTitle>
                        <CardDescription>A register of all recorded community activities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ActivityLogTable 
                            activities={activityLog} 
                            chws={chws} 
                            villages={villages}
                            loading={loadingLog} 
                            onEdit={handleEdit}
                            onDelete={(activity) => {
                                setActivityToDelete(activity);
                                setIsConfirmDeleteOpen(true);
                            }}
                            selectedRows={selectedRows}
                            onRowSelect={(row, checked) => {
                                setSelectedRows(prev => 
                                    checked ? [...prev, row] : prev.filter(r => r.date !== row.date || r.chwId !== row.chwId || r.villageId !== row.villageId)
                                );
                            }}
                             onSelectAll={(checked) => {
                                if (checked) {
                                    setSelectedRows(activityLog);
                                } else {
                                    setSelectedRows([]);
                                }
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
        title={activityToDelete ? "Delete Activity Record" : `Delete ${selectedRows.length} Record(s)`}
        description={`Are you sure you want to delete ${activityToDelete ? 'this' : selectedRows.length} activity record(s)? This action cannot be undone.`}
      />
    </>
  );
}

function ActivityLogTable({
  activities,
  chws,
  villages,
  loading,
  onEdit,
  onDelete,
  selectedRows,
  onRowSelect,
  onSelectAll
}: {
  activities: AggregatedActivity[];
  chws: CHW[];
  villages: Village[];
  loading: boolean;
  onEdit: (activity: AggregatedActivity) => void;
  onDelete: (activity: AggregatedActivity) => void;
  selectedRows: AggregatedActivity[];
  onRowSelect: (row: AggregatedActivity, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}) {

  const chwMap = useMemo(() => new Map(chws.map(c => [c.id, `${c.firstName} ${c.lastName}`])), [chws]);
  const villageMap = useMemo(() => new Map(villages.map(v => [v.id, v.name])), [villages]);

  const getScreeningSummary = (activity?: CommunityScreening) => {
    if (!activity || activity.childrenScreened === 0) return <Badge variant="outline">N/A</Badge>;
    return (
      <div className="flex flex-col text-xs">
        <span>Screened: {activity.childrenScreened}</span>
        <span className="text-destructive">SAM: {activity.samCasesFound}</span>
        <span className="text-accent-foreground">MAM: {activity.mamCasesFound}</span>
      </div>
    );
  };

  const getSensitizationSummary = (activities?: CommunitySensitization[]) => {
    if (!activities || activities.length === 0) return <Badge variant="outline">N/A</Badge>;
    
    const totals = activities.reduce((acc, curr) => {
        acc.male += curr.participantsMale;
        acc.female += curr.participantsFemale;
        if(curr.type === 'FGD') acc.fgdCount += 1;
        if(curr.type === 'Counselling') acc.counsellingCount += 1;
        return acc;
    }, { male: 0, female: 0, fgdCount: 0, counsellingCount: 0 });

    const parts = [];
    if(totals.fgdCount > 0) parts.push(`FGD: ${totals.fgdCount}`);
    if(totals.counsellingCount > 0) parts.push(`Counselling: ${totals.counsellingCount}`);
    const totalParticipants = totals.male + totals.female;

    return (
       <div className="flex flex-col text-xs gap-1">
          <span>{parts.join(', ')}</span>
          {totalParticipants > 0 && <span>Total: {totalParticipants} (M: {totals.male}, F: {totals.female})</span>}
       </div>
    );
  };

  const getHomeVisitSummary = (activity?: CommunityHomeVisit) => {
    if (!activity) return <Badge variant="outline">N/A</Badge>;
    const totalVisits = (activity.routineVisits || 0) + (activity.poorOutcomeVisits || 0) + (activity.defaulterTracinVisits || 0);
    const totalReached = (activity.mamChildrenReached || 0) + (activity.samChildrenReached || 0);
    if (totalVisits === 0 && totalReached === 0) return <Badge variant="outline">N/A</Badge>;

    return (
        <div className="flex flex-col text-xs">
            <span>Total Visits: {totalVisits}</span>
            {totalReached > 0 && (
                <span>
                    Children Reached: {totalReached} (MAM: {activity.mamChildrenReached || 0}, SAM: {activity.samChildrenReached || 0})
                </span>
            )}
        </div>
    );
  };

  const getCulinaryDemoSummary = (activities?: CommunityCulinaryDemo[]) => {
     if (!activities || activities.length === 0) return <Badge variant="outline">N/A</Badge>;
     
     const totals = activities.reduce((acc, curr) => {
        acc.male += (curr.participantsMaleNoMal || 0) + (curr.participantsMaleMAM || 0) + (curr.participantsMaleSAM || 0);
        acc.female += (curr.participantsFemaleNoMal || 0) + (curr.participantsFemaleMAM || 0) + (curr.participantsFemaleSAM || 0);
        return acc;
     }, { male: 0, female: 0 });

     const totalParticipants = totals.male + totals.female;

     return (
        <div className="flex flex-col text-xs">
          <span>Demos: {activities.length}</span>
          {totalParticipants > 0 && <span>Total: {totalParticipants} (M: {totals.male}, F: {totals.female})</span>}
        </div>
     )
  };
  
  if (loading) return <p>Loading activity log...</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-[40px]'>
              <Checkbox 
                checked={selectedRows.length === activities.length && activities.length > 0}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
              />
          </TableHead>
          <TableHead>Date</TableHead>
          <TableHead>CHW</TableHead>
          <TableHead>Village</TableHead>
          <TableHead>Screening</TableHead>
          <TableHead>Sensitization</TableHead>
          <TableHead>Home Visits</TableHead>
          <TableHead>Culinary Demo</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="h-24 text-center">
              No community activities recorded yet.
            </TableCell>
          </TableRow>
        ) : (
          activities.map((activity, index) => (
            <TableRow key={index}>
              <TableCell>
                  <Checkbox 
                    checked={selectedRows.some(r => r.date === activity.date && r.chwId === activity.chwId && r.villageId === activity.villageId)}
                    onCheckedChange={(checked) => onRowSelect(activity, !!checked)}
                  />
              </TableCell>
              <TableCell>{format(new Date(activity.date), 'PPP')}</TableCell>
              <TableCell>{chwMap.get(activity.chwId) || 'Unknown'}</TableCell>
              <TableCell>{villageMap.get(activity.villageId) || 'Unknown'}</TableCell>
              <TableCell>{getScreeningSummary(activity.screening)}</TableCell>
              <TableCell>{getSensitizationSummary(activity.sensitization)}</TableCell>
              <TableCell>{getHomeVisitSummary(activity.homeVisit)}</TableCell>
              <TableCell>{getCulinaryDemoSummary(activity.culinaryDemo)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => onEdit(activity)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(activity)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}


export default function CommunityActivitiesPage() {
    return (
        <SidebarProvider>
            <CommunityActivitiesPageContent />
        </SidebarProvider>
    )
}




