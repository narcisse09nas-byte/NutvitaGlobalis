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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Plus, Warehouse, MoreVertical, Edit, Trash2, Contact, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, Send, Download } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/nutritrack/components/ui/dropdown-menu';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from '@/nutritrack/local-firestore';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Village, HealthArea } from '@/nutritrack/types';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { AddEditVillageDialog } from '@/nutritrack/components/add-edit-village-dialog';
import { MultiSelect } from '@/nutritrack/components/ui/multi-select';

type Option = { label: string; value: string };

export default function CommunityMappingPage() {
  const { toast } = useToast();
  const [villages, setVillages] = useState<Village[]>([]);
  const [healthAreas, setHealthAreas] = useState<HealthArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);
  const [villageToDelete, setVillageToDelete] = useState<string | null>(null);

  // Filter states
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedHealthAreas, setSelectedHealthAreas] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [villagesSnapshot, healthAreasSnapshot] = await Promise.all([
        getDocs(collection(db, 'villages')),
        getDocs(collection(db, 'healthAreas')),
      ]);
      const fetchedVillages = villagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Village[];
      const fetchedHealthAreas = healthAreasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HealthArea[];
      setVillages(fetchedVillages);
      setHealthAreas(fetchedHealthAreas);
    } catch (error) {
      console.error("Error fetching mapping data: ", error);
      toast({ title: "Error", description: "Failed to fetch mapping data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    return Array.from(new Set(filtered.map(ha => ha.healthArea))).map(haName => ({ label: haName, value: haName }));
  }, [healthAreas, selectedRegions, selectedDistricts]);

  const facilityOptions = useMemo(() => {
    let filtered = healthAreas;
    if (selectedRegions.length > 0) {
        filtered = filtered.filter(ha => selectedRegions.includes(ha.region));
    }
    if (selectedDistricts.length > 0) {
        filtered = filtered.filter(ha => selectedDistricts.includes(ha.healthDistrict));
    }
    if (selectedHealthAreas.length > 0) {
        filtered = filtered.filter(ha => selectedHealthAreas.includes(ha.healthArea));
    }
    return filtered.map(ha => ({ label: ha.healthFacilityName, value: ha.id }));
  }, [healthAreas, selectedRegions, selectedDistricts, selectedHealthAreas]);


  const filteredVillages = useMemo(() => {
    const healthAreaMap = new Map(healthAreas.map(ha => [ha.id, ha]));

    return villages.filter(village => {
        const healthArea = healthAreaMap.get(village.healthAreaId);
        if (!healthArea) return false;

        const regionMatch = selectedRegions.length === 0 || selectedRegions.includes(healthArea.region);
        const districtMatch = selectedDistricts.length === 0 || selectedDistricts.includes(healthArea.healthDistrict);
        const healthAreaMatch = selectedHealthAreas.length === 0 || selectedHealthAreas.includes(healthArea.healthArea);
        const facilityMatch = selectedFacilities.length === 0 || selectedFacilities.includes(village.healthAreaId);
        
        return regionMatch && districtMatch && healthAreaMatch && facilityMatch;
    });
  }, [villages, healthAreas, selectedRegions, selectedDistricts, selectedHealthAreas, selectedFacilities]);

  const handleAddVillage = () => {
    setSelectedVillage(null);
    setIsDialogOpen(true);
  };

  const handleEditVillage = (village: Village) => {
    setSelectedVillage(village);
    setIsDialogOpen(true);
  };
  
  const openDeleteConfirm = (id: string) => {
    setVillageToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteVillage = async () => {
    if (!villageToDelete) return;
    
    // Optimistic UI update
    setIsConfirmOpen(false);
    toast({ title: "Success", description: "Village deleted." });
    fetchData();
    
    try {
      await deleteDoc(doc(db, "villages", villageToDelete));
    } catch (error) {
      console.error("Error deleting village: ", error);
      toast({ title: "Error", description: "Failed to delete village in background.", variant: "destructive" });
      fetchData(); // Revert on error
    } finally {
      setVillageToDelete(null);
    }
  };

  const handleSaveVillage = async (data: Omit<Village, 'id'>) => {
    // Optimistic UI update
    setIsDialogOpen(false);
    setSelectedVillage(null);
    toast({ title: "Success", description: `Village ${selectedVillage ? 'updated' : 'added'}.` });
    fetchData();

    try {
      if (selectedVillage) {
          const villageRef = doc(db, 'villages', selectedVillage.id);
          await updateDoc(villageRef, data);
      } else {
          await addDoc(collection(db, 'villages'), data);
      }
    } catch (error) {
      console.error("Error saving village:", error);
      toast({ title: "Save Failed", description: "Failed to save village data in the background.", variant: "destructive" });
      fetchData(); // Revert on error
    }
  };
  
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
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/stock" group="operations" tooltip="Stock"><Warehouse /><span>Stock</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/supervision" group="operations" tooltip="Supervision"><ClipboardCheck /><span>Supervision</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-activities" group="operations" tooltip="Community Activities"><Group /><span>Community Activities</span></SidebarMenuButton></SidebarMenuItem>
                
                <SidebarMenuLabel>Settings</SidebarMenuLabel>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/health-areas" group="settings" tooltip="Health Areas"><MapIcon /><span>Health Areas</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-mapping" group="settings" isActive tooltip="Community Mapping"><MapIcon /><span>Community Mapping</span></SidebarMenuButton></SidebarMenuItem>
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
            <header className="sticky top-0 z-30 flex h-auto flex-col gap-2 border-b bg-primary px-4 py-2 text-white sm:px-6">
              <div className="flex h-16 items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden text-white" />
                    <h1 className="text-lg font-semibold">Community Mapping</h1>
                </div>
                <div className="flex items-center gap-4">
                  <Button onClick={handleAddVillage} variant="secondary">
                      <Plus className="mr-2" />
                      Add Village/Quartier
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <MultiSelect options={regionOptions} selected={selectedRegions} onChange={setSelectedRegions} placeholder="All Regions" className="w-[180px]" />
                <MultiSelect options={districtOptions} selected={selectedDistricts} onChange={setSelectedDistricts} placeholder="All Districts" className="w-[180px]" />
                <MultiSelect options={healthAreaOptions} selected={selectedHealthAreas} onChange={setSelectedHealthAreas} placeholder="All Health Areas" className="w-[180px]" />
                <MultiSelect options={facilityOptions} selected={selectedFacilities} onChange={setSelectedFacilities} placeholder="All Health Facilities" className="w-[220px]" />
             </div>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Manage Villages/Quartiers</CardTitle>
                      <CardDescription>
                          A list of all communities covered by the program.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      {loading ? <p>Loading villages...</p> :
                      <Table>
                          <TableHeader>
                              <TableRow>
                              <TableHead>Village ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Est. Pop. Village</TableHead>
                              <TableHead>CHWs</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {filteredVillages.map((village) => {
                                return (
                                <TableRow key={village.id}>
                                    <TableCell>{village.villageId}</TableCell>
                                    <TableCell className="font-medium">{village.name}</TableCell>
                                    <TableCell>{village.estimatedPopulation}</TableCell>
                                    <TableCell>{village.chwCount}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditVillage(village)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(village.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                )
                              })}
                          </TableBody>
                      </Table>}
                  </CardContent>
              </Card>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
       <AddEditVillageDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSaveVillage}
          village={selectedVillage}
          healthAreas={healthAreas}
      />
      <ConfirmationDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleDeleteVillage}
          title="Delete Village"
          description="Are you sure you want to delete this village? This action cannot be undone."
      />
    </>
  );
}




