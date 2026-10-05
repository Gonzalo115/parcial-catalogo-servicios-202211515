import { createPool } from '../db/db.service';
import { seedAssignments } from './demo-assignments';
async function main(){const pool=createPool(),c=await pool.connect();try{await seedAssignments(c);}finally{c.release();await pool.end();}}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
