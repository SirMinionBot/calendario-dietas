# Special Days Specification

## Purpose

Allow users to mark meal entries or entire days as outside their regular diet — such as eating out (comida fuera), cheat meals, or special events — with visual indicators and scoring treatment.

## Requirements

### Requirement: Meal Entry Type Enum

The system MUST support a `meal_entry_type` field on meal entries with values: `normal`, `fuera`, `cheat`, `evento`. The default SHALL be `normal`.

#### Scenario: Mark meal as cheat

- GIVEN an existing meal entry for Wednesday comida
- WHEN the user sets meal_entry_type to "cheat"
- THEN the entry type is updated and persisted

#### Scenario: Default is normal

- GIVEN a user creates a new meal entry
- WHEN the entry is saved
- THEN meal_entry_type defaults to "normal"

### Requirement: Visual Indicator

The system SHOULD display a visual indicator on meal slots and calendar cells to distinguish special day entries from normal ones.

#### Scenario: Special meal badge on slot

- GIVEN a meal entry with type "fuera"
- WHEN viewing the weekly planning screen
- THEN the meal slot shows a "Fuera de dieta" badge with distinctive styling

#### Scenario: Calendar dot differentiation

- GIVEN a day with one "cheat" meal and two "normal" meals
- WHEN viewing the month calendar
- THEN the special meal dot appears in a different color

### Requirement: Macro Exclusion from Scoring

The system MAY allow users to exclude special day entries from weekly scoring. The behavior SHALL be configurable per meal entry.

#### Scenario: Exclude cheat from scoring

- GIVEN a meal entry with type "cheat" and exclude_from_scoring=true
- WHEN computing the weekly score
- THEN this meal's macros are omitted from the totals

#### Scenario: Include by default

- GIVEN a meal entry with type "fuera" and exclude_from_scoring=false (default)
- WHEN computing the weekly score
- THEN the meal's macros ARE included in the totals (but flagged as context)

### Requirement: Notes for Special Days

The system SHOULD allow users to add a reason or note for special day entries (e.g., "Birthday dinner at restaurant").

#### Scenario: Add reason note

- GIVEN a meal entry with type "evento"
- WHEN the user adds notes "Birthday party — no dietary restrictions observed"
- THEN the note is saved and displayed when viewing the meal entry detail

#### Scenario: Notes shown in score context

- GIVEN a "fuera" meal entry with notes "Restaurant lunch with client"
- WHEN viewing the weekly scoring breakdown
- THEN the note is displayed alongside the flagged entry for context

### Requirement: Scoring Filter

The system MUST support filtering special day entries in the weekly scoring view. Users MAY choose to exclude all special entries or view them flagged with context.

#### Scenario: Filter out all special

- GIVEN a week with 2 "fuera" meals and 19 "normal" meals
- WHEN the user selects "Exclude special days from scoring"
- THEN the weekly score is computed from only the 19 normal meals

#### Scenario: Flagged with context

- GIVEN the same week with 2 "fuera" meals
- WHEN the user selects "Show special days with context"
- THEN the weekly score includes all 21 meals but special entries are visually flagged in the breakdown
