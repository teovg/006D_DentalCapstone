import { describe, expect, it } from 'vitest';
import { listWindow } from './listWindow';

describe('progressive list rendering', () => {
  it('keeps empty and single-item lists complete', () => {
    expect(listWindow([])).toEqual({ items: [], remaining: 0, nextCount: 0 });
    expect(listWindow(['one'])).toEqual({ items: ['one'], remaining: 0, nextCount: 0 });
  });
  it('exposes the next page without dropping any data', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    expect(listWindow(items).items).toHaveLength(20);
    expect(listWindow(items).remaining).toBe(980);
    expect(listWindow(items, 40).items).toHaveLength(40);
    expect(items).toHaveLength(1000);
  });
  it('handles a page boundary and the final partial page', () => {
    expect(listWindow(Array(20).fill('x')).remaining).toBe(0);
    expect(listWindow(Array(21).fill('x')).nextCount).toBe(1);
    expect(listWindow(Array(21).fill('x'), 40).remaining).toBe(0);
  });
});
