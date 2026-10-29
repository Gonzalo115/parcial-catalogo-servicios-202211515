import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { DbService } from '../db/db.service';
import { UsersService } from '../users/users.service';
import { checkPassword } from './password';

@Injectable()
export class AuthService {
  constructor(private readonly users:UsersService, private readonly jwt:JwtService,
    private readonly db:DbService) {}
  async login(identifier:string,password:string) {
    const user = await this.users.findForLogin(identifier);
    if (!user || !(await checkPassword(password,user.password_hash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const sessionId = randomUUID();
    const access_token = await this.jwt.signAsync({sub:String(user.id), jti:sessionId, token_use:'access'});
    const claims = this.jwt.decode<{exp:number}>(access_token);
    await this.db.query('INSERT INTO sesion(id,usuario_id,expira_en) VALUES($1,$2,$3)',
      [sessionId,user.id,new Date(claims.exp*1000)]);
    // El hash nunca se devuelve al navegador.
    return {access_token,token_type:'Bearer',expires_in:900,user:{
      id:String(user.id),nombre:user.nombre,nombre_usuario:user.nombre_usuario,
      correo:user.correo,rol:user.rol,roles:user.roles,puesto_id:String(user.puesto_id)}};
  }
  async logout(sessionId:string) {
    await this.db.query('UPDATE sesion SET revocada_en=now() WHERE id=$1 AND revocada_en IS NULL',[sessionId]);
  }
}
