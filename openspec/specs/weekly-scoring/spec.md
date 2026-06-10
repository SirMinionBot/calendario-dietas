# Weekly Scoring Specification

## Purpose

Evaluate actual weekly macro intake against user-defined daily goals × 7, producing per-category and overall scores with visual feedback.

## Requirements

### Requirement: Weekly Goal Comparison

The system MUST compare actual weekly intake (sum of daily totals for 7 days) against the user's daily goals multiplied by 7. Each macro category (calories, protein, carbs, fat, fiber) SHALL be scored independently.

#### Scenario: Perfect adherence

- GIVEN daily goals of 2000 cal, 60g protein, 250g carbs, 65g fat, 25g fiber
- WHEN a user's actual weekly totals are exactly 14000 cal, 420g protein, 1750g carbs, 455g fat, 175g fiber
- THEN each macro category scores 100%

#### Scenario: Over-consumption

- GIVEN a weekly calorie goal of 14000 (2000 × 7)
- WHEN actual calories are 16000
- THEN the calorie score is less than 100% (over-goal penalized)

### Requirement: Per-Macro Scoring

The system SHALL compute a score for each macro category based on how close actual intake is to the goal. The score SHALL range 0–100%.

#### Scenario: Protein on target

- GIVEN weekly protein goal = 420g and actual = 410g
- WHEN computing the protein score
- THEN the score is near 100% (within 5% tolerance)

#### Scenario: Fiber significantly under

- GIVEN weekly fiber goal = 175g and actual = 70g (60% deficit)
- WHEN computing the fiber score
- THEN the score reflects a significant deficit (marked as "needs attention")

### Requirement: Overall Weekly Score

The system MUST compute an aggregate overall weekly score from the individual macro scores, giving equal weight to each category.

#### Scenario: All categories good

- GIVEN all 5 macro scores are above 80%
- WHEN computing the overall score
- THEN the overall score is the average and shows "Good week" visual

#### Scenario: Mixed scores

- GIVEN calories=90%, protein=85%, carbs=95%, fat=50%, fiber=30%
- WHEN computing the overall score
- THEN the overall = (90+85+95+50+30)/5 = 70% and shows "Average" visual

### Requirement: Visual Feedback

The system SHOULD display each macro score with visual feedback: green (good: ≥80%), yellow (average: 50–79%), or red (needs attention: <50%).

#### Scenario: Good score renders green

- GIVEN a calorie score of 85%
- WHEN viewing the weekly score
- THEN the calorie row shows a green indicator

#### Scenario: Needs attention renders red

- GIVEN a fiber score of 40%
- WHEN viewing the weekly score
- THEN the fiber row shows a red indicator

### Requirement: Partial Week Scoring

The system MUST score partial weeks proportionally. If fewer than 7 days have data, the goal SHALL be scaled down proportionally (goal × completed_days / 7).

#### Scenario: Three-day week

- GIVEN a user starting on Wednesday with 3 completed days
- WHEN viewing the weekly score
- THEN the system compares actuals against goal × 3/7

#### Scenario: Single day

- GIVEN a user with only today's data
- WHEN viewing the weekly score
- THEN the system scores against goal × 1/7
