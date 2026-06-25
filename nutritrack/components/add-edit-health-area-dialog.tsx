'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/nutritrack/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/nutritrack/components/ui/form';
import { Input } from '@/nutritrack/components/ui/input';
import type { HealthArea } from '@/nutritrack/types';
import { useEffect } from 'react';
import { Checkbox } from '@/nutritrack/components/ui/checkbox';

const programOptions = [
    { id: 'TSFP', label: 'TSFP (MAM)' },
    { id: 'OTP', label: 'OTP (SAM)' },
    { id: 'ITP', label: 'ITP (SAM with Complications)' },
] as const;

const healthAreaSchema = z.object({
  hqGlobal: z.string().min(1, 'HQ/Global identifier is required.'),
  country: z.string().min(2, 'Country is required.'),
  region: z.string().min(2, 'Region/Province/State is required.'),
  healthDistrict: z.string().min(2, 'Division/District is required.'),
  subDivision: z.string().optional(),
  healthArea: z.string().min(1, 'Health zone/area is required'),
  healthFacilityName: z.string().min(2, 'Name must be at least 2 characters.'),
  code: z.string(),
  childCounter: z.coerce.number().int().min(0),
  programs: z.array(z.enum(['TSFP', 'OTP', 'ITP'])).refine((value) => value.some((item) => item), {
    message: "You have to select at least one program.",
  }),
});

type HealthAreaFormValues = z.infer<typeof healthAreaSchema>;

interface AddEditHealthAreaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HealthAreaFormValues) => void;
  healthArea: HealthArea | null;
}

export function AddEditHealthAreaDialog({ isOpen, onClose, onSave, healthArea }: AddEditHealthAreaDialogProps) {
  
  const form = useForm<HealthAreaFormValues>({
    resolver: zodResolver(healthAreaSchema),
    defaultValues: {
      hqGlobal: '',
      country: '',
      region: '',
      healthDistrict: '',
      subDivision: '',
      healthArea: '',
      healthFacilityName: '',
      code: '',
      childCounter: 0,
      programs: [],
    },
  });

  const { formState: { isSubmitting } } = form;

  useEffect(() => {
    if (isOpen) {
        if (healthArea) {
            form.reset({
                ...healthArea,
                childCounter: healthArea.childCounter || 0,
                programs: healthArea.programs || [],
            });
        } else {
            form.reset({
              hqGlobal: '',
              country: '',
              region: '',
              healthDistrict: '',
              subDivision: '',
              healthArea: '',
              healthFacilityName: '',
              code: '',
              childCounter: 0,
              programs: [],
            });
        }
    }
  }, [healthArea, form, isOpen]);

  const onSubmit = (data: HealthAreaFormValues) => {
    // Auto-generate code if it's a new entry and the field is empty
    const finalData = { ...data };
    if (!healthArea && !finalData.code) {
        finalData.code = finalData.healthFacilityName.substring(0, 4).toUpperCase();
    }
    
    onSave(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{healthArea ? 'Edit Health Facility' : 'Add Health Facility'}</DialogTitle>
          <DialogDescription>
            {healthArea ? 'Update the details of the health facility.' : 'Add a new health facility by specifying its administrative location.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                 <FormField control={form.control} name="hqGlobal" render={({ field }) => (
                    <FormItem>
                        <FormLabel>HQ/Global</FormLabel>
                        <FormControl><Input placeholder="e.g., My-NGO" {...field} /></FormControl>
                         <FormDescription>To identify yourself or your organization/structure.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country (Admin 0)</FormLabel><FormControl><Input placeholder="e.g., Mali" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="region" render={({ field }) => (<FormItem><FormLabel>Region/State (Admin 1)</FormLabel><FormControl><Input placeholder="e.g., Koulikoro" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="healthDistrict" render={({ field }) => (<FormItem><FormLabel>Division/District (Admin 2)</FormLabel><FormControl><Input placeholder="e.g., Kati" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="subDivision" render={({ field }) => (<FormItem><FormLabel>Sub-Division (Admin 3, if applicable)</FormLabel><FormControl><Input placeholder="e.g., Kambila" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              
              <div className="space-y-4">
                <FormField control={form.control} name="healthArea" render={({ field }) => (<FormItem><FormLabel>Health Zone/Area</FormLabel><FormControl><Input placeholder="e.g., Kati" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="healthFacilityName" render={({ field }) => (<FormItem><FormLabel>Health Facility Name</FormLabel><FormControl><Input placeholder="e.g., Kati CSRef" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Facility Code (Optional)</FormLabel><FormControl><Input placeholder="Auto-generated if empty" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)}/>
                 <FormField
                    control={form.control}
                    name="childCounter"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Initial Serial Number</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>

               <div className="md:col-span-2 space-y-2 p-4 border rounded-md">
                <FormField
                    control={form.control}
                    name="programs"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Programs Implemented</FormLabel>
                            <FormDescription>
                            Select all the programs this health facility supports.
                            </FormDescription>
                        </div>
                        <div className="flex flex-row items-center space-x-4">
                          {programOptions.map((item) => (
                              <FormField
                              key={item.id}
                              control={form.control}
                              name="programs"
                              render={({ field }) => {
                                  return (
                                  <FormItem
                                      key={item.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                      <FormControl>
                                      <Checkbox
                                          checked={field.value?.includes(item.id)}
                                          onCheckedChange={(checked) => {
                                          return checked
                                              ? field.onChange([...(field.value || []), item.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                  (value) => value !== item.id
                                                  )
                                              )
                                          }}
                                      />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                      {item.label}
                                      </FormLabel>
                                  </FormItem>
                                  )
                              }}
                              />
                          ))}
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Health Facility'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


