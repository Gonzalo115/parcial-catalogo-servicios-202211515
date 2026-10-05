import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC, ROLE_KEY } from './decorators';
import type { AuthRequest, Role } from './types';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector:Reflector) {}
  canActivate(context:ExecutionContext):boolean {
    const targets=[context.getHandler(),context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC,targets)) return true;
    const request=context.switchToHttp().getRequest<AuthRequest>();
    const allowed=this.reflector.getAllAndOverride<Role[]>(ROLE_KEY,targets);
    if (!request.user || (allowed && !allowed.includes(request.user.rol)) ||
        (!allowed && !['GET','HEAD','OPTIONS'].includes(request.method) && request.user.rol!=='administrador')) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
