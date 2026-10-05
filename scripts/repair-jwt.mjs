import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const file='.env';
try{
 const original=await readFile(file,'utf8');const match=original.match(/^JWT_SECRET\s*=(.*)$/m);
 const value=(match?.[1]||'').trim().replace(/^(['"])(.*)\1$/,'$2');
 if(value&&!value.startsWith('replace-with-')&&Buffer.byteLength(value,'utf8')>=32){console.log('JWT_SECRET válido; se conserva sin cambios.');}
 else{
  const line=`JWT_SECRET=${randomBytes(48).toString('hex')}`;
  const updated=match?original.replace(/^JWT_SECRET\s*=.*$/m,line):`${original.replace(/\s*$/,'')}\n${line}\n`;
  await writeFile(file,updated,{mode:0o600});console.log('JWT_SECRET configurado. Se conservaron las demás variables; recrear el contenedor.');
 }
}catch(error){console.error(error.code==='ENOENT'?'Falta .env; ejecuta configure.mjs primero.':'No se pudo actualizar JWT_SECRET.');process.exitCode=1;}
