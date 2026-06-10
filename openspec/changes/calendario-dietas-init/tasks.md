# Tasks: Calendario de Dietas — Initial Build

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3000–5000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4 chained PRs |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation — Vite scaffold, Supabase client, Auth (login/register/profile), AppLayout, BottomNav, ProtectedRoute, routing | PR 1 | Base: feature/calendario-dietas; feature-branch-chain |
| 2 | Data Layer — 001_initial.sql migration, ingredient CRUD + categories, recipe CRUD + ingredients, ~50 seed ingredients | PR 2 | Depends on PR 1 |
| 3 | Calendar & Planning — Dashboard, weekly 7×3 grid, month calendar, meal entry CRUD, special days, inline recipe modal | PR 3 | Depends on PR 2 |
| 4 | Nutrition & Scoring — NutritionPanel, computeRecipeNutrition, weekly scoring engine, scoring UI, GH Pages deploy config | PR 4 | Depends on PR 3 |

## Phase 1: Foundation

- [x] 1.1 Scaffold Vite + React + TS project, configure Tailwind, install deps (TanStack Query, React Router, date-fns, react-hook-form, zod, @supabase/supabase-js)
- [x] 1.2 Create `src/lib/supabase.ts` with Supabase client init from env
- [x] 1.3 Create `src/types/database.ts` with TS types matching schema
- [x] 1.4 Create auth: `src/pages/Login.tsx`, `src/pages/Register.tsx` with Supabase auth forms
- [x] 1.5 Create `src/pages/Profile.tsx` with display name, calorie goal, week start day editing
- [x] 1.6 Create `src/hooks/use-auth.ts` for session state, login, register, logout
- [x] 1.7 Create layout: `AppLayout.tsx`, `TopBar.tsx`, `BottomNav.tsx` with 5-tab nav
- [x] 1.8 Create `ProtectedRoute.tsx`, wire React Router with all route definitions

## Phase 2: Data Layer

- [x] 2.1 Write `supabase/migrations/001_initial.sql` with profiles, ingredient_categories, ingredients, recipes, recipe_ingredients, meal_entries — all FKs + RLS
- [x] 2.2 Create hooks: `use-ingredients.ts`, `use-recipes.ts`, `use-meal-entries.ts` with TanStack Query
- [x] 2.3 Create `src/pages/IngredientList.tsx` + `IngredientTable.tsx` with search + category filter
- [x] 2.4 Create `src/pages/RecipeList.tsx` + `src/pages/RecipeDetail.tsx` with NutritionPanel (placeholder)
- [x] 2.5 Create `src/pages/RecipeForm.tsx` + `src/components/forms/RecipeForm.tsx` with ingredient picker
- [x] 2.6 Create `src/components/ingredients/CategoryFilter.tsx` for hierarchical category tree
- [x] 2.7 Create `src/pages/IngredientForm.tsx` + `src/components/forms/IngredientForm.tsx`
- [x] 2.8 Add ~42 seed ingredients with hierarchical categories in migration

## Phase 3: Calendar & Planning

- [x] 3.1 Create `src/lib/date-utils.ts` with getWeekRange, weekStart helpers
- [x] 3.2 Create `src/pages/Dashboard.tsx` with today's meals + mini NutritionPanel (macros placeholder for WU4)
- [x] 3.3 Create `src/pages/Planning.tsx` with week selector, 7×3 grid, meal slot assignment
- [x] 3.4 Create `WeekGrid.tsx`, `MealSlotCell.tsx`, `MealDetailDrawer.tsx` in `components/planning/`
- [x] 3.5 Create `RecipeSelectorModal.tsx` with recipe search + inline QuickRecipeForm
- [x] 3.6 Create `src/pages/Calendar.tsx` with month view, tappable day cells with meal dots
- [x] 3.7 Create `CalendarNavBar.tsx`, `MonthView.tsx`, `DayCell.tsx` in `components/calendar/`
- [x] 3.8 Implement special days: meal_entry_type badge (colored), picker in drawer
- [x] 3.9 Wire meal entry CRUD: assign recipe, servings multiplier (0.25–10, step 0.25), notes
- [x] 3.10 Create `QuickRecipeForm.tsx` with is_quick flag, auto-assign on save

## Phase 4: Nutrition & Scoring

- [x] 4.1 Create `src/lib/nutrition.ts` — pure fns: computeServingNutrition, computeMealNutrition, computeDayTotals, computeWeekTotals
- [x] 4.2 Create `src/components/recipes/NutritionPanel.tsx` with calorie ring + macro progress bars
- [x] 4.3 Implement scoreWeek(macros, goals) with per-category (0–100%) + overall equal-weight score
- [x] 4.4 Create `WeeklyScorePanel.tsx` with green/yellow/red indicators, special-day exclusion filter
- [x] 4.5 Create `public/404.html` for SPA routing + configure `vite.config.ts` base path for GH Pages
- [x] 4.6 Wire scoring into Planning page, handle partial-week proportional goals
