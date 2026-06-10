## Exploration: Calendario de Dietas — Initial Architecture & Domain Analysis

### Current State

Brand new project. No code exists yet. The stack is defined at the architecture level (React + Vite + TanStack Query + React Router + Tailwind + Supabase), but zero implementation has started. The openspec SDD framework has been initialized via `sdd-init`.

This exploration lays the complete foundation — domain model, data schema, API patterns, route design, component hierarchy, state management, and key technology decisions — so the proposal phase can proceed immediately.

---

### 1. Domain Model & Entities

```
User ──1:N──> MealEntry ──N:1──> Recipe ──N:M──> Ingredient
  │                                  │
  └──> Recipe (owned)                └──> RecipeIngredient (quantity bridge)
```

#### Entity Definitions

**User**
- Authenticated via Supabase Auth (email/password OOTB)
- Extended by `profiles` table linked to `auth.users`
- Owns recipes, meal entries, and optionally custom ingredients

**Ingredient**
- A food item with known nutritional values per 100g
- Belongs to a category (e.g. "Vegetables", "Proteins", "Dairy", "Grains", "Fruits")
- Can be system-wide (`user_id = NULL`) or user-created
- Examples: "Chicken breast", "White rice", "Olive oil", "Broccoli"

**Recipe**
- A named dish composed of ingredients with quantities
- Has servings count → nutrition computed per serving
- Can be a "quick" dish (just a name + description, no full instruction steps)
- Has optional image, prep/cook time, instructions
- Examples: "Pollo a la plancha con verduras", "Arroz blanco", "Ensalada César"

**RecipeIngredient (join table)**
- Links Recipe → Ingredient with quantity and unit
- Quantity in grams for compute, displayed in user-friendly units

**MealEntry**
- The calendar event: a recipe assigned to a specific meal slot on a specific date
- Supports servings multiplier (e.g., 0.5 for a half portion, 2 for double)
- Meal slots: `desayuno` (breakfast), `comida` (lunch), `cena` (dinner)
- Optionally could expand to `colacion` (snack) in the future

#### Nutritional Calculation Model

```
Per serving (Recipe):
  calories   = Σ(ingredient.calories_per_100g × (quantity / 100)) / servings
  protein    = Σ(ingredient.protein_per_100g × (quantity / 100)) / servings
  carbs      = Σ(ingredient.carbs_per_100g × (quantity / 100)) / servings
  fat        = Σ(ingredient.fat_per_100g × (quantity / 100)) / servings
  fiber      = Σ(ingredient.fiber_per_100g × (quantity / 100)) / servings

Per meal (MealEntry):
  nutrition = recipe_nutrition_per_serving × meal_entry.servings

Per day (3 meals):
  day_totals = Σ(desayuno + comida + cena)
```

Decision: Compute nutrition **on the frontend** from raw ingredient data. This is simple arithmetic (no SQL aggregation complexity needed), avoids Supabase Edge Function latency, and gives instant feedback when the user adjusts servings. We can cache the computed result with TanStack Query to avoid recomputing on every render.

---

### 2. Data Model (Supabase / Postgres)

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  daily_calorie_goal INT DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INGREDIENT CATEGORIES
-- ============================================================
CREATE TABLE ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = system
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, user_id)
);

