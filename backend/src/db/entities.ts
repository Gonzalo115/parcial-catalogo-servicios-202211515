import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, ManyToOne, OneToOne, JoinColumn, Index, Check, Relation } from 'typeorm';

const bigint = { to:(v:any)=>v, from:(v:any)=>v==null?null:String(v) };
export abstract class Identified {
 @PrimaryGeneratedColumn('identity',{type:'bigint',generatedIdentity:'ALWAYS',transformer:bigint} as any) id!:string;
}
export abstract class Unit extends Identified {
 @Column({type:'varchar',length:50}) codigo!:string;
 @Column({type:'text'}) nombre!:string;
 @Column({type:'boolean'}) activo!:boolean;
}

@Entity({schema:'catalogo',name:'empresa'})
@Index(['codigo'],{unique:true})
export class Empresa extends Unit {
}

@Entity({schema:'catalogo',name:'area'})
@Index(['empresa_id','codigo'],{unique:true})
export class Area extends Unit {
 @Column({type:'bigint',transformer:bigint}) empresa_id!:string;
 @ManyToOne(()=>Empresa,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'empresa_id'}) empresa!:Relation<Empresa>;
}

@Entity({schema:'catalogo',name:'departamento'})
@Index(['area_id','codigo'],{unique:true})
export class Departamento extends Unit {
 @Column({type:'bigint',transformer:bigint}) area_id!:string;
 @ManyToOne(()=>Area,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'area_id'}) area!:Relation<Area>;
}

@Entity({schema:'catalogo',name:'seccion'})
@Index(['departamento_id','codigo'],{unique:true})
export class Seccion extends Unit {
 @Column({type:'bigint',transformer:bigint}) departamento_id!:string;
 @ManyToOne(()=>Departamento,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'departamento_id'}) departamento!:Relation<Departamento>;
}

@Entity({schema:'catalogo',name:'puesto'})
@Index(['seccion_id','codigo'],{unique:true})
export class Puesto extends Unit {
 @Column({type:'bigint',transformer:bigint}) seccion_id!:string;
 @ManyToOne(()=>Seccion,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'seccion_id'}) seccion!:Relation<Seccion>;
}

