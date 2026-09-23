import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { api } from './api';
import { syncOfflineEvidences } from './offlineQueue';
import type { Profile } from '../types/pacto';

interface SessionState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionState>({ user: null, profile: null, loading: true, signOut: async () => {} });
export const useSession = () => useContext(Ctx);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session) qc.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const profileQ = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => api.getProfile(user!.id),
    enabled: !!user,
    // el trigger de auth crea el perfil un instante despues del registro
    retry: 3,
    retryDelay: 800
  });

  // al abrir la app con sesion: cierra pactos vencidos y reenvia evidencias en cola
  useEffect(() => {
    if (!user) return;
    api.closeExpired().then(() => qc.invalidateQueries({ queryKey: ['pactos'] })).catch(() => {});
    const sync = () => syncOfflineEvidences().then((n) => { if (n) qc.invalidateQueries(); }).catch(() => {});
    sync();
    const onOnline = sync;
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [user, qc]);

  const value: SessionState = {
    user,
    profile: profileQ.data ?? null,
    loading: !ready || (!!user && profileQ.isLoading),
    signOut: async () => {
      await supabase.auth.signOut();
    }
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
