

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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, Contact, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, Send, Download, MoreVertical, XCircle, CheckCircle } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/nutritrack/components/ui/select"
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, query, where, doc, updateDoc, Timestamp, addDoc } from '@/nutritrack/local-firestore';
import { useEffect, useState, useCallback } from 'react';
import type { Child, HealthArea, Village } from '@/nutritrack/types';
import { format } from 'date-fns';
import { Badge } from '@/nutritrack/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/nutritrack/components/ui/dialog';

export default function IncomingReferralsPage() {
  const [incomingReferrals, setIncomingReferrals] = useState<Child[]>([]);
  const [allHealthAreas, setAllHealthAreas] = useState<HealthArea[]>([]);
  const [villageMap, setVillageMap] = useState<Map<string, Village>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  const [confirmAction, setConfirmAction] = useState<{ action: 'admit' | 'decline'; child: Child } | null>(null);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const fetchPrerequisites = useCallback(async () => {
      setLoading(true);
      try {
        const [haSnapshot, villageSnapshot] = await Promise.all([
           getDocs(collection(db, 'healthAreas')),
           getDocs(collection(db, 'villages')),
        ]);
        
        const haData = haSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthArea));
        setAllHealthAreas(haData);

        const vMap = new Map<string, Village>();
        villageSnapshot.forEach(doc => vMap.set(doc.id, { id: doc.id, ...doc.data() } as Village));
        setVillageMap(vMap);
      
      } catch (error) {
        console.error("Error fetching prerequisites: ", error);
        toast({ title: 'Error', description: 'Failed to load facility list.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
  }, [toast]);
  
  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);


  const fetchIncomingReferrals = useCallback(async (facilityId: string) => {
    setIsProcessing(true);
    try {
      const q = query(
        collection(db, 'children'),
        where('discharge.referredToFacilityId', '==', facilityId),
        where('discharge.referralStatus', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedChildren = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Child);
      setIncomingReferrals(fetchedChildren);

    } catch (error) {
      console.error("Error fetching incoming referrals: ", error);
      toast({ title: 'Error', description: 'Failed to fetch incoming referrals.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (selectedFacilityId) {
        fetchIncomingReferrals(selectedFacilityId);
    } else {
        setIncomingReferrals([]);
    }
  }, [selectedFacilityId, fetchIncomingReferrals]);


  const handleDecline = async () => {
      if (!confirmAction || confirmAction.action !== 'decline' || !declineReason) return;
      
      const { child } = confirmAction;
      try {
          const childRef = doc(db, 'children', child.id);
          await updateDoc(childRef, {
              'discharge.referralStatus': 'declined',
              'discharge.declineReason': declineReason,
              'discharge.referralStatusUpdateDate': Timestamp.now(),
          });
          toast({ title: 'Referral Declined', description: `The referral for ${child.firstName} has been marked as declined.` });
          if (selectedFacilityId) {
            fetchIncomingReferrals(selectedFacilityId); // Refresh list
          }
      } catch (error) {
          toast({ title: 'Error', description: 'Failed to decline the referral.', variant: 'destructive' });
      } finally {
          setIsDeclineDialogOpen(false);
          setConfirmAction(null);
          setDeclineReason('');
      }
  };

  const handleAdmit = async () => {
    if (!confirmAction || confirmAction.action !== 'admit' || !selectedFacilityId) return;
    const { child } = confirmAction;

    const receivingFacility = allHealthAreas.find(ha => ha.id === selectedFacilityId);
    const targetVillage = Array.from(villageMap.values()).find(v => v.healthAreaId === selectedFacilityId);

    if (!receivingFacility || !targetVillage) {
        toast({ title: 'Configuration Error', description: 'Cannot admit child. The receiving facility or its villages are not configured correctly.', variant: 'destructive' });
        setConfirmAction(null);
        return;
    }

    try {
        const newChildData: Omit<Child, 'id'> = {
            ...child,
            healthAreaId: selectedFacilityId,
            villageId: targetVillage.id,
            admissionType: 'internal-transfer',
            status: 'active',
            admissionDate: Timestamp.now(),
            discharge: undefined,
            childCode: `${receivingFacility.code}-${String((receivingFacility.childCounter || 0) + 1).padStart(5, '0')}`,
            nextVisitDate: null,
            needsHomeVisit: 'no',
            homeVisitDate: null,
            homeVisitPlan: null,
        };
        delete (newChildData as any).id;

        await addDoc(collection(db, 'children'), newChildData);
        
        await updateDoc(doc(db, 'healthAreas', selectedFacilityId), {
            childCounter: (receivingFacility.childCounter || 0) + 1
        });

        const originalChildRef = doc(db, 'children', child.id);
        await updateDoc(originalChildRef, {
            'discharge.referralStatus': 'accepted',
            'discharge.referralStatusUpdateDate': Timestamp.now(),
        });
        
        toast({ title: 'Admission Successful', description: `${child.firstName} has been admitted from referral.` });
        if (selectedFacilityId) {
            fetchIncomingReferrals(selectedFacilityId);
        }

    } catch (error) {
        console.error("Error admitting referred child:", error);
        toast({ title: 'Admission Failed', description: 'An error occurred while admitting the child.', variant: 'destructive' });
    } finally {
        setConfirmAction(null);
    }
  };


  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    if (dateValue instanceof Timestamp) {
      return format(dateValue.toDate(), 'PPP');
    }
    return 'Invalid Date';
  };

  const getSendingFacilityName = (child: Child) => {
    const facility = allHealthAreas.find(ha => ha.id === child.healthAreaId);
    return facility?.healthFacilityName || 'Unknown';
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
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/incoming-referrals" group="operations" isActive tooltip="Incoming Referrals"><Download /><span>Incoming Referrals</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/nutritrack/referred-out" group="operations" tooltip="Referred Out"><Send /><span>Referred Out</span></SidebarMenuButton></SidebarMenuItem>
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
                <h1 className="text-lg font-semibold">Incoming Referrals</h1>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
               <Card className="mb-6">
                  <CardHeader>
                      <CardTitle>Select Your Health Facility</CardTitle>
                      <CardDescription>Choose your facility to see a list of children referred to you.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Select onValueChange={setSelectedFacilityId} value={selectedFacilityId || ''}>
                          <SelectTrigger className="w-[350px]">
                              <SelectValue placeholder={loading ? "Loading facilities..." : "Select a health facility"} />
                          </SelectTrigger>
                          <SelectContent>
                              {allHealthAreas.map(ha => (
                                  <SelectItem key={ha.id} value={ha.id}>
                                      {ha.healthFacilityName}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </CardContent>
              </Card>

              {selectedFacilityId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Referrals</CardTitle>
                    <CardDescription>Children referred to your facility who are awaiting admission or decline.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isProcessing ? (
                      <p>Loading incoming referrals...</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Child ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Referred From</TableHead>
                            <TableHead>Referral Date</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomingReferrals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center">
                                No pending incoming referrals for this facility.
                              </TableCell>
                            </TableRow>
                          ) : (
                            incomingReferrals.map((child) => (
                              <TableRow key={child.id}>
                                <TableCell><Badge variant="secondary">{child.childCode}</Badge></TableCell>
                                <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                                <TableCell>{getSendingFacilityName(child)}</TableCell>
                                <TableCell>{formatDate(child.discharge?.date)}</TableCell>
                                <TableCell>{child.discharge?.referralReason}</TableCell>
                                <TableCell className="text-right space-x-2">
                                  <Button size="sm" variant="destructive" onClick={() => { setConfirmAction({ action: 'decline', child }); setIsDeclineDialogOpen(true); }}>Decline</Button>
                                  <Button size="sm" onClick={() => setConfirmAction({ action: 'admit', child })}>Admit</Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>

    {/* Confirmation Dialog for Admission */}
      <ConfirmationDialog
        isOpen={confirmAction?.action === 'admit'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAdmit}
        title="Confirm Admission"
        description={`Are you sure you want to admit ${confirmAction?.child.firstName}? This will create a new record for this child at your facility.`}
        confirmText="Yes, Admit Child"
      />

    {/* Dialog for Decline Reason */}
    <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Decline Referral</DialogTitle>
                <DialogDescription>Please provide a reason for declining this referral.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    placeholder="Reason for declining..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeclineDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDecline} disabled={!declineReason}>Confirm Decline</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  );
}

    



