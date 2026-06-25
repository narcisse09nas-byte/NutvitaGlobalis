'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { diagnoseMalnutrition, calculateWHZ, DiagnosisResult } from '@/nutritrack/lib/health-utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/nutritrack/components/ui/badge';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, writeBatch, doc, getDoc, query, where, orderBy, Timestamp, updateDoc } from '@/nutritrack/local-firestore';
import type { Child, Visit, HealthArea, Commodity, StockMovement, AggregatedStockByBatch, Sensitization, CHW, Diagnosis, CommodityProgram } from '@/nutritrack/types';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { format, addDays, differenceInDays, isBefore, startOfDay, isSameDay } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/nutritrack/components/ui/alert';
import { AlertTriangle, UserCheck, HeartPulse, Meh, Plus, X, CheckCircle2, Info, Syringe, ShieldCheck, Calendar as CalendarIcon, Send, MessageSquareQuote } from 'lucide-react';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { Checkbox } from '@/nutritrack/components/ui/checkbox';
import { Label } from '@/nutritrack/components/ui/label';
import { Progress } from '@/nutritrack/components/ui/progress';

const treatmentSchema = z.object({
  commodityId: z.string().min(1, 'Please select a commodity.'),
  batchNumber: z.string().min(1, 'Please select a batch number.'),
  quantity: z.coerce.number().positive('Quantity must be positive.'),
});

const sensitizationSchema = z.object({
    approach: z.enum(['FGD', 'Councelling']),
    chwId: z.string().min(1, 'Please select who conducted the session.'),
    mainTopic: z.string().min(1, "Please select a topic."),
    otherTopic: z.string().optional(),
    otherProvider: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.mainTopic === 'Other' && !data.otherTopic) {
        ctx.addIssue({ code: 'custom', message: 'Please specify the topic.', path: ['otherTopic']});
    }
    if (data.chwId === 'Other' && !data.otherProvider) {
        ctx.addIssue({ code: 'custom', message: 'Please specify who conducted the session.', path: ['otherProvider']});
    }
});

const createFollowUpFormSchema = (
    availableNutritionalBatches: Record<number, AggregatedStockByBatch[]>, 
    availableSystematicBatches: Record<number, AggregatedStockByBatch[]>,
    diagnosisStatus: Diagnosis | undefined,
    vaccinationAssessed: boolean | undefined,
    childAdmissionType: string | undefined
) => z.object({
  currentDate: z.date(),
  weight: z.coerce.number().positive(),
  muac: z.coerce.number().positive(),
  oedema: z.enum(['yes', 'no']),
  oedemaGrade: z.enum(['1', '2', '3']).optional(),
  
  appetiteTest: z.enum(['pass', 'fail']).optional(),
  diarrheaDehydration: z.enum(['yes', 'no']),
  severeVomiting: z.enum(['yes', 'no']),
  pneumonia: z.enum(['yes', 'no']),
  subcostalRetraction: z.enum(['yes', 'no']),
  openSkinLesions: z.enum(['yes', 'no']),
  hypothermia: z.enum(['yes', 'no']),
  fever: z.enum(['yes', 'no']),
  extremePallor: z.enum(['yes', 'no']),
  weakApatheticUnconscious: z.enum(['yes', 'no']),
  seizuresMeaslesEtc: z.enum(['yes', 'no']),
  clinicalVitaminADeficiency: z.enum(['yes', 'no']),
  ivDripOrNgtFeeding: z.enum(['yes', 'no']),

  homeVisitDone: z.boolean().default(false),
  homeVisitDate: z.date().optional(),
  homeVisitBy: z.string().optional(),
  homeVisitObservations: z.string().optional(),

  needsHomeVisit: z.enum(['yes', 'no']),
  homeVisitReason: z.string().optional(),
  homeVisitToBeDoneBy: z.string().optional(),
  plannedHomeVisitDate: z.date().optional(),

  nutritionalTreatments: z.array(treatmentSchema).optional(),
  systematicTreatments: z.array(treatmentSchema).optional(),

  action: z.enum(['next_visit', 'discharge']),
  nextVisitDate: z.date().optional(),
  providesSensitization: z.boolean().default(false),
  sensitization: sensitizationSchema.optional(),

  dischargeType: z.enum(['cured', 'defaulter', 'non_respondent', 'dead', 'transfer_out', 'referred_otp', 'end_ex_sam_followup', 'treated_with_success', 'non_respondent_medical_reference', 'transfer_tsfp', 'transfer_otp', 'transfer_itp']).optional(),
  dischargeDate: z.date().optional(),
  transferToFacilityId: z.string().optional(),
  transferToOther: z.string().optional(),
  
}).superRefine((data, ctx) => {
    if (data.oedema === 'yes' && !data.oedemaGrade) {
        ctx.addIssue({ code: 'custom', message: 'Please select oedema grade.', path: ['oedemaGrade']});
    }
    if(data.dischargeType !== 'defaulter' && data.dischargeType !== 'dead') {
        if (data.homeVisitDone) {
            if (!data.homeVisitDate) ctx.addIssue({ code: 'custom', message: 'Date is required.', path: ['homeVisitDate'] });
            if (!data.homeVisitBy) ctx.addIssue({ code: 'custom', message: 'Health worker name is required.', path: ['homeVisitBy'] });
            if (data.homeVisitDate && !isBefore(data.homeVisitDate, startOfDay(data.currentDate))) {
                 ctx.addIssue({ code: 'custom', message: 'Date must be before visit date.', path: ['homeVisitDate'] });
            }
        }
        if (data.needsHomeVisit === 'yes') {
            if (!data.homeVisitReason) ctx.addIssue({ code: 'custom', message: 'Reason is required.', path: ['homeVisitReason']});
            if (!data.homeVisitToBeDoneBy) ctx.addIssue({ code: 'custom', message: 'Please specify who will do the visit.', path: ['homeVisitToBeDoneBy']});
            if (!data.plannedHomeVisitDate) ctx.addIssue({ code: 'custom', message: 'Planned date is required.', path: ['plannedHomeVisitDate']});
        }
        if (data.action === 'next_visit' && !data.nextVisitDate) {
            ctx.addIssue({ code: 'custom', message: 'Next visit date is required.', path: ['nextVisitDate']});
        }
    }
    if (data.action === 'discharge') {
        if (!data.dischargeType) ctx.addIssue({ code: 'custom', message: 'Discharge reason is required.', path: ['dischargeType']});
        if (!data.dischargeDate) ctx.addIssue({ code: 'custom', message: 'Discharge date is required.', path: ['dischargeDate']});
        if (data.dischargeType === 'cured') {
            if (diagnosisStatus !== 'Not Malnourished') {
                ctx.addIssue({ code: 'custom', message: 'Only children who are not malnourished can be discharged as cured.', path: ['dischargeType']});
            }
            if (!vaccinationAssessed) {
                ctx.addIssue({ code: 'custom', message: 'Vaccination status must be assessed at least once before discharging as cured.', path: ['dischargeType']});
            }
        }
        const transferTypes = ['transfer_out', 'referred_otp', 'transfer_tsfp', 'transfer_otp', 'transfer_itp'];
        if (data.dischargeType && transferTypes.includes(data.dischargeType)) {
             if (!data.transferToFacilityId) {
                 ctx.addIssue({ code: 'custom', message: 'Please specify the destination facility.', path: ['transferToFacilityId']});
            }
            if(data.transferToFacilityId === 'other' && !data.transferToOther) {
                ctx.addIssue({ code: 'custom', message: 'Please specify the other facility.', path: ['transferToOther']});
            }
        }
    }

    if (data.providesSensitization) {
        if (!data.sensitization?.approach) {
            ctx.addIssue({ code: 'custom', message: 'Approach is required.', path: ['sensitization.approach']});
        }
        if (!data.sensitization?.chwId) {
            ctx.addIssue({ code: 'custom', message: 'Please specify who conducted the session.', path: ['sensitization.chwId']});
        }
        if (!data.sensitization?.mainTopic) {
            ctx.addIssue({ code: 'custom', message: 'Main topic is required.', path: ['sensitization.mainTopic']});
        }
    }

    if (data.nutritionalTreatments) {
        data.nutritionalTreatments.forEach((treatment, index) => {
            if (treatment.batchNumber && treatment.quantity > 0) {
                const batchesForTreatment = availableNutritionalBatches[index] || [];
                const selectedBatch = batchesForTreatment.find(b => b.batchNumber === treatment.batchNumber);
                if (selectedBatch && treatment.quantity > selectedBatch.closingStock) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Cannot use more than available: ${selectedBatch.closingStock}`, path: [`nutritionalTreatments.${index}.quantity`]});
                }
            }
        });
    }
     if (data.systematicTreatments) {
        data.systematicTreatments.forEach((treatment, index) => {
            if (treatment.batchNumber && treatment.quantity > 0) {
                const batchesForTreatment = availableSystematicBatches[index] || [];
                const selectedBatch = batchesForTreatment.find(b => b.batchNumber === treatment.batchNumber);
                if (selectedBatch && treatment.quantity > selectedBatch.closingStock) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Cannot use more than available: ${selectedBatch.closingStock}`, path: [`systematicTreatments.${index}.quantity`]});
                }
            }
        });
    }
});


