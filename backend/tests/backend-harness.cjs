const assert=require('node:assert/strict');const {randomBytes}=require('node:crypto');
exports.runBackendHarness=async function(t,db,baseUrl){
 const tag='API'+randomBytes(4).toString('hex'),login=tag.toLowerCase(),pass='Harness-api-local-2026';const {hashPassword}=require('../dist/auth/password');
 const one=async(sql,args=[]) => (await db.query(sql,args)).rows[0];const ids={};let token,reader;
 const api=async(path,method='GET',body,credential=token)=>{const res=await fetch(`${baseUrl}/api${path}`,{method,headers:{'Content-Type':'application/json',...(credential?{Authorization:`Bearer ${credential}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:res.status,body:res.status===204?null:await res.json()};};
 try{
  let parent;
  for(const[table,fk]of [['empresa',null],['area','empresa_id'],['departamento','area_id'],['seccion','departamento_id'],['puesto','seccion_id']]){parent=(await one(fk?`INSERT INTO ${table}(${fk},codigo,nombre,activo) VALUES($1,$2,$3,true) RETURNING id::text`:`INSERT INTO ${table}(codigo,nombre,activo) VALUES($1,$2,true) RETURNING id::text`,fk?[parent,tag,table]:[tag,table])).id;ids[table]=parent;}
  for(const[key,rol]of [['admin','administrador'],['reader','consulta']])ids[key]=(await one(`INSERT INTO usuario(puesto_id,nombre,nombre_usuario,password_hash,rol,activo) VALUES($1,$2,$3,$4,$5,true) RETURNING id::text`,[parent,key,`${login}_${key}`,await hashPassword(pass),rol])).id;
  token=(await api('/auth/login','POST',{identifier:`${login}_admin`,password:pass},null)).body.access_token;reader=(await api('/auth/login','POST',{identifier:`${login}_reader`,password:pass},null)).body.access_token;
  await t.test('P03: consulta rechazada en CRUD e importación reales; hashes no expuestos',async()=>{
   for(const path of ['/empresas','/servicios-nivel2','/importaciones'])assert.equal((await api(path,'POST',{},reader)).status,403);
   assert.equal((await api('/usuarios','GET',undefined,reader)).status,403);const users=await api('/usuarios');assert.equal(users.status,200);assert.equal(JSON.stringify(users.body).includes('password_hash'),false);
  });
  await t.test('P04/P05: jerarquía por API, duplicados, FK, actualización y bajas protegidas',async()=>{
   const company=await api('/empresas','POST',{codigo:tag+'C',nombre:'Empresa API',activo:true});assert.equal(company.status,201);ids.apiempresa=company.body.id;let id=ids.apiempresa;for(const[key,fk]of [['areas','empresa_id'],['departamentos','area_id'],['secciones','departamento_id'],['puestos','seccion_id']]){const r=await api(`/${key}`,'POST',{[fk]:id,codigo:tag+'C',nombre:key,activo:true});assert.equal(r.status,201,JSON.stringify(r.body));id=r.body.id;ids[key]=id;}
   const user=await api('/usuarios','POST',{puesto_id:id,nombre:'Creado por API',nombre_usuario:login+'_new',correo:login+'@test.local',rol:'consulta',activo:true,password:pass});assert.equal(user.status,201,JSON.stringify(user.body));ids.newuser=user.body.id;assert.equal(user.body.puesto.seccion.departamento.area.empresa.id,ids.apiempresa);assert.equal('password_hash'in user.body,false);
   assert.equal((await api('/usuarios','POST',{puesto_id:id,nombre:'Sin password',nombre_usuario:login+'_missing',rol:'consulta',activo:true})).status,400);
   assert.equal((await api('/empresas','POST',{codigo:tag,nombre:'Duplicada',activo:true})).status,409);assert.equal((await api('/areas','POST',{empresa_id:'9223372036854775807',codigo:'ERR',nombre:'Huérfana',activo:true})).status,400);assert.equal((await api(`/empresas/${ids.empresa}`,'DELETE')).status,400);
   const edit=await api(`/usuarios/${ids.newuser}`,'PATCH',{nombre:'Editado'});assert.equal(edit.status,200);assert.equal(edit.body.nombre,'Editado');
  });
  await t.test('P09: crear y editar umbrales, NULL y sección obligatoria',async()=>{
   const n1=await api('/servicios-nivel1','POST',{codigo:tag,nombre:'Prueba N1'});assert.equal(n1.status,201);ids.n1=n1.body.id;const payload={codigo:tag+'.1',nombre:'Prueba N2',nivel1_id:ids.n1,seccion_id:ids.seccion,minimo:'1.5',maximo:'10'};
   assert.equal((await api('/servicios-nivel2','POST',{...payload,minimo:'11'})).status,400);assert.equal((await api('/servicios-nivel2','POST',{codigo:tag+'.2',nombre:'Sin sección',nivel1_id:ids.n1})).status,400);
   const n2=await api('/servicios-nivel2','POST',payload);assert.equal(n2.status,201,JSON.stringify(n2.body));ids.n2=n2.body.id;assert.equal((await api(`/servicios-nivel2/${ids.n2}`,'PATCH',{minimo:'11'})).status,400);
   const clear=await api(`/servicios-nivel2/${ids.n2}`,'PATCH',{minimo:null,maximo:null});assert.equal(clear.status,200);assert.equal(clear.body.minimo,null);assert.equal(clear.body.activo,null);
  });
  await t.test('P10: búsqueda, filtros, paginación y ficha completa',async()=>{
   const list=await api(`/servicios-nivel2?buscar=${tag}&nivel1_id=${ids.n1}&activo=desconocido&limite=1`);assert.equal(list.status,200);assert.equal(list.body.total,1);assert.equal(list.body.items[0].nivel1.id,ids.n1);assert.equal((await api(`/servicios-nivel2?buscar=${tag}&activo=true`)).body.total,0);
   const item=(await api(`/servicios-nivel2/${ids.n2}`)).body;for(const key of ['descripcion','metrica','minimo','maximo','clase','criticidad','tipo','responsable','nivel1'])assert.ok(key in item,key);
  });
  await t.test('P11: usuario ajeno rechazado; asignación, traslado y baja protegidos',async()=>{
   assert.equal((await api(`/servicios-nivel2/${ids.n2}/responsable`,'PUT',{seccion_id:ids.seccion,usuario_id:ids.newuser})).status,400);const valid=await api(`/servicios-nivel2/${ids.n2}/responsable`,'PUT',{seccion_id:ids.secciones,usuario_id:ids.newuser});assert.equal(valid.status,200);assert.equal(valid.body.responsable.usuario.id,ids.newuser);assert.equal(JSON.stringify(valid.body).includes('password_hash'),false);
   assert.equal((await api(`/usuarios/${ids.newuser}`,'PATCH',{puesto_id:ids.puesto})).status,400);assert.equal((await api(`/usuarios/${ids.newuser}`,'DELETE')).status,400);assert.equal((await api(`/servicios-nivel2/${ids.n2}`,'DELETE')).status,200);assert.equal((await api(`/servicios-nivel2/${ids.n2}/responsable`,'DELETE')).status,200);assert.equal((await api(`/usuarios/${ids.newuser}`,'DELETE')).status,200);
  });
 }finally{
  if(ids.n2){await db.query('DELETE FROM servicio_responsable WHERE servicio_nivel2_id=$1',[ids.n2]);await db.query('DELETE FROM servicio_nivel2 WHERE id=$1',[ids.n2]);}if(ids.n1)await db.query('DELETE FROM servicio_nivel1 WHERE id=$1',[ids.n1]);
  const users=[ids.admin,ids.reader,ids.newuser].filter(Boolean);if(users.length){await db.query('DELETE FROM sesion WHERE usuario_id=ANY($1::bigint[])',[users]);await db.query('DELETE FROM usuario WHERE id=ANY($1::bigint[])',[users]);}
  for(const empresa of [ids.apiempresa,ids.empresa].filter(Boolean)){await db.query('DELETE FROM puesto WHERE seccion_id IN(SELECT s.id FROM seccion s JOIN departamento d ON d.id=s.departamento_id JOIN area a ON a.id=d.area_id WHERE a.empresa_id=$1)',[empresa]);await db.query('DELETE FROM seccion WHERE departamento_id IN(SELECT d.id FROM departamento d JOIN area a ON a.id=d.area_id WHERE a.empresa_id=$1)',[empresa]);await db.query('DELETE FROM departamento WHERE area_id IN(SELECT id FROM area WHERE empresa_id=$1)',[empresa]);await db.query('DELETE FROM area WHERE empresa_id=$1',[empresa]);await db.query('DELETE FROM empresa WHERE id=$1',[empresa]);}
 }
};
