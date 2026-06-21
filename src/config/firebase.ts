// ms-multimedia/src/config/firebase.ts

import * as admin from 'firebase-admin';
import { envs } from './envs';
import { logger } from './logger';

// Patrón Singleton: Evita inicializar Firebase múltiples veces si ocurre un hot-reload en desarrollo
if (!admin.apps.length) {
    try {
        // Al leer desde el .env, el salto de línea literal "\\n" debe convertirse a un salto real "\n"
        const privateKey = envs.FIREBASE_PRIVATE_KEY;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: envs.FIREBASE_PROJECT_ID,
                clientEmail: envs.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            storageBucket: envs.FIREBASE_STORAGE_BUCKET,
        });

        logger.info('[Firebase] Inicializado correctamente');
    } catch (error) {
        logger.error('[Firebase] Error al inicializar:', error);
        process.exit(1);
    }
}

// Exportamos el bucket listo para recibir los buffers de Sharp
export const bucket = admin.storage().bucket();
