import type { PoolClient } from 'pg';
import { hashPassword } from '../auth/password';
export async function seedDemo(c:Pick<PoolClient,'query'>,adminPassword:string,consultaPassword:string) {
  const adminHash=await hashPassword(adminPassword);
  const consultaHash=await hashPassword(consultaPassword);
  try {
    await c.query('BEGIN'); await c.query('SELECT pg_advisory_xact_lock(9021002)');
    const chain=[['empresa',null],['area','empresa_id'],['departamento','area_id'],
      ['seccion','departamento_id'],['puesto','seccion_id']];
    let parent:string|undefined;
    for(const [table,fk] of chain) {
      const sql=fk ? `INSERT INTO ${table}(${fk},codigo,nombre,activo) VALUES($1,$2,$3,true)
        ON CONFLICT(${fk},codigo) DO NOTHING` : `INSERT INTO ${table}(codigo,nombre,activo) VALUES($1,$2,true) ON CONFLICT(codigo) DO NOTHING`;
      await c.query(sql,fk?[parent,'DEMO',`${table} de evaluación`]:['DEMO',`${table} de evaluación`]);
      const {rows}=await c.query(`SELECT id::text,activo FROM ${table} WHERE codigo='DEMO'${fk?` AND ${fk}=$1`:''}`,fk?[parent]:[]);
      if(!rows[0]?.activo) throw new Error('Jerarquía demo inactiva');
      parent=rows[0].id;
    }
    for(const [login,role,hash] of [['admin','administrador',adminHash],['consulta','consulta',consultaHash]]) {
      const result=await c.query(`INSERT INTO usuario(puesto_id,nombre,nombre_usuario,correo,password_hash,rol,activo)
        VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT(lower(nombre_usuario)) DO NOTHING RETURNING id`,
        [parent,`Cuenta ${role} de evaluación`,login,`${login}@demo.local`,hash,role]);
      console.log(result.rows.length ? `Cuenta creada: ${login}` : `Cuenta existente conservada: ${login}`);
    }
    await c.query('COMMIT');
  } catch(error) {await c.query('ROLLBACK');throw error;}
}
