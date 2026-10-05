import 'reflect-metadata';
import { createOrm } from '../db/orm';
import { ImporterService } from '../importer/importer.service';
async function main(){const source=await createOrm();try{console.log(JSON.stringify(await new ImporterService(source).run(),null,2));}finally{await source.destroy();}}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
