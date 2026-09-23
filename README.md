# PACTO — Cumple o asume las consecuencias

Apuestas sociales de cumplimiento de metas para grupos de amigos (PWA instalable). Sin datos de ejemplo: todo sale de Supabase.

**Stack:** React 19 + TypeScript + Vite + Tailwind 4 · TanStack Query · Supabase (Auth, Postgres con RLS, Storage, Realtime, Edge Functions) · PWA con service worker propio (push).

## Puesta en marcha (en este orden)

### 1. Base de datos
En el **SQL Editor** de Supabase ejecuta, en orden:
1. `supabase/migrations/01_pacto_schema.sql`
2. `supabase/migrations/02_functional_backend.sql` — políticas RLS, funciones del servidor (crear/unirse a grupo, firmar, votar, ruleta, cierre de pactos), bucket privado `evidence` y realtime. Se puede volver a ejecutar sin problema.

> Despliega el frontend **después** de aplicar la 02: las pantallas llaman a esas funciones.

### 2. Autenticación
Authentication → Providers: activa **Email** (enlace mágico) y, si quieres, **Google**.
Authentication → URL Configuration: pon la URL de Vercel en *Site URL* y en *Redirect URLs*.

### 3. Variables de entorno
Con la integración Supabase↔Vercel ya llegan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` y la app las lee. En local copia `.env.example` a `.env`. **Nunca** expongas la service role key al cliente.

### 4. Notificaciones push (opcional)
1. `npx web-push generate-vapid-keys`
2. Pon la llave pública en `VITE_VAPID_PUBLIC_KEY` (Vercel y `.env`).
3. `supabase functions deploy send-reminders --no-verify-jwt` y `supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:tu@correo CRON_SECRET=…`
4. Programa el envío diario con `supabase/cron.sql` (sustituye `<PROJECT_REF>` y `<CRON_SECRET>`).

En iPhone las notificaciones solo funcionan con la app instalada en la pantalla de inicio.

### 5. Cierre automático de pactos
La migración intenta programar `close_expired_pactos()` cada 15 min con `pg_cron` (Database → Extensions → pg_cron). Si no está habilitado, el cierre ocurre al abrir la app cualquier miembro.

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev        # servidor local
npm test           # tests del cliente (Vitest)
npm run test:db    # prueba el SQL contra Postgres en memoria (PGlite): RLS, flujo completo
npm run build
```

## Cómo funciona

- **Pacto:** nace en borrador. Empieza cuando todos los miembros firman y al menos un castigo tiene la aprobación de todos. Añadir un castigo nuevo obliga a firmar de nuevo.
- **Evidencias:** foto con GPS (o palabra de honor). La hora y la fecha las pone el servidor. Una por día. Los demás miembros votan; el dueño no puede votar la suya. Empate = rechazada.
- **Meta:** número de evidencias *aprobadas* dentro del plazo.
- **Juicio:** al vencer, quien no llegó a la meta gira la ruleta. El **servidor** elige el castigo con una semilla auditable y lo guarda; no se puede repetir. Tiene 48 h para subir prueba y el grupo la vota. Quien no gira en 5 días recibe una marca de deshonra y el pacto se cierra.
- **Honor:** +10 al cumplir un pacto, +5 al cumplir una sentencia, marca de deshonra por sentencia incumplida. El cliente no puede editar estos números.
- **Privacidad:** fotos en bucket privado (URLs firmadas de 1 h) visibles solo para miembros del pacto. Borrar cuenta elimina también los archivos.
