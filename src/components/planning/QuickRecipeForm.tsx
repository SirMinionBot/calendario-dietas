import { useState } from 'react'
import { useCreateRecipe } from '../../hooks/use-recipes'

interface QuickRecipeFormProps {
  onSaved: (recipeId: string, recipeName: string) => void
  onCancel: () => void
}

export default function QuickRecipeForm({ onSaved, onCancel }: QuickRecipeFormProps) {
  const createRecipe = useCreateRecipe()

  const [name, setName] = useState('')
  const [servings, setServings] = useState(1)
  const [isQuick, setIsQuick] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('El nombre de la receta es obligatorio')
      return
    }

    setIsSubmitting(true)
    try {
      const recipe = await createRecipe.mutateAsync({
        recipe: {
          name: name.trim(),
          description: null,
          instructions: null,
          servings,
          prep_time_min: null,
          cook_time_min: null,
          image_url: null,
          is_quick: isQuick,
        },
        ingredients: [],
      })
      onSaved(recipe.id, recipe.name)
    } catch (err) {
      console.error('Failed to create recipe:', err)
      setError('Error al crear la receta')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-stone-200 pt-4">
      <h4 className="mb-3 text-sm font-semibold text-stone-700">
        Nueva receta rápida
      </h4>

      <div className="space-y-3">
        {/* Recipe name */}
        <div>
          <label className="block text-xs font-medium text-stone-600">
            Nombre de la receta *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Tortilla de espinacas"
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
        </div>

        {/* Servings */}
        <div>
          <label className="block text-xs font-medium text-stone-600">
            Porciones
          </label>
          <input
            type="number"
            value={servings}
            min={1}
            onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-1 w-20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* is_quick checkbox */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isQuick}
            onChange={(e) => setIsQuick(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-stone-600">Receta rápida</span>
        </label>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Creando...' : 'Crear y asignar'}
          </button>
        </div>
      </div>
    </form>
  )
}
