export function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith('replace-with-')) throw new Error(`Configura ${name}`);
  return value;
}
export function jwtSecret(): string {
  const value = required('JWT_SECRET');
  if (Buffer.byteLength(value, 'utf8') < 32) throw new Error('JWT_SECRET debe tener al menos 32 bytes');
  return value;
}
export const issuer = () => process.env.JWT_ISSUER || 'catalogo-ti';
export const audience = () => process.env.JWT_AUDIENCE || 'catalogo-web';
