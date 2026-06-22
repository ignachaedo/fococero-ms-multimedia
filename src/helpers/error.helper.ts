/**
 * @fileoverview Clase AppError para errores operativos de la API.
 * Permite adjuntar un código de estado HTTP al error para que
 * el errorHandler responda con el status code adecuado.
 */

/**
 * Error operativo personalizado con código de estado HTTP.
 * Distingue errores operativos esperados (isOperational = true)
 * de errores internos no controlados para logging selectivo.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational; 

        Error.captureStackTrace(this, this.constructor);
    }
}
