

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
import type { Commodity, CommodityProgram } from '@/nutritrack/types';
import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/nutritrack/components/ui/radio-group';

const commoditySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  unit: z.enum(['kg', 'sachet', 'tablet', 'unit', 'MT', 'ml']),
  type: z.enum(['Nutritional', 'Systematic Treatment']),
  program: z.enum(['SAM', 'MAM', 'SAM+', 'Both']),
});

type CommodityFormValues = z.infer<typeof commoditySchema>;

interface AddEditCommodityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CommodityFormValues) => Promise<void>;
  commodity: Commodity | null;
}

export function AddEditCommodityDialog({ isOpen, onClose, onSave, commodity }: AddEditCommodityDialogProps) {
  const form = useForm<CommodityFormValues>({
    resolver: zodResolver(commoditySchema),
    defaultValues: {
      name: '',
      unit: 'unit',
      type: 'Nutritional',
      program: 'Both',
    },
  });

  useEffect(() => {
    if (commodity) {
      form.reset(commodity);
    } else {
      form.reset({ name: '', unit: 'unit', type: 'Nutritional', program: 'Both' });
    }
  }, [commodity, form, isOpen]);

  const onSubmit = async (data: CommodityFormValues) => {
    await onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{commodity ? 'Edit Commodity' : 'Add Commodity'}</DialogTitle>
          <DialogDescription>
            {commodity ? 'Update the details of the commodity.' : 'Add a new commodity to the list.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commodity Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., RUTF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Commodity Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Nutritional" />
                        </FormControl>
                        <FormLabel className="font-normal">Nutritional</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Systematic Treatment" />
                        </FormControl>
                        <FormLabel className="font-normal">Systematic Treatment</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measurement</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="sachet">Sachet</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="MT">Metric Ton (MT)</SelectItem>
                      <SelectItem value="ml">Milliliter (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="program"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Designated Program</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="MAM" /></FormControl>
                        <FormLabel className="font-normal">MAM</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="SAM" /></FormControl>
                        <FormLabel className="font-normal">SAM</FormLabel>
                      </FormItem>
                       <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="SAM+" /></FormControl>
                        <FormLabel className="font-normal">SAM with Medical Complications</FormLabel>
                      </FormItem>
                       <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Both" /></FormControl>
                        <FormLabel className="font-normal">Both</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Commodity</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


