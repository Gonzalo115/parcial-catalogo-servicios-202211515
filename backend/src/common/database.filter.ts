import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
@Catch(QueryFailedError)
export class DatabaseFilter implements ExceptionFilter {
 catch(error:QueryFailedError,host:ArgumentsHost) {
  const e=error.driverError as unknown as {code:string;message:string};
  const errors:Record<string,[number,string]>={
   '23505':[409,'El código, nombre o identificador de acceso ya existe.'],
   '23503':[400,'La referencia no existe o hay registros dependientes.'],
   '23502':[400,'Falta un campo obligatorio.'],
   '23514':[400,e.message.startsWith('new row')?'Datos inválidos: revisa campos y umbrales.':e.message],
   '22P02':[400,'Formato de identificador o valor inválido.'],
   '22003':[400,'Valor fuera de rango.']};
  const [status,message]=errors[e.code]||[500,'No se pudo completar la operación de base de datos.'];
  host.switchToHttp().getResponse().status(status).json({statusCode:status,message});
 }
}
