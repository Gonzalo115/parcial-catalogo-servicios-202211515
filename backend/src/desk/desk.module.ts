import { Module, Controller, Get, Post, Patch, Param, Body, Query, Req, Res } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { AuthRequest } from '../auth/types';
import { DeskService } from './desk.service';
import type { Response } from 'express';
@Controller('desk')
@Roles('administrador', 'consulta')
class DeskController {
    constructor(private readonly desk: DeskService) { }
    @Get('bootstrap')
    bootstrap(
    @Req()
    r: AuthRequest) { return this.desk.bootstrap(r.user); }
    @Get('tickets')
    tickets(
    @Req()
    r: AuthRequest,
    @Query()
    q: any) { return this.desk.tickets(r.user, q); }
    @Post('tickets')
    create(
    @Req()
    r: AuthRequest,
    @Body()
    b: any) { return this.desk.create(r.user, b); }
    @Get('tickets/:id')
    ticket(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string) { return this.desk.detail(r.user, id); }
    @Patch('tickets/:id')
    edit(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.edit(r.user, id, b); }
    @Post('tickets/:id/accion')
    action(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.action(r.user, id, b); }
    @Post('tickets/:id/comentarios')
    comment(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.comment(r.user, id, b); }
    @Post('tickets/:id/adjuntos')
    upload(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.upload(r.user, id, b); }
    @Get('adjuntos/:id')
    async download(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Res()
    res: Response) { const a = await this.desk.download(r.user, id); res.setHeader('Content-Type', a.mime); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Disposition', `attachment; filename="${a.nombre.replace(/[^a-zA-Z0-9._-]/g, '_')}"`); res.send(a.contenido); }
    @Post('tickets/:id/relaciones')
    link(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.link(r.user, id, b); }
    @Get('colas')
    queues(
    @Req()
    r: AuthRequest) { return this.desk.queues(r.user); }
    @Post('colas')
    queue(
    @Req()
    r: AuthRequest,
    @Body()
    b: any) { return this.desk.saveQueue(r.user, b); }
    @Patch('colas/:id')
    queueEdit(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.saveQueue(r.user, b, id); }
    @Post('roles')
    roles(
    @Req()
    r: AuthRequest,
    @Body()
    b: any) { return this.desk.setRoles(r.user, b); }
    @Get('ci-opciones')
    ciOptions(@Req() r:AuthRequest,@Query() q:any){return this.desk.ciOptions(r.user,q);}
    @Get('ci')
    cis(
    @Req()
    r: AuthRequest,
    @Query()
    q: any) { return this.desk.cis(r.user, q); }
    @Post('ci')
    ci(
    @Req()
    r: AuthRequest,
    @Body()
    b: any) { return this.desk.saveCi(r.user, b); }
    @Patch('ci/:id')
    editCi(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.saveCi(r.user, b, id); }
    @Get('ci/:id')
    ciDetail(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string) { return this.desk.ciDetail(r.user, id); }
    @Post('ci/:id/relaciones')
    ciLink(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.ciLink(r.user, id, b); }
    @Post('clases')
    clase(
    @Req()
    r: AuthRequest,
    @Body()
    b: any) { return this.desk.clase(r.user, b); }
    @Patch('clases/:id')
    claseEdit(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.clase(r.user, b, id); }
    @Post('ubicaciones')
    location(
    @Req()
    r: AuthRequest,
    @Body()
    b: any) { return this.desk.location(r.user, b); }
    @Patch('ubicaciones/:id')
    locationEdit(
    @Req()
    r: AuthRequest,
    @Param('id')
    id: string,
    @Body()
    b: any) { return this.desk.location(r.user, b, id); }
    @Get('indicadores')
    dashboard(
    @Req()
    r: AuthRequest) { return this.desk.dashboard(r.user); }
    @Get('faq')
    faq() { return this.desk.faq(); }
    @Post('faq')
    saveFaq(
    @Req()
    r: AuthRequest,
    @Body()
    b: any) { return this.desk.saveFaq(r.user, b); }
}
@Module({ controllers: [DeskController], providers: [DeskService], exports: [DeskService] })
export class DeskModule {
}
