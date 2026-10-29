// Reglas propias del proyecto; los rótulos E/I se mapean a las diapositivas.
export const FLOWS: Record<string, string[]> = {
    nuevos: ['registrado', 'analisis', 'aprobado', 'implementacion', 'resuelto', 'cerrado'],
    cambios: ['registrado', 'evaluacion', 'aprobado', 'planificacion', 'ejecucion', 'validacion', 'resuelto', 'cerrado'],
    incidentes: ['registrado', 'clasificacion', 'diagnostico', 'atencion', 'recuperacion', 'resuelto', 'cerrado'],
    eventos: ['registrado', 'clasificacion', 'evaluacion', 'respuesta', 'resuelto', 'cerrado'],
    problemas: ['registrado', 'investigacion', 'causa_raiz', 'solucion_temporal', 'solucion_definitiva', 'resuelto', 'cerrado'],
    accesos: ['registrado', 'validacion_solicitud', 'aprobado', 'provision', 'validacion', 'resuelto', 'cerrado'],
    servicios: ['registrado', 'validacion', 'asignacion', 'cumplimiento', 'confirmacion', 'resuelto', 'cerrado']
};
export const INCIDENTS = [
    { categoria: 'I0', rotulo: 'No causa interrupción', prioridad: 3, redundancia: true },
    { categoria: 'I1', rotulo: '3 horas o menos (incluye degradaciones)', prioridad: 2, redundancia: false },
    { categoria: 'I2', rotulo: '8 horas o menos (incluye degradaciones)', prioridad: 2, redundancia: false },
    { categoria: 'I3', rotulo: '2 días o menos', prioridad: 1, redundancia: false },
    { categoria: 'I4', rotulo: '1 semana o menos', prioridad: 1, redundancia: false },
    { categoria: 'I5', rotulo: '1 mes o más', prioridad: 1, redundancia: false },
    { categoria: 'I6', rotulo: 'Afecta seguridad de recursos/información', prioridad: 1, redundancia: false }
];
export function incidentCategory(hours: number, security = false) {
    if (security)
        return 'I6';
    if (hours === 0)
        return 'I0';
    if (hours <= 3)
        return 'I1';
    if (hours <= 8)
        return 'I2';
    if (hours <= 48)
        return 'I3';
    if (hours <= 168)
        return 'I4';
    return 'I5';
}
export const SUPPORT = ['Autoservicio', 'Help Desk', 'Soporte Técnico', 'Ingenieros', 'Externo'];
