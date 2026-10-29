import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json } from 'express';
import { DatabaseFilter } from './common/database.filter';
export function configureApp(app:INestApplication) {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(json({limit:'3mb'}));
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  app.useGlobalFilters(new DatabaseFilter());
  app.enableShutdownHooks();
}
