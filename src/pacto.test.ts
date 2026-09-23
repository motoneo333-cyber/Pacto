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

  it('R3 & Draft->Active transition: Requires unanimous punishment approvals and all signatures', () => {
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

    const members = [
      { pacto_id: 'p1', user_id: 'u1', signed: true },
      { pacto_id: 'p1', user_id: 'u2', signed: true }
    ];

    const punishments = [
      { id: 'pun1', pacto_id: 'p1', proposed_by: 'u1', body: 'Correr 10km cantando', category: 'embarrassment' as const, severity: 3 }
    ];

    // Unanimous approval
    const unanimousApprovals = [
      { punishment_id: 'pun1', user_id: 'u1', approved: true },
      { punishment_id: 'pun1', user_id: 'u2', approved: true }
    ];

    expect(PactoStateMachine.canActivate(pacto, members, punishments, unanimousApprovals).success).toBe(true);

    // Partial approval
    const partialApprovals = [
      { punishment_id: 'pun1', user_id: 'u1', approved: true },
      { punishment_id: 'pun1', user_id: 'u2', approved: false }
    ];

    expect(PactoStateMachine.canActivate(pacto, members, punishments, partialApprovals).success).toBe(false);
  });

  it('R7: Ties in evidence voting result in conservative rejection', () => {
    const evidence = {
      id: 'ev1',
      pacto_id: 'p1',
      user_id: 'owner',
      entry_date: '2025-01-01',
      server_timestamp: new Date().toISOString(),
      status: 'pending' as const
    };

    const votes = [
      { progress_id: 'ev1', voter_id: 'voter1', verdict: true },
      { progress_id: 'ev1', voter_id: 'voter2', verdict: false }
    ];

    const status = PactoStateMachine.evaluateEvidenceVotes(evidence, votes, 3);
    expect(status).toBe('rejected');
  });
});
