import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  recipeFormSchema,
  type RecipeFormIngredient,
  type Recipe,
} from '../../types/database'
import { useIngredients } from '../../hooks/use-ingredients'

type FormData = z.output<typeof recipeFormSchema>

interface RecipeFormComponentProps {
  defaultValues?: Partial<Recipe>
  defaultIngredients?: RecipeFormIngredient[]
  onSubmit: (data: {
    recipe: FormData
    ingredients: RecipeFormIngredient[]
  }) => Promise<void>
  isSubmitting: boolean
  submitLabel: string
}

export default function RecipeFormComponent({
  defaultValues,
  defaultIngredients = [],
  onSubmit,
  isSubmitting,
  submitLabel,
}: RecipeFormComponentProps) {
  const [ingredients, setIngredients] =
    useState<RecipeFormIngredient[]>(defaultIngredients)
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const { data: allIngredients } = useIngredients(ingredientSearch || undefined)

  // Form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({
    resolver: zodResolver(recipeFormSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      instructions: defaultValues?.instructions ?? '',
      servings: defaultValues?.servings ?? 1,
      prep_time_min: defaultValues?.prep_time_min ?? null,
      cook_time_min: defaultValues?.cook_time_min ?? null,
      is_quick: defaultValues?.is_quick ?? false,
    },
  })

  const isQuick = watch('is_quick')

  // Ingredient picker
  const addIngredient = (
    ingredientId: string,
    ingredientName: string,
    defaultUnit: string,
  ) => {
    if (ingredients.some((i) => i.ingredient_id === ingredientId)) return

    setIngredients((prev) => [
      ...prev,
      {
        ingredient_id: ingredientId,
        ingredient_name: ingredientName,
        quantity: 100,
        unit: defaultUnit,
        sort_order: prev.length,
      },
    ])
    setShowPicker(false)
    setIngredientSearch('')
  }

  const removeIngredient = (index: number) => {
    setIngredients((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((ing, i) => ({ ...ing, sort_order: i })),
    )
  }

  const updateIngredient = (
    index: number,
    field: 'quantity' | 'unit',
    value: number | string,
  ) => {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing,
      ),
    )
  }

  const handleFormSubmit = (data: FormData) => {
    onSubmit({ recipe: data, ingredients })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
          Name *
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          placeholder="e.g. Pollo a la plancha"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-stone-700">
          Description
        </label>
        <input
          id="description"
          type="text"
          {...register('description')}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          placeholder="Brief description"
        />
      </div>

      {/* Servings & Times */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="servings" className="mb-1 block text-xs font-medium text-stone-700">
            Servings *
          </label>
          <input
            id="servings"
            type="number"
            min="1"
            {...register('servings')}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          {errors.servings && (
            <p className="mt-0.5 text-xs text-red-600">{errors.servings.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="prep_time_min" className="mb-1 block text-xs font-medium text-stone-700">
            Prep (min)
          </label>
          <input
            id="prep_time_min"
            type="number"
            min="0"
            {...register('prep_time_min')}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="cook_time_min" className="mb-1 block text-xs font-medium text-stone-700">
            Cook (min)
          </label>
          <input
            id="cook_time_min"
            type="number"
            min="0"
            {...register('cook_time_min')}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="0"
          />
        </div>
      </div>

      {/* Quick dish */}
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          {...register('is_quick')}
          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
        />
        Quick dish (no instructions needed)
      </label>

      {/* Instructions (hidden if quick) */}
      {!isQuick && (
        <div>
          <label htmlFor="instructions" className="mb-1 block text-sm font-medium text-stone-700">
            Instructions
          </label>
          <textarea
            id="instructions"
            rows={5}
            {...register('instructions')}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="1. Step one&#10;2. Step two&#10;3. ..."
          />
        </div>
      )}

      {/* ── Ingredients ──────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700">Ingredients</h3>
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {showPicker ? 'Cancel' : '+ Add ingredient'}
          </button>
        </div>

        {/* Ingredient picker */}
        {showPicker && (
          <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <input
              type="search"
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
              placeholder="Search ingredients…"
              autoFocus
              className="mb-2 w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {allIngredients?.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  disabled={ingredients.some(
                    (i) => i.ingredient_id === ing.id,
                  )}
                  onClick={() =>
                    addIngredient(ing.id, ing.name, ing.default_unit)
                  }
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-xs text-stone-700 hover:bg-stone-200 disabled:cursor-not-allowed disabled:text-stone-300"
                >
                  <span>{ing.name}</span>
                  <span className="text-stone-400">
                    {ing.calories_per_100g} cal/100g
                    {ingredients.some((i) => i.ingredient_id === ing.id) &&
                      ' \u2713'}
                  </span>
                </button>
              ))}
              {allIngredients?.length === 0 && (
                <p className="py-2 text-center text-xs text-stone-400">
                  No ingredients found
                </p>
              )}
            </div>
          </div>
        )}

        {/* Added ingredients */}
        {ingredients.length === 0 ? (
          <p className="text-xs text-stone-400">
            No ingredients added yet
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {ingredients.map((ing, index) => (
              <div
                key={`${ing.ingredient_id}-${index}`}
                className="flex items-center gap-2 py-2"
              >
                <span className="min-w-0 flex-1 text-sm text-stone-900">
                  {ing.ingredient_name}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(
                      index,
                      'quantity',
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-xs text-right focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <select
                  value={ing.unit}
                  onChange={(e) =>
                    updateIngredient(index, 'unit', e.target.value)
                  }
                  className="w-16 rounded-lg border border-stone-300 px-1 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="piece">piece</option>
                  <option value="tsp">tsp</option>
                  <option value="tbsp">tbsp</option>
                  <option value="cup">cup</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="flex-shrink-0 text-stone-400 hover:text-red-500"
                  aria-label={`Remove ${ing.ingredient_name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
