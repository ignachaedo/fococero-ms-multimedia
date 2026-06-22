/**
 * @fileoverview Controlador de subida, vinculación y limpieza de archivos multimedia.
 * Gestiona el ciclo de vida completo de imágenes: subida huérfana, vinculación
 * a reportes/alertas, eliminación lógica y limpieza de archivos huérfanos.
 */

import { Request, Response, NextFunction } from 'express';
import { MultimediaService } from '../services/multimedia.service';
import { ArchivoRepository } from '../repositories/archivo.repository';
import { ContextoMultimedia } from '../models/archivo.model';
import { bucket } from '../config/firebase';

// Helpers importados
import { successResponse } from '../helpers/response.helper';
import { AppError } from '../helpers/error.helper';
import { logger } from '../config/logger';

export class MultimediaController {
    /**
     * Sube un archivo multimedia (nace huérfano, sin vincular).
     *
     * @description Procesa la imagen con Sharp, la sube a Firebase Storage,
     * y registra el metadato en la base de datos. El archivo nace sin vínculo
     * a reporte o alerta (huérfano) hasta que se vincule posteriormente.
     *
     * @param req - Request con file (multipart) y body.contexto
     * @param res - Response 201 con datos del archivo creado
     * @param next - NextFunction para pasar errores
     */
    static async subirArchivo(req: Request, res: Response, next: NextFunction) {
        try {
            const file = req.file;
            const userId = req.user?.id;
            const contextoStr = req.body.contexto as string;

            if (!file) throw new AppError('No se proporcionó ningún archivo.', 400);
            if (!userId) throw new AppError('Usuario no identificado.', 401);

            const contextoValido = Object.values(ContextoMultimedia).includes(
                contextoStr as ContextoMultimedia,
            )
                ? (contextoStr as ContextoMultimedia)
                : ContextoMultimedia.REPORTE;

            const url_publica = await MultimediaService.procesarYSubirImagen(
                file.buffer,
                contextoValido,
            );

            const archivoDB = await ArchivoRepository.crear({
                url_publica,
                formato: 'image/webp',
                peso_bytes: file.size,
                id_usuario: userId,
                contexto: contextoValido,
                metadata: {
                    nombreOriginal: file.originalname,
                    mimeOriginal: file.mimetype,
                },
            });

            return successResponse(res, 201, 'Archivo procesado y subido con éxito.', archivoDB);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Vincula un archivo huérfano a una entidad (reporte o alerta).
     *
     * @description Endpoint llamado internamente por ms-reportes o ms-alertas
     * para adoptar un archivo previamente subido y asociarlo a un reporte/alerta.
     *
     * @param req - Request con params.id del archivo a vincular
     * @param res - Response 200 con datos del archivo vinculado
     * @param next - NextFunction para pasar errores
     */
    static async vincularArchivo(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const archivoVinculado = await ArchivoRepository.vincularEntidad(id);

            if (!archivoVinculado) throw new AppError('Archivo no encontrado o eliminado.', 404);

            return successResponse(res, 200, 'Archivo vinculado exitosamente.', archivoVinculado);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Elimina lógicamente (soft delete) un archivo multimedia.
     *
     * @param req - Request con params.id del archivo a eliminar
     * @param res - Response 200 con mensaje de confirmación
     * @param next - NextFunction para pasar errores
     */
    static async eliminarArchivo(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const eliminado = await ArchivoRepository.eliminarLogico(id);

            if (!eliminado) throw new AppError('Archivo no encontrado o ya estaba eliminado.', 404);

            return successResponse(res, 200, 'Archivo eliminado lógicamente.');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Limpia archivos huérfanos (no vinculados) después de 24 horas.
     *
     * @description Busca archivos huérfanos expirados, elimina el archivo físico
     * de Firebase Storage y marca el registro como eliminado lógicamente.
     * Endpoint interno llamado por un job programado.
     *
     * @param req - Request (no requiere parámetros adicionales)
     * @param res - Response con resumen de la limpieza
     * @param next - NextFunction para pasar errores
     */
    static async limpiarHuerfanos(req: Request, res: Response, next: NextFunction) {
        try {
            const HORAS_EXPIRACION = 24;
            const huerfanos = await ArchivoRepository.obtenerHuerfanosExpirados(HORAS_EXPIRACION);

            if (huerfanos.length === 0) {
                return successResponse(res, 200, 'No hay archivos huérfanos para limpiar.');
            }

            let borradosFisicos = 0;

            for (const archivo of huerfanos) {
                try {
                    const urlParts = archivo.url_publica.split(`${bucket.name}/`);
                    if (urlParts.length === 2) {
                        const filePath = urlParts[1];
                        await bucket.file(filePath).delete({ ignoreNotFound: true });
                        borradosFisicos++;
                    }
                    await ArchivoRepository.eliminarLogico(archivo.id);
                } catch (err) {
                    logger.error(`Error limpiando archivo físico ${archivo.id}:`, err);
                }
            }

            return successResponse(res, 200, 'Proceso de limpieza finalizado.', {
                huerfanos_encontrados: huerfanos.length,
                eliminados_firebase: borradosFisicos,
            });
        } catch (error) {
            next(error);
        }
    }
}
