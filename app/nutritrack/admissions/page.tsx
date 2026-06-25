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
import { diagnoseMalnutrition, calculateWHZ, calculateWAZ, calculateHAZ, DiagnosisResult } from '@/nutritrack/lib/health-utils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/nutritrack/components/ui/badge';
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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, X, Plus, Calendar as CalendarIcon, CheckCircle2, Info, Send, AlertTriangle, Syringe, ShieldCheck, HeartPulse, MessageSquareQuote, Contact, Bed, ClipboardCheck, HelpCircle, BookOpen, Group, Download } from 'lucide-react';
import { Logo } from '@/nutritrack/components/logo';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, writeBatch, doc, query, where, Timestamp, getDoc } from '@/nutritrack/local-firestore';
import type { Commodity, StockMovement, HealthArea, AggregatedStockByBatch, Child, Visit, VaccinationStatus, Sensitization, Village, CHW, DiagnosisStatus } from '@/nutritrack/types';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/nutritrack/components/ui/alert';
import { ReferralDialog, type ReferralDetails } from '@/nutritrack/components/referral-dialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/nutritrack/components/ui/tooltip';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';


const admissionFormSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters.' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters.' }),
  caretakerName: z.string().min(2, { message: 'Caretaker name must be at least 2 characters.' }),
  caretakerPhone: z.string().optional(),
  age: z.coerce.number().int().positive(),
  sex: z.enum(['M', 'F']),
  villageId: z.string().min(1, 'Village is required'),
  chwId: z.string().min(1, 'CHW is required'),
  admissionType: z.enum(['new', 'relapse', 'ex-sam', 'readmission-lt-2m', 'internal-transfer', 'new-whz-muac', 'new-oedema']),
  weight: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
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
  healthArea: z.string().min(1, "Please select a health area"),
  healthAreaId: z.string().min(1, 'Please select a health facility'),
}).superRefine((data, ctx) => {
    if (data.oedema === 'yes' && !data.oedemaGrade) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select oedema grade.', path: ['oedemaGrade'] });
    }
});


type AdmissionFormValues = z.infer<typeof admissionFormSchema>;


const generateChildCode = (healthAreaId: string, allHealthAreas: HealthArea[], currentCounter: number): string => {
    if (!healthAreaId || !allHealthAreas || allHealthAreas.length === 0) {
        throw new Error("Health Facility ID and a populated list of health facilities are required to generate a code.");
    }
    const healthArea = allHealthAreas.find(ha => ha.id === healthAreaId);
    if (!healthArea) {
         throw new Error(`Health Facility with ID ${healthAreaId} not found in the provided list to generate a code.`);
    }
    const facilityCode = healthArea.code || healthArea.healthFacilityName.substring(0, 4).toUpperCase();
    const nextCounter = (currentCounter || 0) + 1;
    return `${facilityCode}-${String(nextCounter).padStart(5, '0')}`;
};


const sensitizationTopics = [
    'Exclusive Breastfeeding', 'Breastfeeding Techniques', 'Milk Expression and Cup-Feeding', 
    'Breastfeeding on Demand', 'Introduction to Complementary Feeding', 'Food Variety',
    'Feeding Frequency', 'Sick Child Feeding', 'Growth Monitoring', 'Good Hygiene',
    'Environmental Cleanliness', 'Separation from Baby', 'HIV and Breastfeeding', 'Other'
];

type EligibilityStatus = 
    | 'Eligible for TSFP'
    | 'Eligible for OTP'
    | 'Eligible for ITP'
    | 'Not Eligible'
    | 'Pending';