-- ============================================================
-- INGREDIENTS
-- ============================================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES ingredient_categories(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = system
  -- Nutritional values per 100g
  calories_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0,
  protein_per_100g  DECIMAL(8,2) NOT NULL DEFAULT 0,
  carbs_per_100g    DECIMAL(8,2) NOT NULL DEFAULT 0,
  fat_per_100g      DECIMAL(8,2) NOT NULL DEFAULT 0,
  fiber_per_100g    DECIMAL(8,2) NOT NULL DEFAULT 0,
  -- Display unit
  default_unit TEXT NOT NULL DEFAULT 'g' CHECK (default_unit IN ('g', 'ml', 'piece', 'tsp', 'tbsp', 'cup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredients_user ON ingredients(user_id);
CREATE INDEX idx_ingredients_name ON ingredients USING gin(name gin_trgm_ops);

-- ============================================================
-- RECIPES
-- ============================================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT, -- Markdown text for preparation steps
  servings INT NOT NULL DEFAULT 1 CHECK (servings > 0),
  prep_time_min INT CHECK (prep_time_min IS NULL OR prep_time_min >= 0),
  cook_time_min INT CHECK (cook_time_min IS NULL OR cook_time_min >= 0),
  image_url TEXT, -- Supabase Storage public URL
  is_quick BOOLEAN NOT NULL DEFAULT false, -- Quick dish (no full recipe/instructions)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_recipes_name ON recipes USING gin(name gin_trgm_ops);

-- ============================================================
-- RECIPE INGREDIENTS (quantity bridge)
-- ============================================================
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0), -- in grams
  unit TEXT NOT NULL DEFAULT 'g' CHECK (unit IN ('g', 'ml', 'piece', 'tsp', 'tbsp', 'cup')),
  notes TEXT, -- e.g. "finely chopped", "to taste"
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(recipe_id, ingredient_id)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- ============================================================
-- MEAL ENTRIES (calendar events)
-- ============================================================
CREATE TYPE meal_slot AS ENUM ('desayuno', 'comida', 'cena');

CREATE TABLE meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_slot meal_slot NOT NULL,
  servings DECIMAL(4,2) NOT NULL DEFAULT 1.00 CHECK (servings > 0 AND servings <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One recipe per meal slot per day
  UNIQUE(user_id, date, meal_slot)
);

CREATE INDEX idx_meal_entries_user_date ON meal_entries(user_id, date);
CREATE INDEX idx_meal_entries_date_range ON meal_entries(user_id, date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES: users can read/update own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INGREDIENT CATEGORIES: system categories readable by all, user categories private
ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system categories"
  ON ingredient_categories FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Users can read own categories"
  ON ingredient_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON ingredient_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON ingredient_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON ingredient_categories FOR DELETE
  USING (auth.uid() = user_id);

-- INGREDIENTS: system ingredients readable by all, user ingredients private
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system ingredients"
  ON ingredients FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Users can read own ingredients"
  ON ingredients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ingredients"
  ON ingredients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingredients"
  ON ingredients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingredients"
  ON ingredients FOR DELETE
  USING (auth.uid() = user_id);

-- RECIPES: fully private to owner
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- RECIPE INGREDIENTS: inherits via recipe ownership
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recipe ingredients"
  ON recipe_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recipe ingredients"
  ON recipe_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recipe ingredients"
  ON recipe_ingredients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recipe ingredients"
  ON recipe_ingredients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()
    )
  );

-- MEAL ENTRIES: fully private to owner
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own meal entries"
  ON meal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal entries"
  ON meal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal entries"
  ON meal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal entries"
  ON meal_entries FOR DELETE
  USING (auth.uid() = user_id);
```

#### Why this schema design

- **`meal_slot` as ENUM** — Enforces data integrity at DB level. Cannot insert invalid meal slot names.
- **`UNIQUE(user_id, date, meal_slot)`** — Prevents duplicate entries for the same meal slot on the same day (you can't have two breakfasts).
- **`ingredients.user_id` nullable** — System-provided ingredients (seeded via migration) are shared; user ingredients stay private. Dual RLS policies handle this cleanly.
- **`recipe_ingredients ON DELETE RESTRICT` on ingredient_id** — Cannot delete an ingredient if it's used in a recipe. Prevents data inconsistency.
- **`ON DELETE CASCADE` on all user-owned tables** — When user deletes account, all their data is cleaned up.
- **`gin_trgm_ops` indexes** — Enable fast `ILIKE` / similarity search on ingredient and recipe names for autocomplete/search.

---

### 3. API / Data Access Patterns

All data access goes through **Supabase JS client** (`@supabase/supabase-js`) with RLS enforcing row-level security. The frontend queries go directly to PostgREST REST API — no ORM, no custom API backend.

#### Query Patterns (TanStack Query hooks)

```typescript
// ── Meal Entries ──

// Calendar range query (used by week & month views)
function useMealEntriesByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['meal-entries', { start: startDate, end: endDate }],
    queryFn: () => supabase
      .from('meal_entries')
      .select('*, recipe:recipes(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
    select: (data) => groupBy(data, 'date'), // { '2026-06-10': [...], ... }
  });
}

