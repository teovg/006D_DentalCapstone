export function accountDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length > 0 ? name : null;
}

export function accountInitial(value: string | null): string | null {
  const name = accountDisplayName(value);
  if (!name) return null;
  // Avoid splitting an emoji or a letter plus combining mark in the avatar.
  const first = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(name)[Symbol.iterator]().next().value?.segment
    : Array.from(name)[0];
  return first?.toLocaleUpperCase('es-CL') ?? null;
}
