import { DataSource } from 'typeorm';
import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { hashPassword } from '../auth/password';
import { DeskService } from './desk.service';
import { FLOWS, INCIDENTS } from './workflows';
export async function prepareDesk(db: DataSource, desk: DeskService, seed = '202211515', count = 5000) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(seed) || !Number.isInteger(count) || count < 1 || count > 100000)
        throw new Error('Semilla alfanumérica; cantidad 1–100000');
    const q = (s: string, a: any[] = []) => db.manager.query(s, a);
    const admins = await q("SELECT id::text,puesto_id::text FROM usuario WHERE nombre_usuario='admin' AND activo");
    if (!admins[0])
        throw new Error('Ejecute seed:demo');
    const admin = { ...admins[0], rol: 'administrador', roles: ['administrador'] };
    for (const [name, roles] of [['solicitante', ['solicitante']], ['solicitante2', ['solicitante']], ['agente1', ['agente']], ['agente2', ['agente']], ['aprobador', ['aprobador']]] as [
        string,
        string[]
    ][]) {
        const exists = await q('SELECT id::text FROM usuario WHERE nombre_usuario=$1', [name]);
        let id = exists[0]?.id;
        if (!id) {
            const hash = await hashPassword(process.env.DEMO_DESK_PASSWORD || 'SA_desk_2026_demo');
            id = (await q("INSERT INTO usuario(puesto_id,nombre,nombre_usuario,correo,password_hash,rol,activo) VALUES($1,$2::text,$2::text,$3,$4,'consulta',true) RETURNING id::text", [admin.puesto_id, name, `${name}@demo.local`, hash]))[0].id;
        }
        for (const role of roles)
            await q('INSERT INTO usuario_rol VALUES($1,$2) ON CONFLICT DO NOTHING', [id, role]);
    }
    const users = await q("SELECT id::text,nombre_usuario,rol FROM usuario WHERE nombre_usuario IN ('admin','solicitante','solicitante2','agente1','agente2','aprobador')");
    const ids = Object.fromEntries(users.map((u: any) => [u.nombre_usuario, u.id]));
    for (const process of Object.keys(FLOWS))
        for (const level of (process === 'incidentes' ? [1, 2] : [1])) {
            const code = `${process.toUpperCase()}-N${level}`;
            if (!(await q('SELECT 1 FROM cola WHERE codigo=$1', [code])).length)
                await desk.saveQueue(admin, { codigo: code, nombre: `${process} · Nivel ${level}`, proceso: process, nivel: level, responsable_id: ids.admin, permisos: [{ rol: 'agente', permisos: ['consultar', 'atender', 'transferir'] }, { rol: 'aprobador', permisos: ['consultar', 'aprobar'] }] });
        }
    for (const name of ['Sala de Servidores 1', 'Oficina Central', 'Sucursal de Pruebas'])
        await q('INSERT INTO ubicacion(nombre) VALUES($1) ON CONFLICT DO NOTHING', [name]);
    for (const [code, name, parent, origin] of [['HW', 'Hardware', null, 'CMDB!C5'], ['SW', 'Software', null, 'CMDB!C6'], ['HW-SRV', 'Servidores', 'HW', 'proyecto: clasificación propuesta'], ['HW-PC', 'Estaciones de trabajo', 'HW', 'proyecto: clasificación propuesta'], ['HW-NET', 'Redes', 'HW', 'proyecto: clasificación propuesta']]) {
        const pid = parent ? (await q('SELECT id FROM ci_clase WHERE codigo=$1', [parent]))[0].id : null;
        await q('INSERT INTO ci_clase(codigo,nombre,padre_id,origen) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [code, name, pid, origin]);
    }
    const classes = await q("SELECT id::text,codigo FROM ci_clase WHERE codigo IN ('HW-SRV','HW-PC','HW-NET') ORDER BY codigo"), locations = await q('SELECT id::text FROM ubicacion WHERE activo ORDER BY id'), services = await q('SELECT id::text FROM servicio_nivel2 WHERE activo IS DISTINCT FROM false ORDER BY codigo');
    if (!services.length)
        throw new Error('Ejecute import:excel');
    // Los ejemplos se importan desde los bytes originales; se conservan las 20 celdas sin corregirlas silenciosamente.
    const path = process.env.CMDB_PATH || 'data/CMDB.xlsx';
    let buffer: Buffer;
    try {
        buffer = await readFile(path);
    }
    catch {
        buffer = await readFile('../data/CMDB.xlsx');
    }
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer as any);
    const sheet = book.getWorksheet('CMDB');
    if (!sheet)
        throw new Error('Falta CMDB');
    const sha = createHash('sha256').update(buffer).digest('hex');
    for (let row = 5; row <= 6; row++) {
        const raw: Record<string, any> = {};
        for (let col = 2; col <= 21; col++)
            raw[sheet.getCell(4, col).text] = sheet.getCell(row, col).text;
        const type = sheet.getCell(row, 3).text.trim(), cl = (await q('SELECT id FROM ci_clase WHERE codigo=$1', [type === 'Hardware' ? 'HW' : 'SW']))[0];
        const attrs = { descripcion: sheet.getCell(row, 4).text.trim(), numero_serie: sheet.getCell(row, 5).text.trim() || null, version: sheet.getCell(row, 6).text.trim(), fecha_adquisicion: sheet.getCell(row, 7).text.trim(), relaciones_originales: sheet.getCell(row, 9).text.trim(), padres_hijos: sheet.getCell(row, 10).text.trim() || null, ubicacion_original: sheet.getCell(row, 11).text.trim(), responsable_original: sheet.getCell(row, 12).text.trim(), fecha_cambio: sheet.getCell(row, 13).text.trim(), descripcion_cambio: sheet.getCell(row, 14).text.trim(), documentacion: sheet.getCell(row, 15).text.trim(), enlaces_incidentes: sheet.getCell(row, 16).text.trim(), seguridad: sheet.getCell(row, 17).text.trim(), cumplimiento: sheet.getCell(row, 18).text.trim(), estado_configuracion: sheet.getCell(row, 19).text.trim(), licencia: sheet.getCell(row, 20).text.trim(), vencimiento: sheet.getCell(row, 21).text.trim() };
        await q(`INSERT INTO ci(codigo,nombre,clase_id,estado,ubicacion_id,responsable_id,es_dispositivo,atributos,fuente) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(codigo) DO NOTHING`, [`EXCEL-${row}`, sheet.getCell(row, 2).text.trim(), cl.id, sheet.getCell(row, 8).text.trim(), locations[0].id, ids.admin, type === 'Hardware', JSON.stringify(attrs), JSON.stringify({ archivo: 'CMDB.xlsx', sha256: sha, hoja: 'CMDB', rango: `B${row}:U${row}`, original: raw, observaciones: ['Base de Datos1 no existe en el origen; referencia textual pendiente', 'Responsable y ubicación operativos son asignaciones DEMO; originales preservados'] })]);
    }
    const batch: any[] = [];
    for (let i = 1; i <= count; i++) {
        const rnd = createHash('sha256').update(`${seed}:${i}`).digest();
        const c = classes[rnd[0] % classes.length];
        const attributes: any = { numero_serie: `SYN-${seed}-${i}`, marca: 'Sintética', modelo: c.codigo === 'HW-PC' ? 'Estación' : c.codigo === 'HW-SRV' ? 'Servidor' : 'Conmutador', origen: 'DEMO sintético' };
        if (c.codigo === 'HW-PC' || c.codigo === 'HW-SRV') {
            attributes.ram_gb = [8, 16, 32, 64][rnd[1] % 4];
            attributes.disco_gb = [256, 512, 1024][rnd[2] % 3];
            attributes.sistema_operativo = 'Linux de demostración';
        }
        if (c.codigo === 'HW-NET')
            attributes.puertos = [8, 24, 48][rnd[1] % 3];
        batch.push({ codigo: `SYN-${seed}-${String(i).padStart(6, '0')}`, nombre: `${attributes.modelo} ${i}`, clase_id: c.id, ubicacion_id: locations[rnd[3] % locations.length].id, responsable_id: ids.admin, atributos: attributes, conjunto: `seed:${seed}` });
    }
    await db.transaction(async (m) => { await m.query('SELECT pg_advisory_xact_lock(9021003)'); for (let start = 0; start < batch.length; start += 500)
        await m.query(`INSERT INTO ci(codigo,nombre,clase_id,ubicacion_id,responsable_id,atributos,conjunto) SELECT codigo,nombre,clase_id::bigint,ubicacion_id::bigint,responsable_id::bigint,atributos,conjunto FROM jsonb_to_recordset($1::jsonb) AS x(codigo text,nombre text,clase_id text,ubicacion_id text,responsable_id text,atributos jsonb,conjunto text) ON CONFLICT(codigo) DO NOTHING`, [JSON.stringify(batch.slice(start, start + 500))]); });
    const first = (await q('SELECT id::text FROM ci WHERE conjunto=$1 ORDER BY codigo LIMIT 3', [`seed:${seed}`]));
    for (let i = 0; i < first.length; i++)
        await q('INSERT INTO ci_servicio VALUES($1,$2) ON CONFLICT DO NOTHING', [first[i].id, services[i % services.length].id]);
    if (first.length > 1)
        await desk.ciLink(admin, first[0].id, { destino_id: first[1].id, tipo: 'depende_de' });
    for (const [title, content] of [['Cómo registrar un incidente', 'Seleccione el servicio afectado, describa el síntoma y adjunte evidencia sin contraseñas.'], ['Autoservicio y escalamiento', 'Consulte soluciones conocidas. Si persiste, cree un ticket y conserve su número.']])
        if (!(await q('SELECT 1 FROM faq WHERE titulo=$1', [title])).length)
            await desk.saveFaq(admin, { titulo: title, contenido: content });
    const result = await q('SELECT cl.codigo,count(c.id)::int cantidad FROM ci_clase cl LEFT JOIN ci c ON c.clase_id=cl.id AND c.es_dispositivo GROUP BY cl.id ORDER BY cl.id');
    console.log(JSON.stringify({ semilla: seed, conjunto: `seed:${seed}`, conteo_generados: (await q('SELECT count(*)::int n FROM ci WHERE conjunto=$1', [`seed:${seed}`]))[0].n, por_categoria: result, observaciones: ['Jerarquía extendida es decisión del proyecto, pendiente validación docente'] }, null, 2));
    return { admin, ids, services, first };
}
export async function seedTickets(db: DataSource, desk: DeskService, seed = '202211515', count = 5000) {
    const { admin, ids, services, first } = await prepareDesk(db, desk, seed, count);
    const q = (s: string, a: any[] = []) => db.manager.query(s, a);
    const agent = { id: ids.agente1, rol: 'consulta', roles: ['consulta', 'agente'] }, approver = { id: ids.aprobador, rol: 'consulta', roles: ['consulta', 'aprobador'] };
    for (const process of Object.keys(FLOWS))
        for (let i = 0; i < (process === 'incidentes' ? 7 : 5); i++) {
            const key = `DEMO-${process}-${i}`;
            if ((await q('SELECT 1 FROM ticket WHERE demo_clave=$1', [key])).length)
                continue;
            const queue = (await q('SELECT id FROM cola WHERE proceso=$1 AND nivel=1 ORDER BY id LIMIT 1', [process]))[0];
            const d: any = {};
            let priority = 2;
            if (process === 'incidentes') {
                Object.assign(d, { categoria: `I${i}`, redundancia: i === 0, afectacion: i === 0 ? 'sin_interrupcion' : i === 6 ? 'seguridad' : 'interrupcion' });
                priority = INCIDENTS[i].prioridad;
            }
            if (process === 'eventos')
                d.categoria = `E${i % 4}`;
            if (process === 'accesos')
                Object.assign(d, { beneficiario_id: ids.solicitante, recurso: 'Servicio de demostración', permiso: 'Lectura', operacion: 'provision' });
            const t = await desk.create(admin, { titulo: `DEMO ${process} ${i + 1}`, descripcion: `Caso sintético del proceso ${process}.`, solicitante_id: ids.solicitante, servicio_id: services[i % services.length].id, cola_id: String(queue.id), prioridad: priority, impacto: 'medio', urgencia: 'media', ci_ids: first.length ? [first[0].id] : [], sin_ci_motivo: 'Trámite administrativo', detalle: d });
            await q('UPDATE ticket SET demo_clave=$1 WHERE id=$2', [key, t.id]);
            if (i > 0)
                await desk.action(agent, String(t.id), { accion: 'tomar' });
            if (process === 'problemas' && i > 1) {
                const incident = (await q("SELECT id::text FROM ticket WHERE demo_clave LIKE 'DEMO-incidentes-%' ORDER BY id LIMIT 1"))[0];
                await desk.link(admin, String(t.id), { destino_id: incident.id, tipo: 'causa' });
            }
            if (i > 1)
                await desk.action(agent, String(t.id), { accion: 'transicion', estado: FLOWS[process][1], detalle: { resultado_validacion: 'Solicitud de demostración validada' } });
            const evidence = { necesidad: 'Necesidad de demostración', viabilidad: 'Viable', servicio_vinculado_id: services[0].id, impacto_cambio: 'Servicio de pruebas', riesgo: 'Bajo', plan_pruebas: 'Verificar conectividad y función', reversion: 'Restaurar configuración anterior', planificacion: 'Ventana de pruebas', resultado_validacion: 'Verificación satisfactoria', evidencia_provision: 'Permiso de prueba registrado', causa_raiz: 'Configuración de demostración', solucion_temporal: 'Alternativa temporal', solucion_definitiva: 'Configuración corregida', evidencia_cumplimiento: 'Solicitud entregada', confirmacion: 'Conformidad de demostración', evaluacion: 'Evaluación de evento documentada', solucion_aplicada: 'Servicio recuperado' };
            const finish = i === 4 || (process === 'incidentes' && i === 6);
            const pending = finish ? FLOWS[process].slice(2) : (process === 'eventos' && [2, 3].includes(i) ? ['evaluacion', 'respuesta'] : []);
            for (const state of pending)
                await desk.action(state === 'aprobado' ? approver : agent, String(t.id), { accion: 'transicion', estado: state, motivo: 'Evaluación de demostración', detalle: evidence, resolucion: state === 'resuelto' ? 'Resolución de demostración comprobada' : undefined });
        }
    // Vincular problema/cambio/incidente sin alterar los tickets de evaluación existentes.
    const problems = await q("SELECT id::text FROM ticket WHERE demo_clave LIKE 'DEMO-problemas-%' ORDER BY id"), incidents = await q("SELECT id::text FROM ticket WHERE demo_clave LIKE 'DEMO-incidentes-%' ORDER BY id"), changes = await q("SELECT id::text FROM ticket WHERE demo_clave LIKE 'DEMO-cambios-%' ORDER BY id");
    if (problems[0] && incidents[0])
        await desk.link(admin, problems[0].id, { destino_id: incidents[0].id, tipo: 'causa' });
    if (problems[0] && changes[0])
        await desk.link(admin, problems[0].id, { destino_id: changes[0].id, tipo: 'corrige' });
    console.log('Tickets demo conservados/creados: mínimo 37; no se sobrescriben ediciones de evaluación.');
    return { admin, ids };
}
