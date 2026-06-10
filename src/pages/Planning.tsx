import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  addWeeks,
  subWeeks,
  parseISO,
} from 'date-fns'
import {
  getWeekDates,
  getWeekRange,
  getWeekNumber,
  formatDate,
} from '../lib/date-utils'
import { useProfile } from '../hooks/use-profile'
import { useAuth } from '../hooks/use-auth'
import {
  useMealEntriesByDateRange,
  useCreateMealEntry,
  useDeleteMealEntry,
} from '../hooks/use-meal-entries'
import type { MealEntryWithRecipe } from '../hooks/use-meal-entries'
import WeekGrid from '../components/planning/WeekGrid'
import WeeklyScorePanel from '../components/planning/WeeklyScorePanel'
import MealDetailDrawer from '../components/planning/MealDetailDrawer'
import RecipeSelectorModal from '../components/planning/RecipeSelectorModal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import {
  computeRecipeNutrition,
  computeMealNutrition,
  computeDayNutrition,
  computeWeekNutrition,
  scoreWeek,
  DEFAULT_GOALS,
} from '../lib/nutrition'
import type { MacroValues, WeekNutrition, WeeklyScore } from '../lib/nutrition'

type MealSlot = 'desayuno' | 'comida' | 'cena'

function resolveWeekDate(searchParams: URLSearchParams): Date {
  const dateParam = searchParams.get('date')
  if (dateParam) {
    try {
      const parsed = parseISO(dateParam)
      if (!isNaN(parsed.getTime())) return parsed
    } catch {
      // fall through
    }
  }
  return new Date()
}