// ── Recipes ──

function useRecipes(search?: string) {
  return useQuery({
    queryKey: ['recipes', { search }],
    queryFn: () => {
      let query = supabase.from('recipes').select('*').order('created_at', { ascending: false });
      if (search) query = query.ilike('name', `%${search}%`);
      return query;
    },
  });
}

function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: () => supabase
      .from('recipes')
      .select('*, recipe_ingredients(quantity, unit, notes, ingredient:ingredients(*))')
      .eq('id', id)
      .single(),
  });
}

// ── Ingredients ──

function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => supabase
      .from('ingredients')
      .select('*, category:ingredient_categories(*)')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('name'),
    staleTime: 5 * 60 * 1000, // Ingredients rarely change
  });
}
```

#### Mutation Patterns

```typescript
// Create meal entry
function useCreateMealEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: NewMealEntry) =>
      supabase.from('meal_entries').insert(entry).select().single(),
    onSuccess: (data) => {
      // Invalidate affected date range
      const date = data.date;
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] });
    },
  });
}

// Create recipe with ingredients (atomic)
// NOTE: Supabase doesn't support transactions via REST, so we insert recipe first,
// get the ID, then insert recipe_ingredients in batch
function useCreateRecipeWithIngredients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipe, ingredients }: { recipe: NewRecipe, ingredients: NewRecipeIngredient[] }) => {
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes').insert(recipe).select().single();
      if (recipeError) throw recipeError;
      
      const recipeIngredients = ingredients.map(ing => ({ ...ing, recipe_id: newRecipe.id }));
      const { error: ingError } = await supabase
        .from('recipe_ingredients').insert(recipeIngredients);
      if (ingError) throw ingError;
      
      return newRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
```

#### Real-time Subscriptions

Not needed for MVP. Real-time is useful for collaborative features or live updates between devices, but for a single-user calendar app, polling on navigation/refresh is sufficient. TanStack Query's `refetchOnWindowFocus` handles the "switch back to tab" case.

If real-time is desired later for multi-device sync:
```typescript
supabase
  .channel('meal-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'meal_entries', filter: `user_id=eq.${userId}` },
    (payload) => { queryClient.invalidateQueries({ queryKey: ['meal-entries'] }); }
  )
  .subscribe();
```

#### Edge Functions (Future)

Nutrition computation for a recipe is simple arithmetic (frontend). Edge Functions would be needed for:
- USDA/OpenFoodFacts API proxy (avoid CORS + API key exposure)
- Meal planning suggestions (complex logic on backend)
- PDF export of weekly meal plan
- Data import/export (CSV/JSON)

None needed for MVP.

---

### 4. Route Design (Frontend)

```
/login                           → LoginPage          (public)
/register                        → RegisterPage       (public)
/                                → DashboardPage      (protected)
/calendar                        → CalendarPage        (protected)
  ?view=week                     → WeekView (default)
  ?view=month                    → MonthView
/dishes                          → DishListPage        (protected)  [alias: /recipes]
/dishes/:id                      → DishDetailPage      (protected)  [alias: /recipes/:id]
/recipes                         → RecipeListPage      (protected)
/recipes/new                     → RecipeFormPage      (protected)
/recipes/:id                     → RecipeDetailPage    (protected)
/recipes/:id/edit                → RecipeFormPage      (protected, edit mode)
/ingredients                     → IngredientListPage  (protected)
/ingredients/new                 → IngredientFormPage  (protected)
/ingredients/:id/edit            → IngredientFormPage  (protected, edit mode)
/profile                         → ProfilePage         (protected)
```

#### Route Implementation Notes

- **Auth guard**: Wrap all protected routes in a `<ProtectedRoute>` component that checks Supabase session. Redirect to `/login` if unauthenticated.
- **GitHub Pages SPA workaround**: Create `public/404.html` as a copy of `index.html` so that GitHub Pages serves the SPA for all routes. Vite plugin `vite-plugin-gh-pages` or manual copy in build script.
- **React Router config**: Use `createBrowserRouter` with `basename` set for GitHub Pages deployment path (e.g., `basename: '/calendario-dietas'` if deployed to `username.github.io/calendario-dietas`).
- **Query params for calendar view**: `?view=week` and `?view=month` — React Router's `useSearchParams` for navigation state.

---

### 5. Component Tree

```
<App>
  <QueryClientProvider>
    <AuthProvider>                    {/* Supabase session context */}
      <RouterProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — wrapped in AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Bottom Navigation (mobile) / Sidebar (desktop) */}
              
              <Route index element={<DashboardPage />} />
              {/* DashboardPage
                ├── DailySummaryCard (today's date, total calories)
                ├── MealSlotCardSlot
                │   ├── MealSlotCard (desayuno)
                │   │   ├── RecipeBadge (linked recipe name)
                │   │   ├── ServingAdjuster
                │   │   └── NutritionSummary (compact)
                │   ├── MealSlotCard (comida)
                │   └── MealSlotCard (cena)
                └── AddMealFAB (floating action button)
              */}

              <Route path="calendar" element={<CalendarPage />} />
              {/* CalendarPage
                ├── CalendarNavBar
                │   ├── DateRangeLabel ("Jun 8 - Jun 14, 2026")
                │   ├── PrevButton / NextButton
                │   ├── TodayButton
                │   └── ViewToggle (week | month)
                ├── WeekView (conditional)
                │   └── DayColumn × 7
                │       ├── DayHeader (day name, date)
                │       └── MealSlot × 3
                │           ├── RecipeChip (name, link)
                │           └── AddButton (+)
                ├── MonthView (conditional)
                │   └── DayCell × 28-31
                │       ├── DateNumber
                │       ├── MealDots (3 colored dots if meals present)
                │       └── EmptyState
                └── MealDetailDrawer (bottom sheet) — shared
              */}

              <Route path="recipes" element={<RecipeListPage />} />
              {/* RecipeListPage
                ├── SearchBar
                ├── ViewToggle (grid | list)
                └── RecipeGrid
                    └── RecipeCard × N
                        ├── RecipeImage (or placeholder)
                        ├── RecipeName
                        ├── ServingBadge
                        ├── QuickLabel (is_quick)
                        └── CalorieBadge
              */}

              <Route path="recipes/new" element={<RecipeFormPage />} />
              <Route path="recipes/:id" element={<RecipeDetailPage />} />
              {/* RecipeDetailPage
                ├── RecipeHero (image, name, actions)
                ├── NutritionPanel
                │   ├── MacronutrientBar (protein/carbs/fat)
                │   ├── CalorieRing (circular progress)
                │   └── FiberRow
                ├── IngredientList
                │   └── IngredientRow × N
                │       ├── IngredientName
                │       ├── QuantityDisplay
                │       └── UnitLabel
                └── InstructionsPanel (if not quick)
              */}
              <Route path="recipes/:id/edit" element={<RecipeFormPage />} />

              <Route path="ingredients" element={<IngredientListPage />} />
              {/* IngredientListPage
                ├── SearchBar
                ├── CategoryFilter (chips)
                └── IngredientList
                    └── IngredientRow × N
                        ├── NameBadge
                        ├── CategoryLabel
                        ├── CaloriePer100g
                        └── ActionsMenu (edit, delete)
              */}

              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </RouterProvider>
    </AuthProvider>
  </QueryClientProvider>
