import { useMemo, useRef } from 'react'
import type { MealEntryWithRecipe } from '../../hooks/use-meal-entries'
import {
  computeRecipeNutrition,
  computeMealNutrition,
} from '../../lib/nutrition'

const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
}

const TYPE_STYLES: Record<string, string> = {
  normal: '',
  fuera: 'bg-orange-100 text-orange-700 border-orange-300',
  cheat: 'bg-red-100 text-red-700 border-red-300',
  evento: 'bg-purple-100 text-purple-700 border-purple-300',
}

const TYPE_LABELS: Record<string, string> = {
  normal: '',
  fuera: 'Fuera',
  cheat: 'Cheat',
  evento: 'Evento',
}

const SLOT_COLORS: Record<string, string> = {
  desayuno: 'bg-amber-100 text-amber-700',
  comida: 'bg-emerald-100 text-emerald-700',
  cena: 'bg-indigo-100 text-indigo-700',
}

interface MealSlotCellProps {
  date: string
  mealSlot: 'desayuno' | 'comida' | 'cena'
  entry: MealEntryWithRecipe | null | undefined
  onAdd: (date: string, mealSlot: 'desayuno' | 'comida' | 'cena') => void
  onClick: (entry: MealEntryWithRecipe) => void
  onDelete: (entryId: string) => void
}

export default function MealSlotCell({
  date,
  mealSlot,
  entry,
  onAdd,
  onClick,
  onDelete,
}: MealSlotCellProps) {
  // Compute meal calories from recipe ingredients
  const mealCalories = useMemo(() => {
    if (!entry?.recipe.ingredients || entry.recipe.ingredients.length === 0) return null
    const perServing = computeRecipeNutrition(
      entry.recipe.ingredients.map((i) => ({
        ingredient: {
          calories_per_100g: i.ingredient.calories_per_100g,
          protein_per_100g: i.ingredient.protein_per_100g,
          carbs_per_100g: i.ingredient.carbs_per_100g,
          fat_per_100g: i.ingredient.fat_per_100g,
          fiber_per_100g: i.ingredient.fiber_per_100g,
        },
        quantity: i.quantity,
      })),
      entry.recipe.servings,
    )
    return computeMealNutrition(perServing, entry.servings).calories
  }, [entry])

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePointerDown = () => {
    if (!entry) return
    longPressTimer.current = setTimeout(() => {
      onDelete(entry.id)
    }, 600)
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  if (!entry) {
    return (
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-200 p-2 transition-colors hover:border-emerald-300 hover:bg-emerald-50 min-h-[72px]"
        onClick={() => onAdd(date, mealSlot)}
      >
        <span className="text-lg text-stone-300">+</span>
        <span className="mt-0.5 text-[10px] text-stone-400">
          {MEAL_LABELS[mealSlot]}
        </span>
      </div>
    )
  }

  const isSpecial = entry.meal_entry_type !== 'normal'

  return (
    <div
      className={`relative flex cursor-pointer flex-col rounded-lg border p-2 transition-colors hover:shadow-sm min-h-[72px] ${
        isSpecial
          ? 'border-stone-200'
          : 'border-stone-200 hover:border-stone-300'
      } ${isSpecial ? TYPE_STYLES[entry.meal_entry_type]?.split(' ')[0] + '/30' || '' : ''}`}
      onClick={() => onClick(entry)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Meal type badge */}
      <span
        className={`self-start rounded px-1 py-0.5 text-[9px] font-medium uppercase leading-tight ${
          SLOT_COLORS[mealSlot]
        }`}
      >
        {MEAL_LABELS[mealSlot]}
      </span>

      {/* Recipe name */}
      <span className="mt-1 text-xs font-medium leading-tight text-stone-800 line-clamp-2">
        {entry.recipe.name}
      </span>

      {/* Special badge */}
      {isSpecial && (
        <span
          className={`mt-1 self-start rounded border px-1 py-0.5 text-[8px] font-medium uppercase leading-tight ${
            TYPE_STYLES[entry.meal_entry_type]
          }`}
        >
          {TYPE_LABELS[entry.meal_entry_type]}
        </span>
      )}

      {/* Servings */}
      {entry.servings !== 1 && (
        <span className="mt-1 text-[9px] text-stone-400">
          {entry.servings}×
        </span>
      )}

      {/* Compact calorie display */}
      {mealCalories !== null && (
        <span className="mt-auto pt-1 text-[9px] font-medium text-stone-400">
          {Math.round(mealCalories)} kcal
        </span>
      )}
    </div>
  )
}
