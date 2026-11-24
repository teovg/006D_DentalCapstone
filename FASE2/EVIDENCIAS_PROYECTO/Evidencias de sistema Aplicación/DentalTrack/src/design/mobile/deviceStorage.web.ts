export const deviceStorage = {
  get: (key: string): string | null => globalThis.localStorage.getItem(key),
  set: (key: string, value: string): void =>
    globalThis.localStorage.setItem(key, value),
};
