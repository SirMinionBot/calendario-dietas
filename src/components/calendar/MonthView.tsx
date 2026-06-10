import { startOfMonth, endOfMonth } from 'date-fns'
import { getMonthDays, formatDate } from '../../lib/date-utils'
import DayCell from './DayCell'

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface MonthViewProps {
  currentDate: Date
  weekStartDay: number
  entriesByDate: Record<string, string[]> // date -> ['desayuno', 'comida', ...]
  onDayClick: (date: Date) => void
}

export default function MonthView({
  currentDate,
  weekStartDay,
  entriesByDate,
  onDayClick,
}: MonthViewProps) {
  const days = getMonthDays(currentDate)
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDayOfWeek = monthStart.getDay() // 0=Sun, 1=Mon, ...

  // Calculate leading empty cells based on weekStartDay
  const adjustedStartIndex = ((startDayOfWeek - weekStartDay + 7) % 7)

  // Calculate trailing empty cells to fill the grid
  const endDayOfWeek = monthEnd.getDay()
  const adjustedEndIndex = ((endDayOfWeek - weekStartDay + 7) % 7)
  const trailingCells = 6 - adjustedEndIndex

  // Reorder weekday headers based on weekStartDay
  const headers = [
    ...WEEKDAY_HEADERS.slice(weekStartDay),
    ...WEEKDAY_HEADERS.slice(0, weekStartDay),
  ]

  return (
    <div>
      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-0">
        {headers.map((header, i) => (
          <div
            key={i}
            className="py-1.5 text-center text-xs font-medium text-stone-400"
          >
            {header}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Leading empty cells */}
        {Array.from({ length: adjustedStartIndex }).map((_, i) => (
          <div key={`leading-${i}`} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = formatDate(day)
          const slots = entriesByDate[dateStr] ?? []

          return (
            <DayCell
              key={dateStr}
              date={day}
              isCurrentMonth={true}
              mealSlotsPresent={slots}
              onClick={onDayClick}
            />
          )
        })}

        {/* Trailing empty cells */}
        {Array.from({ length: trailingCells }).map((_, i) => (
          <div key={`trailing-${i}`} />
        ))}
      </div>
    </div>
  )
}
