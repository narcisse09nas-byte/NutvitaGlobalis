'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Home, Users, Map as MapIcon, Settings, PlusCircle, BarChart, Warehouse, Contact, Bed, AlertTriangle, ClipboardCheck, HelpCircle, MessageSquareQuote, BookOpen, Group, Send, Download } from 'lucide-react';
import { Logo } from '@/nutritrack/components/logo';
import { Button } from '@/nutritrack/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/nutritrack/components/ui/form';
import { Input } from '@/nutritrack/components/ui/input';
import { Textarea } from '@/nutritrack/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/nutritrack/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/nutritrack/components/ui/card';
import { useToast } from '@/nutritrack/hooks/use-toast';
import { firestore as db } from '@/nutritrack/local-firestore';
import { collection, addDoc, Timestamp } from '@/nutritrack/local-firestore';
import { useRouter } from 'next/navigation';

const feedbackSchema = z.object({
  satisfaction: z.string().nonempty({ message: "Please select a satisfaction level." }),
  feature: z.string().optional(),
  feedback: z.string().min(10, { message: "Please provide at least 10 characters of feedback." }),
  contactEmail: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export default function FeedbackPage() {
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<FeedbackFormValues>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: {
            satisfaction: '',
            feature: '',
            feedback: '',
            contactEmail: '',
        },
    });

    const { control, handleSubmit, formState: { isSubmitting } } = form;

    const onSubmit = async (data: FeedbackFormValues) => {
        toast({
            title: 'Thank You!',
            description: 'Your feedback has been successfully submitted.',
        });
        router.push('/nutritrack/');

        try {
            await addDoc(collection(db, 'feedback'), {
                ...data,
                submittedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast({
                title: 'Error',
                description: 'There was a problem submitting your feedback in the background.',
                variant: 'destructive',
            });
        }
    };

  return (
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
              <SidebarMenuItem><SidebarMenuButton href="/nutritrack/settings" group="settings" tooltip="Commodities"><Settings /><span>Commodities</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
               <SidebarMenuItem><SidebarMenuButton href="/nutritrack/feedback" group="feedback" isActive tooltip="Feedback"><MessageSquareQuote /><span>Feedback</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 text-white sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarProvider>
              <SidebarTrigger className="md:hidden text-white" />
            </SidebarProvider>
            <h1 className="text-lg font-semibold">Submit Feedback</h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Share Your Experience</CardTitle>
                    <CardDescription>Your feedback is valuable in helping us improve this application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                             <FormField
                                control={control}
                                name="satisfaction"
                                render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className='font-semibold'>Overall, how satisfied are you with this app?</FormLabel>
                                    <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex flex-wrap justify-between"
                                    >
                                        <FormItem className='flex flex-col items-center space-y-1'>
                                            <FormControl><RadioGroupItem value="1" className='h-6 w-6' /></FormControl>
                                            <FormLabel className="font-normal text-xs">Very Dissatisfied</FormLabel>
                                        </FormItem>
                                        <FormItem className='flex flex-col items-center space-y-1'>
                                            <FormControl><RadioGroupItem value="2" className='h-6 w-6' /></FormControl>
                                            <FormLabel className="font-normal text-xs">Dissatisfied</FormLabel>
                                        </FormItem>
                                        <FormItem className='flex flex-col items-center space-y-1'>
                                            <FormControl><RadioGroupItem value="3" className='h-6 w-6' /></FormControl>
                                            <FormLabel className="font-normal text-xs">Neutral</FormLabel>
                                        </FormItem>
                                        <FormItem className='flex flex-col items-center space-y-1'>
                                            <FormControl><RadioGroupItem value="4" className='h-6 w-6' /></FormControl>
                                            <FormLabel className="font-normal text-xs">Satisfied</FormLabel>
                                        </FormItem>
                                        <FormItem className='flex flex-col items-center space-y-1'>
                                            <FormControl><RadioGroupItem value="5" className='h-6 w-6' /></FormControl>
                                            <FormLabel className="font-normal text-xs">Very Satisfied</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField control={control} name="feature" render={({ field }) => (<FormItem><FormLabel>Which feature does your feedback relate to? (Optional)</FormLabel><FormControl><Input placeholder="e.g., Admission Form, Reports" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="feedback" render={({ field }) => (<FormItem><FormLabel>What can we do to improve?</FormLabel><FormControl><Textarea placeholder="Please share your suggestions, or describe any issues you encountered." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Your Email (Optional)</FormLabel><FormControl><Input placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </div>
  );
}