export default function AdmissionsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityStatus>('Pending');
  const [canAdmit, setCanAdmit] = useState(false);
  const [admissionWarning, setAdmissionWarning] = useState<string | null>(null);
  const [whz, setWhz] = useState<number | null>(null);
  const [waz, setWaz] = useState<number | null>(null);
  const [haz, setHaz] = useState<number | null>(null);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [allHealthAreas, setAllHealthAreas] = useState<HealthArea[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [chws, setChws] = useState<CHW[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);
  const [isReferralConfirmOpen, setIsReferralConfirmOpen] = useState(false);
  const [isAdmissionConfirmOpen, setIsAdmissionConfirmOpen] = useState(false);

  const [referralDetailsToConfirm, setReferralDetailsToConfirm] = useState<ReferralDetails | null>(null);

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      caretakerName: '',
      caretakerPhone: '',
      age: undefined,
      sex: 'M',
      villageId: '',
      chwId: '',
      admissionType: 'new',
      weight: undefined,
      height: undefined,
      muac: undefined,
      oedema: 'no',
      oedemaGrade: undefined,
      appetiteTest: undefined,
      diarrheaDehydration: 'no',
      severeVomiting: 'no',
      pneumonia: 'no',
      subcostalRetraction: 'no',
      openSkinLesions: 'no',
      hypothermia: 'no',
      fever: 'no',
      extremePallor: 'no',
      weakApatheticUnconscious: 'no',
      seizuresMeaslesEtc: 'no',
      clinicalVitaminADeficiency: 'no',
      ivDripOrNgtFeeding: 'no',
      healthArea: '',
      healthAreaId: '',
    },
  });

  const { control, watch, setValue, getValues, trigger, reset } = form;
  const watchedFields = watch(['weight', 'height', 'age', 'sex', 'muac', 'oedema']);
  const watchedAge = watch('age');
  const watchedHealthArea = watch('healthArea');
  const watchedHealthAreaId = watch('healthAreaId');
  const watchedVillageId = watch('villageId');
  const watchedOedema = watch('oedema');
  const appetiteTest = useWatch({ control, name: 'appetiteTest' });
  const oedemaGrade = useWatch({ control, name: 'oedemaGrade' });

  const watchedComorbidities = watch([
      'diarrheaDehydration', 'severeVomiting', 'pneumonia', 'subcostalRetraction',
      'openSkinLesions', 'hypothermia', 'fever', 'extremePallor',
      'weakApatheticUnconscious', 'seizuresMeaslesEtc',
      'clinicalVitaminADeficiency', 'ivDripOrNgtFeeding'
  ]);

  const uniqueHealthAreas = useMemo(() => {
    const seen = new Set();
    return allHealthAreas.filter(ha => {
        const duplicate = seen.has(ha.healthArea);
        seen.add(ha.healthArea);
        return !duplicate;
    });
  }, [allHealthAreas]);

  const filteredVillages = useMemo(() => {
    if (!watchedHealthAreaId) return [];
    return villages.filter(v => v.healthAreaId === watchedHealthAreaId);
  }, [villages, watchedHealthAreaId]);

  const filteredChws = useMemo(() => {
    if(!watchedVillageId) return [];
    return chws.filter(c => c.villageId === watchedVillageId);
  }, [chws, watchedVillageId]);

  useEffect(() => {
    if (watchedOedema === 'no') {
      setValue('oedemaGrade', undefined);
    }
  }, [watchedOedema, setValue]);

  useEffect(() => {
    const [weight, height, age, sex] = getValues(['weight', 'height', 'age', 'sex']);
    if (weight > 0 && height > 0 && age > 0) {
      setWhz(calculateWHZ(weight, height, sex));
      setWaz(calculateWAZ(weight, age, sex));
      setHaz(calculateHAZ(height, age, sex));
    } else {
      setWhz(null);
      setWaz(null);
      setHaz(null);
    }
  }, [watchedFields, getValues]);


  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [commoditiesSnapshot, healthAreasSnapshot, villagesSnapshot, chwsSnapshot] = await Promise.all([
          getDocs(collection(db, 'commodities')),
          getDocs(collection(db, 'healthAreas')),
          getDocs(collection(db, 'villages')),
          getDocs(collection(db, 'chws')),
        ]);
        
        setCommodities(commoditiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Commodity));
        setVillages(villagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Village));
        setChws(chwsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CHW));
        
        const areasData = healthAreasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as HealthArea);
        setAllHealthAreas(areasData);
        
      } catch (error) {
        console.error("Error fetching form data: ", error);
        toast({
          title: 'Error',
          description: 'Failed to load required data. Please try again.',
          variant: 'destructive',
        });
      }
    };
    fetchFormData();
  }, [toast]);
  
  const performDiagnosisAndEligibility = useCallback(() => {
    const formValues = getValues();
    
    if (!formValues.weight || formValues.weight <=0 || !formValues.height || formValues.height <= 0 || !formValues.age || formValues.age <= 0 || !formValues.muac || formValues.muac <= 0) {
        toast({ title: 'Missing Data', description: 'Please provide Weight, Height, Age, and MUAC to perform diagnosis.', variant: 'destructive'});
        setDiagnosis(null);
        setEligibility('Pending');
        return;
    }

    const currentWhz = calculateWHZ(formValues.weight, formValues.height, formValues.sex);
    setWhz(currentWhz);

    const diag = diagnoseMalnutrition(formValues.muac, currentWhz, formValues.oedema);
    setDiagnosis(diag);

      const hasComorbidity = 
          formValues.diarrheaDehydration === 'yes' ||
          formValues.severeVomiting === 'yes' ||
          formValues.pneumonia === 'yes' ||
          formValues.subcostalRetraction === 'yes' ||
          formValues.openSkinLesions === 'yes' ||
          formValues.hypothermia === 'yes' ||
          formValues.fever === 'yes' ||
          formValues.extremePallor === 'yes' ||
          formValues.weakApatheticUnconscious === 'yes' ||
          formValues.seizuresMeaslesEtc === 'yes' ||
          formValues.clinicalVitaminADeficiency === 'yes' ||
          formValues.ivDripOrNgtFeeding === 'yes';

      let currentEligibility: EligibilityStatus = 'Pending';
      if (diag.status === 'Not Malnourished') {
          currentEligibility = 'Not Eligible';
      } else if (diag.status === 'SAM' && (hasComorbidity || formValues.oedemaGrade === '3' || formValues.appetiteTest === 'fail')) {
          currentEligibility = 'Eligible for ITP';
      } else if (diag.status === 'SAM') {
          currentEligibility = 'Eligible for OTP';
      } else if (diag.status === 'MAM') {
          currentEligibility = 'Eligible for TSFP';
      }
      setEligibility(currentEligibility);

      // Check facility capability
      const facility = allHealthAreas.find(ha => ha.id === formValues.healthAreaId);
      if (facility) {
          const requiredProgram = 
              currentEligibility === 'Eligible for TSFP' ? 'TSFP' :
              currentEligibility === 'Eligible for OTP' ? 'OTP' :
              currentEligibility === 'Eligible for ITP' ? 'ITP' :
              null;
          
          if (requiredProgram) {
              if (facility.programs?.includes(requiredProgram)) {
                  setCanAdmit(true);
                  setAdmissionWarning(null);
              } else {
                  setCanAdmit(false);
                  setAdmissionWarning(`This facility does not support ${requiredProgram}. Child should be referred.`);
              }
          } else {
              setCanAdmit(false);
              setAdmissionWarning(null);
          }
      } else {
          setCanAdmit(false);
          setAdmissionWarning('Please select a health facility to check program capabilities.');
      }
  }, [getValues, toast, allHealthAreas]);

    async function saveChildData(
        data: AdmissionFormValues,
        diag: DiagnosisResult,
        zScores: { whz: number | null; waz: number | null; haz: number | null },
        status: 'active' | 'referred_out',
        referralDetails?: ReferralDetails
    ): Promise<string | null> {
        if (!data.healthAreaId || allHealthAreas.length === 0) {
            throw new Error('Health Facility must be selected and available to save data.');
        }
        
        const healthAreaRef = doc(db, 'healthAreas', data.healthAreaId);
        const healthAreaSnap = await getDoc(healthAreaRef);
        if (!healthAreaSnap.exists()) {
            throw new Error(`Health facility with ID ${data.healthAreaId} not found in the database.`);
        }
        const currentCounter = healthAreaSnap.data()?.childCounter || 0;
        const childCode = generateChildCode(data.healthAreaId, allHealthAreas, currentCounter);

        const batch = writeBatch(db);
        const childRef = doc(collection(db, 'children'));

        const childData: Child = {
            id: childRef.id,
            firstName: data.firstName,
            lastName: data.lastName,
            caretakerName: data.caretakerName,
            caretakerPhone: data.caretakerPhone || null,
            childCode,
            age: data.age,
            sex: data.sex,
            villageId: data.villageId,
            chwId: data.chwId,
            admissionType: data.admissionType,
            weight: data.weight,
            height: data.height,
            muac: data.muac,
            oedema: data.oedema,
            appetiteTest: data.appetiteTest || null,
            diarrheaDehydration: data.diarrheaDehydration,
            severeVomiting: data.severeVomiting,
            pneumonia: data.pneumonia,
            subcostalRetraction: data.subcostalRetraction,
            openSkinLesions: data.openSkinLesions,
            hypothermia: data.hypothermia,
            fever: data.fever,
            extremePallor: data.extremePallor,
            weakApatheticUnconscious: data.weakApatheticUnconscious,
            seizuresMeaslesEtc: data.seizuresMeaslesEtc,
            clinicalVitaminADeficiency: data.clinicalVitaminADeficiency,
            ivDripOrNgtFeeding: data.ivDripOrNgtFeeding,
            healthAreaId: data.healthAreaId,
            status: status,
            admissionDate: Timestamp.fromDate(new Date()),
            nextVisitDate: null, 
            diagnosis: diag,
            whz: zScores.whz ?? null,
            waz: zScores.waz ?? null,
            haz: zScores.haz ?? null,
            oedemaGrade: data.oedemaGrade || null,
            vaccinationStatus: {},
            needsHomeVisit: 'no',
            homeVisitDate: null,
            homeVisitPlan: null,
        };

        if (status === 'referred_out' && referralDetails) {
              childData.discharge = {
                date: Timestamp.fromDate(new Date()),
                type: 'referred_out',
                referralReason: referralDetails.reason,
                referralStatus: 'pending',
                referredToFacilityId: referralDetails.referredToFacilityId === 'other' ? null : referralDetails.referredToFacilityId,
                referredToOther: referralDetails.referredToOther || null
            };
        }

        batch.set(childRef, childData);
        batch.update(healthAreaRef, { childCounter: currentCounter + 1 });

        const initialVisitRef = doc(collection(db, 'children', childRef.id, 'visits'));
        const initialVisitData: Omit<Visit, 'id'> = {
            visitNumber: 0,
            visitDate: Timestamp.fromDate(new Date()),
            weight: data.weight,
            height: data.height,
            muac: data.muac,
            oedema: data.oedema,
            oedemaGrade: data.oedemaGrade || null,
            appetiteTest: data.appetiteTest || null,
            diarrheaDehydration: data.diarrheaDehydration,
            severeVomiting: data.severeVomiting,
            pneumonia: data.pneumonia,
            subcostalRetraction: data.subcostalRetraction,
            openSkinLesions: data.openSkinLesions,
            hypothermia: data.hypothermia,
            fever: data.fever,
            extremePallor: data.extremePallor,
            weakApatheticUnconscious: data.weakApatheticUnconscious,
            seizuresMeaslesEtc: data.seizuresMeaslesEtc,
            clinicalVitaminADeficiency: data.clinicalVitaminADeficiency,
            ivDripOrNgtFeeding: data.ivDripOrNgtFeeding,
            nutritionalTreatments: [],
            systematicTreatments: [],
            sensitization: null,
            nextVisitDate: null,
            homeVisit: null,
            whz: zScores.whz ?? null,
            waz: zScores.waz ?? null,
            haz: zScores.haz ?? null,
            diagnosis: diag,
        };
        batch.set(initialVisitRef, initialVisitData);

        // Do not await the commit to implement optimistic UI
        batch.commit().then(() => {
            // Optional: handle success in the background
        }).catch((error) => {
            console.error("Error saving child data in background:", error);
            toast({ title: 'Save Failed', description: 'Child data failed to save in the background. Please check your connection and try again.', variant: 'destructive'});
        });
        
        return childRef.id;
    }

  async function handleAdmissionClick() {
      const isValid = await trigger();
      if (!isValid) {
          toast({ title: 'Validation Error', description: 'Please fill all required fields before admitting.', variant: 'destructive'});
          return;
      }
      if (!diagnosis) {
          toast({ title: 'Diagnosis Missing', description: 'Please calculate diagnosis before admitting.', variant: 'destructive' });
          return;
      }
      setIsAdmissionConfirmOpen(true);
  }

  async function handleFinalConfirmAdmission() {
    setIsSubmitting(true);
    setIsAdmissionConfirmOpen(false);
    
    try {
        if (!diagnosis) throw new Error("Diagnosis must be calculated before admission.");
        
        const data = getValues();
        const childId = await saveChildData(data, diagnosis, {whz, waz, haz}, 'active');
        
        toast({
            title: 'Admission Successful!',
            description: `${data.firstName} ${data.lastName} has been admitted.`,
        });
        
        // Optimistic redirect
        if (childId) {
            router.push(`/nutritrack/children/${childId}`);
        } else {
            router.push('/nutritrack/children');
        }
        
    } catch (error: any) {
        console.error("Error during final admission confirmation:", error);
        toast({ title: 'Admission Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive'});
        setIsSubmitting(false); // Only set to false on error
    }
  }

  async function handleReferralClick() {
      const isValid = await trigger(['firstName', 'lastName', 'caretakerName', 'age', 'sex', 'villageId', 'chwId', 'weight', 'height', 'muac', 'oedema', 'healthAreaId']);
       if (!isValid) {
          toast({ title: 'Validation Error', description: 'Please fill all required child and facility fields before referring.', variant: 'destructive'});
          return;
      }
       if (!diagnosis) {
          toast({ title: 'Diagnosis Missing', description: 'Please calculate diagnosis before referring.', variant: 'destructive' });
          return;
      }
      setIsReferralDialogOpen(true);
  }

  function handleOpenReferralConfirm(details: ReferralDetails) {
    setReferralDetailsToConfirm(details);
    setIsReferralConfirmOpen(true);
    setIsReferralDialogOpen(false); 
  }

  async function handleFinalConfirmReferral() {
    if (!referralDetailsToConfirm || !diagnosis) return;
    
    setIsSubmitting(true);
    setIsReferralConfirmOpen(false);

    try {
        const data = getValues();
        saveChildData(data, diagnosis, {whz, waz, haz}, 'referred_out', referralDetailsToConfirm);

        toast({
            title: 'Referral Successful',
            description: `${data.firstName} ${data.lastName} has been recorded as referred out.`,
        });
        
        // Optimistic redirect
        router.push('/nutritrack/referred-out');
        
    } catch (error: any) {
        console.error("Error during final referral confirmation:", error);
        toast({ title: 'Referral Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive'});
        setIsSubmitting(false); // Only set to false on error
    }
  };

  const comorbidities = useMemo(() => {
    const comorbidityFields: { field: keyof AdmissionFormValues, label: string }[] = [
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
        
    if (form.getValues('appetiteTest') === 'fail') {
        activeComorbidities.push({ field: 'appetiteTest' as any, label: 'Failed Appetite Test'});
    }
    if (form.getValues('oedemaGrade') === '3') {
        activeComorbidities.push({ field: 'oedemaGrade' as any, label: 'Oedema Grade 3'});
    }

    return activeComorbidities;
  }, [watchedComorbidities, form, appetiteTest, oedemaGrade]);


  const isAdmitButtonDisabled = useMemo(() => {
    if (isSubmitting || !diagnosis || !watchedHealthAreaId || eligibility === 'Not Eligible' || !canAdmit) {
        return true;
    }
    return false;
  }, [isSubmitting, diagnosis, watchedHealthAreaId, eligibility, canAdmit]);
  
  const isReferButtonDisabled = useMemo(() => {
    if (isSubmitting || !diagnosis || eligibility === 'Not Eligible' || eligibility === 'Pending') {
        return true;
    }
    return false;
  }, [isSubmitting, diagnosis, eligibility]);


  const pneumoniaTooltipText = useMemo(() => {
    if (!watchedAge) return "Enter age to see details.";
    if (watchedAge < 2) return ">60 breaths/minute";
    if (watchedAge <= 12) return "50 breaths/minute";
    if (watchedAge <= 60) return "40 breaths/minute";
    return "30 breaths/minute";
  }, [watchedAge]);


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
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/admissions" group="operations" isActive={true} tooltip="Admissions"><PlusCircle /><span>Admissions</span></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/children" group="operations" tooltip="Children Register"><Users /><span>Children Register</span></SidebarMenuButton></SidebarMenuItem>
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
                <SidebarTrigger className="md:hidden text-white" />
                <h1 className="text-lg font-semibold">New Admission</h1>
            </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                   <Card>
                        <CardHeader><CardTitle>1. Child Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Child's first name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Child's last name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="caretakerName" render={({ field }) => (<FormItem><FormLabel>Caretaker's Name</FormLabel><FormControl><Input placeholder="Caretaker's full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="caretakerPhone" render={({ field }) => (<FormItem><FormLabel>Caretaker's Phone</FormLabel><FormControl><Input placeholder="+223 XX XX XX XX" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age (months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="sex" render={({ field }) => (<FormItem><FormLabel>Sex</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl><SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="healthArea" render={({ field }) => (<FormItem><FormLabel>Health Area</FormLabel><Select onValueChange={(v) => { field.onChange(v); setValue('healthAreaId', ''); setValue('villageId', ''); setValue('chwId', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select health area" /></SelectTrigger></FormControl><SelectContent>{uniqueHealthAreas.map(area => (<SelectItem key={area.id} value={area.healthArea}>{area.healthArea}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="healthAreaId" render={({ field }) => (<FormItem><FormLabel>Health Facility</FormLabel><Select onValueChange={(v) => {field.onChange(v); setValue('villageId', ''); setValue('chwId', ''); }} value={field.value} disabled={!watchedHealthArea}><FormControl><SelectTrigger><SelectValue placeholder="Select health facility" /></SelectTrigger></FormControl><SelectContent>{allHealthAreas.filter(f => f.healthArea === watchedHealthArea).map(f => (<SelectItem key={f.id} value={f.id}>{f.healthFacilityName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="villageId" render={({ field }) => (<FormItem><FormLabel>Village / Quartier</FormLabel><Select onValueChange={(v) => { field.onChange(v); setValue('chwId', ''); }} value={field.value} disabled={!watchedHealthAreaId}><FormControl><SelectTrigger><SelectValue placeholder="Select village" /></SelectTrigger></FormControl><SelectContent>{filteredVillages.map(v => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="chwId" render={({ field }) => (<FormItem><FormLabel>Child Assigned to</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedVillageId}><FormControl><SelectTrigger><SelectValue placeholder="Select CHW" /></SelectTrigger></FormControl><SelectContent>{filteredChws.map(c => (<SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                           </div>
                        </CardContent>
                    </Card>
                  <Card>
                    <CardHeader><CardTitle>2. Anthropometry measurements</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="muac" render={({ field }) => (<FormItem><FormLabel>MUAC (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="oedema" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Bilateral Oedema</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                         {watchedOedema === 'yes' && (
                            <FormField control={form.control} name="oedemaGrade" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Oedema Grade</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select oedema grade" /></SelectTrigger></FormControl>
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
                        {(waz || haz || whz) && (
                            <div className="text-sm space-y-1 border-t pt-4 mt-4">
                                <h4 className="font-semibold text-base mb-2">Z-Scores</h4>
                                <p>W/H Z-score: <span className="font-semibold float-right">{whz?.toFixed(2) ?? 'N/A'}</span></p>
                                <p>W/A Z-score: <span className="font-semibold float-right">{waz?.toFixed(2) ?? 'N/A'}</span></p>
                                <p>H/A Z-score: <span className="font-semibold float-right">{haz?.toFixed(2) ?? 'N/A'}</span></p>
                            </div>
                        )}
                    </CardContent>
                  </Card>
                   <Card>
                        <CardHeader><CardTitle>3. Clinical Assessment</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {diagnosis?.status === 'SAM' && (
                                <FormField control={form.control} name="appetiteTest" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Appetite Test</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="pass" /></FormControl><FormLabel className="font-normal">Pass</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="fail" /></FormControl><FormLabel className="font-normal">Fail</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                            )}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

                                <FormField control={form.control} name="diarrheaDehydration" render={({ field }) => (
                                    <FormItem>
                                        <TooltipProvider><Tooltip>
                                            <TooltipTrigger className="cursor-help"><FormLabel className='underline decoration-dashed'>Diarrhea/Dehydration</FormLabel></TooltipTrigger>
                                            <TooltipContent className='bg-black text-white'><p>Based on patient history and recent change in appearance. Do NOT use usual clinical signs.</p></TooltipContent>
                                        </Tooltip></TooltipProvider>
                                        <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="pneumonia" render={({ field }) => (
                                    <FormItem>
                                        <TooltipProvider><Tooltip>
                                            <TooltipTrigger className="cursor-help"><FormLabel className='underline decoration-dashed'>Pneumonia</FormLabel></TooltipTrigger>
                                            <TooltipContent className='bg-black text-white'><p>{pneumoniaTooltipText}</p></TooltipContent>
                                        </Tooltip></TooltipProvider>
                                        <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2"><FormItem><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>
                    
                    {(eligibility !== 'Not Eligible' && eligibility !== 'Pending') && (
                        <Card>
                            <CardHeader><CardTitle>4. Admission Type</CardTitle></CardHeader>
                            <CardContent>
                                <FormField 
                                    control={form.control} 
                                    name="admissionType" 
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select admission type" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {eligibility === 'Eligible for TSFP' ? (
                                                        <>
                                                            <SelectItem value="new">New Admission</SelectItem>
                                                            <SelectItem value="relapse">Relapse</SelectItem>
                                                            <SelectItem value="readmission-lt-2m">Readmission (&lt;2 months)</SelectItem>
                                                            <SelectItem value="ex-sam">Ex-SAM</SelectItem>
                                                            <SelectItem value="internal-transfer">Internal Transfer</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="new-whz-muac">New Admission (WHZ/MUAC)</SelectItem>
                                                            <SelectItem value="new-oedema">Oedema Case</SelectItem>
                                                            <SelectItem value="relapse">Relapse</SelectItem>
                                                            <SelectItem value="readmission-lt-2m">Readmission (&lt;2 months)</SelectItem>
                                                            <SelectItem value="internal-transfer">Internal Transfer</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} 
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                <div className="space-y-6">
                    <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle>Diagnosis & Summary</CardTitle>
                            <CardDescription>Based on anthropometric and clinical data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button type="button" className="w-full" onClick={performDiagnosisAndEligibility}>Calculate & Diagnose</Button>
                            {diagnosis ? (
                                <div className="space-y-3">
                                    <div className='text-center'>
                                        {eligibility === 'Eligible for ITP' ? (
                                            <Badge variant='destructive' className="text-lg w-full justify-center">
                                                SAM with Medical Complications
                                            </Badge>
                                        ) : (
                                            <Badge variant={diagnosis.status === 'SAM' ? 'destructive' : diagnosis.status === 'MAM' ? 'accent' : 'default'} className="text-lg w-full justify-center">
                                                {diagnosis.status}
                                            </Badge>
                                        )}
                                        <p className="text-center text-sm text-muted-foreground">Reason: {diagnosis.reason}</p>
                                    </div>
                                    <Separator />
                                     <div className="text-sm space-y-2">
                                        <h4 className="font-semibold text-base mb-2">Clinical Status</h4>
                                        {diagnosis.status === 'SAM' && (
                                            <div className='flex items-center justify-between'>
                                                <p className='flex items-center gap-2'><Syringe className='w-4 h-4 text-muted-foreground' />Appetite Test:</p>
                                                <Badge variant={appetiteTest === 'fail' ? 'destructive' : 'default'} className="capitalize">{appetiteTest || 'N/A'}</Badge>
                                            </div>
                                        )}
                                         <div className='flex items-start justify-between'>
                                            <p className='flex items-center gap-2 pt-1'><HeartPulse className='w-4 h-4 text-muted-foreground' />Danger Signs:</p>
                                            <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                                              {comorbidities.length > 0 ? comorbidities.map(c => <Badge key={c.field} variant='destructive'>{c.label}</Badge>) : <Badge>None</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    <Separator />
                                     <div className="text-sm space-y-2">
                                        <h4 className="font-semibold text-base mb-2">Eligibility for Treatment Program</h4>
                                        <Badge variant={eligibility.startsWith('Eligible') ? 'default' : eligibility === 'Pending' ? 'outline' : 'destructive'} className="text-md w-full justify-center">{eligibility}</Badge>
                                        {admissionWarning && (
                                            <Alert variant="destructive" className="mt-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Action Required</AlertTitle>
                                                <AlertDescription>{admissionWarning}</AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Please fill in anthropometric data to begin assessment.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
              </div>
              
              <Card className="bg-secondary/50">
                <CardHeader>
                    <CardTitle>Final Actions</CardTitle>
                    <CardDescription>Review the information above, then choose an action for this child.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push('/nutritrack/')} disabled={isSubmitting}>Cancel</Button>
                        
                        {eligibility === 'Not Eligible' && (
                            <p className="text-sm text-muted-foreground p-2">No further action needed for this child.</p>
                        )}
                        
                        {(eligibility !== 'Not Eligible' && eligibility !== 'Pending') && (
                            <>
                                <Button type="button" variant="destructive" onClick={handleReferralClick} disabled={isSubmitting || isReferButtonDisabled}>
                                    {isSubmitting ? 'Referring...' : 'Refer Child'}
                                </Button>
                                <Button type="button" onClick={handleAdmissionClick} disabled={isSubmitting || isAdmitButtonDisabled}>
                                    {isSubmitting ? 'Admitting...' : 'Admit Child'}
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
              </Card>

            </form>
          </Form>
        </main>
      </SidebarInset>
    </div>
    <ReferralDialog 
        isOpen={isReferralDialogOpen}
        onClose={() => setIsReferralDialogOpen(false)}
        onConfirm={handleOpenReferralConfirm}
        isSubmitting={isSubmitting}
    />
     <ConfirmationDialog
        isOpen={isReferralConfirmOpen}
        onClose={() => setIsReferralConfirmOpen(false)}
        onConfirm={handleFinalConfirmReferral}
        title="Confirm Referral"
        description="Are you sure you want to refer this child? This will mark them as 'Referred Out'."
        confirmText={isSubmitting ? 'Referring...' : 'Yes, Refer'}
    />
    <ConfirmationDialog
        isOpen={isAdmissionConfirmOpen}
        onClose={() => setIsAdmissionConfirmOpen(false)}
        onConfirm={handleFinalConfirmAdmission}
        title="Confirm Admission"
        description="Are you sure you want to admit this child into the program? This will create a new child record."
        confirmText={isSubmitting ? 'Admitting...' : 'Yes, Admit'}
    />
    </>
  );
}




