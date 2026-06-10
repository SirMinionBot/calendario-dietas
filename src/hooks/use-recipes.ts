import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Recipe, RecipeIngredient } from '../types/database'
import type { RecipeFormIngredient } from '../types/database'

// ── Query Keys ───────────────────────────────────────

export const recipeKeys = {
  all: ['recipes'] as const,
  detail: (id: string) => ['recipes', id] as const,
}

// ── Types ────────────────────────────────────────────

export interface RecipeWithIngredients extends Recipe {
  ingredients: (RecipeIngredient & {
    ingredient: {
      id: string
      name: string
      calories_per_100g: number
      protein_per_100g: number
      carbs_per_100g: number
      fat_per_100g: number
      fiber_per_100g: number
      default_unit: string
    }
  })[]
  creator_email?: string
}

// ── Recipes ──────────────────────────────────────────

export function useRecipes(search?: string) {
  return useQuery({
    queryKey: [...recipeKeys.all, { search }],
    queryFn: async () => {
      let query = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Recipe[]
    },
  })
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error('Recipe ID is required')

      // Fetch recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (recipeError) throw recipeError

      // Fetch ingredients with full ingredient data
      const { data: ingredients, error: ingError } = await supabase
        .from('recipe_ingredients')
        .select('*, ingredient:ingredient_id(*)')
        .eq('recipe_id', id)
        .order('sort_order')

      if (ingError) throw ingError

      return {
        ...recipe,
        ingredients: ingredients as RecipeWithIngredients['ingredients'],
      } as RecipeWithIngredients
    },
    enabled: !!id,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      recipe,
      ingredients,
    }: {
      recipe: Omit<Recipe, 'id' | 'created_by' | 'created_at' | 'updated_at'>
      ingredients: RecipeFormIngredient[]
    }) => {
      // Insert recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert(recipe)
        .select()
        .single()

      if (recipeError) throw recipeError

      // Insert ingredients
      if (ingredients.length > 0) {
        const recipeIngredients = ingredients.map((ing) => ({
          recipe_id: newRecipe.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || null,
          sort_order: ing.sort_order,
        }))

        const { error: ingError } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredients)

        if (ingError) throw ingError
      }

      return newRecipe as Recipe
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      recipe,
      ingredients,
    }: {
      id: string
      recipe: Partial<Recipe>
      ingredients?: RecipeFormIngredient[]
    }) => {
      // Update recipe
      const { data: updatedRecipe, error: recipeError } = await supabase
        .from('recipes')
        .update(recipe)
        .eq('id', id)
        .select()
        .single()

      if (recipeError) throw recipeError

      // If ingredients provided, replace them
      if (ingredients) {
        // Delete existing ingredients
        const { error: deleteError } = await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', id)

        if (deleteError) throw deleteError

        // Insert new ingredients
        if (ingredients.length > 0) {
          const recipeIngredients = ingredients.map((ing) => ({
            recipe_id: id,
            ingredient_id: ing.ingredient_id,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes || null,
            sort_order: ing.sort_order,
          }))

          const { error: ingError } = await supabase
            .from('recipe_ingredients')
            .insert(recipeIngredients)

          if (ingError) throw ingError
        }
      }

      return updatedRecipe as Recipe
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      queryClient.invalidateQueries({
        queryKey: recipeKeys.detail(variables.id),
      })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}
