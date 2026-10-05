import * as E from '../db/entities';
import * as D from '../common/dto';
export const RESOURCES={
 empresas:{entity:E.Empresa,dto:D.EmpresaDto,fields:['codigo','nombre','activo']},
 areas:{entity:E.Area,dto:D.AreaDto,fields:['codigo','nombre','activo','empresa_id'],parent:['empresa_id',E.Empresa]},
 departamentos:{entity:E.Departamento,dto:D.DepartamentoDto,fields:['codigo','nombre','activo','area_id'],parent:['area_id',E.Area]},
 secciones:{entity:E.Seccion,dto:D.SeccionDto,fields:['codigo','nombre','activo','departamento_id'],parent:['departamento_id',E.Departamento]},
 puestos:{entity:E.Puesto,dto:D.PuestoDto,fields:['codigo','nombre','activo','seccion_id'],parent:['seccion_id',E.Seccion]},
 usuarios:{entity:E.Usuario,dto:D.UserDto,createDto:D.CreateUserDto,fields:['puesto_id','nombre','nombre_usuario','correo','rol','activo','password'],parent:['puesto_id',E.Puesto]},
 clases:{entity:E.Clase,dto:D.OptionDto,fields:['nombre','activo']},
 criticidades:{entity:E.Criticidad,dto:D.OptionDto,fields:['nombre','activo']},
 tipos:{entity:E.Tipo,dto:D.OptionDto,fields:['nombre','activo']},
 'servicios-nivel1':{entity:E.Nivel1,dto:D.Nivel1Dto,fields:['codigo','nombre','activo','requiere_revision']},
 'servicios-nivel2':{entity:E.Nivel2,dto:D.Nivel2Dto,createDto:D.CreateNivel2Dto,
  fields:['codigo','nombre','activo','requiere_revision','nivel1_id','clase_id','criticidad_id','tipo_id','descripcion','metrica','minimo','maximo','seccion_id','usuario_id']}
} as const;
export type ResourceKey=keyof typeof RESOURCES;
