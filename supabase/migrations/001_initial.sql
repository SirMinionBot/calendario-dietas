-- ============================================================
-- CALENDARIO DE DIETAS — Initial Schema
-- Version: 001
-- Applied: Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE meal_slot AS ENUM ('desayuno', 'comida', 'cena');
CREATE TYPE meal_entry_type AS ENUM ('normal', 'fuera', 'cheat', 'evento');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  daily_calorie_goal INT NOT NULL DEFAULT 2000 CHECK (daily_calorie_goal > 0),
  week_start_day INT NOT NULL DEFAULT 1 CHECK (week_start_day BETWEEN 1 AND 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INGREDIENT CATEGORIES (hierarchical)
-- ============================================================
CREATE TABLE ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES ingredient_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredient_categories_parent ON ingredient_categories(parent_id);

-- ============================================================
-- INGREDIENTS
-- ============================================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES ingredient_categories(id) ON DELETE SET NULL,
  calories_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (calories_per_100g >= 0),
  protein_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (protein_per_100g >= 0),
  carbs_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (carbs_per_100g >= 0),
  fat_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (fat_per_100g >= 0),
  fiber_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (fiber_per_100g >= 0),
  default_unit TEXT NOT NULL DEFAULT 'g' CHECK (default_unit IN ('g', 'ml', 'piece', 'tsp', 'tbsp', 'cup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredients_category ON ingredients(category_id);
CREATE INDEX idx_ingredients_name ON ingredients USING gin(name gin_trgm_ops);

-- ============================================================
-- RECIPES (SHARED — all auth users can read)
-- ============================================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  servings INT NOT NULL DEFAULT 1 CHECK (servings > 0),
  prep_time_min INT CHECK (prep_time_min IS NULL OR prep_time_min >= 0),
  cook_time_min INT CHECK (cook_time_min IS NULL OR cook_time_min >= 0),
  image_url TEXT,
  is_quick BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_name ON recipes USING gin(name gin_trgm_ops);

-- ============================================================
-- RECIPE INGREDIENTS (quantity bridge)
-- ============================================================
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'g' CHECK (unit IN ('g', 'ml', 'piece', 'tsp', 'tbsp', 'cup')),
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(recipe_id, ingredient_id)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- ============================================================
-- MEAL ENTRIES (calendar events)
-- ============================================================
CREATE TABLE meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_slot meal_slot NOT NULL,
  meal_entry_type meal_entry_type NOT NULL DEFAULT 'normal',
  servings DECIMAL(4,2) NOT NULL DEFAULT 1.00 CHECK (servings > 0 AND servings <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, meal_slot)
);

CREATE INDEX idx_meal_entries_user_date ON meal_entries(user_id, date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES: own profile only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- INGREDIENT CATEGORIES: all auth users full access
ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_all" ON ingredient_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert_all" ON ingredient_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update_all" ON ingredient_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete_all" ON ingredient_categories FOR DELETE TO authenticated USING (true);

-- INGREDIENTS: all auth users full access
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients_select_all" ON ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_insert_all" ON ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ingredients_update_all" ON ingredients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ingredients_delete_all" ON ingredients FOR DELETE TO authenticated USING (true);

-- RECIPES: shared — all auth users SELECT, creator I/U/D
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_select_all" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipes_insert_own" ON recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "recipes_update_own" ON recipes FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "recipes_delete_own" ON recipes FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RECIPE INGREDIENTS: inherits via recipe ownership
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ri_select_all" ON recipe_ingredients FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id)
);
CREATE POLICY "ri_insert_own" ON recipe_ingredients FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.created_by = auth.uid())
);
CREATE POLICY "ri_update_own" ON recipe_ingredients FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.created_by = auth.uid())
);
CREATE POLICY "ri_delete_own" ON recipe_ingredients FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.created_by = auth.uid())
);

