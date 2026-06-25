

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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, Contact, Bed, HeartPulse, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, UserPlus, Send, MoreVertical, CheckCircle, XCircle, Download, Trash2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/nutritrack/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, query, where, doc, updateDoc, Timestamp, deleteDoc, writeBatch } from '@/nutritrack/local-firestore';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Child, HealthArea } from '@/nutritrack/types';
import { format } from 'date-fns';
import { Badge } from '@/nutritrack/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { Checkbox } from '@/nutritrack/components/ui/checkbox';


export default function ReferredOutPage() {
  const [referredChildren, setReferredChildren] = useState<Child[]>([]);
  const [healthAreas, setHealthAreas] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ type: 'updateStatus' | 'delete' | 'deleteMultiple'; payload: any } | null>(null);

  const fetchReferredChildren = useCallback(async () => {
    setLoading(true);
    try {
      const healthAreasSnapshot = await getDocs(collection(db, 'healthAreas'));
      const areasMap = new Map<string, string>();
      healthAreasSnapshot.forEach(doc => {
          areasMap.set(doc.id, (doc.data() as HealthArea).healthFacilityName);
      });
      setHealthAreas(areasMap);

      const q = query(collection(db, 'children'), where('status', '==', 'referred_out'));
      const querySnapshot = await getDocs(q);
      const fetchedChildren = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Child[];
      setReferredChildren(fetchedChildren);
    } catch (error) {
      console.error("Error fetching referred children: ", error);
      toast({ title: 'Error', description: 'Failed to fetch referred children.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReferredChildren();
  }, [fetchReferredChildren]);

  const handleUpdateStatus = (id: string, status: 'reached' | 'not_reached') => {
    setConfirmAction({ type: 'updateStatus', payload: { id, status } });
  };
  
  const handleDeleteClick = (id: string) => {
    setConfirmAction({ type: 'delete', payload: { id } });
  };

  const handleDeleteMultipleClick = () => {
    setConfirmAction({ type: 'deleteMultiple', payload: { ids: selectedRows } });
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'updateStatus') {
        const { id, status } = confirmAction.payload;
        try {
            const childRef = doc(db, 'children', id);
            await updateDoc(childRef, {
                'discharge.referralStatus': status,
                'discharge.referralStatusUpdateDate': Timestamp.now(),
            });
            toast({ title: 'Success', description: 'Referral status updated.' });
            setReferredChildren(prev => prev.map(child => 
                child.id === id 
                ? { ...child, discharge: { ...child.discharge!, referralStatus: status } }
                : child
            ));
        } catch (error) {
            console.error('Error updating referral status:', error);
            toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
        }
    } else if (confirmAction.type === 'delete') {
        const { id } = confirmAction.payload;
         try {
            await deleteDoc(doc(db, "children", id));
            toast({ title: "Success", description: "Referral record deleted." });
            setReferredChildren(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting referral: ", error);
            toast({ title: "Error", description: "Failed to delete referral record.", variant: "destructive" });
        }
    } else if (confirmAction.type === 'deleteMultiple') {
        const { ids } = confirmAction.payload;
        try {
            const batch = writeBatch(db);
            ids.forEach((id: string) => {
                batch.delete(doc(db, 'children', id));
            });
            await batch.commit();
            toast({ title: 'Success', description: `${ids.length} records deleted.`});
            setReferredChildren(prev => prev.filter(c => !ids.includes(c.id)));
            setSelectedRows([]);
        } catch (error) {
            console.error("Error deleting multiple referrals: ", error);
            toast({ title: "Error", description: "Failed to delete selected records.", variant: "destructive" });
        }
    }

    setConfirmAction(null);
  };


  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    if (dateValue instanceof Timestamp) {
      return format(dateValue.toDate(), 'PPP');
    }
    return 'Invalid Date';
  };
  
  const getStatusBadgeVariant = (status?: 'pending' | 'reached' | 'not_reached' | 'accepted' | 'declined') => {
    switch (status) {
      case 'reached':
      case 'accepted':
        return 'default';
      case 'not_reached':
      case 'declined':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  }

  const getReferredToText = (child: Child) => {
    if (child.discharge?.referredToFacilityId) {
        return healthAreas.get(child.discharge.referredToFacilityId) || 'Unknown Facility';
    }
    return child.discharge?.referredToOther || 'N/A';
  }
  
  const getReferredFromText = (child: Child) => {
    return healthAreas.get(child.healthAreaId) || 'Unknown Facility';
  }
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
      if (checked === true) {
          setSelectedRows(referredChildren.map(c => c.id));
      } else {
          setSelectedRows([]);
      }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
      if (checked) {
          setSelectedRows(prev => [...prev, id]);
      } else {
          setSelectedRows(prev => prev.filter(rowId => rowId !== id));
      }
  };


  const getConfirmationDialogProps = () => {
    if (!confirmAction) return { isOpen: false, title: '', description: '' };
    if (confirmAction.type === 'updateStatus') {
        return {
            isOpen: true,
            title: 'Confirm Referral Status Update',
            description: `Are you sure you want to mark this child as "${confirmAction.payload.status === 'reached' ? 'Reached Destination' : 'Did Not Reach'}"?`,
            confirmText: 'Yes, Update Status',
        };
    }
    if (confirmAction.type === 'delete') {
        return {
            isOpen: true,
            title: 'Delete Referral',
            description: "Are you sure you want to permanently delete this referral record? This action cannot be undone.",
            confirmText: 'Yes, Delete',
        };
    }
     if (confirmAction.type === 'deleteMultiple') {
        return {
            isOpen: true,
            title: `Delete ${confirmAction.payload.ids.length} Records`,
            description: "Are you sure you want to permanently delete these referral records? This action cannot be undone.",
            confirmText: 'Yes, Delete All',
        };
    }
    return { isOpen: false, title: '', description: '' };
  };

  const dialogProps = getConfirmationDialogProps();


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
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/referred-out" group="operations" isActive tooltip="Referred Out"><Send /><span>Referred Out</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/special-attention" group="operations" tooltip="Special Attention"><AlertTriangle /><span>Special Attention</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/stock" group="operations" tooltip="Stock"><Warehouse /><span>Stock</span></SidebarMenuButton></SidebarMenuItem>
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
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 text-white sm:px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden text-white" />
                <h1 className="text-lg font-semibold">Referred Out Children</h1>
              </div>
               {selectedRows.length > 0 && (
                  <Button variant="destructive" onClick={handleDeleteMultipleClick}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected ({selectedRows.length})
                  </Button>
                )}
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Referred Out List</CardTitle>
                  <CardDescription>List of all children referred to other health structures.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p>Loading children...</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                           <TableHead className="w-[50px]">
                                <Checkbox 
                                   checked={selectedRows.length === referredChildren.length && referredChildren.length > 0 ? true : selectedRows.length > 0 ? 'indeterminate' : false}
                                   onCheckedChange={(checked) => handleSelectAll(checked)}
                                />
                           </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead>Referral Date</TableHead>
                          <TableHead>Referred From</TableHead>
                          <TableHead>Referred To</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referredChildren.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">
                              No children have been referred out.
                            </TableCell>
                          </TableRow>
                        ) : (
                          referredChildren.map((child) => (
                            <TableRow key={child.id}>
                              <TableCell>
                                  <Checkbox 
                                      checked={selectedRows.includes(child.id)}
                                      onCheckedChange={(checked) => handleRowSelect(child.id, !!checked)}
                                  />
                              </TableCell>
                              <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                              <TableCell>{child.age} mos</TableCell>
                              <TableCell>{formatDate(child.discharge?.date)}</TableCell>
                              <TableCell>{getReferredFromText(child)}</TableCell>
                              <TableCell>{getReferredToText(child)}</TableCell>
                              <TableCell>{child.discharge?.referralReason}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(child.discharge?.referralStatus)} className="capitalize">
                                  {child.discharge?.referralStatus?.replace('_', ' ') || 'pending'}
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
                                    {child.discharge?.referralStatus === 'pending' && (
                                        <>
                                            <DropdownMenuItem onClick={() => handleUpdateStatus(child.id, 'reached')}>
                                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                            <span>Reached Destination</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdateStatus(child.id, 'not_reached')}>
                                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                            <span>Did Not Reach</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(child.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>

      <ConfirmationDialog
        isOpen={dialogProps.isOpen}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={dialogProps.title}
        description={dialogProps.description}
        confirmText={dialogProps.confirmText}
      />
    </>
  );
}

    



