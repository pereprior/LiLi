# LiLi

LiLi es el asistente doméstico que estoy construyendo para mi propia casa. Quiero llevar mis tareas y recordatorios en una instalación que controlo, sin dejar esos datos en un servicio de terceros. Lo alojo yo y lo estoy diseñando para que, con el tiempo, pueda hablar con él desde una web, el móvil o una interfaz de voz.

Este repositorio muestra el camino hasta allí, no un producto terminado. La versión 0.2 tiene como objetivo la gestión de tareas y recordatorios. **Hoy está implementada la base de autenticación**, con acceso mediante Google para una lista cerrada de correos y sesiones locales guardadas en PostgreSQL. Todavía no hay endpoints de tareas ni de recordatorios.

## Cómo está pensado

LiLi es una aplicación modular en TypeScript y NestJS. Cada interfaz futura debería llamar a las mismas acciones del núcleo, para que las reglas de las tareas no dependan de si una petición llega por HTTP, voz o una automatización. Por ahora, el trabajo visible en la API es el flujo de acceso: Google confirma la identidad; LiLi decide si la cuenta está permitida y mantiene su propia sesión.

La intención es mantener una arquitectura que pueda crecer sin convertir un asistente personal en una colección de servicios innecesarios. Las decisiones y el código actuales importan más que las posibilidades futuras.

## Ponerlo en marcha

Necesitas Node.js 24 o posterior, pnpm, Docker con Compose y unas credenciales OAuth de Google. Configura en Google la URI de redirección `http://localhost:3000/auth/google/callback` para el entorno local.

1. Instala las dependencias con `pnpm install --frozen-lockfile`.
2. Crea un archivo `.env` en la raíz. La aplicación y Docker Compose usan estas variables:

   ```dotenv
   NODE_ENV=development
   APP_ORIGIN=http://localhost:3000
   AUTH_GOOGLE_CLIENT_ID=<id-de-cliente>
   AUTH_GOOGLE_CLIENT_SECRET=<secreto-de-cliente>
   AUTH_GOOGLE_ALLOWED_EMAILS=tu-correo@example.com
   POSTGRES_DB=lili
   POSTGRES_USER=lili
   POSTGRES_PASSWORD=<contraseña-local>
   POSTGRES_PORT=5432
   DATABASE_URL=postgresql://lili:<contraseña-local>@localhost:5432/lili
   ```

   El correo debe ser el de la cuenta de Google con la que vas a entrar. Si cambias `APP_ORIGIN`, registra en Google la nueva URI de callback con la ruta `/auth/google/callback`. No subas `.env` al repositorio.

3. Inicia PostgreSQL con `pnpm db:up`. Aplica las migraciones con `pnpm db:migrate:deploy` y genera el cliente de Prisma con `pnpm exec prisma generate`.
4. Arranca la aplicación con `pnpm dev` y abre `http://localhost:3000/auth/google` para iniciar sesión.

## Explorar la API

En desarrollo, `http://localhost:3000/api` abre la documentación OpenAPI. También puedes consultar su definición JSON en `http://localhost:3000/api-json`. La fuente está en [`src/docs/openapi.yaml`](src/docs/openapi.yaml), con cada ruta y esquema en su propio archivo YAML. Está escrita para volver al proyecto más adelante y entender qué hace cada operación, cómo se encadena el acceso con Google y qué papel tienen las cookies, las respuestas y los errores. La documentación interactiva no se sirve en producción. Los YAML se validan al arrancar la documentación en desarrollo.

El punto de partida es `GET /auth/google`. Después de volver de Google, `GET /auth/me` devuelve el usuario de la sesión y `POST /auth/logout` la cierra. Este último exige que `Origin` o `Referer` coincida con `APP_ORIGIN`.

Para comprobar el proyecto localmente, usa `pnpm run ci`. La suite de pruebas necesita Docker para levantar su base de datos aislada.
