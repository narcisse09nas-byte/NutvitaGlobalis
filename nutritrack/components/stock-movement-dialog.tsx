
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
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/nutritrack/lib/utils';
import type { StockMovement, Commodity, HealthArea, AggregatedStockByBatch, CommodityProgram, Program } from '@/nutritrack/types';
import { useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/nutritrack/components/ui/tabs";


const createMovementSchema = (aggregatedStock: AggregatedStockByBatch[], healthAreas: HealthArea[]) => z.object({
  type: z.enum(['received', 'transferred', 'damaged', 'used']),
  date: z.date(),
  commodityId: z.string().min(1, 'Please select a commodity.'),
  program: z.enum(['SAM', 'MAM', 'SAM+', 'Both']).optional(),
  quantity: z.coerce.number().positive('Quantity must be positive.'),
  healthAreaId: z.string().min(1, "Health area is required."),
  batchNumber: z.string().min(1, 'Batch number is required.'),
  // Received specific
  source: z.enum(['WFP', 'UNICEF', 'DRPH', 'Other']).optional(),
  sourceOther: z.string().optional(),
  // Transferred specific
  transferredTo: z.string().optional(), // healthAreaId
  // Damaged / General
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'received') {
        if (!data.source) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Source is required.', path: ['source'] });
        }
        if (data.source === 'Other' && !data.sourceOther) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please specify the source.', path: ['sourceOther'] });
        }
    }
    if (data.type === 'transferred') {
        if (!data.transferredTo) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Destination health area is required.', path: ['transferredTo'] });
        }
         if (data.transferredTo === data.healthAreaId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cannot transfer to the same health area.', path: ['transferredTo'] });
        }
    }
    if (data.type === 'damaged') {
       if (!data.notes) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Reason for damage is required.', path: ['notes'] });
       }
    }
    
    // Check available stock for non-receive types
    if (data.type !== 'received' && data.batchNumber && data.quantity > 0 && data.healthAreaId) {
        const facility = healthAreas.find(ha => ha.id === data.healthAreaId);
        if (facility) {
             const selectedBatch = aggregatedStock.find(b => 
                b.commodityId === data.commodityId && 
                b.batchNumber === data.batchNumber &&
                b.healthFacilityName === facility.healthFacilityName
            );
            
            if (selectedBatch && data.quantity > selectedBatch.closingStock) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Exceeds available stock: ${selectedBatch.closingStock}`,
                    path: ['quantity'],
                });
            }
        }
    }
});


type MovementFormValues = z.infer<ReturnType<typeof createMovementSchema>>;
type StockMovementSaveData = Omit<StockMovement, 'id' | 'date'> & { date: Date };


interface StockMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StockMovementSaveData) => void;
  commodities: Commodity[];
  healthAreas: HealthArea[];
  currentHealthAreaId: string;
  aggregatedStock: AggregatedStockByBatch[];
}

export function StockMovementDialog({
  isOpen,
  onClose,
  onSave,
  commodities,
  healthAreas,
  currentHealthAreaId,
  aggregatedStock,
}: StockMovementDialogProps) {
  
  const movementSchema = createMovementSchema(aggregatedStock, healthAreas);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: 'received',
      date: new Date(),
      commodityId: '',
      quantity: 0,
      notes: '',
      batchNumber: '',
    },
  });
  
  const { control, reset, setValue } = form;
  const selectedType = useWatch({ control, name: 'type' });
  const selectedSource = useWatch({ control, name: 'source' });
  const selectedCommodityId = useWatch({ control, name: 'commodityId' });
  const selectedHealthAreaId = useWatch({ control, name: 'healthAreaId' });
  
  useEffect(() => {
    if (isOpen) {
        reset({
            type: 'received',
            date: new Date(),
            commodityId: '',
            quantity: 0,
            notes: '',
            healthAreaId: currentHealthAreaId !== 'all' ? currentHealthAreaId : '',
            source: undefined,
            sourceOther: '',
            batchNumber: '',
            transferredTo: '',
            program: undefined,
        });
    }
  }, [isOpen, reset, currentHealthAreaId]);

  const filteredCommodities = useMemo(() => {
    if (!selectedHealthAreaId) {
        return commodities;
    }
    const facility = healthAreas.find(ha => ha.id === selectedHealthAreaId);
    if (!facility || !facility.programs) {
        return commodities;
    }

    if (selectedType === 'transferred' || selectedType === 'damaged' || selectedType === 'used') {
      const stockCommodityIds = new Set(aggregatedStock.filter(s => s.healthFacilityName === facility.healthFacilityName).map(s => s.commodityId));
      return commodities.filter(c => stockCommodityIds.has(c.id));
    }


    const facilityPrograms: CommodityProgram[] = facility.programs.map(p => {
        if (p === 'TSFP') return 'MAM';
        if (p === 'OTP') return 'SAM';
        if (p === 'ITP') return 'SAM+';
        return p as CommodityProgram; // Should not happen
    });

    return commodities.filter(commodity => {
        return commodity.program === 'Both' || facilityPrograms.includes(commodity.program);
    });
}, [selectedHealthAreaId, healthAreas, commodities, aggregatedStock, selectedType]);
  
  const availableBatches = useMemo(() => {
    if (selectedType === 'received' || !selectedCommodityId || !selectedHealthAreaId) return [];
    
    const facility = healthAreas.find(ha => ha.id === selectedHealthAreaId);
    if (!facility) return [];
    
    return aggregatedStock.filter(
        (batch) => 
            batch.commodityId === selectedCommodityId &&
            batch.closingStock > 0 &&
            batch.healthFacilityName === facility.healthFacilityName
    );
  }, [selectedType, selectedCommodityId, selectedHealthAreaId, aggregatedStock, healthAreas]);

  const destinationHealthAreas = useMemo(() => {
    return healthAreas.filter(ha => ha.id !== selectedHealthAreaId)
  }, [healthAreas, selectedHealthAreaId]);


  const onSubmit = (data: MovementFormValues) => {
    onSave(data);
  };

  const getProgramDisplayName = (program: CommodityProgram) => {
      switch (program) {
        case 'SAM+': return 'SAM with Complications (ITP)';
        case 'SAM': return 'SAM (OTP)';
        case 'MAM': return 'MAM (TSFP)';
        case 'Both': return 'Both Programs';
        default: return program;
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Stock</DialogTitle>
          <DialogDescription>
             Record a new stock movement. Select the type of movement below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={control}
                name="type"
                render={({ field }) => (
                    <FormItem className="pt-2">
                        <FormControl>
                             <Tabs defaultValue={field.value} onValueChange={(value) => {
                                const newType = value as 'received' | 'transferred' | 'damaged' | 'used';
                                field.onChange(newType);
                                setValue('batchNumber', '');
                                if (newType !== 'received') {
                                    setValue('source', undefined);
                                    setValue('sourceOther', '');
                                    setValue('program', undefined);
                                }
                                if (newType !== 'transferred') {
                                    setValue('transferredTo', '');
                                }
                             }} className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="received">Receive</TabsTrigger>
                                    <TabsTrigger value="transferred">Transfer</TabsTrigger>
                                    <TabsTrigger value="damaged">Damage</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </FormControl>
                    </FormItem>
                )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
                 <FormField
                    control={control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Movement Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                date > new Date() || date < new Date("2020-01-01")
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.001" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
           
             <FormField
              control={control}
              name="healthAreaId"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>{selectedType === 'transferred' ? 'Transfer From' : 'Health Facility'}</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                        field.onChange(value);
                        setValue('batchNumber', '');
                        setValue('commodityId', '');
                    }} 
                    value={field.value}
                    disabled={currentHealthAreaId !== 'all'}
                   >
                      <FormControl>
                      <SelectTrigger>
                          <SelectValue placeholder="Select a health facility" />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                      {healthAreas.map(ha => (
                          <SelectItem key={ha.id} value={ha.id}>{ha.healthFacilityName}</SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                  </FormItem>
              )}
            />

            {selectedType === 'received' && (
                <FormField
                    control={control}
                    name="source"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="WFP">WFP</SelectItem>
                                <SelectItem value="UNICEF">UNICEF</SelectItem>
                                <SelectItem value="DRPH">DRPH</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
             {selectedSource === 'Other' && selectedType === 'received' && (
                  <FormField
                    control={control}
                    name="sourceOther"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Specify Other Source</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Local NGO" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            <FormField
              control={control}
              name="commodityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commodity</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                        field.onChange(value);
                        const commodity = commodities.find(c => c.id === value);
                        if (commodity) {
                           setValue('program', commodity.program);
                        }
                        setValue('batchNumber', '');
                    }} 
                    defaultValue={field.value}
                    disabled={!selectedHealthAreaId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedHealthAreaId ? 'Select facility first' : 'Select a commodity'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCommodities.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'received' && selectedCommodityId && (
                 <FormField
                    control={control}
                    name="program"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Program</FormLabel>
                            <FormControl>
                                <Input 
                                    readOnly 
                                    disabled
                                    value={getProgramDisplayName(field.value || 'Both')}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                 />
            )}
             
            <FormField
                control={control}
                name="batchNumber"
                render={({ field }) => {
                    if (selectedType === 'received') {
                         return (
                            <FormItem>
                                <FormLabel>Batch Number</FormLabel>
                                <FormControl>
                                <Input placeholder="Enter new batch number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                         )
                    }
                    return (
                        <FormItem>
                            <FormLabel>Batch Number</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={availableBatches.length === 0}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an available batch" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {availableBatches.map(b => (
                                    <SelectItem key={b.batchNumber} value={b.batchNumber}>
                                        {b.batchNumber} (Av: {b.closingStock})
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )
                }}
            />

             {selectedType === 'transferred' && (
              <FormField
                control={control}
                name="transferredTo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Transfer To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select destination health facility" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {destinationHealthAreas.map(ha => (
                            <SelectItem key={ha.id} value={ha.id}>{ha.healthFacilityName}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                     <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{selectedType === 'damaged' ? 'Reason for Damage' : 'Notes'}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={selectedType === 'damaged' ? 'e.g., Expired' : 'Optional notes'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Movement</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