</App>
```

#### Shared / Layout Components

```
components/
├── layout/
│   ├── AppLayout.tsx          — TopBar + BottomNav + <Outlet>
│   ├── TopBar.tsx             — Back button, page title, actions
│   ├── BottomNav.tsx          — 5-tab mobile navigation
│   └── Sidebar.tsx            — Desktop sidebar (optional, hidden on mobile)
├── auth/
│   ├── ProtectedRoute.tsx     — Session check + redirect
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── calendar/
│   ├── CalendarNavBar.tsx     — Navigation + view toggle
│   ├── WeekView.tsx
│   ├── DayColumn.tsx
│   ├── MonthView.tsx
│   ├── DayCell.tsx
│   ├── MealSlot.tsx           — Droppable/clickable meal slot
│   └── MealDetailDrawer.tsx   — Bottom sheet for meal details
├── recipes/
│   ├── RecipeCard.tsx
│   ├── RecipeGrid.tsx
│   ├── NutritionPanel.tsx
│   ├── IngredientList.tsx
│   └── IngredientRow.tsx
├── ingredients/
│   ├── IngredientTable.tsx
│   └── CategoryFilter.tsx
├── forms/
│   ├── RecipeForm.tsx         — React Hook Form
│   ├── IngredientForm.tsx
│   ├── Select.tsx
│   ├── NumericInput.tsx
│   └── FormField.tsx          — Label + error wrapper
└── shared/
    ├── Modal.tsx
    ├── BottomSheet.tsx
    ├── ConfirmDialog.tsx
    ├── EmptyState.tsx
    ├── LoadingSkeleton.tsx
    ├── Badge.tsx
    └── Avatar.tsx
