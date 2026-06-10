import { useParams } from 'react-router-dom'

export default function RecipeDetailPage() {
  const { id } = useParams()

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-lg font-semibold text-stone-900">Recipe</h2>
      <p className="mt-2 text-sm text-stone-400">
        Recipe details for {id} will appear here.
      </p>
    </div>
  )
}
