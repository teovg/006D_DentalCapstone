import Storage from "expo-sqlite/kv-store";
export const deviceStorage = {
  get: (key: string): string | null => Storage.getItemSync(key),
  set: (key: string, value: string): void => Storage.setItemSync(key, value),
};