-- MEAL ENTRIES: own entries only
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "me_select_own" ON meal_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "me_insert_own" ON meal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "me_update_own" ON meal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "me_delete_own" ON meal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Root categories (with fixed UUIDs so sub-categories can reference them)
INSERT INTO ingredient_categories (id, name, parent_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Carnes y Proteínas', NULL),
  ('a0000000-0000-0000-0000-000000000002', 'Verduras y Hortalizas', NULL),
  ('a0000000-0000-0000-0000-000000000003', 'Frutas', NULL),
  ('a0000000-0000-0000-0000-000000000004', 'Cereales y Tubérculos', NULL),
  ('a0000000-0000-0000-0000-000000000005', 'Legumbres', NULL),
  ('a0000000-0000-0000-0000-000000000006', 'Lácteos y Huevos', NULL),
  ('a0000000-0000-0000-0000-000000000007', 'Aceites y Grasas', NULL),
  ('a0000000-0000-0000-0000-000000000008', 'Condimentos y Especias', NULL);

-- Sub-categories (hierarchical — parent_id references root UUIDs)
INSERT INTO ingredient_categories (id, name, parent_id) VALUES
  ('a0000000-0000-0000-0000-000000000101', 'Carnes rojas',       'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000102', 'Aves',               'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000103', 'Pescados y Mariscos','a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000201', 'Verduras de hoja',   'a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000202', 'Verduras de fruto',  'a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000301', 'Frutas tropicales',  'a0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000401', 'Granos y semillas',  'a0000000-0000-0000-0000-000000000004');

-- Ingredients (category_id references the sub-category UUIDs above)
INSERT INTO ingredients (name, category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_unit) VALUES
  ('Pechuga de pollo',     'a0000000-0000-0000-0000-000000000102', 165, 31, 0, 3.6, 0, 'g'),
  ('Carne molida de res',  'a0000000-0000-0000-0000-000000000101', 250, 26, 0, 17, 0, 'g'),
  ('Filete de pescado',    'a0000000-0000-0000-0000-000000000103', 206, 22, 0, 12, 0, 'g'),
  ('Salmón',               'a0000000-0000-0000-0000-000000000103', 208, 20, 0, 13, 0, 'g'),
  ('Huevo',                'a0000000-0000-0000-0000-000000000006', 155, 13, 1.1, 11, 0, 'piece'),
  ('Leche entera',         'a0000000-0000-0000-0000-000000000006', 61, 3.2, 4.8, 3.3, 0, 'ml'),
  ('Queso fresco',         'a0000000-0000-0000-0000-000000000006', 300, 20, 2.5, 24, 0, 'g'),
  ('Yogur natural',        'a0000000-0000-0000-0000-000000000006', 59, 3.5, 4.7, 3.3, 0, 'g'),
  ('Aguacate',             'a0000000-0000-0000-0000-000000000202', 160, 2, 8.5, 14.7, 6.7, 'g'),
  ('Jitomate',             'a0000000-0000-0000-0000-000000000202', 18, 0.9, 3.9, 0.2, 1.2, 'g'),
  ('Cebolla blanca',       'a0000000-0000-0000-0000-000000000202', 40, 1.1, 9.3, 0.1, 1.7, 'g'),
  ('Espinacas',            'a0000000-0000-0000-0000-000000000201', 23, 2.9, 3.6, 0.4, 2.2, 'g'),
  ('Lechuga romana',       'a0000000-0000-0000-0000-000000000201', 17, 1.2, 3.3, 0.3, 2.1, 'g'),
  ('Brócoli',              'a0000000-0000-0000-0000-000000000202', 34, 2.8, 7, 0.4, 2.6, 'g'),
  ('Zanahoria',            'a0000000-0000-0000-0000-000000000202', 41, 0.9, 9.6, 0.2, 2.8, 'g'),
  ('Calabacita',           'a0000000-0000-0000-0000-000000000202', 17, 1.2, 3.1, 0.3, 1, 'g'),
  ('Chile poblano',        'a0000000-0000-0000-0000-000000000202', 20, 0.9, 4.2, 0.2, 1.5, 'g'),
  ('Plátano',              'a0000000-0000-0000-0000-000000000301', 89, 1.1, 23, 0.3, 2.6, 'g'),
  ('Manzana',              'a0000000-0000-0000-0000-000000000003', 52, 0.3, 14, 0.2, 2.4, 'piece'),
  ('Naranja',              'a0000000-0000-0000-0000-000000000301', 47, 0.9, 12, 0.1, 2.4, 'piece'),
  ('Papaya',               'a0000000-0000-0000-0000-000000000301', 43, 0.5, 11, 0.3, 1.7, 'g'),
  ('Mango',                'a0000000-0000-0000-0000-000000000301', 60, 0.8, 15, 0.4, 1.6, 'g'),
  ('Fresas',               'a0000000-0000-0000-0000-000000000301', 32, 0.7, 7.7, 0.3, 2, 'g'),
  ('Arroz blanco',         'a0000000-0000-0000-0000-000000000004', 130, 2.7, 28, 0.3, 0.4, 'g'),
  ('Arroz integral',       'a0000000-0000-0000-0000-000000000004', 111, 2.6, 23, 0.9, 1.8, 'g'),
  ('Tortilla de maíz',     'a0000000-0000-0000-0000-000000000004', 218, 5.7, 45, 2.5, 6.3, 'piece'),
  ('Pan de trigo integral','a0000000-0000-0000-0000-000000000004', 247, 13, 41, 3.4, 7, 'piece'),
  ('Papa',                 'a0000000-0000-0000-0000-000000000004', 77, 2, 17, 0.1, 2.2, 'piece'),
  ('Camote',               'a0000000-0000-0000-0000-000000000004', 86, 1.6, 20, 0.1, 3, 'g'),
  ('Avena',                'a0000000-0000-0000-0000-000000000004', 389, 17, 66, 6.9, 11, 'g'),
  ('Quinoa',               'a0000000-0000-0000-0000-000000000401', 120, 4.4, 21, 1.9, 2.8, 'g'),
  ('Frijoles negros',      'a0000000-0000-0000-0000-000000000005', 132, 8.9, 24, 0.5, 8.7, 'g'),
  ('Frijoles bayos',       'a0000000-0000-0000-0000-000000000005', 127, 8.7, 23, 0.5, 8.3, 'g'),
  ('Lentejas',             'a0000000-0000-0000-0000-000000000005', 116, 9, 20, 0.4, 7.9, 'g'),
  ('Garbanzos',            'a0000000-0000-0000-0000-000000000005', 139, 8.9, 23, 2.6, 7.6, 'g'),
  ('Aceite de oliva',      'a0000000-0000-0000-0000-000000000007', 884, 0, 0, 100, 0, 'tbsp'),
  ('Aceite vegetal',       'a0000000-0000-0000-0000-000000000007', 884, 0, 0, 100, 0, 'tbsp'),
  ('Sal de mesa',          'a0000000-0000-0000-0000-000000000008', 0, 0, 0, 0, 0, 'tsp'),
  ('Pimienta negra',       'a0000000-0000-0000-0000-000000000008', 2, 0.1, 0.5, 0, 0.2, 'tsp'),
  ('Comino',               'a0000000-0000-0000-0000-000000000008', 8, 0.4, 1.2, 0.5, 0.3, 'tsp'),
  ('Ajo',                  'a0000000-0000-0000-0000-000000000202', 149, 6.4, 33, 0.5, 2.1, 'piece'),
  ('Epazote',              'a0000000-0000-0000-0000-000000000008', 1, 0.1, 0.2, 0, 0.1, 'g');

-- Sample recipe (only if users exist)
DO $$
DECLARE
  first_user UUID;
BEGIN
  SELECT id INTO first_user FROM auth.users LIMIT 1;
  IF first_user IS NOT NULL THEN
    INSERT INTO recipes (created_by, name, description, instructions, servings, is_quick)
    VALUES (first_user, 'Pollo a la plancha con verduras', 'Pechuga de pollo salteada con calabacitas y jitomate',
      E'1. Sazona la pechuga con sal y pimienta\n2. Cocina en sartén con aceite de oliva 5 min por lado\n3. Agrega calabacita y jitomate picados\n4. Saltea 3 min más\n5. Sirve caliente',
      1, false);
  END IF;
END $$;
