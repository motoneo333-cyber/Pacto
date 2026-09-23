import { supabase } from './supabaseClient';
import type {
  Group, Pacto, PactoStanding, PactoMemberRow, PunishmentWithApprovals, EvidenceView,
  Progress, Vote, Sentence, PickSentenceResult, Profile
} from '../types/pacto';

const BUCKET = 'evidence';

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const signed = unwrap(await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)) as { path: string | null; signedUrl: string }[];
  return new Map(signed.filter((s) => s.path).map((s) => [s.path as string, s.signedUrl]));
}

export const api = {
  // ---- perfil
  async getProfile(userId: string): Promise<Profile> {
    return unwrap(await supabase.from('profiles').select('*').eq('id', userId).single());
  },
  async updateProfile(userId: string, patch: Partial<Pick<Profile, 'username' | 'avatar_url' | 'installed_pwa'>>) {
    unwrap(await supabase.from('profiles').update(patch).eq('id', userId));
  },
  async deleteAccount(userId: string) {
    // los archivos de Storage se borran antes: despues de borrar la cuenta ya no hay permiso
    const rows = unwrap(await supabase.from('progress').select('evidence_url').eq('user_id', userId)) as { evidence_url: string | null }[];
    const sent = unwrap(await supabase.from('sentences').select('evidence_url').eq('user_id', userId)) as { evidence_url: string | null }[];
    const paths = [...rows, ...sent].map((r) => r.evidence_url).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    unwrap(await supabase.rpc('delete_my_account'));
  },

  // ---- grupos
  async myGroups(): Promise<Group[]> {
    return unwrap(await supabase.from('groups').select('*').order('name'));
  },
  async createGroup(name: string, emoji: string): Promise<Group> {
    return unwrap(await supabase.rpc('create_group', { p_name: name, p_emoji: emoji }));
  },
  async joinGroup(code: string): Promise<Group> {
    return unwrap(await supabase.rpc('join_group', { p_code: code }));
  },
  async updateGroup(id: string, patch: { name: string; emoji: string }) {
    unwrap(await supabase.from('groups').update(patch).eq('id', id));
  },
  async groupMembers(groupId: string): Promise<{ user_id: string; role: string; username: string }[]> {
    const rows = unwrap(await supabase.from('group_members').select('user_id, role, profiles(username)').eq('group_id', groupId)) as any[];
    return rows.map((r) => ({ user_id: r.user_id, role: r.role, username: r.profiles?.username ?? '?' }));
  },

  // ---- pactos
  async closeExpired() {
    await supabase.rpc('close_expired_pactos');
  },
  async myPactos(): Promise<Pacto[]> {
    return unwrap(await supabase.from('pactos').select('*').order('end_date', { ascending: false }));
  },
  async getPacto(id: string): Promise<Pacto> {
    return unwrap(await supabase.from('pactos').select('*').eq('id', id).single());
  },
  async createPacto(input: {
    group_id: string; name: string; emoji: string; goal_type: string; target_value: number;
    frequency: string; days_per_week?: number | null; verification_type: string; end_date: string;
    punishments: { body: string; category: string; severity: number }[];
  }): Promise<Pacto> {
    return unwrap(await supabase.rpc('create_pacto', {
      p_group_id: input.group_id, p_name: input.name, p_emoji: input.emoji, p_goal_type: input.goal_type,
      p_target: input.target_value, p_frequency: input.frequency, p_days_per_week: input.days_per_week ?? null,
      p_verification: input.verification_type, p_end_date: input.end_date, p_punishments: input.punishments
    }));
  },
  async pactoMembers(pactoId: string): Promise<PactoMemberRow[]> {
    return unwrap(await supabase.from('pacto_members').select('*, profiles(username)').eq('pacto_id', pactoId));
  },
  async punishments(pactoId: string): Promise<PunishmentWithApprovals[]> {
    return unwrap(await supabase.from('punishments').select('*, punishment_approvals(*)').eq('pacto_id', pactoId).order('id'));
  },
  async proposePunishment(pactoId: string, body: string, category: string, severity: number) {
    unwrap(await supabase.rpc('propose_punishment', { p_pacto_id: pactoId, p_body: body, p_category: category, p_severity: severity }));
  },
  async votePunishment(id: string, approved: boolean): Promise<boolean> {
    return unwrap(await supabase.rpc('vote_punishment', { p_punishment_id: id, p_approved: approved }));
  },
  async signPacto(pactoId: string): Promise<boolean> {
    return unwrap(await supabase.rpc('sign_pacto', { p_pacto_id: pactoId }));
  },
  async standings(pactoId?: string): Promise<PactoStanding[]> {
    let q = supabase.from('pacto_standings').select('*');
    if (pactoId) q = q.eq('pacto_id', pactoId);
    return unwrap(await q);
  },

  // ---- evidencias
  async evidences(pactoId: string): Promise<EvidenceView[]> {
    const rows = unwrap(await supabase.from('progress').select('*, profiles(username), votes(*)')
      .eq('pacto_id', pactoId).order('server_timestamp', { ascending: false })) as any[];
    const urls = await signedUrls(rows.map((r) => r.evidence_url).filter(Boolean));
    return rows.map((r) => ({
      ...(r as Progress), username: r.profiles?.username ?? '?', votes: (r.votes ?? []) as Vote[],
      signedUrl: r.evidence_url ? urls.get(r.evidence_url) : undefined
    }));
  },
  async uploadEvidence(pactoId: string, userId: string, blob: Blob): Promise<string> {
    const path = `${pactoId}/${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw new Error(error.message);
    return path;
  },
  async submitEvidence(e: { pacto_id: string; user_id: string; evidence_url: string | null; gps_lat?: number | null; gps_lng?: number | null }) {
    unwrap(await supabase.from('progress').insert(e));
  },
  async vote(progressId: string, voterId: string, verdict: boolean) {
    unwrap(await supabase.from('votes').upsert({ progress_id: progressId, voter_id: voterId, verdict }));
  },

  // ---- juicio
  async pickSentence(pactoId: string): Promise<PickSentenceResult> {
    return unwrap(await supabase.rpc('pick_sentence', { p_pacto_id: pactoId }));
  },
  async sentences(pactoId: string): Promise<(Sentence & { profiles?: { username: string } | null; sentence_votes: { voter_id: string; verdict: boolean }[]; punishments?: { body: string } | null; signedUrl?: string })[]> {
    const rows = unwrap(await supabase.from('sentences').select('*, profiles(username), sentence_votes(*), punishments(body)').eq('pacto_id', pactoId)) as any[];
    const urls = await signedUrls(rows.map((r) => r.evidence_url).filter(Boolean));
    return rows.map((r) => ({ ...r, signedUrl: r.evidence_url ? urls.get(r.evidence_url) : undefined }));
  },
  async submitSentenceEvidence(sentenceId: string, path: string) {
    unwrap(await supabase.rpc('submit_sentence_evidence', { p_sentence_id: sentenceId, p_evidence_url: path }));
  },
  async voteSentence(sentenceId: string, verdict: boolean): Promise<string> {
    return unwrap(await supabase.rpc('vote_sentence', { p_sentence_id: sentenceId, p_verdict: verdict }));
  },
  async mySentences(userId: string): Promise<{ pacto_id: string; status: string }[]> {
    return unwrap(await supabase.from('sentences').select('pacto_id, status').eq('user_id', userId));
  },

  // ---- push
  async savePushSubscription(userId: string, sub: PushSubscription) {
    unwrap(await supabase.from('push_subscriptions').upsert({ user_id: userId, endpoint: sub.endpoint, keys: sub.toJSON().keys }));
  }
};
