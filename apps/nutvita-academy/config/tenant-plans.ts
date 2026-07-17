import type { OrganizationPlan } from "@/types/tenant";
export const organizationPlanLabels:Record<OrganizationPlan,string>={free:"Free",standard:"Standard",professional:"Professional",enterprise:"Enterprise"};
export const organizationLicenses={
 free:{maxMembers:5,maxCourses:2,storageGb:1,aiCreditsMonthly:50},
 standard:{maxMembers:25,maxCourses:10,storageGb:10,aiCreditsMonthly:500},
 professional:{maxMembers:100,maxCourses:50,storageGb:100,aiCreditsMonthly:5000},
 enterprise:{maxMembers:1000,maxCourses:500,storageGb:1000,aiCreditsMonthly:50000},
};
