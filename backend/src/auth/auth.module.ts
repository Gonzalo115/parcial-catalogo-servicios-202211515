import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { audience, issuer, jwtSecret } from '../config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
@Module({
  imports:[UsersModule,JwtModule.registerAsync({useFactory:()=>({secret:jwtSecret(),
    signOptions:{algorithm:'HS256',expiresIn:900,issuer:issuer(),audience:audience()}})})],
  controllers:[AuthController],
  providers:[AuthService,
    {provide:APP_GUARD,useClass:JwtAuthGuard},
    {provide:APP_GUARD,useClass:RolesGuard}]
})
export class AuthModule {}
