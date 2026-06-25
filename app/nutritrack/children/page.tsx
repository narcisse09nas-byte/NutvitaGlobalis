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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, MoreVertical, FileText, Send, Search, Trash2, Contact, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, HeartPulse, Download } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/nutritrack/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, getDocs, query, orderBy, deleteDoc, doc, writeBatch } from '@/nutritrack/local-firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Child, Diagnosis } from '@/nutritrack/types';
import { format } from 'date-fns';
import { Badge } from '@/nutritrack/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Timestamp } from '@/nutritrack/local-firestore';
import { Input } from '@/nutritrack/components/ui/input';
import { ConfirmationDialog } from '@/nutritrack/components/confirmation-dialog';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { Checkbox } from '@/nutritrack/components/ui/checkbox';

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [childToDelete, setChildToDelete] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'children'), orderBy('admissionDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedChildren = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Child[];
      setChildren(fetchedChildren);
    } catch (error) {
      console.error("Error fetching children: ", error);
      toast({ title: "Error", description: "Failed to fetch children.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const filteredChildren = useMemo(() => {
    if (!searchQuery) {
      return children;
    }
    return children.filter(child => {
      const fullName = `${child.firstName || ''} ${child.lastName || ''}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase()) ||
             (child.childCode && child.childCode.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [children, searchQuery]);

  const getStatusVariant = (status: Child['status']) => {
      switch(status) {
          case 'active': return 'default';
          case 'discharged': return 'secondary';
          case 'referred_out': return 'accent';
          case 'defaulter': return 'outline';
          default: return 'outline';
      }
  }

  const getDiagnosisBadgeVariant = (diagnosis?: any): "default" | "secondary" | "destructive" | "accent" | "outline" | null | undefined => {
    let status: string | undefined;
    if (!diagnosis) return 'outline';
    
    if (typeof diagnosis === 'string') {
        status = diagnosis;
    } else if (typeof diagnosis === 'object' && diagnosis !== null && 'status' in diagnosis) {
        status = (diagnosis as any).status;
    }

    if (status?.includes('SAM')) return 'destructive';
    if (status?.includes('MAM')) return 'accent';
    return 'default';
  };

 const getDiagnosisText = (child: Child): string => {
    if (!child.diagnosis) return 'N/A';
    if (typeof child.diagnosis === 'string') return child.diagnosis;
    
    const isSamWithComplications = child.diagnosis.status === 'SAM' && (
      child.fever === 'yes' ||
      child.diarrheaDehydration === 'yes' ||
      child.severeVomiting === 'yes' ||
      child.pneumonia === 'yes' ||
      child.hypothermia === 'yes' ||
      child.appetiteTest === 'fail' ||
      child.oedemaGrade === '3'
    );
    
    if (isSamWithComplications) {
      return "SAM with Medical Complications";
    }

    if (child.diagnosis.status && child.diagnosis.reason && child.diagnosis.reason !== 'Normal' && child.diagnosis.reason !== child.diagnosis.status) {
        return `${child.diagnosis.status} (${child.diagnosis.reason})`;
    }
    return child.diagnosis.status || 'N/A';
  }

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    if (dateValue instanceof Timestamp) {
      return format(dateValue.toDate(), 'PPP');
    }
    if (typeof dateValue === 'string' || typeof dateValue === 'number' || dateValue instanceof Date) {
        try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return format(date, 'PPP');
            }
        } catch (e) {
            return 'Invalid Date';
        }
    }
    return 'Invalid Date';
  }

  const openDeleteConfirm = (id: string) => {
    setChildToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteChild = useCallback(async () => {
    const idsToDelete = childToDelete ? [childToDelete] : selectedRows;
    if (idsToDelete.length === 0) return;

    fetchChildren();
    setIsConfirmOpen(false);
    toast({ title: "Success", description: `${idsToDelete.length} child record(s) deleted.` });

    try {
        const batch = writeBatch(db);
        idsToDelete.forEach(id => {
            batch.delete(doc(db, 'children', id));
        });
        await batch.commit();
    } catch (error) {
        console.error("Error deleting child/children: ", error);
        toast({ title: "Error", description: "Failed to delete child record(s) in background.", variant: "destructive" });
    } finally {
        setChildToDelete(null);
        setSelectedRows([]);
    }
  }, [childToDelete, selectedRows, toast, fetchChildren]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
      if (checked === true) {
          setSelectedRows(filteredChildren.map(c => c.id));
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


  return (
    <>
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
            <SidebarMenuItem><SidebarMenuButton href="/nutritrack/children" group="operations" isActive tooltip="Children Register"><Users /><span>Children Register</span></SidebarMenuButton></SidebarMenuItem>
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
            <h1 className="text-lg font-semibold">Children Register</h1>
          </div>
          <div className="flex items-center gap-4">
            {selectedRows.length > 0 && (
                <Button variant="destructive" onClick={() => openDeleteConfirm('')}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedRows.length})
                </Button>
            )}
            <Button onClick={() => router.push('/nutritrack/admissions')} variant="secondary">
              New Admission
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Master List</CardTitle>
              <CardDescription>List of all children registered in the program.</CardDescription>
               <div className="relative mt-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name or code..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
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
                            checked={selectedRows.length === filteredChildren.length && filteredChildren.length > 0}
                            onCheckedChange={(checked) => handleSelectAll(checked)}
                        />
                      </TableHead>
                      <TableHead>Child ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Admission Date</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Next Visit</TableHead>
                      <TableHead>Status</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChildren.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          No children registered.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredChildren.map((child) => {
                        const diagnosisText = getDiagnosisText(child);
                        const isSamWithComplications = diagnosisText === 'SAM with Medical Complications';

                        return (
                          <TableRow key={child.id} onDoubleClick={() => router.push(`/nutritrack/children/${child.id}`)} className="cursor-pointer">
                            <TableCell>
                                <Checkbox 
                                    checked={selectedRows.includes(child.id)}
                                    onCheckedChange={(checked) => handleRowSelect(child.id, !!checked)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{child.childCode}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                            <TableCell>{child.age} mos</TableCell>
                            <TableCell>{formatDate(child.admissionDate)}</TableCell>
                            <TableCell>
                                <Badge variant={getDiagnosisBadgeVariant(child.diagnosis)}>
                                    {diagnosisText}
                                </Badge>
                            </TableCell>
                            <TableCell>{formatDate(child.nextVisitDate)}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(child.status)}>{child.status.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                        <span className="sr-only">Open menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/nutritrack/children/${child.id}`)}}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        <span>View Details</span>
                                    </DropdownMenuItem>
                                    {child.status === 'active' && (
                                      isSamWithComplications ? (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/nutritrack/children/${child.id}/inpatient-monitoring`)}}>
                                            <HeartPulse className="mr-2 h-4 w-4" />
                                            <span>Daily Monitoring</span>
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/nutritrack/children/${child.id}/follow-up`)}}>
                                            <Users className="mr-2 h-4 w-4" />
                                            <span>Follow-up</span>
                                        </DropdownMenuItem>
                                      )
                                    )}
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); openDeleteConfirm(child.id)}}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
    <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteChild}
        title={childToDelete ? "Delete Child Record" : `Delete ${selectedRows.length} Child Records`}
        description={childToDelete ? "Are you sure you want to permanently delete this child's record? This action cannot be undone." : `Are you sure you want to permanently delete these ${selectedRows.length} records? This action cannot be undone.`}
    />
    </>
  );
}




