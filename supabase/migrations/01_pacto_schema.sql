-- Complete PostgreSQL Database Schema for PACTO
-- Full RLS Security Policies, Auth Triggers, and Server Constraints

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 20),
  avatar_url text,
  honor_points int DEFAULT 100,
  shame_count int DEFAULT 0,
  installed_pwa boolean DEFAULT false
);

-- Trigger: Automatically create profile on new Supabase Auth User registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', CONCAT('user_', SUBSTRING(NEW.id::text FROM 1 FOR 8))),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text,
  invite_code text UNIQUE NOT NULL DEFAULT SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8),
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin','member')) DEFAULT 'member',
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS pactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text,
  goal_type text CHECK (goal_type IN ('habit','quantitative','abstinence')),
  target_value int NOT NULL CHECK (target_value > 0),
  frequency text CHECK (frequency IN ('daily','weekly','x_days_per_week')),
  days_per_week int,
  verification_type text CHECK (verification_type IN ('strict_photo','integration','honor_code')),
  status text CHECK (status IN ('draft','active','judging','completed')) DEFAULT 'draft',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  CHECK (end_date > start_date),
  CONSTRAINT abstinence_daily_check CHECK (
    (goal_type = 'abstinence' AND frequency = 'daily') OR (goal_type != 'abstinence')
  )
);

CREATE TABLE IF NOT EXISTS pacto_members (
  pacto_id uuid REFERENCES pactos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  signed boolean DEFAULT false,
  signed_at timestamptz,
  PRIMARY KEY (pacto_id, user_id)
);

CREATE TABLE IF NOT EXISTS punishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacto_id uuid REFERENCES pactos(id) ON DELETE CASCADE,
  proposed_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 200),
  category text CHECK (category IN ('money','embarrassment','service','random')),
  severity int CHECK (severity BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS punishment_approvals (
  punishment_id uuid REFERENCES punishments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  approved boolean NOT NULL DEFAULT false,
  PRIMARY KEY (punishment_id, user_id)
);

CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacto_id uuid REFERENCES pactos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  evidence_url text,
  gps_lat numeric,
  gps_lng numeric,
  server_timestamp timestamptz NOT NULL DEFAULT now(),
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  UNIQUE (pacto_id, user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS votes (
  progress_id uuid REFERENCES progress(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  verdict boolean NOT NULL,
  PRIMARY KEY (progress_id, voter_id)
);

-- Trigger Function: Enforce R6 (Nobody can vote on their own evidence)
CREATE OR REPLACE FUNCTION check_no_self_voting()
RETURNS TRIGGER AS $$
DECLARE
  evidence_owner uuid;
BEGIN
  SELECT user_id INTO evidence_owner FROM progress WHERE id = NEW.progress_id;
  IF NEW.voter_id = evidence_owner THEN
    RAISE EXCEPTION 'Rule R6: Owners cannot vote on their own evidence.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_check_no_self_voting
  BEFORE INSERT OR UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_no_self_voting();

CREATE TABLE IF NOT EXISTS sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacto_id uuid REFERENCES pactos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  punishment_id uuid REFERENCES punishments(id) ON DELETE CASCADE,
  outcome text CHECK (outcome IN ('failed','failed_kitty')) DEFAULT 'failed',
  status text CHECK (status IN ('assigned','fulfilled','failed')) DEFAULT 'assigned',
  assigned_at timestamptz DEFAULT now(),
  deadline timestamptz DEFAULT (now() + INTERVAL '48 hours'),
  evidence_url text,
  random_seed text NOT NULL,
  UNIQUE (pacto_id, user_id)
);

CREATE TABLE IF NOT EXISTS kitty_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacto_id uuid REFERENCES pactos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric CHECK (amount > 0),
  reason text,
  settled boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  PRIMARY KEY (user_id, endpoint)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacto_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishment_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitty_tx ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Complete Write/Read Policies
-- Trigger Function: Enforce immutable server_timestamp on progress
CREATE OR REPLACE FUNCTION enforce_progress_server_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.server_timestamp = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_enforce_progress_server_timestamp
  BEFORE INSERT OR UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION enforce_progress_server_timestamp();

-- Trigger Function: Prevent editing pactos once active or completed (Rule R9)
CREATE OR REPLACE FUNCTION prevent_active_pacto_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('active', 'completed') THEN
    RAISE EXCEPTION 'Rule R9: Nothing can be modified after the pacto is active except by unanimous amendment vote.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_prevent_active_pacto_modification
  BEFORE UPDATE ON pactos
  FOR EACH ROW
  EXECUTE FUNCTION prevent_active_pacto_modification();

-- Function: Safe Status Transition Handler for Pactos
CREATE OR REPLACE FUNCTION transition_pacto_status(p_pacto_id uuid, p_new_status text)
RETURNS boolean AS $$
DECLARE
  v_member_count int;
  v_signed_count int;
  v_approved_punishments int;
  v_current_status text;
BEGIN
  SELECT status INTO v_current_status FROM pactos WHERE id = p_pacto_id;

  IF p_new_status = 'active' THEN
    SELECT COUNT(*) INTO v_member_count FROM pacto_members WHERE pacto_id = p_pacto_id;
    SELECT COUNT(*) INTO v_signed_count FROM pacto_members WHERE pacto_id = p_pacto_id AND signed = true;

    SELECT COUNT(*) INTO v_approved_punishments
    FROM punishments p
    WHERE p.pacto_id = p_pacto_id
      AND NOT EXISTS (
        SELECT 1 FROM pacto_members pm
        WHERE pm.pacto_id = p_pacto_id
          AND NOT EXISTS (
            SELECT 1 FROM punishment_approvals pa
            WHERE pa.punishment_id = p.id AND pa.user_id = pm.user_id AND pa.approved = true
          )
      );

    IF v_member_count < 2 THEN
      RAISE EXCEPTION 'Transition failed: Minimum 2 members required.';
    END IF;

    IF v_signed_count < v_member_count THEN
      RAISE EXCEPTION 'Transition failed: All members must sign.';
    END IF;

    IF v_approved_punishments < 1 THEN
      RAISE EXCEPTION 'Transition failed: Minimum 1 punishment approved by all members required.';
    END IF;

    UPDATE pactos SET status = 'active' WHERE id = p_pacto_id;
    RETURN true;
  ELSE
    UPDATE pactos SET status = p_new_status WHERE id = p_pacto_id;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete Write/Read Policies across all tables
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "groups_select_member" ON groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
);
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_update_admin" ON groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role = 'admin')
);

