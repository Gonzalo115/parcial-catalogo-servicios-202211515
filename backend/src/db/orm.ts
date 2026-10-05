import { DataSource, DataSourceOptions } from 'typeorm';
import { required } from '../config';
import { ENTITIES } from './entities';
export function ormOptions():DataSourceOptions {
 return {type:'postgres',host:required('DB_HOST'),port:Number(process.env.DB_PORT || 5432),
  database:required('DB_NAME'),username:required('DB_USER'),password:required('DB_PASSWORD'),
  schema:'catalogo',entities:ENTITIES,synchronize:false,logging:false,
  invalidWhereValuesBehavior:{null:'throw',undefined:'throw'},
  extra:{options:'-c search_path=catalogo,public',max:10,connectionTimeoutMillis:5000}};
}
export async function createOrm(){return new DataSource(ormOptions()).initialize();}
