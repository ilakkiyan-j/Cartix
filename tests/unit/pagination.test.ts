import { describe, it, expect } from 'vitest';
import { sanitizePagination, createPaginationMetadata } from '../../src/utils/pagination.js';

describe('Pagination Utilities', () => {
  describe('sanitizePagination', () => {
    it('applies default page and limit when not specified', () => {
      const result = sanitizePagination();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('enforces lower bound of 1 for page and limit', () => {
      const result = sanitizePagination({ page: -5, limit: 0 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('enforces maximum page size limit (100)', () => {
      const result = sanitizePagination({ page: 2, limit: 250 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(100);
    });
  });

  describe('createPaginationMetadata', () => {
    it('computes total_pages and has_next_page accurately', () => {
      const meta = createPaginationMetadata(1, 20, 45, 3);
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 45,
        total_pages: 3,
        has_next_page: true,
      });
    });

    it('sets has_next_page to false on the final page', () => {
      const meta = createPaginationMetadata(3, 20, 45, 3);
      expect(meta.has_next_page).toBe(false);
    });

    it('calculates total_pages automatically if not provided', () => {
      const meta = createPaginationMetadata(1, 10, 35);
      expect(meta.total_pages).toBe(4);
      expect(meta.has_next_page).toBe(true);
    });
  });
});
