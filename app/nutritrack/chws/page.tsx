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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Plus, Warehouse, MoreVertical, Edit, Trash2, Contact, Printer, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, Send, Download } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/nutritrack/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/nutritrack/components/ui/dropdown-menu';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from '@/nutritrack/local-firestore';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { CHW, Village, HealthArea } from '@/nutritrack/types';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { AddEditChwDialog } from '@/nutritrack/components/add-edit-chw-dialog';
import { ChwIdentityCard } from '@/nutritrack/components/chw-identity-card';
import { useReactToPrint } from 'react-to-print';

export default function ChwsPage() {
  const { toast } = useToast();
  const [chws, setChws] = useState<CHW[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [healthAreas, setHealthAreas] = useState<HealthArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedChw, setSelectedChw] = useState<CHW | null>(null);
  const [chwToDelete, setChwToDelete] = useState<string | null>(null);

  const printComponentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
      contentRef: printComponentRef,
      onAfterPrint: () => setIsPreviewOpen(false),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [chwsSnapshot, villagesSnapshot, healthAreasSnapshot] = await Promise.all([
        getDocs(collection(db, 'chws')),
        getDocs(collection(db, 'villages')),
        getDocs(collection(db, 'healthAreas')),
      ]);
      const fetchedChws = chwsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CHW[];
      const fetchedVillages = villagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Village[];
      const fetchedHealthAreas = healthAreasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HealthArea[];
      
      setChws(fetchedChws);
      setVillages(fetchedVillages);
      setHealthAreas(fetchedHealthAreas);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ title: "Error", description: "Failed to fetch CHW data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleAddChw = () => {
    setSelectedChw(null);
    setIsDialogOpen(true);
  };

  const handleEditChw = (chw: CHW) => {
    setSelectedChw(chw);
    setIsDialogOpen(true);
  };
  
  const handlePrintChw = (chw: CHW) => {
      setSelectedChw(chw);
      setIsPreviewOpen(true);
  };

  const openDeleteConfirm = (id: string) => {
    setChwToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteChw = async () => {
    if (!chwToDelete) return;
    
    // Optimistic UI update
    setIsConfirmOpen(false);
    toast({ title: "Success", description: "CHW record deleted." });
    fetchData();
    
    try {
      await deleteDoc(doc(db, "chws", chwToDelete));
    } catch (error) {
      console.error("Error deleting CHW: ", error);
      toast({ title: "Error", description: "Failed to delete CHW record in background.", variant: "destructive" });
      fetchData(); // Re-fetch to revert optimistic update on error
    } finally {
      setChwToDelete(null);
    }
  };

 const handleSaveChw = async (data: Omit<CHW, 'id'>) => {
    // Optimistic UI update
    setIsDialogOpen(false);
    setSelectedChw(null);
    toast({ title: "Success", description: `CHW record ${selectedChw ? 'updated' : 'added'}.` });
    fetchData();

    try {
      if (selectedChw) {
          const chwRef = doc(db, 'chws', selectedChw.id);
          await updateDoc(chwRef, data);
      } else {
          await addDoc(collection(db, 'chws'), data);
      }
    } catch (error) {
      console.error("Error saving CHW:", error);
      toast({ title: "Save Failed", description: "Failed to save CHW data in the background.", variant: "destructive" });
      fetchData(); // Revert on error
    }
  };
  
  const selectedChwVillage = villages.find(v => v.id === selectedChw?.villageId);
  const selectedChwHealthArea = healthAreas.find(ha => ha.id === selectedChw?.healthAreaId);

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
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/community-mapping" group="settings" tooltip="Community Mapping"><MapIcon /><span>Community Mapping</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/chws" group="settings" isActive tooltip="CHWs"><Contact /><span>CHWs</span></SidebarMenuButton></SidebarMenuItem>
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
                  <h1 className="text-lg font-semibold">CHW Mapping</h1>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={handleAddChw} variant="secondary">
                    <Plus className="mr-2" />
                    Add CHW
                </Button>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Manage Community Health Workers (CHWs)</CardTitle>
                      <CardDescription>
                          A list of all CHWs involved in the program.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      {loading ? <p>Loading CHWs...</p> :
                      <Table>
                          <TableHeader>
                              <TableRow>
                                <TableHead>CHW ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Health Facility</TableHead>
                                <TableHead>Village Covered</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {chws.map((chw) => {
                                const village = villages.find(v => v.id === chw.villageId);
                                const healthArea = healthAreas.find(h => h.id === chw.healthAreaId);
                                return (
                                <TableRow key={chw.id}>
                                    <TableCell>{chw.chwId}</TableCell>
                                    <TableCell className="font-medium">{chw.firstName} {chw.lastName}</TableCell>
                                    <TableCell>{chw.phone}</TableCell>
                                    <TableCell>{healthArea?.healthFacilityName || 'N/A'}</TableCell>
                                    <TableCell>{village?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditChw(chw)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handlePrintChw(chw)}>
                                                    <Printer className="mr-2 h-4 w-4" />
                                                    <span>Print ID Card</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(chw.id)}>
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
       <AddEditChwDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSaveChw}
          chw={selectedChw}
          villages={villages}
          healthAreas={healthAreas}
      />
      <ConfirmationDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleDeleteChw}
          title="Delete CHW Record"
          description="Are you sure you want to delete this CHW's record? This action cannot be undone."
      />
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-max p-8">
            <DialogHeader>
                <DialogTitle>Print Preview - CHW ID Card</DialogTitle>
                <DialogDescription>
                This is a preview of the CHW's ID card. Click Print to continue.
                </DialogDescription>
            </DialogHeader>
            {selectedChw && selectedChwHealthArea && selectedChwVillage ? (
                <div className="flex justify-center">
                    <div ref={printComponentRef}>
                        <ChwIdentityCard chw={selectedChw} healthArea={selectedChwHealthArea} village={selectedChwVillage} />
                    </div>
                </div>
            ) : null}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Cancel
                </Button>
                <Button onClick={handlePrint} disabled={!selectedChw || !selectedChwHealthArea || !selectedChwVillage}>
                <Printer className="mr-2 h-4 w-4" />
                Print
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}




