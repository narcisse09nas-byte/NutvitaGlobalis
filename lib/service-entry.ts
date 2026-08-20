import type {PlatformRole,PlatformServiceKey} from "@/lib/platform-services";

const purchaseDestinations: Record<PlatformServiceKey,string> = {
  client:"/espace-client/services",
  academy:"/formations",
  health:"/espace-client/services?categorie=health_tracking",
  child_growth:"/espace-client/services?categorie=child_growth",
  teleconsultation:"/nutritionnistes",
  medical_consultation:"/consultations-medicales/specialistes",
  catering:"/restauration",
  survey:"/espace-client/services?categorie=survey",
  project_management:"/espace-client/services?categorie=project_management",
  recruitment:"/carrieres",
  nutritrack:"/espace-client/services?categorie=nutritrack",
  maximus:"/contact?objet=acces-maximus",
  administration:"/contact?objet=acces-administration",
};

export function safeInternalPath(value:string|null|undefined,fallback="/"){
  return value?.startsWith("/")&&!value.startsWith("//")?value:fallback;
}

export function purchaseDestination(service:PlatformServiceKey){
  return purchaseDestinations[service];
}

export function serviceEntryUrl(service:PlatformServiceKey,role?:PlatformRole,returnTo?:string){
  const params=new URLSearchParams({service});
  if(role)params.set("role",role);
  if(returnTo)params.set("return",safeInternalPath(returnTo));
  return `/api/access/open?${params.toString()}`;
}
