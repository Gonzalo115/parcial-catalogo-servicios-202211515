/** Consulta pura conserva lectura funcional. Un solicitante sin funciones operativas usa solo su portal. */
export function portalOnly(u: {rol?:string;roles?:string[]}|undefined): boolean {
 const roles=u?.roles||[];
 return !!u && u.rol!=='administrador' && roles.includes('solicitante') && !roles.some(r=>['agente','aprobador'].includes(r));
}
