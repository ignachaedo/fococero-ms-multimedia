# ms-multimedia — Microservicio de Gestión Multimedia

> Microservicio encargado de recibir, comprimir, almacenar y gestionar el ciclo de vida de las imágenes de FocoCero. Las imágenes se optimizan con **Sharp** (redimensionamiento y conversión a WebP), se suben a **Firebase Storage** y se trackean en **PostgreSQL** con un modelo de ciclo de vida que incluye estado huérfano, vinculación y soft-delete.

---

## Stack

| Categoría            | Tecnología                                                   |
| -------------------- | ------------------------------------------------------------ |
| **Runtime**          | Node.js ≥ 20, TypeScript 5                                   |
| **Framework HTTP**   | Express 4.19                                                  |
| **Procesamiento**    | Sharp 0.33 (redimensionar, convertir a WebP en memoria)       |
| **Almacenamiento**   | Firebase Admin SDK + Cloud Storage                            |
| **Base de datos**    | PostgreSQL 15 con `pg` pool (20 conexiones máx.)              |
| **Subida archivos**  | Multer (memoryStorage, 10 MB máx., solo JPG/PNG/WebP)         |
| **Validación**       | Zod 3.25 (esquemas de body y params)                          |
| **Documentación**    | swagger-jsdoc + swagger-ui-express                            |
| **Métricas**         | prom-client (contadores, histogramas, default metrics)        |
| **Logging**          | Pino + pino-pretty                                            |
| **Service Discovery**| eureka-js-client                                              |
| **Cron**             | node-cron (limpieza nocturna de huérfanos a las 03:00)        |
| **Seguridad**        | helmet, cors, express-rate-limit (5 req/min en upload)        |
| **Auth**             | Firebase Admin (verificación de tokens) + token interno       |

---

## Requisitos

- **Node.js** ≥ 20.0.0
- **PostgreSQL** 15+ (con PostGIS recomendado, aunque no obligatorio para este servicio)
- **Firebase** proyecto con Cloud Storage habilitado y cuenta de servicio
- **Docker** (recomendado para correr junto al ecosistema FocoCero, ver `docker-compose.yml` en la raíz del backend)

---

## Variables de Entorno

| Variable                     | Default                    | Descripción                                                  |
| ---------------------------- | -------------------------- | ------------------------------------------------------------ |
| `PORT`                       | `3005`                     | Puerto donde escucha el microservicio                        |
| `NODE_ENV`                   | `development`              | Entorno (`development`, `production`, `test`)                |
| `GATEWAY_URL`                | `http://localhost:3000`    | URL del API Gateway (usada para CORS)                        |
| `INTERNAL_SECRET_TOKEN`      | `test-token`               | Token compartido para autenticación entre microservicios     |
| `EUREKA_HOST`                | `localhost`                | Host del servidor Eureka                                     |
| `FIREBASE_PROJECT_ID`        | `test-project`             | ID del proyecto en Firebase                                  |
| `FIREBASE_CLIENT_EMAIL`      | `test@test.com`            | Email de la cuenta de servicio de Firebase                   |
| `FIREBASE_PRIVATE_KEY`       | `test-key`                 | Clave privada de la cuenta de servicio (con `\n` escapados)  |
| `FIREBASE_STORAGE_BUCKET`    | `test-bucket`              | Nombre del bucket de Firebase Storage                        |
| `DB_USER`                    | `test`                     | Usuario de PostgreSQL                                        |
| `DB_PASSWORD`                | `test`                     | Contraseña de PostgreSQL                                     |
| `DB_NAME`                    | `testdb`                   | Nombre de la base de datos                                   |
| `DB_HOST`                    | `localhost`                | Host de PostgreSQL (Docker: `db-fococero`, local: `localhost`) |
| `DB_PORT`                    | `5432`                     | Puerto de PostgreSQL (Docker: `5432`, local: `5433`)         |
| `DB_HOST_LOCAL`              | `localhost`                | Host para desarrollo fuera de Docker                         |
| `DB_PORT_LOCAL`              | `5433`                     | Puerto para desarrollo fuera de Docker                         |

> **Nota**: `DB_HOST`/`DB_PORT` se resuelven automáticamente: si `DB_HOST === 'db-fococero'` (Docker) se usan esos valores; si no, se usan `DB_HOST_LOCAL`/`DB_PORT_LOCAL`.

---

## Instalación y Ejecución

