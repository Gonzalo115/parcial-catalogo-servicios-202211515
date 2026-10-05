import { BadRequestException } from '@nestjs/common';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, Validate, ValidateIf, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, validate } from 'class-validator';
import Decimal from 'decimal.js';

const trimmed=()=>Transform(({value})=>typeof value==='string'?value.trim():value);
const id=()=>Matches(/^[1-9]\d{0,18}$/, {message:'El identificador debe ser texto numérico positivo.'});
const decimal=()=>Transform(({value})=>typeof value==='number'?String(value):value);
export function checkThresholds(minimo:string|null|undefined,maximo:string|null|undefined) {
 if(minimo!=null&&maximo!=null&&new Decimal(minimo).gt(new Decimal(maximo))) {
  throw new BadRequestException('El mínimo debe ser menor o igual que el máximo.');
 }
}
@ValidatorConstraint({name:'umbralesOrdenados',async:false})
export class ThresholdOrder implements ValidatorConstraintInterface {
 validate(value:any,args:ValidationArguments) {
  const min=(args.object as {minimo?:string|null}).minimo;
  if(value==null||min==null)return true;
  try{return new Decimal(min).lte(value);}catch{return false;}
 }
 defaultMessage(){return 'El mínimo debe ser menor o igual que el máximo.';}
}
export class UnitDto {
 @trimmed() @IsString() @Length(1,50) codigo!:string;
 @trimmed() @IsString() @Length(1,300) nombre!:string;
 @IsBoolean() activo!:boolean;
}
export class EmpresaDto extends UnitDto {}
export class AreaDto extends UnitDto {@IsString() @id() empresa_id!:string;}
export class DepartamentoDto extends UnitDto {@IsString() @id() area_id!:string;}
export class SeccionDto extends UnitDto {@IsString() @id() departamento_id!:string;}
export class PuestoDto extends UnitDto {@IsString() @id() seccion_id!:string;}
export class UserDto {
 @IsString() @id() puesto_id!:string;
 @trimmed() @IsString() @Length(1,300) nombre!:string;
 @Transform(({value})=>typeof value==='string'?value.trim().toLowerCase():value)
 @IsString() @Length(1,100) @Matches(/^[a-z0-9_.-]+$/) nombre_usuario!:string;
 @Transform(({value})=>typeof value==='string'?value.trim().toLowerCase():value)
 @IsOptional() @IsEmail() correo?:string|null;
 @IsIn(['administrador','consulta']) rol!:'administrador'|'consulta';
 @IsBoolean() activo!:boolean;
 @ValidateIf((_o,v)=>v!==undefined) @IsString() @Length(12,72) password?:string;
}
export class CreateUserDto extends UserDto {}
export class OptionDto {
 @trimmed() @IsString() @Length(1,300) nombre!:string;
 @IsBoolean() activo!:boolean;
}
export class Nivel1Dto {
 @trimmed() @IsString() @Length(1,20) codigo!:string;
 @trimmed() @IsString() @Length(1,300) nombre!:string;
 @IsOptional() @IsBoolean() activo?:boolean|null;
 @IsOptional() @IsBoolean() requiere_revision?:boolean;
}
export class Nivel2Dto extends Nivel1Dto {
 @IsString() @id() nivel1_id!:string;
 @IsOptional() @IsString() @id() clase_id?:string|null;
 @IsOptional() @IsString() @id() criticidad_id?:string|null;
 @IsOptional() @IsString() @id() tipo_id?:string|null;
 @IsOptional() @IsString() @MaxLength(10000) descripcion?:string|null;
 @IsOptional() @IsString() @MaxLength(300) metrica?:string|null;
 @decimal() @IsOptional() @IsString() @MaxLength(100) @Matches(/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i) minimo?:string|null;
 @decimal() @IsOptional() @IsString() @MaxLength(100) @Matches(/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i) @Validate(ThresholdOrder) maximo?:string|null;
 @IsOptional() @IsString() @id() seccion_id?:string|null;
 @IsOptional() @IsString() @id() usuario_id?:string|null;
}
export class CreateNivel2Dto extends Nivel2Dto {}
export class ResponsableDto {
 @IsString() @id() seccion_id!:string;
 @IsOptional() @IsString() @id() usuario_id?:string|null;
}
export class ListDto {
 @IsOptional() @IsString() @MaxLength(200) buscar?:string;
 @Type(()=>Number) @IsOptional() @IsInt() @Min(1) pagina=1;
 @Type(()=>Number) @IsOptional() @IsInt() @Min(1) @Max(100) limite=20;
 @IsOptional() @IsIn(['true','false','desconocido']) activo?:string;
 @IsOptional() @IsString() @id() empresa_id?:string;
 @IsOptional() @IsString() @id() area_id?:string;
 @IsOptional() @IsString() @id() departamento_id?:string;
 @IsOptional() @IsString() @id() seccion_id?:string;
 @IsOptional() @IsString() @id() puesto_id?:string;
 @IsOptional() @IsString() @id() nivel1_id?:string;
 @IsOptional() @IsString() @id() clase_id?:string;
 @IsOptional() @IsString() @id() criticidad_id?:string;
 @IsOptional() @IsString() @id() tipo_id?:string;
}
export async function dto<T extends object>(type:new()=>T,input:any):Promise<T> {
 if(input===null||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Se requiere un objeto JSON.');
 const value=plainToInstance(type,input);
 const errors=await validate(value,{whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true});
 if(errors.length)throw new BadRequestException(errors.flatMap(e=>Object.values(e.constraints||{})));
 return value;
}
export function requireId(value:string){if(!/^[1-9]\d{0,18}$/.test(value)||BigInt(value)>9223372036854775807n)throw new BadRequestException('Identificador inválido.');return value;}
