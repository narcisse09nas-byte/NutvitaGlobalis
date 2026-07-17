export type TenantRole = "owner" | "admin" | "manager" | "instructor" | "reviewer" | "member" | "viewer";
export type TenantPermission = "organization.read" | "organization.update" | "members.read" | "members.invite" | "members.update" | "members.remove" | "courses.read" | "courses.create" | "courses.update" | "courses.publish" | "analytics.read" | "billing.read" | "billing.update";
export type OrganizationPlan = "free" | "standard" | "professional" | "enterprise";
export type OrganizationBranding = { logoUrl?: string; primaryColor: string; secondaryColor: string; academyName: string; };
export type Organization = { id:string; name:string; slug:string; description:string; country:string; city:string; plan:OrganizationPlan; ownerUserId:string; branding:OrganizationBranding; createdAt:string; updatedAt:string; };
export type OrganizationMember = { id:string; organizationId:string; userId:string; fullName:string; email:string; role:TenantRole; active:boolean; joinedAt:string; };
export type OrganizationInvitation = { id:string; organizationId:string; email:string; role:TenantRole; token:string; status:"pending"|"accepted"|"revoked"|"expired"; invitedByUserId:string; createdAt:string; expiresAt:string; };
export type TenantStoreData = { version:1; organizations:Organization[]; members:OrganizationMember[]; invitations:OrganizationInvitation[]; activeOrganizationByUser:Record<string,string>; };
