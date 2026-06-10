import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { recipeFormSchema } from '../types/database'
import { useAuth } from '../hooks/use-auth'
import {
  useRecipe,
  useCreateRecipe,
  useUpdateRecipe,
} from '../hooks/use-recipes'
import RecipeFormComponent from '../components/forms/RecipeForm'
import type { RecipeFormIngredient } from '../types/database'

type FormData = z.output<typeof recipeFormSchema>

export default function RecipeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const { user } = useAuth()

  const { data: existingRecipe, isLoading: loadingRecipe } = useRecipe(
    isEdit ? id : undefined,
  )
  const createMutation = useCreateRecipe()
  const updateMutation = useUpdateRecipe()

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async ({
    recipe,
    ingredients,
  }: {
    recipe: FormData
    ingredients: RecipeFormIngredient[]
  }) => {
    setError(null)

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          recipe: {
            name: recipe.name,
            description: recipe.description || null,
            instructions: recipe.is_quick ? null : (recipe.instructions || null),
            servings: recipe.servings,
            prep_time_min: recipe.prep_time_min ?? null,
            cook_time_min: recipe.cook_time_min ?? null,
            is_quick: recipe.is_quick,
          },
          ingredients,
        })
      } else {
        await createMutation.mutateAsync({
          recipe: {
            name: recipe.name,
            description: recipe.description || null,
            instructions: recipe.is_quick ? null : (recipe.instructions || null),
            servings: recipe.servings,
            prep_time_min: recipe.prep_time_min ?? null,
            cook_time_min: recipe.cook_time_min ?? null,
            image_url: null,
            is_quick: recipe.is_quick,
          },
          ingredients,
        })
      }

      navigate('/recipes', { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save recipe'
      setError(message)
    }
  }

  if (isEdit && loadingRecipe) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-stone-400">Loading recipe…</p>
      </div>
    )
  }

  if (isEdit && existingRecipe && user && existingRecipe.created_by !== user.id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-stone-400">
          You can only edit your own recipes.
        </p>
        <button
          onClick={() => navigate(`/recipes/${id}`)}
          className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-stone-900">
        {isEdit ? 'Edit Recipe' : 'New Recipe'}
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <RecipeFormComponent
        key={existingRecipe?.id ?? 'new'}
        defaultValues={
          isEdit && existingRecipe
            ? {
                name: existingRecipe.name,
                description: existingRecipe.description,
                instructions: existingRecipe.instructions,
                servings: existingRecipe.servings,
                prep_time_min: existingRecipe.prep_time_min,
                cook_time_min: existingRecipe.cook_time_min,
                is_quick: existingRecipe.is_quick,
              }
            : undefined
        }
        defaultIngredients={
          isEdit && existingRecipe?.ingredients
            ? existingRecipe.ingredients.map((ri, i) => ({
                ingredient_id: ri.ingredient.id,
                ingredient_name: ri.ingredient.name,
                quantity: ri.quantity,
                unit: ri.unit,
                notes: ri.notes ?? undefined,
                sort_order: i,
              }))
            : []
        }
        onSubmit={handleSubmit}
        isSubmitting={
          createMutation.isPending || updateMutation.isPending
        }
        submitLabel={isEdit ? 'Save Changes' : 'Create Recipe'}
      />
    </div>
  )
}
