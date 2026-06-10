import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ingredientFormSchema,
  INGREDIENT_UNITS,
  type Ingredient,
} from '../../types/database'
import {
  useIngredientCategories,
  buildCategoryTree,
  type CategoryTreeNode,
} from '../../hooks/use-ingredients'

// Use the schema's output type so the resolver matches exactly
type FormData = z.output<typeof ingredientFormSchema>

interface IngredientFormProps {
  defaultValues?: Partial<Ingredient>
  onSubmit: (data: FormData) => Promise<void>
  isSubmitting: boolean
  submitLabel: string
}

/** Recursively render category option elements */
function renderCategoryOptions(
  items: CategoryTreeNode[],
  depth = 0,
): React.ReactNode[] {
  return items.flatMap((cat) => [
    <option key={cat.id} value={cat.id}>
      {'\u00A0'.repeat(depth * 2)}{cat.name}
    </option>,
    ...renderCategoryOptions(cat.children, depth + 1),
  ])
}

export default function IngredientForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: IngredientFormProps) {
  const { data: categories, isLoading: catsLoading } = useIngredientCategories()

  const {
    register,
    handleSubmit,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({
    resolver: zodResolver(ingredientFormSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      category_id: defaultValues?.category_id ?? null,
      calories_per_100g: defaultValues?.calories_per_100g ?? 0,
      protein_per_100g: defaultValues?.protein_per_100g ?? 0,
      carbs_per_100g: defaultValues?.carbs_per_100g ?? 0,
      fat_per_100g: defaultValues?.fat_per_100g ?? 0,
      fiber_per_100g: defaultValues?.fiber_per_100g ?? 0,
      default_unit: (defaultValues?.default_unit as FormData['default_unit']) ?? 'g',
    },
  })

  const categoryTree = categories ? buildCategoryTree(categories) : []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          placeholder="e.g. Pechuga de pollo"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category_id" className="mb-1 block text-sm font-medium text-stone-700">
          Category
        </label>
        <select
          id="category_id"
          {...register('category_id')}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">No category</option>
          {!catsLoading && renderCategoryOptions(categoryTree)}
        </select>
        {errors.category_id && (
          <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>
        )}
      </div>

      {/* Default Unit */}
      <div>
        <label htmlFor="default_unit" className="mb-1 block text-sm font-medium text-stone-700">
          Default Unit *
        </label>
        <select
          id="default_unit"
          {...register('default_unit')}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          {INGREDIENT_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        {errors.default_unit && (
          <p className="mt-1 text-xs text-red-600">{errors.default_unit.message}</p>
        )}
      </div>

      {/* Macros per 100g */}
      <div>
        <p className="mb-2 text-sm font-medium text-stone-700">
          Nutritional Values (per 100g)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="calories_per_100g" className="mb-0.5 block text-xs text-stone-500">
              Calories *
            </label>
            <input
              id="calories_per_100g"
              type="number"
              step="0.01"
              min="0"
              {...register('calories_per_100g')}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            {errors.calories_per_100g && (
              <p className="mt-0.5 text-xs text-red-600">{errors.calories_per_100g.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="protein_per_100g" className="mb-0.5 block text-xs text-stone-500">
              Protein (g)
            </label>
            <input
              id="protein_per_100g"
              type="number"
              step="0.01"
              min="0"
              {...register('protein_per_100g')}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label htmlFor="carbs_per_100g" className="mb-0.5 block text-xs text-stone-500">
              Carbs (g)
            </label>
            <input
              id="carbs_per_100g"
              type="number"
              step="0.01"
              min="0"
              {...register('carbs_per_100g')}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label htmlFor="fat_per_100g" className="mb-0.5 block text-xs text-stone-500">
              Fat (g)
            </label>
            <input
              id="fat_per_100g"
              type="number"
              step="0.01"
              min="0"
              {...register('fat_per_100g')}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label htmlFor="fiber_per_100g" className="mb-0.5 block text-xs text-stone-500">
              Fiber (g)
            </label>
            <input
              id="fiber_per_100g"
              type="number"
              step="0.01"
              min="0"
              {...register('fiber_per_100g')}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
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
