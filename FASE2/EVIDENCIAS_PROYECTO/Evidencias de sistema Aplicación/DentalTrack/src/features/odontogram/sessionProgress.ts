export function sessionProgress(completed: number, total: number | null): string {
  const count = completed.toLocaleString('es-CL');
  if (total === null || total <= 0) {
    if (completed === 0) return 'Sin sesiones registradas';
    return `${count} ${completed === 1 ? 'sesión registrada' : 'sesiones registradas'}`;
  }
  return `${count} de ${total.toLocaleString('es-CL')} ${total === 1 ? 'sesión registrada' : 'sesiones registradas'}`;
}
