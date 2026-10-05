import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { required } from '../config';
import { DataSource } from 'typeorm';

export function createPool(): Pool {
  return new Pool({host:required('DB_HOST'), port:Number(process.env.DB_PORT || 5432),
    database:required('DB_NAME'), user:required('DB_USER'), password:required('DB_PASSWORD'),
    max:10, connectionTimeoutMillis:5000, idleTimeoutMillis:30000,
    options:'-c search_path=catalogo,public'});
}
@Injectable()
export class DbService implements OnModuleDestroy {
  constructor(private readonly source:DataSource) {}
  async query<T extends QueryResultRow = any>(sql: string, values: any[] = []): Promise<QueryResult<T>> {
    const runner=this.source.createQueryRunner();
    try {const result=await runner.query(sql,values,true);
      return {rows:result.records,rowCount:result.affected??result.records.length,command:'',oid:0,fields:[]};
    } finally {await runner.release();}
  }
  async onModuleDestroy() { if(this.source.isInitialized)await this.source.destroy(); }
}
