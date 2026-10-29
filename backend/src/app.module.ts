import { DeskModule } from './desk/desk.module';
import { Controller, Get, HttpCode, Module, Post, ServiceUnavailableException } from '@nestjs/common';
import { CrudModule } from './crud/crud.module';
import { ImporterModule } from './importer/importer.module';
import { DataSource } from 'typeorm';
import { OpcionMapeo } from './db/entities';
import { AuthModule } from './auth/auth.module';
import { Public, Roles } from './auth/decorators';
import { DbModule } from './db/db.module';
import { DbService } from './db/db.service';
@Controller()
class BaseController {
  constructor(private readonly db:DbService,private readonly source:DataSource) {}
  @Public() @Get('health') async health() {
    const result=await this.db.query('SELECT 1 FROM schema_migration WHERE version=$1',['002']);
    if(!result.rows.length)throw new ServiceUnavailableException('Esquema no inicializado');
    return {status:'ok'};
  }
  @Roles('administrador') @Get('catalog/mapeos') mapeos(){return this.source.getRepository(OpcionMapeo).find({relations:{clase:true,criticidad:true,tipo:true},order:{entidad:'ASC',nombre_origen:'ASC'}});}
  @Get('catalog/status') async status() {
    const {rows}=await this.db.query(`SELECT (SELECT count(*)::int FROM servicio_nivel1) AS nivel1,
      (SELECT count(*)::int FROM servicio_nivel2) AS nivel2`);
    return rows[0];
  }
  @Roles('administrador') @Post('admin/check') @HttpCode(204)
  adminCheck() {} // Control de autorización; no sustituye el mantenimiento funcional.
}
@Module({imports:[DbModule,AuthModule,CrudModule,ImporterModule,DeskModule],controllers:[BaseController]})
export class AppModule {}
