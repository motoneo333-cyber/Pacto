import { z } from 'zod';

export type GoalType = 'habit' | 'quantitative' | 'abstinence';
export type Frequency = 'daily' | 'weekly' | 'x_days_per_week';
export type VerificationType = 'strict_photo' | 'integration' | 'honor_code';
export type PactoStatus = 'draft' | 'active' | 'judging' | 'completed';
export type EvidenceStatus = 'pending' | 'approved' | 'rejected';
export type SentenceStatus = 'assigned' | 'fulfilled' | 'failed';
export type PunishmentCategory = 'money' | 'embarrassment' | 'service' | 'random';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  honor_points: number;
  shame_count: number;
  installed_pwa: boolean;
}

export interface Group {
  id: string;
  name: string;
  emoji?: string;
  invite_code: string;
  created_by: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
}

export interface Pacto {
  id: string;
  group_id: string;
  name: string;
  emoji?: string;
  goal_type: GoalType;
  target_value: number;
  frequency: Frequency;
  days_per_week?: number;
  verification_type: VerificationType;
  status: PactoStatus;
  start_date: string;
  end_date: string;
}

export interface PactoMember {
  pacto_id: string;
  user_id: string;
  signed: boolean;
  signed_at?: string;
}

export interface Punishment {
  id: string;
  pacto_id: string;
  proposed_by: string;
  body: string;
  category: PunishmentCategory;
  severity: number;
}

export interface PunishmentApproval {
  punishment_id: string;
  user_id: string;
  approved: boolean;
}

export interface Progress {
  id: string;
  pacto_id: string;
  user_id: string;
  entry_date: string;
  evidence_url?: string;
  gps_lat?: number;
  gps_lng?: number;
  server_timestamp: string;
  status: EvidenceStatus;
}

export interface Vote {
  progress_id: string;
  voter_id: string;
  verdict: boolean;
}

export interface Sentence {
  id: string;
  pacto_id: string;
  user_id: string;
  punishment_id: string;
  outcome: 'failed' | 'failed_kitty';
  status: SentenceStatus;
  assigned_at: string;
  deadline: string;
  evidence_url?: string;
  random_seed: string;
}

export interface KittyTx {
  id: string;
  pacto_id: string;
  user_id: string;
  amount: number;
  reason: string;
  settled: boolean;
}

// Zod Schemas enforcing Invariants (R1, R2, R3)
export const PactoCreateSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  emoji: z.string().optional(),
  group_id: z.string().uuid(),
  goal_type: z.enum(['habit', 'quantitative', 'abstinence']),
  target_value: z.number().int().positive('El objetivo debe ser mayor a 0'),
  frequency: z.enum(['daily', 'weekly', 'x_days_per_week']),
  days_per_week: z.number().int().min(1).max(7).optional(),
  verification_type: z.enum(['strict_photo', 'integration', 'honor_code']),
  start_date: z.string().datetime(),
  end_date: z.string().datetime()
}).superRefine((data, ctx) => {
  if (data.goal_type === 'abstinence' && data.frequency !== 'daily') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Para abstinence, la frecuencia debe ser obligatoriamente daily (R2)',
      path: ['frequency']
    });
  }

  if (new Date(data.end_date) <= new Date(data.start_date)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha de fin debe ser posterior a la fecha de inicio',
      path: ['end_date']
    });
  }

  if (data.frequency === 'x_days_per_week' && !data.days_per_week) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe especificar los días por semana',
      path: ['days_per_week']
    });
  }
});

export const PunishmentCreateSchema = z.object({
  body: z.string().min(10, 'El castigo debe tener al menos 10 caracteres').max(200, 'Máximo 200 caracteres'),
  category: z.enum(['money', 'embarrassment', 'service', 'random']),
  severity: z.number().int().min(1).max(5)
});

export interface PactoStanding {
  pacto_id: string;
  user_id: string;
  username: string;
  approved: number;
  pending: number;
  target: number;
  met: boolean;
}

export interface PactoMemberRow extends PactoMember {
  profiles?: { username: string } | null;
}

export interface PunishmentWithApprovals extends Punishment {
  punishment_approvals: PunishmentApproval[];
}

export interface EvidenceView extends Progress {
  username: string;
  signedUrl?: string;
  votes: Vote[];
}

export interface PickSentenceResult {
  sentence: Sentence;
  punishment: Punishment;
  already: boolean;
  candidates?: Punishment[];
}
