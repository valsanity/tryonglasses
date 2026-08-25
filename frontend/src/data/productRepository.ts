import type { GlassesProduct } from "@/data/products";
import { PRODUCTS } from "@/data/products";

/**
 * Repository seam: the UI depends on this interface, never on the data source.
 * To move the catalog to PostgreSQL / Supabase / a REST API, add another
 * implementation and export it as `productRepository` — no component changes.
 */
export interface ProductRepository {
  list(): Promise<GlassesProduct[]>;
  getById(id: string): Promise<GlassesProduct | undefined>;
}

export const localProductRepository: ProductRepository = {
  async list() {
    return PRODUCTS;
  },
  async getById(id: string) {
    return PRODUCTS.find((p) => p.id === id);
  },
};

export const productRepository: ProductRepository = localProductRepository;
