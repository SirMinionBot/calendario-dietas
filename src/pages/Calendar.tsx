import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { formatDate } from '../lib/date-utils'
import { useProfile } from '../hooks/use-profile'
import { useMealEntriesByDateRange } from '../hooks/use-meal-entries'
import CalendarNavBar from '../components/calendar/CalendarNavBar'
import MonthView from '../components/calendar/MonthView'

export default function CalendarPage() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const weekStartDay = profile?.week_start_day ?? 1

  const [currentDate, setCurrentDate] = useState(new Date())

  const goToPrevMonth = () => setCurrentDate((d) => subMonths(d, 1))
  const goToNextMonth = () => setCurrentDate((d) => addMonths(d, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Fetch all entries for the current month
  const monthRange = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return {
      start: formatDate(start),
      end: formatDate(end),
    }
  }, [currentDate])

  const { data: monthEntries, isLoading } = useMealEntriesByDateRange(
    monthRange.start,
    monthRange.end,
  )

  // Group entries by date, collect which meal slots are present
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, string[]> = {}
    if (monthEntries) {
      for (const entry of monthEntries) {
        if (!grouped[entry.date]) grouped[entry.date] = []
        grouped[entry.date].push(entry.meal_slot)
      }
    }
    return grouped
  }, [monthEntries])

  const handleDayClick = useCallback(
    (date: Date) => {
      const dateStr = formatDate(date)
      navigate(`/plan?date=${dateStr}`)
    },
    [navigate],
  )

  return (
    <div className="flex flex-col gap-4">
      <CalendarNavBar
        currentDate={currentDate}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <MonthView
          currentDate={currentDate}
          weekStartDay={weekStartDay}
          entriesByDate={entriesByDate}
          onDayClick={handleDayClick}
        />
      )}

      <p className="text-center text-xs text-stone-400">
        Toca un día para ir a la vista de planificación semanal
      </p>
    </div>
  )
}
