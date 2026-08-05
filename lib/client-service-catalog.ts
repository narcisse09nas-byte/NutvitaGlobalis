import {createClient} from "@/lib/supabase/server";
import {hasSupabaseConfig} from "@/lib/supabase/config";
import {defaultClientServiceCatalog,type ClientServiceCatalogSettings} from "@/data/client-service-catalog";
export function normalizeClientServiceCatalog(input?:Partial<ClientServiceCatalogSettings>|null):ClientServiceCatalogSettings{const value={...defaultClientServiceCatalog,...(input||{})};value.cards=(input?.cards?.length?input.cards:defaultClientServiceCatalog.cards).map((item,index)=>({...defaultClientServiceCatalog.cards.find(x=>x.id===item.id),...item,order:item.order??index+1} as typeof item)).sort((a,b)=>a.order-b.order);return value}
export async function getClientServiceCatalog(){if(!hasSupabaseConfig())return defaultClientServiceCatalog;const{data}=await(await createClient()).from("client_service_catalog_settings").select("*").eq("id",1).maybeSingle();return normalizeClientServiceCatalog(data)}
