import { z } from 'zod'

// ── Enums ────────────────────────────────────────────

export const MEAL_SLOTS = ['desayuno', 'comida', 'cena'] as const
export const mealSlotSchema = z.enum(MEAL_SLOTS)
export type MealSlot = z.infer<typeof mealSlotSchema>

export const MEAL_ENTRY_TYPES = ['normal', 'fuera', 'cheat', 'evento'] as const
export const mealEntryTypeSchema = z.enum(MEAL_ENTRY_TYPES)
export type MealEntryType = z.infer<typeof mealEntryTypeSchema>

export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const
export const weekStartDaySchema = z.number().int().min(1).max(7)
export type WeekStartDay = z.infer<typeof weekStartDaySchema>

// ── Profiles ─────────────────────────────────────────

export const profileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().max(100).nullable(),
  daily_calorie_goal: z.number().int().min(1, 'Must be at least 1 calorie'),
  week_start_day: weekStartDaySchema.default(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const profileUpdateSchema = z.object({
  display_name: z.string().max(100).nullable().optional(),
  daily_calorie_goal: z.number().int().min(1, 'Must be at least 1 calorie').optional(),
  week_start_day: weekStartDaySchema.optional(),
})

export type Profile = z.infer<typeof profileSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

// ── Ingredient Categories ────────────────────────────

export const ingredientCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  parent_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
})

export type IngredientCategory = z.infer<typeof ingredientCategorySchema>

// ── Ingredients ──────────────────────────────────────

export const ingredientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  category_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  calories_per_100g: z.number().min(0),
  protein_per_100g: z.number().min(0),
  carbs_per_100g: z.number().min(0),
  fat_per_100g: z.number().min(0),
  fiber_per_100g: z.number().min(0),
  default_unit: z.string().min(1).max(50),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Ingredient = z.infer<typeof ingredientSchema>

// ── Recipes ──────────────────────────────────────────

export const recipeSchema = z.object({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  servings: z.number().int().min(1),
  prep_time_min: z.number().int().min(0).nullable(),
  cook_time_min: z.number().int().min(0).nullable(),
  image_url: z.string().url().nullable(),
  is_quick: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Recipe = z.infer<typeof recipeSchema>

export const recipeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  servings: z.coerce.number().int().min(1, 'At least 1 serving'),
  prep_time_min: z.coerce.number().int().min(0).nullable().optional(),
  cook_time_min: z.coerce.number().int().min(0).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_quick: z.boolean().default(false),
})

export type RecipeForm = z.infer<typeof recipeFormSchema>

// ── Recipe Ingredients ───────────────────────────────

export const recipeIngredientSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  quantity: z.number().min(0),
  unit: z.string().min(1).max(50),
  notes: z.string().nullable(),
  sort_order: z.number().int().min(0),
})

export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>

// ── Meal Entries ─────────────────────────────────────

export const mealEntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  date: z.string(), // ISO date string YYYY-MM-DD
  meal_slot: mealSlotSchema,
  meal_entry_type: mealEntryTypeSchema.default('normal'),
  servings: z.number().min(0.01).max(100),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type MealEntry = z.infer<typeof mealEntrySchema>
