import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Ingredient, IngredientCategory } from '../types/database'

// ── Query Keys ───────────────────────────────────────

export const ingredientKeys = {
  all: ['ingredients'] as const,
  categories: ['ingredient-categories'] as const,
}

// ── Types ────────────────────────────────────────────

export interface CategoryTreeNode extends IngredientCategory {
  children: CategoryTreeNode[]
}

// ── Ingredients ──────────────────────────────────────

export function useIngredients(search?: string) {
  return useQuery({
    queryKey: [...ingredientKeys.all, { search }],
    queryFn: async () => {
      let query = supabase
        .from('ingredients')
        .select('*, category:category_id(id, name)')
        .order('name')

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as (Ingredient & { category: { id: string; name: string } | null })[]
    },
  })
}

export function useIngredient(id: string | undefined) {
  return useQuery({
    queryKey: [...ingredientKeys.all, id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('ingredients')
        .select('*, category:category_id(id, name)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Ingredient & { category: { id: string; name: string } | null }
    },
    enabled: !!id,
  })
}

export function useCreateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>,
    ) => {
      const { data, error } = await supabase
        .from('ingredients')
        .insert(ingredient)
        .select()
        .single()

      if (error) throw error
      return data as Ingredient
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
    },
  })
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Ingredient> & { id: string }) => {
      const { data, error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Ingredient
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
    },
  })
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
    },
  })
}

// ── Categories ───────────────────────────────────────

export function useIngredientCategories() {
  return useQuery({
    queryKey: ingredientKeys.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredient_categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data as IngredientCategory[]
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: { name: string; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from('ingredient_categories')
        .insert({ name: category.name, parent_id: category.parent_id ?? null })
        .select()
        .single()

      if (error) throw error
      return data as IngredientCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.categories })
    },
  })
}

// ── Helpers ──────────────────────────────────────────

/** Build a tree from flat categories */
export function buildCategoryTree(
  categories: IngredientCategory[],
  parentId: string | null = null,
): CategoryTreeNode[] {
  return categories
    .filter((c) => c.parent_id === parentId)
    .map((c) => ({
      ...c,
      children: buildCategoryTree(categories, c.id),
    }))
}
