import { createPool } from '../db/db.service';
import { required } from '../config';
import { seedDemo } from './demo';
async function main() {
  const adminPassword=required('DEMO_ADMIN_PASSWORD');
  const consultaPassword=required('DEMO_CONSULTA_PASSWORD');
  const pool=createPool(); const c=await pool.connect();
  try {
    await seedDemo(c,adminPassword,consultaPassword);
  }
  finally {c.release();await pool.end();}
}
main().catch(()=>{console.error('No se crearon cuentas: revisa variables demo y jerarquía.');process.exit(1);});