```bash
# 1. Clonar el repositorio (si no lo tienes)
# cd FocoCero/fococero-backend

# 2. Instalar dependencias
cd ms-multimedia
npm install

# 3. Configurar variables de entorno
#    Copia el template .env de la raíz del backend o crea uno propio
#    (ver tabla de variables arriba)

# 4. Iniciar en modo desarrollo (con hot-reload)
npm run dev

# 5. Compilar e iniciar en producción
npm run build
npm start
```

### Con Docker (recomendado)

El servicio se levanta junto con todo el ecosistema FocoCero:

```bash
cd FocoCero/fococero-backend
docker compose up -d --build ms-multimedia
```

---

## Endpoints

Todas las rutas operativas están montadas bajo `/api/v1/multimedia` y requieren autenticación interna.

### `POST /api/v1/multimedia/upload`

Sube una imagen, la comprime a WebP (1280 px máx., calidad 80) y la sube a Firebase Storage. El archivo nace en estado **huérfano**.

| Campo      | Tipo   | Ubicación    | Obligatorio | Descripción                                                  |
| ---------- | ------ | ------------ | ----------- | ------------------------------------------------------------ |
| `archivo`  | file   | `multipart`  | ✅          | Imagen en JPG, PNG o WebP. Máx. 10 MB.                       |
| `contexto` | string | `multipart`  | ❌          | `reporte`, `alerta`, `perfil_ciudadano` o `evidencia_brigada`. Default: `reporte`. |

**Respuesta 201:**
```json
{
  "success": true,
  "message": "Archivo procesado y subido con éxito.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url_publica": "https://storage.googleapis.com/fococero-bucket/reporte/uuid.webp",
    "formato": "image/webp",
    "peso_bytes": 1024500,
    "id_usuario": "firebase-uid-123",
    "contexto": "reporte",
    "es_huerfano": true,
    "created_at": "2026-06-21T12:00:00.000Z"
  }
}
```

**Rate limit:** 5 peticiones/minuto por cliente.

### `PATCH /api/v1/multimedia/:id/vincular`

Cambia el estado de un archivo huérfano a vinculado (`es_huerfano = false`).

| Parámetro | Tipo   | Ubicación | Obligatorio | Descripción                    |
| --------- | ------ | --------- | ----------- | ------------------------------ |
| `id`      | string | `path`    | ✅          | UUID del archivo en la BD.     |

### `DELETE /api/v1/multimedia/:id`

Eliminación lógica (soft-delete): marca `deleted_at` sin borrar el archivo de Firebase.

| Parámetro | Tipo   | Ubicación | Obligatorio | Descripción                    |
| --------- | ------ | --------- | ----------- | ------------------------------ |
| `id`      | string | `path`    | ✅          | UUID del archivo en la BD.     |

### `GET /api/v1/multimedia/internal/cleanup`

