import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const R = new URL('../migrations/', import.meta.url);
const db = new PGlite();

await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.uid', true), '')::uuid $$;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array(name, '/') $$;
CREATE PUBLICATION supabase_realtime;
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
`);
await db.exec(fs.readFileSync(new URL('01_pacto_schema.sql', R), 'utf8'));
await db.exec(fs.readFileSync(new URL('02_functional_backend.sql', R), 'utf8'));
await db.exec(fs.readFileSync(new URL('02_functional_backend.sql', R), 'utf8')); // idempotente
await db.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated; GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticated;
 GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;`);
// vuelve a aplicar los REVOKE/GRANT de columnas (GRANT ALL de arriba los pisa en este stub)
await db.exec(`REVOKE UPDATE ON profiles FROM authenticated; GRANT UPDATE (username, avatar_url, installed_pwa) ON profiles TO authenticated;`);

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL', m); } else console.log('  ok  ', m); };
const as = async (uid, sql, params) => {
  await db.exec(`SET request.uid = '${uid ?? ''}'; SET ROLE authenticated;`);
  try { return await db.query(sql, params); } finally { await db.exec('RESET ROLE'); }
};
const fail = async (uid, sql, params) => { try { await as(uid, sql, params); return null; } catch (e) { return e.message; } };

// usuarios (el trigger crea los profiles)
const ids = {};
for (const n of ['ana', 'beto', 'cami', 'intruso']) {
  const r = await db.query(`INSERT INTO auth.users (raw_user_meta_data) VALUES ($1) RETURNING id`, [JSON.stringify({ username: n })]);
  ids[n] = r.rows[0].id;
}
console.log('== grupos');
const g = (await as(ids.ana, `SELECT * FROM create_group('Los Tres','🔥')`)).rows[0];
ok(g.invite_code.length === 8, 'create_group genera codigo de 8');
ok((await as(ids.beto, `SELECT * FROM groups`)).rows.length === 0, 'no miembro no ve el grupo (sin recursion)');
await as(ids.beto, `SELECT * FROM join_group($1)`, [g.invite_code.toLowerCase()]);
await as(ids.cami, `SELECT * FROM join_group($1)`, [g.invite_code]);
ok((await as(ids.beto, `SELECT * FROM group_members`)).rows.length === 3, 'miembro ve 3 miembros');
ok(/invalido/.test(await fail(ids.intruso, `SELECT * FROM join_group('ZZZZZZZZ')`)), 'codigo invalido falla');
ok(await fail(ids.intruso, `INSERT INTO group_members (group_id,user_id) VALUES ($1,$2)`, [g.id, ids.intruso]), 'no se puede insertar miembro directo');

console.log('== pacto (draft -> active)');
const end = new Date(Date.now() + 3 * 86400000).toISOString();
ok(await fail(ids.intruso, `SELECT create_pacto($1,'x','x','habit',2,'daily',null,'strict_photo',$2,'[]')`, [g.id, end]), 'intruso no crea pacto en grupo ajeno');
ok(await fail(ids.ana, `SELECT create_pacto($1,'Gym','💪','abstinence',2,'weekly',null,'strict_photo',$2,'[]')`, [g.id, end]), 'R2 abstinence+weekly rechazado por CHECK');
const p = (await as(ids.ana, `SELECT * FROM create_pacto($1,'Gym','💪','habit',2,'daily',null,'strict_photo',$2,$3)`,
  [g.id, end, JSON.stringify([{ body: 'Cantar opera en la calle', category: 'embarrassment', severity: 4 }])])).rows[0];
