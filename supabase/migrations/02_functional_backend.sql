-- 02: RLS sin recursion, escrituras solo via funciones del servidor, votos/juicio/sentencias, storage.
-- Se aplica ENCIMA de 01_pacto_schema.sql.

-- ---------------------------------------------------------------------------
-- Columnas nuevas
-- ---------------------------------------------------------------------------
ALTER TABLE pactos ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
ALTER TABLE pactos ADD COLUMN IF NOT EXISTS settled_at timestamptz;
ALTER TABLE sentences ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE TABLE IF NOT EXISTS sentence_votes (
  sentence_id uuid REFERENCES sentences(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  verdict boolean NOT NULL,
  PRIMARY KEY (sentence_id, voter_id)
);
ALTER TABLE sentence_votes ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helpers SECURITY DEFINER (evitan la recursion de RLS entre tablas)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id = gid AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_pacto_member(pid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM pacto_members WHERE pacto_id = pid AND user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Politicas: se reemplazan las de 01 (las de groups/group_members recursaban)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "groups_select_member" ON groups;
DROP POLICY IF EXISTS "groups_insert" ON groups;
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_insert" ON group_members;
DROP POLICY IF EXISTS "pactos_select" ON pactos;
DROP POLICY IF EXISTS "progress_select" ON progress;
DROP POLICY IF EXISTS "progress_insert_own" ON progress;
DROP POLICY IF EXISTS "votes_select" ON votes;
DROP POLICY IF EXISTS "votes_insert_valid" ON votes;

-- groups: solo lectura para miembros; crear/unirse es por funcion.
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT USING (public.is_group_member(id));
DROP POLICY IF EXISTS "groups_update_admin" ON groups;
CREATE POLICY "groups_update_admin" ON groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role = 'admin')
);
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT USING (public.is_group_member(group_id));

-- pactos / miembros / castigos: solo lectura directa; todo lo demas por funcion.
DROP POLICY IF EXISTS "pactos_select" ON pactos;
CREATE POLICY "pactos_select" ON pactos FOR SELECT USING (public.is_group_member(group_id));
DROP POLICY IF EXISTS "pacto_members_select" ON pacto_members;
CREATE POLICY "pacto_members_select" ON pacto_members FOR SELECT USING (public.is_pacto_member(pacto_id));
DROP POLICY IF EXISTS "punishments_select" ON punishments;
CREATE POLICY "punishments_select" ON punishments FOR SELECT USING (public.is_pacto_member(pacto_id));
DROP POLICY IF EXISTS "punishment_approvals_select" ON punishment_approvals;
CREATE POLICY "punishment_approvals_select" ON punishment_approvals FOR SELECT USING (
  EXISTS (SELECT 1 FROM punishments p WHERE p.id = punishment_id AND public.is_pacto_member(p.pacto_id))
);

-- evidencias: solo miembros; solo propias; solo pacto activo (el trigger fija fecha/estado/hora).
DROP POLICY IF EXISTS "progress_select" ON progress;
CREATE POLICY "progress_select" ON progress FOR SELECT USING (public.is_pacto_member(pacto_id));
DROP POLICY IF EXISTS "progress_insert_own" ON progress;
CREATE POLICY "progress_insert_own" ON progress FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND public.is_pacto_member(pacto_id)
  AND EXISTS (SELECT 1 FROM pactos p WHERE p.id = pacto_id AND p.status = 'active' AND p.end_date > now())
);

DROP POLICY IF EXISTS "votes_select" ON votes;
CREATE POLICY "votes_select" ON votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM progress pr WHERE pr.id = progress_id AND public.is_pacto_member(pr.pacto_id))
);
DROP POLICY IF EXISTS "votes_insert" ON votes;
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (
  auth.uid() = voter_id
  AND EXISTS (SELECT 1 FROM progress pr WHERE pr.id = progress_id AND public.is_pacto_member(pr.pacto_id) AND pr.user_id <> auth.uid())
);

