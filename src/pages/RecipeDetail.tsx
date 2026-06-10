import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { useRecipe, useDeleteRecipe } from '../hooks/use-recipes'
import NutritionPanel from '../components/recipes/NutritionPanel'
import {
  computeRecipeNutrition,
  DEFAULT_GOALS,
} from '../lib/nutrition'
import type { MacroValues } from '../lib/nutrition'

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: recipe, isLoading, error } = useRecipe(id)
  const deleteMutation = useDeleteRecipe()

  // Compute per-serving nutrition
  const recipeNutrition = useMemo<MacroValues | null>(() => {
    if (!recipe?.ingredients || recipe.ingredients.length === 0) return null
    return computeRecipeNutrition(
      recipe.ingredients.map((ri) => ({
        ingredient: {
          calories_per_100g: ri.ingredient.calories_per_100g,
          protein_per_100g: ri.ingredient.protein_per_100g,
          carbs_per_100g: ri.ingredient.carbs_per_100g,
          fat_per_100g: ri.ingredient.fat_per_100g,
          fiber_per_100g: ri.ingredient.fiber_per_100g,
        },
        quantity: ri.quantity,
      })),
      recipe.servings,
    )
  }, [recipe])

  const nutritionGoals: MacroValues = DEFAULT_GOALS

  const isOwner = user && recipe?.created_by === user.id

  const handleDelete = async () => {
    if (!id || !recipe) return
    if (
      !window.confirm(
        `Delete "${recipe.name}"? This will also remove all meal entries using this recipe.`,
      )
    )
      return

    try {
      await deleteMutation.mutateAsync(id)
      navigate('/recipes', { replace: true })
    } catch {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-stone-100" />
        <div className="h-4 w-32 animate-pulse rounded bg-stone-100" />
        <div className="mt-6 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-stone-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-stone-400">
          {error instanceof Error ? error.message : 'Recipe not found'}
        </p>
        <button
          onClick={() => navigate('/recipes')}
          className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Back to recipes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-stone-900">
              {recipe.name}
            </h2>
            {recipe.description && (
              <p className="mt-1 text-sm text-stone-500">
                {recipe.description}
              </p>
            )}
          </div>
          {recipe.is_quick && (
            <span className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Quick
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
          <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
          {recipe.prep_time_min != null && (
            <span>Prep: {recipe.prep_time_min} min</span>
          )}
          {recipe.cook_time_min != null && (
            <span>Cook: {recipe.cook_time_min} min</span>
          )}
        </div>
      </div>

      {/* Owner actions */}
      {isOwner && (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/recipes/${id}/edit`)}
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-200"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}

      {/* Nutrition Panel */}
      {recipeNutrition && (
        <NutritionPanel
          macros={recipeNutrition}
          goals={nutritionGoals}
          showGoals={true}
        />
      )}

      {/* Ingredients */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-stone-700">
          Ingredients
        </h3>
        {recipe.ingredients && recipe.ingredients.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {recipe.ingredients.map((ri) => (
              <div
                key={ri.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-stone-900">
                  {ri.ingredient.name}
                </span>
                <span className="text-xs text-stone-500">
                  {ri.quantity} {ri.unit}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">No ingredients listed</p>
        )}
      </div>

      {/* Instructions */}
      {recipe.is_quick ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            Quick dish — no instructions needed
          </p>
        </div>
      ) : recipe.instructions ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-700">
            Instructions
          </h3>
          <div className="whitespace-pre-line text-sm text-stone-600">
            {recipe.instructions}
          </div>
        </div>
      ) : null}
    </div>
  )
}
