import type { TenantPermission, TenantRole } from "@/types/tenant";
export const tenantRoleLabels: Record<TenantRole,string> = { owner:"Propriétaire", admin:"Administrateur", manager:"Gestionnaire", instructor:"Formateur", reviewer:"Réviseur", member:"Membre", viewer:"Lecteur" };
export const tenantRolePermissions: Record<TenantRole,TenantPermission[]> = {
 owner:["organization.read","organization.update","members.read","members.invite","members.update","members.remove","courses.read","courses.create","courses.update","courses.publish","analytics.read","billing.read","billing.update"],
 admin:["organization.read","organization.update","members.read","members.invite","members.update","members.remove","courses.read","courses.create","courses.update","courses.publish","analytics.read","billing.read"],
 manager:["organization.read","members.read","members.invite","members.update","courses.read","courses.create","courses.update","analytics.read"],
 instructor:["organization.read","members.read","courses.read","courses.create","courses.update"],
 reviewer:["organization.read","courses.read","courses.update"],
 member:["organization.read","courses.read"],
 viewer:["organization.read","courses.read"],
};
export function roleHasPermission(role:TenantRole, permission:TenantPermission){ return tenantRolePermissions[role].includes(permission); }
