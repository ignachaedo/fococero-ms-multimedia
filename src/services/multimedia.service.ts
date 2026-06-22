/**
 * @fileoverview Servicio de procesamiento y almacenamiento de imágenes.
 * Utiliza Sharp para optimizar imágenes (redimensión, conversión a WebP)
 * y las sube a Firebase Storage con cache público de 1 año.
 */

import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { bucket } from '../config/firebase';
import { ContextoMultimedia } from '../models/archivo.model';
import { logger } from '../config/logger';

export class MultimediaService {
    /**
     * Procesa y sube una imagen a Firebase Storage.
     *
     * @description Redimensiona la imagen a máximo 1280px de ancho,
     * la convierte a WebP con calidad 80, genera un nombre único UUID
     * y la sube a la carpeta correspondiente según el contexto.
     *
     * @param fileBuffer - Buffer de la imagen en memoria RAM
     * @param contexto - Carpeta de destino ('reporte' o 'alerta')
     * @returns URL pública y definitiva de la imagen en Firebase Storage
     * @throws Error - Si falla el procesamiento con Sharp o la subida a Firebase
     */
    static async procesarYSubirImagen(
        fileBuffer: Buffer,
        contexto: ContextoMultimedia,
    ): Promise<string> {
        try {
            // 1. Optimización extrema con Sharp
            const processedBuffer = await sharp(fileBuffer)
                .resize({
                    width: 1280, // Ancho máximo. Ideal para móviles y web.
                    withoutEnlargement: true, // Si la foto original es de 800px, no la estira a 1280px
                })
                .webp({ quality: 80 }) // Formato Next-Gen: 30% más ligero que JPG
                .toBuffer();

            // 2. Generar nombre único y definir ruta en el Bucket
            const fileName = `${contexto}/${uuidv4()}.webp`;
            const file = bucket.file(fileName);

            // 3. Subir el buffer optimizado a Firebase Storage
            await file.save(processedBuffer, {
                metadata: {
                    contentType: 'image/webp',
                    cacheControl: 'public, max-age=31536000', // Cache en navegador por 1 año
                },
            });

            // 4. Hacer público el archivo y construir la URL
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

            return publicUrl;
        } catch (error) {
            logger.error('🔥 Error en el motor de procesamiento (Sharp/Firebase):', error);
            throw new Error('Fallo interno al procesar y subir la imagen a la nube.');
        }
    }
}
