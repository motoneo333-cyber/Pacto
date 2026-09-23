import { Pacto, PactoMember, Punishment, PunishmentApproval, Progress, Vote } from './types/pacto';

export interface StateMachineResult {
  success: boolean;
  error?: string;
}

export class PactoStateMachine {
  static canActivate(
    pacto: Pacto,
    members: PactoMember[],
    punishments: Punishment[],
    approvals: PunishmentApproval[]
  ): StateMachineResult {
    if (pacto.status !== 'draft') {
      return { success: false, error: 'El pacto no está en borrador (draft)' };
    }

    if (members.length < 2) {
      return { success: false, error: 'Se requieren al menos 2 miembros (R1-R3)' };
    }

    const now = new Date();
    if (new Date(pacto.end_date) <= now) {
      return { success: false, error: 'La fecha de fin debe ser futura' };
    }

    const allSigned = members.every((m) => m.signed);
    if (!allSigned) {
      return { success: false, error: 'Todos los miembros deben firmar el pacto' };
    }

    const activeMemberIds = members.map((m) => m.user_id);
    const validPunishments = punishments.filter((p) => {
      const pApprovals = approvals.filter((a) => a.punishment_id === p.id && a.approved);
      return activeMemberIds.every((userId) => pApprovals.some((a) => a.user_id === userId));
    });

    if (validPunishments.length < 1) {
      return { success: false, error: 'Se requiere al menos 1 castigo aprobado por unanimidad (R3)' };
    }

    return { success: true };
  }

  static evaluateEvidenceVotes(
    evidence: Progress,
    votes: Vote[],
    totalGroupMembers: number
  ): 'pending' | 'approved' | 'rejected' {
    const validVotes = votes.filter((v) => v.voter_id !== evidence.user_id);
    const totalVotesCast = validVotes.length;

    const positiveVotes = validVotes.filter((v) => v.verdict).length;
    const negativeVotes = validVotes.filter((v) => !v.verdict).length;

    const votersCountNeeded = totalGroupMembers - 1;

    if (positiveVotes > votersCountNeeded / 2) {
      return 'approved';
    }

    if (negativeVotes >= votersCountNeeded / 2 || (totalVotesCast === votersCountNeeded && positiveVotes <= negativeVotes)) {
      return 'rejected';
    }

    return 'pending';
  }
}
