import {cookies} from "next/headers";
import {redirect} from "next/navigation";

export async function activePlatformSession(){const store=await cookies();return{service:store.get("nutvita_active_service")?.value||"",role:store.get("nutvita_active_role")?.value||""}}
export async function requireActivePlatformSession(services:string|string[],roles:string|string[],fallback="/espace-client"){const active=await activePlatformSession(),allowedServices=Array.isArray(services)?services:[services],allowedRoles=Array.isArray(roles)?roles:[roles];if(!allowedServices.includes(active.service)||!allowedRoles.includes(active.role))redirect(`${fallback}?acces=role-invalide`);return active}
