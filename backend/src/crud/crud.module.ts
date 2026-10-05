import { Module } from '@nestjs/common';
import { CrudService } from './crud.service';
import { CRUD_CONTROLLERS } from './crud.controllers';
@Module({providers:[CrudService],controllers:CRUD_CONTROLLERS,exports:[CrudService]})
export class CrudModule {}
