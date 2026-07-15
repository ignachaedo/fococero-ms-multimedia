// ms-multimedia/src/config/db.ts
import { Pool } from 'pg';
import { envs } from './envs';
import { logger } from './logger';

export const pool = new Pool({
    user: envs.DB_USER,
    password: envs.DB_PASSWORD,
    database: envs.DB_NAME,
    host: envs.DB_HOST,
    port: envs.DB_PORT,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err: unknown) => {
    logger.error('🔥 Error crítico inesperado en el Pool de PostgreSQL (ms-multimedia):', err);
});

export async function waitForDatabase(maxRetries = 10, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await pool.query('SELECT NOW()');
            logger.info('✅ Conexión a PostgreSQL (PostGIS) establecida con éxito en ms-multimedia.');
            return;
        } catch (err) {
            logger.warn(`⏳ Intento ${attempt}/${maxRetries} – DB no disponible aún.`);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, delayMs));
            } else {
                logger.error('❌ No se pudo conectar a PostgreSQL tras varios intentos:', err);
                throw err;
            }
        }
    }
}

export async function isDatabaseHealthy(): Promise<boolean> {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}
