import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { issuer, audience } from '../config';
import { UsersService } from '../users/users.service';
import { IS_PUBLIC } from './decorators';
import type { AuthRequest } from './types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector:Reflector,private readonly jwt:JwtService,
    private readonly users:UsersService) {}
  async canActivate(context:ExecutionContext):Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC,[context.getHandler(),context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = request.headers.authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match) throw new UnauthorizedException('Token requerido');
    let claims:{sub:string;jti:string;exp:number;token_use:string};
    try {
      claims = await this.jwt.verifyAsync(match[1],{algorithms:['HS256'],issuer:issuer(),audience:audience()});
      if (claims.token_use!=='access' || !/^\d+$/.test(claims.sub) ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.jti) ||
          typeof claims.exp!=='number') throw new Error('Claims inválidos');
    } catch { throw new UnauthorizedException('Token inválido o expirado'); }
    const user = await this.users.findActiveSession(claims.sub,claims.jti);
    if (!user) throw new UnauthorizedException('Sesión revocada o usuario inactivo');
    request.user=user;
    request.sessionId=claims.jti;
    return true;
  }
}
