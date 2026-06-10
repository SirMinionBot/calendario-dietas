import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIngredients, useDeleteIngredient } from '../hooks/use-ingredients'
import CategoryFilter from '../components/ingredients/CategoryFilter'
import IngredientTable from '../components/ingredients/IngredientTable'

export default function IngredientListPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const { data: ingredients, isLoading } = useIngredients(search || undefined)
  const deleteMutation = useDeleteIngredient()

  const filtered = categoryFilter
    ? ingredients?.filter(
        (ing) => ing.category?.id === categoryFilter,
      )
    : ingredients

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this ingredient? This cannot be undone.')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch {
      // Error is handled by the mutation
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Ingredients</h2>
        <Link
          to="/ingredients/new"
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
        placeholder="Search ingredients…"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />

      {/* Category Filter */}
      <CategoryFilter
        selectedId={categoryFilter}
        onSelect={setCategoryFilter}
      />

      {/* Table */}
      <IngredientTable
        ingredients={filtered}
        isLoading={isLoading}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
