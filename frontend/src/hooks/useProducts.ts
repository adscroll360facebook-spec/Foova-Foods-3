import { useState, useEffect, useCallback } from "react";
import { safeFetch } from "@/lib/utils";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  badge: string | null;
  weight: string | null;
  image_url: string | null;
  in_stock: boolean;
  stock_quantity: number;
  rating?: number;
  reviews?: number;
  created_at: string;
  updated_at: string;
}

// Simple in-memory cache so navigating back doesn't re-fetch
let productsCache: Product[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(productsCache ?? []);
  const [loading, setLoading] = useState(productsCache === null);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    // Serve from cache if fresh
    if (!force && productsCache && now - cacheTimestamp < CACHE_TTL_MS) {
      setProducts(productsCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await safeFetch("/api/products");
      if (Array.isArray(data)) {
        productsCache = data;
        cacheTimestamp = Date.now();
        setProducts(data);
      }
    } catch (err) {
      console.error("Products fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, reload: () => load(true) };
}

/** Derive stock status from a product record */
export function getStockStatus(qty: number) {
  if (qty === 0) return "out" as const;
  if (qty <= 10) return "low" as const;
  return "in" as const;
}
