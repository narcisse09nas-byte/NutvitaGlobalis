import type { Organization, OrganizationInvitation, OrganizationMember, TenantRole, TenantStoreData } from "@/types/tenant";
const KEY="nutvita-tenant-store";
const id=(p:string)=>`${p}-${typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now()}`;
export const emptyTenantStore=():TenantStoreData=>({version:1,organizations:[],members:[],invitations:[],activeOrganizationByUser:{}});
export function loadTenantStore(){ if(typeof window==="undefined") return emptyTenantStore(); try{const raw=localStorage.getItem(KEY); if(!raw)return emptyTenantStore(); const p=JSON.parse(raw) as TenantStoreData; return {...emptyTenantStore(),...p};}catch{return emptyTenantStore();}}
export function saveTenantStore(data:TenantStoreData){ if(typeof window!=="undefined") localStorage.setItem(KEY,JSON.stringify(data)); }
export function createOrganization(input:{name:string;description:string;country:string;city:string;ownerUserId:string;ownerFullName:string;ownerEmail:string}){
 const now=new Date().toISOString(); const slug=input.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 const organization:Organization={id:id("org"),name:input.name,slug:slug||`organisation-${Date.now()}`,description:input.description,country:input.country,city:input.city,plan:"free",ownerUserId:input.ownerUserId,branding:{primaryColor:"#0B5D3B",secondaryColor:"#F58220",academyName:input.name},createdAt:now,updatedAt:now};
 const ownerMember:OrganizationMember={id:id("member"),organizationId:organization.id,userId:input.ownerUserId,fullName:input.ownerFullName,email:input.ownerEmail,role:"owner",active:true,joinedAt:now}; return {organization,ownerMember};
}
export function createInvitation(input:{organizationId:string;email:string;role:TenantRole;invitedByUserId:string}):OrganizationInvitation{const d=new Date(),e=new Date(d);e.setDate(e.getDate()+7);return{id:id("invite"),organizationId:input.organizationId,email:input.email,role:input.role,token:id("token"),status:"pending",invitedByUserId:input.invitedByUserId,createdAt:d.toISOString(),expiresAt:e.toISOString()};}
