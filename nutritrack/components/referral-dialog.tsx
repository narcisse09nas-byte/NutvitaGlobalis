
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
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
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { useEffect, useState, useMemo } from 'react';
import { HealthArea } from '@/nutritrack/types';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs } from '@/nutritrack/local-firestore';

const referralSchema = z.object({
  referredToFacilityId: z.string().optional(),
  referredToOther: z.string().optional(),
  reason: z.string().min(10, 'Please provide a reason for the referral (min. 10 characters).'),
}).superRefine((data, ctx) => {
    if (!data.referredToFacilityId && !data.referredToOther) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please select a facility or specify another destination.',
            path: ['referredToFacilityId'],
        });
    }
    if (data.referredToFacilityId === 'other' && !data.referredToOther) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please specify the referral destination.',
            path: ['referredToOther'],
        });
    }
});


export type ReferralDetails = z.infer<typeof referralSchema>;

interface ReferralDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ReferralDetails) => void;
  isSubmitting: boolean;
}

export function ReferralDialog({ isOpen, onClose, onConfirm, isSubmitting }: ReferralDialogProps) {
  const [healthFacilities, setHealthFacilities] = useState<HealthArea[]>([]);

  const form = useForm<ReferralDetails>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      reason: '',
    },
  });

  const selectedFacility = useWatch({ control: form.control, name: 'referredToFacilityId' });

  useEffect(() => {
    const fetchFacilities = async () => {
      const snapshot = await getDocs(collection(db, 'healthAreas'));
      setHealthFacilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthArea)));
    };
    fetchFacilities();
  }, []);

  useEffect(() => {
    if (isOpen) {
      form.reset({
          referredToFacilityId: '',
          referredToOther: '',
          reason: '',
      });
    }
  }, [isOpen, form]);

  const onSubmit = (data: ReferralDetails) => {
    onConfirm(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refer Child Out</DialogTitle>
          <DialogDescription>
            Select a destination facility or specify an external one. The child's status will be set to 'Referred Out'.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
              control={form.control}
              name="referredToFacilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referred To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a facility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {healthFacilities.map(hf => (
                        <SelectItem key={hf.id} value={hf.id}>{hf.healthFacilityName}</SelectItem>
                      ))}
                      <SelectItem value="other">Other (Specify)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedFacility === 'other' && (
                <FormField
                    control={form.control}
                    name="referredToOther"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Specify Other Destination</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Central Hospital ITP" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Referral</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the reason for referral..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Referring...' : 'Confirm Referral'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}




