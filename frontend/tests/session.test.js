import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rememberSession,readSession,restoreSession,forgetSession} from '../src/session.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values};};
const login={access_token:'temporary-demo-token',expires_in:900,user:{id:'2',rol:'consulta',roles:['solicitante']},password:'never-store-this'};
test('recarga: restaura credencial y obtiene usuario y roles actuales del servidor',async()=>{
 const storage=memory();rememberSession(storage,login);
 const currentUser={id:'2',roles:['agente']};
 const restored=await restoreSession(storage,async(url,options)=>{
  assert.equal(url,'/api/auth/me');assert.equal(options.headers.Authorization,'Bearer '+login.access_token);
  return {ok:true,status:200,json:async()=>currentUser};
 });
 assert.equal(restored.access_token,login.access_token);assert.deepEqual(restored.user,currentUser);
 const stored=Array.from(storage.values.values()).join('');
 assert.ok(!stored.includes('never-store-this'));assert.ok(!stored.includes('solicitante'));
});
test('credencial vencida: no consulta API ni restaura acceso',async()=>{
 const storage=memory();rememberSession(storage,login,Date.now()-901000);
 assert.equal(await restoreSession(storage,()=>assert.fail('No consultar con token vencido')),null);
 assert.equal(storage.values.size,0);
});
test('sesión revocada/desactivada: 401 elimina la credencial',async()=>{
 const storage=memory();rememberSession(storage,login);
 assert.equal(await restoreSession(storage,async()=>({ok:false,status:401})),null);
 assert.equal(storage.values.size,0);
});
test('fallo de red no elimina sesión válida; reintento la recupera',async()=>{
 const storage=memory();rememberSession(storage,login);
 await assert.rejects(restoreSession(storage,async()=>{throw new Error('offline');}));
 assert.ok(readSession(storage));
 assert.ok(await restoreSession(storage,async()=>({ok:true,json:async()=>login.user})));
});
test('error 503 no se confunde con cierre de sesión',async()=>{
 const storage=memory();rememberSession(storage,login);
 await assert.rejects(restoreSession(storage,async()=>({ok:false,status:503})));
 assert.ok(readSession(storage));
});
test('cierre de sesión impide restaurar; respuesta antigua no borra otra sesión',async()=>{
 const storage=memory();rememberSession(storage,login);
 forgetSession(storage,'old-token');assert.ok(readSession(storage));
 forgetSession(storage,login.access_token);
 assert.equal(await restoreSession(storage,()=>assert.fail()),null);
});
test('datos corruptos o incompletos se descartan sin romper la página',()=>{
 const storage=memory();rememberSession(storage,login);
 const key=Array.from(storage.values.keys())[0];
 for(const value of ['{broken','{}','null','{"access_token":"x","expiresAt":"never"}']){
  storage.setItem(key,value);assert.equal(readSession(storage),null);
 }
});
test('almacenamiento bloqueado permite usar la sesión en memoria',()=>{
 const storage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
 assert.equal(readSession(storage),null);
 assert.equal(rememberSession(storage,login).access_token,login.access_token);
 assert.doesNotThrow(()=>forgetSession(storage));
});
