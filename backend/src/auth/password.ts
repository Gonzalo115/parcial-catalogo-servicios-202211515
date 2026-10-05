import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new BadRequestException('Contraseña: mínimo 12 caracteres y máximo 72 bytes UTF-8');
  }
  return bcrypt.hash(password, 12);
}
export async function checkPassword(password: string, hash: string): Promise<boolean> {
  if (Buffer.byteLength(password,'utf8') > 72) return false;
  return bcrypt.compare(password,hash);
}
