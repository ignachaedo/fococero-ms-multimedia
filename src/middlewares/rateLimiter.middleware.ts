/**
 * @fileoverview Middleware de rate limiting para subida de archivos.
 * Limita a 5 subidas por minuto para prevenir abuso del servicio de almacenamiento.
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter específico para el endpoint de subida de imágenes.
 * Permite máximo 5 peticiones por minuto por IP.
 */
export const uploadRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 5,
    message: {
        error: 'Demasiadas imágenes subidas. Por favor, espera un minuto antes de intentar nuevamente.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
