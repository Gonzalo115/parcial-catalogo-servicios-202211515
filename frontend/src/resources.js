const text=(key,label=key)=>({key,label,type:'text'});
const ref=(key,label,source,required=true)=>({key,label,type:'ref',source,required});
const state={key:'activo',label:'Estado',type:'boolean'};
const unit=[text('codigo','Código'),text('nombre','Nombre'),state];
const option=[text('nombre','Nombre'),state];
const service=[text('codigo','Código'),text('nombre','Nombre'),{...state,nullable:true},{key:'requiere_revision',label:'Requiere revisión',type:'boolean'}];
export const resources={
 'servicios-nivel2':{label:'Servicios Nivel 2',fields:[...service,ref('nivel1_id','Servicio Nivel 1','servicios-nivel1'),ref('clase_id','Clase','clases',false),ref('criticidad_id','Criticidad','criticidades',false),ref('tipo_id','Tipo','tipos',false),{...text('descripcion','Descripción'),type:'textarea',nullable:true},{...text('metrica','Métrica'),nullable:true},{...text('minimo','Mínimo'),nullable:true},{...text('maximo','Máximo'),nullable:true},ref('seccion_id','Sección responsable','secciones',false),ref('usuario_id','Usuario responsable','usuarios',false)]},
 'servicios-nivel1':{label:'Servicios Nivel 1',fields:service},
 empresas:{label:'Empresas',fields:unit},areas:{label:'Áreas',fields:[...unit,ref('empresa_id','Empresa','empresas')]},departamentos:{label:'Departamentos',fields:[...unit,ref('area_id','Área','areas')]},secciones:{label:'Secciones',fields:[...unit,ref('departamento_id','Departamento','departamentos')]},puestos:{label:'Puestos',fields:[...unit,ref('seccion_id','Sección','secciones')]},
 usuarios:{label:'Usuarios',admin:true,fields:[text('nombre','Nombre'),text('nombre_usuario','Usuario'),{...text('correo','Correo'),type:'email',nullable:true},ref('puesto_id','Puesto','puestos'),{key:'rol',label:'Rol',type:'role'},state,{key:'password',label:'Contraseña (mínimo 12 caracteres)',type:'password'}]},
 clases:{label:'Clases',fields:option},criticidades:{label:'Criticidades',fields:option},tipos:{label:'Tipos',fields:option}
};