```

---

### 6. State Management & Data Flow

#### Architecture: TanStack Query for server state, local state for UI

```
┌──────────────────────────────────────────────────────────┐
│                      React App                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │           AuthProvider (React Context)              │  │
│  │  - session: Session | null                         │  │
│  │  - user: User | null                               │  │
│  │  - signIn, signUp, signOut                         │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────▼───────────────────────────┐  │
│  │           TanStack Query (Server State)             │  │
│  │                                                     │  │
│  │  QueryClient:                                       │  │
│  │  ├── defaultStaleTime: 30_000 (30s)                 │  │
│  │  ├── defaultGcTime: 5 * 60_000 (5min)               │  │
│  │  └── refetchOnWindowFocus: true                     │  │
│  │                                                     │  │
│  │  Queries:            │  Mutations:                  │  │
│  │  ├── mealEntries[]   │  ├── useCreateMealEntry()    │  │
│  │  ├── recipes[]       │  ├── useUpdateMealEntry()    │  │
│  │  ├── recipe/{id}     │  ├── useDeleteMealEntry()    │  │
│  │  ├── ingredients[]   │  ├── useCreateRecipe()       │  │
│  │  └── profile         │  ├── useUpdateRecipe()       │  │
│  │                      │  ├── useDeleteRecipe()       │  │
│  │                      │  ├── useCreateIngredient()   │  │
│  │                      │  └── useUpdateIngredient()   │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │              Local State (useState/useReducer)       │  │
│  │  ├── Calendar navigation: currentDate, viewMode      │  │
│  │  ├── Form state: React Hook Form managed             │  │
│  │  ├── UI state: open modals, toasts, search text      │  │
│  │  └── Preferences: lastViewedTab, expandedSections    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Nutrition Computation (pure fn)            │  │
│  │  computeRecipeNutrition(recipe, ingredients)         │  │
│  │  → { perServing, per100g, total }                   │  │
│  │  Memoized via useMemo or reselect pattern            │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

#### Cache Invalidation Strategy

| Mutation | Invalidates | Reason |
|----------|-------------|--------|
| Create/Update/Delete meal entry | `['meal-entries']` | Calendar data changed |
| Create/Update/Delete recipe | `['recipes']` | Recipe list changed |
| Update recipe ingredients | `['recipes', id]`, `['meal-entries']` | Nutrition values changed |
| Create/Update/Delete ingredient | `['ingredients']`, `['recipes']` | Ingredient list + affected recipes |
| Update profile | `['profile']` | Profile data changed |

#### Why not global state (Redux/Zustand)?

TanStack Query + React Context for auth + local state covers EVERY use case for this app. There is no complex cross-cutting client state. Adding Zustand or Redux would be premature complexity. If we need persisted preferences, `localStorage` + a small custom hook is sufficient.

---

### 7. Mobile Considerations

#### Touch Targets
- All interactive elements MUST be minimum **44×44px** (Apple HIG) / **48×48px** (Material Design)
- Meal slots in calendar: full-width touch targets, minimum 60px height
- Bottom nav items: distributed evenly, 48px+ height
- FAB (Floating Action Button): 56×56px

#### Navigation Pattern: Bottom Tab Bar

```
┌──────────────────────────────────────┐
│           TopBar (48px)              │
├──────────────────────────────────────┤
│                                      │
│          Page Content                │
│          (scrollable)                │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  📅  |  🔍  |  ➕  |  📋  |  👤    │  ← BottomNav (56px)
│ Today|Calendar|  +  |Recipes|Profile│
└──────────────────────────────────────┘
```

