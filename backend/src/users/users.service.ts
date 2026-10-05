import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import type { SafeUser } from '../auth/types';

const ACTIVE_HIERARCHY = `JOIN puesto p ON p.id=u.puesto_id
  JOIN seccion s ON s.id=p.seccion_id JOIN departamento d ON d.id=s.departamento_id
  JOIN area a ON a.id=d.area_id JOIN empresa e ON e.id=a.empresa_id`;
const ACTIVE_FILTER = 'u.activo AND p.activo AND s.activo AND d.activo AND a.activo AND e.activo';
@Injectable()
export class UsersService {
  constructor(private readonly db:DbService) {}
  async findForLogin(identifier:string) {
    // Nombres de usuario no contienen @: no hay ambigüedad entre usuario y correo.
    const field = identifier.includes('@') ? 'u.correo' : 'u.nombre_usuario';
    const {rows} = await this.db.query(`SELECT u.id::text,u.nombre,u.nombre_usuario,u.correo,
      u.rol,u.puesto_id::text,u.password_hash FROM usuario u ${ACTIVE_HIERARCHY}
      WHERE lower(${field})=$1 AND ${ACTIVE_FILTER}`, [identifier.trim().toLowerCase()]);
    return rows[0] || null;
  }
  async findActiveSession(userId:string, sessionId:string):Promise<SafeUser|null> {
    const {rows} = await this.db.query<SafeUser>(`SELECT u.id::text,u.nombre,u.nombre_usuario,u.correo,u.rol,u.puesto_id::text
      FROM usuario u ${ACTIVE_HIERARCHY} JOIN sesion t ON t.usuario_id=u.id
      WHERE u.id=$1 AND t.id=$2 AND t.revocada_en IS NULL AND t.expira_en>now()
      AND ${ACTIVE_FILTER}`,[userId,sessionId]);
    return rows[0] || null;
  }
}
