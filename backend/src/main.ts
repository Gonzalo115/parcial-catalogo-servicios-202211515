import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
async function main() {
  const app=await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(Number(process.env.PORT || 3000),'0.0.0.0');
}
main().catch(()=>{console.error('No se pudo iniciar el backend. Revisa configuración y disponibilidad de DB.');process.exit(1);});