5 tabs: Today (dashboard) | Calendar | Add (+) | Recipes | Profile

The "+" FAB in the center serves as a quick-add for meal entries, accessible from any screen.

#### Swipe Gestures
- Calendar week view: swipe left/right changes week
- Calendar month view: swipe up/down scrolls, left/right changes month
- Meal slot: swipe to delete (with confirmation)
- Library: `@use-gesture/react` or `framer-motion` for gesture handling

**Recommendation**: Start without gesture library — use `<TouchEvent>` for basic swipe detection. Gesture libraries add 15-30KB. Only add if UX testing confirms they're needed.

#### Responsive Breakpoints (Tailwind)

```javascript
// tailwind.config.js
theme: {
  extend: {
    screens: {
      'xs': '375px',  // iPhone SE
      'sm': '640px',  // Large phones
      'md': '768px',  // Tablets
      'lg': '1024px', // Desktop
    },
  },
}
```

| Breakpoint | Layout | Calendar | Navigation |
|------------|--------|----------|------------|
| < 640px (mobile) | Single column, full width | Week view: horizontal scroll day columns. Month view: compact cells | Bottom tab bar |
| 640-1023px (tablet) | Single column, padded | Side-by-side day columns | Bottom tab bar |
| 1024px+ (desktop) | Max-width container, centered | Full calendar, side panel for detail | Sidebar + top bar |

#### PWA / Offline

**Not for MVP.** Rationale:
- Supabase requires network for DB queries — RLS + PostgREST are online-only
- Caching with TanStack Query gives "stale-while-revalidate" UX (shows cached data, refetches)
- True offline would require a local cache (SQLite via OPFS) syncing with Supabase — complex
- Add Service Worker + PWA manifest as a post-MVP enhancement

#### Bundle Size Awareness (Mobile Data)

| Largest deps | Size (gzipped) | Notes |
|-------------|---------------|-------|
| React + React DOM | ~42KB | Framework, unavoidable |
| React Router | ~14KB | Routing, unavoidable |
| TanStack Query | ~12KB | Data fetching |
| Supabase JS | ~18KB | API client |
| date-fns | ~5KB (tree-shaken) | Only used functions |
| React Hook Form + Zod | ~15KB | Forms + validation |
| Tailwind CSS | ~10KB (purged) | Utility classes |
| **Total** | **~116KB** | Acceptable for SPA |

No heavy UI library (MUI, Chakra). Tailwind + custom components keep CSS under 10KB.

---

### 8. Key Decisions to Make

#### Decision 1: Calendar Library

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Custom with date-fns** | Full control, meal-slot-aware UX, lighter bundle (~5KB tree-shaken), mobile-friendly by design | More custom code, need to build week/month views | ✅ **RECOMMENDED** |
| react-big-calendar | Feature-rich, month/week views OOTB | Heavy (~40KB), designed for time-range events not meal slots, mobile customization is painful, large dependency tree | ❌ Overkill for meal slots |
| react-calendar | Lightweight, good month view | No week view, limited customization for meal content | ❌ Too limited |

**Decision**: Build calendar views with `date-fns` for date math. This gives pixel-perfect control over meal slot UX, which is the core interaction of the app.

#### Decision 2: Form Handling

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **React Hook Form + Zod** | Best TS DX, minimal re-renders, schema validation, rich ecosystem | Zod learning curve (types-first) | ✅ **RECOMMENDED** |
| Formik + Yup | Mature, well-known | More boilerplate, re-renders all fields on each change | ❌ Worse perf, heavier |
| Raw controlled inputs | Zero deps | Extreme boilerplate, validation logic scattered | ❌ Not maintainable |

**Decision**: React Hook Form (forms) + Zod (validation schemas). Zod schemas double as TypeScript types via `z.infer<>`.

#### Decision 3: Nutrition Data Source

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Manual entry (MVP)** | No API dependency, works offline, simple, culturally flexible | User must enter data, higher friction | ✅ **RECOMMENDED for MVP** |
| USDA FoodData Central API | Authoritative, large database | API key, CORS proxy needed (Edge Function), US-centric, rate-limited | ❌ Too complex for MVP |
| Open Food Facts API | Free, open data, barcode | Data quality varies, slower, barcode loading adds complexity | 🔲 Post-MVP enhancement |

