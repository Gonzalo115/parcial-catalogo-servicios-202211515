import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';
import { DataSource } from 'typeorm';
import { createOrm } from './orm';
@Global()
@Module({providers:[{provide:DataSource,useFactory:createOrm},DbService], exports:[DataSource,DbService]})
export class DbModule {}
