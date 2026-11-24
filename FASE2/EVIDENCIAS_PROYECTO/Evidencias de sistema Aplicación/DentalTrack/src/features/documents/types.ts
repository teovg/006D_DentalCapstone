import type { BudgetItem, BudgetRowDraft } from './budgetProposal';

export type DentalNumberingSystem = 'fdi' | 'universal' | 'unknown';

export interface BudgetCaptureDraft {
  readonly id: string;
  readonly localUri: string;
  readonly fileName: string;
  readonly numberingSystem: DentalNumberingSystem;
  readonly clinicHint: string;
  readonly createdAt: string;
  readonly status: 'ready_for_ocr' | 'confirmed';
  readonly items?: readonly BudgetItem[];
  readonly review?: { readonly text: string; readonly rows: readonly BudgetRowDraft[] };
}
