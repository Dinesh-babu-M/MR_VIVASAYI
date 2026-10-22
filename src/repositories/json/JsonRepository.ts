import { getJSONStore, setJSONStore } from '../../lib/dbManager';

/**
 * Generic JSON Repository for CRUD operations on local JSON store.
 * It works with the `offline_data/` directory via dbManager's dynamic store.
 *
 * @template T - The type of the entity stored.
 */
export class JsonRepository<T extends { id: string }> {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /** Retrieve all records */
  async getAll(): Promise<T[]> {
    return await getJSONStore<T>(this.tableName);
  }

  /** Retrieve a single record by its id */
  async getById(id: string): Promise<T | undefined> {
    const all = await this.getAll();
    return all.find((item) => item.id === id);
  }

  /** Add a new record (or overwrite if same id) */
  async add(item: T): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter((i) => i.id !== item.id);
    await setJSONStore<T>(this.tableName, [...filtered, item]);
  }

  /** Update an existing record; no‑op if not found */
  async update(item: T): Promise<void> {
    await this.add(item);
  }

  /** Delete a record by id */
  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    const remaining = all.filter((i) => i.id !== id);
    await setJSONStore<T>(this.tableName, remaining);
  }
}
