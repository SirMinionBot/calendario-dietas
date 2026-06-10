import {
  useIngredientCategories,
  buildCategoryTree,
  type CategoryTreeNode,
} from '../../hooks/use-ingredients'

interface CategoryFilterProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function CategoryChip({
  category,
  selectedId,
  onSelect,
  depth = 0,
}: {
  category: CategoryTreeNode
  selectedId: string | null
  onSelect: (id: string | null) => void
  depth?: number
}) {
  const isSelected = selectedId === category.id

  return (
    <>
      <button
        onClick={() => onSelect(isSelected ? null : category.id)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          isSelected
            ? 'bg-emerald-600 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
        style={{ marginLeft: depth * 8 }}
      >
        {category.name}
      </button>
      {category.children.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {category.children.map((child) => (
            <CategoryChip
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default function CategoryFilter({ selectedId, onSelect }: CategoryFilterProps) {
  const { data: categories, isLoading } = useIngredientCategories()

  if (isLoading) {
    return (
      <div className="h-8 w-full animate-pulse rounded-lg bg-stone-100" />
    )
  }

  if (!categories || categories.length === 0) return null

  const tree = buildCategoryTree(categories)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selectedId === null
            ? 'bg-emerald-600 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        All
      </button>
      {tree.map((root) => (
        <CategoryChip
          key={root.id}
          category={root}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
