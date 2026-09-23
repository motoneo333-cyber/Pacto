import { describe, it, expect } from 'vitest';
import { PactoCreateSchema } from './types/pacto';
import { PactoStateMachine } from './stateMachine';

describe('PACTO Invariants & Business Rules Tests', () => {
  it('R2: Rejects abstinence goal type if frequency is not daily', () => {
    const invalidData = {
      name: 'Sin Azúcar',
      group_id: '123e4567-e89b-12d3-a456-426614174000',
      goal_type: 'abstinence',
      target_value: 30,
      frequency: 'weekly',
      verification_type: 'strict_photo',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString()
    };

    const result = PactoCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('R2: Accepts abstinence goal type with daily frequency', () => {
    const validData = {
      name: 'Sin Azúcar',
      group_id: '123e4567-e89b-12d3-a456-426614174000',
      goal_type: 'abstinence',
      target_value: 30,
      frequency: 'daily',
      verification_type: 'strict_photo',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString()
    };

    const result = PactoCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('canActivate: Rejects pact activation if end_date is in the past', () => {
    const pacto = {
      id: 'p1',
      group_id: 'g1',
      name: 'Ejercicio',
      goal_type: 'habit' as const,
      target_value: 10,
      frequency: 'daily' as const,
      verification_type: 'strict_photo' as const,
      status: 'draft' as const,
      start_date: new Date(Date.now() - 86400000 * 10).toISOString(),
      end_date: new Date(Date.now() - 86400000).toISOString()
    };

    const members = [
      { pacto_id: 'p1', user_id: 'u1', signed: true },
      { pacto_id: 'p1', user_id: 'u2', signed: true }
    ];

    const punishments = [
      { id: 'pun1', pacto_id: 'p1', proposed_by: 'u1', body: 'Correr 10km cantando', category: 'embarrassment' as const, severity: 3 }
    ];

    const approvals = [
      { punishment_id: 'pun1', user_id: 'u1', approved: true },
      { punishment_id: 'pun1', user_id: 'u2', approved: true }
    ];

    const res = PactoStateMachine.canActivate(pacto, members, punishments, approvals);
    expect(res.success).toBe(false);
    expect(res.error).toContain('futura');
  });

  it('canActivate: Rejects activation if fewer than 2 members or unsigned member', () => {
    const pacto = {
      id: 'p1',
      group_id: 'g1',
      name: 'Ejercicio',
      goal_type: 'habit' as const,
      target_value: 10,
      frequency: 'daily' as const,
      verification_type: 'strict_photo' as const,
      status: 'draft' as const,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000 * 7).toISOString()
    };

    const singleMember = [{ pacto_id: 'p1', user_id: 'u1', signed: true }];
    const unsignedMembers = [
      { pacto_id: 'p1', user_id: 'u1', signed: true },
      { pacto_id: 'p1', user_id: 'u2', signed: false }
    ];

    const punishments = [
      { id: 'pun1', pacto_id: 'p1', proposed_by: 'u1', body: 'Correr 10km cantando', category: 'embarrassment' as const, severity: 3 }
    ];

    const approvals = [
      { punishment_id: 'pun1', user_id: 'u1', approved: true },
      { punishment_id: 'pun1', user_id: 'u2', approved: true }
    ];

    expect(PactoStateMachine.canActivate(pacto, singleMember, punishments, approvals).success).toBe(false);
    expect(PactoStateMachine.canActivate(pacto, unsignedMembers, punishments, approvals).success).toBe(false);
  });

  describe('evaluateEvidenceVotes across group sizes (2, 3, 4, 5 members)', () => {
    const evidence = {
      id: 'ev1',
      pacto_id: 'p1',
      user_id: 'owner',
      entry_date: '2025-01-01',
      server_timestamp: new Date().toISOString(),
      status: 'pending' as const
    };

    it('2 total members (1 voter needed): 1 positive -> approved, 1 negative -> rejected', () => {
      const posVotes = [{ progress_id: 'ev1', voter_id: 'voter1', verdict: true }];
      const negVotes = [{ progress_id: 'ev1', voter_id: 'voter1', verdict: false }];

      expect(PactoStateMachine.evaluateEvidenceVotes(evidence, posVotes, 2)).toBe('approved');
      expect(PactoStateMachine.evaluateEvidenceVotes(evidence, negVotes, 2)).toBe('rejected');
    });

    it('3 total members (2 voters needed): 1 vs 1 tie -> conservative rejection (R7)', () => {
      const tieVotes = [
        { progress_id: 'ev1', voter_id: 'voter1', verdict: true },
        { progress_id: 'ev1', voter_id: 'voter2', verdict: false }
      ];

      expect(PactoStateMachine.evaluateEvidenceVotes(evidence, tieVotes, 3)).toBe('rejected');
    });

    it('4 total members (3 voters needed): 2 positive -> approved, 2 negative -> rejected', () => {
      const approvedVotes = [
        { progress_id: 'ev1', voter_id: 'voter1', verdict: true },
        { progress_id: 'ev1', voter_id: 'voter2', verdict: true }
      ];
      const rejectedVotes = [
        { progress_id: 'ev1', voter_id: 'voter1', verdict: false },
        { progress_id: 'ev1', voter_id: 'voter2', verdict: false }
      ];

      expect(PactoStateMachine.evaluateEvidenceVotes(evidence, approvedVotes, 4)).toBe('approved');
      expect(PactoStateMachine.evaluateEvidenceVotes(evidence, rejectedVotes, 4)).toBe('rejected');
    });

    it('5 total members (4 voters needed): 3 positive -> approved, 2 negative -> rejected', () => {
      const approvedVotes = [
        { progress_id: 'ev1', voter_id: 'voter1', verdict: true },
        { progress_id: 'ev1', voter_id: 'voter2', verdict: true },
        { progress_id: 'ev1', voter_id: 'voter3', verdict: true }
      ];
      const rejectedVotes = [
        { progress_id: 'ev1', voter_id: 'voter1', verdict: false },
        { progress_id: 'ev1', voter_id: 'voter2', verdict: false }
      ];

      expect(PactoStateMachine.evaluateEvidenceVotes(evidence, approvedVotes, 5)).toBe('approved');
      expect(PactoStateMachine.evaluateEvidenceVotes(evidence, rejectedVotes, 5)).toBe('rejected');
    });
  });
});
