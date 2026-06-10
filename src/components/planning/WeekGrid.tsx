import type { MealEntryWithRecipe } from '../../hooks/use-meal-entries'
import MealSlotCell from './MealSlotCell'
import { formatDate, getDayHeader, isToday } from '../../lib/date-utils'

type MealSlot = 'desayuno' | 'comida' | 'cena'

const MEAL_SLOTS: MealSlot[] = ['desayuno', 'comida', 'cena']

interface WeekGridProps {
  weekDates: Date[]
  entriesByDate: Record<string, MealEntryWithRecipe[]>
  onAdd: (date: string, mealSlot: MealSlot) => void
  onClickEntry: (entry: MealEntryWithRecipe) => void
  onDeleteEntry: (entryId: string) => void
}

function getEntryForSlot(
  entries: MealEntryWithRecipe[] | undefined,
  slot: MealSlot,
): MealEntryWithRecipe | null | undefined {
  if (!entries) return undefined
  return entries.find((e) => e.meal_slot === slot) ?? null
}

export default function WeekGrid({
  weekDates,
  entriesByDate,
  onAdd,
  onClickEntry,
  onDeleteEntry,
}: WeekGridProps) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7 gap-1.5">
        {/* Day headers */}
        {weekDates.map((day, i) => (
          <div
            key={i}
            className={`text-center text-xs font-medium py-1 ${
              isToday(day)
                ? 'text-emerald-600'
                : 'text-stone-500'
            }`}
          >
            <div>{getDayHeader(day)}</div>
            <div className={`text-base font-bold ${
              isToday(day) ? 'text-emerald-600' : 'text-stone-800'
            }`}>
              {day.getDate()}
            </div>
            {/* Day of month on mobile as well */}
          </div>
        ))}

        {/* Meal slot rows */}
        {MEAL_SLOTS.map((slot) => (
          <div key={slot} className="contents">
            {weekDates.map((day) => {
              const dateStr = formatDate(day)
              const dayEntries = entriesByDate[dateStr]
              const entry = getEntryForSlot(dayEntries, slot)

              return (
                <div key={`${dateStr}-${slot}`} className="min-h-0">
                  <MealSlotCell
                    date={dateStr}
                    mealSlot={slot}
                    entry={entry}
                    onAdd={onAdd}
                    onClick={onClickEntry}
                    onDelete={onDeleteEntry}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
