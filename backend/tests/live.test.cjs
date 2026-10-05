const {test}=require('node:test');
const {createPool}=require('../dist/db/db.service');
const {runHarness}=require('./harness.cjs');
const {runBackendHarness}=require('./backend-harness.cjs');
test('Harness contra API y PostgreSQL de Docker; datos propios aislados',async(t)=>{
  const pool=createPool();
  try {await runHarness(t,pool,process.env.TEST_BASE_URL || 'http://127.0.0.1:3000');await runBackendHarness(t,pool,process.env.TEST_BASE_URL || 'http://127.0.0.1:3000');}
  finally {await pool.end();}
});
