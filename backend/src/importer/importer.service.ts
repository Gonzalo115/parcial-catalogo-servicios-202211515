import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { Clase, Criticidad, Importacion, ImportacionDetalle, ImportacionSnapshot, OpcionMapeo, Nivel1, Nivel2, Tipo } from '../db/entities';
import { dto, ListDto, requireId } from '../common/dto';
import { parseWorkbook } from './parser';
function same(a:any,b:any){return JSON.stringify(Object.keys(a).sort().map(k=>[k,a[k]]))===JSON.stringify(Object.keys(b).sort().map(k=>[k,b[k]]));}
@Injectable()
export class ImporterService {
 private readonly logger=new Logger(ImporterService.name);
 constructor(private readonly source:DataSource){}
 async run(){
  const path=process.env.EXCEL_PATH||resolve(process.cwd(),'data/CatalogoServicios.xlsx');
  let buffer:Buffer,parsed:Awaited<ReturnType<typeof parseWorkbook>>;
  try{buffer=await readFile(path);parsed=await parseWorkbook(buffer);}catch(error){this.logger.warn('Importación rechazada antes de escribir.');throw new BadRequestException(error instanceof Error?error.message:'Archivo inválido.');}
  const sha=createHash('sha256').update(buffer).digest('hex');
  const report:any={archivo:basename(path),sha256:sha,control:{nivel1:parsed.nivel1.length,nivel2:parsed.nivel2.length},
   creados:{nivel1:0,nivel2:0,opciones:0},actualizados:{nivel1:0,nivel2:0},sin_cambios:{nivel1:0,nivel2:0},preservados:{nivel1:0,nivel2:0},
   omitidos:parsed.rows.filter(r=>r.resultado==='omitido').map(r=>({fila:r.fila,motivo:'Sin código N2 fuera de combinación'})),observaciones:[...parsed.observaciones]};
  return this.source.transaction(async m=>{
   await m.query('SELECT pg_advisory_xact_lock(9021003)');
   const maps:any={};
   for(const[field,entity,key]of [['clase',Clase,'clases'],['criticidad',Criticidad,'criticidades'],['tipo',Tipo,'tipos']]as const){maps[field]=new Map();
    for(const nombre of parsed.options[field]){const repo=m.getRepository(entity);let option=await repo.findOneBy({nombre});
     if(!option){const alias=await m.getRepository(OpcionMapeo).findOneBy({entidad:key,nombre_origen:nombre});
      if(alias){option=await repo.findOneBy({id:String((alias as any)[`${field}_id`])});if(!option)throw new BadRequestException('Mapeo de etiqueta inconsistente.');
       report.observaciones.push({tipo:'etiqueta_mapeada',entidad:key,origen:nombre,actual:option.nombre,opcion_id:String(option.id)});
      }else{option=await repo.save(repo.create({nombre,activo:true}));report.creados.opciones++;}
     }maps[field].set(nombre,String(option.id));}
   }
   const ids1=new Map<string,string>(),ids2=new Map<string,string>(),results=new Map<string,string>();
   const persist=async(kind:'nivel1'|'nivel2',entity:any,payload:any)=>{
    const repo=m.getRepository(entity),snapshots=m.getRepository(ImportacionSnapshot),where={entidad:kind,codigo:payload.codigo};
    let record:any=await repo.findOneBy({codigo:payload.codigo});const snapshot=await snapshots.findOneBy(where);let result='sin_cambios';
    if(!record){record=await repo.save(repo.create(payload));report.creados[kind]++;result='creado';await snapshots.save({...where,payload,editado_manualmente:false});}
    else {
     const actual:any={};for(const key of Object.keys(payload))actual[key]=record[key]??null;
     if(!snapshot||snapshot.editado_manualmente||!same(actual,snapshot.payload)){
      report.preservados[kind]++;result='preservado';report.observaciones.push({tipo:'mantenimiento_preservado',entidad:kind,codigo:payload.codigo,regla:'No sobrescribir registros manuales ni correcciones; asignaciones siempre preservadas.'});
     }else if(same(payload,snapshot.payload)){report.sin_cambios[kind]++;}
     else{record=await repo.save(repo.create({...record,...payload}));report.actualizados[kind]++;result='actualizado';await snapshots.save({...where,payload,editado_manualmente:false});}
    }
    results.set(`${kind}:${payload.codigo}`,result);return String(record.id);
   };
   for(const r of parsed.nivel1)ids1.set(r.codigo,await persist('nivel1',Nivel1,{codigo:r.codigo,nombre:r.nombre,activo:null,requiere_revision:r.requiere_revision}));
   for(const r of parsed.nivel2)ids2.set(r.codigo,await persist('nivel2',Nivel2,{codigo:r.codigo,nombre:r.nombre_n2,nivel1_id:ids1.get(r.codigo_n1),activo:r.activo,
    clase_id:r.clase==null?null:maps.clase.get(r.clase),criticidad_id:r.criticidad==null?null:maps.criticidad.get(r.criticidad),tipo_id:r.tipo==null?null:maps.tipo.get(r.tipo),
    descripcion:r.descripcion,metrica:r.metrica,minimo:r.minimo,maximo:r.maximo,requiere_revision:!!r.requiere_revision}));
   const audit=await m.getRepository(Importacion).save({archivo_nombre:basename(path),archivo_sha256:sha,version_reglas:'fase3-1',estado:'completada',resumen:report});
   report.importacion_id=String(audit.id);
   for(const row of parsed.rows){await m.getRepository(ImportacionDetalle).save({importacion_id:String(audit.id),hoja:'Servicios Externos',fila:row.fila,
    nivel1_id:ids1.get(row.resolved.codigo_n1)??null,nivel2_id:ids2.get(row.resolved.codigo_n2)??null,
    datos_originales:row.original,datos_resueltos:row.resolved,origen_celdas:row.origins,
    resultado:row.resultado==='omitido'?'omitido':results.get(`nivel2:${row.resolved.codigo_n2}`)||'omitido',observaciones:row.observaciones});}
   await m.getRepository(Importacion).update(audit.id,{resumen:report});
   this.logger.log(`Lote ${audit.id}: 12/46 códigos, SHA-256 ${sha}; creados N1=${report.creados.nivel1}, N2=${report.creados.nivel2}.`);
   for(const obs of report.observaciones)if(obs.tipo==='conflicto_nombre_nivel1')this.logger.warn(JSON.stringify(obs));
   return report;
  });
 }
 async list(input:any){const q=await dto(ListDto,input);const[items,total]=await this.source.getRepository(Importacion).findAndCount({order:{id:'DESC'},skip:(q.pagina-1)*q.limite,take:q.limite});return {items,total,pagina:q.pagina,limite:q.limite};}
 async detail(id:string){requireId(id);const item=await this.source.getRepository(Importacion).findOneBy({id});if(!item)throw new NotFoundException('Importación no encontrada.');
  const detalles=await this.source.getRepository(ImportacionDetalle).find({where:{importacion_id:id},order:{fila:'ASC'}});return {...item,detalles};}
}
