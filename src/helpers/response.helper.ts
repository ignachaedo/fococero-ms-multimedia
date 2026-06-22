/**
 * @fileoverview Helpers de respuesta HTTP estandarizada para ms-multimedia.
 * Proporciona funciones successResponse y errorResponse con tipos genéricos
 * para mantener consistencia en todas las respuestas de la API.
 */

import { Response } from 'express';

/**
 * Crea una respuesta de éxito estandarizada.
 * Solo incluye la propiedad 'data' si fue proporcionada.
 *
 * @param res - Objeto de respuesta Express
 * @param statusCode - Código de estado HTTP
 * @param message - Mensaje descriptivo
 * @param data - Datos opcionales a incluir en la respuesta
 * @returns Respuesta JSON con success: true
 */
export const successResponse = <T>(
    res: Response,
    statusCode: number,
    message: string,
    data?: T,
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        // Solo incluye la propiedad 'data' si fue proporcionada (no es undefined)
        ...(data !== undefined && { data }),
    });
};

/**
 * Crea una respuesta de error estandarizada.
 *
 * @param res - Objeto de respuesta Express
 * @param statusCode - Código de estado HTTP
 * @param errorMsg - Mensaje de error descriptivo
 * @param detalles - Detalles opcionales (errores de validación, etc.)
 * @returns Respuesta JSON con success: false
 */
export const errorResponse = <T>(
    res: Response,
    statusCode: number,
    errorMsg: string,
    detalles?: T,
) => {
    return res.status(statusCode).json({
        success: false,
        error: errorMsg,
        ...(detalles !== undefined && { detalles }),
    });
};
