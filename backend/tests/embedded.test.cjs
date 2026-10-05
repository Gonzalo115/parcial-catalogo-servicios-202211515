require('reflect-metadata');const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync,existsSync}=require('node:fs'),{resolve}=require('node:path');
const {DataSource}=require('typeorm'),{PGliteDriver}=require('typeorm-pglite'),{Test}=require('@nestjs/testing');
process.env.JWT_SECRET='embedded-tests-only-32-byte-secret-value';process.env.JWT_ISSUER='catalogo-ti';process.env.JWT_AUDIENCE='catalogo-web';process.env.EXCEL_PATH=existsSync('data/CatalogoServicios.xlsx')?resolve('data/CatalogoServicios.xlsx'):resolve('../data/CatalogoServicios.xlsx');
const {seedAssignments}=require('../dist/scripts/demo-assignments');
const {AppModule}=require('../dist/app.module'),{ENTITIES}=require('../dist/db/entities'),{DbService}=require('../dist/db/db.service'),{configureApp}=require('../dist/configure-app'),{seedDemo}=require('../dist/scripts/demo'),{runHarness}=require('./harness.cjs'),{runBackendHarness}=require('./backend-harness.cjs');
test('Integración: NestJS, TypeORM y PostgreSQL embebido; archivo original',async t=>{
 const source=new DataSource({type:'postgres',driver:new PGliteDriver().driver,entities:ENTITIES,schema:'catalogo',synchronize:false,logging:false});let app;
 try{
  await source.initialize();for(const name of ['001_initial.sql','002_backend.sql'])await source.query(readFileSync(existsSync(`migrations/${name}`)?`migrations/${name}`:`../db/migrations/${name}`,'utf8'));await source.query("INSERT INTO catalogo.schema_migration(version) VALUES('002')");await source.query('SET search_path=catalogo,public');
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DataSource).useValue(source).compile();app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');const db=app.get(DbService),base=await app.getUrl();
  await t.test('Seed demo reproducible: dos roles, hashes y sin duplicados',async()=>{await seedDemo(db,'Demo-admin-tests-2026','Demo-reader-tests-2026');const before=(await db.query('SELECT id,nombre_usuario,password_hash FROM usuario ORDER BY id')).rows;await seedDemo(db,'Nueva-admin-tests-2026','Nueva-reader-tests-2026');assert.deepEqual((await db.query('SELECT id,nombre_usuario,password_hash FROM usuario ORDER BY id')).rows,before);});
  await runHarness(t,db,base);await runBackendHarness(t,db,base);
  const login=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:'admin',password:'Demo-admin-tests-2026'})});const token=(await login.json()).access_token;
  const request=async(path,method='GET',body)=>{const r=await fetch(`${base}/api${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()};};let first;
  await t.test('P06: original, 12/46, hash y auditoría completa',async()=>{
   first=await request('/importaciones','POST');assert.equal(first.status,201,JSON.stringify(first.body));assert.deepEqual(first.body.control,{nivel1:12,nivel2:46});assert.equal(first.body.creados.nivel1,12);assert.equal(first.body.creados.nivel2,46);assert.equal(first.body.sha256,'de3b478a5faeeeaebce1aa7726e0e3321188a68e41bbb656e1d17b0c5b74dcf0');assert.deepEqual(first.body.omitidos.map(x=>x.fila),[42,67]);const audit=await request(`/importaciones/${first.body.importacion_id}`);assert.equal(audit.body.detalles.length,97);assert.equal(audit.body.detalles.find(r=>r.fila===6).origen_celdas.codigo_n1.principal,'A5');
  });
  await t.test('P07: repetir sin duplicar ni actualizar, trazabilidad',async()=>{const second=await request('/importaciones','POST');assert.equal(second.status,201);assert.equal(second.body.creados.nivel2,0);assert.equal(second.body.actualizados.nivel2,0);assert.equal(second.body.sin_cambios.nivel2,46);assert.notEqual(second.body.importacion_id,first.body.importacion_id);assert.equal((await db.query('SELECT count(*)::int n FROM servicio_nivel2')).rows[0].n,46);});
  await t.test('P08: SE.12 canónico, dos nombres, prefijo y NULL reales',async()=>{
   const n1=(await request('/servicios-nivel1?buscar=SE.12')).body.items;assert.equal(n1.length,1);assert.equal(n1[0].nombre,'Suministrar Analitica');assert.ok(first.body.observaciones.some(o=>o.codigo==='SE.12'&&o.evidencia?.some(e=>e.nombre==='Mantener Tableros de Control')));
   const rows=(await request('/servicios-nivel2?buscar=SE.12&limite=100')).body.items;assert.equal(rows.length,3);for(const row of rows){assert.equal(row.nivel1.id,n1[0].id);assert.equal(row.requiere_revision,true);for(const f of ['activo','clase_id','criticidad_id','tipo_id','descripcion','metrica','minimo','maximo'])assert.equal(row[f],null,f);assert.equal(row.responsable,null);}
  });
  await t.test('P10: filtros de clase, criticidad, tipo, estado y nivel1',async()=>{
   const row=(await request('/servicios-nivel2?activo=true&limite=100')).body.items.find(r=>r.clase_id&&r.criticidad_id&&r.tipo_id);assert.ok(row);const r=await request(`/servicios-nivel2?nivel1_id=${row.nivel1_id}&clase_id=${row.clase_id}&criticidad_id=${row.criticidad_id}&tipo_id=${row.tipo_id}&activo=true&limite=100`);assert.equal(r.status,200);assert.ok(r.body.items.length);assert.ok(r.body.items.every(x=>x.clase_id===row.clase_id&&x.criticidad_id===row.criticidad_id&&x.tipo_id===row.tipo_id));
  });
  await t.test('Etiquetas: modificación auditada, mapeo e identidad preservada al reimportar',async()=>{
   const cat=(await request('/clases')).body.items.find(c=>c.nombre==='A DEMANDA');assert.ok(cat);
   assert.equal((await request(`/clases/${cat.id}`,'PATCH',{nombre:'A DEMANDA (corregida explícitamente)'})).status,200);
   const repeat=await request('/importaciones','POST');assert.equal(repeat.status,201);assert.equal(repeat.body.creados.opciones,0);assert.equal(repeat.body.sin_cambios.nivel2,46);assert.ok(repeat.body.observaciones.some(o=>o.tipo==='etiqueta_mapeada'&&o.opcion_id===cat.id));
   const mappings=await request('/catalog/mapeos');assert.ok(mappings.body.some(x=>x.nombre_origen==='A DEMANDA'&&x.clase_id===cat.id));
   assert.equal((await request('/clases','POST',{nombre:'A DEMANDA',activo:true})).status,409);
  });
  await t.test('Datos demo: al menos tres asignaciones válidas e idempotentes',async()=>{await seedAssignments(db);const before=(await db.query('SELECT * FROM servicio_responsable ORDER BY servicio_nivel2_id')).rows;assert.equal(before.length,3);await seedAssignments(db);assert.deepEqual((await db.query('SELECT * FROM servicio_responsable ORDER BY servicio_nivel2_id')).rows,before);});
  await t.test('Reimportación conserva correcciones manuales y responsables',async()=>{
   const row=(await request('/servicios-nivel2?buscar=SE.12.3')).body.items[0],user=(await db.query("SELECT u.id::text usuario,p.seccion_id::text seccion FROM usuario u JOIN puesto p ON p.id=u.puesto_id WHERE nombre_usuario='admin'")).rows[0];assert.equal((await request(`/servicios-nivel2/${row.id}/responsable`,'PUT',{seccion_id:user.seccion,usuario_id:user.usuario})).status,200);assert.equal((await request(`/servicios-nivel2/${row.id}`,'PATCH',{descripcion:'Corrección manual verificada'})).status,200);
   const result=await request('/importaciones','POST');assert.equal(result.status,201);assert.equal(result.body.preservados.nivel2,1);const current=(await request(`/servicios-nivel2/${row.id}`)).body;assert.equal(current.descripcion,'Corrección manual verificada');assert.equal(current.responsable.usuario_id,user.usuario);
  });
 }finally{if(app)await app.close();else if(source.isInitialized)await source.destroy();}
});
