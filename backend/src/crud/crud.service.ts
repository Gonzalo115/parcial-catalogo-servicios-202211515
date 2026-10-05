import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { checkThresholds, dto, ListDto, requireId, ResponsableDto } from '../common/dto';
import { hashPassword } from '../auth/password';
import { Clase, Criticidad, ImportacionSnapshot, OpcionMapeo, Nivel1, Nivel2, Puesto, Responsable, Seccion, Tipo, Usuario } from '../db/entities';
import { RESOURCES, ResourceKey } from './resources';
const projection=(record:any)=>{const {password_hash,...safe}=record;return safe;};
@Injectable()
export class CrudService {
 constructor(private readonly source:DataSource){}
 async list(key:ResourceKey,input:any) {
  const q=await dto(ListDto,input);const spec:any=RESOURCES[key];
  const repo=this.source.getRepository(spec.entity);const qb=repo.createQueryBuilder('x');
  if(key==='servicios-nivel2')qb.leftJoinAndSelect('x.nivel1','nivel1').leftJoinAndSelect('x.clase','clase')
    .leftJoinAndSelect('x.criticidad','criticidad').leftJoinAndSelect('x.tipo','tipo')
    .leftJoinAndSelect('x.responsable','r').leftJoinAndSelect('r.seccion','seccion').leftJoinAndSelect('r.usuario','usuario');
  if(key==='usuarios')qb.leftJoinAndSelect('x.puesto','p');
  if(q.buscar){const cols=spec.fields.includes('codigo')?['x.codigo','x.nombre']:key==='usuarios'?['x.nombre','x.nombre_usuario','x.correo']:['x.nombre'];
   qb.andWhere('('+cols.map(c=>`${c} ILIKE :buscar`).join(' OR ')+')',{buscar:`%${q.buscar}%`});}
  if(q.activo)qb.andWhere(q.activo==='desconocido'?'x.activo IS NULL':'x.activo=:activo',{activo:q.activo==='true'});
  for(const [field,value]of Object.entries(q)){
   if(!field.endsWith('_id')||value===undefined)continue;
   let column=`x.${field}`;
   if(key==='usuarios'&&field==='seccion_id')column='p.seccion_id';
   else if(key==='servicios-nivel2'&&field==='seccion_id')column='r.seccion_id';
   else if(!spec.fields.includes(field))throw new BadRequestException(`Filtro no aplicable: ${field}`);
   requireId(String(value));qb.andWhere(`${column}=:${field}`,{[field]:value});
  }
  const [items,total]=await qb.orderBy('x.id','ASC').skip((q.pagina-1)*q.limite).take(q.limite).getManyAndCount();
  return {items:items.map(projection),total,pagina:q.pagina,limite:q.limite};
 }
 async detail(key:ResourceKey,id:string,manager=this.source.manager) {
  requireId(id);const spec:any=RESOURCES[key];
  const relations=key==='servicios-nivel2'?{nivel1:true,clase:true,criticidad:true,tipo:true,responsable:{seccion:true,usuario:true}}:
   key==='usuarios'?{puesto:{seccion:{departamento:{area:{empresa:true}}}}}:undefined;
  const item=await manager.getRepository(spec.entity).findOne({where:{id},relations} as any);
  if(!item)throw new NotFoundException('Registro no encontrado.');return projection(item);
 }
 async write(key:ResourceKey,input:any,id?:string) {
  const spec:any=RESOURCES[key];
  if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Se requiere un objeto JSON.');
  for(const field of Object.keys(input))if(!spec.fields.includes(field))throw new BadRequestException(`Campo no permitido: ${field}`);
  if(id)requireId(id);
  if(!id&&key==='usuarios'&&typeof input.password!=='string')throw new BadRequestException('Contraseña obligatoria al crear usuario.');
  if(!id&&key==='servicios-nivel2'&&!input.seccion_id)throw new BadRequestException('La sección es obligatoria al crear un servicio manualmente.');
  return this.source.transaction(async manager=>{
   await manager.query('SELECT pg_advisory_xact_lock(9021003)');
   const repo=manager.getRepository(spec.entity);
   const current=id?await repo.findOneBy({id}):null;
   if(id&&!current)throw new NotFoundException('Registro no encontrado.');
   const old:any=current||{};
   const merged:any={};for(const field of spec.fields)if(old[field]!==undefined)merged[field]=old[field];
   const existingAssignment=id&&key==='servicios-nivel2'?await manager.getRepository(Responsable).findOneBy({servicio_nivel2_id:id}):null;
   if(existingAssignment){merged.seccion_id=existingAssignment.seccion_id;merged.usuario_id=existingAssignment.usuario_id;}
   Object.assign(merged,input);
   const payload:any=await dto(id?spec.dto:(spec.createDto||spec.dto),merged);
   if(spec.parent){const[field,entity]=spec.parent;const parent=await manager.getRepository(entity).findOneBy({id:requireId(payload[field])});
    if(!parent)throw new BadRequestException('El padre indicado no existe.');
    if((!id||payload[field]!==old[field]||(payload.activo&&!old.activo))&&parent.activo!==true)throw new BadRequestException('El padre indicado está inactivo.');}
   if(key==='usuarios'){
    if(payload.password!==undefined){payload.password_hash=await hashPassword(payload.password);delete payload.password;}
    if(payload.correo===undefined&&!id)payload.correo=null;
   }
   if(key==='servicios-nivel1'||key==='servicios-nivel2'){
    const snapshot=id?await manager.getRepository(ImportacionSnapshot).findOneBy({entidad:key==='servicios-nivel1'?'nivel1':'nivel2',codigo:old.codigo}):null;
    if(snapshot&&payload.codigo!==old.codigo)throw new ConflictException('El código importado es su identidad; no se modifica por mantenimiento.');
    if(!id){payload.activo=payload.activo??null;payload.requiere_revision=payload.requiere_revision??false;}
   }
   if(key==='servicios-nivel2'){
    checkThresholds(payload.minimo,payload.maximo);
    for(const [field,entity]of [['nivel1_id',Nivel1],['clase_id',Clase],['criticidad_id',Criticidad],['tipo_id',Tipo]]as const){
     if(payload[field]==null){if(field==='nivel1_id')throw new BadRequestException('Nivel 1 obligatorio.');if(!id)payload[field]=null;continue;}
     const parent:any=await manager.getRepository(entity).findOneBy({id:requireId(payload[field])});
     if(!parent)throw new BadRequestException(`Referencia inexistente: ${field}`);
     if((!id||payload[field]!==old[field]||(payload.activo===true&&old.activo!==true))&&parent.activo===false)throw new BadRequestException(`Referencia inactiva: ${field}`);
    }
    for(const field of ['descripcion','metrica','minimo','maximo'])if(!id&&payload[field]===undefined)payload[field]=null;
    if(payload.usuario_id&&!payload.seccion_id)throw new BadRequestException('Usuario responsable requiere sección.');
    if(payload.seccion_id===null)throw new BadRequestException('Usa la operación específica para retirar una asignación.');
   }
   const optionFields:Record<string,string>={clases:'clase_id',criticidades:'criticidad_id',tipos:'tipo_id'};
   const optionField=optionFields[key];
   if(optionField){const alias=await manager.getRepository(OpcionMapeo).findOneBy({entidad:key as any,nombre_origen:payload.nombre});
    if(alias&&String((alias as any)[optionField])!==id)throw new ConflictException('Esta etiqueta es un alias reservado de otra opción.');}
   const seccion_id=key==='servicios-nivel2'?payload.seccion_id:undefined;
   const usuario_id=key==='servicios-nivel2'?payload.usuario_id:undefined;
   const attributes={...payload};if(key==='servicios-nivel2'){delete attributes.seccion_id;delete attributes.usuario_id;}
   const saved:any=await repo.save(repo.create({...old,...attributes}));
   if(optionField&&id&&old.nombre!==payload.nombre){
    await manager.getRepository(OpcionMapeo).save({entidad:key as any,nombre_origen:old.nombre,clase_id:null,criticidad_id:null,tipo_id:null,[optionField]:String(saved.id)});
   }
   if(key==='servicios-nivel2'&&seccion_id!==undefined){
    await this.saveResponsable(manager,String(saved.id),{seccion_id,usuario_id:usuario_id??null});
   }
   if(id&&(key==='servicios-nivel1'||key==='servicios-nivel2')&&Object.keys(input).some(f=>!['seccion_id','usuario_id'].includes(f))){
    await manager.getRepository(ImportacionSnapshot).update({entidad:key==='servicios-nivel1'?'nivel1':'nivel2',codigo:old.codigo},{editado_manualmente:true});
   }
   if(key==='usuarios'&&id&&(input.password!==undefined||input.activo===false)){
    await manager.query('UPDATE catalogo.sesion SET revocada_en=now() WHERE usuario_id=$1 AND revocada_en IS NULL',[id]);
   }
   return this.detail(key,String(saved.id),manager);
  });
 }
 async deactivate(key:ResourceKey,id:string){return this.write(key,{activo:false},id);}
 private async saveResponsable(manager:EntityManager,id:string,input:any){
  const value=await dto(ResponsableDto,input);
  const section=await manager.getRepository(Seccion).findOneBy({id:requireId(value.seccion_id)});
  if(!section||!section.activo)throw new BadRequestException('La sección no existe o está inactiva.');
  if(value.usuario_id){const user=await manager.getRepository(Usuario).findOneBy({id:requireId(value.usuario_id)});
   const puesto=user?await manager.getRepository(Puesto).findOneBy({id:user.puesto_id}):null;
   if(!user?.activo||!puesto?.activo||puesto.seccion_id!==section.id)throw new BadRequestException('El usuario debe estar activo y pertenecer a la sección responsable.');}
  return manager.getRepository(Responsable).save({servicio_nivel2_id:id,seccion_id:section.id,usuario_id:value.usuario_id??null});
 }
 async assign(id:string,input:any){
  requireId(id);return this.source.transaction(async m=>{await m.query('SELECT pg_advisory_xact_lock(9021003)');
   if(!await m.getRepository(Nivel2).findOneBy({id}))throw new NotFoundException('Servicio no encontrado.');
   await this.saveResponsable(m,id,input);return this.detail('servicios-nivel2',id,m);});
 }
 async unassign(id:string){
  requireId(id);return this.source.transaction(async m=>{await m.query('SELECT pg_advisory_xact_lock(9021003)');
   const n=await m.getRepository(Nivel2).findOneBy({id});if(!n)throw new NotFoundException('Servicio no encontrado.');
   if(n.activo!==false)throw new BadRequestException('Desactiva el servicio antes de retirar su responsable.');
   await m.getRepository(Responsable).delete({servicio_nivel2_id:id});return this.detail('servicios-nivel2',id,m);});
 }
}
