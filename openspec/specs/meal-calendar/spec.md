# Meal Calendar Specification

## Purpose

Provide a dedicated weekly planning screen with a 7-day × 3-meal grid and a monthly calendar view for navigating between weeks.

## Requirements

### Requirement: Weekly Planning Screen

The system MUST render a dedicated weekly planning screen showing 7 columns (days) × 3 rows (meal slots: desayuno, comida, cena) in a grid layout.

#### Scenario: Empty week renders grid

- GIVEN a user with no meal entries for the current week
- WHEN they navigate to the weekly planning screen
- THEN they see a 7×3 grid with empty slots, each slot showing an "Add" action

#### Scenario: Week with entries

- GIVEN a user has meal entries for Monday desayuno and Monday comida
- WHEN they view the weekly planning screen
- THEN the Monday desayuno and Monday comida slots show the assigned recipe names

### Requirement: Configurable Week Start

The weekly planning screen MUST start on the user's configured week_start_day stored in their profile.

#### Scenario: Monday start (default)

- GIVEN a user with week_start_day = "Monday"
- WHEN they view the weekly planning screen
- THEN the first column shows Monday's date

#### Scenario: Sunday start

- GIVEN a user who set week_start_day to "Sunday"
- WHEN they view the weekly planning screen
- THEN the first column shows Sunday's date

### Requirement: Recipe Assignment

The user MUST be able to select a recipe for each meal slot. The system SHALL enforce exactly one recipe per meal slot per day (UNIQUE constraint).

#### Scenario: Assign recipe to slot

- GIVEN a user on the weekly planning screen
- WHEN they tap an empty slot and select a recipe from the list
- THEN the recipe is assigned and the slot displays the recipe name

#### Scenario: Reassign existing slot

- GIVEN a meal slot already has a recipe assigned
- WHEN the user selects a different recipe for that slot
- THEN the existing entry is replaced with the new recipe

### Requirement: Monthly Calendar

The system SHOULD provide a monthly calendar view where each day cell is tappable to navigate to that day's week in the weekly planning view.

#### Scenario: Navigate via month view

- GIVEN a user on the monthly calendar
- WHEN they tap a day cell in a different week
- THEN the app navigates to the weekly planning screen showing the week containing that day

#### Scenario: Month view shows meal dots

- GIVEN a day has meal entries for all 3 slots
- WHEN viewing the month calendar
- THEN the day cell shows 3 dots indicating all meals are planned

### Requirement: Week Navigation

The system MUST provide previous/next week navigation and a "Today" button to jump to the current week.

#### Scenario: Navigate to next week

- GIVEN a user viewing the week of June 1
- WHEN they tap the "Next" button
- THEN the view shifts to the week of June 8

#### Scenario: Today button

- GIVEN a user viewing a week three months in the past
- WHEN they tap "Today"
- THEN the view jumps to the current week

### Requirement: Servings Multiplier

Each meal entry MUST support a servings multiplier (decimal, 0.01–100) that scales the recipe's per-serving nutrition.

#### Scenario: Half portion

- GIVEN a meal entry with a recipe that serves 4
- WHEN the user sets servings multiplier to 0.5
- THEN the computed nutrition reflects half of one serving

#### Scenario: Maximum servings

- GIVEN a meal entry
- WHEN the user attempts to set servings to 101
- THEN the system rejects with a validation error (max 100)

### Requirement: Meal Entry Notes

Each meal entry MAY include optional notes (e.g., "add extra lemon").

#### Scenario: Add note to meal

- GIVEN an existing meal entry
- WHEN the user adds a note "Use whole wheat tortilla"
- THEN the note is saved and displayed in the meal slot
