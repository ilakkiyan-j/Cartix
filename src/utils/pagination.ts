import { config } from '../config/env.js';

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface SanitizedPaginationParams {
  page: number;
  limit: number;
}

/**
 * Sanitizes and bounds pagination parameters to protect against unbounded upstream queries.
 */
export function sanitizePagination(options?: PaginationOptions): SanitizedPaginationParams {
  const maxLimit = options?.maxLimit || config.MAX_PAGE_SIZE;
  const rawPage = options?.page ?? 1;
  const rawLimit = options?.limit ?? 20;

  const page = Math.max(1, Math.floor(rawPage));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(rawLimit)));

  return { page, limit };
}

/**
 * Constructs standard Cartix pagination metadata.
 */
export function createPaginationMetadata(
  page: number,
  limit: number,
  totalRecords: number,
  totalPages?: number
): PaginationMetadata {
  const calculatedTotalPages = totalPages ?? Math.ceil(totalRecords / (limit || 1));
  const normalizedTotalPages = Math.max(0, calculatedTotalPages);

  return {
    page,
    limit,
    total: totalRecords,
    total_pages: normalizedTotalPages,
    has_next_page: page < normalizedTotalPages,
  };
}
