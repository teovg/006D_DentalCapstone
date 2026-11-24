import type {
  DentalArch,
  DentalSide,
  PatientTooth,
  ToothIdentity,
  ToothStatus,
} from './types';

const names = [
  'Incisivo central',
  'Incisivo lateral',
  'Canino',
  'Primer premolar',
  'Segundo premolar',
  'Primer molar',
  'Segundo molar',
  'Tercer molar',
] as const;

const quadrantByLocation: Record<`${DentalArch}-${DentalSide}`, number> = {
  'maxillary-right': 1,
  'maxillary-left': 2,
  'mandibular-left': 3,
  'mandibular-right': 4,
};

function universalCode(arch: DentalArch, side: DentalSide, position: number): string {
  if (arch === 'maxillary' && side === 'right') return String(9 - position);
  if (arch === 'maxillary' && side === 'left') return String(8 + position);
  if (arch === 'mandibular' && side === 'left') return String(17 + (8 - position));
  return String(24 + position);
}

export function createToothIdentity(
  arch: DentalArch,
  side: DentalSide,
  positionFromMidline: number,
): ToothIdentity {
  if (!Number.isInteger(positionFromMidline) || positionFromMidline < 1 || positionFromMidline > 8) {
    throw new RangeError('La posicion dental permanente debe estar entre 1 y 8.');
  }

  const quadrant = quadrantByLocation[`${arch}-${side}`];
  const name = names[positionFromMidline - 1];
  if (!quadrant || !name) throw new Error('Ubicacion dental no soportada.');

  return {
    id: `permanent:${arch}:${side}:${positionFromMidline}`,
    dentition: 'permanent',
    arch,
    side,
    positionFromMidline,
    name,
    fdi: `${quadrant}${positionFromMidline}`,
    universal: universalCode(arch, side, positionFromMidline),
  };
}

export const permanentTeeth: readonly ToothIdentity[] = (
  [
    ['maxillary', 'right'],
    ['maxillary', 'left'],
    ['mandibular', 'left'],
    ['mandibular', 'right'],
  ] as const
).flatMap(([arch, side]) =>
  Array.from({ length: 8 }, (_, index) => createToothIdentity(arch, side, index + 1)),
);

export function findPermanentToothByFdi(fdi: string): ToothIdentity | undefined {
  return permanentTeeth.find((tooth) => tooth.fdi === fdi);
}

export function findPermanentToothByUniversal(universal: string): ToothIdentity | undefined {
  const normalized = universal.trim().replace(/^#/, '');
  return permanentTeeth.find((tooth) => tooth.universal === normalized);
}

const demoStatusByFdi: Readonly<Record<string, ToothStatus>> = {
  '16': 'in_treatment',
  '26': 'observation',
  '36': 'healthy',
  '46': 'urgent',
  '18': 'missing',
};

const summaryByStatus: Record<ToothStatus, string> = {
  healthy: 'Sin hallazgos registrados.',
  observation: 'Pieza marcada para observación.',
  in_treatment: 'Tratamiento activo con sesiones pendientes.',
  urgent: 'Pieza marcada para evaluación prioritaria.',
  missing: 'Pieza registrada como ausente.',
};

export const demoPatientTeeth: readonly PatientTooth[] = permanentTeeth.map((tooth) => {
  const status = demoStatusByFdi[tooth.fdi] ?? 'healthy';
  return {
    ...tooth,
    status,
    summary: summaryByStatus[status],
    ...(tooth.id === 'permanent:maxillary:right:6' ? { lastUpdate: '2026-09-24' } : {}),
  };
});
