// ms-multimedia/src/services/multimedia.service.ts

import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { ContextoMultimedia } from '../models/archivo.model';
import { logger } from '../config/logger';
import { StorageService } from './storage.service';

export class MultimediaService {
    static async procesarYSubirImagen(
        fileBuffer: Buffer,
        contexto: ContextoMultimedia,
    ): Promise<string> {
        let processedBuffer: Buffer;
        try {
            processedBuffer = await sharp(fileBuffer)
                .resize({
                    width: 1280,
                    withoutEnlargement: true,
                })
                .webp({ quality: 80 })
                .toBuffer();
        } catch (error) {
            logger.error('🖼️ Error en Sharp (procesamiento de imagen):', error);
            throw new Error('No se pudo procesar la imagen. Verifica que el archivo sea una imagen válida.');
        }

        try {
            const fileName = `${contexto}/${uuidv4()}.webp`;
            await StorageService.guardar(processedBuffer, fileName);
            const publicUrl = StorageService.buildUrl(fileName);
            return publicUrl;
        } catch (error) {
            logger.error('💾 Error al guardar la imagen en disco local:', error);
            throw new Error('Error al almacenar la imagen. Intente nuevamente.');
        }
    }
}