Endpoint interno (sin autenticación de gateway) que ejecuta la limpieza de archivos huérfanos expirados (> 24 horas sin vincular). Lo invoca el cronjob interno del servicio, no debería llamarse desde el frontend.

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Proceso de limpieza finalizado.",
  "data": {
    "huerfanos_encontrados": 12,
    "eliminados_firebase": 12
  }
}
```

### Endpoints públicos (sin autenticación)

| Ruta              | Método | Descripción                                    |
| ----------------- | ------ | ---------------------------------------------- |
| `/health`         | GET    | Health check del servicio.                     |
| `/metrics`        | GET    | Métricas en formato Prometheus.                |
| `/api-docs`       | GET    | Interfaz Swagger (OpenAPI 3.0).                |

## Documentación Swagger

La especificación OpenAPI 3.0 está disponible en:

```
http://localhost:3005/api-docs
```

Incluye esquemas, ejemplos de request/response, y la definición de seguridad para el header `x-user-id`. Sirve tanto para desarrollo local como para referencia de integración.

## Seguridad

El servicio aplica **cinco capas de seguridad**:

1. **Helmet** — Seguridad HTTP (CSP, XSS, etc.) global.
2. **CORS** — Restringido al origen del API Gateway (`GATEWAY_URL`).
3. **Firebase Auth** — `requireGatewayAuth` verifica el token Bearer con Firebase Admin. Fallback (desarrollo): confía en headers `x-user-id` y `x-user-role` del Gateway.
4. **Token interno** — `internalAuthMiddleware` exige `x-internal-token` en todas las rutas excepto `/health`, `/metrics` y `/api-docs`.
5. **Rate limiting** — `POST /upload`: 5 peticiones/minuto por cliente.

**Validaciones adicionales:**
- Multer filtra por MIME type (solo `image/jpeg`, `image/png`, `image/webp`).
- Multer limita el tamaño a 10 MB y una sola imagen por petición.
- Zod valida que el `contexto` sea uno de los valores permitidos y que los parámetros `id` tengan formato UUID v4.

---

## Eureka — Service Discovery

El microservicio se registra automáticamente en Eureka al iniciar con el nombre `ms-multimedia`.

| Propiedad            | Valor                              |
| -------------------- | ---------------------------------- |
| **App ID**           | `ms-multimedia`                    |
| **VIP Address**      | `ms-multimedia`                    |
| **Puerto**           | `PORT` (3005 por defecto)          |
| **Health check**     | `GET /health`                      |
| **Host Eureka**      | `EUREKA_HOST` (default: `eureka-server`) |

Al recibir una señal de apagado (`SIGINT`/`SIGTERM`), el servicio se desregistra de Eureka antes de cerrar el HTTP server, evitando que el gateway enrute tráfico a una instancia que está drenando.

---

## Ciclo de Vida de los Archivos (Modelo)

```
                    ┌──────────────────────────┐
                    │  POST /upload             │
                    │  Nace huérfano            │
                    │  (es_huerfano = true)     │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  ¿Se vincula antes de    │
                    │  24 horas?               │
                    └──────┬──────────┬────────┘
                           │          │
                           ▼          ▼
                    ┌──────────┐  ┌──────────────────┐
                    │ PATCH    │  │ CRON (03:00 AM)   │
                    │ /vincular│  │ Barrendero        │
                    │ Adoptado │  │ Elimina de        │
                    │ huérfano │  │ Firebase +        │
                    │ = false  │  │ soft-delete en BD │
                    └──────────┘  └──────────────────┘
                           │
                    ┌──────▼──────┐
                    │ DELETE /:id │
                    │ Soft-delete │
                    │ deleted_at  │
                    │ = NOW()     │
                    └─────────────┘
```

- Todos los archivos nacen **huérfanos** (`es_huerfano = true`).
- Si no se vinculan dentro de 24 horas, el **Barrendero** (cron diario a las 03:00 AM) los elimina físicamente de Firebase Storage y aplica soft-delete en la BD.
- La eliminación manual (`DELETE /:id`) es siempre lógica.

---

## Barrendero (Cron de Limpieza)

El "Barrendero" es un cronjob que se ejecuta todos los días a las **03:00 AM** (hora del servidor). Su trabajo:

1. Busca archivos en estado `es_huerfano = true` con más de 24 horas de antigüedad.
2. Elimina el archivo físico del bucket de Firebase Storage.
3. Aplica soft-delete en el registro de PostgreSQL.

Se activa automáticamente al iniciar el servicio y queda scheduleado con `node-cron`.

---

## Métricas (Prometheus)

El servicio expone métricas estándar en `GET /metrics`:

| Métrica                       | Tipo      | Labels                          | Descripción                            |
| ----------------------------- | --------- | ------------------------------- | -------------------------------------- |
| `http_requests_total`         | Counter   | `method`, `route`, `status`     | Conteo total de peticiones HTTP.       |
| `http_request_duration_ms`    | Histogram | `method`, `route`, `status`     | Duración de peticiones en ms. Buckets: 50, 100, 200, 500, 1000, 2000, 5000. |
| Default metrics de Node.js    | Varios    | —                               | CPU, memoria, event loop lag, etc.     |

---

## Scripts Disponibles

| Comando           | Descripción                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Inicia el servidor en modo desarrollo con hot-reload (`ts-node-dev`). |
| `npm run build`   | Compila TypeScript a JavaScript en `dist/`.         |
| `npm start`       | Ejecuta el compilado en producción.                 |
| `npm test`        | Ejecuta los tests con Jest.                         |
| `npm run lint`    | Analiza el código con ESLint.                       |
| `npm run format`  | Formatea el código con Prettier.                    |

---

## Graceful Shutdown

El servicio maneja `SIGINT` y `SIGTERM`:

1. Se desregistra de Eureka para dejar de recibir tráfico.
2. Cierra el servidor HTTP (espera a que conexiones activas terminen).
3. Si el cierre no se completa en 10 segundos, fuerza la salida.

Esto evita que imágenes queden a medio subir en Firebase.

---

## Licencia

ISC — Equipo FocoCero.
