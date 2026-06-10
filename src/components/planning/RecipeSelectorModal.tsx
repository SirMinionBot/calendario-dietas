import { useState } from 'react'
import { useRecipes } from '../../hooks/use-recipes'
import QuickRecipeForm from './QuickRecipeForm'

interface RecipeSelectorModalProps {
  open: boolean
  onClose: () => void
  onSelect: (recipeId: string, recipeName: string) => void
}

export default function RecipeSelectorModal({
  open,
  onClose,
  onSelect,
}: RecipeSelectorModalProps) {
  const [search, setSearch] = useState('')
  const [showQuickForm, setShowQuickForm] = useState(false)
  const { data: recipes, isLoading } = useRecipes(search || undefined)

  const handleQuickSaved = (recipeId: string, recipeName: string) => {
    setShowQuickForm(false)
    onSelect(recipeId, recipeName)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-2xl bg-white shadow-xl">
        {/* Handle */}
        <div className="mx-auto mb-2 mt-3 h-1.5 w-10 rounded-full bg-stone-300" />

        {/* Header */}
        <div className="px-4 pb-2">
          <h3 className="text-lg font-semibold text-stone-900">
            Seleccionar receta
          </h3>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar recetas..."
              className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : recipes && recipes.length > 0 ? (
            <div className="space-y-1.5">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe.id, recipe.name)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-stone-50"
                >
                  {/* Recipe avatar placeholder */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {recipe.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {recipe.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      {recipe.servings} porción{recipe.servings !== 1 ? 'es' : ''}
                      {recipe.is_quick && ' · Rápida'}
                    </p>
                  </div>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 shrink-0 text-stone-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-stone-400">
              {search
                ? `Sin resultados para "${search}"`
                : 'Todavía no hay recetas'}
            </div>
          )}
        </div>

        {/* Quick recipe form / Add new button */}
        <div className="border-t border-stone-100 px-4 py-3">
          {showQuickForm ? (
            <QuickRecipeForm
              onSaved={handleQuickSaved}
              onCancel={() => setShowQuickForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowQuickForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-200 px-4 py-3 text-sm font-medium text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva receta rápida
            </button>
          )}
        </div>
      </div>
    </>
  )
}
