// ── Types ──────────────────────────────────────────────

export interface MacroValues {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface MealNutrition extends MacroValues {
  servings: number
}

export interface DayNutrition extends MacroValues {
  meals: MealNutrition[]
}

export interface WeekNutrition extends MacroValues {
  days: DayNutrition[]
}

export interface WeeklyScore {
  overall: number
  categories: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  daysTracked: number
  daysInRange: number
}

/**
 * Minimal ingredient data needed for nutrition computation.
 * Matches the shape returned by Supabase nested selects.
 */
export interface RecipeIngredientMacro {
  ingredient: {
    calories_per_100g: number
    protein_per_100g: number
    carbs_per_100g: number
    fat_per_100g: number
    fiber_per_100g: number
  }
  quantity: number
}

// ── Default Goal Values ───────────────────────────────

export const DEFAULT_GOALS: MacroValues = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 65,
  fiber: 25,
}

// ── Internal Helpers ──────────────────────────────────

function safe(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function sumMacros(values: MacroValues[]): MacroValues {
  return {
    calories: safe(values.reduce((s, v) => s + v.calories, 0)),
    protein: safe(values.reduce((s, v) => s + v.protein, 0)),
    carbs: safe(values.reduce((s, v) => s + v.carbs, 0)),
    fat: safe(values.reduce((s, v) => s + v.fat, 0)),
    fiber: safe(values.reduce((s, v) => s + v.fiber, 0)),
  }
}

// ── Computation Functions ─────────────────────────────

/**
 * Compute per-serving nutrition for a recipe.
 *
 * Formula: Σ(ingredient_macro × quantity_g / 100) / servings
 *
 * Returns zeros for empty input or zero servings.
 */
export function computeRecipeNutrition(
  ingredients: RecipeIngredientMacro[],
  servings: number,
): MacroValues {
  if (!Array.isArray(ingredients) || ingredients.length === 0 || servings <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  }

  const total = sumMacros(
    ingredients.map((ing) => ({
      calories: ing.ingredient.calories_per_100g * (ing.quantity / 100),
      protein: ing.ingredient.protein_per_100g * (ing.quantity / 100),
      carbs: ing.ingredient.carbs_per_100g * (ing.quantity / 100),
      fat: ing.ingredient.fat_per_100g * (ing.quantity / 100),
      fiber: ing.ingredient.fiber_per_100g * (ing.quantity / 100),
    })),
  )

  return {
    calories: safe(total.calories / servings),
    protein: safe(total.protein / servings),
    carbs: safe(total.carbs / servings),
    fat: safe(total.fat / servings),
    fiber: safe(total.fiber / servings),
  }
}

/**
 * Apply a servings multiplier to per-serving nutrition to get meal-level macros.
 */
export function computeMealNutrition(
  recipeNutrition: MacroValues,
  servingsMultiplier: number,
): MacroValues {
  if (servingsMultiplier <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  }
  return {
    calories: safe(recipeNutrition.calories * servingsMultiplier),
    protein: safe(recipeNutrition.protein * servingsMultiplier),
    carbs: safe(recipeNutrition.carbs * servingsMultiplier),
    fat: safe(recipeNutrition.fat * servingsMultiplier),
    fiber: safe(recipeNutrition.fiber * servingsMultiplier),
  }
}

/**
 * Compute daily totals by summing macros across all meals for a day.
 */
export function computeDayNutrition(
  meals: { nutrition: MacroValues }[],
): DayNutrition {
  if (!Array.isArray(meals) || meals.length === 0) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      meals: [],
    }
  }

  const totals = sumMacros(meals.map((m) => m.nutrition))

  return {
    ...totals,
    meals: meals.map((m) => ({
      ...m.nutrition,
      servings: 1,
    })),
  }
}

/**
 * Compute weekly totals by summing macros across all 7 days.
 *
 * The caller should provide exactly one DayNutrition per day of the week
 * (7 entries). Days with no data should have zero values and empty meals array.
 */
export function computeWeekNutrition(days: DayNutrition[]): WeekNutrition {
  if (!Array.isArray(days) || days.length === 0) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      days: [],
    }
  }

  const totals = sumMacros(days)

  return {
    ...totals,
    days,
  }
}

// ── Scoring ───────────────────────────────────────────

/**
 * Score a single macro category on a 0-100 scale.
 *
 * - 80-100% of goal → Perfect (100 pts)
 * - Below 80% → Linear decline from 100 at 80% to 0 at 0%
 * - Above 100% → Linear decline from 100 at 100% to 0 at 200%
 */
function scoreForCategory(actual: number, goal: number): number {
  if (goal <= 0) return 100
  const ratio = safe(actual) / goal

  // Perfect zone: 80–100% of target
  if (ratio >= 0.8 && ratio <= 1.0) return 100

  // Below target: linear from 100 at 80% to 0 at 0%
  if (ratio < 0.8) {
    return Math.min(99, Math.round((ratio / 0.8) * 100))
  }

  // Above target: linear from 100 at 100% to 0 at 200%
  return Math.max(0, Math.round(100 - (ratio - 1.0) * 100))
}

/**
 * Compute a weekly score (0-100) comparing actual intake against goals.
 *
 * - Days with no meal data count as 0 toward macros and don't count as tracked.
 * - The caller MUST filter out special-diet entries (fuera, cheat, evento)
 *   before calling this function — they are completely excluded from computation.
 * - Goals are scaled proportionally to daysTracked (e.g. 3 tracked days → 3x daily goal).
 */
export function scoreWeek(
  weekNutrition: WeekNutrition,
  goals: MacroValues,
): WeeklyScore {
  const daysInRange = weekNutrition.days.length || 7
  const daysTracked = weekNutrition.days.filter(
    (d) => d.meals.length > 0,
  ).length

  // Scale goals proportionally to tracked days
  const scale = Math.max(1, daysTracked)
  const scaledGoals: MacroValues = {
    calories: goals.calories * scale,
    protein: goals.protein * scale,
    carbs: goals.carbs * scale,
    fat: goals.fat * scale,
    fiber: goals.fiber * scale,
  }

  const categories = {
    calories: scoreForCategory(weekNutrition.calories, scaledGoals.calories),
    protein: scoreForCategory(weekNutrition.protein, scaledGoals.protein),
    carbs: scoreForCategory(weekNutrition.carbs, scaledGoals.carbs),
    fat: scoreForCategory(weekNutrition.fat, scaledGoals.fat),
    fiber: scoreForCategory(weekNutrition.fiber, scaledGoals.fiber),
  }

  const overall = Math.round(
    (categories.calories +
      categories.protein +
      categories.carbs +
      categories.fat +
      categories.fiber) /
      5,
  )

  return { overall, categories, daysTracked, daysInRange }
}