export default function PlanningPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { data: profile } = useProfile()

  const weekStartDay = profile?.week_start_day ?? 1

  // Resolve which date/week we're viewing from URL or default to today
  const [viewDate, setViewDate] = useState<Date>(() => resolveWeekDate(searchParams))

  const currentWeekDates = useMemo(
    () => getWeekDates(viewDate, weekStartDay),
    [viewDate, weekStartDay],
  )
  const weekRange = useMemo(
    () => getWeekRange(viewDate, weekStartDay),
    [viewDate, weekStartDay],
  )

  // Fetch meal entries for the current week
  const weekStartStr = formatDate(weekRange.start)
  const weekEndStr = formatDate(weekRange.end)
  const { data: weekEntries, isLoading } = useMealEntriesByDateRange(
    weekStartStr,
    weekEndStr,
  )

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, MealEntryWithRecipe[]> = {}
    if (weekEntries) {
      for (const entry of weekEntries) {
        if (!grouped[entry.date]) grouped[entry.date] = []
        grouped[entry.date].push(entry)
      }
    }
    return grouped
  }, [weekEntries])

  // ── Nutrition computation ──

  // Count special-diet days
  const specialDayDates = useMemo(() => {
    if (!weekEntries) return new Set<string>()
    const special = new Set<string>()
    for (const entry of weekEntries) {
      if (entry.meal_entry_type !== 'normal') {
        special.add(entry.date)
      }
    }
    return special
  }, [weekEntries])

  // Compute week nutrition from normal entries only
  const weekNutrition = useMemo<WeekNutrition | null>(() => {
    if (!weekEntries || currentWeekDates.length === 0) return null

    // Get per-entry nutrition for normal entries only
    const normalEntryNutrition = weekEntries
      .filter((e) => e.meal_entry_type === 'normal')
      .map((entry) => {
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

        return {
          date: entry.date,
          mealSlot: entry.meal_slot,
          nutrition: computeMealNutrition(perServing, entry.servings),
        }
      })
      .filter(Boolean) as { date: string; mealSlot: string; nutrition: MacroValues }[]

    // Group by day, create 7 DayNutrition entries
    const days = currentWeekDates.map((date) => {
      const dateStr = formatDate(date)
      const dayEntries = normalEntryNutrition.filter((e) => e.date === dateStr)
      return computeDayNutrition(dayEntries.map((e) => ({ nutrition: e.nutrition })))
    })

    return computeWeekNutrition(days)
  }, [weekEntries, currentWeekDates])

  // Compute weekly score
  const goals: MacroValues = useMemo(() => ({
    calories: profile?.daily_calorie_goal ?? DEFAULT_GOALS.calories,
    protein: DEFAULT_GOALS.protein,
    carbs: DEFAULT_GOALS.carbs,
    fat: DEFAULT_GOALS.fat,
    fiber: DEFAULT_GOALS.fiber,
  }), [profile])

  const weeklyScore = useMemo<WeeklyScore | null>(() => {
    if (!weekNutrition) return null
    return scoreWeek(weekNutrition, goals)
  }, [weekNutrition, goals])

  // Mutations
  const createMealEntry = useCreateMealEntry()
  const deleteMealEntry = useDeleteMealEntry()

  // Modal/drawer state
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; mealSlot: MealSlot } | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<MealEntryWithRecipe | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  const [changingEntry, setChangingEntry] = useState<MealEntryWithRecipe | null>(null)

  const navigateToDate = useCallback(
    (date: Date) => {
      setViewDate(date)
      const params = new URLSearchParams()
      params.set('date', formatDate(date))
      setSearchParams(params, { replace: true })
    },
    [setSearchParams],
  )

  const goToPrevWeek = () => setViewDate((d) => subWeeks(d, 1))
  const goToNextWeek = () => setViewDate((d) => addWeeks(d, 1))
  const goToToday = () => navigateToDate(new Date())

  // ── Handlers ──

  const handleAdd = (date: string, mealSlot: MealSlot) => {
    setSelectedSlot({ date, mealSlot })
    setShowRecipeSelector(true)
  }

  const handleSelectRecipe = async (recipeId: string) => {
    if (!selectedSlot || !user) return
    const targetSlot = selectedSlot

    try {
      // If changing an existing entry, delete the old one first
      if (changingEntry) {
        await deleteMealEntry.mutateAsync(changingEntry.id)
      }

      await createMealEntry.mutateAsync({
        user_id: user.id,
        recipe_id: recipeId,
        date: targetSlot.date,
        meal_slot: targetSlot.mealSlot,
        meal_entry_type: 'normal',
        servings: 1,
        notes: null,
      })
    } catch (err) {
      console.error('Failed to create meal entry:', err)
    }

    setShowRecipeSelector(false)
    setSelectedSlot(null)
    setChangingEntry(null)
  }

  const handleClickEntry = (entry: MealEntryWithRecipe) => {
    setSelectedEntry(entry)
  }

  const handleChangeRecipe = (entry: MealEntryWithRecipe) => {
    setSelectedEntry(null)
    setChangingEntry(entry)
    setSelectedSlot({ date: entry.date, mealSlot: entry.meal_slot })
    setShowRecipeSelector(true)
  }

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId)
  }

  const confirmDelete = async () => {
    if (!entryToDelete) return
    try {
      await deleteMealEntry.mutateAsync(entryToDelete)
    } catch (err) {
      console.error('Failed to delete meal entry:', err)
    }
    setEntryToDelete(null)
  }

  // Counts
  const totalMeals = weekEntries?.length ?? 0
  const daysWithMeals = Object.keys(entriesByDate).length

  return (
    <div className="flex flex-col gap-4">
      {/* Week selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          aria-label="Semana anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-xs font-medium text-stone-500">Semana {getWeekNumber(viewDate)}</p>
          <p className="text-sm font-semibold text-stone-900">
            {currentWeekDates[0]?.getDate()} – {currentWeekDates[6]?.getDate()} {currentWeekDates[0]?.toLocaleString('es', { month: 'long' })}
          </p>
        </div>

        <button
          onClick={goToNextWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          aria-label="Semana siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Today button */}
      <div className="flex justify-center">
        <button
          onClick={goToToday}
          className="rounded-lg border border-stone-200 px-4 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
        >
          Hoy
        </button>
      </div>

      {/* Weekly summary */}
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-stone-900">{totalMeals}</p>
              <p className="text-xs text-stone-400">Comidas</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-stone-900">{daysWithMeals}/7</p>
              <p className="text-xs text-stone-400">Días</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Score Panel */}
      <WeeklyScorePanel
        score={weeklyScore ?? { overall: 0, categories: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, daysTracked: 0, daysInRange: 7 }}
        goals={goals}
        specialDaysCount={specialDayDates.size}
        loading={isLoading}
        empty={!isLoading && (!weekEntries || weekEntries.length === 0)}
      />

      {/* Week grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <WeekGrid
          weekDates={currentWeekDates}
          entriesByDate={entriesByDate}
          onAdd={handleAdd}
          onClickEntry={handleClickEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      )}

      {/* Recipe Selector Modal */}
      <RecipeSelectorModal
        open={showRecipeSelector}
        onClose={() => {
          setShowRecipeSelector(false)
          setSelectedSlot(null)
          setChangingEntry(null)
        }}
        onSelect={handleSelectRecipe}
      />

      {/* Meal Detail Drawer */}
      <MealDetailDrawer
        entry={selectedEntry}
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onChangeRecipe={handleChangeRecipe}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!entryToDelete}
        title="Eliminar comida"
        message="¿Estás seguro de eliminar esta comida de tu plan semanal?"
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  )
}
