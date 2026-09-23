import { create } from 'zustand';
import { supabase } from './lib/supabaseClient';
import { Profile, Pacto, Progress, Sentence } from './types/pacto';

interface PactoStore {
  currentUser: Profile | null;
  pactos: Pacto[];
  evidences: Progress[];
  sentences: Sentence[];
  setCurrentUser: (user: Profile | null) => void;
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
    set((state) => ({ pactos: [newPacto, ...state.pactos] }));
    try {
      await supabase.from('pactos').insert(newPacto);
    } catch (err) {
      console.warn('Stored pacto locally (demo mode)');
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
    const newEv = {
      id: `ev-${Date.now()}`,
      pacto_id: evidence.pacto_id || 'p1',
      user_id: evidence.user_id || 'user-demo-id',
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
      console.warn('Stored evidence locally (demo mode)');
    }
  }
}));
