export interface OcrLine {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly score: number;
}

export interface OcrDocument {
  readonly text: string;
  readonly engine: string;
  readonly lines: readonly OcrLine[];
}
