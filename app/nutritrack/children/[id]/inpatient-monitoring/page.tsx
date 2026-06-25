'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useFormContext } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/nutritrack/components/ui/form';
import { Input } from '@/nutritrack/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/nutritrack/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/nutritrack/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { Separator } from '@/nutritrack/components/ui/separator';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/nutritrack/components/ui/badge';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, doc, getDoc, addDoc, Timestamp, getDocs, updateDoc, query, orderBy, limit, where, writeBatch } from '@/nutritrack/local-firestore';
import type { Child, InpatientVisit, Commodity, StockMovement, AggregatedStockByBatch, Visit } from '@/nutritrack/types';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon, Plus, X, Trash2, Clock, TrendingUp } from 'lucide-react';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { Checkbox } from '@/nutritrack/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/nutritrack/components/ui/tabs';
import { Label } from '@/nutritrack/components/ui/label';
import { calculateWHZ } from '@/nutritrack/lib/health-utils';


const mealSchema = z.object({
  prescribed: z.coerce.number().min(0).nullable(),
  actual: z.coerce.number().min(0).nullable(),
  absent: z.boolean().default(false),
  refused: z.boolean().default(false),
});

const medicationAdminSchema = z.object({
  doseNumber: z.number().int().positive(),
  quantity: z.coerce.number().min(0).nullable(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  doneBy: z.string().min(2, 'Required'),
});

const medicationSchema = z.object({
  commodityId: z.string().min(1, "Medication is required."),
  route: z.enum(['oral', 'anal', 'im', 'iv', 'perfusion']),
  dose: z.string().min(1, 'Dose is required.'),
  unit: z.enum(['mg/day', 'ml/day']),
  frequency: z.string().min(1, 'Frequency is required.'),
  administrations: z.array(medicationAdminSchema).min(1, 'At least one administration is required.'),
});

const inpatientVisitSchema = z.object({
  date: z.date(),
  treatmentPhase: z.enum(['Phase 1', 'Transition', 'Phase 2']),
  
  weight: z.coerce.number().positive(),
  
  morningTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional().nullable(),
  eveningTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional().nullable(),
  
  temperatureMorning: z.coerce.number().optional().nullable(),
  temperatureEvening: z.coerce.number().optional().nullable(),

  respirationRateMorning: z.coerce.number().int().optional().nullable(),
  respirationRateEvening: z.coerce.number().int().optional().nullable(),

  stoolsCount: z.coerce.number().int().min(0).optional().nullable(),
  
  oedema: z.enum(['yes', 'no']),
  oedemaGrade: z.enum(['1', '2', '3']).optional(),
  
  appetiteTest: z.enum(['pass', 'fail']).optional(),
  
  therapeuticFeeding: z.object({
    commodityId: z.string().min(1, "Feeding product is required."),
    numberOfMeals: z.coerce.number().int().min(1).max(12).default(8),
    meals: z.array(mealSchema),
  }).optional().nullable(),
  
  complications: z.object({
    hypoglycemia: z.boolean().default(false),
    hypothermia: z.boolean().default(false),
    dehydration: z.boolean().default(false),
    electrolyteImbalance: z.boolean().default(false),
    infection: z.boolean().default(false),
    severeAnemia: z.boolean().default(false),
    other: z.boolean().default(false),
    otherComplication: z.string().optional(),
  }),
  
  medications: z.array(medicationSchema),
  notes: z.string().optional(),
  
  action: z.enum(['continue', 'discharge']),
  dischargeType: z.enum(['treated_with_success', 'cured', 'defaulter', 'dead', 'non_respondent', 'medical_reference']).optional(),
  dischargeDate: z.date().optional(),
  nextPhaseAction: z.enum(['maintain', 'to_transition', 'to_phase_2']).optional(),
}).superRefine((data, ctx) => {
    if (data.oedema === 'yes' && !data.oedemaGrade) {
        ctx.addIssue({ code: 'custom', message: 'Oedema grade is required.', path: ['oedemaGrade']});
    }
    if (data.action === 'discharge') {
        if (!data.dischargeType) {
            ctx.addIssue({ code: 'custom', message: 'Discharge reason is required.', path: ['dischargeType']});
        }
        if (!data.dischargeDate) {
            ctx.addIssue({ code: 'custom', message: 'Discharge date is required.', path: ['dischargeDate']});
        }
        if (data.dischargeType === 'treated_with_success' && data.treatmentPhase !== 'Transition') {
            ctx.addIssue({ code: 'custom', message: 'Can only mark as "Treated with Success" from Transition phase.', path: ['dischargeType']});
        }
         if (data.dischargeType === 'cured' && data.treatmentPhase !== 'Phase 2') {
            ctx.addIssue({ code: 'custom', message: 'Can only be cured from Phase 2.', path: ['dischargeType']});
        }
    }
    if (data.action === 'continue') {
        if (!data.nextPhaseAction) {
            ctx.addIssue({ code: 'custom', message: 'Please select a phase action.', path: ['nextPhaseAction'] });
        }
    }
    if (data.complications.other && !data.complications.otherComplication) {
        ctx.addIssue({ code: 'custom', message: 'Please specify the other complication.', path: ['complications.otherComplication'] });
    }
});

type InpatientVisitFormValues = z.infer<typeof inpatientVisitSchema>;

export default function InpatientMonitoringPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const childId = params.id as string;
    
    const [child, setChild] = useState<Child | null>(null);
    const [commodities, setCommodities] = useState<Commodity[]>([]);
    const [allInpatientVisits, setAllInpatientVisits] = useState<InpatientVisit[]>([]);
    const [lastInpatientVisit, setLastInpatientVisit] = useState<InpatientVisit | null>(null);
    const [aggregatedStock, setAggregatedStock] = useState<AggregatedStockByBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [whz, setWhz] = useState<number | null>(null);

    const { formState: { isSubmitting } } = useForm();
    
    // Date picker popover states
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isDischargeDatePickerOpen, setIsDischargeDatePickerOpen] = useState(false);


    const form = useForm<InpatientVisitFormValues>({
        resolver: zodResolver(inpatientVisitSchema),
        defaultValues: {
            date: new Date(),
            treatmentPhase: 'Phase 1',
            oedema: 'no',
            complications: { hypoglycemia: false, hypothermia: false, dehydration: false, electrolyteImbalance: false, infection: false, severeAnemia: false, other: false, otherComplication: '' },
            medications: [],
            action: 'continue',
            nextPhaseAction: 'maintain',
            therapeuticFeeding: {
                commodityId: '',
                numberOfMeals: 8,
                meals: Array(8).fill({ prescribed: null, actual: null, absent: false, refused: false })
            }
        },
    });

    const { control, handleSubmit, watch, setValue, getValues } = form;

    const watchedOedema = watch('oedema');
    const watchedAction = watch('action');
    const watchedDischargeType = watch('dischargeType');
    const watchedPhase = watch('treatmentPhase');
    const watchedNumberOfMeals = watch('therapeuticFeeding.numberOfMeals');
    const watchedWeight = watch('weight');
    const watchedDischargeDate = watch('dischargeDate');
    const watchedOtherComplication = watch('complications.other');
    const watchedNextPhaseAction = watch('nextPhaseAction');

    const { fields: medFields, append: appendMed, remove: removeMed } = useFieldArray({ control, name: "medications" });
    const { fields: mealFields, replace: replaceMeals } = useFieldArray({ control, name: "therapeuticFeeding.meals" });

    const availableCommodityIds = useMemo(() => {
        const commoditySet = new Set<string>();
        aggregatedStock.forEach(stock => {
            if (stock.closingStock > 0) {
                commoditySet.add(stock.commodityId);
            }
        });
        return Array.from(commoditySet);
    }, [aggregatedStock]);

    const nutritionalTreatments = useMemo(() => commodities.filter(c => 
        c.type === 'Nutritional' && 
        c.program === 'SAM+' &&
        availableCommodityIds.includes(c.id)
    ), [commodities, availableCommodityIds]);

    const systematicTreatments = useMemo(() => commodities.filter(c => 
        c.type === 'Systematic Treatment' && 
        (c.program === 'SAM+' || c.program === 'Both') &&
        availableCommodityIds.includes(c.id)
    ), [commodities, availableCommodityIds]);
    
    useEffect(() => {
        if(child && watchedWeight > 0){
            setWhz(calculateWHZ(watchedWeight, child.height, child.sex));
        } else {
            setWhz(null);
        }
    }, [child, watchedWeight]);

    useEffect(() => {
        const numMeals = getValues('therapeuticFeeding.numberOfMeals') ?? 0;
        if (numMeals > 0) {
            const currentMeals = getValues('therapeuticFeeding.meals') || [];
            if (currentMeals.length !== numMeals) {
                const newMeals = Array.from({ length: numMeals }, (_, i) => 
                    currentMeals[i] || { prescribed: null, actual: null, absent: false, refused: false }
                );
                replaceMeals(newMeals);
            }
        }
    }, [watchedNumberOfMeals, getValues, replaceMeals]);

    useEffect(() => {
        if (watchedOedema === 'no') {
            setValue('oedemaGrade', undefined);
        }
    }, [watchedOedema, setValue]);

    useEffect(() => {
        if (!childId) return;

        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const childDoc = await getDoc(doc(db, 'children', childId));
                if (!childDoc.exists()) {
                    toast({ title: 'Error', description: 'Child not found.', variant: 'destructive' });
                    router.push('/nutritrack/children');
                    return;
                }
                const childData = { id: childDoc.id, ...childDoc.data() } as Child;
                setChild(childData);
                
                const inpatientVisitsQuery = query(collection(db, 'children', childId, 'inpatientVisits'), orderBy('date', 'asc'));

                const [commoditiesSnapshot, movementsSnapshot, allVisitsSnapshot] = await Promise.all([
                    getDocs(collection(db, 'commodities')),
                    getDocs(query(collection(db, 'stockMovements'), where('healthAreaId', '==', childData.healthAreaId))),
                    getDocs(inpatientVisitsQuery)
                ]);
                
                const fetchedCommodities = commoditiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commodity))
                setCommodities(fetchedCommodities);
                
                const allVisitsData = allVisitsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as InpatientVisit));
                setAllInpatientVisits(allVisitsData);

                const lastVisit = allVisitsData.length > 0 ? allVisitsData[allVisitsData.length - 1] : null;

                if (lastVisit) {
                    setLastInpatientVisit(lastVisit);
                    setValue('treatmentPhase', lastVisit.treatmentPhase || 'Phase 1');
                } else {
                    setValue('treatmentPhase', childData.currentInpatientPhase || 'Phase 1');
                }
                
                // Aggregate Stock
                const movements = movementsSnapshot.docs.map(doc => doc.data() as StockMovement);
                const stockByBatch: Record<string, AggregatedStockByBatch> = {};
                movements.forEach(m => {
                    const key = `${m.commodityId}-${m.batchNumber || 'No Batch'}`;
                    if (!stockByBatch[key]) {
                        const commodity = fetchedCommodities.find(c => c.id === m.commodityId);
                        stockByBatch[key] = {
                            commodityId: m.commodityId,
                            commodityName: commodity?.name || 'Unknown',
                            unit: commodity?.unit || 'unit',
                            batchNumber: m.batchNumber || 'No Batch',
                            openingStock: 0, received: 0, used: 0, transferred: 0, damaged: 0, closingStock: 0
                        };
                    }
                    if (m.type === 'received') stockByBatch[key].closingStock += m.quantity;
                    else stockByBatch[key].closingStock -= m.quantity;
                });
                setAggregatedStock(Object.values(stockByBatch));
                
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ title: 'Error', description: 'Failed to fetch required data.', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [childId, router, toast, setValue]);

    async function onSubmit(data: InpatientVisitFormValues) {
        if (!child) return;

        // Optimistic UI update
        toast({ title: "Success", description: "Daily monitoring record saved." });
        router.push(`/nutritrack/children/${childId}`);

        const sanitize = (val: any) => (val === '' || val === undefined || val === null) ? null : val;
    
        try {
            const batch = writeBatch(db);
            const childRef = doc(db, 'children', childId);
            const newVisitRef = doc(collection(db, 'children', childId, 'inpatientVisits'));
    
            let finalPhase = data.treatmentPhase;
            if (data.action === 'continue') {
                if (data.nextPhaseAction === 'to_transition') finalPhase = 'Transition';
                else if (data.nextPhaseAction === 'to_phase_2') finalPhase = 'Phase 2';
            }
            
            const visitData: Omit<InpatientVisit, 'id'> = {
                date: Timestamp.fromDate(data.date),
                visitDate: Timestamp.fromDate(data.date), // Align with Visit type
                treatmentPhase: finalPhase,
                weight: data.weight,
                morningTime: data.morningTime || null,
                eveningTime: data.eveningTime || null,
                oedema: data.oedema,
                oedemaGrade: data.oedemaGrade || null,
                whz: calculateWHZ(data.weight, child.height, child.sex),
                appetiteTest: data.appetiteTest || null,
                temperatureMorning: sanitize(data.temperatureMorning),
                temperatureEvening: sanitize(data.temperatureEvening),
                respirationRateMorning: sanitize(data.respirationRateMorning),
                respirationRateEvening: sanitize(data.respirationRateEvening),
                stoolsCount: sanitize(data.stoolsCount),
                therapeuticFeeding: data.therapeuticFeeding ? {
                    ...data.therapeuticFeeding,
                    meals: data.therapeuticFeeding.meals.map(m => ({...m, prescribed: sanitize(m.prescribed), actual: sanitize(m.actual) }))
                } : null,
                complications: {
                    ...data.complications,
                    otherComplication: data.complications.other ? data.complications.otherComplication : ''
                },
                medications: data.medications.map(med => ({
                    ...med,
                    administrations: med.administrations.map(admin => ({ ...admin, quantity: sanitize(admin.quantity) }))
                })),
                notes: data.notes || '',
            };
    
            batch.set(newVisitRef, visitData);
    
            if (data.action === 'discharge' && data.dischargeType && data.dischargeDate) {
                batch.update(childRef, {
                    status: 'discharged',
                    discharge: {
                        type: data.dischargeType,
                        date: Timestamp.fromDate(data.dischargeDate),
                    }
                });
            } else if (finalPhase !== child.currentInpatientPhase) {
                batch.update(childRef, { currentInpatientPhase: finalPhase });
            }
    
            batch.commit().catch((error) => {
                console.error("Error saving inpatient visit in background:", error);
                toast({ title: 'Save Failed', description: 'Failed to save monitoring record in the background.', variant: 'destructive' });
            });
    
        } catch (error) {
            console.error("Error preparing inpatient visit data:", error);
            toast({ title: 'Error', description: 'Failed to prepare monitoring record for saving.', variant: 'destructive' });
        }
    }
    
    const curedPerformanceStats = useMemo(() => {
        if (!child || !watchedDischargeDate || (watchedDischargeType !== 'cured' && watchedDischargeType !== 'treated_with_success') || !watchedWeight) {
            return { lengthOfStay: null, weightGain: null };
        }

        const allWeights = [
            { weight: child.weight, date: child.admissionDate.toDate() },
            ...allInpatientVisits.map(v => ({ weight: v.weight, date: v.date.toDate() }))
        ];

        const { minWeight, minWeightDate } = allWeights.reduce(
            (min, current) => (current.weight < min.minWeight ? { minWeight: current.weight, minWeightDate: current.date } : min),
            { minWeight: Infinity, minWeightDate: new Date() }
        );
        
        const lengthOfStay = differenceInDays(watchedDischargeDate, child.admissionDate.toDate());
        
        let weightGain = null;
        const daysForGain = differenceInDays(watchedDischargeDate, minWeightDate);
        if (minWeight > 0 && Number(watchedWeight) > minWeight && daysForGain > 0) {
            const weightGainGrams = (Number(watchedWeight) - minWeight) * 1000;
            weightGain = weightGainGrams / minWeight / daysForGain;
        }
        
        return { lengthOfStay, weightGain };

    }, [child, allInpatientVisits, watchedDischargeDate, watchedDischargeType, watchedWeight]);

     if (loading || !child) return <div className="p-6">Loading child details...</div>;

    const complicationsList = [
        { id: 'hypoglycemia', label: 'Hypoglycemia' },
        { id: 'hypothermia', label: 'Hypothermia' },
        { id: 'dehydration', label: 'Dehydration (Shock)' },
        { id: 'electrolyteImbalance', label: 'Electrolyte Imbalance' },
        { id: 'infection', label: 'Infection (Sepsis)' },
        { id: 'severeAnemia', label: 'Severe Anaemia' },
    ] as const;

    const getDischargeOptions = () => {
        const all = ['defaulter', 'dead', 'non_respondent', 'medical_reference'];
        if (watchedPhase === 'Transition') return ['treated_with_success', ...all];
        if (watchedPhase === 'Phase 2') return ['cured', ...all];
        return all;
    };

    return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50">
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto">
                <div className='flex justify-between items-center'>
                    <h1 className="text-2xl font-bold">Inpatient Daily Monitoring: {child.firstName} {child.lastName}</h1>
                    <Button type="button" variant="outline" onClick={() => router.push(`/nutritrack/children/${childId}`)}>Back to Child Details</Button>
                </div>

                 <Card>
                    <CardHeader><CardTitle>Child Summary</CardTitle><CardDescription>ID: {child.childCode} | Age: {child.age} mos | Sex: {child.sex}</CardDescription></CardHeader>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle>Daily Record</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}><PopoverTrigger asChild><FormControl><Input placeholder="Pick a date" value={field.value ? format(field.value, "PPP") : ''} onChange={(e) => { const date = new Date(e.target.value); if (!isNaN(date.getTime())) { field.onChange(date); } }} className={cn(!field.value && "text-muted-foreground")} /></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsDatePickerOpen(false);}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <FormField control={control} name="treatmentPhase" render={({ field }) => (<FormItem><FormLabel>Phase of Treatment</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled><FormControl><SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Phase 1">Phase 1 (Stabilization)</SelectItem><SelectItem value="Transition">Transition Phase</SelectItem><SelectItem value="Phase 2">Phase 2 (Rehabilitation)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="vitals" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="vitals">Vitals</TabsTrigger>
                        <TabsTrigger value="feeding">Feeding</TabsTrigger>
                        <TabsTrigger value="complications">Complications</TabsTrigger>
                        <TabsTrigger value="meds">Medications</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="vitals">
                        <Card>
                             <CardHeader><CardTitle>Vitals Monitoring</CardTitle></CardHeader>
                             <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                                    <FormField control={control} name="morningTime" render={({ field }) => (<FormItem><FormLabel>Morning Monitoring Time</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="eveningTime" render={({ field }) => (<FormItem><FormLabel>Evening Monitoring Time</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <Separator/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                                    <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Weight (kg) - Morning</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <div>
                                        <Label>W/H Z-Score</Label>
                                        <Input value={whz?.toFixed(2) ?? 'N/A'} readOnly className="mt-2 font-semibold" />
                                    </div>

                                    <FormField control={form.control} name="temperatureMorning" render={({ field }) => (<FormItem><FormLabel>Temperature Morning (°C)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="temperatureEvening" render={({ field }) => (<FormItem><FormLabel>Temperature Evening (°C)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    
                                    <FormField control={form.control} name="respirationRateMorning" render={({ field }) => (<FormItem><FormLabel>Respiration Rate Morning (tpm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="respirationRateEvening" render={({ field }) => (<FormItem><FormLabel>Respiration Rate Evening (tpm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

                                    <FormField control={form.control} name="stoolsCount" render={({ field }) => (<FormItem><FormLabel>Stools (in previous 24h)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                     
                                     <FormField control={control} name="oedema" render={({ field }) => (<FormItem><FormLabel>Bilateral Oedema</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                     
                                     {watchedOedema === 'yes' && (<FormField control={control} name="oedemaGrade" render={({ field }) => (<FormItem><FormLabel>Oedema Grade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl><SelectContent><SelectItem value="1">Grade 1</SelectItem><SelectItem value="2">Grade 2</SelectItem><SelectItem value="3">Grade 3</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />)}
                                     
                                     <FormField control={form.control} name="appetiteTest" render={({ field }) => (<FormItem><FormLabel>Appetite Test</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="pass" /></FormControl><FormLabel className="font-normal">Pass</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="fail" /></FormControl><FormLabel className="font-normal">Fail</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                </div>
                             </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="feeding">
                        <Card>
                             <CardHeader><CardTitle>Therapeutic Feeding</CardTitle></CardHeader>
                             <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField control={control} name="therapeuticFeeding.commodityId" render={({field}) => (<FormItem><FormLabel>Product</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select feeding product" /></SelectTrigger></FormControl><SelectContent>{nutritionalTreatments.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                                    <FormField control={control} name="therapeuticFeeding.numberOfMeals" render={({field}) => (<FormItem><FormLabel>Number of Meals/Day</FormLabel><FormControl><Input type="number" min={1} max={12} {...field} /></FormControl><FormMessage/></FormItem>)} />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Meal Log</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {mealFields.map((field, index) => {
                                            const mealData = getValues(`therapeuticFeeding.meals.${index}`);
                                            const isActualDisabled = Boolean(mealData?.absent || mealData?.refused);
                                            return (
                                                <Card key={field.id} className="p-3 space-y-2">
                                                    <h4 className="font-semibold">Meal {index + 1}</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <FormField control={control} name={`therapeuticFeeding.meals.${index}.prescribed`} render={({field}) => (<FormItem><FormLabel>Prescribed (ml)</FormLabel><FormControl><Input type="number" placeholder="ml" {...field} value={field.value ?? ''}/></FormControl></FormItem>)} />
                                                        <FormField control={control} name={`therapeuticFeeding.meals.${index}.actual`} render={({field}) => (<FormItem><FormLabel>Actual (ml)</FormLabel><FormControl><Input type="number" placeholder="ml" {...field} value={field.value ?? ''} disabled={isActualDisabled} /></FormControl></FormItem>)} />
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                    <FormField control={control} name={`therapeuticFeeding.meals.${index}.absent`} render={({field}) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if(checked) { setValue(`therapeuticFeeding.meals.${index}.refused`, false); } }} /></FormControl><FormLabel>Absent</FormLabel></FormItem>)} />
                                                    <FormField control={control} name={`therapeuticFeeding.meals.${index}.refused`} render={({field}) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if(checked) { setValue(`therapeuticFeeding.meals.${index}.absent`, false); } }} /></FormControl><FormLabel>Refused</FormLabel></FormItem>)} />
                                                    </div>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </div>
                             </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="complications">
                         <Card>
                             <CardHeader><CardTitle>Medical Complications Monitoring</CardTitle></CardHeader>
                             <CardContent className="space-y-2">
                                {complicationsList.map((comp) => (
                                    <FormField
                                        key={comp.id}
                                        control={form.control}
                                        name={`complications.${comp.id}`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>{comp.label}</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                                 <FormField
                                    key='other'
                                    control={form.control}
                                    name='complications.other'
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col space-y-3 rounded-md border p-4">
                                            <div className='flex flex-row items-start space-x-3 space-y-0'>
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Other</FormLabel>
                                            </div>
                                            </div>
                                            {watchedOtherComplication && (
                                                <FormField
                                                    control={form.control}
                                                    name="complications.otherComplication"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input placeholder="Specify other complication..." {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </FormItem>
                                    )}
                                />
                             </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="meds">
                        <Card>
                            <CardHeader><CardTitle>Medication Administration</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {medFields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-md space-y-4">
                                        <div className='flex justify-between items-center'>
                                            <h3 className='font-semibold text-lg'>Medication {index + 1}</h3>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeMed(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                        <FormField control={control} name={`medications.${index}.commodityId`} render={({field}) => (<FormItem><FormLabel>Medication</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select treatment" /></SelectTrigger></FormControl><SelectContent>{systematicTreatments.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                           <FormField control={control} name={`medications.${index}.route`} render={({field}) => (<FormItem><FormLabel>Route</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger></FormControl><SelectContent><SelectItem value="oral">Oral</SelectItem><SelectItem value="anal">Anal Suppository</SelectItem><SelectItem value="im">Intramuscular</SelectItem><SelectItem value="iv">Intravenous</SelectItem><SelectItem value="perfusion">Perfusion</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                           <FormField control={control} name={`medications.${index}.dose`} render={({field}) => (<FormItem><FormLabel>Dose</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormField control={control} name={`medications.${index}.unit`} render={({field}) => (<FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent><SelectItem value="mg/day">mg/day</SelectItem><SelectItem value="ml/day">ml/day</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                            <FormField control={control} name={`medications.${index}.frequency`} render={({field}) => (<FormItem><FormLabel>Frequency (times/day)</FormLabel><FormControl><Input placeholder="e.g., 2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <Separator/>
                                        <MedicationAdministrationSubForm medIndex={index} />
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendMed({ commodityId: '', route: 'oral', dose: '', unit: 'mg/day', frequency: '', administrations: [] })}><Plus className="mr-2 h-4 w-4" />Add Medication</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
                
                <Card>
                    <CardHeader><CardTitle>General Notes & Action</CardTitle></CardHeader>
                    <CardContent className='space-y-6'>
                        <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>Progress Notes</FormLabel><FormControl><Textarea placeholder="Add any other relevant observations for the day..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={control} name="action" render={({ field }) => (
                            <FormItem className="space-y-3"><FormLabel>Action for today</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="continue" /></FormControl><FormLabel>Continue Treatment</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="discharge" /></FormControl><FormLabel>Discharge Child</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                            </FormItem>
                         )}/>
                         {watchedAction === 'continue' && (
                             <FormField control={control} name="nextPhaseAction" render={({ field }) => (
                                <FormItem className="p-4 border rounded-md space-y-3">
                                    <FormLabel>Phase Action for This Visit</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                                            
                                            {watchedPhase === 'Phase 1' && (
                                                <>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="maintain" /></FormControl><FormLabel>Maintain in Phase 1</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="to_transition" /></FormControl><FormLabel>Move to Transition Phase</FormLabel></FormItem>
                                                </>
                                            )}

                                            {watchedPhase === 'Transition' && (
                                                <>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="maintain" /></FormControl><FormLabel>Maintain in Transition Phase</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="to_phase_2" /></FormControl><FormLabel>Move to Phase 2 (Rehabilitation)</FormLabel></FormItem>
                                                </>
                                            )}

                                            {watchedPhase === 'Phase 2' && (
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="maintain" /></FormControl><FormLabel>Maintain in Phase 2</FormLabel></FormItem>
                                            )}

                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                             )}/>
                         )}
                         {watchedAction === 'discharge' && (
                            <div className="p-4 border rounded-md grid grid-cols-1 gap-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField control={control} name="dischargeDate" render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Discharge Date</FormLabel><Popover open={isDischargeDatePickerOpen} onOpenChange={setIsDischargeDatePickerOpen}><PopoverTrigger asChild><FormControl><Input placeholder="Pick a date" value={field.value ? format(field.value, "PPP") : ''} onChange={(e) => { const date = new Date(e.target.value); if (!isNaN(date.getTime())) { field.onChange(date); } }} className={cn(!field.value && "text-muted-foreground")} /></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsDischargeDatePickerOpen(false);}} /></PopoverContent></Popover><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name="dischargeType" render={({ field }) => (
                                        <FormItem><FormLabel>Reason</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {getDischargeOptions().map(opt => <SelectItem key={opt} value={opt} className="capitalize">{opt.replace(/_/g, ' ')}</SelectItem>)}
                                            </SelectContent>
                                        </Select><FormMessage /></FormItem>)} />
                                </div>
                                {(watchedDischargeType === 'cured' || watchedDischargeType === 'treated_with_success') && (
                                <Card className="bg-green-50 border-green-200 mt-4">
                                    <CardHeader className="pb-2"><CardTitle className="text-base text-green-800">Performance Indicators</CardTitle></CardHeader>
                                    <CardContent className="text-sm space-y-1 text-green-700">
                                        <div className="flex justify-between items-center">
                                            <span className='flex items-center gap-2'><Clock className='w-4 h-4'/>Length of Stay:</span>
                                            <span className="font-bold">{curedPerformanceStats.lengthOfStay ?? 'N/A'} days</span>
                                        </div>
                                         <div className="flex justify-between items-center">
                                            <span className='flex items-center gap-2'><TrendingUp className='w-4 h-4'/>Avg. Weight Gain:</span>
                                            <span className="font-bold">{curedPerformanceStats.weightGain ? `${curedPerformanceStats.weightGain.toFixed(2)} g/kg/day` : 'N/A'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            </div>
                         )}
                    </CardContent>
                </Card>

                 <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push(`/nutritrack/children/${childId}`)} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Daily Record'}
                    </Button>
                </div>
            </form>
        </Form>
    </main>
    )
}

function MedicationAdministrationSubForm({ medIndex }: { medIndex: number }) {
  const { control, watch } = useFormContext<InpatientVisitFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `medications.${medIndex}.administrations`,
  });

  const frequency = watch(`medications.${medIndex}.frequency`);
  const numberOfDoses = parseInt(frequency?.match(/\d+/)?.[0] || '1') || 1;

  useEffect(() => {
    const currentAdmins = fields.length;
    if (currentAdmins < numberOfDoses) {
      for (let i = currentAdmins; i < numberOfDoses; i++) {
        append({ doseNumber: i + 1, quantity: null, time: '', doneBy: '' });
      }
    } else if (currentAdmins > numberOfDoses) {
       const toRemove = [];
       for (let i = numberOfDoses; i < currentAdmins; i++) {
           toRemove.push(i);
       }
       remove(toRemove);
    }
  }, [numberOfDoses, fields.length, append, remove]);

  return (
    <div className="space-y-3">
        <Label>Administration Log</Label>
        {fields.map((field, adminIndex) => (
            <div key={field.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end p-2 border rounded">
                <p className="font-medium text-sm col-span-full">Dose {adminIndex + 1}</p>
                <FormField control={control} name={`medications.${medIndex}.administrations.${adminIndex}.quantity`} render={({ field }) => (<FormItem><FormLabel>Actual Qty</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`medications.${medIndex}.administrations.${adminIndex}.time`} render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`medications.${medIndex}.administrations.${adminIndex}.doneBy`} render={({ field }) => (<FormItem><FormLabel>Done By</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        ))}
    </div>
  );
}

    




