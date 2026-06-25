

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
} from '@/nutritrack/components/ui/form';
import { Input } from '@/nutritrack/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/nutritrack/components/ui/select';
import type { Village, HealthArea } from '@/nutritrack/types';
import { useEffect, useMemo } from 'react';

const villageSchema = z.object({
  country: z.string().min(2, 'Country is required.'),
  region: z.string().min(2, 'Region is required.'),
  healthDistrict: z.string().min(2, 'Health district is required.'),
  healthAreaId: z.string().min(1, 'Please select a health area.'),
  name: z.string().min(2, 'Village name is required.'),
  chwCount: z.coerce.number().int().min(0, "Number can't be negative.").default(0),
  estimatedPopulation: z.coerce.number().int().min(0, "Population can't be negative.").default(0),
});

type VillageFormValues = z.infer<typeof villageSchema>;

interface AddEditVillageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Village, 'id'>) => Promise<void>;
  village: Village | null;
  healthAreas: HealthArea[];
}

export function AddEditVillageDialog({ isOpen, onClose, onSave, village, healthAreas }: AddEditVillageDialogProps) {
  
  const form = useForm<VillageFormValues>({
    resolver: zodResolver(villageSchema),
    defaultValues: {
      country: '',
      region: '',
      healthDistrict: '',
      healthAreaId: '',
      name: '',
      chwCount: 0,
      estimatedPopulation: 0,
    },
  });

  const region = form.watch('region');
  const district = form.watch('healthDistrict');

  const regionOptions = useMemo(() => Array.from(new Set(healthAreas.map(ha => ha.region))), [healthAreas]);
  const districtOptions = useMemo(() => {
      if (!region) return [];
      return Array.from(new Set(healthAreas.filter(ha => ha.region === region).map(ha => ha.healthDistrict)));
  }, [region, healthAreas]);
  const healthAreaOptions = useMemo(() => {
      if (!district) return [];
      return healthAreas.filter(ha => ha.healthDistrict === district);
  }, [district, healthAreas]);

  useEffect(() => {
    if (isOpen) {
        if (village) {
            const healthArea = healthAreas.find(ha => ha.id === village.healthAreaId);
            form.reset({
                ...village,
                healthDistrict: healthArea?.healthDistrict || '',
                region: healthArea?.region || '',
                country: healthArea?.country || ''
            });
        } else {
            form.reset({
                country: '',
                region: '',
                healthDistrict: '',
                healthAreaId: '',
                name: '',
                chwCount: 0,
                estimatedPopulation: 0,
            });
        }
    }
  }, [village, healthAreas, form, isOpen]);

  const onSubmit = async (data: VillageFormValues) => {
    const healthFacility = healthAreas.find(ha => ha.id === data.healthAreaId);
    if (!healthFacility) return; // Should be handled by validation

    let villageId: string;
    if (village && village.villageId) {
        villageId = village.villageId;
    } else {
        // Generate unique ID for new villages only
        const facilityInitial = healthFacility.healthFacilityName.charAt(0).toUpperCase();
        const villageInitials = data.name.substring(0, 3).toUpperCase();
        const serial = String(Math.floor(Math.random() * 9000) + 1000);
        villageId = `${facilityInitial}${villageInitials}${serial}`.substring(0, 8);
    }

    const finalData: Omit<Village, 'id'> = {
        ...data,
        villageId,
    };
    
    await onSave(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{village ? 'Edit Village' : 'Add New Village/Quartier'}</DialogTitle>
          <DialogDescription>
            {village ? 'Update the details of the community.' : 'Add a new community to the mapping.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="e.g., Mali" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <Select onValueChange={value => {
                      field.onChange(value);
                      form.setValue('healthDistrict', '');
                      form.setValue('healthAreaId', '');
                  }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a region" /></SelectTrigger></FormControl>
                    <SelectContent>{regionOptions.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="healthDistrict"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health District</FormLabel>
                  <Select onValueChange={value => {
                      field.onChange(value);
                      form.setValue('healthAreaId', '');
                  }} value={field.value} disabled={!region}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger></FormControl>
                    <SelectContent>{districtOptions.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="healthAreaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health Area/Facility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!district}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a health area" /></SelectTrigger></FormControl>
                    <SelectContent>{healthAreaOptions.map(ha => (<SelectItem key={ha.id} value={ha.id}>{ha.healthFacilityName} ({ha.healthArea})</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Village/Quartier Name</FormLabel><FormControl><Input placeholder="e.g., Kalaban Koro" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="chwCount" render={({ field }) => (<FormItem><FormLabel>Number of CHWs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="estimatedPopulation" render={({ field }) => (<FormItem><FormLabel>Est. Population</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Village</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


