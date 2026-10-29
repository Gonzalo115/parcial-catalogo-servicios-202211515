import 'reflect-metadata';
import { createOrm } from '../db/orm';
import { DeskService } from '../desk/desk.service';
import { prepareDesk, seedTickets } from '../desk/seed';
async function main() { const db = await createOrm(); try {
    const seed = process.env.CMDB_SEED || '202211515', count = Number(process.env.CMDB_COUNT || 5000);
    if (process.argv.includes('--cmdb-only'))
        await prepareDesk(db, new DeskService(db), seed, count);
    else
        await seedTickets(db, new DeskService(db), seed, count);
}
finally {
    await db.destroy();
} }
main().catch(e => { console.error(e.message); process.exitCode = 1; });
