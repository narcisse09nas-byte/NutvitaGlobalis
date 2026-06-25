'use client';

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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, Plus, MoreVertical, Edit, Trash2, Calendar as CalendarIcon, Send, Contact, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, Download } from 'lucide-react';
import { Logo } from '@/nutritrack/components/logo';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/nutritrack/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { Badge } from '@/nutritrack/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/nutritrack/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/nutritrack/components/ui/tabs';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, query, where, Timestamp, doc, updateDoc, deleteDoc, addDoc, onSnapshot } from '@/nutritrack/local-firestore';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { StockMovement, Commodity, HealthArea, AggregatedStockByBatch, CommodityProgram } from '@/nutritrack/types';
import { StockMovementDialog } from '@/nutritrack/components/stock-movement-dialog';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/nutritrack/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/nutritrack/components/ui/popover';
import { Calendar } from '@/nutritrack/components/ui/calendar';
import { cn } from '@/nutritrack/lib/utils';
import { MultiSelect } from '@/nutritrack/components/ui/multi-select';

type EnrichedStockMovement = StockMovement & { commodityName: string; unit: string; healthFacilityName: string; };
type StockMovementSaveData = Omit<StockMovement, 'id' | 'date'> & { date: Date };
type Option = { label: string; value: string };

const movementTypeOptions: Option[] = [
    { value: 'received', label: 'Received' },
    { value: 'used', label: 'Used' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'damaged', label: 'Damaged' },
];

