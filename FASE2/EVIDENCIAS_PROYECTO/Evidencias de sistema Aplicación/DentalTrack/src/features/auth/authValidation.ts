export function passwordValidation(password: string, confirmation: string): string | null {
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return null;
}
