import type { PoolClient } from 'pg';
export async function seedAssignments(c:Pick<PoolClient,'query'>){
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(9021003)');
  const {rows}=await c.query(`SELECT u.id::text usuario_id,p.seccion_id::text seccion_id FROM usuario u JOIN puesto p ON p.id=u.puesto_id WHERE u.nombre_usuario='admin' AND u.activo AND p.activo`);
  if(!rows[0])throw new Error('Ejecuta seed:demo primero.');
  const services=await c.query(`SELECT n.id::text FROM servicio_nivel2 n JOIN importacion_snapshot s ON s.codigo=n.codigo AND s.entidad='nivel2' ORDER BY n.codigo LIMIT 3`);
  if(services.rows.length<3)throw new Error('Ejecuta import:excel primero.');
  let created=0;for(const service of services.rows){const result=await c.query(`INSERT INTO servicio_responsable(servicio_nivel2_id,seccion_id,usuario_id) VALUES($1,$2,$3) ON CONFLICT(servicio_nivel2_id) DO NOTHING RETURNING servicio_nivel2_id`,[service.id,rows[0].seccion_id,rows[0].usuario_id]);created+=result.rows.length;}
  await c.query('COMMIT');console.log(`Asignaciones de demostración: ${created} creadas; asignaciones previas conservadas.`);
 }catch(error){await c.query('ROLLBACK');throw error;}
}
