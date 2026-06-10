import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MealEntry } from '../types/database'

// ── Query Keys ───────────────────────────────────────

export const mealEntryKeys = {
  all: ['meal-entries'] as const,
  range: (start: string, end: string) =>
    ['meal-entries', 'range', start, end] as const,
  date: (date: string) => ['meal-entries', 'date', date] as const,
}

// ── Types ────────────────────────────────────────────

export interface MealEntryWithRecipe extends MealEntry {
  recipe: {
    id: string
    name: string
    servings: number
    is_quick: boolean
    image_url: string | null
  }
}

// ── Queries ──────────────────────────────────────────

export function useMealEntriesByDateRange(start: string, end: string) {
  return useQuery({
    queryKey: mealEntryKeys.range(start, end),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_entries')
        .select('*, recipe:recipe_id(id, name, servings, is_quick, image_url)')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

      if (error) throw error
      return data as MealEntryWithRecipe[]
    },
    enabled: !!start && !!end,
  })
}

export function useMealEntriesByDate(date: string) {
  return useQuery({
    queryKey: mealEntryKeys.date(date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_entries')
        .select('*, recipe:recipe_id(id, name, servings, is_quick, image_url)')
        .eq('date', date)
        .order('meal_slot')

      if (error) throw error
      return data as MealEntryWithRecipe[]
    },
    enabled: !!date,
  })
}

// ── Mutations ────────────────────────────────────────

export function useCreateMealEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      entry: Omit<MealEntry, 'id' | 'created_at' | 'updated_at'>,
    ) => {
      const { data, error } = await supabase
        .from('meal_entries')
        .insert(entry)
        .select()
        .single()

      if (error) throw error
      return data as MealEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealEntryKeys.all })
    },
  })
}

export function useUpdateMealEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<MealEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('meal_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as MealEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealEntryKeys.all })
    },
  })
}

export function useDeleteMealEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meal_entries')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealEntryKeys.all })
    },
  })
}
