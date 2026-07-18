import {
  Award, Bell, BookOpen, Brain, Building2, CalendarClock, CircleHelp,
  ClipboardCheck, CreditCard, FileCheck2, FileText, Gift, GraduationCap,
  Heart, History, LayoutDashboard, Mail, MonitorUp, NotebookPen, Radio,
  ReceiptText, Settings, ShieldCheck, ShoppingCart, Store, User, Users,
  Video, WalletCards,
} from "lucide-react";
import type { NavigationSection } from "@/types/navigation";

export const dashboardNavigation: NavigationSection[] = [
  { title: "Apprentissage", items: [
    { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { label: "Mes formations", href: "/dashboard/courses", icon: BookOpen },
    { label: "Classes virtuelles", href: "/dashboard/live", icon: Video },
    { label: "Quiz", href: "/dashboard/assessments", icon: ClipboardCheck },
    { label: "Examens finaux", href: "/dashboard/exams", icon: FileCheck2 },
    { label: "Planifier un examen", href: "/dashboard/exams/schedule", icon: CalendarClock },
    { label: "Récompenses", href: "/dashboard/rewards", icon: Gift },
    { label: "Certificats", href: "/dashboard/certificates", icon: Award },
  ] },
  { title: "Marketplace", items: [
    { label: "Catalogue", href: "/dashboard/marketplace", icon: Store },
    { label: "Panier", href: "/dashboard/cart", icon: ShoppingCart },
    { label: "Liste de souhaits", href: "/dashboard/wishlist", icon: Heart },
    { label: "Mes commandes", href: "/dashboard/orders", icon: ReceiptText },
  ] },
  { title: "Organisation", items: [
    { label: "Mes organisations", href: "/dashboard/organizations", icon: Building2 },
    { label: "Espace organisation", href: "/dashboard/organization", icon: ShieldCheck },
    { label: "Membres", href: "/dashboard/organization/members", icon: Users },
    { label: "Invitations", href: "/dashboard/organization/invitations", icon: Mail },
  ] },
  { title: "Ressources", items: [
    { label: "Documents", href: "/dashboard/resources", icon: FileText },
    { label: "NutVita AI Tutor", href: "/dashboard/ai-tutor", icon: GraduationCap },
    { label: "AI Instructor Pro", href: "/dashboard/ai-pro", icon: Brain },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ] },
  { title: "Studio et administration", items: [
    { label: "Instructor Studio", href: "/dashboard/instructor", icon: WalletCards },
    { label: "Surveillance examens", href: "/dashboard/instructor/proctoring", icon: MonitorUp },
    { label: "Sessions formateur", href: "/dashboard/instructor/live", icon: Radio },
    { label: "Apprenants et progression", href: "/dashboard/instructor/learners", icon: Users },
    { label: "Revenus formateur", href: "/dashboard/instructor/revenue", icon: CreditCard },
    { label: "Notes et résultats", href: "/dashboard/instructor/grades", icon: ClipboardCheck },
    { label: "Administration", href: "/dashboard/admin", icon: ShieldCheck },
    { label: "Utilisateurs", href: "/dashboard/admin/users", icon: Users },
    { label: "Gestion des formations", href: "/dashboard/admin/courses", icon: BookOpen },
  ] },
  { title: "Compte", items: [
    { label: "Mon profil", href: "/dashboard/profile", icon: User },
    { label: "Mes notes", href: "/dashboard/notes", icon: NotebookPen },
    { label: "Historique", href: "/dashboard/history", icon: History },
    { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
    { label: "Assistance", href: "/dashboard/support", icon: CircleHelp },
  ] },
];
