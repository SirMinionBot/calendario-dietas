import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './use-auth'
import type { Profile, ProfileUpdate } from '../types/database'

// ── Query Keys ───────────────────────────────────────

export const profileKeys = {
  detail: (userId: string) => ['profile', userId] as const,
}

// ── Queries ──────────────────────────────────────────

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: profileKeys.detail(user?.id ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
  })
}

// ── Mutations ────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) })
      }
    },
  })
}
