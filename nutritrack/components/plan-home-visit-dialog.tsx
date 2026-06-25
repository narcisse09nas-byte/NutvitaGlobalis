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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/nutritrack/components/ui/select';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { Child, CHW } from '@/nutritrack/types';
import { useEffect, useState } from 'react';

const homeVisitSchema = z.object({
  date: z.date(),
  chwId: z.string().min(1, 'Please select a CHW.'),
});

type HomeVisitFormValues = z.infer<typeof homeVisitSchema>;

interface PlanHomeVisitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HomeVisitFormValues) => void;
  child: Child | null;
  chws: CHW[];
}

export function PlanHomeVisitDialog({ isOpen, onClose, onSave, child, chws }: PlanHomeVisitDialogProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const form = useForm<HomeVisitFormValues>({
    resolver: zodResolver(homeVisitSchema),
    defaultValues: {
      date: new Date(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        date: new Date(),
        chwId: child?.chwId || '',
      });
    }
  }, [isOpen, form, child]);
  
  const onSubmit = (data: HomeVisitFormValues) => {
    onSave(data);
  };

  const reasons = (child as any)?.attentionReasons?.map((r: any) => r.text).join(', ') || 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plan Home Visit for {child?.firstName}</DialogTitle>
          <DialogDescription>
            Schedule a follow-up home visit for this high-priority child.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <div>
                <FormLabel>Reason for Visit</FormLabel>
                <Textarea readOnly value={reasons} className="mt-2" />
             </div>
             
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Planned Visit Date</FormLabel>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsDatePickerOpen(false);}} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="chwId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visit to be Done By</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a CHW" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {chws.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Plan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


