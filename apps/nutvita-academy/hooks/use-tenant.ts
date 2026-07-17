"use client";
import {useContext} from "react";
import {TenantContext} from "@/components/tenancy/TenantProvider";
export function useTenant(){const c=useContext(TenantContext);if(!c)throw new Error("useTenant doit être utilisé dans TenantProvider.");return c;}