@Entity({schema:'catalogo',name:'usuario'})
export class Usuario extends Identified {
 @Column({type:'bigint',transformer:bigint}) puesto_id!:string;
 @ManyToOne(()=>Puesto,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'puesto_id'}) puesto!:Relation<Puesto>;
 @Column({type:'text'}) nombre!:string;
 @Column({type:'varchar',length:100}) nombre_usuario!:string;
 @Column({type:'text',nullable:true}) correo!:string|null;
 @Column({type:'text',select:false}) password_hash!:string;
 @Column({type:'varchar',length:20}) rol!:'administrador'|'consulta';
 @Column({type:'boolean'}) activo!:boolean;
}
@Entity({schema:'catalogo',name:'sesion'})
export class Sesion {
 @PrimaryColumn({type:'uuid'}) id!:string;
 @Column({type:'bigint',transformer:bigint}) usuario_id!:string;
 @ManyToOne(()=>Usuario,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'usuario_id'}) usuario!:Relation<Usuario>;
 @Column({type:'timestamptz',default:()=> 'now()'}) creada_en!:Date;
 @Column({type:'timestamptz'}) expira_en!:Date;
 @Column({type:'timestamptz',nullable:true}) revocada_en!:Date|null;
}
export abstract class Option extends Identified {
 @Column({type:'text',unique:true}) nombre!:string;
 @Column({type:'boolean'}) activo!:boolean;
}
@Entity({schema:'catalogo',name:'clase_servicio'}) export class Clase extends Option {}
@Entity({schema:'catalogo',name:'criticidad'}) export class Criticidad extends Option {}
@Entity({schema:'catalogo',name:'tipo_servicio'}) export class Tipo extends Option {}
export abstract class Service extends Identified {
 @Column({type:'varchar',length:20,unique:true}) codigo!:string;
 @Column({type:'text'}) nombre!:string;
 @Column({type:'boolean',nullable:true}) activo!:boolean|null;
 @Column({type:'boolean'}) requiere_revision!:boolean;
}
@Entity({schema:'catalogo',name:'servicio_nivel1'})
export class Nivel1 extends Service {}
@Entity({schema:'catalogo',name:'servicio_nivel2'})
@Check('umbrales_validos','minimo IS NULL OR maximo IS NULL OR minimo <= maximo')
export class Nivel2 extends Service {
 @Column({type:'bigint',transformer:bigint}) nivel1_id!:string;
 @ManyToOne(()=>Nivel1,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'nivel1_id'}) nivel1!:Relation<Nivel1>;
 @Column({type:'bigint',nullable:true,transformer:bigint}) clase_id!:string|null;
 @ManyToOne(()=>Clase,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'clase_id'}) clase!:Relation<Clase>|null;
 @Column({type:'bigint',nullable:true,transformer:bigint}) criticidad_id!:string|null;
 @ManyToOne(()=>Criticidad,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'criticidad_id'}) criticidad!:Relation<Criticidad>|null;
 @Column({type:'bigint',nullable:true,transformer:bigint}) tipo_id!:string|null;
 @ManyToOne(()=>Tipo,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'tipo_id'}) tipo!:Relation<Tipo>|null;
 @Column({type:'text',nullable:true}) descripcion!:string|null;
 @Column({type:'text',nullable:true}) metrica!:string|null;
 @Column({type:'numeric',nullable:true}) minimo!:string|null;
 @Column({type:'numeric',nullable:true}) maximo!:string|null;
 @OneToOne(()=>Responsable,r=>r.servicio) responsable!:Relation<Responsable>|null;
}
@Entity({schema:'catalogo',name:'servicio_responsable'})
export class Responsable {
 @PrimaryColumn({type:'bigint',transformer:bigint}) servicio_nivel2_id!:string;
 @OneToOne(()=>Nivel2,n=>n.responsable,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'servicio_nivel2_id'}) servicio!:Relation<Nivel2>;
 @Column({type:'bigint',transformer:bigint}) seccion_id!:string;
 @ManyToOne(()=>Seccion,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'seccion_id'}) seccion!:Relation<Seccion>;
 @Column({type:'bigint',nullable:true,transformer:bigint}) usuario_id!:string|null;
 @ManyToOne(()=>Usuario,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'usuario_id'}) usuario!:Relation<Usuario>|null;
}
@Entity({schema:'catalogo',name:'importacion'})
export class Importacion extends Identified {
 @Column({type:'text'}) archivo_nombre!:string;
 @Column({type:'char',length:64}) archivo_sha256!:string;
 @Column({type:'timestamptz',default:()=> 'now()'}) fecha!:Date;
 @Column({type:'varchar',length:50}) version_reglas!:string;
 @Column({type:'varchar',length:20}) estado!:string;
 @Column({type:'jsonb'}) resumen!:any;
}
@Entity({schema:'catalogo',name:'importacion_detalle'})
export class ImportacionDetalle extends Identified {
 @Column({type:'bigint',transformer:bigint}) importacion_id!:string;
 @ManyToOne(()=>Importacion,{nullable:false,onDelete:'RESTRICT'}) @JoinColumn({name:'importacion_id'}) importacion!:Relation<Importacion>;
 @Column({type:'text'}) hoja!:string;
 @Column({type:'integer'}) fila!:number;
 @Column({type:'bigint',nullable:true,transformer:bigint}) nivel1_id!:string|null;
 @ManyToOne(()=>Nivel1,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'nivel1_id'}) nivel1!:Relation<Nivel1>|null;
 @Column({type:'bigint',nullable:true,transformer:bigint}) nivel2_id!:string|null;
 @ManyToOne(()=>Nivel2,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'nivel2_id'}) nivel2!:Relation<Nivel2>|null;
 @Column({type:'jsonb'}) datos_originales!:any;
 @Column({type:'jsonb'}) datos_resueltos!:any;
 @Column({type:'jsonb'}) origen_celdas!:any;
 @Column({type:'varchar',length:20}) resultado!:string;
 @Column({type:'jsonb'}) observaciones!:any;
}
@Entity({schema:'catalogo',name:'importacion_snapshot'})
export class ImportacionSnapshot {
 @PrimaryColumn({type:'varchar',length:20}) entidad!:'nivel1'|'nivel2';
 @PrimaryColumn({type:'varchar',length:20}) codigo!:string;
 @Column({type:'jsonb'}) payload!:any;
 @Column({type:'boolean',default:false}) editado_manualmente!:boolean;
}
@Entity({schema:'catalogo',name:'opcion_mapeo'})
export class OpcionMapeo {
 @PrimaryColumn({type:'varchar',length:20}) entidad!:'clases'|'criticidades'|'tipos';
 @PrimaryColumn({type:'text'}) nombre_origen!:string;
 @Column({type:'bigint',nullable:true,transformer:bigint}) clase_id!:string|null;
 @ManyToOne(()=>Clase,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'clase_id'}) clase!:Relation<Clase>|null;
 @Column({type:'bigint',nullable:true,transformer:bigint}) criticidad_id!:string|null;
 @ManyToOne(()=>Criticidad,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'criticidad_id'}) criticidad!:Relation<Criticidad>|null;
 @Column({type:'bigint',nullable:true,transformer:bigint}) tipo_id!:string|null;
 @ManyToOne(()=>Tipo,{nullable:true,onDelete:'RESTRICT'}) @JoinColumn({name:'tipo_id'}) tipo!:Relation<Tipo>|null;
 @Column({type:'timestamptz',default:()=> 'now()'}) fecha!:Date;
}
export const ENTITIES=[Empresa,Area,Departamento,Seccion,Puesto,Usuario,Sesion,Clase,Criticidad,Tipo,Nivel1,Nivel2,Responsable,Importacion,ImportacionDetalle,ImportacionSnapshot,OpcionMapeo];
