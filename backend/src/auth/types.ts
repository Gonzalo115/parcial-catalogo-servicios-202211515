import type { Request } from 'express';
export type Role = 'administrador' | 'consulta';
export interface SafeUser { id:string; nombre:string; nombre_usuario:string; correo:string|null; rol:Role; puesto_id:string; }
export interface AuthRequest extends Request { user:SafeUser; sessionId:string; }