export default function StockPage() {
  const { toast } = useToast();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [healthAreas, setHealthAreas] = useState<HealthArea[]>([]);

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 29));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedHealthAreas, setSelectedHealthAreas] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedMovementTypes, setSelectedMovementTypes] = useState<string[]>([]);
  
  const [aggregatedStock, setAggregatedStock] = useState<AggregatedStockByBatch[]>([]);
  const [movements, setMovements] = useState<EnrichedStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for StockMovementDialog
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  
  // State for Confirmation
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<string | null>(null);

  // Date picker popover states
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);


  const fetchInitialData = useCallback(async () => {
      setLoading(true);
      try {
        const commoditiesUnsub = onSnapshot(collection(db, 'commodities'), (snapshot) => {
             setCommodities(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Commodity[]);
        });
        
        const healthAreasUnsub = onSnapshot(collection(db, 'healthAreas'), (snapshot) => {
            setHealthAreas(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as HealthArea[]);
        });
        
        return () => {
            commoditiesUnsub();
            healthAreasUnsub();
        }

      } catch (error) {
        console.error("Error fetching initial data: ", error);
        toast({ title: "Error", description: "Failed to fetch initial data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const regionOptions = useMemo(() => Array.from(new Set(healthAreas.map(ha => ha.region))).map(r => ({ label: r, value: r })), [healthAreas]);
  
  const districtOptions = useMemo(() => {
    let filtered = healthAreas;
    if (selectedRegions.length > 0) {
      filtered = healthAreas.filter(ha => selectedRegions.includes(ha.region));
    }
    return Array.from(new Set(filtered.map(ha => ha.healthDistrict))).map(d => ({ label: d, value: d }));
  }, [healthAreas, selectedRegions]);
  
  const healthAreaOptions = useMemo(() => {
    let filtered = healthAreas;
    if (selectedRegions.length > 0) {
        filtered = filtered.filter(ha => selectedRegions.includes(ha.region));
    }
    if (selectedDistricts.length > 0) {
        filtered = filtered.filter(ha => selectedDistricts.includes(ha.healthDistrict));
    }
    return Array.from(new Set(filtered.map(ha => ha.healthArea))).map(ha => ({ label: ha, value: ha }));
  }, [healthAreas, selectedRegions, selectedDistricts]);

  const facilityOptions = useMemo(() => {
     let filtered = healthAreas;
     if (selectedRegions.length > 0) {
        filtered = filtered.filter(ha => selectedRegions.includes(ha.region));
     }
     if (selectedDistricts.length > 0) {
        filtered = filtered.filter(ha => selectedDistricts.includes(ha.healthDistrict));
     }
     if(selectedHealthAreas.length > 0) {
        filtered = filtered.filter(ha => selectedHealthAreas.includes(ha.healthArea));
     }
     return filtered.map(f => ({ label: f.healthFacilityName, value: f.id }));
  }, [healthAreas, selectedRegions, selectedDistricts, selectedHealthAreas]);


 const fetchMovementsAndAggregate = useCallback(async () => {
    setLoading(true);

    if (!startDate || !endDate || commodities.length === 0 || healthAreas.length === 0) {
        setLoading(false);
        return;
    }

    try {
        let movementsQuery = collection(db, 'stockMovements');
        const queryConstraints = [];

        // Facility filter is primary
        const facilityIdsToFilter = selectedFacilities.length > 0 ? selectedFacilities : facilityOptions.map(f => f.value);
        if (facilityIdsToFilter.length > 0) {
            queryConstraints.push(where('healthAreaId', 'in', facilityIdsToFilter));
        } else {
            // If no facilities are selected (e.g., due to other filters), show nothing
            setMovements([]);
            setAggregatedStock([]);
            setLoading(false);
            return;
        }

        // Date filter for movements
        queryConstraints.push(where('date', '>=', Timestamp.fromDate(startOfDay(startDate))));
        queryConstraints.push(where('date', '<=', Timestamp.fromDate(endOfDay(endDate))));

        // Type filter for movements
        if (selectedMovementTypes.length > 0) {
            queryConstraints.push(where('type', 'in', selectedMovementTypes));
        }

        const q = query(movementsQuery, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        
        const commodityMap = new Map(commodities.map(c => [c.id, c]));
        const healthAreaMap = new Map(healthAreas.map(ha => [ha.id, ha]));

        const enrichedMovements = querySnapshot.docs.map(doc => {
            const movement = { id: doc.id, ...doc.data() } as StockMovement;
            const commodity = commodityMap.get(movement.commodityId);
            const healthArea = healthAreaMap.get(movement.healthAreaId);
            return {
                ...movement,
                commodityName: commodity?.name || 'Unknown',
                unit: commodity?.unit || 'unit',
                healthFacilityName: healthArea?.healthFacilityName || 'Unknown',
            };
        }).sort((a, b) => b.date.toMillis() - a.date.toMillis());

        setMovements(enrichedMovements);

        // --- Aggregation Logic ---
        const allMovementsForAggregationQuery = query(collection(db, 'stockMovements'), where('healthAreaId', 'in', facilityIdsToFilter));
        const allMovementsSnapshot = await getDocs(allMovementsForAggregationQuery);
        const allMovements = allMovementsSnapshot.docs.map(doc => doc.data() as StockMovement);

        const stockByBatch: Record<string, AggregatedStockByBatch> = {};

        allMovements.forEach(m => {
            const key = `${m.healthAreaId}-${m.commodityId}-${m.batchNumber || 'No Batch'}`;
            if (!stockByBatch[key]) {
                const commodity = commodityMap.get(m.commodityId);
                const healthArea = healthAreaMap.get(m.healthAreaId);
                stockByBatch[key] = {
                    commodityId: m.commodityId,
                    commodityName: commodity?.name || 'Unknown',
                    unit: commodity?.unit || 'unit',
                    batchNumber: m.batchNumber || 'No Batch',
                    openingStock: 0, received: 0, used: 0, transferred: 0, damaged: 0, closingStock: 0,
                    healthFacilityName: healthArea?.healthFacilityName || 'Unknown',
                };
            }
            const record = stockByBatch[key];
            const movementDate = m.date.toDate();

            if (movementDate < startOfDay(startDate)) {
                if (m.type === 'received') record.openingStock += m.quantity;
                else record.openingStock -= m.quantity;
            } else if (movementDate <= endOfDay(endDate)) {
                switch (m.type) {
                    case 'received': record.received += m.quantity; break;
                    case 'used': record.used += m.quantity; break;
                    case 'transferred': record.transferred += m.quantity; break;
                    case 'damaged': record.damaged += m.quantity; break;
                }
            }
        });

        Object.values(stockByBatch).forEach(record => {
            record.closingStock = record.openingStock + record.received - record.used - record.transferred - record.damaged;
        });

        setAggregatedStock(Object.values(stockByBatch).filter(r => r.closingStock > 0 || r.openingStock > 0 || r.received > 0 || r.used > 0 || r.transferred > 0 || r.damaged > 0));

    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "Could not fetch stock data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [startDate, endDate, commodities, healthAreas, selectedFacilities, selectedMovementTypes, facilityOptions, toast]);
  
  useEffect(() => {
    if (commodities.length > 0 && healthAreas.length > 0) {
        fetchMovementsAndAggregate();
    }
  }, [commodities, healthAreas, fetchMovementsAndAggregate, startDate, endDate, selectedFacilities, selectedMovementTypes]);

  const handleSaveMovement = async (data: StockMovementSaveData) => {
    const saveData = async (payload: Partial<StockMovementSaveData>) => {
      const { date, ...movementFields } = payload;
      const movementData: Partial<StockMovement> = { ...movementFields };
      
      if(movementData.source === undefined) delete movementData.source;
      if(movementData.sourceOther === undefined) delete movementData.sourceOther;
      if(movementData.transferredTo === undefined) delete movementData.transferredTo;
      if(movementData.notes === undefined) delete movementData.notes;
      if(movementData.batchNumber === undefined) delete movementData.batchNumber;
      if(movementData.program === undefined) delete movementData.program;

      movementData.date = Timestamp.fromDate(date!)

      if (!movementData.healthAreaId) {
        throw new Error("A health area must be selected to record a movement.");
      }
      await addDoc(collection(db, 'stockMovements'), movementData);
    };

    try {
        if (data.type === 'transferred' && data.transferredTo) {
            const transferOutData = { ...data };
            const receiveData: Partial<StockMovementSaveData> = {
                ...data,
                type: 'received',
                healthAreaId: data.transferredTo,
                notes: `Transferred from ${healthAreas.find(ha => ha.id === data.healthAreaId)?.healthFacilityName ?? 'Unknown'}`,
                source: 'Internal Transfer',
            };
            delete receiveData.transferredTo;
            
            await saveData(transferOutData);
            await saveData(receiveData);
        } else {
             await saveData(data);
        }

        toast({ title: 'Success', description: 'Stock movement recorded.' });
        await fetchMovementsAndAggregate();

    } catch (error) {
        const err = error as Error;
        console.error("Error saving stock movement: ", err);
        toast({ title: 'Error', description: err.message || 'Failed to save stock movement.', variant: 'destructive' });
    } finally {
        setIsMovementDialogOpen(false);
    }
  };
  
  const openDeleteConfirm = (id: string) => {
    setMovementToDelete(id);
    setIsConfirmOpen(true);
  };

   const handleDeleteMovement = async () => {
    if (!movementToDelete) return;

    try {
      await deleteDoc(doc(db, "stockMovements", movementToDelete));
      toast({ title: "Success", description: "Stock movement deleted." });
      await fetchMovementsAndAggregate(); // Refresh the list
    } catch (error) {
      console.error("Error deleting stock movement: ", error);
      toast({ title: "Error", description: "Failed to delete stock movement.", variant: "destructive" });
    } finally {
      setMovementToDelete(null);
    }
  };

  const handleConfirmDelete = () => {
    if (movementToDelete) {
        handleDeleteMovement();
    }
    setIsConfirmOpen(false);
  };

  const getMovementNotes = (m: EnrichedStockMovement) => {
    let notes = [];
    if (m.type === 'received') {
        if (m.source === 'Internal Transfer') {
             if(m.notes) notes.push(m.notes);
        } else if (m.source) {
            notes.push(`Source: ${m.source === 'Other' ? m.sourceOther : m.source}`);
        }
    }
    if (m.batchNumber) {
        notes.push(`Batch: ${m.batchNumber}`);
    }
    if(m.notes && m.source !== 'Internal Transfer') notes.push(m.notes);
    return notes.join('; ');
  }

  const formatDecimal = (num: number, unit: string) => {
    if (typeof num !== 'number' || isNaN(num)) {
        num = 0;
    }
    if (unit === 'MT') {
        return num.toFixed(3);
    }
    if (unit === 'kg') {
        return num.toFixed(1);
    }
    if (unit === 'ml') {
        return num.toFixed(0);
    }
    return Math.round(num).toString();
  };

  const stockByHealthFacility = useMemo(() => {
    return aggregatedStock.reduce((acc, item) => {
      const facilityName = item.healthFacilityName || 'Unknown Facility';
      if (!acc[facilityName]) {
        acc[facilityName] = { commodities: {} };
      }
      if (!acc[facilityName].commodities[item.commodityId]) {
          acc[facilityName].commodities[item.commodityId] = {
              commodityName: item.commodityName,
              unit: item.unit,
              batches: []
          };
      }
      acc[facilityName].commodities[item.commodityId].batches.push(item);
      return acc;
    }, {} as Record<string, { commodities: Record<string, { commodityName: string; unit: string; batches: AggregatedStockByBatch[] }> }>);
  }, [aggregatedStock]);

  
  return (
    <>
      <SidebarProvider>
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
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/admissions" group="operations" tooltip="Admissions"><PlusCircle /><span>Admissions</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/children" group="operations" tooltip="Children Register"><Users /><span>Children Register</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/incoming-referrals" group="operations" tooltip="Incoming Referrals"><Download /><span>Incoming Referrals</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/referred-out" group="operations" tooltip="Referred Out"><Send /><span>Referred Out</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/special-attention" group="operations" tooltip="Special Attention"><AlertTriangle /><span>Special Attention</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/stock" group="operations" isActive tooltip="Stock"><Warehouse /><span>Stock</span></SidebarMenuButton></SidebarMenuItem>
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
            <header className="sticky top-0 z-30 flex flex-col gap-2 border-b bg-primary px-4 py-2 text-white sm:px-6">
              <div className="flex h-14 items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden text-white" />
                    <h1 className="text-lg font-semibold">Stock Management</h1>
                </div>
                <div className='flex items-center gap-2'>
                    <div className="flex items-center gap-2">
                      <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                          <PopoverTrigger asChild>
                          <Button
                              variant={"outline"}
                              className={cn(
                              "w-[180px] justify-start text-left font-normal text-black",
                              !startDate && "text-muted-foreground"
                              )}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "PPP") : <span>Start date</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={(date) => {setStartDate(date); setIsStartDatePickerOpen(false);}}
                              initialFocus
                          />
                          </PopoverContent>
                      </Popover>
                      <span className="text-white">-</span>
                      <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                          <PopoverTrigger asChild>
                          <Button
                              variant={"outline"}
                              className={cn(
                              "w-[180px] justify-start text-left font-normal text-black",
                              !endDate && "text-muted-foreground"
                              )}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : <span>End date</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={(date) => {setEndDate(date); setIsEndDatePickerOpen(false);}}
                              initialFocus
                          />
                          </PopoverContent>
                      </Popover>
                    </div>
                </div>
              </div>
               <div className="flex items-center gap-2">
                  <MultiSelect options={regionOptions} selected={selectedRegions} onChange={setSelectedRegions} placeholder="All Regions" className="w-[180px]" />
                  <MultiSelect options={districtOptions} selected={selectedDistricts} onChange={setSelectedDistricts} placeholder="All Districts" className="w-[180px]" />
                  <MultiSelect options={healthAreaOptions} selected={selectedHealthAreas} onChange={setSelectedHealthAreas} placeholder="All Health Areas" className="w-[180px]" />
                  <MultiSelect options={facilityOptions} selected={selectedFacilities} onChange={setSelectedFacilities} placeholder="All Health Facilities" className="w-[220px]" />
                  <MultiSelect options={movementTypeOptions} selected={selectedMovementTypes} onChange={setSelectedMovementTypes} placeholder="All Movement Types" className="w-[220px]" />
               </div>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
               <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="overview">Stock Overview</TabsTrigger>
                      <TabsTrigger value="movements">Stock Movements</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                      <Card>
                          <CardHeader>
                              <CardTitle>Current Inventory</CardTitle>
                              <CardDescription>Aggregated overview of all commodities in the selected health facility(s).</CardDescription>
                          </CardHeader>
                          <CardContent>
                              {loading ? <p>Loading stock...</p> :
                               Object.keys(stockByHealthFacility).length === 0 ? (
                                  <div className="text-center text-muted-foreground py-10">No stock data to display.</div>
                              ) :
                              <Accordion type="multiple" defaultValue={Object.keys(stockByHealthFacility)} className="w-full">
                                  {Object.entries(stockByHealthFacility).map(([facilityName, facilityData]) => (
                                      <AccordionItem value={facilityName} key={facilityName}>
                                          <AccordionTrigger className="font-semibold text-lg">{facilityName}</AccordionTrigger>
                                          <AccordionContent>
                                              {Object.entries(facilityData.commodities).map(([commodityId, commodityData]) => (
                                                  <div key={commodityId} className="mb-4">
                                                       <h4 className='font-medium text-md mb-2'>{commodityData.commodityName} <span className='text-sm text-muted-foreground'>({commodityData.unit})</span></h4>
                                                       <Table>
                                                          <TableHeader>
                                                              <TableRow>
                                                                  <TableHead>Batch</TableHead>
                                                                  <TableHead className='text-right'>Opening</TableHead>
                                                                  <TableHead className='text-right'>Received</TableHead>
                                                                  <TableHead className='text-right'>Used</TableHead>
                                                                  <TableHead className='text-right'>Transferred</TableHead>
                                                                  <TableHead className='text-right'>Damaged</TableHead>
                                                                  <TableHead className="font-bold text-right">Closing</TableHead>
                                                              </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                              {commodityData.batches.map(batch => (
                                                              <TableRow key={batch.batchNumber}>
                                                                  <TableCell><Badge variant="secondary">{batch.batchNumber}</Badge></TableCell>
                                                                  <TableCell className='text-right'>{formatDecimal(batch.openingStock, batch.unit)}</TableCell>
                                                                  <TableCell className="text-green-600 text-right">{formatDecimal(batch.received, batch.unit)}</TableCell>
                                                                  <TableCell className="text-red-600 text-right">{formatDecimal(batch.used, batch.unit)}</TableCell>
                                                                  <TableCell className="text-orange-600 text-right">{formatDecimal(batch.transferred, batch.unit)}</TableCell>
                                                                  <TableCell className="text-red-600 text-right">{formatDecimal(batch.damaged, batch.unit)}</TableCell>
                                                                  <TableCell className="font-bold text-right">{formatDecimal(batch.closingStock, batch.unit)}</TableCell>
                                                              </TableRow>
                                                              ))}
                                                          </TableBody>
                                                      </Table>
                                                  </div>
                                              ))}
                                          </AccordionContent>
                                      </AccordionItem>
                                      ))}
                              </Accordion>
                              }
                          </CardContent>
                      </Card>
                  </TabsContent>
                   <TabsContent value="movements">
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                              <div>
                                  <CardTitle>Inventory Log</CardTitle>
                                  <CardDescription>Detailed history of all stock movements.</CardDescription>
                              </div>
                              <Button onClick={() => setIsMovementDialogOpen(true)}>
                                  <Plus className="mr-2" />
                                  Manage Stock
                              </Button>
                          </CardHeader>
                          <CardContent>
                               {loading ? <p>Loading movements...</p> :
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Facility</TableHead>
                                          <TableHead>Commodity</TableHead>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Program</TableHead>
                                          <TableHead>Quantity</TableHead>
                                          <TableHead>Notes</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {movements.length > 0 ? (
                                          movements.map((m) => (
                                          <TableRow key={m.id}>
                                              <TableCell>{m.date ? format(m.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                                              <TableCell>{m.healthFacilityName}</TableCell>
                                              <TableCell>{m.commodityName}</TableCell>
                                              <TableCell><Badge variant="outline" className="capitalize">{m.type}</Badge></TableCell>
                                              <TableCell>
                                                {m.type === 'received' && m.program && <Badge variant="secondary">{m.program}</Badge>}
                                              </TableCell>
                                              <TableCell>{formatDecimal(m.quantity, m.unit)} {m.unit}(s)</TableCell>
                                              <TableCell>{getMovementNotes(m)}</TableCell>
                                              <TableCell className="text-right">
                                                  <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                          <Button variant="ghost" className="h-8 w-8 p-0">
                                                              <span className="sr-only">Open menu</span>
                                                              <MoreVertical className="h-4 w-4" />
                                                          </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(m.id)}>
                                                              <Trash2 className="mr-2 h-4 w-4" />
                                                              <span>Delete</span>
                                                          </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                  </DropdownMenu>
                                              </TableCell>
                                          </TableRow>
                                      ))
                                      ) : (
                                          <TableRow>
                                              <TableCell colSpan={8} className="h-24 text-center">
                                                  No stock movements recorded for the selected filters.
                                              </TableCell>
                                          </TableRow>
                                      )}
                                  </TableBody>
                              </Table>}
                          </CardContent>
                      </Card>
                   </TabsContent>
               </Tabs>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    
    <StockMovementDialog
        isOpen={isMovementDialogOpen}
        onClose={() => setIsMovementDialogOpen(false)}
        onSave={handleSaveMovement}
        commodities={commodities}
        healthAreas={healthAreas}
        currentHealthAreaId={selectedFacilities.length === 1 ? selectedFacilities[0] : 'all'}
        aggregatedStock={aggregatedStock}
    />
    
    <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Stock Movement"
        description="Are you sure you want to delete this stock movement? This action cannot be undone."
    />
    </>
  );
}

    