ok(p.status === 'draft', 'pacto nace en draft');
ok((await as(ids.beto, `SELECT * FROM pacto_members WHERE pacto_id=$1`, [p.id])).rows.length === 3, '3 miembros del pacto');
ok(await fail(ids.ana, `UPDATE pactos SET status='active' WHERE id=$1`, [p.id]) !== undefined && (await db.query(`SELECT status FROM pactos WHERE id=$1`, [p.id])).rows[0].status === 'draft', 'cliente no puede activar por UPDATE');
ok((await as(ids.beto, `SELECT sign_pacto($1) a`, [p.id])).rows[0].a === false, 'firma de beto: aun no activa');
ok((await as(ids.cami, `SELECT sign_pacto($1) a`, [p.id])).rows[0].a === false, 'firma de cami: falta aprobar castigo unanime');
const pun = (await db.query(`SELECT id FROM punishments WHERE pacto_id=$1`, [p.id])).rows[0].id;
ok((await as(ids.beto, `SELECT vote_punishment($1,true) a`, [pun])).rows[0].a === false, 'beto aprueba: aun falta cami');
ok((await as(ids.cami, `SELECT vote_punishment($1,true) a`, [pun])).rows[0].a === true, 'cami aprueba: PACTO ACTIVO');
ok((await db.query(`SELECT status FROM pactos WHERE id=$1`, [p.id])).rows[0].status === 'active', 'status=active');

console.log('== evidencias y votos');
const ev = async (u) => (await as(u, `INSERT INTO progress (pacto_id,user_id,entry_date,status,server_timestamp,evidence_url) VALUES ($1,$2,'2000-01-01','approved','2000-01-01','x') RETURNING *`, [p.id, u])).rows[0];
const e1 = await ev(ids.ana);
ok(e1.status === 'pending' && e1.entry_date.toISOString().slice(0, 4) !== '2000', 'servidor pisa fecha, hora y estado (R5)');
ok(await fail(ids.ana, `INSERT INTO progress (pacto_id,user_id,evidence_url) VALUES ($1,$2,'x')`, [p.id, ids.ana]), 'segunda evidencia el mismo dia rechazada (UNIQUE)');
ok(await fail(ids.intruso, `INSERT INTO progress (pacto_id,user_id,evidence_url) VALUES ($1,$2,'x')`, [p.id, ids.intruso]), 'no miembro no sube evidencia');
ok(await fail(ids.beto, `INSERT INTO progress (pacto_id,user_id,evidence_url) VALUES ($1,$2,'x')`, [p.id, ids.ana]), 'no se sube evidencia a nombre de otro');
ok(await fail(ids.ana, `INSERT INTO votes VALUES ($1,$2,true)`, [e1.id, ids.ana]), 'R6: no votas tu evidencia');
ok(await fail(ids.intruso, `INSERT INTO votes VALUES ($1,$2,true)`, [e1.id, ids.intruso]), 'no miembro no vota');
await as(ids.beto, `INSERT INTO votes VALUES ($1,$2,true)`, [e1.id, ids.beto]);
ok((await db.query(`SELECT status FROM progress WHERE id=$1`, [e1.id])).rows[0].status === 'pending', '1 de 2 votos a favor: pendiente');
await as(ids.cami, `INSERT INTO votes VALUES ($1,$2,true)`, [e1.id, ids.cami]);
ok((await db.query(`SELECT status FROM progress WHERE id=$1`, [e1.id])).rows[0].status === 'approved', '2 de 2: approved');
ok(await fail(ids.ana, `UPDATE progress SET status='approved' WHERE id=$1`, [e1.id]) !== undefined, 'cliente no cambia estado');
ok((await as(ids.beto, `SELECT * FROM pacto_standings WHERE pacto_id=$1 AND user_id=$2`, [p.id, ids.ana])).rows[0].approved == 1, 'standings cuenta 1 aprobada');

