/**
 * @fileoverview Middleware de subida de archivos usando Multer.
 * Almacena los archivos en memoria RAM para procesamiento posterior con Sharp.
 * Filtra solo formatos de imagen permitidos (JPEG, PNG, WebP).
 */

import multer from 'multer';
import { Request } from 'express';

/** Almacenamiento en memoria RAM para procesar con Sharp */
const storage = multer.memoryStorage();

/** Filtro que solo permite imágenes JPEG, PNG y WebP */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no soportado. Solo se permiten JPG, PNG y WEBP.'));
    }
};

/**
 * Middleware Multer configurado con límite de 10MB y 1 archivo por petición.
 */
export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
});