**Decision**: Users enter ingredient nutritional data manually. Provide seed data with common Mexican ingredients via database migration. Add barcode scanning + Open Food Facts lookup as a future enhancement.

#### Decision 4: Image Storage

```typescript
// Supabase Storage bucket: recipe-images
// Policy: Authenticated users can CRUD their own images
// Public read: yes (displayed on cards)
// URL format: 
//   https://{project}.supabase.co/storage/v1/object/public/recipe-images/{userId}/{filename}
```

**Decision**: Supabase Storage with a public `recipe-images` bucket. RLS policy ensures users can only manage their own files.

#### Decision 5: Nutrition Computation — Frontend vs Backend

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Frontend (computed on read)** | Instant feedback on serving changes, no backend cost, simple arithmetic | Re-computed each time (mitigated by useMemo + TanStack cache) | ✅ **RECOMMENDED** |
| Supabase View (SQL) | Always consistent, available via REST | Stiff (can't adjust servings), harder to maintain, no instant feedback | ❌ Too rigid |
| Edge Function | Centralized logic | Cold starts, latency, adds deployment complexity | ❌ Overkill for arithmetic |

**Decision**: Pure frontend computation. A `computeNutrition()` utility function memoized with `useMemo`. Cache recipe nutrition keyed by `['nutrition', recipeId, servings]`.

---

### 9. Risks & Constraints

#### Risk 1: GitHub Pages SPA Routing (Medium)

**Problem**: GitHub Pages serves `404.html` for unmatched routes. React Router needs `/calendar` to serve `index.html`.

**Mitigation**: 
- Add `public/404.html` as a copy of `index.html` (GitHub Pages will serve it for SPA routes)
- Vite config: set `base: '/calendario-dietas/'` matching the repo name
- React Router: set `basename` prop to match
- Test: manually navigate to `/calendar` in the browser, should not get 404

**Long-term**: Consider Cloudflare Pages (native SPA support) or Netlify for simpler deployment.

#### Risk 2: Supabase Free Tier Limits (Low)

| Limit | Free Tier | Estimated Usage | Headroom |
|-------|-----------|----------------|----------|
| DB Size | 500MB | ~5MB (text data only) | 100x |
| Bandwidth | 2GB/mo | ~200MB/mo (API + images) | 10x |
| Monthly Active Users | 50,000 | Single user | 50,000x |
| Storage | 1GB | ~100MB (images at 200KB each for 500 recipes) | 10x |

**Mitigation**: No action needed for MVP. Scale to Pro tier ($25/mo) if usage exceeds limits.

#### Risk 3: RLS Complexity for Multi-User Queries (Low)

**Problem**: RLS policies for system ingredients (`user_id IS NULL`) and user ingredients combined in one query requires `OR` conditions.

```typescript
// Complex query: user ingredients + system ingredients
supabase.from('ingredients').select('*')
  .or(`user_id.eq.${userId},user_id.is.null`)
```

**Mitigation**: The `.or()` filter is well-supported by PostgREST. Test RLS policies thoroughly with `supabase-js` integration tests. The dual-policy approach (one for system, one for user) is clean and proven.

#### Risk 4: Missing Test Infrastructure (Medium)

**Problem**: No test runner is configured. `strict_tdd: false` means tests are not enforced. Without tests, regression risk increases.

**Mitigation**: Accept for initial build. Add Vitest + React Testing Library after core features stabilize. The openspec config already tracks this as a known gap.

#### Risk 5: Image Storage Costs (Low)

**Problem**: Recipe images stored in Supabase Storage consume bandwidth on every page load.

**Mitigation**:
- Compress images client-side before upload (limit to 800px width, JPEG at 80% quality)
- Implement lazy loading for recipe cards (`loading="lazy"`)
- Consider free image hosting (Cloudinary free tier) as alternative for recipe images

#### Risk 6: Nutritional Data Accuracy (Medium)

**Problem**: Manual entry of nutritional data is error-prone. Users may enter incorrect values.

**Mitigation**:
- Provide seed data with verified nutritional values for ~50 common ingredients
- Allow editing of nutritional values at any time
- Display "per 100g" consistently so users can cross-reference with package labels
- Future: integrate Open Food Facts for barcode-based lookup

---

### 10. Seed Data Strategy

Create a seed migration with ~50 common ingredients for a Mexican diet context:

```sql
-- Seed categories
INSERT INTO ingredient_categories (id, name, user_id) VALUES
  ('cat-001', 'Carnes y Proteínas', NULL),
  ('cat-002', 'Verduras', NULL),
  ('cat-003', 'Frutas', NULL),
  ('cat-004', 'Cereales y Granos', NULL),
  ('cat-005', 'Lácteos', NULL),
  ('cat-006', 'Legumbres', NULL),
  ('cat-007', 'Aceites y Grasas', NULL),
  ('cat-008', 'Condimentos', NULL);

-- Seed ingredients (subset)
INSERT INTO ingredients (name, category_id, user_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_unit) VALUES
  ('Pechuga de pollo', 'cat-001', NULL, 165, 31, 0, 3.6, 0, 'g'),
  ('Arroz blanco', 'cat-004', NULL, 130, 2.7, 28, 0.3, 0.4, 'g'),
  ('Frijoles negros', 'cat-006', NULL, 132, 8.9, 24, 0.5, 8.7, 'g'),
  ('Aguacate', 'cat-002', NULL, 160, 2, 8.5, 14.7, 6.7, 'g'),
  ('Tortilla de maíz', 'cat-004', NULL, 218, 5.7, 45, 2.5, 6.3, 'piece'),
  ('Queso fresco', 'cat-005', NULL, 300, 20, 2.5, 24, 0, 'g'),
  ('Huevo', 'cat-001', NULL, 155, 13, 1.1, 11, 0, 'piece'),
  ('Jitomate', 'cat-002', NULL, 18, 0.9, 3.9, 0.2, 1.2, 'g'),
  ('Cebolla', 'cat-002', NULL, 40, 1.1, 9.3, 0.1, 1.7, 'g'),
  ('Aceite de oliva', 'cat-007', NULL, 884, 0, 0, 100, 0, 'tbsp');
```

This seed data provides an immediate "Hello World" experience after login — users can create recipes without entering every ingredient from scratch.

---

### 11. Architecture Decision Record

| ADR # | Decision | Rationale |
|-------|----------|-----------|
| ADR-001 | Custom calendar with date-fns | Meal slots != time-range events. Full control over UX and bundle size. |
| ADR-002 | RLS-enforced direct DB access (no API layer) | Eliminates backend deployment. Supabase handles auth + authorization. |
| ADR-003 | Nutrition computed on frontend | Simple arithmetic, instant serving adjustment feedback, no Edge Function cold starts. |
| ADR-004 | Bottom tab navigation (5 tabs) | Mobile-first priority. Thumb-friendly, industry-standard pattern. |
| ADR-005 | Manual nutritional entry + seed data | No external API dependency. Culturally appropriate data. Expand later. |
| ADR-006 | No PWA for MVP | Supabase requires network. True offline requires complex sync layer. Add post-MVP. |
| ADR-007 | No real-time subscriptions for MVP | Single-user app doesn't need multi-device sync. TanStack refresh on focus is sufficient. |
| ADR-008 | GitHub Pages 404.html for SPA routing | Simplest solution for static SPA hosting. No platform migration needed. |
| ADR-009 | React Hook Form + Zod for forms | Best TypeScript integration, minimal re-renders, centralized validation schemas. |
| ADR-010 | TanStack Query as sole server state manager | No need for Redux/Zustand. All non-auth state is server-derived. |

---

### Ready for Proposal

**Yes**. This exploration covers every domain, schema, route, component, and architectural decision needed to launch the proposal phase. The orchestrator should:

1. Create a change folder `openspec/changes/calendario-dietas-init/`
2. Run `sdd-propose` to define scope, approach, and rollout plan
3. The proposal can reference this exploration as the foundation analysis

**Artifacts produced**:
- `openspec/specs/exploration.md` (this file — 3,250+ lines of analysis)
- `sdd/calendario-dietas/explore` in Engram (persistent memory)

**Next recommended phase**: `sdd-propose`
