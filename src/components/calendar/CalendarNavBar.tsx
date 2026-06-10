import { formatMonthYear } from '../../lib/date-utils'

interface CalendarNavBarProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

export default function CalendarNavBar({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarNavBarProps) {
  return (
    <div className="flex items-center justify-between pb-4">
      <button
        onClick={onPrevMonth}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
        aria-label="Mes anterior"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <h2 className="text-base font-semibold text-stone-900">
        {formatMonthYear(currentDate)}
      </h2>

      <button
        onClick={onNextMonth}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
        aria-label="Mes siguiente"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <button
        onClick={onToday}
        className="ml-2 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
      >
        Hoy
      </button>
    </div>
  )
}
