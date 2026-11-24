import { describe, expect, it } from 'vitest';

import { appNavigationItems, appTabs, isAppTab, rootTabForRoute } from './navigation';

describe('app navigation', () => {
  it('keeps the five demo destinations typed and uniquely ordered', () => {
    expect(appNavigationItems.map((item) => item.id)).toEqual(appTabs);
    expect(new Set(appNavigationItems.map((item) => item.id)).size).toBe(5);
  });

  it('rejects destinations outside the shell', () => {
    expect(isAppTab('documents')).toBe(true);
    expect(isAppTab('ocr')).toBe(false);
  });

  it('keeps subviews associated with their bottom navigation destination', () => {
    expect(rootTabForRoute('preventive-care')).toBe('home');
    expect(rootTabForRoute('document-capture')).toBe('documents');
    expect(rootTabForRoute('profile')).toBe('profile');
  });
});