-- sentencias
DROP POLICY IF EXISTS "sentences_select" ON sentences;
CREATE POLICY "sentences_select" ON sentences FOR SELECT USING (public.is_pacto_member(pacto_id));
DROP POLICY IF EXISTS "sentence_votes_select" ON sentence_votes;
CREATE POLICY "sentence_votes_select" ON sentence_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM sentences s WHERE s.id = sentence_id AND public.is_pacto_member(s.pacto_id))
);
DROP POLICY IF EXISTS "sentence_votes_insert" ON sentence_votes;
CREATE POLICY "sentence_votes_insert" ON sentence_votes FOR INSERT WITH CHECK (
  auth.uid() = voter_id
  AND EXISTS (SELECT 1 FROM sentences s WHERE s.id = sentence_id AND public.is_pacto_member(s.pacto_id) AND s.user_id <> auth.uid())
);

-- push
DROP POLICY IF EXISTS "push_select_own" ON push_subscriptions;
CREATE POLICY "push_select_own" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_insert_own" ON push_subscriptions;
CREATE POLICY "push_insert_own" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_delete_own" ON push_subscriptions;
CREATE POLICY "push_delete_own" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- El cliente no puede tocar honor/verguenza de su perfil.
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
REVOKE UPDATE ON profiles FROM authenticated, anon;
GRANT UPDATE (username, avatar_url, installed_pwa) ON profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- Evidencias: el servidor manda (R5)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.progress_before_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.server_timestamp := now();
  NEW.entry_date := (now() AT TIME ZONE 'utc')::date;
  NEW.status := 'pending';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_progress_before_insert ON progress;
CREATE TRIGGER trg_progress_before_insert BEFORE INSERT ON progress
  FOR EACH ROW EXECUTE FUNCTION public.progress_before_insert();

-- Estado de una evidencia segun votos. Misma regla que stateMachine.evaluateEvidenceVotes.
CREATE OR REPLACE FUNCTION public.refresh_progress_status(pid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner uuid; pacto uuid; needed int; pos int; neg int; newstatus text;
BEGIN
  SELECT user_id, pacto_id INTO owner, pacto FROM progress WHERE id = pid;
  SELECT count(*) - 1 INTO needed FROM pacto_members WHERE pacto_id = pacto;
  SELECT count(*) FILTER (WHERE verdict), count(*) FILTER (WHERE NOT verdict)
    INTO pos, neg FROM votes WHERE progress_id = pid AND voter_id <> owner;
  IF needed <= 0 THEN RETURN; END IF;
  IF pos > needed / 2.0 THEN newstatus := 'approved';
  ELSIF neg >= needed / 2.0 OR (pos + neg = needed AND pos <= neg) THEN newstatus := 'rejected';
  ELSE newstatus := 'pending'; END IF;
  UPDATE progress SET status = newstatus WHERE id = pid;
END $$;

CREATE OR REPLACE FUNCTION public.votes_after_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_progress_status(NEW.progress_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_votes_after_write ON votes;
CREATE TRIGGER trg_votes_after_write AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION public.votes_after_write();

-- Permitir cambiar el voto propio (upsert)
DROP POLICY IF EXISTS "votes_update_own" ON votes;
CREATE POLICY "votes_update_own" ON votes FOR UPDATE USING (auth.uid() = voter_id);

-- ---------------------------------------------------------------------------
-- Grupos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_emoji text DEFAULT NULL) RETURNS groups
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g groups;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF char_length(trim(p_name)) < 2 THEN RAISE EXCEPTION 'El nombre del grupo es muy corto'; END IF;
  INSERT INTO groups (name, emoji, created_by, invite_code)
    VALUES (trim(p_name), p_emoji, auth.uid(), upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)))
    RETURNING * INTO g;
  INSERT INTO group_members (group_id, user_id, role) VALUES (g.id, auth.uid(), 'admin');
  RETURN g;
END $$;

