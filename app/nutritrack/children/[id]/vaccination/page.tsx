'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { doc, getDoc, updateDoc, Timestamp } from '@/nutritrack/local-firestore';
import type { Child, VaccinationStatus } from '@/nutritrack/types';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { format } from 'date-fns';
import { CheckCircle2, Info, Calendar as CalendarIcon } from 'lucide-react';
import { getDueVaccines, vaccinationSchedule } from '@/nutritrack/lib/vaccination-schedule';
import { Progress } from '@/nutritrack/components/ui/progress';
import { Input } from '@/nutritrack/components/ui/input';

const vaccinationEntrySchema = z.object({
    status: z.enum(['yes', 'no', 'unknown']),
    date: z.date().optional(),
    isDatePickerOpen: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (data.status === 'yes' && !data.date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please specify the date.',
            path: ['date'],
        });
    }
});

const vaccinationFormSchema = z.object({
  vaccinationStatus: z.record(vaccinationEntrySchema),
});

type VaccinationFormValues = z.infer<typeof vaccinationFormSchema>;

export default function VaccinationPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const childId = params.id as string;
  
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vaccinationPercentage, setVaccinationPercentage] = useState<number | null>(null);

  const form = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationFormSchema),
    defaultValues: {
        vaccinationStatus: {},
    },
  });

  const watchedVaccinationStatus = form.watch('vaccinationStatus');

  const allVaccineNames = useMemo(() => {
    if (!child) return [];
    return getDueVaccines(child.age).flatMap(entry => entry.vaccines.map(v => v.name));
  }, [child]);
  
  const calculateVaccinationPercentage = useCallback(() => {
    if (!child || allVaccineNames.length === 0) {
      setVaccinationPercentage(child && child.age > 0 ? 100 : 0);
      return;
    }
    const yesCount = allVaccineNames.reduce((count, vaccineName) => {
      const status = watchedVaccinationStatus?.[vaccineName]?.status;
      return status === 'yes' ? count + 1 : count;
    }, 0);
    setVaccinationPercentage(Math.round((yesCount / allVaccineNames.length) * 100));
  }, [allVaccineNames, watchedVaccinationStatus, child]);


  useEffect(() => {
    if (!childId) return;
    const fetchChildData = async () => {
        setLoading(true);
        try {
            const childDoc = await getDoc(doc(db, 'children', childId));
            if (childDoc.exists()) {
                const childData = { id: childDoc.id, ...childDoc.data() } as Child;
                setChild(childData);

                const defaultStatus: any = {};
                if (childData.vaccinationStatus) {
                    for (const key in childData.vaccinationStatus) {
                        const entry = childData.vaccinationStatus[key];
                        defaultStatus[key] = {
                            status: entry.status,
                            date: entry.date ? (entry.date as Timestamp).toDate() : undefined,
                            isDatePickerOpen: false,
                        };
                    }
                }
                form.reset({ vaccinationStatus: defaultStatus });
                
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
  }, [childId, toast, router, form]);

  useEffect(() => {
    if (child) {
        calculateVaccinationPercentage();
    }
  }, [child, calculateVaccinationPercentage, watchedVaccinationStatus]);

  async function onSubmit(data: VaccinationFormValues) {
    if (!child) return;
    setIsSubmitting(true);
    toast({ title: 'Success', description: 'Vaccination status has been updated.' });
    router.push(`/nutritrack/children/${childId}`);

    try {
        const updatedVaccinationStatus: VaccinationStatus = {};
        for (const key in data.vaccinationStatus) {
            const entry = data.vaccinationStatus[key];
            if (entry && entry.status) {
                updatedVaccinationStatus[key] = {
                    status: entry.status,
                    date: entry.status === 'yes' && entry.date ? Timestamp.fromDate(entry.date) : null
                };
            }
        }
        
        const childRef = doc(db, 'children', childId);
        await updateDoc(childRef, {
            vaccinationStatus: updatedVaccinationStatus,
            vaccinationAssessmentDone: true,
        });

    } catch (error) {
        console.error("Error updating vaccination status:", error);
        toast({ title: 'Error', description: 'Failed to update vaccination status in the background.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const getVaccinationProgressColor = () => {
    if (vaccinationPercentage === null) return "bg-gray-400";
    if (vaccinationPercentage < 50) return "bg-red-500";
    if (vaccinationPercentage < 90) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading || !child) return <div className="p-6">Loading assessment form...</div>;
  
  const dueVaccineEntries = getDueVaccines(child.age);

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
                <div className='flex justify-between items-center'>
                    <h1 className="text-2xl font-bold">Vaccination Assessment: {child.firstName} {child.lastName}</h1>
                    <Button type="button" variant="outline" onClick={() => router.push(`/nutritrack/children/${childId}`)}>Back to Details</Button>
                </div>
                
                 <Card>
                    <CardHeader>
                        <div className='flex justify-between items-center'>
                            <CardTitle>Child's Vaccination Status</CardTitle>
                            {vaccinationPercentage !== null && (
                                <Badge variant={vaccinationPercentage === 100 ? 'default' : 'secondary'}>
                                    {vaccinationPercentage === 100 ? <CheckCircle2 className='mr-1 h-4 w-4 text-green-500' /> : <Info className='mr-1 h-4 w-4 text-yellow-500' />}
                                    {vaccinationPercentage}% of Due Vaccines Complete
                                </Badge>
                            )}
                        </div>
                        <CardDescription>Update the child's vaccination history based on their health card. Only vaccines due for a child of {child.age} months or younger are shown.</CardDescription>
                        {vaccinationPercentage !== null && <Progress value={vaccinationPercentage} className={cn("w-full mt-2", getVaccinationProgressColor())} />}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {dueVaccineEntries.length > 0 ? (
                             dueVaccineEntries.map((entry) => (
                                <div key={entry.contact}>
                                    <h4 className="font-semibold text-lg mb-3">{entry.contact} (Age: {entry.ageInMonths} mos)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {entry.vaccines.map((vaccine) => (
                                            <Card key={vaccine.name} className="p-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`vaccinationStatus.${vaccine.name}.status`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className='font-bold'>{vaccine.name}</FormLabel>
                                                            <FormDescription>{vaccine.disease}</FormDescription>
                                                            <FormControl>
                                                                <RadioGroup
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    className="flex items-center space-x-4 pt-2"
                                                                >
                                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unknown" /></FormControl><FormLabel className="font-normal">Unknown</FormLabel></FormItem>
                                                                </RadioGroup>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                {form.watch(`vaccinationStatus.${vaccine.name}.status`) === 'yes' && (
                                                    <FormField
                                                        control={form.control}
                                                        name={`vaccinationStatus.${vaccine.name}.date`}
                                                        render={({ field }) => (
                                                            <FormItem className='mt-2'>
                                                                <Popover open={form.watch(`vaccinationStatus.${vaccine.name}.isDatePickerOpen`)} onOpenChange={(open) => form.setValue(`vaccinationStatus.${vaccine.name}.isDatePickerOpen`, open)}>
                                                                    <PopoverTrigger asChild>
                                                                        <FormControl>
                                                                            <Input
                                                                                placeholder='Vaccination Date'
                                                                                value={field.value ? format(field.value, 'PPP') : ''}
                                                                                onChange={(e) => {
                                                                                    const date = new Date(e.target.value);
                                                                                    if (!isNaN(date.getTime())) {
                                                                                        field.onChange(date);
                                                                                    }
                                                                                }}
                                                                                className={cn("mt-2", !field.value && 'text-muted-foreground')}
                                                                            />
                                                                        </FormControl>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); form.setValue(`vaccinationStatus.${vaccine.name}.isDatePickerOpen`, false);}} initialFocus /></PopoverContent>
                                                                </Popover>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                    <Separator className="mt-6"/>
                                </div>
                            ))
                        ) : (
                             <p className="text-center text-muted-foreground py-8">No vaccines are due for a child of this age.</p>
                        )}
                    </CardContent>
                </Card>

                 <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push(`/nutritrack/children/${childId}`)} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Assessment'}
                    </Button>
                </div>
            </form>
        </Form>
    </main>
  );
}




