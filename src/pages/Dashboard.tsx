import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMealEntriesByDate } from '../hooks/use-meal-entries'
import type { MealEntryWithRecipe } from '../hooks/use-meal-entries'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import EmptyState from '../components/shared/EmptyState'
import NutritionPanel from '../components/recipes/NutritionPanel'
import {
  computeRecipeNutrition,
  computeMealNutrition,
  computeDayNutrition,
  DEFAULT_GOALS,
} from '../lib/nutrition'
import type { MacroValues } from '../lib/nutrition'
import { formatDate, formatDisplayDate, capitalize } from '../lib/date-utils'

const MEAL_SLOT_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
}

const MEAL_SLOT_ORDER = ['desayuno', 'comida', 'cena'] as const

const TYPE_STYLES: Record<string, string> = {
  normal: '',
  fuera: 'bg-orange-100 text-orange-700',
  cheat: 'bg-red-100 text-red-700',
  evento: 'bg-purple-100 text-purple-700',
}

const TYPE_LABELS: Record<string, string> = {
  normal: '',
  fuera: 'Fuera',
  cheat: 'Cheat',
  evento: 'Evento',
}

type MealSlot = (typeof MEAL_SLOT_ORDER)[number]

function todayDateStr(): string {
  return formatDate(new Date())
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const today = todayDateStr()
  const { data: entries, isLoading } = useMealEntriesByDate(today)

  // Group entries by meal_slot for easy lookup (one entry per slot per day)
  const entriesBySlot = useMemo(() => {
    const map = new Map<MealSlot, MealEntryWithRecipe>()
    if (entries) {
      for (const entry of entries) {
        map.set(entry.meal_slot as MealSlot, entry)
      }
    }
    return map
  }, [entries])

  const { data: profile } = useProfile()

  const hasEntries = entries && entries.length > 0

  // Count entries per slot (for quick stats)
  const slotsWithMeals = MEAL_SLOT_ORDER.filter((slot) =>
    entriesBySlot.has(slot),
  ).length

  // Compute today's nutrition
  const todayNutrition = useMemo<MacroValues | null>(() => {
    if (!entries || entries.length === 0) return null

    const mealNutritions = entries.map((entry) => {
      const ingredients = entry.recipe.ingredients
      if (!ingredients || ingredients.length === 0) return null

      const perServing = computeRecipeNutrition(
        ingredients.map((i) => ({
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

      return computeMealNutrition(perServing, entry.servings)
    }).filter(Boolean) as MacroValues[]

    if (mealNutritions.length === 0) return null
    const day = computeDayNutrition(mealNutritions.map((m) => ({ nutrition: m })))
    return {
      calories: day.calories,
      protein: day.protein,
      carbs: day.carbs,
      fat: day.fat,
      fiber: day.fiber,
    }
  }, [entries])

  const goals: MacroValues = useMemo(() => ({
    calories: profile?.daily_calorie_goal ?? DEFAULT_GOALS.calories,
    protein: DEFAULT_GOALS.protein,
    carbs: DEFAULT_GOALS.carbs,
    fat: DEFAULT_GOALS.fat,
    fiber: DEFAULT_GOALS.fiber,
  }), [profile])

  return (
    <div className="flex flex-col gap-4">
      {/* Welcome + date */}
      <div>
        <h2 className="text-lg font-semibold text-stone-900">
          {user?.email?.split('@')[0]
            ? `Hola, ${capitalize(user.email.split('@')[0])}`
            : 'Hoy'}
        </h2>
        <p className="text-sm text-stone-500">
          {capitalize(formatDisplayDate(new Date()))}
        </p>
      </div>

      {/* Nutrition stats */}
      {todayNutrition ? (
        <NutritionPanel
          macros={todayNutrition}
          goals={goals}
          showGoals={true}
        />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-900">
                {slotsWithMeals}
              </p>
              <p className="text-xs text-stone-400">Comidas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-900">
                {slotsWithMeals}/3
              </p>
              <p className="text-xs text-stone-400">Planeadas</p>
            </div>
          </div>
        </div>
      )}

      {/* Meal slots */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : !hasEntries ? (
        <EmptyState
          title="Hoy no tienes comidas planificadas"
          description="Empieza a planificar tu semana desde el calendario"
          action={{
            label: 'Ir al plan semanal',
            onClick: () => navigate('/plan'),
          }}
        />
      ) : (
        <div className="space-y-3">
          {MEAL_SLOT_ORDER.map((slot) => {
            const entry = entriesBySlot.get(slot)
            const isSpecial = entry && entry.meal_entry_type !== 'normal'

            return (
              <div
                key={slot}
                className={`rounded-xl border p-4 ${
                  entry
                    ? 'border-stone-200 bg-white'
                    : 'border-dashed border-stone-200 bg-stone-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      slot === 'desayuno'
                        ? 'bg-amber-100 text-amber-700'
                        : slot === 'comida'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {MEAL_SLOT_LABELS[slot]}
                  </div>

                  {isSpecial && entry && (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${
                        TYPE_STYLES[entry.meal_entry_type]
                      }`}
                    >
                      {TYPE_LABELS[entry.meal_entry_type]}
                    </span>
                  )}
                </div>

                {entry ? (
                  <div className="mt-2">
                    <p className="font-medium text-stone-900">
                      {entry.recipe.name}
                    </p>
                    {entry.servings !== 1 && (
                      <p className="mt-0.5 text-xs text-stone-400">
                        {entry.servings} porciones
                      </p>
                    )}
                    {entry.notes && (
                      <p className="mt-1 text-xs text-stone-500 italic">
                        {entry.notes}
                      </p>
                    )}
                    <button
                      onClick={() => navigate(`/plan?date=${today}`)}
                      className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Ver en plan semanal →
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/plan?date=${today}`)}
                    className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    + Agregar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
