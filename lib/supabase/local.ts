import {getLocalSeed,localClientUser,localPartnerUser} from "@/lib/local-seed";
type Row=Record<string,any>;
const admin={id:"local-super-admin",email:"pauln.zebaze@gmail.com",full_name:"Administrateur local",role:"super_admin",active:true};
const currentAdmin=()=>typeof window!=="undefined"?{...admin,email:localStorage.getItem("nutvita-local-admin-email")||admin.email}:admin;
const key=(table:string)=>`nutvita-local-${table}`;
function read(table:string):Row[]{if(typeof window==="undefined")return table==="admin_users"?[admin]:getLocalSeed(table);try{const stored=localStorage.getItem(key(table));if(stored!==null)return JSON.parse(stored);const seeded=getLocalSeed(table);localStorage.setItem(key(table),JSON.stringify(seeded));return seeded}catch{return getLocalSeed(table)}}
function write(table:string,rows:Row[]){if(typeof window!=="undefined")localStorage.setItem(key(table),JSON.stringify(rows))}

class Query{
  table:string;operation="select";payload:any=null;filters:Array<(row:Row)=>boolean>=[];singleMode=false;head=false;countMode=false;limitValue?:number;orderField?:string;orderAscending=true;
  constructor(table:string){this.table=table}
  select(_columns="*",options?:{count?:string;head?:boolean}){this.head=Boolean(options?.head);this.countMode=Boolean(options?.count);return this}
  insert(payload:any){this.operation="insert";this.payload=payload;return this}
  upsert(payload:any){this.operation="upsert";this.payload=payload;return this}
  update(payload:any){this.operation="update";this.payload=payload;return this}
  delete(){this.operation="delete";return this}
  eq(field:string,value:any){this.filters.push(row=>row[field]===value);return this}
  neq(field:string,value:any){this.filters.push(row=>row[field]!==value);return this}
  is(field:string,value:any){this.filters.push(row=>row[field]===value);return this}
  in(field:string,values:any[]){this.filters.push(row=>values.includes(row[field]));return this}
  gt(field:string,value:any){this.filters.push(row=>row[field]>value);return this}
  gte(field:string,value:any){this.filters.push(row=>row[field]>=value);return this}
  lt(field:string,value:any){this.filters.push(row=>row[field]<value);return this}
  lte(field:string,value:any){this.filters.push(row=>row[field]<=value);return this}
  or(){return this}
  not(){return this}
  order(field:string,options?:{ascending?:boolean}){this.orderField=field;this.orderAscending=options?.ascending!==false;return this}
  limit(value:number){this.limitValue=value;return this}
  single(){this.singleMode=true;return this}
  maybeSingle(){this.singleMode=true;return this}
  async run(){let rows=read(this.table),matches=rows.filter(row=>this.filters.every(filter=>filter(row)));if(this.operation==="insert"||this.operation==="upsert"){const entries=(Array.isArray(this.payload)?this.payload:[this.payload]).map(item=>({...item,id:item.id||crypto.randomUUID(),created_at:item.created_at||new Date().toISOString(),updated_at:new Date().toISOString()}));for(const entry of entries){const index=rows.findIndex(row=>row.id===entry.id||(entry.page_key&&row.page_key===entry.page_key));if(this.operation==="upsert"&&index>=0)rows[index]={...rows[index],...entry};else rows.push(entry)}write(this.table,rows);matches=entries}else if(this.operation==="update"){rows=rows.map(row=>this.filters.every(filter=>filter(row))?{...row,...this.payload,updated_at:new Date().toISOString()}:row);write(this.table,rows);matches=rows.filter(row=>this.filters.every(filter=>filter(row)))}else if(this.operation==="delete"){const removed=matches;rows=rows.filter(row=>!this.filters.every(filter=>filter(row)));write(this.table,rows);matches=removed}if(this.orderField)matches=[...matches].sort((a,b)=>{const left=a[this.orderField!],right=b[this.orderField!];return(left>right?1:left<right?-1:0)*(this.orderAscending?1:-1)});if(this.limitValue)matches=matches.slice(0,this.limitValue);return{data:this.head?null:this.singleMode?(matches[0]||null):matches,error:null,count:this.countMode?matches.length:null}}
  then(resolve:any,reject:any){return this.run().then(resolve,reject)}
}

export function createLocalClient(){return{from:(table:string)=>new Query(table),auth:{getUser:async()=>({data:{user:typeof window!=="undefined"&&localStorage.getItem("nutvita-local-admin")==="1"?currentAdmin():typeof window!=="undefined"&&localStorage.getItem("nutvita-local-partner")==="1"?localPartnerUser:typeof window!=="undefined"&&localStorage.getItem("nutvita-local-client")==="1"?localClientUser:null},error:null}),signOut:async()=>{if(typeof window!=="undefined"){localStorage.removeItem("nutvita-local-admin");localStorage.removeItem("nutvita-local-admin-email");localStorage.removeItem("nutvita-local-client");localStorage.removeItem("nutvita-local-partner")}await Promise.all([fetch('/api/admin/local-logout',{method:'POST'}),fetch('/api/client/local-logout',{method:'POST'}),fetch('/api/partner/local-logout',{method:'POST'})]);return{error:null}},signInWithPassword:async()=>({data:{user:null},error:new Error("Utilisez la connexion locale.")})},storage:{from:()=>({createSignedUrl:async()=>({data:null,error:new Error("Document indisponible en mode local.")}),upload:async()=>({data:null,error:null})})}} as any}
export const localAdmin=admin;
