# Recipe Management Specification

## Purpose

Manage shared recipes composed of ingredients with quantities, supporting quick dishes, markdown instructions, and inline creation during meal planning.

## Requirements

### Requirement: Shared Recipe Visibility

ALL recipes MUST be visible to every authenticated user (SELECT is public within auth). Recipes SHALL have a created_by reference to the creator, but reads are unrestricted.

#### Scenario: User sees all recipes

- GIVEN user Alice creates a recipe "Pollo al horno"
- WHEN user Bob navigates to the recipes page
- THEN Bob sees "Pollo al horno" in the list

#### Scenario: Unauthenticated access

- GIVEN a visitor who is NOT logged in
- WHEN they attempt to access /recipes
- THEN they are redirected to /login (protected route)

### Requirement: Recipe CRUD

The system MUST support full CRUD for recipes. Each recipe SHALL have name, description, instructions (markdown), servings, prep_time_min, cook_time_min, and optional image_url.

#### Scenario: Create full recipe

- GIVEN an authenticated user
- WHEN they create a recipe with name "Ensalada César", description "Classic Caesar", instructions as markdown, servings=2, prep_time_min=15
- THEN the recipe is saved and appears in the recipe list

#### Scenario: Delete recipe used in meal entries

- GIVEN a recipe is referenced by existing meal entries
- WHEN the owner deletes the recipe
- THEN the recipe and its meal entries are cascade-deleted

### Requirement: Ingredient Association

Recipes MUST associate ingredients with a quantity (in grams) and unit. The system SHALL enforce that quantities are positive.

#### Scenario: Add ingredient to recipe

- GIVEN an existing recipe "Ensalada César" and ingredient "Pechuga de pollo"
- WHEN the user adds 200g of chicken to the recipe
- THEN the ingredient appears in the recipe's ingredient list with quantity 200g

#### Scenario: Zero quantity rejected

- GIVEN an existing recipe
- WHEN the user attempts to add an ingredient with quantity = 0
- THEN the system rejects with a validation error

### Requirement: Quick Dish Flag

The system SHOULD support a quick-dish flag (`is_quick`) that marks recipes needing no instruction steps. Quick dishes MAY omit the instructions field.

#### Scenario: Create quick dish

- GIVEN an authenticated user
- WHEN they create a recipe with is_quick=true and blank instructions
- THEN the recipe is saved and displays a "Quick" badge in the list

#### Scenario: Quick dish detail view

- GIVEN a quick dish recipe
- WHEN a user views its detail page
- THEN the instructions section is hidden and shows "Quick dish — no instructions needed"

### Requirement: Inline Recipe Creation

The system SHOULD allow creating a new recipe directly from the weekly planning screen without navigating to a separate page.

#### Scenario: Inline create during planning

- GIVEN a user on the weekly planning screen
- WHEN they tap an empty meal slot and choose "New recipe"
- THEN a modal or bottom sheet opens with recipe creation fields

#### Scenario: Inline creation saves and assigns

- GIVEN a user creates a recipe via the inline modal
- WHEN they save
- THEN the recipe is created AND automatically assigned to the selected meal slot

### Requirement: Recipe Search

The system MUST support searching recipes by name using case-insensitive partial match.

#### Scenario: Search finds matching recipes

- GIVEN recipes named "Pollo al horno", "Pollo a la plancha", "Ensalada"
- WHEN a user searches for "pollo"
- THEN both chicken recipes are returned, but "Ensalada" is not

#### Scenario: Empty search shows all

- GIVEN an empty search query
- WHEN a user clears the search bar
- THEN all recipes are displayed (paginated)
