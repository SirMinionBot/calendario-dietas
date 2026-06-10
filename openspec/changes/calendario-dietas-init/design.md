# Design: Calendario de Dietas — Initial Build

## Technical Approach

Single SPA repo: React + Vite → static export → GH Pages. Direct Supabase JS client (no backend). TanStack Query for server state. Custom calendar with date-fns — meal slots are not time-range events. Nutrition = pure TS arithmetic, memoized. React Hook Form + Zod. Mobile-first responsive via Tailwind.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|-------------|-----------|
| 1 | Recipe sharing | `created_by` + public SELECT | Private per-user | MVP: all auth users see all recipes. `created_by` tracks ownership. Private deferrable. |
| 2 | Ingredient cats | Self-ref `parent_id` FK | Flat list, nested sets | Simple recursive tree, single table. Nullable for root categories. |
| 3 | Weekly planning | Dedicated `/plan` route + 7x3 grid | Calendar widget | Primary UX needs full screen. Inline recipe modal keeps flow state. |
| 4 | Week start day | `week_start_day` in profiles | localStorage, query param | Server authority = consistent across devices. Default Monday (1). |
| 5 | Special days | `meal_entry_type` ENUM | Boolean flags | Single type per slot. ENUM enforces integrity, affects scoring. |
| 6 | Weekly scoring | Frontend computation | Dedicated table, Edge Function | Pure arithmetic on meal_entries. No extra writes. Recalculated on nav. |
| 7 | Inline recipe | Modal in planning screen | Navigate to /recipes/new | High context-switch penalty during planning. Modal is faster. |
| 8 | Nutrition comp | Frontend `useMemo` | SQL view, Edge Function | Instant serving adjustment. Zero backend cost. Memoized per key. |
| 9 | Ingredient vis | All public (SELECT for all) | System + private split | Simpler RLS. No user_id NULL edge case. |
| 10 | SPA routing | `404.html` workaround | Hash routing | Hash breaks URL sharing. Zero-cost GH Pages fix. |

## Schema Deltas vs Exploration

Base schema from `exploration.md` with these changes:

- **profiles**: ADD `week_start_day INT NOT NULL DEFAULT 1`
- **ingredient_categories**: ADD `parent_id UUID REFERENCES ingredient_categories(id)` (nullable)
- **recipes**: RENAME `user_id` TO `created_by` (shared semantics)
- **meal_entries**: ADD `meal_entry_type` ENUM `('normal','fuera','cheat','evento') DEFAULT 'normal'`
- **RLS recipes**: SELECT for ALL authenticated; I/U/D only WHERE `auth.uid() = created_by`
- **RLS ingredients**: SELECT for ALL authenticated (no user_id splitting)

## Data Flow

```
AUTH: signUp → auto-profile trigger → redirect /
CALENDAR: month change → getWeekRange(date, weekStartDay) →
  supabase.from('meal_entries').select('*,recipe:recipes(*)')
    .gte('date',s).lte('date',e) → groupBy date → render cells
RECIPE (inline): quick form → insert recipe → insert recipe_ingredients →
  invalidate recipes → auto-assign to current slot
SCORING: fetch week entries → computeRecipeNutrition() per entry × servings →
  aggregate by day → compare to daily_goal × 7 → render
```

## File Structure

```
src/
├── main.tsx, App.tsx, index.css
├── lib/        { supabase.ts, nutrition.ts, date-utils.ts }
├── hooks/      { use-auth, use-meal-entries, use-recipes, use-ingredients }
├── components/
│   ├── auth/       { LoginForm, RegisterForm, ProtectedRoute }
│   ├── layout/     { AppLayout, TopBar, BottomNav }
│   ├── calendar/   { CalendarNavBar, WeekView, DayColumn, MonthView, DayCell, MealSlot }
│   ├── planning/   { WeekSelector, WeekGrid, MealSlotCell, MealDetailDrawer }
│   ├── recipes/    { RecipeCard, RecipeGrid, NutritionPanel, IngredientList }
│   ├── ingredients/{ IngredientTable, CategoryFilter }
│   ├── forms/      { RecipeForm, IngredientForm, Select, NumericInput, FormField }
│   └── shared/     { Modal, BottomSheet, ConfirmDialog, EmptyState, LoadingSkeleton }
├── pages/        { Login, Register, Dashboard, Calendar, Planning, RecipeList,
│                    RecipeDetail, RecipeForm, IngredientList, Profile }
└── types/database.ts
supabase/migrations/001_initial.sql
```

## Routes

```
/login, /register (public) | / Dashboard | /plan PlanningPage (?week=)
/calendar | /recipes [/new, /:id, /:id/edit] | /ingredients | /profile
```

## Weekly Planning Components

```
PlanningPage → WeekSelector (prev/next/today) → WeekGrid (7x3 CSS grid)
  → MealSlotCell × 21: type badge, RecipeBadge (name + mini macros),
    meal_entry_type badge (fuera/cheat), AddButton
  → RecipeSelectorModal: SearchBar + RecipeList + CreateNewButton
    → QuickRecipeForm (inline): name, servings, is_quick → save + assign
```

## Testing Strategy

Tools: Vitest + React Testing Library (added post-MVP).

| Layer | What | Approach |
|-------|------|----------|
| Unit | nutrition.ts, date-utils.ts | Pure fn → direct assertions |
| Unit | Weekly scoring | Known inputs → expected totals |
| Comp | MealSlotCell, WeekGrid | Render states, click handlers |
| Integ | Recipe creation flow | Form submit → cache invalidation |
| Integ | Calendar nav | Month change → query range |

## Open Questions

- Supabase project URL and anon key (user creates project + .env)
- GitHub repo name. Affects Vite `base` path.
- Color scheme — use Tailwind neutral palette for now
