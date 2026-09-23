// Recordatorios push. Se invoca 1 vez al dia (ver supabase/cron.sql). Deno + Supabase Edge Functions.
// Secrets necesarios (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo), CRON_SECRET
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya existen dentro de las Edge Functions.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

type Msg = { user_id: string; title: string; body: string; url: string };

async function buildMessages(): Promise<Msg[]> {
  const out: Msg[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 24 * 3600_000).toISOString();

  // 1) pacto activo y hoy no subiste evidencia
  const { data: active } = await db.from('pactos').select('id, name, pacto_members(user_id)').eq('status', 'active').gt('end_date', new Date().toISOString());
  const { data: doneToday } = await db.from('progress').select('pacto_id, user_id').eq('entry_date', today);
  const done = new Set((doneToday ?? []).map((r) => `${r.pacto_id}:${r.user_id}`));
  for (const p of active ?? []) {
    for (const m of (p as any).pacto_members ?? []) {
      if (!done.has(`${p.id}:${m.user_id}`)) out.push({ user_id: m.user_id, title: 'PACTO', body: `Hoy aún no subes tu evidencia de “${p.name}”.`, url: `/pacto/${p.id}` });
    }
  }

  // 2) evidencias pendientes de tu voto
  const { data: pending } = await db.from('progress').select('id, pacto_id, user_id, votes(voter_id)').eq('status', 'pending');
  const pendingByUser = new Map<string, { n: number; pacto: string }>();
  for (const ev of pending ?? []) {
    const { data: mem } = await db.from('pacto_members').select('user_id').eq('pacto_id', ev.pacto_id);
    const voted = new Set(((ev as any).votes ?? []).map((v: any) => v.voter_id));
    for (const m of mem ?? []) {
      if (m.user_id === ev.user_id || voted.has(m.user_id)) continue;
      const cur = pendingByUser.get(m.user_id) ?? { n: 0, pacto: ev.pacto_id };
      pendingByUser.set(m.user_id, { n: cur.n + 1, pacto: ev.pacto_id });
    }
  }
  for (const [user_id, { n, pacto }] of pendingByUser) out.push({ user_id, title: 'PACTO', body: `Tienes ${n} evidencia(s) de tus amigos por votar.`, url: `/pacto/${pacto}` });

  // 3) sentencias que vencen en menos de 24 h
  const { data: sents } = await db.from('sentences').select('user_id, pacto_id').eq('status', 'assigned').gt('deadline', new Date().toISOString()).lt('deadline', soon);
  for (const s of sents ?? []) out.push({ user_id: s.user_id, title: 'PACTO', body: 'Tu sentencia vence en menos de 24 horas.', url: `/juicio/${s.pacto_id}` });

  // 4) pactos en borrador donde falta tu firma
  const { data: unsigned } = await db.from('pacto_members').select('user_id, pacto_id, pactos!inner(name, status)').eq('signed', false).eq('pactos.status', 'draft');
  for (const u of unsigned ?? []) out.push({ user_id: u.user_id, title: 'PACTO', body: `Falta tu firma en “${(u as any).pactos.name}”.`, url: `/pacto/${u.pacto_id}` });

  return out;
}

Deno.serve(async (req) => {
  if (req.headers.get('authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`) return new Response('unauthorized', { status: 401 });

  const messages = await buildMessages();
  const { data: subs } = await db.from('push_subscriptions').select('user_id, endpoint, keys');
  let sent = 0, gone = 0;
  for (const msg of messages) {
    for (const sub of (subs ?? []).filter((s) => s.user_id === msg.user_id)) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ title: msg.title, body: msg.body, url: msg.url }));
        sent++;
      } catch (e: any) {
        if (e.statusCode === 404 || e.statusCode === 410) { await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); gone++; }
      }
    }
  }
  return Response.json({ messages: messages.length, sent, gone });
});
