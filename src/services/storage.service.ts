import * as fs from 'fs';
import * as path from 'path';
import { envs } from '../config/envs';
import { logger } from '../config/logger';

const UPLOADS_DIR = path.resolve(envs.UPLOAD_DIR);

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export class StorageService {
    static async guardar(buffer: Buffer, relativePath: string): Promise<string> {
        const fullPath = path.join(UPLOADS_DIR, relativePath);
        ensureDir(path.dirname(fullPath));
        await fs.promises.writeFile(fullPath, buffer);
        return relativePath;
    }

    static async eliminar(relativePath: string): Promise<void> {
        const fullPath = path.join(UPLOADS_DIR, relativePath);
        try {
            await fs.promises.unlink(fullPath);
            logger.info(`🗑️ Archivo local eliminado: ${relativePath}`);
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
                logger.error(`Error eliminando archivo local ${relativePath}:`, err);
            }
        }
    }

    static buildUrl(relativePath: string): string {
        const base = envs.PUBLIC_URL.replace(/\/+$/, '');
        return `${base}/uploads/${relativePath}`;
    }

    static getLocalPath(relativePath: string): string {
        return path.join(UPLOADS_DIR, relativePath);
    }

    static extraerRelativePath(url: string): string | null {
        const prefix = '/uploads/';
        const idx = url.indexOf(prefix);
        if (idx === -1) return null;
        return url.slice(idx + prefix.length);
    }
}