const sensitizationTopics = [
    'Exclusive Breastfeeding', 'Breastfeeding Techniques', 'Milk Expression and Cup-Feeding', 
    'Breastfeeding on Demand', 'Introduction to Complementary Feeding', 'Food Variety',
    'Feeding Frequency', 'Sick Child Feeding', 'Growth Monitoring', 'Good Hygiene',
    'Environmental Cleanliness', 'Separation from Baby', 'HIV and Breastfeeding', 'Other'
];

type FollowUpFormValues = z.infer<ReturnType<typeof createFollowUpFormSchema>>;

export default function FollowUpPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const childId = params.id as string;
  
  const [child, setChild] = useState<Child | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [healthAreas, setHealthAreas] = useState<HealthArea[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [chws, setChws] = useState<CHW[]>([]);
  const [availableNutritionalBatches, setAvailableNutritionalBatches] = useState<Record<number, AggregatedStockByBatch[]>>({});
  const [availableSystematicBatches, setAvailableSystematicBatches] = useState<Record<number, AggregatedStockByBatch[]>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [hasComplications, setHasComplications] = useState(false);

  // Date picker popover states
  const [isCurrentDatePickerOpen, setIsCurrentDatePickerOpen] = useState(false);
  const [isHomeVisitDatePickerOpen, setIsHomeVisitDatePickerOpen] = useState(false);
  const [isNextVisitDatePickerOpen, setIsNextVisitDatePickerOpen] = useState(false);
  const [isDischargeDatePickerOpen, setIsDischargeDatePickerOpen] = useState(false);
  const [isPlannedHomeVisitDatePickerOpen, setIsPlannedHomeVisitDatePickerOpen] = useState(false);
  
  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(createFollowUpFormSchema(availableNutritionalBatches, availableSystematicBatches, diagnosis?.status, child?.vaccinationAssessmentDone, child?.admissionType)),
    defaultValues: {
        currentDate: new Date(),
        weight: '' as any,
        muac: '' as any,
        oedema: 'no',
        fever: 'no',
        diarrheaDehydration: 'no',
        severeVomiting: 'no',
        pneumonia: 'no',
        subcostalRetraction: 'no',
        openSkinLesions: 'no',
        hypothermia: 'no',
        extremePallor: 'no',
        weakApatheticUnconscious: 'no',
        seizuresMeaslesEtc: 'no',
        clinicalVitaminADeficiency: 'no',
        ivDripOrNgtFeeding: 'no',
        homeVisitDone: false,
        needsHomeVisit: 'no',
        nutritionalTreatments: [],
        systematicTreatments: [],
        action: 'next_visit',
        nextVisitDate: addDays(new Date(), 14),
        providesSensitization: false,
    },
  });

  const { control, watch, setValue, getValues, trigger, handleSubmit } = form;
  
  const weight = watch('weight');
  const muac = watch('muac');
  const oedema = watch('oedema');
  const currentDate = watch('currentDate');
  
  const watchedAction = watch('action');
  const watchedHomeVisitDone = watch('homeVisitDone');
  const watchedDischargeType = watch('dischargeType');
  const watchedDischargeDate = watch('dischargeDate');
  const watchedNeedsHomeVisit = watch('needsHomeVisit');
  const watchedOedema = watch('oedema');
  const watchedOedemaGrade = watch('oedemaGrade');
  const appetiteTest = watch('appetiteTest');
  const watchedProvidesSensitization = watch('providesSensitization');
  const watchedSensitizationDoneBy = watch('sensitization.chwId');
  const watchedSensitizationTopic = watch('sensitization.mainTopic');
  const watchedTransferToFacility = watch('transferToFacilityId');

  const comorbidityFields: (keyof FollowUpFormValues)[] = [
      'diarrheaDehydration', 'severeVomiting', 'pneumonia', 'subcostalRetraction',
      'openSkinLesions', 'hypothermia', 'fever', 'extremePallor',
      'weakApatheticUnconscious', 'seizuresMeaslesEtc',
      'clinicalVitaminADeficiency', 'ivDripOrNgtFeeding'
  ];
  const watchedComorbidities = watch(comorbidityFields);


  const { fields: nutritionalFields, append: appendNutritional, remove: removeNutritional } = useFieldArray({ control, name: "nutritionalTreatments" });
  const nutritionalTreatmentsWatch = useWatch({ control, name: 'nutritionalTreatments' });

  const { fields: systematicFields, append: appendSystematic, remove: removeSystematic } = useFieldArray({ control, name: "systematicTreatments" });
  const systematicTreatmentsWatch = useWatch({ control, name: 'systematicTreatments' });

  const latestVisit = useMemo(() => visits.length > 0 ? visits[visits.length - 1] : null, [visits]);
  
  const currentVisitNumber = useMemo(() => {
    if (!child || !currentDate) return -1;
    if (isSameDay(child.admissionDate.toDate(), currentDate)) {
        return 0;
    }
    if (visits.length === 0) {
      return 1;
    }
    const lastVisitDate = (latestVisit!.visitDate as Timestamp).toDate();
    if(isSameDay(lastVisitDate, currentDate)) {
        return latestVisit!.visitNumber;
    }
    return (latestVisit?.visitNumber ?? -1) + 1;
  }, [child, currentDate, latestVisit, visits]);

  const isVisitZero = useMemo(() => currentVisitNumber === 0, [currentVisitNumber]);
  
 const childProgram = useMemo((): CommodityProgram | null => {
      if (!child) return null;
      let initialDiagnosisStatus: Diagnosis | null = null;
      
      if (typeof child.diagnosis === 'object' && child.diagnosis && 'status' in child.diagnosis) {
          initialDiagnosisStatus = child.diagnosis.status as Diagnosis;
      } else {
          initialDiagnosisStatus = child.diagnosis as Diagnosis | null;
      }

      if (initialDiagnosisStatus?.includes('SAM')) return 'SAM';
      if (initialDiagnosisStatus === 'MAM') return 'MAM';

      const isSamPlus = 
          child.ivDripOrNgtFeeding === 'yes' ||
          child.appetiteTest === 'fail' || 
          child.oedemaGrade === '3' || 
          ['fever', 'diarrheaDehydration', 'severeVomiting', 'pneumonia', 'subcostalRetraction', 'openSkinLesions', 'hypothermia', 'extremePallor', 'weakApatheticUnconscious', 'seizuresMeaslesEtc', 'clinicalVitaminADeficiency'].some(field => (child as any)[field] === 'yes');

      if (initialDiagnosisStatus?.includes('SAM') && isSamPlus) {
          return 'SAM+';
      }

      return null;
  }, [child]);


  const nutritionalCommodities = useMemo(() => {
    if (!childProgram) return [];
    return commodities.filter(c => {
        if (c.type !== 'Nutritional') return false;
        if (c.program === 'Both') return true;
        return c.program === childProgram;
    });
  }, [commodities, childProgram]);

  const systematicCommodities = useMemo(() => {
     if (!childProgram) return [];
     return commodities.filter(c => {
        if (c.type !== 'Systematic Treatment') return false;
        if (c.program === 'Both') return true;
        return c.program === childProgram;
    });
  }, [commodities, childProgram]);

  const allChwsInFacility = useMemo(() => chws.filter(c => c.healthAreaId === child?.healthAreaId), [chws, child]);

  const otpItpFacilities = useMemo(() => {
    return healthAreas.filter(ha => ha.programs?.includes('OTP') || ha.programs?.includes('ITP'));
  }, [healthAreas]);

  const tsfpFacilities = useMemo(() => {
    return healthAreas.filter(ha => ha.programs?.includes('TSFP'));
  }, [healthAreas]);


  useEffect(() => {
    if (isVisitZero && child && visits.length > 0) {
        const visitZeroData = visits[0];
        setValue('weight', visitZeroData.weight);
        setValue('muac', visitZeroData.muac);
        setValue('oedema', visitZeroData.oedema);
        if (visitZeroData.oedemaGrade) {
            setValue('oedemaGrade', visitZeroData.oedemaGrade);
        }
    }
  }, [isVisitZero, child, visits, setValue]);

  
  useEffect(() => {
    if (watchedOedema === 'no') {
      setValue('oedemaGrade', undefined);
    }
  }, [watchedOedema, setValue]);
  
  const fetchAvailableBatches = useCallback(async (
    healthAreaId: string,
    commodityId: string,
  ): Promise<AggregatedStockByBatch[]> => {
    if (!healthAreaId || !commodityId) return [];

    try {
        const movementsQuery = query(
            collection(db, 'stockMovements'), 
            where('healthAreaId', '==', healthAreaId),
            where('commodityId', '==', commodityId)
        );
        const querySnapshot = await getDocs(movementsQuery);
        const movements = querySnapshot.docs.map(doc => doc.data() as StockMovement);

        const stockByBatch: Record<string, number> = {};
        movements.forEach(m => {
            const batch = m.batchNumber || 'No Batch';
            if (!stockByBatch[batch]) stockByBatch[batch] = 0;
            if (m.type === 'received') stockByBatch[batch] += m.quantity;
            else stockByBatch[batch] -= m.quantity;
        });

        return Object.entries(stockByBatch)
            .filter(([, balance]) => balance > 0)
            .map(([batchNumber, closingStock]) => ({
                commodityId,
                batchNumber,
                closingStock,
                commodityName: '', unit: 'unit', openingStock: 0, received: 0, used: 0, transferred: 0, damaged: 0,
            }));

    } catch (error) {
        console.error("Error fetching batches:", error);
        toast({ title: "Error", description: "Could not fetch available batches.", variant: "destructive" });
        return [];
    }
  }, [toast]);

 useEffect(() => {
    if (child && nutritionalTreatmentsWatch) {
      nutritionalTreatmentsWatch.forEach(async (treatment, index) => {
        if (treatment?.commodityId) {
          const batches = await fetchAvailableBatches(child.healthAreaId, treatment.commodityId);
          setAvailableNutritionalBatches(prev => ({ ...prev, [index]: batches }));
        }
      });
    }
  }, [JSON.stringify(nutritionalTreatmentsWatch), child, fetchAvailableBatches]);

  useEffect(() => {
    if (child && systematicTreatmentsWatch) {
      systematicTreatmentsWatch.forEach(async (treatment, index) => {
        if (treatment?.commodityId) {
          const batches = await fetchAvailableBatches(child.healthAreaId, treatment.commodityId);
          setAvailableSystematicBatches(prev => ({ ...prev, [index]: batches }));
        }
      });
    }
  }, [JSON.stringify(systematicTreatmentsWatch), child, fetchAvailableBatches]);

  useEffect(() => {
    if (!childId) return;

    const fetchChildData = async () => {
        setLoading(true);
        try {
            const childDoc = await getDoc(doc(db, 'children', childId));
            if (childDoc.exists()) {
                const childData = { id: childDoc.id, ...childDoc.data() } as Child;
                setChild(childData);
                
                const visitsQuery = query(collection(db, 'children', childId, 'visits'), orderBy('visitDate'));
                const visitsSnapshot = await getDocs(visitsQuery);
                const fetchedVisits = visitsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Visit[];
                setVisits(fetchedVisits);
                
                const [healthAreasSnapshot, commoditiesSnapshot, chwsSnapshot] = await Promise.all([
                    getDocs(collection(db, 'healthAreas')),
                    getDocs(collection(db, 'commodities')),
                    getDocs(collection(db, 'chws')),
                ]);
                setHealthAreas(healthAreasSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as HealthArea[]);
                setCommodities(commoditiesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Commodity[]);
                setChws(chwsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as CHW[]);

            } else {
                toast({ title: 'Error', description: 'Child not found.', variant: 'destructive' });
                router.push('/nutritrack/children');
            }
        } catch (error) {
            console.error("Error fetching child data: ", error);
            toast({ title: 'Error', description: 'Failed to fetch child data.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }
    fetchChildData();
  }, [childId, toast, router]);

  const { weightGain, muacGain } = useMemo(() => {
    if (!latestVisit || !weight || !muac) return { weightGain: 0, muacGain: 0 };
    
    const weightGainValue = Number(weight) - latestVisit.weight; // kg
    const muacGainValue = Number(muac) - latestVisit.muac; // mm
    
    return { weightGain: weightGainValue, muacGain: muacGainValue };
  }, [weight, muac, latestVisit]);


 useEffect(() => {
    if (!child) return;

    // For visit 0, we use the initial diagnosis from the child record
    if (isVisitZero) {
        if (typeof child.diagnosis === 'object' && child.diagnosis && 'status' in child.diagnosis && 'reason' in child.diagnosis) {
             setDiagnosis(child.diagnosis as DiagnosisResult);
        } else {
            const status = (child.diagnosis as string) || 'Not Assessed';
            setDiagnosis({ status: status as any, reason: 'Admission' });
        }
        return;
    }

    const formValues = getValues();
    const hasComorbidity = comorbidityFields.some(field => formValues[field] === 'yes');

    const numericWeight = Number(weight);
    const numericMuac = Number(muac);

    if (numericWeight > 0 && numericMuac > 0) {
        const whz = calculateWHZ(numericWeight, child.height, child.sex);
        const nutritionStatus = diagnoseMalnutrition(numericMuac, whz, oedema as 'yes' | 'no');
        setDiagnosis(nutritionStatus);
        
        const complications = nutritionStatus.status === 'SAM' && (hasComorbidity || watchedOedemaGrade === '3' || appetiteTest === 'fail');
        setHasComplications(complications);
        
    } else {
        setDiagnosis(null);
        setHasComplications(hasComorbidity || watchedOedemaGrade === '3' || appetiteTest === 'fail');
    }
 }, [weight, muac, oedema, child, isVisitZero, watchedOedemaGrade, appetiteTest, ...watchedComorbidities]);


  const dischargeNotification = useMemo(() => {
    if (!child) return null;
    
    const admissionDate = child.admissionDate.toDate();
    if (differenceInDays(new Date(), admissionDate) > 90 && child.status === 'active' && diagnosis?.status !== 'Not Malnourished') {
        return { type: 'non_respondent', icon: Meh, message: 'Child has been in the program for over 3 months and is still malnourished. Consider discharging as a Non-Respondent.' };
    }

    const lastTwoVisits = visits.slice(-2);
    if (lastTwoVisits.length >= 2) {
        const lastVisitDiagnosis = typeof lastTwoVisits[1].diagnosis === 'string'
          ? lastTwoVisits[1].diagnosis
          : lastTwoVisits[1].diagnosis?.status;
        const secondLastVisitDiagnosis = typeof lastTwoVisits[0].diagnosis === 'string'
          ? lastTwoVisits[0].diagnosis
          : lastTwoVisits[0].diagnosis?.status;
        
        if (lastVisitDiagnosis === 'Not Malnourished' && secondLastVisitDiagnosis === 'Not Malnourished') {
             return { type: 'cured', icon: UserCheck, message: 'Child has been classified as Not Malnourished for the last two consecutive visits. Consider discharging as Cured.' };
        }
    }
    
    if (latestVisit?.nextVisitDate && differenceInDays(new Date(), latestVisit.nextVisitDate.toDate()) >= 30) {
       return { type: 'defaulter', icon: AlertTriangle, message: 'Child has missed two consecutive follow-up visits (30 days). Consider discharging as a Defaulter.' };
    }
    
    if (diagnosis?.status === 'SAM' && latestVisit?.diagnosis && (typeof latestVisit.diagnosis === 'string' ? latestVisit.diagnosis : latestVisit.diagnosis.status) === 'MAM') {
       return { type: 'referred_otp', icon: AlertTriangle, message: 'Child\'s status has worsened from MAM to SAM. Refer to an OTP/ITP program immediately.' };
    }

    return null;
  }, [child, visits, diagnosis, latestVisit]);

  const curedPerformanceStats = useMemo(() => {
      if (!child || !watchedDischargeDate || watchedDischargeType !== 'cured' || !weight) {
          return { lengthOfStay: null, weightGain: null };
      }

      const allWeights = [
          { weight: child.weight, date: child.admissionDate.toDate() },
          ...visits.map(v => ({ weight: v.weight, date: v.visitDate.toDate() }))
      ];

      const { minWeight, minWeightDate } = allWeights.reduce(
          (min, current) => (current.weight < min.minWeight ? { minWeight: current.weight, minWeightDate: current.date } : min),
          { minWeight: Infinity, minWeightDate: new Date() }
      );
      
      const lengthOfStay = differenceInDays(watchedDischargeDate, child.admissionDate.toDate());
      
      let weightGain = null;
      const daysForGain = differenceInDays(watchedDischargeDate, minWeightDate);
      if (minWeight > 0 && Number(weight) > minWeight && daysForGain > 0) {
          const weightGainGrams = (Number(weight) - minWeight) * 1000;
          weightGain = weightGainGrams / minWeight / daysForGain;
      }
      
      return { lengthOfStay, weightGain };

  }, [child, visits, watchedDischargeDate, watchedDischargeType, weight]);
  
  async function onSubmit(data: FollowUpFormValues) {
    setIsSubmitting(true);
    
    if (data.action === 'discharge') {
        toast({ title: 'Success', description: `${child!.firstName} ${child!.lastName} has been discharged.` });
    } else {
        toast({ title: 'Success', description: `Visit data for ${child!.firstName} ${child!.lastName} has been saved.` });
    }
    router.push(`/nutritrack/children/${childId}`);

    try {
        if (!child || !childId || !diagnosis) {
             toast({ title: 'Error', description: 'Child data not loaded or diagnosis not calculated.', variant: 'destructive' });
             setIsSubmitting(false);
             return;
        }

        const isValid = await trigger();
        if (!isValid) {
            toast({ title: 'Validation Error', description: 'Please check the form for errors before saving.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        
        const batch = writeBatch(db);
        const childRef = doc(db, 'children', childId);
        
        const allTreatments = [...(data.nutritionalTreatments || []), ...(data.systematicTreatments || [])];
        if(allTreatments.length > 0) {
          allTreatments.forEach(treatment => {
              const movementRef = doc(collection(db, 'stockMovements'));
              const stockMovement: Omit<StockMovement, 'id' | 'date'> = {
                  commodityId: treatment.commodityId,
                  healthAreaId: child.healthAreaId,
                  batchNumber: treatment.batchNumber,
                  type: 'used',
                  quantity: treatment.quantity,
                  notes: `Follow-up treatment for ${child.firstName} ${child.lastName}`,
              };
               batch.set(movementRef, {...stockMovement, date: Timestamp.fromDate(new Date())});
          });
        }

        if (data.dischargeType === 'defaulter' || data.dischargeType === 'dead') {
           batch.update(childRef, {
                status: 'discharged',
                discharge: {
                  type: data.dischargeType,
                  date: Timestamp.fromDate(data.dischargeDate!),
                  transferToFacilityId: null,
                  transferToOther: null
                }
            });
        } else {
            const sensitizationData: Sensitization = data.providesSensitization && data.sensitization ? { ...data.sensitization, chwId: data.sensitization.chwId || null, otherProvider: data.sensitization.otherProvider || '', otherTopic: data.sensitization.otherTopic || '' } : null;

            const visitData: Partial<Visit> = {
                visitDate: Timestamp.fromDate(data.currentDate),
                visitNumber: currentVisitNumber,
                weight: data.weight,
                height: child.height, 
                muac: data.muac,
                oedema: data.oedema,
                oedemaGrade: data.oedemaGrade || null,
                appetiteTest: data.appetiteTest || null,
                fever: data.fever,
                diarrheaDehydration: data.diarrheaDehydration,
                severeVomiting: data.severeVomiting,
                pneumonia: data.pneumonia,
                subcostalRetraction: data.subcostalRetraction,
                openSkinLesions: data.openSkinLesions,
                hypothermia: data.hypothermia,
                extremePallor: data.extremePallor,
                weakApatheticUnconscious: data.weakApatheticUnconscious,
                seizuresMeaslesEtc: data.seizuresMeaslesEtc,
                clinicalVitaminADeficiency: data.clinicalVitaminADeficiency,
                ivDripOrNgtFeeding: data.ivDripOrNgtFeeding,
                nutritionalTreatments: data.nutritionalTreatments ?? [], 
                systematicTreatments: data.systematicTreatments ?? [],
                nextVisitDate: data.action === 'next_visit' && data.nextVisitDate ? Timestamp.fromDate(data.nextVisitDate) : null,
                homeVisit: data.homeVisitDone ? {
                    date: Timestamp.fromDate(data.homeVisitDate!),
                    chwId: data.homeVisitBy!,
                    observations: data.homeVisitObservations || ''
                } : null,
                sensitization: sensitizationData,
                diagnosis: diagnosis,
                whz: calculateWHZ(data.weight, child.height, child.sex),
            };

            if (isVisitZero) {
                const visitZeroRef = doc(db, 'children', childId, 'visits', visits[0].id);
                batch.update(visitZeroRef, visitData);
            } else {
                const newVisitRef = doc(collection(db, 'children', childId, 'visits'));
                batch.set(newVisitRef, visitData);
            }
          
            if (data.action === 'discharge' && data.dischargeType && data.dischargeDate) {
              batch.update(childRef, {
                  status: 'discharged',
                  discharge: {
                    type: data.dischargeType,
                    date: Timestamp.fromDate(data.dischargeDate),
                    transferToFacilityId: data.transferToFacilityId || null,
                    transferToOther: data.transferToOther || null
                  }
              });
            } else {
              batch.update(childRef, {
                  nextVisitDate: visitData.nextVisitDate,
                  needsHomeVisit: data.needsHomeVisit,
                  homeVisitDate: data.plannedHomeVisitDate ? Timestamp.fromDate(data.plannedHomeVisitDate) : null,
                  homeVisitPlan: data.needsHomeVisit === 'yes' ? {
                    reason: data.homeVisitReason || null,
                    chwId: data.homeVisitToBeDoneBy || null
                  } : null
              });
            }
        }

        await batch.commit();

    } catch (error) {
      console.error("Error submitting follow-up:", error);
      toast({ title: 'Error', description: 'An error occurred while saving the follow-up data.', variant: 'destructive'});
      setIsSubmitting(false);
    }
  }
  
 const comorbidities = useMemo(() => {
    const comorbidityFields: { field: keyof FollowUpFormValues, label: string }[] = [
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
    ];

    let activeComorbidities = comorbidityFields
        .filter(c => form.getValues(c.field) === 'yes');
        
    if (appetiteTest === 'fail') {
        activeComorbidities.push({ field: 'appetiteTest' as any, label: 'Failed Appetite Test'});
    }
    if (watchedOedemaGrade === '3') {
        activeComorbidities.push({ field: 'oedemaGrade' as any, label: 'Oedema Grade 3'});
    }

    return activeComorbidities;
  }, [watchedComorbidities, form, appetiteTest, watchedOedemaGrade]);


  if (loading || !child) return <div className="p-6">Loading child details...</div>;

  const isFormDisabled = watchedAction === 'discharge' && (watchedDischargeType === 'defaulter' || watchedDischargeType === 'dead');

  const disableCuredDischarge = diagnosis?.status !== 'Not Malnourished';
  
  const getInitialDiagnosisText = () => {
    if (typeof child.diagnosis === 'object' && child.diagnosis) {
        const { status, reason } = child.diagnosis;
        if (reason && reason !== 'Normal' && reason !== status) {
            return `${status} (${reason})`;
        }
        return status;
    }
    return (child.diagnosis as string) || 'Not Assessed';
  };
  const initialDiagnosisText = getInitialDiagnosisText();
  const initialDiagnosis = child.diagnosis && typeof child.diagnosis === 'object'
    ? child.diagnosis.status
    : child.diagnosis;

  const isTransferSelected = ['transfer_out', 'referred_otp', 'transfer_tsfp', 'transfer_otp', 'transfer_itp'].includes(watchedDischargeType || '');
  const transferFacilities = 
      watchedDischargeType === 'transfer_tsfp' ? tsfpFacilities :
      (watchedDischargeType === 'transfer_otp' || watchedDischargeType === 'transfer_itp' || watchedDischargeType === 'referred_otp') ? otpItpFacilities :
      healthAreas;
      

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto">
            <div className='flex justify-between items-center'>
                 <h1 className="text-2xl font-bold">Follow-up: {child.firstName} {child.lastName}</h1>
                 <Button type="button" variant="outline" onClick={() => router.push(`/nutritrack/children/${childId}`)}>Back to Details</Button>
            </div>
          
            {dischargeNotification && (
                <Alert variant={dischargeNotification.type === 'cured' ? 'default' : 'destructive'}>
                    <dischargeNotification.icon className="h-4 w-4" />
                    <AlertTitle>
                        {dischargeNotification.type === 'cured' ? 'Recommendation' : 'Alert!'}
                    </AlertTitle>
                    <AlertDescription>{dischargeNotification.message}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left & Center Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Visit (Visit #{currentVisitNumber})</CardTitle>
                             <CardDescription>
                                Planned for: {latestVisit?.nextVisitDate ? format((latestVisit.nextVisitDate as Timestamp).toDate(), 'PPP') : 'N/A'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <FormField
                                control={control}
                                name="currentDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Actual Visit Date</FormLabel>
                                        <Popover open={isCurrentDatePickerOpen} onOpenChange={setIsCurrentDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Pick a date"
                                                        value={field.value ? format(field.value, 'PPP') : ''}
                                                        onChange={(e) => {
                                                            const date = new Date(e.target.value);
                                                            if (!isNaN(date.getTime())) {
                                                                field.onChange(date);
                                                            }
                                                        }}
                                                        className={cn(!field.value && "text-muted-foreground")}
                                                        disabled={isFormDisabled}
                                                    />
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsCurrentDatePickerOpen(false);}} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={control} name="weight" render={({ field }) => (<FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={control} name="muac" render={({ field }) => (<FormItem><FormLabel>MUAC (mm)</FormLabel><FormControl><Input type="number" {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={control} name="oedema" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bilateral Oedema</FormLabel>
                                <FormControl>
                                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl><RadioGroupItem value="no" disabled={isFormDisabled} /></FormControl>
                                          <FormLabel className="font-normal">No</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl><RadioGroupItem value="yes" disabled={isFormDisabled} /></FormControl>
                                          <FormLabel className="font-normal">Yes</FormLabel>
                                      </FormItem>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}/>
                             {watchedOedema === 'yes' && (
                                <FormField control={control} name="oedemaGrade" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Oedema Grade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isFormDisabled}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="1">Grade 1</SelectItem>
                                                <SelectItem value="2">Grade 2</SelectItem>
                                                <SelectItem value="3">Grade 3</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                        </CardContent>
                    </Card>

                    {!isVisitZero && (
                        <>
                            <Card>
                                <CardHeader><CardTitle>Clinical Assessment</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="appetiteTest" render={({ field }) => (
                                        <FormItem className="space-y-3"><FormLabel>Appetite Test</FormLabel>
                                        <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="pass" /></FormControl><FormLabel className="font-normal">Pass</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="fail" /></FormControl><FormLabel className="font-normal">Fail</FormLabel></FormItem></RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
                                        <FormField control={form.control} name="severeVomiting" render={({ field }) => (<FormItem><FormLabel>Severe Vomiting</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="subcostalRetraction" render={({ field }) => (<FormItem><FormLabel>Subcostal Retraction</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="openSkinLesions" render={({ field }) => (<FormItem><FormLabel>Open Skin Lesions</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="hypothermia" render={({ field }) => (<FormItem><FormLabel>Hypothermia</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="fever" render={({ field }) => (<FormItem><FormLabel>Fever</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="extremePallor" render={({ field }) => (<FormItem><FormLabel>Extreme Pallor</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="weakApatheticUnconscious" render={({ field }) => (<FormItem><FormLabel>Weak/Apathetic</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="seizuresMeaslesEtc" render={({ field }) => (<FormItem><FormLabel>Seizures/Measles</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="clinicalVitaminADeficiency" render={({ field }) => (<FormItem><FormLabel>Vit. A Deficiency</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="ivDripOrNgtFeeding" render={({ field }) => (<FormItem><FormLabel>Needs IV/NGT</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="diarrheaDehydration" render={({ field }) => (<FormItem><FormLabel>Diarrhea/Dehydration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="pneumonia" render={({ field }) => (<FormItem><FormLabel>Pneumonia</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Past Home Visit</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name="homeVisitDone" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isFormDisabled} /></FormControl>
                                            <div className="space-y-1 leading-none"><FormLabel>Home visit done since last follow-up?</FormLabel></div>
                                        </FormItem>
                                    )}/>
                                    {watchedHomeVisitDone && (
                                        <div className='space-y-4 pt-4'>
                                            <FormField control={control} name="homeVisitDate" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Home Visit Date</FormLabel>
                                                <Popover open={isHomeVisitDatePickerOpen} onOpenChange={setIsHomeVisitDatePickerOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Pick a date"
                                                                value={field.value ? format(field.value, 'PPP') : ''}
                                                                onChange={(e) => {
                                                                    const date = new Date(e.target.value);
                                                                    if (!isNaN(date.getTime())) {
                                                                        field.onChange(date);
                                                                    }
                                                                }}
                                                                className={cn(!field.value && "text-muted-foreground")}
                                                                disabled={isFormDisabled}
                                                            />
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsHomeVisitDatePickerOpen(false);}} />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                            )} />
                                            <FormField control={form.control} name="homeVisitBy" render={({ field }) => (<FormItem><FormLabel>Done By</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Select CHW" /></SelectTrigger></FormControl><SelectContent>{allChwsInFacility.map(c => (<SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                            <FormField control={control} name="homeVisitObservations" render={({ field }) => (<FormItem><FormLabel>Main Observations</FormLabel><FormControl><Textarea placeholder="Describe observations..." {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                     <Card>
                         <CardHeader>
                            <CardTitle>Nutritional Treatments Given</CardTitle>
                            <CardDescription>Record any nutritional commodities given during this visit. Only treatments for {childProgram} will be shown.</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             {nutritionalFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-2 border rounded-md relative">
                                    <FormField control={control} name={`nutritionalTreatments.${index}.commodityId`} render={({ field }) => (
                                        <FormItem className="col-span-2"><FormLabel>Commodity</FormLabel>
                                            <Select onValueChange={(v) => { field.onChange(v); setValue(`nutritionalTreatments.${index}.batchNumber`, ''); }} defaultValue={field.value} disabled={isFormDisabled}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select commodity" /></SelectTrigger></FormControl>
                                            <SelectContent>{nutritionalCommodities.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} ({c.unit})</SelectItem>))}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={control} name={`nutritionalTreatments.${index}.batchNumber`} render={({ field }) => (
                                        <FormItem><FormLabel>Batch</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!nutritionalTreatmentsWatch?.[index]?.commodityId || isFormDisabled}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger></FormControl>
                                                <SelectContent>{availableNutritionalBatches[index]?.map(b => (<SelectItem key={b.batchNumber} value={b.batchNumber}>{b.batchNumber} (Av: {b.closingStock})</SelectItem>))}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={control} name={`nutritionalTreatments.${index}.quantity`} render={({ field }) => (
                                        <FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeNutritional(index)}><X className="h-4 w-4" /></Button>
                                </div>
                             ))}
                             <Button type="button" variant="outline" size="sm" onClick={() => appendNutritional({ commodityId: '', batchNumber: '', quantity: 0 })} disabled={isFormDisabled}><Plus className="mr-2 h-4 w-4" />Add Commodity</Button>
                         </CardContent>
                    </Card>
                     <Card>
                         <CardHeader>
                            <CardTitle>Systematic Treatments Given</CardTitle>
                            <CardDescription>Record any systematic treatments given during this visit. Only treatments for {childProgram} will be shown.</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             {systematicFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-2 border rounded-md relative">
                                    <FormField control={control} name={`systematicTreatments.${index}.commodityId`} render={({ field }) => (
                                        <FormItem className="col-span-2"><FormLabel>Treatment</FormLabel>
                                            <Select onValueChange={(v) => { field.onChange(v); setValue(`systematicTreatments.${index}.batchNumber`, ''); }} defaultValue={field.value} disabled={isFormDisabled}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select treatment" /></SelectTrigger></FormControl>
                                            <SelectContent>{systematicCommodities.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} ({c.unit})</SelectItem>))}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={control} name={`systematicTreatments.${index}.batchNumber`} render={({ field }) => (
                                        <FormItem><FormLabel>Batch</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!systematicTreatmentsWatch?.[index]?.commodityId || isFormDisabled}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger></FormControl>
                                                <SelectContent>{availableSystematicBatches[index]?.map(b => (<SelectItem key={b.batchNumber} value={b.batchNumber}>{b.batchNumber} (Av: {b.closingStock})</SelectItem>))}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={control} name={`systematicTreatments.${index}.quantity`} render={({ field }) => (
                                        <FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeSystematic(index)}><X className="h-4 w-4" /></Button>
                                </div>
                             ))}
                             <Button type="button" variant="outline" size="sm" onClick={() => appendSystematic({ commodityId: '', batchNumber: '', quantity: 0 })} disabled={isFormDisabled}><Plus className="mr-2 h-4 w-4" />Add Treatment</Button>
                         </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Sensitization / Counselling</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <FormField control={form.control} name="providesSensitization" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isFormDisabled} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Was a sensitization message provided during this visit?</FormLabel></div></FormItem>)} />
                           {watchedProvidesSensitization && (
                                <div className="space-y-4 pt-4 mt-4 border-t">
                                     <FormField control={form.control} name="sensitization.approach" render={({ field }) => (
                                        <FormItem className="space-y-3"><FormLabel>Approach</FormLabel>
                                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="FGD" /></FormControl><FormLabel className="font-normal">FGD</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Councelling" /></FormControl><FormLabel className="font-normal">Counselling</FormLabel></FormItem></RadioGroup></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="sensitization.chwId" render={({ field }) => (<FormItem><FormLabel>Done By</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger></FormControl><SelectContent>{allChwsInFacility.map(c => (<SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>))} <SelectItem value="Other">Other (specify)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                     {watchedSensitizationDoneBy === 'Other' && (
                                        <FormField control={form.control} name="sensitization.otherProvider" render={({ field }) => (<FormItem><FormLabel>Specify Other Provider</FormLabel><FormControl><Input placeholder="e.g., Nurse" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     )}
                                    <FormField control={form.control} name="sensitization.mainTopic" render={({ field }) => (<FormItem><FormLabel>Main Topic Discussed</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger></FormControl><SelectContent>{sensitizationTopics.map(topic => (<SelectItem key={topic} value={topic}>{topic}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                    {watchedSensitizationTopic === 'Other' && (
                                        <FormField control={form.control} name="sensitization.otherTopic" render={({ field }) => (<FormItem><FormLabel>Specify Other Topic</FormLabel><FormControl><Input placeholder="e.g., Handwashing" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    )}
                                </div>
                           )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6 lg:sticky top-20">
                     <Card>
                        <CardHeader>
                            <CardTitle>Visit Summary</CardTitle>
                            <CardDescription>Real-time status based on this visit's data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="space-y-2 text-sm">
                               <h4 className="font-semibold text-base mb-2">Progress</h4>
                               <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Weight Gain:</span>
                                    {isVisitZero ? (
                                        <span className="font-bold">N/A</span>
                                    ) : (
                                        <span className={`font-bold ${weightGain > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {weightGain.toFixed(1)} kg
                                        </span>
                                    )}
                               </div>
                               <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">MUAC Gain:</span>
                                     {isVisitZero ? (
                                        <span className="font-bold">N/A</span>
                                    ) : (
                                        <span className={`font-bold ${muacGain > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {muacGain.toFixed(1)} mm
                                        </span>
                                    )}
                               </div>
                           </div>
                           <Separator/>
                            <div className="text-sm space-y-2">
                                <h4 className="font-semibold text-base mb-2">Nutritional Status</h4>
                                 <div className="text-center">
                                    {isVisitZero ? (
                                        <Badge variant={initialDiagnosis?.includes('SAM') ? 'destructive' : initialDiagnosis?.includes('MAM') ? 'accent' : 'default'} className="w-full justify-center">
                                            {initialDiagnosisText}
                                        </Badge>
                                    ) : hasComplications ? (
                                        <Badge variant='destructive' className="text-lg w-full justify-center">SAM with Medical Complications</Badge>
                                    ) : (
                                        <>
                                            <Badge variant={diagnosis?.status === 'SAM' ? 'destructive' : diagnosis?.status === 'MAM' ? 'accent' : 'default'} className="w-full justify-center">
                                                {diagnosis ? diagnosis.status : 'Not Assessed'}
                                            </Badge>
                                            {diagnosis && <p className="text-center text-sm text-muted-foreground">Reason: {diagnosis.reason}</p>}
                                        </>
                                    )}
                                </div>
                           </div>
                           {!isVisitZero && (
                            <>
                            <Separator/>
                                <div className="text-sm space-y-2">
                                    <h4 className="font-semibold text-base mb-2">Clinical Status</h4>
                                    <div className='flex items-center justify-between'>
                                        <p className='flex items-center gap-2'><Syringe className='w-4 h-4 text-muted-foreground' />Appetite Test:</p>
                                        <Badge variant={appetiteTest === 'fail' ? 'destructive' : 'default'} className="capitalize">{appetiteTest || 'N/A'}</Badge>
                                    </div>
                                    <div className='flex items-start justify-between'>
                                        <p className='flex items-center gap-2 pt-1'><HeartPulse className='w-4 h-4 text-muted-foreground' />Danger Signs:</p>
                                        <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                                        {comorbidities.length > 0 ? comorbidities.map(c => <Badge key={c.field} variant='destructive'>{c.label}</Badge>) : <Badge>None</Badge>}
                                        </div>
                                    </div>
                                </div>
                            </>
                           )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Action & Planning</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={control} name="action" render={({ field }) => (
                      <FormItem>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                              <FormItem>
                                  <RadioGroupItem value="next_visit" id="next_visit" className='peer sr-only' />
                                  <Label htmlFor='next_visit' className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary")}>Plan Next Visit</Label>
                              </FormItem>
                              <FormItem>
                                  <RadioGroupItem value="discharge" id="discharge" className='peer sr-only' />
                                  <Label htmlFor='discharge' className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary")}>Discharge Child</Label>
                              </FormItem>
                          </RadioGroup>
                      </FormItem>
                    )}/>
                    
                    {watchedAction === 'next_visit' && (
                        <div className="pt-6 border-t">
                            <FormField control={control} name="nextVisitDate" render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Next Follow-up Date</FormLabel>
                                <Popover open={isNextVisitDatePickerOpen} onOpenChange={setIsNextVisitDatePickerOpen}>
                                  <PopoverTrigger asChild>
                                      <FormControl>
                                          <Input
                                              placeholder="Pick a date"
                                              value={field.value ? format(field.value, 'PPP') : ''}
                                              onChange={(e) => {
                                                const date = new Date(e.target.value);
                                                if (!isNaN(date.getTime())) {
                                                    field.onChange(date);
                                                }
                                              }}
                                              className={cn(!field.value && "text-muted-foreground")}
                                              disabled={isFormDisabled}
                                          />
                                      </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsNextVisitDatePickerOpen(false);}} initialFocus />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )} />
                        </div>
                    )}

                    {watchedAction === 'discharge' && (
                        <div className="space-y-4 pt-6 border-t">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={control} name="dischargeDate" render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel>Discharge Date</FormLabel>
                                    <Popover open={isDischargeDatePickerOpen} onOpenChange={setIsDischargeDatePickerOpen}>
                                      <PopoverTrigger asChild>
                                          <FormControl>
                                            <Input
                                                placeholder="Pick a date"
                                                value={field.value ? format(field.value, 'PPP') : ''}
                                                onChange={(e) => {
                                                    const date = new Date(e.target.value);
                                                    if (!isNaN(date.getTime())) {
                                                        field.onChange(date);
                                                    }
                                                }}
                                                className={cn(!field.value && "text-muted-foreground")}
                                            />
                                          </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsDischargeDatePickerOpen(false);}} />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={control} name="dischargeType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Discharge</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {initialDiagnosis === 'MAM' ? (
                                            <>
                                                <SelectItem value="cured" disabled={disableCuredDischarge}>Cured</SelectItem>
                                                <SelectItem value="defaulter">Defaulter</SelectItem>
                                                <SelectItem value="dead">Deceased</SelectItem>
                                                <SelectItem value="non_respondent">Non-Respondent</SelectItem>
                                                <SelectItem value="referred_otp">Transfer to OTP/ITP</SelectItem>
                                                <SelectItem value="transfer_tsfp">Transfer to another TSFP</SelectItem>
                                                {child.admissionType === 'ex-sam' && (
                                                    <SelectItem value="end_ex_sam_followup">End of Ex-SAM Follow-up</SelectItem>
                                                )}
                                            </>
                                        ) : ( // SAM or SAM+
                                            <>
                                                <SelectItem value="treated_with_success">Treated with Success</SelectItem>
                                                <SelectItem value="cured" disabled={disableCuredDischarge}>Cured</SelectItem>
                                                <SelectItem value="defaulter">Defaulter</SelectItem>
                                                <SelectItem value="dead">Deceased</SelectItem>
                                                <SelectItem value="non_respondent_medical_reference">Non-Respondent/Medical Reference</SelectItem>
                                                <SelectItem value="transfer_itp">Transfer to ITP</SelectItem>
                                                <SelectItem value="transfer_otp">Transfer to another OTP</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                    </Select>
                                    {disableCuredDischarge && watchedDischargeType === 'cured' && (
                                        <FormDescription className="text-destructive">
                                            Child must be "Not Malnourished" to be discharged as cured.
                                        </FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>)} />
                             </div>
                            {isTransferSelected && (
                                <>
                                 <FormField control={control} name="transferToFacilityId" render={({ field }) => (
                                     <FormItem>
                                        <FormLabel>Transfer To Facility</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a destination facility" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {transferFacilities.map(ha => (<SelectItem key={ha.id} value={ha.id}>{ha.healthFacilityName}</SelectItem>))}
                                                <SelectItem value="other">Other (specify)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                     </FormItem>
                                 )} />
                                 {watchedTransferToFacility === 'other' && (
                                     <FormField control={control} name="transferToOther" render={({ field }) => (<FormItem><FormLabel>Specify Other Facility</FormLabel><FormControl><Input placeholder="e.g., Central Hospital ITP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 )}
                                </>
                            )}
                             {watchedDischargeType === 'cured' && (
                                <Card className="bg-green-50 border-green-200 mt-4">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base text-green-800">Cured Performance Indicators</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1 text-green-700">
                                        <div className="flex justify-between">
                                            <span>Length of Stay:</span>
                                            <span className="font-bold">{curedPerformanceStats.lengthOfStay ?? 'N/A'} days</span>
                                        </div>
                                         <div className="flex justify-between">
                                            <span>Avg. Weight Gain:</span>
                                            <span className="font-bold">{curedPerformanceStats.weightGain ? `${curedPerformanceStats.weightGain.toFixed(2)} g/kg/day` : 'N/A'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                    
                    <Separator/>

                    <div>
                        <h3 className="text-lg font-medium mb-4">Future Home Visit Plan</h3>
                        <div className="space-y-4 rounded-md border p-4">
                             <FormField control={control} name="needsHomeVisit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Is a home visit needed?</FormLabel>
                                    <FormControl>
                                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" disabled={isFormDisabled} /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" disabled={isFormDisabled} /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            {watchedNeedsHomeVisit === 'yes' && (
                                <div className="space-y-4 pt-4">
                                    <FormField control={control} name="homeVisitReason" render={({ field }) => (<FormItem><FormLabel>Reason for Visit</FormLabel><FormControl><Textarea placeholder="e.g., Check on hygiene, follow up on feeding..." {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>)} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={control} name="homeVisitToBeDoneBy" render={({ field }) => (<FormItem><FormLabel>To be done by</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Select CHW" /></SelectTrigger></FormControl><SelectContent>{allChwsInFacility.map(c => (<SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={control} name="plannedHomeVisitDate" render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel>Planned Date</FormLabel>
                                                <Popover open={isPlannedHomeVisitDatePickerOpen} onOpenChange={setIsPlannedHomeVisitDatePickerOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Pick a date"
                                                                value={field.value ? format(field.value, 'PPP') : ''}
                                                                onChange={(e) => {
                                                                    const date = new Date(e.target.value);
                                                                    if (!isNaN(date.getTime())) {
                                                                        field.onChange(date);
                                                                    }
                                                                }}
                                                                className={cn(!field.value && "text-muted-foreground")}
                                                                disabled={isFormDisabled}
                                                            />
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsPlannedHomeVisitDatePickerOpen(false);}} /></PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                </CardContent>
            </Card>

            <Separator />
             <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/nutritrack/children/${childId}`)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Follow-up'}
                </Button>
            </div>
        </form>
      </Form>
    </main>
  );
}




