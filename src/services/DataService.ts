import { getRepo } from '@/data/DataProvider';

/**
 * Generic data service that provides CRUD operations for any entity using the JsonRepository.
 * It abstracts away the repository retrieval, making it easy for callers to work with data.
 */
export class DataService<T extends { id: string }> {
  private repo: ReturnType<typeof getRepo<T>>;

  constructor(entityKey: string) {
    // Dynamically obtain the appropriate repository based on the entity key.
    // The DataProvider returns a JsonRepository when VITE_DATA_SOURCE=local.
    // For now we only support the local JSON implementation.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – TypeScript cannot infer the exact overload here.
    this.repo = getRepo<T>(entityKey as any);
  }

  async getAll(): Promise<T[]> {
    return this.repo.getAll();
  }

  async getById(id: string): Promise<T | undefined> {
    return this.repo.getById(id);
  }

  async add(item: T): Promise<void> {
    await this.repo.add(item);
  }

  async update(item: T): Promise<void> {
    await this.repo.update(item);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
