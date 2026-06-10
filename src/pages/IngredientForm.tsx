import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ingredientFormSchema } from '../types/database'
import {
  useIngredient,
  useCreateIngredient,
  useUpdateIngredient,
} from '../hooks/use-ingredients'
import IngredientFormComponent from '../components/forms/IngredientForm'

type IngredientFormData = z.output<typeof ingredientFormSchema>

export default function IngredientFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: existingIngredient, isLoading: loadingIngredient } =
    useIngredient(isEdit ? id : undefined)
  const createMutation = useCreateIngredient()
  const updateMutation = useUpdateIngredient()

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: IngredientFormData) => {
    setError(null)

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          name: data.name,
          category_id: data.category_id ?? null,
          calories_per_100g: data.calories_per_100g,
          protein_per_100g: data.protein_per_100g,
          carbs_per_100g: data.carbs_per_100g,
          fat_per_100g: data.fat_per_100g,
          fiber_per_100g: data.fiber_per_100g,
          default_unit: data.default_unit,
        })
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          category_id: data.category_id ?? null,
          calories_per_100g: data.calories_per_100g,
          protein_per_100g: data.protein_per_100g,
          carbs_per_100g: data.carbs_per_100g,
          fat_per_100g: data.fat_per_100g,
          fiber_per_100g: data.fiber_per_100g,
          default_unit: data.default_unit,
        })
      }

      navigate('/ingredients', { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save ingredient'
      setError(message)
    }
  }

  if (isEdit && loadingIngredient) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-stone-400">Loading ingredient…</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-stone-900">
        {isEdit ? 'Edit Ingredient' : 'New Ingredient'}
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <IngredientFormComponent
        key={existingIngredient?.id ?? 'new'}
        defaultValues={
          isEdit && existingIngredient
            ? {
                name: existingIngredient.name,
                category_id: existingIngredient.category?.id ?? null,
                calories_per_100g: existingIngredient.calories_per_100g,
                protein_per_100g: existingIngredient.protein_per_100g,
                carbs_per_100g: existingIngredient.carbs_per_100g,
                fat_per_100g: existingIngredient.fat_per_100g,
                fiber_per_100g: existingIngredient.fiber_per_100g,
                default_unit: existingIngredient.default_unit,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={isEdit ? 'Save Changes' : 'Create Ingredient'}
      />
    </div>
  )
}
