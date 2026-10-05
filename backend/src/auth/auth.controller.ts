import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { Public, Roles } from './decorators';
import type { AuthRequest } from './types';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth:AuthService) {}
  @Public() @Post('login') @HttpCode(200)
  login(@Body() body:LoginDto) {return this.auth.login(body.identifier,body.password);}
  @Get('me') me(@Req() request:AuthRequest) {return request.user;}
  @Roles('administrador','consulta') @Post('logout') @HttpCode(204)
  logout(@Req() request:AuthRequest) {return this.auth.logout(request.sessionId);}
}
