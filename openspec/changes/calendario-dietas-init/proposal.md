# Proposal: Calendario de Dietas — Initial Build

## Intent

Build a mobile-first SPA for planning daily meals (desayuno, comida, cena) with shared recipes, hierarchical ingredient categories, special-day tracking, and weekly macro scoring against goals.

## Scope

### In Scope
1. Supabase Auth (email/password) + profile auto-creation
2. Ingredient CRUD with hierarchical categories (`parent_id`)
3. Shared recipe CRUD (SELECT for all auth users, creator owns)
4. Calendar: monthly view with day-cell navigation
5. **Weekly Planning Screen**: dedicated full-week layout showing 7 days × 3 meal slots. Week starts on user-configurable day (Monday by default). Select recipes (or create on the fly) for each slot. Quick-add ingredients and recipes without leaving the planning view.
6. Meal entry CRUD (recipe × date × meal_slot)
7. Special-day marking via `meal_entry_type` (normal, fuera, cheat, evento)
7. Frontend macro computation (calories, protein, carbs, fat, fiber)
8. Weekly scoring: 7-day macro actuals vs goals
9. GitHub Pages deploy with `404.html` SPA workaround
10. Seed data: ~50 ingredients in hierarchical categories

### Out of Scope
- Barcode scanning / Open Food Facts
- PWA / offline support
- Real-time multi-device sync
- PDF export, meal plan suggestions
- Private recipes (all shared in v1)
- Micros (vitamins, minerals)

## Capabilities

### New Capabilities
- `user-auth`: Registration, login, session, profile management
- `ingredient-management`: CRUD ingredients with hierarchical categories
- `recipe-management`: CRUD shared recipes with ingredient associations
- `meal-calendar`: Monthly calendar + dedicated weekly planning screen with 7×3 grid, configurable week start day, inline recipe creation
- `nutrition-tracking`: Macro computation per serving/meal/day/week
- `weekly-scoring`: 7-day evaluation of macro goals vs actuals
- `special-days`: Mark days as outside-diet (comidas fuera, cheat, events)

### Modified Capabilities
None — initial project build, no existing specs.

## Approach

Single SPA repo (React + Vite). Direct Supabase JS client with RLS. TanStack Query for server state. Custom calendar with date-fns. Nutrition computed on frontend (pure fn, memoized). React Hook Form + Zod for forms. Bottom tab navigation (5 tabs), mobile-first responsive.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/` | New | Full app scaffold (components, hooks, pages) |
| `supabase/migrations/` | New | Schema + RLS + seed data |
| `public/404.html` | New | SPA routing workaround |
| `vite.config.ts` | New | Build + base path config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| GH Pages SPA routing | Low | `404.html` workaround, set `base` |
| Nutritional data accuracy | Med | Seed data, allow edits, future API lookup |
| Recipe sharing: all public | Low | Simple model; private recipes deferrable |

## Rollback Plan

Revert to empty repo state. No production data exists. Destroy Supabase project and re-init if schema migration fails. GitHub Pages deploy reverts by reverting the deploy commit.

## Dependencies

- Supabase project (free tier)
- GitHub Pages enabled on repo

## Success Criteria

- [ ] User can register, login, and see empty calendar
- [ ] User can create ingredients with hierarchical categories
- [ ] User can create recipes with ingredients and see computed macros
- [ ] User can plan a full week on the planning screen, configuring start day
- [ ] User can create recipes inline during weekly planning
- [ ] User can assign recipes to date × meal slot
- [ ] User can mark a meal as "fuera" / cheat / evento
- [ ] Weekly score shows macro totals vs goals
- [ ] App renders on mobile (375px+) and desktop
- [ ] All routes work on GH Pages (no 404 on navigation)
