import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { CrudService } from './crud.service';
import { RESOURCES, ResourceKey } from './resources';
function controller(key:ResourceKey) {
 @Controller(key)
 class ResourceController {
  constructor(private readonly service:CrudService){}
  @Get() list(@Query() query:any){return this.service.list(key,query);}
  @Get(':id') detail(@Param('id') id:string){return this.service.detail(key,id);}
  @Roles('administrador') @Post() create(@Body() body:any){return this.service.write(key,body);}
  @Roles('administrador') @Patch(':id') edit(@Param('id') id:string,@Body() body:any){return this.service.write(key,body,id);}
  @Roles('administrador') @Delete(':id') deactivate(@Param('id') id:string){return this.service.deactivate(key,id);}
 }
 if(key==='usuarios')Roles('administrador')(ResourceController);
 return ResourceController;
}
@Controller('servicios-nivel2')
export class ResponsableController {
 constructor(private readonly service:CrudService){}
 @Roles('administrador') @Put(':id/responsable') assign(@Param('id') id:string,@Body() input:any){return this.service.assign(id,input);}
 @Roles('administrador') @Delete(':id/responsable') unassign(@Param('id') id:string){return this.service.unassign(id);}
}
export const CRUD_CONTROLLERS=[...Object.keys(RESOURCES).map(key=>controller(key as ResourceKey)),ResponsableController];
