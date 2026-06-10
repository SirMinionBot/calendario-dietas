import { isToday } from '../../lib/date-utils'

const MEAL_DOT_COLORS: Record<string, string> = {
  desayuno: 'bg-amber-400',
  comida: 'bg-emerald-500',
  cena: 'bg-indigo-400',
}

interface DayCellProps {
  date: Date
  isCurrentMonth: boolean
  mealSlotsPresent: string[] // e.g. ['desayuno', 'comida']
  onClick: (date: Date) => void
}

export default function DayCell({
  date,
  isCurrentMonth,
  mealSlotsPresent,
  onClick,
}: DayCellProps) {
  const today = isToday(date)
  const dayNum = date.getDate()

  return (
    <button
      onClick={() => onClick(date)}
      className={`flex flex-col items-center justify-start rounded-lg px-1 py-1.5 transition-colors min-h-[52px] ${
        !isCurrentMonth
          ? 'text-stone-300'
          : today
            ? 'text-emerald-700'
            : 'text-stone-700 hover:bg-stone-50'
      } ${today ? 'bg-emerald-50 ring-1 ring-emerald-400' : ''}`}
    >
      <span
        className={`text-sm font-medium leading-none ${today ? 'font-bold' : ''}`}
      >
        {dayNum}
      </span>

      {/* Meal dots: 3 dots, one per meal slot */}
      <div className="mt-1.5 flex gap-0.5">
        {(['desayuno', 'comida', 'cena'] as const).map((slot) => {
          const isPresent = mealSlotsPresent.includes(slot)
          return (
            <span
              key={slot}
              className={`block h-1.5 w-1.5 rounded-full ${
                isPresent ? MEAL_DOT_COLORS[slot] : 'bg-stone-200'
              }`}
            />
          )
        })}
      </div>
    </button>
  )
}