CREATE OR REPLACE FUNCTION public.join_group(p_code text) RETURNS groups
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g groups;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO g FROM groups WHERE upper(invite_code) = upper(trim(p_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Codigo de invitacion invalido'; END IF;
  INSERT INTO group_members (group_id, user_id) VALUES (g.id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN g;
END $$;

-- ---------------------------------------------------------------------------
-- Pactos: crear en borrador, proponer/aprobar castigos, firmar, activar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pacto(
  p_group_id uuid, p_name text, p_emoji text, p_goal_type text, p_target int, p_frequency text,
  p_days_per_week int, p_verification text, p_end_date timestamptz, p_punishments jsonb
) RETURNS pactos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p pactos; pun jsonb; pun_id uuid;
BEGIN
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'No perteneces a este grupo'; END IF;
  IF (SELECT count(*) FROM group_members WHERE group_id = p_group_id) < 2 THEN
    RAISE EXCEPTION 'El grupo necesita al menos 2 miembros (invita a alguien con el codigo)';
  END IF;
  INSERT INTO pactos (group_id, name, emoji, goal_type, target_value, frequency, days_per_week,
                      verification_type, status, start_date, end_date, created_by)
    VALUES (p_group_id, trim(p_name), p_emoji, p_goal_type, p_target, p_frequency, p_days_per_week,
            p_verification, 'draft', now(), p_end_date, auth.uid())
    RETURNING * INTO p;
  -- todos los miembros del grupo entran al pacto; solo quien lo crea firma de entrada
  INSERT INTO pacto_members (pacto_id, user_id, signed, signed_at)
    SELECT p.id, gm.user_id, gm.user_id = auth.uid(), CASE WHEN gm.user_id = auth.uid() THEN now() END
    FROM group_members gm WHERE gm.group_id = p_group_id;
  FOR pun IN SELECT * FROM jsonb_array_elements(COALESCE(p_punishments, '[]'::jsonb)) LOOP
    INSERT INTO punishments (pacto_id, proposed_by, body, category, severity)
      VALUES (p.id, auth.uid(), pun->>'body', COALESCE(pun->>'category', 'embarrassment'), COALESCE((pun->>'severity')::int, 3))
      RETURNING id INTO pun_id;
    INSERT INTO punishment_approvals (punishment_id, user_id, approved) VALUES (pun_id, auth.uid(), true);
  END LOOP;
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION public.propose_punishment(p_pacto_id uuid, p_body text, p_category text, p_severity int)
RETURNS punishments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pun punishments;
BEGIN
  IF NOT public.is_pacto_member(p_pacto_id) THEN RAISE EXCEPTION 'No eres miembro del pacto'; END IF;
  IF (SELECT status FROM pactos WHERE id = p_pacto_id) <> 'draft' THEN RAISE EXCEPTION 'El pacto ya no es un borrador'; END IF;
  INSERT INTO punishments (pacto_id, proposed_by, body, category, severity)
    VALUES (p_pacto_id, auth.uid(), p_body, p_category, p_severity) RETURNING * INTO pun;
  INSERT INTO punishment_approvals (punishment_id, user_id, approved) VALUES (pun.id, auth.uid(), true);
  -- una propuesta nueva invalida las firmas ya dadas por los demas
  UPDATE pacto_members SET signed = false, signed_at = NULL WHERE pacto_id = p_pacto_id AND user_id <> auth.uid();
  RETURN pun;
END $$;

CREATE OR REPLACE FUNCTION public.try_activate_pacto(p_pacto_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p pactos; nmembers int; ok_pun int;
BEGIN
  SELECT * INTO p FROM pactos WHERE id = p_pacto_id FOR UPDATE;
  IF p.status <> 'draft' THEN RETURN false; END IF;
  SELECT count(*) INTO nmembers FROM pacto_members WHERE pacto_id = p.id;
  IF nmembers < 2 OR p.end_date <= now() THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM pacto_members WHERE pacto_id = p.id AND NOT signed) THEN RETURN false; END IF;
  SELECT count(*) INTO ok_pun FROM punishments pu
    WHERE pu.pacto_id = p.id AND (
      SELECT count(*) FROM punishment_approvals a WHERE a.punishment_id = pu.id AND a.approved
    ) = nmembers;
  IF ok_pun < 1 THEN RETURN false; END IF;
  UPDATE pactos SET status = 'active', start_date = now() WHERE id = p.id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.vote_punishment(p_punishment_id uuid, p_approved boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  SELECT pacto_id INTO pid FROM punishments WHERE id = p_punishment_id;
  IF pid IS NULL OR NOT public.is_pacto_member(pid) THEN RAISE EXCEPTION 'Castigo no encontrado'; END IF;
  IF (SELECT status FROM pactos WHERE id = pid) <> 'draft' THEN RAISE EXCEPTION 'El pacto ya no es un borrador'; END IF;
  INSERT INTO punishment_approvals (punishment_id, user_id, approved) VALUES (p_punishment_id, auth.uid(), p_approved)
    ON CONFLICT (punishment_id, user_id) DO UPDATE SET approved = EXCLUDED.approved;
  RETURN public.try_activate_pacto(pid);
END $$;

CREATE OR REPLACE FUNCTION public.sign_pacto(p_pacto_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_pacto_member(p_pacto_id) THEN RAISE EXCEPTION 'No eres miembro del pacto'; END IF;
  UPDATE pacto_members SET signed = true, signed_at = now()
    WHERE pacto_id = p_pacto_id AND user_id = auth.uid()
      AND (SELECT status FROM pactos WHERE id = p_pacto_id) = 'draft';
  RETURN public.try_activate_pacto(p_pacto_id);
END $$;

-- ---------------------------------------------------------------------------
-- Cierre y juicio
-- ---------------------------------------------------------------------------
-- Aprobadas por miembro (solo cuentan las evidencias aprobadas por el grupo)
CREATE OR REPLACE VIEW public.pacto_standings WITH (security_invoker = true) AS
SELECT pm.pacto_id, pm.user_id, pr.username,
       count(g.id) FILTER (WHERE g.status = 'approved') AS approved,
       count(g.id) FILTER (WHERE g.status = 'pending') AS pending,
       p.target_value AS target,
       count(g.id) FILTER (WHERE g.status = 'approved') >= p.target_value AS met
FROM pacto_members pm
JOIN pactos p ON p.id = pm.pacto_id
JOIN profiles pr ON pr.id = pm.user_id
LEFT JOIN progress g ON g.pacto_id = pm.pacto_id AND g.user_id = pm.user_id
GROUP BY pm.pacto_id, pm.user_id, pr.username, p.target_value;

-- Cierra pactos vencidos. Idempotente; el cliente puede llamarla al cargar y pg_cron cada hora.
CREATE OR REPLACE FUNCTION public.close_expired_pactos() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p pactos; n int := 0;
BEGIN
  FOR p IN SELECT * FROM pactos WHERE status = 'active' AND end_date <= now() FOR UPDATE LOOP
    -- evidencias que quedaron sin resolver al vencer se consideran rechazadas (regla conservadora R7)
    UPDATE progress SET status = 'rejected' WHERE pacto_id = p.id AND status = 'pending';
    UPDATE profiles SET honor_points = honor_points + 10 WHERE id IN (
      SELECT user_id FROM pacto_standings WHERE pacto_id = p.id AND met);
    IF EXISTS (SELECT 1 FROM pacto_standings WHERE pacto_id = p.id AND NOT met) THEN
      UPDATE pactos SET status = 'judging', settled_at = now() WHERE id = p.id;
    ELSE
      UPDATE pactos SET status = 'completed', settled_at = now() WHERE id = p.id;
    END IF;
    n := n + 1;
  END LOOP;
  -- sentencias con plazo vencido sin cumplir => fallidas
  UPDATE profiles SET shame_count = shame_count + 1 WHERE id IN (
    SELECT user_id FROM sentences WHERE status = 'assigned' AND deadline < now());
  UPDATE sentences SET status = 'failed', resolved_at = now() WHERE status = 'assigned' AND deadline < now();
  -- quien no gira la ruleta en 5 dias tras el cierre: marca de deshonra y el pacto se cierra
  UPDATE profiles SET shame_count = shame_count + 1 WHERE id IN (
    SELECT s.user_id FROM pacto_standings s JOIN pactos pa ON pa.id = s.pacto_id
    WHERE pa.status = 'judging' AND pa.settled_at < now() - interval '5 days' AND NOT s.met
      AND NOT EXISTS (SELECT 1 FROM sentences se WHERE se.pacto_id = s.pacto_id AND se.user_id = s.user_id));
  UPDATE pactos SET status = 'completed' WHERE status = 'judging' AND settled_at < now() - interval '5 days';
  -- pactos en juicio cuyas sentencias ya estan todas resueltas => completados
  UPDATE pactos SET status = 'completed' WHERE status = 'judging' AND NOT EXISTS (
    SELECT 1 FROM pacto_standings s WHERE s.pacto_id = pactos.id AND NOT s.met AND NOT EXISTS (
      SELECT 1 FROM sentences se WHERE se.pacto_id = s.pacto_id AND se.user_id = s.user_id AND se.status <> 'assigned'));
  RETURN n;
END $$;

-- Ruleta: el servidor elige el castigo con una semilla auditable. Una sola vez por persona y pacto.
CREATE OR REPLACE FUNCTION public.pick_sentence(p_pacto_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p pactos; seed text; ids uuid[]; idx int; chosen punishments; s sentences; nmembers int;
BEGIN
  PERFORM public.close_expired_pactos();
  SELECT * INTO p FROM pactos WHERE id = p_pacto_id;
  IF NOT FOUND OR NOT public.is_pacto_member(p_pacto_id) THEN RAISE EXCEPTION 'Pacto no encontrado'; END IF;
  IF p.status <> 'judging' THEN RAISE EXCEPTION 'El pacto no esta en juicio'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pacto_standings WHERE pacto_id = p.id AND user_id = auth.uid() AND NOT met) THEN
    RAISE EXCEPTION 'Cumpliste tu meta: no hay sentencia para ti';
  END IF;
  SELECT * INTO s FROM sentences WHERE pacto_id = p.id AND user_id = auth.uid();
  IF FOUND THEN
    SELECT * INTO chosen FROM punishments WHERE id = s.punishment_id;
    RETURN jsonb_build_object('sentence', to_jsonb(s), 'punishment', to_jsonb(chosen), 'already', true);
  END IF;
  SELECT count(*) INTO nmembers FROM pacto_members WHERE pacto_id = p.id;
  SELECT array_agg(pu.id ORDER BY pu.id) INTO ids FROM punishments pu
    WHERE pu.pacto_id = p.id AND (SELECT count(*) FROM punishment_approvals a WHERE a.punishment_id = pu.id AND a.approved) = nmembers;
  seed := md5(random()::text || clock_timestamp()::text || auth.uid()::text);
  -- indice = primeros 8 hex de md5(semilla) mod n  (verificable por cualquiera)
  idx := (('x' || substr(md5(seed), 1, 8))::bit(32)::bigint % array_length(ids, 1))::int + 1;
  SELECT * INTO chosen FROM punishments WHERE id = ids[idx];
  INSERT INTO sentences (pacto_id, user_id, punishment_id, random_seed)
    VALUES (p.id, auth.uid(), chosen.id, seed) RETURNING * INTO s;
  RETURN jsonb_build_object(
    'sentence', to_jsonb(s), 'punishment', to_jsonb(chosen), 'already', false,
    'candidates', (SELECT jsonb_agg(to_jsonb(pu) ORDER BY pu.id) FROM punishments pu WHERE pu.id = ANY (ids)));
END $$;

-- Cumplir la sentencia: sube evidencia; el grupo la vota.
CREATE OR REPLACE FUNCTION public.submit_sentence_evidence(p_sentence_id uuid, p_evidence_url text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE sentences SET evidence_url = p_evidence_url
    WHERE id = p_sentence_id AND user_id = auth.uid() AND status = 'assigned' AND deadline > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Sentencia no disponible o plazo vencido'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.vote_sentence(p_sentence_id uuid, p_verdict boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s sentences; needed int; pos int; neg int; res text;
BEGIN
  SELECT * INTO s FROM sentences WHERE id = p_sentence_id;
  IF NOT FOUND OR NOT public.is_pacto_member(s.pacto_id) OR s.user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes votar esta sentencia';
  END IF;
  IF s.evidence_url IS NULL OR s.status <> 'assigned' THEN RAISE EXCEPTION 'Sentencia sin evidencia pendiente'; END IF;
  INSERT INTO sentence_votes (sentence_id, voter_id, verdict) VALUES (p_sentence_id, auth.uid(), p_verdict)
    ON CONFLICT (sentence_id, voter_id) DO UPDATE SET verdict = EXCLUDED.verdict;
  SELECT count(*) - 1 INTO needed FROM pacto_members WHERE pacto_id = s.pacto_id;
  SELECT count(*) FILTER (WHERE verdict), count(*) FILTER (WHERE NOT verdict) INTO pos, neg
    FROM sentence_votes WHERE sentence_id = s.id;
  IF pos > needed / 2.0 THEN
    UPDATE sentences SET status = 'fulfilled', resolved_at = now() WHERE id = s.id;
    UPDATE profiles SET honor_points = honor_points + 5 WHERE id = s.user_id;
    res := 'fulfilled';
  ELSIF neg >= needed / 2.0 THEN
    -- rechazada: puede volver a subir evidencia mientras dure el plazo
    UPDATE sentences SET evidence_url = NULL WHERE id = s.id;
    DELETE FROM sentence_votes WHERE sentence_id = s.id;
    res := 'rejected';
  ELSE res := 'pending'; END IF;
  PERFORM public.close_expired_pactos();
  RETURN res;
END $$;

-- Borrado de cuenta: el cliente borra antes sus archivos de Storage y luego llama a esto.
CREATE OR REPLACE FUNCTION public.delete_my_account() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  DELETE FROM auth.users WHERE id = auth.uid();  -- cascada: profiles, evidencias, votos, sentencias
END $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ---------------------------------------------------------------------------
-- Permisos de ejecucion: solo usuarios autenticados
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.create_group(text, text), public.join_group(text),
  public.create_pacto(uuid, text, text, text, int, text, int, text, timestamptz, jsonb),
  public.propose_punishment(uuid, text, text, int), public.vote_punishment(uuid, boolean),
  public.sign_pacto(uuid), public.try_activate_pacto(uuid), public.close_expired_pactos(),
  public.pick_sentence(uuid), public.submit_sentence_evidence(uuid, text), public.vote_sentence(uuid, boolean),
  public.refresh_progress_status(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.create_group(text, text), public.join_group(text),
  public.create_pacto(uuid, text, text, text, int, text, int, text, timestamptz, jsonb),
  public.propose_punishment(uuid, text, text, int), public.vote_punishment(uuid, boolean),
  public.sign_pacto(uuid), public.close_expired_pactos(), public.pick_sentence(uuid),
  public.submit_sentence_evidence(uuid, text), public.vote_sentence(uuid, boolean)
TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado "evidence". Ruta: {pacto_id}/{user_id}/{archivo}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "evidence_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "evidence_select_members" ON storage.objects;
DROP POLICY IF EXISTS "evidence_insert_own" ON storage.objects;
CREATE POLICY "evidence_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'evidence'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_pacto_member(((storage.foldername(name))[1])::uuid)
);
DROP POLICY IF EXISTS "evidence_select_members" ON storage.objects;
CREATE POLICY "evidence_select_members" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'evidence'
  AND public.is_pacto_member(((storage.foldername(name))[1])::uuid)
);

-- Realtime para el feed de evidencias/votos
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE progress, votes, pacto_members, sentences;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Cierre automatico cada 15 min si pg_cron esta habilitado (Database > Extensions > pg_cron)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('pacto-close-expired', '*/15 * * * *', 'SELECT public.close_expired_pactos()');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_cron no disponible: el cierre ocurrira al abrir la app'; END $$;
