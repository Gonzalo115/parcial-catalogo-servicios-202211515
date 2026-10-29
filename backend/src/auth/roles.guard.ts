import { portalOnly } from './portal-policy';
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
    if (portalOnly(request.user)) {
      const path=request.path.replace(/\/+$/, '');
      const permitted=/^\/api\/auth\/(me|logout)$/.test(path) ||
        /^\/api\/desk\/(bootstrap|faq|ci-opciones)$/.test(path) ||
        /^\/api\/desk\/tickets(?:\/[1-9]\d*(?:\/(accion|comentarios|adjuntos))?)?$/.test(path) ||
        /^\/api\/desk\/adjuntos\/[1-9]\d*$/.test(path);
      if(!permitted)throw new ForbiddenException('Módulo no disponible para solicitantes');
    }
    const allowed=this.reflector.getAllAndOverride<Role[]>(ROLE_KEY,targets);
    if (!request.user || (allowed && !allowed.includes(request.user.rol)) ||
        (!allowed && !['GET','HEAD','OPTIONS'].includes(request.method) && request.user.rol!=='administrador')) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
