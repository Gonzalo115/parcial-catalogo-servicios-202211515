import { SetMetadata } from '@nestjs/common';
import type { Role } from './types';
export const IS_PUBLIC = 'isPublic';
export const ROLE_KEY = 'allowedRoles';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles:Role[]) => SetMetadata(ROLE_KEY, roles);
