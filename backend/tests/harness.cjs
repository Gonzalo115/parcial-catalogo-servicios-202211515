const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {JwtService}=require('@nestjs/jwt');
const {hashPassword,checkPassword}=require('../dist/auth/password');

exports.runHarness=async function(t,db,baseUrl) {
  const suffix=randomBytes(4).toString('hex');
  const tag=`T${suffix}`; const password='Harness-local-2026';
  const hash=await hashPassword(password); const ids={};
  const one=async(sql,values=[]) => (await db.query(sql,values)).rows[0];
  const api=async(path,options={},token) => {
    const response=await fetch(`${baseUrl}/api${path}`,{...options,headers:{
      'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}});
    return {status:response.status,body:response.status===204?null:await response.json()};
  };
  const login=async(identifier,pass=password) => api('/auth/login',{method:'POST',body:JSON.stringify({identifier,password:pass})});
  try {
    let parent;
    for(const [table,fk] of [['empresa',null],['area','empresa_id'],['departamento','area_id'],['seccion','departamento_id'],['puesto','seccion_id']]) {
      const row=await one(fk ? `INSERT INTO ${table}(${fk},codigo,nombre,activo) VALUES($1,$2,$3,true) RETURNING id::text`:
        `INSERT INTO ${table}(codigo,nombre,activo) VALUES($1,$2,true) RETURNING id::text`,
        fk?[parent,tag,`Harness ${table}`]:[tag,`Harness ${table}`]);
      parent=row.id; ids[table]=parent;
    }
    ids.seccion2=(await one('INSERT INTO seccion(departamento_id,codigo,nombre,activo) VALUES($1,$2,$3,true) RETURNING id::text',
      [ids.departamento,`${tag}B`,'Harness sección B'])).id;
    ids.puesto2=(await one('INSERT INTO puesto(seccion_id,codigo,nombre,activo) VALUES($1,$2,$3,true) RETURNING id::text',
      [ids.seccion2,`${tag}B`,'Harness puesto B'])).id;
    for(const [key,role,active] of [['admin','administrador',true],['reader','consulta',true],['inactive','consulta',false]]) {
      ids[key]=(await one(`INSERT INTO usuario(puesto_id,nombre,nombre_usuario,correo,password_hash,rol,activo)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id::text`,
        [ids.puesto,`Harness ${key}`,`${tag.toLowerCase()}_${key}`,`${tag.toLowerCase()}_${key}@tests.local`,hash,role,active])).id;
    }
    ids.nivel1=(await one('INSERT INTO servicio_nivel1(codigo,nombre,requiere_revision) VALUES($1,$2,false) RETURNING id::text',[tag,'Harness nivel 1'])).id;
    ids.nivel2=(await one('INSERT INTO servicio_nivel2(nivel1_id,codigo,nombre,requiere_revision) VALUES($1,$2,$3,false) RETURNING id::text',
      [ids.nivel1,`${tag}.1`,'Harness nivel 2'])).id;
    await t.test('Hash con sal distinta, verificación y límite de 72 bytes',async()=>{
      assert.notEqual(hash,await hashPassword(password));
      assert.equal(await checkPassword(password,hash),true);
      assert.equal(await checkPassword('otra-password',hash),false);
      await assert.rejects(hashPassword('á'.repeat(37)));
    });
    let adminToken,readerToken;
    await t.test('P01: login por usuario/correo y credenciales inválidas',async()=>{
      const admin=await login(`${tag.toLowerCase()}_admin`);
      const reader=await login(`${tag.toLowerCase()}_reader@tests.local`);
      assert.equal(admin.status,200);assert.equal(reader.status,200);
      adminToken=admin.body.access_token;readerToken=reader.body.access_token;
      assert.equal('password_hash' in admin.body.user,false);
      assert.equal((await login(`${tag.toLowerCase()}_admin`,'incorrecta')).status,401);
      assert.equal((await login('no-existe')).status,401);
      assert.equal((await login(`${tag.toLowerCase()}_inactive`)).status,401);
      assert.equal((await api('/auth/login',{method:'POST',body:JSON.stringify({identifier:12,password})})).status,400);
    });
    await t.test('P02: sin token, firma alterada, expiración y usuario desactivado',async()=>{
      assert.equal((await api('/auth/me')).status,401);
      const parts=adminToken.split('.');parts[2]=(parts[2][0]==='a'?'b':'a')+parts[2].slice(1);
      assert.equal((await api('/auth/me',{},parts.join('.'))).status,401);
      const jwt=new JwtService({secret:process.env.JWT_SECRET});
      const claims=jwt.decode(adminToken);
      const expired=await jwt.signAsync({sub:claims.sub,jti:claims.jti,token_use:'access'},
        {algorithm:'HS256',expiresIn:-1,issuer:'catalogo-ti',audience:'catalogo-web'});
      assert.equal((await api('/auth/me',{},expired)).status,401);
      const wrongAudience=await jwt.signAsync({sub:claims.sub,jti:claims.jti,token_use:'access'},
        {algorithm:'HS256',expiresIn:900,issuer:'catalogo-ti',audience:'otra-aplicacion'});
      assert.equal((await api('/auth/me',{},wrongAudience)).status,401);
      await db.query('UPDATE usuario SET activo=false WHERE id=$1',[ids.reader]);
      assert.equal((await api('/auth/me',{},readerToken)).status,401);
      await db.query('UPDATE usuario SET activo=true WHERE id=$1',[ids.reader]);
    });
    await t.test('P03: consulta lee, escritura administrativa rechazada',async()=>{
      assert.equal((await api('/catalog/status',{},readerToken)).status,200);
      assert.equal((await api('/admin/check',{method:'POST'},readerToken)).status,403);
      assert.equal((await api('/admin/check',{method:'POST'},adminToken)).status,204);
      await db.query("UPDATE usuario SET rol='consulta' WHERE id=$1",[ids.admin]);
      assert.equal((await api('/admin/check',{method:'POST'},adminToken)).status,403);
      await db.query("UPDATE usuario SET rol='administrador' WHERE id=$1",[ids.admin]);
    });
    await t.test('P02: logout revoca JWT y bloquea su reutilización',async()=>{
      assert.equal((await api('/auth/logout',{method:'POST'},readerToken)).status,204);
      assert.equal((await api('/auth/me',{},readerToken)).status,401);
    });
    await t.test('P04 parcial: jerarquía completa recuperable en DB',async()=>{
      const row=await one(`SELECT e.id::text FROM usuario u JOIN puesto p ON p.id=u.puesto_id
        JOIN seccion s ON s.id=p.seccion_id JOIN departamento d ON d.id=s.departamento_id
        JOIN area a ON a.id=d.area_id JOIN empresa e ON e.id=a.empresa_id WHERE u.id=$1`,[ids.admin]);
      assert.equal(row.id,ids.empresa);
      await assert.rejects(db.query('UPDATE empresa SET activo=false WHERE id=$1',[ids.empresa]),{code:'23514'});
      await db.query('UPDATE puesto SET activo=false WHERE id=$1',[ids.puesto2]);
      await assert.rejects(db.query(`INSERT INTO usuario(puesto_id,nombre,nombre_usuario,password_hash,rol,activo)
        VALUES($1,'Error',$2,$3,'consulta',true)`,[ids.puesto2,`${tag.toLowerCase()}_bad`,hash]),{code:'23514'});
      await db.query('UPDATE puesto SET activo=true WHERE id=$1',[ids.puesto2]);
    });
    await t.test('P05 parcial: unicidad y FK rechazadas en DB',async()=>{
      await assert.rejects(db.query('INSERT INTO empresa(codigo,nombre,activo) VALUES($1,$2,true)',[tag,'Duplicada']),{code:'23505'});
      await assert.rejects(db.query("INSERT INTO area(empresa_id,codigo,nombre,activo) VALUES(9223372036854775807,'ERR','Huérfana',true)"),{code:'23503'});
    });
    await t.test('P09 parcial: umbrales inválidos rechazados y NULL conservado',async()=>{
      await assert.rejects(db.query('UPDATE servicio_nivel2 SET minimo=10,maximo=1 WHERE id=$1',[ids.nivel2]),{code:'23514'});
      const row=await one('SELECT activo,clase_id,minimo,maximo FROM servicio_nivel2 WHERE id=$1',[ids.nivel2]);
      assert.equal(row.activo,null);assert.equal(row.clase_id,null);assert.equal(row.minimo,null);assert.equal(row.maximo,null);
    });
    await t.test('P11 parcial: responsabilidad y traslados coherentes en DB',async()=>{
      await assert.rejects(db.query('INSERT INTO servicio_responsable VALUES($1,$2,$3)',[ids.nivel2,ids.seccion2,ids.admin]),{code:'23514'});
      await db.query('INSERT INTO servicio_responsable VALUES($1,$2,$3)',[ids.nivel2,ids.seccion,ids.admin]);
      await assert.rejects(db.query('UPDATE usuario SET puesto_id=$1 WHERE id=$2',[ids.puesto2,ids.admin]),{code:'23514'});
      await assert.rejects(db.query('UPDATE puesto SET seccion_id=$1 WHERE id=$2',[ids.seccion2,ids.puesto]),{code:'23514'});
    });
  } finally {
    if(ids.nivel2)await db.query('DELETE FROM servicio_responsable WHERE servicio_nivel2_id=$1',[ids.nivel2]);
    if(ids.nivel1)await db.query('DELETE FROM servicio_nivel2 WHERE nivel1_id=$1',[ids.nivel1]);
    if(ids.nivel1)await db.query('DELETE FROM servicio_nivel1 WHERE id=$1',[ids.nivel1]);
    const users=[ids.admin,ids.reader,ids.inactive].filter(Boolean);
    if(users.length){await db.query('DELETE FROM sesion WHERE usuario_id=ANY($1::bigint[])',[users]);await db.query('DELETE FROM usuario WHERE id=ANY($1::bigint[])',[users]);}
    if(ids.seccion||ids.seccion2)await db.query('DELETE FROM puesto WHERE seccion_id=ANY($1::bigint[])',[[ids.seccion,ids.seccion2].filter(Boolean)]);
    if(ids.departamento)await db.query('DELETE FROM seccion WHERE departamento_id=$1',[ids.departamento]);
    if(ids.area)await db.query('DELETE FROM departamento WHERE area_id=$1',[ids.area]);
    if(ids.empresa){await db.query('DELETE FROM area WHERE empresa_id=$1',[ids.empresa]);await db.query('DELETE FROM empresa WHERE id=$1',[ids.empresa]);}
  }
};
