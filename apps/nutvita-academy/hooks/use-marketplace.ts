"use client";
import {useContext} from "react";
import {MarketplaceContext} from "@/components/marketplace/MarketplaceProvider";
export function useMarketplace(){const c=useContext(MarketplaceContext);if(!c)throw new Error("useMarketplace doit être utilisé dans MarketplaceProvider.");return c;}
