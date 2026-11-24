import explanations from './verifiedExplanations.json';

export type VerifiedExplanation = (typeof explanations)[number];

function normalized(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Coincidir con una palabra completa evita confundir, por ejemplo, corona y coronación.
export function findExplanations(label: string): readonly VerifiedExplanation[] {
  const text = ` ${normalized(label)} `;
  return explanations.filter(item => item.aliases.some(alias => text.includes(` ${normalized(alias)} `)));
}
