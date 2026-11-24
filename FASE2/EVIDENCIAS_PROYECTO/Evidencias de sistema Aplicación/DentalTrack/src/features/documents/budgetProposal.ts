import { findPermanentToothByFdi, findPermanentToothByUniversal } from '../../domain/teeth/catalog';
import type { DentalNumberingSystem } from './types';
import type { OcrDocument, OcrLine } from './ocrTypes';

export interface BudgetRowDraft {
  readonly toothCode: string;
  readonly description: string;
  readonly amount: string;
  readonly sourceToothCode?: string;
  readonly baseAmount?: string;
  readonly agreementAmount?: string;
}

export interface BudgetItem {
  readonly toothCode: string;
  readonly toothId: string | null;
  readonly description: string;
  readonly amountClp: number;
  readonly sourceToothCode?: string;
  readonly baseAmountClp?: number;
  readonly agreementAmountClp?: number;
}

function fromTable(document: OcrDocument): BudgetRowDraft[] | null {
  const { lines } = document;
  const finalHeader = lines.find((line) => /valor\s*final/i.test(line.text));
  const toothHeader = lines.find((line) => /^pieza$/i.test(line.text.trim()));
  const total = lines.find((line) => /^totales\s*:?$/i.test(line.text.trim()));
  if (!finalHeader || !toothHeader || !total) return null;
  const slope = (finalHeader.y - toothHeader.y) / (finalHeader.x - toothHeader.x);
  const rowY = (line: OcrLine) => line.y - slope * line.x;
  const nearestHeader = (pattern: RegExp) => lines.filter((line) => pattern.test(line.text.trim()) && line.x > toothHeader.x && line.x < finalHeader.x)
    .sort((a, b) => Math.abs(rowY(a) - rowY(toothHeader)) - Math.abs(rowY(b) - rowY(toothHeader)))[0];
  const baseHeader = nearestHeader(/^(arancel|base)$/i);
  const agreementHeader = nearestHeader(/^convenio$/i);
  const descriptionHeader = nearestHeader(/^prestaci[oó]n$/i);
  if (!baseHeader || !agreementHeader || !descriptionHeader) return null;
  const body = lines.filter((line) => rowY(line) > rowY(toothHeader) + 0.01 && rowY(line) < rowY(total) - 0.01);
  const money = (line: OcrLine) => /^\$\s*\d{1,3}(?:\.\d{3})+$/.test(line.text.trim());
  const headers = [descriptionHeader, baseHeader, agreementHeader, finalHeader];
  const priceColumns = headers.slice(1).map((header, index) => {
    const left = (headers[index]!.x + header.x) / 2;
    const right = index === 2 ? 1 : (header.x + headers[index + 2]!.x) / 2;
    return body.filter((line) => money(line) && line.x >= left && line.x < right).sort((a, b) => rowY(a) - rowY(b));
  });
  const finals = priceColumns[2]!;
  if (!finals.length) return null;
  const pieces = body.filter((line) => line.left < toothHeader.right + 0.025 &&
    !/^\s*\d{2}-\d{2}-\d{3}/.test(line.text) &&
    /^\(?\s*(?:\d{1,2}(?:[.,][a-z0](?:[.,][a-z0])*)?|x[.,]s)/i.test(line.text));
  const descriptions = body.filter((line) => /^[\[(]\s*\d+(?:[.,]\d+){2}\s*[\])]/.test(line.text));
  const gap = finals.length > 1 ? Math.min(...finals.slice(1).map((line, i) => rowY(line) - rowY(finals[i]!))) : 0.06;
  return finals.map((price, index) => {
    const nearby = (line: OcrLine) => Math.abs(rowY(line) - rowY(price)) < Math.max(gap * 0.65, 0.018);
    const piece = pieces.filter(nearby).sort((a, b) => Math.abs(rowY(a) - rowY(price)) - Math.abs(rowY(b) - rowY(price)))[0];
    const description = descriptions.filter(nearby).sort((a, b) => Math.abs(rowY(a) - rowY(price)) - Math.abs(rowY(b) - rowY(price)))[0];
    const code = piece?.text.match(/^\(?\s*(\d{1,2}|x[.,]s)(?:[.,]([a-z0](?:[.,][a-z0])*))?/i);
    const continued = description ? body.filter((line) => line !== description && line.left >= descriptionHeader.left - 0.03 && line.x < (descriptionHeader.x + baseHeader.x) / 2 &&
      /^(RESINA|NI[ÑN]OS Y ADULTOS)$/i.test(line.text.trim()) && Math.abs(rowY(line) - rowY(description)) < gap * 0.65).map((line) => line.text).join(' ') : '';
    return {
      toothCode: code?.[1] && /^\d+$/.test(code[1]) ? code[1] : '', sourceToothCode: code?.[1] ?? '',
      description: description ? [description.text.replace(/^[\[(]\s*\d+(?:[.,]\d+){2}\s*[\])]\s*/, ''), continued].filter(Boolean).join(' ') : '',
      amount: price.text.replace(/\D/g, ''),
      ...(priceColumns[0]!.length === finals.length ? { baseAmount: priceColumns[0]![index]!.text.replace(/\D/g, '') } : {}),
      ...(priceColumns[1]!.length === finals.length ? { agreementAmount: priceColumns[1]![index]!.text.replace(/\D/g, '') } : {}),
    };
  });
}

export function proposeBudget(input: string | OcrDocument): { clinic: string; rows: BudgetRowDraft[] } {
  const text = typeof input === 'string' ? input : input.text;
  const clinic = text.match(/^\s*cl[ií]nica\s*:\s*([^\r\n]+)/im)?.[1]?.trim() ?? (/\buno\s+salud\b|unosalud\.cl/i.test(text) ? 'Uno Salud Dental' : '');
  if (typeof input !== 'string') {
    const table = fromTable(input);
    if (table) return { clinic, rows: table };
  }
  const rows = text.split(/\r?\n/).flatMap((line) => {
    const item = line.match(/^\s*(?:pieza\s+)?#?(\d{1,2})\s+([^$]+?)\s*\$\s*(\d{1,3}(?:\.\d{3})+|\d+)\s*$/i);
    if (!item) return [];
    return [{ toothCode: item[1]!, description: item[2]!.trim(), amount: item[3]!.replaceAll('.', '') }];
  });
  return { clinic, rows };
}

export function confirmBudgetItems(rows: readonly BudgetRowDraft[], numbering: DentalNumberingSystem): BudgetItem[] {
  if (rows.length === 0) throw new Error('Añade al menos una prestación del presupuesto.');
  return rows.map((row, index) => {
    const toothCode = row.toothCode.trim();
    const description = row.description.trim();
    const amount = row.amount.trim();
    const tooth = numbering === 'fdi' ? findPermanentToothByFdi(toothCode)
      : numbering === 'universal' ? findPermanentToothByUniversal(toothCode) : undefined;
    if (toothCode && !tooth) {
      throw new Error(`Prestación ${index + 1}. Revisa la pieza y el sistema de numeración.`);
    }
    if (!description || !/^\d{1,9}$/.test(amount)) {
      throw new Error(`Prestación ${index + 1}. Completa la descripción y el importe en pesos sin puntos.`);
    }
    return {
      toothCode, toothId: tooth?.id ?? null, description, amountClp: Number(amount),
      ...(row.sourceToothCode ? { sourceToothCode: row.sourceToothCode } : {}),
      ...(row.baseAmount && /^\d{1,9}$/.test(row.baseAmount) ? { baseAmountClp: Number(row.baseAmount) } : {}),
      ...(row.agreementAmount && /^\d{1,9}$/.test(row.agreementAmount) ? { agreementAmountClp: Number(row.agreementAmount) } : {}),
    };
  });
}
