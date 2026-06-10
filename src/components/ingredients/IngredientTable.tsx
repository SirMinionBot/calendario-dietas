import { Link } from 'react-router-dom'
import type { Ingredient } from '../../types/database'

interface IngredientWithCategory extends Ingredient {
  category: { id: string; name: string } | null
}

interface IngredientTableProps {
  ingredients: IngredientWithCategory[] | undefined
  isLoading: boolean
  onDelete: (id: string) => void
  isDeleting: boolean
}

export default function IngredientTable({
  ingredients,
  isLoading,
  onDelete,
  isDeleting,
}: IngredientTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-stone-100"
          />
        ))}
      </div>
    )
  }

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-stone-400">No ingredients found</p>
        <p className="mt-1 text-xs text-stone-300">
          Create your first ingredient to get started
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-stone-100">
      {ingredients.map((ingredient) => (
        <div
          key={ingredient.id}
          className="flex items-center justify-between py-3"
        >
          <div className="min-w-0 flex-1">
            <Link
              to={`/ingredients/${ingredient.id}/edit`}
              className="text-sm font-medium text-stone-900 hover:text-emerald-600"
            >
              {ingredient.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-400">
              {ingredient.category && (
                <span>{ingredient.category.name}</span>
              )}
              <span>{ingredient.calories_per_100g} cal/100g</span>
              <span className="text-stone-300">P:{ingredient.protein_per_100g}g</span>
              <span className="text-stone-300">C:{ingredient.carbs_per_100g}g</span>
              <span className="text-stone-300">F:{ingredient.fat_per_100g}g</span>
            </div>
          </div>

          <button
            onClick={() => onDelete(ingredient.id)}
            disabled={isDeleting}
            className="ml-3 flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            aria-label={`Delete ${ingredient.name}`}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