CREATE POLICY "group_members_select" ON group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "group_members_insert" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pactos_select" ON pactos FOR SELECT USING (
  EXISTS (SELECT 1 FROM pacto_members pm WHERE pm.pacto_id = pactos.id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = pactos.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "pactos_insert" ON pactos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = pactos.group_id AND gm.user_id = auth.uid())
);

CREATE POLICY "pacto_members_select" ON pacto_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM pacto_members pm WHERE pm.pacto_id = pacto_members.pacto_id AND pm.user_id = auth.uid())
);
CREATE POLICY "pacto_members_insert" ON pacto_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pacto_members_update_own" ON pacto_members FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "punishments_select" ON punishments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pactos p
    WHERE p.id = punishments.pacto_id
      AND (
        p.status = 'active'
        OR EXISTS (SELECT 1 FROM pacto_members pm WHERE pm.pacto_id = p.id AND pm.user_id = auth.uid())
      )
  )
);
CREATE POLICY "punishments_insert" ON punishments FOR INSERT WITH CHECK (auth.uid() = proposed_by);

CREATE POLICY "punishment_approvals_select" ON punishment_approvals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM punishments p
    JOIN pacto_members pm ON pm.pacto_id = p.pacto_id
    WHERE p.id = punishment_approvals.punishment_id AND pm.user_id = auth.uid()
  )
);
CREATE POLICY "punishment_approvals_upsert_own" ON punishment_approvals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "progress_select" ON progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM pacto_members pm WHERE pm.pacto_id = progress.pacto_id AND pm.user_id = auth.uid())
);
CREATE POLICY "progress_insert_own" ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_select" ON votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM progress pr JOIN pacto_members pm ON pm.pacto_id = pr.pacto_id WHERE pr.id = votes.progress_id AND pm.user_id = auth.uid())
);
CREATE POLICY "votes_insert_valid" ON votes FOR INSERT WITH CHECK (
  auth.uid() = voter_id AND NOT EXISTS (SELECT 1 FROM progress pr WHERE pr.id = progress_id AND pr.user_id = auth.uid())
);

CREATE POLICY "sentences_select" ON sentences FOR SELECT USING (
  EXISTS (SELECT 1 FROM pacto_members pm WHERE pm.pacto_id = sentences.pacto_id AND pm.user_id = auth.uid())
);

CREATE POLICY "kitty_tx_select" ON kitty_tx FOR SELECT USING (
  EXISTS (SELECT 1 FROM pacto_members pm WHERE pm.pacto_id = kitty_tx.pacto_id AND pm.user_id = auth.uid())
);

CREATE POLICY "push_subscriptions_all_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
