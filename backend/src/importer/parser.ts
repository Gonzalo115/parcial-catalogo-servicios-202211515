import ExcelJS from 'exceljs';
import Decimal from 'decimal.js';
export const HEADERS=['COD.N1','SERVICIO - Nivel 1','COD.N2','SERVICIO - Nivel 2','ACTIVO','CLASE DE SERVICIO','CRITICIDAD','TIPO DE SERVICIO','Descripción','Métrica','Minimo','Maximo'];
export const FIELDS=['codigo_n1','nombre_n1','codigo_n2','nombre_n2','activo','clase','criticidad','tipo','descripcion','metrica','minimo','maximo'];
function value(v:any):string|null {
 if(v==null||v==='')return null;
 if(typeof v==='object'){
  if(v.richText)return v.richText.map((r:any)=>r.text).join('').trim()||null;
  if('formula'in v||'sharedFormula'in v){if(v.result===undefined)throw new Error('Fórmula sin resultado almacenado.');return value(v.result);}
  if(v.text!==undefined)return value(v.text);
  throw new Error('Tipo de celda no soportado.');
 }
 return String(v).trim()||null;
}
export async function parseWorkbook(buffer:Buffer) {
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer as any);
 const sheet=workbook.getWorksheet('Servicios Externos');if(!sheet)throw new Error('Falta la hoja Servicios Externos.');
 HEADERS.forEach((h,i)=>{if(value(sheet.getCell(4,i+1).value)!==h)throw new Error(`Encabezado inesperado en ${sheet.getCell(4,i+1).address}.`);});
 const observations:any[]=[];const rows:any[]=[];const n1=new Map<string,any>();const n2=new Map<string,any>();
 for(let fila=5;fila<=101;fila++){
  const original:any={},resolved:any={},origins:any={};
  FIELDS.forEach((field,i)=>{const cell=sheet.getCell(fila,i+1);const master=cell.isMerged?cell.master:cell;
   original[field]=cell.address===master.address?value(cell.value):null;
   resolved[field]=value(master.value);origins[field]={celda:cell.address,principal:master.address,combinada:cell.isMerged};});
  const row={fila,original,resolved,origins,observaciones:[]as any[],resultado:'pendiente'};rows.push(row);
  if(resolved.codigo_n1){
   if(!resolved.nombre_n1)throw new Error(`Nivel 1 sin nombre en fila ${fila}.`);
   const existing=n1.get(resolved.codigo_n1);
   if(!existing)n1.set(resolved.codigo_n1,{codigo:resolved.codigo_n1,nombre:resolved.nombre_n1,filas:[fila],nombres:[{fila,nombre:resolved.nombre_n1}],requiere_revision:false});
   else {existing.filas.push(fila);if(!existing.nombres.some((x:any)=>x.nombre===resolved.nombre_n1)){
    existing.nombres.push({fila,nombre:resolved.nombre_n1});existing.requiere_revision=true;
    const obs={tipo:'conflicto_nombre_nivel1',codigo:existing.codigo,canonico:existing.nombre,evidencia:[...existing.nombres],regla:'Primer nombre no vacío por orden de fila; se conserva evidencia.'};
    observations.push(obs);row.observaciones.push(obs);
   }}
  }
  if(!resolved.codigo_n2){row.resultado='omitido';const obs={tipo:'fila_sin_codigo_n2',fila,regla:'No completar fuera de un rango combinado.'};observations.push(obs);row.observaciones.push(obs);continue;}
  if(!resolved.codigo_n1){const derived=resolved.codigo_n2.slice(0,resolved.codigo_n2.lastIndexOf('.'));
   if(!n1.has(derived))throw new Error(`Nivel 2 sin padre verificable en fila ${fila}.`);
   resolved.codigo_n1=derived;
   const obs={tipo:'padre_por_prefijo',fila,codigo:resolved.codigo_n2,padre:derived};observations.push(obs);row.observaciones.push(obs);
  }
  if(!resolved.nombre_n2)throw new Error(`Nivel 2 sin nombre en fila ${fila}.`);
  const group=n2.get(resolved.codigo_n2);
  if(!group)n2.set(resolved.codigo_n2,{codigo:resolved.codigo_n2,rows:[row]});else group.rows.push(row);
 }
 const records=[...n2.values()].map(group=>{
  const pick=(field:string)=>{const values=group.rows.filter((r:any)=>r.resolved[field]!=null).map((r:any)=>({fila:r.fila,valor:r.resolved[field]}));
   const distinct=[...new Set(values.map((v:any)=>v.valor))];
   if(distinct.length>1){const obs={tipo:'conflicto_atributo',codigo:group.codigo,campo:field,canonico:values[0].valor,evidencia:values,regla:'Primer valor no vacío; revisión explícita.'};observations.push(obs);group.rows.forEach((r:any)=>r.observaciones.push(obs));}
   return values[0]?.valor??null;};
  const data:any={codigo:group.codigo};for(const field of FIELDS.filter(f=>f!=='codigo_n2'))data[field]=pick(field);
  if(!n1.has(data.codigo_n1))throw new Error(`Padre inexistente: ${group.codigo}.`);
  if(data.activo!==null&&!['S','N'].includes(data.activo))throw new Error(`ACTIVO inválido: ${group.codigo}.`);
  data.activo=data.activo===null?null:data.activo==='S';
  for(const field of ['minimo','maximo'])if(data[field]!=null){if(!/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(data[field]))throw new Error(`Umbral inválido: ${group.codigo}.`);data[field]=new Decimal(data[field]).toString();}
  if(data.minimo!=null&&data.maximo!=null&&new Decimal(data.minimo).gt(data.maximo))throw new Error(`Mínimo mayor que máximo: ${group.codigo}.`);
  data.requiere_revision=group.rows.some((r:any)=>r.observaciones.length)||['activo','clase','criticidad','tipo'].some(f=>data[f]==null);
  if(data.requiere_revision){const obs={tipo:'revision_requerida',codigo:group.codigo,filas:group.rows.map((r:any)=>r.fila),ausentes:FIELDS.slice(4).filter(f=>data[f]==null)};observations.push(obs);group.rows.forEach((r:any)=>r.observaciones.push(obs));}
  return data;
 });
 const options:any={clase:[],criticidad:[],tipo:[]};
 for(const[field,col]of [['clase',6],['criticidad',7],['tipo',8]]as const)for(let row=112;row<=122;row++){
  const v=value(sheet.getCell(row,col).value);if(v&&!options[field].includes(v))options[field].push(v);
 }
 for(const record of records)for(const field of Object.keys(options))if(record[field]!=null&&!options[field].includes(record[field]))throw new Error(`Opción fuera del listado original: ${record[field]}.`);
 if(n1.size!==12||n2.size!==46)throw new Error(`Control del archivo original falló: ${n1.size} nivel 1 y ${n2.size} nivel 2 (esperados 12/46).`);
 return {nivel1:[...n1.values()],nivel2:records,rows,options,observaciones:observations};
}
