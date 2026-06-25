

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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, Plus, MoreVertical, Edit, Trash2, Contact, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, Send, Download } from 'lucide-react';
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
import { Badge, BadgeProps } from '@/nutritrack/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/nutritrack/components/ui/dropdown-menu';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, onSnapshot } from '@/nutritrack/local-firestore';
import { useEffect, useState, useCallback } from 'react';
import type { Commodity } from '@/nutritrack/types';
import { AddEditCommodityDialog } from '@/nutritrack/components/add-edit-commodity-dialog';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { useToast } from '@/nutritrack/hooks/use-toast';

export default function SettingsPage() {
    const { toast } = useToast();
    const [commodities, setCommodities] = useState<Commodity[]>([]);
    const [loading, setLoading] = useState(true);
    
    // State for Commodity Management
    const [isCommodityDialogOpen, setIsCommodityDialogOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedCommodity, setSelectedCommodity] = useState<Commodity | null>(null);
    const [commodityToDelete, setCommodityToDelete] = useState<string | null>(null);

    const fetchCommodities = useCallback(async () => {
        setLoading(true);
        try {
            const commoditiesUnsub = onSnapshot(collection(db, 'commodities'), (snapshot) => {
                setCommodities(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Commodity[]);
                setLoading(false);
            });
            return () => commoditiesUnsub();
        } catch (error) {
            console.error("Error fetching commodities: ", error);
            toast({ title: "Error", description: "Failed to fetch commodities.", variant: "destructive" });
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCommodities();
    }, [fetchCommodities]);


    const handleAddCommodity = () => {
        setSelectedCommodity(null);
        setIsCommodityDialogOpen(true);
    };

    const handleEditCommodity = (commodity: Commodity) => {
        setSelectedCommodity(commodity);
        setIsCommodityDialogOpen(true);
    };
    
    const openDeleteConfirm = (id: string) => {
        setCommodityToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleDeleteCommodity = async () => {
        if (!commodityToDelete) return;
        
        // Optimistic UI Update
        setIsConfirmOpen(false);
        toast({ title: "Success", description: "Commodity deleted." });
        fetchCommodities();

        try {
            await deleteDoc(doc(db, "commodities", commodityToDelete));
        } catch (error) {
            console.error("Error deleting commodity: ", error);
            toast({ title: "Error", description: "Failed to delete commodity in the background.", variant: "destructive" });
            fetchCommodities(); // Revert on error
        } finally {
            setCommodityToDelete(null);
        }
    };

    const handleSaveCommodity = async (data: Omit<Commodity, 'id'>) => {
        // Optimistic UI Update
        setIsCommodityDialogOpen(false);
        setSelectedCommodity(null);
        toast({ title: "Success", description: `Commodity ${selectedCommodity ? 'updated' : 'added'}.` });
        fetchCommodities();

        try {
            if (selectedCommodity) {
                const commodityRef = doc(db, 'commodities', selectedCommodity.id);
                await updateDoc(commodityRef, data);
            } else {
                await addDoc(collection(db, 'commodities'), data);
            }
        } catch (error) {
            console.error("Error saving commodity:", error);
            toast({ title: "Save Failed", description: "Failed to save commodity data in the background.", variant: "destructive" });
            fetchCommodities(); // Revert on error
        }
    };

    const getProgramBadgeVariant = (program: Commodity['program']): BadgeProps['variant'] => {
        switch (program) {
            case 'SAM':
            case 'SAM+':
                return 'destructive';
            case 'MAM':
                return 'accent';
            case 'Both':
                return 'default';
            default:
                return 'secondary';
        }
    };

  return (
    <>
    <div className="flex min-h-screen bg-background">
      <SidebarProvider>
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
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/chws" group="settings" tooltip="CHWs"><Contact /><span>CHWs</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/settings" group="settings" isActive tooltip="Commodities"><Settings /><span>Commodities</span></SidebarMenuButton></SidebarMenuItem>
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
                <h1 className="text-lg font-semibold">Settings</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                    <CardTitle>Commodity Management</CardTitle>
                    <CardDescription>
                        Create and manage all commodities used in the program.
                    </CardDescription>
                    </div>
                    <Button onClick={handleAddCommodity}>
                    <Plus className="mr-2" />
                    Add Commodity
                </Button>
                </CardHeader>
                <CardContent>
                    {loading ? <p>Loading commodities...</p> :
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {commodities.map((commodity) => (
                            <TableRow key={commodity.id}>
                                <TableCell className="font-medium">{commodity.name}</TableCell>
                                <TableCell><Badge variant="secondary">{commodity.type}</Badge></TableCell>
                                <TableCell>
                                    <Badge variant="outline">{commodity.unit}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getProgramBadgeVariant(commodity.program)}>
                                        {commodity.program === 'SAM+' ? 'SAM with Medical Complications' : commodity.program}
                                    </Badge>
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
                                            <DropdownMenuItem onClick={() => handleEditCommodity(commodity)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(commodity.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>}
                </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
    <AddEditCommodityDialog
        isOpen={isCommodityDialogOpen}
        onClose={() => setIsCommodityDialogOpen(false)}
        onSave={handleSaveCommodity}
        commodity={selectedCommodity}
    />
    <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteCommodity}
        title={"Delete Commodity"}
        description={"Are you sure you want to delete this commodity? This action cannot be undone."}
    />
    </>
  );
}




