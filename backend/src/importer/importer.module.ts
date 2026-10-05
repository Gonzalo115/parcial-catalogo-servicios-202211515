import { Controller, Get, Module, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { ImporterService } from './importer.service';
@Controller('importaciones') @Roles('administrador')
class ImporterController {
 constructor(private readonly importer:ImporterService){}
 @Post() run(){return this.importer.run();}
 @Get() list(@Query() q:any){return this.importer.list(q);}
 @Get(':id') detail(@Param('id') id:string){return this.importer.detail(id);}
}
@Module({providers:[ImporterService],controllers:[ImporterController],exports:[ImporterService]})
export class ImporterModule {}
