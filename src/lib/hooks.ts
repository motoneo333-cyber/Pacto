import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { supabase } from './supabaseClient';
import { useSession } from './session';

export const useGroups = () => {
  const { user } = useSession();
  return useQuery({ queryKey: ['groups', user?.id], queryFn: api.myGroups, enabled: !!user });
};

export const useGroupMembers = (groupId?: string) =>
  useQuery({ queryKey: ['groupMembers', groupId], queryFn: () => api.groupMembers(groupId!), enabled: !!groupId });

export const usePactos = () => {
  const { user } = useSession();
  return useQuery({ queryKey: ['pactos', user?.id], queryFn: api.myPactos, enabled: !!user });
};

export const usePacto = (id?: string) =>
  useQuery({ queryKey: ['pacto', id], queryFn: () => api.getPacto(id!), enabled: !!id });

export const usePactoMembers = (id?: string) =>
  useQuery({ queryKey: ['pactoMembers', id], queryFn: () => api.pactoMembers(id!), enabled: !!id });

export const usePunishments = (id?: string) =>
  useQuery({ queryKey: ['punishments', id], queryFn: () => api.punishments(id!), enabled: !!id });

export const useStandings = (pactoId?: string) =>
  useQuery({ queryKey: ['standings', pactoId ?? 'all'], queryFn: () => api.standings(pactoId) });

export const useEvidences = (pactoId?: string) =>
  useQuery({ queryKey: ['evidences', pactoId], queryFn: () => api.evidences(pactoId!), enabled: !!pactoId });

export const useSentences = (pactoId?: string) =>
  useQuery({ queryKey: ['sentences', pactoId], queryFn: () => api.sentences(pactoId!), enabled: !!pactoId });

/** Refresca en vivo lo que cambia en un pacto (evidencias, votos, firmas, sentencias). */
export function useRealtimePacto(pactoId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!pactoId) return;
    const refresh = () => qc.invalidateQueries();
    const ch = supabase
      .channel(`pacto_${pactoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progress', filter: `pacto_id=eq.${pactoId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacto_members', filter: `pacto_id=eq.${pactoId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sentences', filter: `pacto_id=eq.${pactoId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pactoId, qc]);
}

/** Grupo activo: el ultimo elegido si sigue existiendo, o el primero. */
export function useActiveGroup() {
  const { data: groups = [], isLoading } = useGroups();
  let saved: string | null = null;
  try { saved = localStorage.getItem('pacto_active_group'); } catch { /* sin storage */ }
  const active = groups.find((g) => g.id === saved) ?? groups[0] ?? null;
  const setActive = (id: string) => {
    try { localStorage.setItem('pacto_active_group', id); } catch { /* sin storage */ }
  };
  return { groups, active, setActive, isLoading };
}
