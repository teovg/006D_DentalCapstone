import { useState } from 'react';

export const LIST_PAGE_SIZE = 20;

export function listWindow<T>(items: readonly T[], visibleCount = LIST_PAGE_SIZE) {
  const count = Math.max(0, visibleCount);
  const remaining = Math.max(0, items.length - count);
  return { items: items.slice(0, count), remaining, nextCount: Math.min(LIST_PAGE_SIZE, remaining) };
}

/** Progressive rendering, not a data quota. Every record remains reachable. */
export function useListWindow<T>(items: readonly T[], key: string) {
  const [window, setWindow] = useState({ key, count: LIST_PAGE_SIZE });
  const count = window.key === key ? window.count : LIST_PAGE_SIZE;
  return { ...listWindow(items, count), loadMore: () => setWindow({ key, count: count + LIST_PAGE_SIZE }) };
}
