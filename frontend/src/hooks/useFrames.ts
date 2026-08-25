import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { FrameDto } from "@/data/frames";
import { frameToProduct } from "@/data/frames";
import { PRODUCTS } from "@/data/products";

/**
 * The storefront catalog. Falls back to the bundled PRODUCTS whenever the
 * backend is unavailable (paused environment / static preview build), so the
 * try-on screen is never blocked on a fetch.
 */
export function useFrames() {
  const query = useQuery({
    queryKey: ["frames"],
    queryFn: () => apiGet<FrameDto[]>("/frames"),
    staleTime: 30_000,
  });

  const products = useMemo(() => {
    const rows = query.data;
    if (!rows || rows.length === 0) return PRODUCTS;
    const mapped = rows.filter((row) => row.has_image).map(frameToProduct);
    return mapped.length > 0 ? mapped : PRODUCTS;
  }, [query.data]);

  return {
    products,
    isFallback: !query.data || query.data.length === 0,
    isLoading: query.isLoading,
  };
}
