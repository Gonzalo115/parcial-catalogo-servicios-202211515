import { readdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPool } from '../db/db.service';
async function main() {
  const pool=createPool(); const client=await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(9021001)');
    await client.query(`CREATE SCHEMA IF NOT EXISTS catalogo;
      CREATE TABLE IF NOT EXISTS catalogo.schema_migration(version TEXT PRIMARY KEY,aplicado_en TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const folder=join(process.cwd(),'migrations');
    for (const file of (await readdir(folder)).filter(x=>/^\d+_.+\.sql$/.test(x)).sort()) {
      const version=file.split('_')[0];
      if ((await client.query('SELECT 1 FROM catalogo.schema_migration WHERE version=$1',[version])).rowCount) continue;
      await client.query('BEGIN');
      try {
        await client.query(await readFile(join(folder,file),'utf8'));
        await client.query('INSERT INTO catalogo.schema_migration(version) VALUES($1) ON CONFLICT DO NOTHING',[version]);
        await client.query('COMMIT');console.log(`Migración aplicada: ${version}`);
      } catch(error) {await client.query('ROLLBACK');throw error;}
    }
    console.log('Migraciones al día');
  } finally {await client.query('SELECT pg_advisory_unlock(9021001)');client.release();await pool.end();}
}
main().catch(()=>{console.error('Migración fallida; revisar scripts y conexión.');process.exit(1);});
