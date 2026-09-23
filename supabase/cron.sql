-- Recordatorios push diarios (18:00 UTC). Ejecutar UNA vez en el SQL Editor, tras desplegar la funcion:
--   supabase functions deploy send-reminders --no-verify-jwt
--   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tu@correo CRON_SECRET=<algo-largo-y-secreto>
-- Genera las llaves VAPID con:  npx web-push generate-vapid-keys
-- Reemplaza <PROJECT_REF> y <CRON_SECRET> antes de ejecutar.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('pacto-daily-reminders', '0 18 * * *', $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);
