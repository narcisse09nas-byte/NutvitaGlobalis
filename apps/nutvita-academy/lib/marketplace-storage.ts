import type { MarketplaceOrder, MarketplaceReview, MarketplaceStore } from "@/types/marketplace";

const KEY = "nutvita-marketplace-store";

export function createEmptyMarketplaceStore(): MarketplaceStore {
  return { version: 2, cart: [], wishlist: [], reviews: [], orders: [], enrollments: [] };
}

export function loadMarketplaceStore(): MarketplaceStore {
  if (typeof window === "undefined") return createEmptyMarketplaceStore();
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<MarketplaceStore> | null;
    if (!parsed) return createEmptyMarketplaceStore();
    return { version: 2, cart: parsed.cart ?? [], wishlist: parsed.wishlist ?? [], reviews: parsed.reviews ?? [], orders: parsed.orders ?? [], enrollments: parsed.enrollments ?? [] };
  } catch { return createEmptyMarketplaceStore(); }
}

export function saveMarketplaceStore(data: MarketplaceStore) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
}

export function createMarketplaceId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`;
}

export function createReviewRecord(input: Omit<MarketplaceReview, "id" | "createdAt">): MarketplaceReview {
  return { ...input, id: createMarketplaceId("review"), createdAt: new Date().toISOString() };
}

export function createOrderRecord(input: Omit<MarketplaceOrder, "id" | "createdAt" | "reference">): MarketplaceOrder {
  const now = new Date();
  return { ...input, id: createMarketplaceId("order"), createdAt: now.toISOString(), reference: `NVG-MKT-${now.getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}` };
}
