import { DataService } from '@/services/DataService';
import type { Category } from '@/types';

export const categoryService = new DataService<Category>('categories');
