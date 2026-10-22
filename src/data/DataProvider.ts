import { JsonRepository } from '@/repositories/json/JsonRepository';
import type { Category, Product, Supplier, Customer, Order, OrderItem, Review, StaffUser } from '@/types';

/**
 * Entity keys representing the JSON tables stored under `offline_data/`.
 * Extend this union as new entities are added.
 */
export type EntityKey =
  | 'categories'
  | 'products'
  | 'suppliers'
  | 'customers'
  | 'orders'
  | 'order_items'
  | 'reviews'
  | 'staff';

/**
 * Factory that provides a repository for the requested entity.
 * It selects the implementation based on the `VITE_DATA_SOURCE` env variable.
 *
 * - `local` -> returns a JsonRepository backed by the offline JSON files.
 * - `database` (or any other value) -> falls back to the existing Supabase‑based
 *   repository implementations (if they exist). For now we only implement the
 *   local JSON path.
 */
export function getRepo<T extends { id: string }>(entity: EntityKey): JsonRepository<T> {
  const source = import.meta.env.VITE_DATA_SOURCE ?? 'database';
  if (source === 'local') {
    // The JsonRepository expects the raw table name without extension.
    return new JsonRepository<T>(entity);
  }

  // Placeholder for future Supabase repos – throw to surface missing impl.
  throw new Error(`Supabase repository for "${entity}" not implemented yet`);
}

/**
 * Convenience typed getters for common entities.
 * These helpers make the call sites nicer and provide static typing.
 */
export const categoryRepo = () => getRepo<Category>('categories');
export const productRepo = () => getRepo<Product>('products');
export const supplierRepo = () => getRepo<Supplier>('suppliers');
export const customerRepo = () => getRepo<Customer>('customers');
export const orderRepo = () => getRepo<Order>('orders');
export const orderItemRepo = () => getRepo<OrderItem>('order_items');
export const reviewRepo = () => getRepo<Review>('reviews');
export const staffRepo = () => getRepo<StaffUser>('staff');
