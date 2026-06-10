# Nutrition Tracking Specification

## Purpose

Compute and display macronutrient values (calories, protein, carbs, fat, fiber) at the per-serving, per-meal, per-day, and per-week levels using pure frontend computation.

## Requirements

### Requirement: Per-Serving Nutrition

The system MUST compute macros per serving for a recipe using the formula: Σ(ingredient_macro × quantity_g / 100) / servings.

#### Scenario: Single ingredient recipe

- GIVEN a recipe "Arroz blanco" with 200g of rice (130 cal/100g) and 2 servings
- WHEN the user views the recipe detail
- THEN per-serving calories = (130 × 200/100) / 2 = 130

#### Scenario: Multi-ingredient recipe

- GIVEN a recipe with chicken (150g, 165 cal/100g) and oil (10g, 884 cal/100g), 2 servings
- WHEN viewing nutrition
- THEN per-serving calories = (165×1.5 + 884×0.1) / 2 = 167.95

### Requirement: Per-Meal Nutrition

The system MUST compute per-meal macros by multiplying the recipe's per-serving values by the meal entry's servings multiplier.

#### Scenario: Double serving

- GIVEN a meal entry with servings_multiplier=2 and recipe per-serving calories=130
- WHEN viewing the meal slot
- THEN meal calories = 130 × 2 = 260

#### Scenario: Half serving

- GIVEN a meal entry with servings_multiplier=0.5 and recipe per-serving protein=20g
- WHEN viewing the meal slot
- THEN meal protein = 20 × 0.5 = 10g

### Requirement: Per-Day Nutrition

The system MUST compute daily totals by summing macros across desayuno, comida, and cena for a given date.

#### Scenario: Full day planned

- GIVEN a day with 3 meal entries, each with known macros
- WHEN viewing the day summary
- THEN daily totals = sum of desayuno + comida + cena macros

#### Scenario: Partial day

- GIVEN a day with only desayuno planned
- WHEN viewing the day summary
- THEN daily totals reflect only the desayuno values (comida and cena are zero)

### Requirement: Visual Display

The system MUST display macros in a NutritionPanel component showing calories, protein, carbs, fat, and fiber. The display SHOULD include progress bars and a calorie ring showing progress toward daily goals.

#### Scenario: Under goal display

- GIVEN a daily total of 1200 calories against a 2000 goal
- WHEN viewing the NutritionPanel
- THEN the calorie ring shows 60% progress AND progress bars show proportional fill

#### Scenario: Over goal display

- GIVEN a daily total of 2500 calories against a 2000 goal
- WHEN viewing the NutritionPanel
- THEN the calorie ring shows 125% and the display indicates over-goal (e.g., color change)

### Requirement: Instant Re-computation

The system MUST re-compute nutrition values instantly when the servings multiplier changes, without requiring a page refresh or server round trip.

#### Scenario: Slider adjusts servings

- GIVEN a meal entry detail view showing nutrition
- WHEN the user changes servings from 1 to 2
- THEN the displayed nutrition values update immediately (within the same render cycle)

#### Scenario: Rapid adjustments

- GIVEN a user dragging a servings slider
- WHEN they rapidly change the value multiple times
- THEN each intermediate value computes correctly without stale intermediate results (memoized computation)
