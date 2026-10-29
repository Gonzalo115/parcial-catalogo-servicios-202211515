import { portalOnly } from '../auth/portal-policy';
import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { requireId } from '../common/dto';
import { FLOWS, INCIDENTS, SUPPORT, incidentCategory } from './workflows';
const bad = (message: string): never => { throw new BadRequestException(message); };
const text = (v: any, name: string, max = 10000) => { if (typeof v !== 'string' || !v.trim() || v.length > max)
    bad(`Campo inválido: ${name}`); return v.trim(); };
const obj = (b: any, keys: string[]) => { if (!b || typeof b !== 'object' || Array.isArray(b))
    bad('Objeto JSON requerido'); for (const k of Object.keys(b))
    if (!keys.includes(k))
        bad(`Campo no permitido: ${k}`); };
const positive = (v: any, name: string, max = 10000000) => { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > max)
    bad(`Número inválido: ${name}`); return n; };
const bool = (v: any) => { if (typeof v !== 'boolean')
    bad('Se requiere booleano'); return v; };
const activeRoles = (u: any) => new Set<string>([u.rol, ...(u.roles || [])]);
@Injectable()
export class DeskService {
    constructor(private readonly db: DataSource) { }
    private q(sql: string, args: any[] = [], m: EntityManager = this.db.manager): Promise<any[]> { return m.query(sql, args); }
    private async one(sql: string, args: any[] = [], m = this.db.manager) { const r = await this.q(sql, args, m); return r[0]; }
    private admin(u: any) { if (u.rol !== 'administrador')
        throw new ForbiddenException('Solo administrador'); }
    private role(u: any, ...roles: string[]) { if (u.rol !== 'administrador' && !roles.some(r => activeRoles(u).has(r)))
        throw new ForbiddenException('Rol funcional requerido'); }
    private pending: Promise<any> = Promise.resolve();
    private async tx<T>(fn: (m: EntityManager) => Promise<T>): Promise<T> { const work = this.pending.then(() => this.db.transaction(async (m) => { await m.query('SELECT pg_advisory_xact_lock(9021003)'); return fn(m); })); this.pending = work.catch(() => undefined); return work; }
    private async audit(m: EntityManager, u: any, entity: string, id: any, action: string, old: any, next: any, reason?: string) { await this.q('INSERT INTO bitacora(entidad,registro_id,actor_id,accion,anterior,nuevo,motivo) VALUES($1,$2,$3,$4,$5,$6,$7)', [entity, String(id), u.id, action, old ? JSON.stringify(old) : null, next ? JSON.stringify(next) : null, reason || null], m); }
    private async permission(u: any, queue: any, perm: string, m = this.db.manager) {
        if (u.rol === 'administrador')
            return true;
        if (perm !== 'consultar' && !activeRoles(u).has(perm === 'aprobar' ? 'aprobador' : 'agente'))
            return false;
        return !!await this.one(`SELECT 1 FROM cola_permiso WHERE cola_id=$1 AND $2=ANY(permisos) AND (usuario_id=$3 OR rol=ANY($4::text[])) LIMIT 1`, [queue, perm, u.id, [...activeRoles(u)]], m);
    }
    private async can(u: any, t: any, p = 'consultar', m = this.db.manager) {
        if(portalOnly(u)&&String(t.solicitante_id)!==String(u.id))throw new ForbiddenException('Solo puede consultar sus propios tickets');
        if (p === 'consultar' && (u.rol === 'administrador' || (u.rol === 'consulta' && activeRoles(u).size === 1) || String(t.solicitante_id) === u.id))
            return;
        if (!await this.permission(u, t.cola_id, p, m))
            throw new ForbiddenException('Sin permiso para esta cola u operación');
    }
    private async ticket(id: string, m = this.db.manager) { requireId(id); const t = await this.one('SELECT t.*,c.proceso,c.nivel,p.tipo FROM ticket t JOIN cola c ON c.id=t.cola_id JOIN proceso p ON p.codigo=c.proceso WHERE t.id=$1', [id], m); if (!t)
        throw new NotFoundException('Ticket no encontrado'); return t; }
    private async user(id: any, m = this.db.manager) { requireId(String(id)); const u = await this.one(`SELECT u.id FROM usuario u JOIN puesto p ON p.id=u.puesto_id JOIN seccion s ON s.id=p.seccion_id JOIN departamento d ON d.id=s.departamento_id JOIN area a ON a.id=d.area_id JOIN empresa e ON e.id=a.empresa_id WHERE u.id=$1 AND u.activo AND p.activo AND s.activo AND d.activo AND a.activo AND e.activo`, [id], m); if (!u)
        bad('Usuario inexistente o jerarquía inactiva'); return u; }
    private async service(id: any, m = this.db.manager) { requireId(String(id)); if (!await this.one('SELECT 1 FROM servicio_nivel2 n JOIN servicio_nivel1 p ON p.id=n.nivel1_id WHERE n.id=$1 AND n.activo IS DISTINCT FROM false AND p.activo IS DISTINCT FROM false', [id], m))
        bad('Servicio inexistente o inactivo'); }
    private async worker(id: any, queue: any, m: EntityManager) { await this.user(id, m); const u = await this.one('SELECT id::text,rol FROM usuario WHERE id=$1', [id], m); u.roles = (await this.q('SELECT rol FROM usuario_rol WHERE usuario_id=$1', [id], m)).map(x => x.rol); if (!await this.permission(u, queue, 'atender', m))
        bad('Agente no autorizado para cola'); }
    private portalTicket(t:any) {
        const keys=['id','titulo','descripcion','estado','prioridad','impacto','urgencia','canal','creado_en','actualizado_en','primera_atencion','resuelto_en','cerrado_en','resolucion','sin_ci_motivo','proceso','tipo','servicio','servicio_codigo','nivel1_id','responsable'];
        return Object.fromEntries(keys.filter(k=>k in t).map(k=>[k,t[k]]));
    }
    async ciOptions(u:any,q:any={}) {
        const limit=positive(q.limite??30,'limite',100);
        return {items:await this.q(`SELECT id::text,codigo,nombre FROM ci WHERE activo AND ($1::boolean=false OR responsable_id=$2) AND (codigo||' '||nombre) ILIKE $3 ORDER BY codigo LIMIT $4`,[portalOnly(u),u.id,`%${String(q.buscar||'').slice(0,200)}%`,limit])};
    }
    async bootstrap(u: any) {
        if(portalOnly(u))return {
          user:u,portal:true,flows:{},soporte:[],clases:[],ubicaciones:[],niveles1:[],secciones:[],
          incidentes:INCIDENTS,procesos:await this.q('SELECT codigo,nombre,tipo FROM proceso ORDER BY codigo'),
          colas:await this.q(`SELECT DISTINCT ON(c.proceso) c.id::text,p.nombre,c.proceso,c.activo FROM cola c JOIN proceso p ON p.codigo=c.proceso WHERE c.activo ORDER BY c.proceso,c.nivel,c.id`),
          usuarios:[{id:u.id,nombre:u.nombre}],
          servicios:await this.q('SELECT n.id::text,n.codigo,n.nombre FROM servicio_nivel2 n JOIN servicio_nivel1 p ON p.id=n.nivel1_id WHERE n.activo IS DISTINCT FROM false AND p.activo IS DISTINCT FROM false ORDER BY n.codigo')
        };
        return { user: u, flows: FLOWS, incidentes: INCIDENTS, soporte: SUPPORT, procesos: await this.q('SELECT * FROM proceso ORDER BY codigo'), colas: await this.queues(u), clases: await this.q('SELECT * FROM ci_clase ORDER BY id'), ubicaciones: await this.q('SELECT * FROM ubicacion ORDER BY id'), usuarios: u.rol === 'administrador' ? await this.q(`SELECT u.id::text,u.nombre,u.nombre_usuario,u.rol,u.activo,coalesce((SELECT jsonb_agg(r.rol) FROM usuario_rol r WHERE r.usuario_id=u.id),'[]') roles FROM usuario u ORDER BY id`) : await this.q(`SELECT id::text,nombre FROM usuario WHERE activo AND (id=$1 OR id IN(SELECT usuario_id FROM usuario_rol WHERE rol IN ('agente','aprobador')))`, [u.id]), niveles1: await this.q('SELECT id::text,codigo,nombre FROM servicio_nivel1 WHERE activo IS DISTINCT FROM false ORDER BY codigo'), secciones: await this.q('SELECT id::text,codigo,nombre FROM seccion WHERE activo ORDER BY codigo'), servicios: await this.q('SELECT id::text,codigo,nombre,nivel1_id::text,activo FROM servicio_nivel2 ORDER BY codigo') }; }
    async queues(u: any) { if(portalOnly(u))throw new ForbiddenException('Módulo operativo no disponible para solicitantes'); const rows = await this.q(`SELECT c.*,coalesce((SELECT jsonb_agg(p) FROM cola_permiso p WHERE p.cola_id=c.id),'[]') permisos FROM cola c ORDER BY codigo`); const out = []; for (const c of rows)
        if (u.rol === 'administrador' || (u.rol === 'consulta' && activeRoles(u).size === 1) || activeRoles(u).has('solicitante') || await this.permission(u, c.id, 'consultar'))
            out.push(c); return out; }
    async setRoles(u: any, b: any) { this.admin(u); obj(b, ['usuario_id', 'roles']); if (!Array.isArray(b.roles) || b.roles.some((x: any) => !['solicitante', 'agente', 'aprobador'].includes(x)))
        bad('Roles inválidos'); return this.tx(async (m) => { await this.user(b.usuario_id, m); const old = await this.q('SELECT rol FROM usuario_rol WHERE usuario_id=$1', [b.usuario_id], m); if (old.some(r => r.rol === 'agente') && !b.roles.includes('agente') && await this.one("SELECT 1 FROM ticket WHERE responsable_id=$1 AND estado NOT IN ('cerrado','rechazado')", [b.usuario_id], m))
        bad('Reasigne tickets antes de retirar agente'); await this.q('DELETE FROM usuario_rol WHERE usuario_id=$1', [b.usuario_id], m); for (const r of new Set(b.roles))
        await this.q('INSERT INTO usuario_rol VALUES($1,$2)', [b.usuario_id, r], m); await this.audit(m, u, 'roles', b.usuario_id, 'roles', old, b.roles); return { ok: true }; }); }
    async saveQueue(u: any, b: any, id?: string) {
        this.admin(u);
        obj(b, ['codigo', 'nombre', 'descripcion', 'activo', 'proceso', 'nivel', 'orden', 'primera_min', 'resolucion_min', 'responsable_id', 'permisos']);
        return this.tx(async (m) => {
            const old = id ? await this.one('SELECT * FROM cola WHERE id=$1', [requireId(id)], m) : null;
            if (id && !old)
                throw new NotFoundException();
            const v = { ...old, ...b };
            text(v.codigo, 'codigo', 50);
            text(v.nombre, 'nombre', 300);
            if (!FLOWS[v.proceso])
                bad('Proceso inválido');
            await this.user(v.responsable_id, m);
            if (!Number.isInteger(Number(v.nivel ?? 1)) || Number(v.nivel ?? 1) < 0 || Number(v.nivel ?? 1) > 4)
                bad('Nivel 0–4');
            if (old && old.proceso !== v.proceso && await this.one('SELECT 1 FROM ticket WHERE cola_id=$1', [id], m))
                bad('Cola con historial: no cambiar proceso');
            const args = [v.codigo, v.nombre, v.descripcion ?? '', v.activo === undefined ? true : bool(v.activo), v.proceso, Number(v.nivel ?? 1), v.orden ?? 'prioridad_antiguedad', positive(v.primera_min ?? 60, 'primera_min'), positive(v.resolucion_min ?? 1440, 'resolucion_min'), v.responsable_id];
            const saved = id ? await this.one('UPDATE cola SET codigo=$1,nombre=$2,descripcion=$3,activo=$4,proceso=$5,nivel=$6,orden=$7,primera_min=$8,resolucion_min=$9,responsable_id=$10 WHERE id=$11 RETURNING *', [...args, id], m) : await this.one('INSERT INTO cola(codigo,nombre,descripcion,activo,proceso,nivel,orden,primera_min,resolucion_min,responsable_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', args, m);
            if (b.permisos !== undefined) {
                if (!Array.isArray(b.permisos))
                    bad('Lista de permisos requerida');
                await this.q('DELETE FROM cola_permiso WHERE cola_id=$1', [saved.id], m);
                for (const p of b.permisos) {
                    obj(p, ['usuario_id', 'rol', 'permisos']);
                    if (p.usuario_id)
                        await this.user(p.usuario_id, m);
                    if (!Array.isArray(p.permisos) || !p.permisos.length)
                        bad('Permisos requeridos');
                    await this.q('INSERT INTO cola_permiso(cola_id,usuario_id,rol,permisos) VALUES($1,$2,$3,$4)', [saved.id, p.usuario_id || null, p.rol || null, p.permisos], m);
                }
                const assigned = await this.q("SELECT DISTINCT responsable_id::text id FROM ticket WHERE cola_id=$1 AND responsable_id IS NOT NULL AND estado NOT IN ('cerrado','rechazado')", [saved.id], m);
                for (const a of assigned)
                    await this.worker(a.id, saved.id, m);
            }
            await this.audit(m, u, 'cola', saved.id, id ? 'editar' : 'crear', old, saved);
            return saved;
        });
    }
    async tickets(u: any, q: any = {}) {
        const limit = positive(q.limite ?? 20, 'limite', 100), page = positive(q.pagina ?? 1, 'pagina');
        let args: any[] = [];
        const w: string[] = [];
        const add = (s: string, v: any) => { args.push(v); w.push(s.replace('?', `$${args.length}`)); };
        if(portalOnly(u)) {args.push(u.id);w.push('t.solicitante_id=$1');}
        else if (u.rol !== 'administrador' && !(u.rol === 'consulta' && activeRoles(u).size === 1)) {
            args.push(u.id, [...activeRoles(u)]);
            w.push(`(t.solicitante_id=$1 OR EXISTS(SELECT 1 FROM cola_permiso cp WHERE cp.cola_id=t.cola_id AND 'consultar'=ANY(cp.permisos) AND (cp.usuario_id=$1 OR cp.rol=ANY($2::text[]))))`);
        }
        if (q.buscar)
            add("(t.id::text||' '||t.titulo) ILIKE ?", `%${String(q.buscar).slice(0, 200)}%`);
        for (const f of ['servicio_id', 'cola_id', 'responsable_id', 'estado', 'prioridad'])
            if (q[f])
                add(`t.${f}=?`, q[f]);
        if (q.proceso)
            add('c.proceso=?', q.proceso);
        for (const [k, op] of [['desde', '>='], ['hasta', '<=']])
            if (q[k]) {
                if (!Number.isFinite(Date.parse(q[k])))
                    bad('Fecha inválida');
                add(`t.creado_en${op}?`, q[k]);
            }
        const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
        const total = (await this.one(`SELECT count(*)::int total FROM ticket t JOIN cola c ON c.id=t.cola_id ${where}`, args)).total;
        const items = await this.q(`SELECT t.*,c.nombre cola,c.proceso,p.tipo,s.codigo servicio_codigo,s.nombre servicio,s.nivel1_id::text,u.nombre responsable FROM ticket t JOIN cola c ON c.id=t.cola_id JOIN proceso p ON p.codigo=c.proceso JOIN servicio_nivel2 s ON s.id=t.servicio_id LEFT JOIN usuario u ON u.id=t.responsable_id ${where} ORDER BY CASE WHEN c.orden='prioridad_antiguedad' THEN t.prioridad ELSE 0 END,t.creado_en,t.id LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, limit, (page - 1) * limit]);
        return { items:portalOnly(u)?items.map(t=>this.portalTicket(t)):items, total, pagina: page, limite: limit };
    }
    private incident(d: any, priority: any) { if (!/^I[0-6]$/.test(d.categoria || ''))
        bad('Categoría I0–I6 requerida'); for (const k of ['duracion_estimada_h', 'duracion_real_h'])
        if (d[k] != null && (!Number.isFinite(Number(d[k])) || Number(d[k]) < 0))
            bad('Duración inválida'); if (typeof d.redundancia !== 'boolean')
        bad('Indique redundancia disponible'); if (!['interrupcion', 'degradacion', 'seguridad', 'sin_interrupcion'].includes(d.afectacion))
        bad('Indique afectación'); if (d.duracion_estimada_h != null && incidentCategory(Number(d.duracion_estimada_h), d.afectacion === 'seguridad') !== d.categoria)
        bad('Categoría incompatible con regla complementaria de duración'); const mapping = INCIDENTS.find(x => x.categoria === d.categoria)!; if (Number(priority) !== mapping.prioridad || d.redundancia !== mapping.redundancia)
        text(d.justificacion_clasificacion, 'justificacion_clasificacion'); }
    async create(u: any, b: any) { this.role(u, 'solicitante', 'agente'); obj(b, ['titulo', 'descripcion', 'solicitante_id', 'servicio_id', 'cola_id', 'prioridad', 'impacto', 'urgencia', 'canal', 'ci_ids', 'sin_ci_motivo', 'detalle', 'clave_externa']); return this.tx(m => this.createTx(u, b, m)).then(t=>portalOnly(u)?this.portalTicket(t):t); }
    private async createTx(u: any, b: any, m: EntityManager) {
        const title = text(b.titulo, 'titulo', 300), description = text(b.descripcion, 'descripcion');
        const requester = b.solicitante_id || u.id;
        if (String(requester) !== u.id)
            this.role(u, 'agente');
        await this.user(requester, m);
        await this.service(b.servicio_id, m);
        const queue = await this.one('SELECT * FROM cola WHERE id=$1 AND activo', [requireId(String(b.cola_id))], m);
        if (!queue)
            bad('Cola inexistente o inactiva');
        const d = b.detalle ?? {};
        if (typeof d !== 'object' || Array.isArray(d))
            bad('detalle debe ser objeto');
        if (JSON.stringify(d).length > 30000)
            bad('Detalle demasiado grande');
        for (const k of ['aprobado_por', 'aprobado_en', 'servicio_creado_id'])
            if (k in d)
                bad('Campo de control reservado');
        const pr = positive(b.prioridad ?? 2, 'prioridad', 3);
        if (queue.proceso === 'incidentes')
            this.incident(d, pr);
        if (queue.proceso === 'eventos' && !/^E[0-3]$/.test(d.categoria || ''))
            bad('Categoría E0–E3 requerida');
        if (queue.proceso === 'accesos') {
            await this.user(d.beneficiario_id, m);
            text(d.recurso, 'recurso');
            text(d.permiso, 'permiso');
            if (!['provision', 'revocacion'].includes(d.operacion))
                bad('Operación de acceso inválida');
        }
        const cis = b.ci_ids ?? [];
        if (!Array.isArray(cis) || cis.length > 100)
            bad('CI inválidos');
        if (!cis.length)
            text(b.sin_ci_motivo, 'Motivo sin CI');
        if(portalOnly(u))for(const ci of cis){
          if(!await this.one('SELECT 1 FROM ci WHERE id=$1 AND activo AND responsable_id=$2',[requireId(String(ci)),u.id],m))throw new ForbiddenException('CI no autorizado para este solicitante');
        }
        if(portalOnly(u)&&queue.proceso==='accesos'&&String(d.beneficiario_id)!==String(u.id))throw new ForbiddenException('El beneficiario debe ser el propio solicitante');
        for (const ci of cis)
            if (!await this.one('SELECT 1 FROM ci WHERE id=$1 AND activo', [requireId(String(ci))], m))
                bad('CI inexistente o inactivo');
        const saved = await this.one(`INSERT INTO ticket(titulo,descripcion,solicitante_id,creador_id,servicio_id,cola_id,prioridad,impacto,urgencia,canal,sin_ci_motivo,detalle,clave_externa) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [title, description, requester, u.id, b.servicio_id, b.cola_id, pr, b.impacto ?? 'medio', b.urgencia ?? 'media', b.canal ?? 'web', cis.length ? null : b.sin_ci_motivo, JSON.stringify(d), b.clave_externa ? text(b.clave_externa, 'clave_externa', 200) : null], m);
        for (const id of new Set(cis))
            await this.q('INSERT INTO ticket_ci VALUES($1,$2)', [saved.id, id], m);
        await this.audit(m, u, 'ticket', saved.id, 'crear', null, saved);
        return saved;
    }
    async detail(u: any, id: string) {
        const t = await this.ticket(id);
        await this.can(u, t);
        const internal = await this.permission(u, t.cola_id, 'consultar') && (u.rol === 'administrador' || activeRoles(u).has('agente') || activeRoles(u).has('aprobador'));
        const result:any = { ...t, servicio: await this.one('SELECT n.*,p.nombre nivel1 FROM servicio_nivel2 n JOIN servicio_nivel1 p ON p.id=n.nivel1_id WHERE n.id=$1', [t.servicio_id]), ci: await this.q('SELECT c.id::text,c.codigo,c.nombre FROM ticket_ci x JOIN ci c ON c.id=x.ci_id WHERE ticket_id=$1', [id]), comentarios: await this.q('SELECT c.*,u.nombre actor FROM comentario c JOIN usuario u ON u.id=c.actor_id WHERE ticket_id=$1 AND (NOT interno OR $2) ORDER BY c.id', [id, internal]), adjuntos: await this.q('SELECT id::text,nombre,mime,interno FROM adjunto WHERE ticket_id=$1 AND (NOT interno OR $2) ORDER BY id', [id, internal]), bitacora: await this.q('SELECT b.*,u.nombre actor FROM bitacora b JOIN usuario u ON u.id=b.actor_id WHERE entidad=$1 AND registro_id=$2 ORDER BY b.id', ['ticket', id]), relaciones: await this.q('SELECT * FROM ticket_relacion WHERE origen_id=$1 OR destino_id=$1', [id]), notificaciones: await this.q('SELECT * FROM notificacion WHERE ticket_id=$1 ORDER BY id', [id]), transiciones: FLOWS[t.proceso] };
        if(!portalOnly(u))return result;
        return {...this.portalTicket(result),
          servicio:{codigo:result.servicio.codigo,nombre:result.servicio.nombre,nivel1:result.servicio.nivel1,nivel1_id:result.servicio.nivel1_id},
          ci:result.ci,comentarios:result.comentarios.map((c:any)=>({id:c.id,actor:c.actor,texto:c.texto,fecha:c.fecha,interno:false})),
          adjuntos:result.adjuntos,transiciones:[],relaciones:[],notificaciones:[],
          bitacora:result.bitacora.map((b:any)=>({id:b.id,fecha:b.fecha,accion:b.accion,actor:'Mesa de servicio',anterior:b.anterior?{estado:b.anterior.estado}:null,nuevo:b.nuevo?{estado:b.nuevo.estado}:null}))};
    }
    async edit(u: any, id: string, b: any) { obj(b, ['titulo', 'descripcion', 'prioridad', 'impacto', 'urgencia', 'detalle']); return this.tx(async (m) => { const t = await this.ticket(id, m); await this.can(u, t, 'atender', m); if (['cerrado', 'rechazado'].includes(t.estado))
        bad('Ticket finalizado'); const d = { ...t.detalle, ...(b.detalle || {}) }; for (const protectedKey of ['aprobado_por', 'aprobado_en', 'servicio_creado_id'])
        if (d[protectedKey] !== t.detalle[protectedKey])
            bad('Campo de control no editable'); if (t.proceso === 'incidentes')
        this.incident(d, b.prioridad ?? t.prioridad); const n = await this.one('UPDATE ticket SET titulo=$1,descripcion=$2,prioridad=$3,impacto=$4,urgencia=$5,detalle=$6,actualizado_en=now() WHERE id=$7 RETURNING *', [text(b.titulo ?? t.titulo, 'titulo', 300), text(b.descripcion ?? t.descripcion, 'descripcion'), positive(b.prioridad ?? t.prioridad, 'prioridad', 3), b.impacto ?? t.impacto, b.urgencia ?? t.urgencia, JSON.stringify(d), id], m); await this.audit(m, u, 'ticket', id, 'editar', t, n); return n; }); }
    async action(u: any, id: string, b: any) {
        obj(b, ['accion', 'estado', 'motivo', 'usuario_id', 'cola_id', 'detalle', 'resolucion']);
        return this.tx(async (m) => {
            const t = await this.ticket(id, m), action = text(b.accion, 'accion', 40), reason = b.motivo ? text(b.motivo, 'motivo') : null;
            let n: any;
            if (action === 'tomar' || action === 'asignar') {
                await this.can(u, t, 'atender', m);
                if (['cerrado', 'rechazado', 'pausado'].includes(t.estado))
                    bad('No asignable');
                const uid = action === 'tomar' ? u.id : requireId(String(b.usuario_id));
                await this.worker(uid, t.cola_id, m);
                n = await this.one('UPDATE ticket SET responsable_id=$1,primera_atencion=coalesce(primera_atencion,now()),actualizado_en=now() WHERE id=$2 AND responsable_id IS NULL RETURNING *', [uid, id], m);
                if (!n)
                    throw new ConflictException('Ticket ya asignado. Transfiera con motivo para reasignar.');
            }
            else if (action === 'transferir' || action === 'escalar') {
                await this.can(u, t, 'transferir', m);
                text(reason, 'motivo');
                if (['cerrado', 'rechazado', 'pausado'].includes(t.estado))
                    bad('Ticket no transferible');
                const dest = await this.one('SELECT * FROM cola WHERE id=$1 AND activo', [requireId(String(b.cola_id))], m);
                if (!dest || dest.proceso !== t.proceso)
                    bad('Destino debe estar activo y pertenecer al mismo proceso');
                if (action === 'escalar' && dest.nivel <= t.nivel)
                    bad('Escalamiento requiere nivel superior');
                if (b.usuario_id)
                    await this.worker(b.usuario_id, dest.id, m);
                n = await this.one('UPDATE ticket SET cola_id=$1,responsable_id=$2,actualizado_en=now() WHERE id=$3 RETURNING *', [dest.id, b.usuario_id || null, id], m);
            }
            else if (action === 'pausar') {
                await this.can(u, t, 'atender', m);
                text(reason, 'motivo');
                if (['pausado', 'cerrado', 'rechazado', 'resuelto'].includes(t.estado))
                    bad('No se puede pausar');
                n = await this.one("UPDATE ticket SET estado_anterior=estado,estado='pausado',pausa_desde=now(),actualizado_en=now() WHERE id=$1 RETURNING *", [id], m);
            }
            else if (action === 'retomar') {
                await this.can(u, t, 'atender', m);
                if (t.estado !== 'pausado')
                    bad('No está pausado');
                n = await this.one('UPDATE ticket SET estado=estado_anterior,estado_anterior=NULL,pausa_segundos=pausa_segundos+extract(epoch FROM now()-pausa_desde),pausa_desde=NULL,actualizado_en=now() WHERE id=$1 RETURNING *', [id], m);
            }
            else if (action === 'reabrir') {
                await this.can(u, t);
                if (String(t.solicitante_id) !== u.id)
                    await this.can(u, t, 'atender', m);
                this.role(u, 'solicitante', 'agente');
                if (t.estado !== 'cerrado')
                    bad('Solo se reabre un ticket cerrado');
                text(reason, 'motivo');
                const d = { ...t.detalle };
                delete d.aprobado_por;
                delete d.aprobado_en;
                n = await this.one("UPDATE ticket SET estado='registrado',resolucion=NULL,resuelto_en=NULL,cerrado_en=NULL,detalle=$2,actualizado_en=now() WHERE id=$1 RETURNING *", [id, JSON.stringify(d)], m);
            }
            else if (action === 'transicion') {
                const next = text(b.estado, 'estado', 60), flow = FLOWS[t.proceso];
                if (next === 'aprobado' || next === 'rechazado') {
                    await this.can(u, t, 'aprobar', m);
                    if (!['analisis', 'evaluacion', 'validacion_solicitud'].includes(t.estado))
                        bad('No está pendiente de aprobación');
                    if (t.proceso === 'accesos' && (String(t.solicitante_id) === u.id || String(t.detalle.beneficiario_id) === u.id))
                        throw new ForbiddenException('No se permite autoaprobación');
                    text(reason, 'motivo de decisión');
                }
                else
                    await this.can(u, t, 'atender', m);
                if (next !== 'rechazado' && flow[flow.indexOf(t.estado) + 1] !== next)
                    bad('Transición inválida');
                if (next === 'rechazado' && !['nuevos', 'cambios', 'accesos'].includes(t.proceso))
                    bad('Proceso sin rechazo');
                const d = { ...t.detalle, ...(b.detalle || {}) };
                for (const k of ['aprobado_por', 'aprobado_en', 'servicio_creado_id'])
                    if (b.detalle && k in b.detalle)
                        bad('Atributo de control reservado');
                if (next === 'aprobado') {
                    d.aprobado_por = u.id;
                    d.aprobado_en = new Date().toISOString();
                }
                if (['cambios', 'accesos', 'nuevos'].includes(t.proceso) && flow.indexOf(next) > flow.indexOf('aprobado') && !d.aprobado_por)
                    bad('Aprobación requerida');
                if (t.proceso === 'nuevos' && next === 'aprobado') {
                    text(d.necesidad, 'necesidad');
                    text(d.viabilidad, 'viabilidad');
                }
                if (t.proceso === 'cambios' && next === 'aprobado') {
                    text(d.impacto_cambio, 'impacto_cambio');
                    text(d.riesgo, 'riesgo');
                    text(d.plan_pruebas, 'plan_pruebas');
                    text(d.reversion, 'reversion');
                    if (!await this.one('SELECT 1 FROM ticket_ci WHERE ticket_id=$1', [id], m))
                        bad('Cambio requiere CI afectados');
                }
                if (t.proceso === 'cambios' && next === 'ejecucion')
                    text(d.planificacion, 'planificacion');
                if (t.proceso === 'accesos' && next === 'provision')
                    text(d.evidencia_provision, 'evidencia_provision');
                if (next === 'validacion')
                    text(d.resultado_validacion, 'resultado_validacion');
                if (t.proceso === 'problemas') {
                    if (next === 'investigacion' && !await this.one("SELECT 1 FROM ticket_relacion r JOIN ticket x ON x.id=CASE WHEN r.origen_id=$1 THEN r.destino_id ELSE r.origen_id END JOIN cola c ON c.id=x.cola_id WHERE (r.origen_id=$1 OR r.destino_id=$1) AND c.proceso='incidentes'", [id], m))
                        bad('Vincule al menos un incidente');
                    if (next === 'causa_raiz')
                        text(d.causa_raiz, 'causa_raiz');
                    if (next === 'solucion_temporal')
                        text(d.solucion_temporal, 'solucion_temporal');
                    if (next === 'solucion_definitiva')
                        text(d.solucion_definitiva, 'solucion_definitiva');
                }
                if (t.proceso === 'servicios' && next === 'confirmacion')
                    text(d.evidencia_cumplimiento, 'evidencia_cumplimiento');
                if (t.proceso === 'servicios' && next === 'resuelto')
                    text(d.confirmacion, 'confirmacion');
                if (t.proceso === 'eventos' && next === 'respuesta') {
                    text(d.evaluacion, 'evaluacion');
                    if (['E2', 'E3'].includes(d.categoria)) {
                        let inc = d.incidente_id ? await this.ticket(String(d.incidente_id), m) : await this.one('SELECT * FROM ticket WHERE origen_evento_id=$1', [id], m);
                        if (inc) {
                            const c = await this.one('SELECT proceso FROM cola WHERE id=$1', [inc.cola_id], m);
                            if (c.proceso !== 'incidentes')
                                bad('Vincule un incidente válido');
                            await this.can(u, inc, 'consultar', m);
                        }
                        else {
                            const queue = await this.one("SELECT id FROM cola WHERE proceso='incidentes' AND activo ORDER BY nivel,id LIMIT 1", [], m);
                            if (!queue)
                                bad('Sin cola de incidentes');
                            inc = await this.createTx(u, { titulo: `Incidente de evento #${id}`, descripcion: t.descripcion, solicitante_id: t.solicitante_id, servicio_id: t.servicio_id, cola_id: queue.id, prioridad: 1, impacto: 'alto', urgencia: 'alta', canal: 'monitoreo', sin_ci_motivo: 'Ver CI del evento relacionado', detalle: { categoria: d.categoria === 'E3' ? 'I6' : 'I3', afectacion: d.categoria === 'E3' ? 'seguridad' : 'interrupcion', redundancia: false } }, m);
                            await this.q('UPDATE ticket SET origen_evento_id=$1 WHERE id=$2', [id, inc.id], m);
                            await this.q('INSERT INTO ticket_ci SELECT $1,ci_id FROM ticket_ci WHERE ticket_id=$2 ON CONFLICT DO NOTHING', [inc.id, id], m);
                        }
                        d.incidente_id = String(inc.id);
                        await this.q("INSERT INTO ticket_relacion VALUES($1,$2,'origina') ON CONFLICT DO NOTHING", [id, inc.id], m);
                        await this.q('INSERT INTO notificacion(ticket_id,mensaje) VALUES($1,$2)', [id, `Evento ${d.categoria}: incidente #${inc.id} notificado en aplicación`], m);
                    }
                }
                if (t.proceso === 'nuevos' && next === 'implementacion') {
                    if (d.servicio_vinculado_id) {
                        await this.service(d.servicio_vinculado_id, m);
                        d.servicio_creado_id = String(d.servicio_vinculado_id);
                    }
                    else {
                        text(d.codigo_nuevo, 'codigo_nuevo', 20);
                        text(d.nombre_nuevo, 'nombre_nuevo', 300);
                        const parent = await this.one('SELECT id FROM servicio_nivel1 WHERE id=$1 AND activo IS DISTINCT FROM false', [requireId(String(d.nivel1_id))], m);
                        const section = await this.one('SELECT id FROM seccion WHERE id=$1 AND activo', [requireId(String(d.seccion_id))], m);
                        if (!parent || !section)
                            bad('Padre/sección activos requeridos');
                        const exists = await this.one('SELECT id,nombre,nivel1_id FROM servicio_nivel2 WHERE codigo=$1', [d.codigo_nuevo], m);
                        if (exists && (exists.nombre !== d.nombre_nuevo || String(exists.nivel1_id) !== String(d.nivel1_id)))
                            throw new ConflictException('Código ya existe con otros atributos');
                        const s = exists || await this.one('INSERT INTO servicio_nivel2(codigo,nombre,nivel1_id,activo,requiere_revision) VALUES($1,$2,$3,true,false) RETURNING id', [d.codigo_nuevo, d.nombre_nuevo, d.nivel1_id], m);
                        if (!exists)
                            await this.q('INSERT INTO servicio_responsable(servicio_nivel2_id,seccion_id) VALUES($1,$2)', [s.id, d.seccion_id], m);
                        d.servicio_creado_id = String(s.id);
                        await this.audit(m, u, 'servicio_nivel2', s.id, 'aprovisionar_desde_ticket', null, { ticket_id: id });
                    }
                }
                let resolution = t.resolucion;
                if (next === 'resuelto') {
                    resolution = text(b.resolucion, 'resolucion');
                    if (t.proceso === 'incidentes')
                        text(d.solucion_aplicada, 'solucion_aplicada');
                }
                if (next === 'cerrado' && !resolution)
                    bad('Resolución requerida antes de cierre');
                n = await this.one(`UPDATE ticket SET estado=$1,detalle=$2,resolucion=$3,resuelto_en=CASE WHEN $1='resuelto' THEN now() ELSE resuelto_en END,cerrado_en=CASE WHEN $1 IN ('cerrado','rechazado') THEN now() ELSE cerrado_en END,actualizado_en=now() WHERE id=$4 RETURNING *`, [next, JSON.stringify(d), resolution, id], m);
            }
            else
                bad('Acción desconocida');
            await this.audit(m, u, 'ticket', id, action, t, n, reason || undefined);
            return portalOnly(u)?this.portalTicket(n):n;
        });
    }
    async comment(u: any, id: string, b: any) { obj(b, ['texto', 'interno']); return this.tx(async (m) => { const t = await this.ticket(id, m); await this.can(u, t, 'consultar', m); this.role(u, 'solicitante', 'agente', 'aprobador'); const internal = b.interno === undefined ? false : bool(b.interno); if (internal || String(t.solicitante_id) !== u.id)
        await this.can(u, t, 'atender', m); const c = await this.one('INSERT INTO comentario(ticket_id,actor_id,texto,interno) VALUES($1,$2,$3,$4) RETURNING *', [id, u.id, text(b.texto, 'texto'), internal], m); await this.audit(m, u, 'comentario', c.id, 'crear', null, { ticket_id: id, interno: internal }); return c; }); }
    async upload(u: any, id: string, b: any) { obj(b, ['nombre', 'mime', 'base64', 'interno']); const name = text(b.nombre, 'nombre', 160); const mime = text(b.mime, 'mime', 100); if (!['text/plain', 'application/pdf', 'image/png', 'image/jpeg'].includes(mime))
        bad('Tipo de archivo no permitido'); const encoded = text(b.base64, 'base64', 2800000); if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
        bad('Base64 inválido'); const bytes = Buffer.from(encoded, 'base64'); if (!bytes.length || bytes.length > 2097152)
        bad('Máximo 2 MiB'); if (mime === 'application/pdf' && bytes.subarray(0, 5).toString() !== '%PDF-')
        bad('Firma PDF inválida'); if (mime === 'image/png' && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
        bad('Firma PNG inválida'); if (mime === 'image/jpeg' && bytes.subarray(0, 3).toString('hex') !== 'ffd8ff')
        bad('Firma JPEG inválida'); if (mime === 'text/plain' && bytes.includes(0))
        bad('Texto inválido'); return this.tx(async (m) => { const t = await this.ticket(id, m); await this.can(u, t, 'consultar', m); this.role(u, 'solicitante', 'agente'); const internal = b.interno === undefined ? false : bool(b.interno); if (internal || String(t.solicitante_id) !== u.id)
        await this.can(u, t, 'atender', m); const a = await this.one('INSERT INTO adjunto(ticket_id,actor_id,nombre,mime,contenido,interno) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text,nombre,mime', [id, u.id, name, mime, bytes, internal], m); await this.audit(m, u, 'adjunto', a.id, 'subir', null, { ticket_id: id, nombre: name }); return a; }); }
    async download(u: any, id: string) { const a = await this.one('SELECT * FROM adjunto WHERE id=$1', [requireId(id)]); if (!a)
        throw new NotFoundException(); const t = await this.ticket(String(a.ticket_id)); await this.can(u, t); if (a.interno) {
        this.role(u, 'agente', 'aprobador');
        if (!await this.permission(u, t.cola_id, 'consultar'))
            throw new ForbiddenException();
    } return a; }
    async link(u: any, id: string, b: any) { obj(b, ['destino_id', 'tipo']); return this.tx(async (m) => { const a = await this.ticket(id, m), dest = await this.ticket(requireId(String(b.destino_id)), m); await this.can(u, a, 'atender', m); await this.can(u, dest, 'consultar', m); const type = text(b.tipo, 'tipo', 40); if (!['relacionado', 'causa', 'corrige', 'duplicado'].includes(type))
        bad('Tipo de relación inválido'); await this.q('INSERT INTO ticket_relacion VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [id, dest.id, type], m); await this.audit(m, u, 'ticket', id, 'relacionar', null, b); return { ok: true }; }); }
    async clase(u: any, b: any, id?: string) { this.admin(u); obj(b, ['codigo', 'nombre', 'padre_id', 'activo']); return this.tx(async (m) => { const old = id ? await this.one('SELECT * FROM ci_clase WHERE id=$1', [requireId(id)], m) : null; if (id && !old)
        throw new NotFoundException(); const v = { ...old, ...b }; if (v.padre_id && !await this.one('SELECT 1 FROM ci_clase WHERE id=$1 AND activo', [requireId(String(v.padre_id))], m))
        bad('Padre inexistente/inactivo'); const args = [text(v.codigo, 'codigo', 80), text(v.nombre, 'nombre', 300), v.padre_id || null, v.activo === undefined ? true : bool(v.activo)]; const n = id ? await this.one('UPDATE ci_clase SET codigo=$1,nombre=$2,padre_id=$3,activo=$4 WHERE id=$5 RETURNING *', [...args, id], m) : await this.one('INSERT INTO ci_clase(codigo,nombre,padre_id,activo) VALUES($1,$2,$3,$4) RETURNING *', args, m); await this.audit(m, u, 'ci_clase', n.id, 'guardar', old, n); return n; }); }
    async location(u: any, b: any, id?: string) { this.admin(u); obj(b, ['nombre', 'activo']); return this.tx(async (m) => { const old = id ? await this.one('SELECT * FROM ubicacion WHERE id=$1', [requireId(id)], m) : null; if (id && !old)
        throw new NotFoundException(); const name = text(b.nombre ?? old?.nombre, 'nombre', 300), active = b.activo === undefined ? (old?.activo ?? true) : bool(b.activo); if (!active && id && await this.one('SELECT 1 FROM ci WHERE ubicacion_id=$1 AND activo', [id], m))
        bad('Ubicación con CI activos'); const n = id ? await this.one('UPDATE ubicacion SET nombre=$1,activo=$2 WHERE id=$3 RETURNING *', [name, active, id], m) : await this.one('INSERT INTO ubicacion(nombre,activo) VALUES($1,$2) RETURNING *', [name, active], m); await this.audit(m, u, 'ubicacion', n.id, 'guardar', old, n); return n; }); }
    async cis(u: any, q: any = {}) { if(portalOnly(u))throw new ForbiddenException('Módulo operativo no disponible para solicitantes'); const page = positive(q.pagina ?? 1, 'pagina'), limit = positive(q.limite ?? 20, 'limite', 100), args: any[] = []; const where: string[] = []; for (const f of ['clase_id', 'ubicacion_id', 'responsable_id', 'estado'])
        if (q[f]) {
            args.push(q[f]);
            where.push(`c.${f}=$${args.length}`);
        } if (q.activo !== undefined && q.activo !== '') {
        if (!['true', 'false'].includes(q.activo))
            bad('Estado inválido');
        args.push(q.activo === 'true');
        where.push(`c.activo=$${args.length}`);
    } if (q.buscar) {
        args.push(`%${String(q.buscar).slice(0, 200)}%`);
        where.push(`(c.codigo||' '||c.nombre) ILIKE $${args.length}`);
    } const w = where.length ? 'WHERE ' + where.join(' AND ') : ''; const total = (await this.one(`SELECT count(*)::int total FROM ci c ${w}`, args)).total; const items = await this.q(`SELECT c.*,cl.nombre clase,l.nombre ubicacion,u.nombre responsable FROM ci c JOIN ci_clase cl ON cl.id=c.clase_id JOIN ubicacion l ON l.id=c.ubicacion_id JOIN usuario u ON u.id=c.responsable_id ${w} ORDER BY c.codigo,c.id LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, limit, (page - 1) * limit]); return { items, total, pagina: page, limite: limit }; }
    async saveCi(u: any, b: any, id?: string) { this.admin(u); obj(b, ['codigo', 'nombre', 'clase_id', 'activo', 'estado', 'ubicacion_id', 'responsable_id', 'es_dispositivo', 'atributos', 'servicio_ids']); return this.tx(async (m) => { const old = id ? await this.one('SELECT * FROM ci WHERE id=$1', [requireId(id)], m) : null; if (id && !old)
        throw new NotFoundException(); const v = { ...old, ...b }; await this.user(v.responsable_id, m); if (!await this.one('SELECT 1 FROM ci_clase WHERE id=$1 AND activo', [requireId(String(v.clase_id))], m) || !await this.one('SELECT 1 FROM ubicacion WHERE id=$1 AND activo', [requireId(String(v.ubicacion_id))], m))
        bad('Clasificación/ubicación inexistente o inactiva'); if (!v.atributos || typeof v.atributos !== 'object' || Array.isArray(v.atributos) || JSON.stringify(v.atributos).length > 30000)
        bad('Atributos JSON inválidos'); const args = [text(v.codigo, 'codigo', 100), text(v.nombre, 'nombre', 300), v.clase_id, v.activo === undefined ? true : bool(v.activo), text(v.estado ?? 'Activo', 'estado', 100), v.ubicacion_id, v.responsable_id, v.es_dispositivo === undefined ? true : bool(v.es_dispositivo), JSON.stringify(v.atributos)]; const n = id ? await this.one('UPDATE ci SET codigo=$1,nombre=$2,clase_id=$3,activo=$4,estado=$5,ubicacion_id=$6,responsable_id=$7,es_dispositivo=$8,atributos=$9,actualizado_en=now() WHERE id=$10 RETURNING *', [...args, id], m) : await this.one('INSERT INTO ci(codigo,nombre,clase_id,activo,estado,ubicacion_id,responsable_id,es_dispositivo,atributos) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', args, m); if (b.servicio_ids !== undefined) {
        if (!Array.isArray(b.servicio_ids))
            bad('Servicios inválidos');
        for (const sid of b.servicio_ids)
            await this.service(sid, m);
        await this.q('DELETE FROM ci_servicio WHERE ci_id=$1', [n.id], m);
        for (const sid of new Set(b.servicio_ids))
            await this.q('INSERT INTO ci_servicio VALUES($1,$2)', [n.id, sid], m);
    } await this.audit(m, u, 'ci', n.id, 'guardar', old, n); return n; }); }
    async ciDetail(u: any, id: string) { if(portalOnly(u))throw new ForbiddenException('Módulo operativo no disponible para solicitantes');
        const ci = await this.one('SELECT * FROM ci WHERE id=$1', [requireId(id)]);
        if (!ci)
            throw new NotFoundException();
        const affected = await this.q(`WITH RECURSIVE walk(id) AS (SELECT $1::bigint UNION SELECT r.origen_id FROM ci_relacion r JOIN walk w ON r.destino_id=w.id WHERE r.tipo IN ('depende_de','alojado_en')) SELECT c.id::text,c.codigo,c.nombre FROM ci c JOIN walk w ON w.id=c.id`, [id]);
        const linked = await this.q('SELECT ticket_id::text FROM ticket_ci WHERE ci_id=$1', [id]), tickets = [];
        for (const x of linked) {
            const t = await this.ticket(x.ticket_id);
            try {
                await this.can(u, t);
                tickets.push({ id: x.ticket_id, titulo: t.titulo, estado: t.estado });
            }
            catch (e) {
                if (!(e instanceof ForbiddenException))
                    throw e;
            }
        }
        return { ...ci, clasificacion: await this.q(`WITH RECURSIVE p AS (SELECT *,0 profundidad FROM ci_clase WHERE id=$1 UNION ALL SELECT c.*,p.profundidad+1 FROM ci_clase c JOIN p ON c.id=p.padre_id) SELECT * FROM p ORDER BY profundidad DESC`, [ci.clase_id]), relaciones: await this.q('SELECT r.*,a.nombre origen,b.nombre destino FROM ci_relacion r JOIN ci a ON a.id=r.origen_id JOIN ci b ON b.id=r.destino_id WHERE r.origen_id=$1 OR r.destino_id=$1', [id]), servicios: await this.q('SELECT s.* FROM ci_servicio x JOIN servicio_nivel2 s ON s.id=x.servicio_id WHERE x.ci_id=$1', [id]), dependencias: affected, servicios_potencialmente_afectados: await this.q('SELECT DISTINCT s.* FROM ci_servicio x JOIN servicio_nivel2 s ON s.id=x.servicio_id WHERE x.ci_id=ANY($1::bigint[])', [affected.map(c => String(c.id))]), tickets, historial: await this.q("SELECT * FROM bitacora WHERE entidad='ci' AND registro_id=$1 ORDER BY id", [id]) };
    }
    async ciLink(u: any, id: string, b: any) { this.admin(u); obj(b, ['destino_id', 'tipo']); return this.tx(async (m) => { requireId(id); const dest = requireId(String(b.destino_id)); if (!['depende_de', 'alojado_en', 'conectado_a'].includes(b.tipo))
        bad('Tipo de relación inválido'); for (const x of [id, dest])
        if (!await this.one('SELECT 1 FROM ci WHERE id=$1 AND activo', [x], m))
            bad('CI inexistente o inactivo'); if (b.tipo !== 'conectado_a' && await this.one(`WITH RECURSIVE walk(id) AS (SELECT $1::bigint UNION SELECT r.destino_id FROM ci_relacion r JOIN walk w ON r.origen_id=w.id WHERE r.tipo IN ('depende_de','alojado_en')) SELECT 1 FROM walk WHERE id=$2`, [dest, id], m))
        bad('Ciclo de dependencias no permitido'); await this.q('INSERT INTO ci_relacion VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [id, dest, b.tipo], m); await this.audit(m, u, 'ci', id, 'relacionar', null, b); return { ok: true }; }); }
    async dashboard(u: any) { if(portalOnly(u))throw new ForbiddenException('Módulo operativo no disponible para solicitantes');
        const first = await this.tickets(u, { limite: 100 }), ids: string[] = [];
        for (let page = 1; page <= Math.ceil(first.total / 100); page++)
            ids.push(...(page === 1 ? first : await this.tickets(u, { limite: 100, pagina: page })).items.map(t => String(t.id)));
        const values = await this.q(`SELECT t.id::text,t.estado,c.nombre cola,c.proceso,t.prioridad,c.primera_min,c.resolucion_min,
 greatest(0,extract(epoch FROM now()-t.creado_en))/60 antiguedad_min,
 CASE WHEN t.primera_atencion IS NOT NULL THEN greatest(0,extract(epoch FROM t.primera_atencion-t.creado_en))/60 END primera_min_real,
 greatest(0,extract(epoch FROM coalesce(t.resuelto_en,t.cerrado_en,now())-t.creado_en)-t.pausa_segundos-CASE WHEN t.pausa_desde IS NOT NULL THEN extract(epoch FROM now()-t.pausa_desde) ELSE 0 END)/60 resolucion_min_real
 FROM ticket t JOIN cola c ON c.id=t.cola_id WHERE t.id=ANY($1::bigint[])`, [ids]);
        const groups: Record<string, any> = {};
        for (const r of values) {
            const k = [r.cola, r.proceso, r.prioridad, r.estado].join('|');
            groups[k] ??= { cola: r.cola, proceso: r.proceso, prioridad: r.prioridad, estado: r.estado, total: 0 };
            groups[k].total++;
            r.objetivo_primera = r.primera_min_real === null ? (Number(r.antiguedad_min) > r.primera_min ? 'vencido_abierto' : 'pendiente') : (Number(r.primera_min_real) <= r.primera_min ? 'cumple' : 'incumple');
            r.objetivo_resolucion = Number(r.resolucion_min_real) > r.resolucion_min ? (['resuelto', 'cerrado'].includes(r.estado) ? 'incumple' : 'vencido_abierto') : (['resuelto', 'cerrado'].includes(r.estado) ? 'cumple' : 'pendiente');
        }
        return { reloj: 'calendario 24x7; resolución descuenta pausas; primera atención desde creación', total: values.length, grupos: Object.values(groups), tickets: values, cmdb: await this.q('SELECT cl.codigo,cl.nombre,count(c.id)::int dispositivos FROM ci_clase cl LEFT JOIN ci c ON c.clase_id=cl.id AND c.es_dispositivo GROUP BY cl.id ORDER BY cl.id') };
    }
    async faq() { return this.q('SELECT * FROM faq WHERE activo ORDER BY id'); }
    async saveFaq(u: any, b: any) { this.admin(u); obj(b, ['id', 'titulo', 'contenido', 'activo']); return this.tx(async (m) => { const old = b.id ? await this.one('SELECT * FROM faq WHERE id=$1', [requireId(String(b.id))], m) : null; if (b.id && !old)
        throw new NotFoundException(); const args = [text(b.titulo, 'titulo', 300), text(b.contenido, 'contenido'), b.activo === undefined ? true : bool(b.activo)]; const n = b.id ? await this.one('UPDATE faq SET titulo=$1,contenido=$2,activo=$3 WHERE id=$4 RETURNING *', [...args, b.id], m) : await this.one('INSERT INTO faq(titulo,contenido,activo) VALUES($1,$2,$3) RETURNING *', args, m); await this.audit(m, u, 'faq', n.id, 'guardar', old, n); return n; }); }
}
