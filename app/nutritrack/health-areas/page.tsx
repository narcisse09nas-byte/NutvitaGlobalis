

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
import { useEffect, useState, useCallback } from 'react';
import type { HealthArea } from '@/nutritrack/types';
import { AddEditHealthAreaDialog } from '@/nutritrack/components/add-edit-health-area-dialog';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { Badge } from '@/nutritrack/components/ui/badge';

export default function HealthAreasPage() {
  const { toast } = useToast();
  const [healthAreas, setHealthAreas] = useState<HealthArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedHealthArea, setSelectedHealthArea] = useState<HealthArea | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

  const fetchHealthAreas = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'healthAreas'));
      const fetchedAreas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HealthArea[];
      setHealthAreas(fetchedAreas);
    } catch (error) {
      console.error("Error fetching health areas: ", error);
      toast({ title: "Error", description: "Failed to fetch health areas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHealthAreas();
  }, [fetchHealthAreas]);

  const handleAddArea = () => {
    setSelectedHealthArea(null);
    setIsDialogOpen(true);
  };

  const handleEditArea = (area: HealthArea) => {
    setSelectedHealthArea(area);
    setIsDialogOpen(true);
  };
  
  const openDeleteConfirm = (id: string) => {
    setAreaToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteArea = async () => {
    if (!areaToDelete) return;

    // Optimistic UI update
    setHealthAreas(prev => prev.filter(area => area.id !== areaToDelete));
    setIsConfirmOpen(false);
    setAreaToDelete(null);
    toast({ title: "Success", description: "Health area deleted." });

    try {
      await deleteDoc(doc(db, "healthAreas", areaToDelete));
    } catch (error) {
      console.error("Error deleting health area: ", error);
      toast({ title: "Error", description: "Failed to delete health area in the background.", variant: "destructive" });
      fetchHealthAreas(); // Re-fetch to revert optimistic update on error
    }
  };

  const handleSaveArea = (data: Omit<HealthArea, 'id'>) => {
    // Optimistic UI update
    setIsDialogOpen(false);
    toast({ title: "Success", description: `Health area ${selectedHealthArea ? 'updated' : 'added'}.` });
    fetchHealthAreas();

    const save = async () => {
      try {
        if (selectedHealthArea) {
            const areaRef = doc(db, 'healthAreas', selectedHealthArea.id);
            await updateDoc(areaRef, data);
        } else {
            await addDoc(collection(db, 'healthAreas'), data);
        }
      } catch (error) {
        console.error("Error saving health area:", error);
        toast({ title: "Save Failed", description: "Failed to save health area data in the background.", variant: "destructive" });
        fetchHealthAreas(); // Revert on error
      } finally {
        setSelectedHealthArea(null);
      }
    };
    
    save();
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
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/health-areas" group="settings" isActive tooltip="Health Areas"><MapIcon /><span>Health Areas</span></SidebarMenuButton></SidebarMenuItem>
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
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 text-white sm:px-6">
               <div className="flex items-center gap-2">
                  <SidebarTrigger className="md:hidden text-white" />
                  <h1 className="text-lg font-semibold">Health Facilities</h1>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={handleAddArea} variant="secondary">
                    <Plus className="mr-2" />
                    Create Health Facility
                </Button>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Manage Health Facilities</CardTitle>
                      <CardDescription>
                          Create and manage all health facilities.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      {loading ? <p>Loading health areas...</p> :
                      <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                              <TableHead>HQ/Global</TableHead>
                              <TableHead>Health Facility Name</TableHead>
                              <TableHead>Health Zone/Area</TableHead>
                              <TableHead>Sub-Division</TableHead>
                              <TableHead>Division/District</TableHead>
                              <TableHead>Region</TableHead>
                              <TableHead>Country</TableHead>
                              <TableHead>Programs</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {healthAreas.map((area) => (
                              <TableRow key={area.id}>
                                  <TableCell>{area.hqGlobal}</TableCell>
                                  <TableCell className="font-medium">{area.healthFacilityName}</TableCell>
                                  <TableCell>{area.healthArea}</TableCell>
                                  <TableCell>{area.subDivision}</TableCell>
                                  <TableCell>{area.healthDistrict}</TableCell>
                                  <TableCell>{area.region}</TableCell>
                                  <TableCell>{area.country}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1 flex-wrap">
                                        {area.programs?.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditArea(area)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(area.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                              </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                      </div>}
                  </CardContent>
              </Card>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
       <AddEditHealthAreaDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSaveArea}
          healthArea={selectedHealthArea}
      />
      <ConfirmationDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleDeleteArea}
          title="Delete Health Area"
          description="Are you sure you want to delete this health area? This action cannot be undone."
      />
    </>
  );
}




