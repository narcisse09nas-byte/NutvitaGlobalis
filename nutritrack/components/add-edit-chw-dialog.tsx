

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
import type { CHW, HealthArea, Village } from '@/nutritrack/types';
import { useEffect, useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const chwSchema = z.object({
  firstName: z.string().min(2, 'First name is required.'),
  lastName: z.string().min(2, 'Last name is required.'),
  sex: z.enum(['M', 'F']),
  phone: z.string().min(1, 'Phone number is required.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  healthAreaId: z.string().min(1, 'Please select a health facility.'),
  villageId: z.string().min(1, 'Please select a village.'),
});

type ChwFormValues = z.infer<typeof chwSchema>;

interface AddEditChwDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<CHW, 'id'>) => Promise<void>;
  chw: CHW | null;
  healthAreas: HealthArea[];
  villages: Village[];
}

export function AddEditChwDialog({ isOpen, onClose, onSave, chw, healthAreas, villages }: AddEditChwDialogProps) {
  
  const form = useForm<ChwFormValues>({
    resolver: zodResolver(chwSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      sex: 'M',
      phone: '',
      email: '',
      healthAreaId: '',
      villageId: '',
    },
  });

  const healthAreaId = form.watch('healthAreaId');

  const filteredVillages = useMemo(() => {
    if (!healthAreaId) return [];
    return villages.filter(v => v.healthAreaId === healthAreaId);
  }, [healthAreaId, villages]);

  useEffect(() => {
    if (isOpen) {
        if (chw) {
            form.reset(chw);
        } else {
            form.reset({
                firstName: '',
                lastName: '',
                sex: 'M',
                phone: '',
                email: '',
                healthAreaId: '',
                villageId: '',
            });
        }
    }
  }, [chw, form, isOpen]);

  const onSubmit = async (data: ChwFormValues) => {
    const healthFacility = healthAreas.find(ha => ha.id === data.healthAreaId);
    const village = villages.find(v => v.id === data.villageId);
    if (!healthFacility || !village) {
        // This should not happen due to form validation
        return;
    }
    
    // Generate Unique ID
    const facilityInitial = healthFacility.healthFacilityName.charAt(0).toUpperCase();
    const villageInitials = village.name.substring(0,2).toUpperCase();
    const chwInitials = data.firstName.charAt(0).toUpperCase() + data.lastName.charAt(0).toUpperCase();
    const serial = String(Math.floor(Math.random() * 900) + 100);
    const chwId = `${facilityInitial}${villageInitials}${chwInitials}${serial}`.substring(0, 8);
    
    await onSave({ ...data, chwId });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{chw ? 'Edit CHW' : 'Add New CHW'}</DialogTitle>
          <DialogDescription>
            {chw ? 'Update the details of the CHW.' : 'Add a new CHW to the program.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem><FormLabel>Sex</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="M" /></FormControl><FormLabel className="font-normal">Male</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="F" /></FormControl><FormLabel className="font-normal">Female</FormLabel></FormItem>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )}/>

             <div className="grid gap-4 sm:grid-cols-2">
                 <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+223 XX XX XX XX" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <FormField
              control={form.control}
              name="healthAreaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health Facility</FormLabel>
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('villageId', ''); // Reset village when facility changes
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a health facility" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>{healthAreas.map(ha => (<SelectItem key={ha.id} value={ha.id}>{ha.healthFacilityName}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="villageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Village Covered</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!healthAreaId}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a village" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>{filteredVillages.map(v => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save CHW</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


