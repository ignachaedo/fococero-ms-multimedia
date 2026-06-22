/**
 * @fileoverview Repositorio de archivos multimedia (imágenes, videos, documentos).
 * Maneja operaciones CRUD con soft delete, control de archivos huérfanos
 * y vinculación a entidades (reportes/alertas).
 */

import { QueryConfig } from 'pg';
import { pool } from '../config/db';
import { IArchivoMultimedia, ICreateArchivoDTO } from '../models/archivo.model';

export class ArchivoRepository {
    /**
     * Registra un nuevo archivo en la base de datos.
     * Nace con estado huérfano (es_huerfano = true) hasta que se vincule a una entidad.
     *
     * @param data - DTO con url_publica, formato, peso_bytes, contexto y metadata
     * @returns El archivo creado
     */
    static async crear(data: ICreateArchivoDTO): Promise<IArchivoMultimedia> {
        const query: QueryConfig = {
            name: 'crear-archivo-multimedia',
            text: `
                INSERT INTO archivos_multimedia 
                (url_publica, formato, peso_bytes, id_usuario, contexto, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `,
            values: [
                data.url_publica,
                data.formato,
                data.peso_bytes,
                data.id_usuario,
                data.contexto,
                data.metadata || {},
            ],
        };

        const result = await pool.query(query);
        return result.rows[0];
    }

    /**
     * Busca un archivo por su ID (excluye eliminaciones lógicas).
     *
     * @param id - UUID del archivo
     * @returns El archivo encontrado o null si no existe o fue eliminado
     */
    static async obtenerPorId(id: string): Promise<IArchivoMultimedia | null> {
        const query: QueryConfig = {
            name: 'obtener-archivo-id',
            text: `SELECT * FROM archivos_multimedia WHERE id = $1 AND deleted_at IS NULL;`,
            values: [id],
        };

        const result = await pool.query(query);
        return result.rows.length ? result.rows[0] : null;
    }

    /**
     * Marca un archivo como no huérfano, confirmando su vinculación a una entidad (reporte/alerta).
     *
     * @param id - UUID del archivo a vincular
     * @returns El archivo actualizado o null si no existe o fue eliminado
     */
    static async vincularEntidad(id: string): Promise<IArchivoMultimedia | null> {
        const query: QueryConfig = {
            name: 'vincular-archivo',
            text: `
                UPDATE archivos_multimedia 
                SET es_huerfano = false 
                WHERE id = $1 AND deleted_at IS NULL 
                RETURNING *;
            `,
            values: [id],
        };

        const result = await pool.query(query);
        return result.rows.length ? result.rows[0] : null;
    }

    /**
     * Busca archivos huérfanos que lleven más de X horas sin ser reclamados (para cronjob de limpieza).
     * Optimizado con índice parcial 'idx_archivos_huerfanos_limpieza'.
     *
     * @param horasExpiracion - Horas mínimas sin ser reclamado para considerarse expirado
     * @returns Array de archivos huérfanos expirados
     */
    static async obtenerHuerfanosExpirados(horasExpiracion: number): Promise<IArchivoMultimedia[]> {
        const query: QueryConfig = {
            name: 'obtener-huerfanos-expirados',
            text: `
                SELECT * FROM archivos_multimedia 
                WHERE es_huerfano = true 
                AND deleted_at IS NULL
                AND created_at < NOW() - INTERVAL '$1 hours';
            `,
            values: [horasExpiracion],
        };

        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Realiza soft delete marcando la fecha de borrado (no elimina la fila).
     *
     * @param id - UUID del archivo a eliminar lógicamente
     * @returns true si se marcó como eliminado, false si no existía o ya estaba eliminado
     */
    static async eliminarLogico(id: string): Promise<boolean> {
        const query: QueryConfig = {
            name: 'soft-delete-archivo',
            text: `UPDATE archivos_multimedia SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL;`,
            values: [id],
        };

        const result = await pool.query(query);
        return (result.rowCount ?? 0) > 0;
    }
}
