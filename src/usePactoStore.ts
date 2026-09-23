import { create } from 'zustand';
import { supabase } from './lib/supabaseClient';
import { Profile, Pacto, Progress, Sentence, Group } from './types/pacto';

interface PactoStore {
  currentUser: Profile | null;
  groups: Group[];
  pactos: Pacto[];
  evidences: Progress[];
  sentences: Sentence[];
  setCurrentUser: (user: Profile | null) => void;
  fetchGroups: () => Promise<void>;
  addGroup: (newGroup: Group) => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  fetchPactos: () => Promise<void>;
  addPacto: (newPacto: Pacto) => Promise<void>;
  fetchEvidences: (pactoId: string) => Promise<void>;
  addEvidence: (evidence: Partial<Progress>) => Promise<void>;
}

export const usePactoStore = create<PactoStore>((set, get) => ({
  currentUser: {
    id: 'user-demo-id',
    username: 'carlos_fit',
    honor_points: 120,
    shame_count: 1,
    installed_pwa: true
  },
  groups: [
    {
      id: 'g1',
      name: 'Los Inquebrantables',
      emoji: '🛡️',
      invite_code: 'PACTO2025',
      created_by: 'user-demo-id'
    }
  ],
  pactos: [
    {
      id: 'p1',
      group_id: 'g1',
      name: 'Ejercicio Matutino',
      emoji: '🏋️‍♂️',
      goal_type: 'habit',
      target_value: 5,
      frequency: 'daily',
      verification_type: 'strict_photo',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 86400000).toISOString()
    }
  ],
  evidences: [],
  sentences: [],

  setCurrentUser: (user) => set({ currentUser: user }),

  fetchGroups: async () => {
    try {
      const currentUser = get().currentUser;
      const { data, error } = await supabase.from('groups').select('*');
      if (!error && data && data.length > 0) {
        set({ groups: data as Group[] });
      } else if (currentUser) {
        // Dynamic initial group if none exists yet for real logged-in user
        const dynamicGroup: Group = {
          id: `group-${currentUser.id.slice(0, 8)}`,
          name: `Grupo de ${currentUser.username}`,
          emoji: '🔥',
          invite_code: `P${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          created_by: currentUser.id
        };
        set((state) => ({
          groups: state.groups.some((g) => g.id === dynamicGroup.id) ? state.groups : [dynamicGroup, ...state.groups]
        }));
      }
    } catch (err) {
      console.warn('Using local fallback for fetchGroups');
    }
  },

  addGroup: async (newGroup) => {
    const currentUser = get().currentUser;
    const groupWithUser = {
      ...newGroup,
      created_by: currentUser?.id || newGroup.created_by
    };

    set((state) => ({ groups: [groupWithUser, ...state.groups] }));
    try {
      await supabase.from('groups').insert(groupWithUser);
      if (currentUser?.id) {
        await supabase.from('group_members').insert({
          group_id: groupWithUser.id,
          user_id: currentUser.id,
          role: 'admin'
        });
      }
    } catch (err) {
      console.warn('Stored group locally');
    }
  },

  updateGroup: async (groupId, updates) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    }));
    try {
      await supabase.from('groups').update(updates).eq('id', groupId);
    } catch (err) {
      console.warn('Updated group locally');
    }
  },

  fetchPactos: async () => {
    try {
      const { data, error } = await supabase.from('pactos').select('*');
      if (!error && data && data.length > 0) {
        set({ pactos: data as Pacto[] });
      }
    } catch (err) {
      console.warn('Using local fallback for fetchPactos');
    }
  },

  addPacto: async (newPacto) => {
    const currentUser = get().currentUser;
    set((state) => ({ pactos: [newPacto, ...state.pactos] }));
    try {
      await supabase.from('pactos').insert(newPacto);
      if (currentUser?.id) {
        await supabase.from('pacto_members').insert({
          pacto_id: newPacto.id,
          user_id: currentUser.id,
          signed: true,
          signed_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Stored pacto locally');
    }
  },

  fetchEvidences: async (pactoId) => {
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('pacto_id', pactoId);
      if (!error && data) {
        set({ evidences: data as Progress[] });
      }
    } catch (err) {
      console.warn('Using local fallback for fetchEvidences');
    }
  },

  addEvidence: async (evidence) => {
    const currentUser = get().currentUser;
    const newEv = {
      id: `ev-${Date.now()}`,
      pacto_id: evidence.pacto_id || 'p1',
      user_id: currentUser?.id || evidence.user_id || 'user-demo-id',
      entry_date: new Date().toISOString().split('T')[0],
      evidence_url: evidence.evidence_url,
      gps_lat: evidence.gps_lat,
      gps_lng: evidence.gps_lng,
      server_timestamp: new Date().toISOString(),
      status: 'pending' as const
    };

    set((state) => ({ evidences: [newEv, ...state.evidences] }));
    try {
      await supabase.from('progress').insert(newEv);
    } catch (err) {
      console.warn('Stored evidence locally');
    }
  }
}));
