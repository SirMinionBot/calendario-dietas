import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecipes } from '../hooks/use-recipes'
import type { Recipe } from '../types/database'

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-stone-900">
            {recipe.name}
          </h3>
          {recipe.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
              {recipe.description}
            </p>
          )}
        </div>
        {recipe.is_quick && (
          <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            Quick
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
        <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
        {recipe.prep_time_min != null && (
          <span>Prep: {recipe.prep_time_min} min</span>
        )}
        {recipe.cook_time_min != null && (
          <span>Cook: {recipe.cook_time_min} min</span>
        )}
      </div>
    </Link>
  )
}

export default function RecipeListPage() {
  const [search, setSearch] = useState('')
  const { data: recipes, isLoading } = useRecipes(search || undefined)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Recipes</h2>
        <Link
          to="/recipes/new"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          New
        </Link>
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search recipes…"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-stone-100"
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!recipes || recipes.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-stone-400">
            {search ? 'No recipes match your search' : 'No recipes yet'}
          </p>
          <Link
            to="/recipes/new"
            className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Create your first recipe
          </Link>
        </div>
      )}

      {/* Grid */}
      {!isLoading && recipes && recipes.length > 0 && (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
