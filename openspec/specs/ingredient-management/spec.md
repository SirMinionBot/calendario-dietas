# Ingredient Management Specification

## Purpose

Manage a hierarchical catalog of ingredients with nutritional values per 100g, supporting both system-wide pre-seeded data and user-created custom entries.

## Requirements

### Requirement: Hierarchical Categories

The system MUST support ingredient categories with a parent_id self-reference for hierarchical nesting. Categories MAY be nested to any depth.

#### Scenario: Create subcategory

- GIVEN a system category "Carnes y Proteínas" exists
- WHEN a user creates a subcategory "Pollo" with parent_id = "Carnes y Proteínas"
- THEN "Pollo" appears as a child category when browsing the hierarchy

#### Scenario: Circular parent reference

- GIVEN an existing category "A"
- WHEN a user attempts to set A's parent to a category that transitively has A as parent
- THEN the system rejects the update (application-level check)

### Requirement: System and User Categories

System categories (user_id IS NULL) MUST be visible to all authenticated users. User-created categories MUST only be visible to the creating user.

#### Scenario: User sees system categories

- GIVEN a newly registered user
- WHEN they open the ingredient form
- THEN they see pre-seeded system categories like "Verduras", "Carnes y Proteínas"

#### Scenario: User cannot see another user's categories

- GIVEN user Alice creates a category "Alice's Specials"
- WHEN user Bob browses categories
- THEN Bob does NOT see "Alice's Specials"

### Requirement: Ingredient CRUD

The system MUST support creating, reading, updating, and deleting ingredients. Each ingredient SHALL have a name, category, nutritional values per 100g (calories, protein, carbs, fat, fiber), and a default unit.

#### Scenario: Create ingredient with macros

- GIVEN an authenticated user and an existing category "Frutas"
- WHEN the user creates an ingredient "Aguacate" with calories=160, protein=2, carbs=8.5, fat=14.7, fiber=6.7, default_unit="g", category="Frutas"
- THEN the ingredient is saved and appears in the ingredient list

#### Scenario: Update deletes all macros

- GIVEN an existing ingredient with all macros populated
- WHEN a user clears all macro fields to zero and saves
- THEN the ingredient is saved with zero values (valid — some ingredients like water have no macros)

### Requirement: Search and Filter

The system MUST allow searching ingredients by name (case-insensitive partial match) and filtering by category.

#### Scenario: Search by partial name

- GIVEN ingredients "Arroz blanco", "Arroz integral", and "Pollo"
- WHEN a user searches for "arroz"
- THEN "Arroz blanco" and "Arroz integral" are returned

#### Scenario: No results

- GIVEN no ingredients match the search term
- WHEN a user searches for "xyzzy"
- THEN an empty state is shown with "No ingredients found"

### Requirement: Nutritional Values Required

Each ingredient MUST have calories_per_100g specified (may be zero). The remaining macros (protein, carbs, fat, fiber) SHOULD be specified but MAY be zero.

#### Scenario: Zero-calorie ingredient

- GIVEN a user creating "Agua" (water)
- WHEN they set calories_per_100g = 0 and all other macros = 0
- THEN the ingredient is created successfully

#### Scenario: Missing required field

- GIVEN a user creating an ingredient
- WHEN they leave calories_per_100g as NULL
- THEN the form shows a validation error and does NOT submit
