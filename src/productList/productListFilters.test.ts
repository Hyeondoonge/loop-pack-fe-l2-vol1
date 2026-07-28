import { describe, expect, it } from 'vitest';
import { FIRST_PAGE } from '@/productList/productListConstants';
import { productListParsers } from './productListFilters';

describe('productListParsers.page', () => {
  it('parses a valid page number as-is', () => {
    expect(productListParsers.page.parse('3')).toBe(3);
  });

  it('clamps a page below the first page up to the first page', () => {
    expect(productListParsers.page.parse('0')).toBe(FIRST_PAGE);
    expect(productListParsers.page.parse('-5')).toBe(FIRST_PAGE);
  });

  it('falls back to null for a non-numeric value so withDefault takes over', () => {
    expect(productListParsers.page.parse('abc')).toBeNull();
  });
});