console.log('== cierre y juicio');
ok((await as(ids.ana, `SELECT close_expired_pactos() n`)).rows[0].n == 0, 'no cierra pactos vigentes');
await db.query(`UPDATE pactos SET end_date = now() - interval '1 minute', start_date = now() - interval '2 days' WHERE id=$1`, [p.id]);
ok((await as(ids.ana, `SELECT close_expired_pactos() n`)).rows[0].n == 1, 'cierra pacto vencido');
ok((await db.query(`SELECT status FROM pactos WHERE id=$1`, [p.id])).rows[0].status === 'judging', 'status=judging (beto y cami fallaron)');
ok((await db.query(`SELECT honor_points FROM profiles WHERE id=$1`, [ids.ana])).rows[0].honor_points == 100, 'ana no llega a la meta (1/2): sin honor');
ok(/no encontrado/.test(await fail(ids.intruso, `SELECT pick_sentence($1)`, [p.id])), 'intruso no puede girar');
const s1 = (await as(ids.beto, `SELECT pick_sentence($1) r`, [p.id])).rows[0].r;
ok(s1.punishment.id === pun && s1.already === false, 'beto recibe sentencia del servidor');
const s1b = (await as(ids.beto, `SELECT pick_sentence($1) r`, [p.id])).rows[0].r;
ok(s1b.already === true && s1b.sentence.random_seed === s1.sentence.random_seed, 'segunda tirada devuelve la misma (no se repite la ruleta)');
ok(await fail(ids.beto, `INSERT INTO sentences (pacto_id,user_id,punishment_id,random_seed) VALUES ($1,$2,$3,'x')`, [p.id, ids.beto, pun]), 'cliente no inserta sentencias');

console.log('== sentencia');
await as(ids.beto, `SELECT submit_sentence_evidence($1,'p/b/s.jpg')`, [s1.sentence.id]);
ok(await fail(ids.beto, `SELECT vote_sentence($1,true)`, [s1.sentence.id]), 'no votas tu propia sentencia');
await as(ids.ana, `SELECT vote_sentence($1,true)`, [s1.sentence.id]);
const r = (await as(ids.cami, `SELECT vote_sentence($1,true) r`, [s1.sentence.id])).rows[0].r;
ok(r === 'fulfilled', 'mayoria aprueba: fulfilled');
ok((await db.query(`SELECT honor_points FROM profiles WHERE id=$1`, [ids.beto])).rows[0].honor_points == 105, 'beto +5 honor');

console.log('== plazo vencido de sentencia');
await as(ids.cami, `SELECT pick_sentence($1)`, [p.id]);
await db.query(`UPDATE sentences SET deadline = now() - interval '1 hour' WHERE user_id=$1`, [ids.cami]);
await as(ids.ana, `SELECT close_expired_pactos()`);
ok((await db.query(`SELECT shame_count FROM profiles WHERE id=$1`, [ids.cami])).rows[0].shame_count == 1, 'cami +1 verguenza');
ok((await db.query(`SELECT status FROM pactos WHERE id=$1`, [p.id])).rows[0].status === 'judging', 'sigue en judging: ana aun debe su sentencia');
await db.query(`UPDATE pactos SET settled_at = now() - interval '6 days' WHERE id=$1`, [p.id]);
await as(ids.beto, `SELECT close_expired_pactos()`);
ok((await db.query(`SELECT status FROM pactos WHERE id=$1`, [p.id])).rows[0].status === 'completed', 'pasados 5 dias el pacto se completa');
ok((await db.query(`SELECT shame_count FROM profiles WHERE id=$1`, [ids.ana])).rows[0].shame_count == 1, 'ana (nunca giro) +1 verguenza');

console.log('== perfil');
ok(await fail(ids.ana, `UPDATE profiles SET honor_points=9999 WHERE id=$1`, [ids.ana]), 'no puedes editar tu honor');
await as(ids.ana, `UPDATE profiles SET username='ana2' WHERE id=$1`, [ids.ana]);
ok((await db.query(`SELECT username FROM profiles WHERE id=$1`, [ids.ana])).rows[0].username === 'ana2', 'si puedes cambiar tu nombre');
console.log('== borrar cuenta');
await as(ids.cami, `SELECT delete_my_account()`);
ok((await db.query(`SELECT count(*) n FROM profiles WHERE id=$1`, [ids.cami])).rows[0].n == 0, 'cuenta y perfil borrados');
console.log(fails ? `\n${fails} FALLOS` : '\nTODO OK');
