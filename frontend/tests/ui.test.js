import {test} from 'node:test';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
// Compilar JSX con el mismo motor del build; ejecutar interacciones DOM sin navegador.
test('interacciones de sesión y secciones en DOM',async()=>{
 const directory=await mkdtemp(new URL('./.ui-',import.meta.url));
 try {
  const outfile=join(directory,'cases.mjs');
  await build({entryPoints:[new URL('./ui-cases.jsx',import.meta.url).pathname],outfile,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',logLevel:'silent'});
  const {verify}=await import(pathToFileURL(outfile));
  await verify();
 } finally {await rm(directory,{recursive:true,force:true});}
});
