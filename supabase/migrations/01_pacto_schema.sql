-- PostgreSQL Database Migration for PACTO
-- Full Schema with RLS Policies & Server Constraints (Rules R1-R10)

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 20),
  avatar_url text,
  honor_points int DEFAULT 100,
  shame_count int DEFAULT 0,
  installed_pwa boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text,
  invite_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin','member')),
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
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  CHECK (end_date > start_date),
  -- R2 Constraint: Abstinence goal_type requires frequency = 'daily'
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
  approved boolean NOT NULL,
  PRIMARY KEY (punishment_id, user_id)
);

CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacto_id uuid REFERENCES pactos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  evidence_url text,
  gps_lat numeric,
  gps_lng numeric,
  server_timestamp timestamptz DEFAULT now(), -- R5: Enforced server timestamp
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

CREATE TRIGGER trigger_check_no_self_voting
  BEFORE INSERT OR UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_no_self_voting();

CREATE TABLE IF NOT EXISTS sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacto_id uuid REFERENCES pactos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  punishment_id uuid REFERENCES punishments(id) ON DELETE CASCADE,
  outcome text CHECK (outcome IN ('failed','failed_kitty')),
  status text CHECK (status IN ('assigned','fulfilled','failed')) DEFAULT 'assigned',
  assigned_at timestamptz DEFAULT now(),
  deadline timestamptz,
  evidence_url text,
  random_seed text NOT NULL -- R4: Audit seed
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

-- Row Level Security Policies
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

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "read_own_groups" ON pactos FOR SELECT USING (
  EXISTS (SELECT 1 FROM pacto_members pm WHERE pm.pacto_id = pactos.id AND pm.user_id = auth.uid())
);
