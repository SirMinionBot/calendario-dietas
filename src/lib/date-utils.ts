import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday as isTodayFns,
  getISOWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Converts profile week_start_day (1=Monday ... 7=Sunday) to date-fns
 * weekStartsOn (0=Sunday, 1=Monday ... 6=Saturday).
 */
function profileWeekStartToDateFns(profileDay: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  // profile: 1→Mon, 2→Tue, 3→Wed, 4→Thu, 5→Fri, 6→Sat, 7→Sun
  // date-fns: 0→Sun, 1→Mon, 2→Tue, 3→Wed, 4→Thu, 5→Fri, 6→Sat
  return (profileDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * Returns the start (inclusive) and end (inclusive) of the week containing `date`.
 * @param weekStartDay Profile format: 1=Monday, 2=Tuesday, ..., 7=Sunday
 */
export function getWeekRange(
  date: Date,
  weekStartDay: number = 1,
): { start: Date; end: Date } {
  const options = { weekStartsOn: profileWeekStartToDateFns(weekStartDay) }
  return {
    start: startOfWeek(date, options),
    end: endOfWeek(date, options),
  }
}

/**
 * Returns an array of Date objects for every day in the month of `date`.
 */
export function getMonthDays(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  })
}

/**
 * Format a date to ISO string: "2026-06-10"
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Format a date to a human-readable Spanish string: "miércoles 10 de junio"
 */
export function formatDisplayDate(date: Date): string {
  return format(date, "EEEE d 'de' MMMM", { locale: es })
}

/**
 * Format a date to a short weekday + day string: "mié 10"
 */
export function formatShortDay(date: Date): string {
  return format(date, 'EEE d', { locale: es })
}

/**
 * Capitalize the first letter of a Spanish day/month string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Returns true if `date` is today.
 */
export function isToday(date: Date): boolean {
  return isTodayFns(date)
}

/**
 * Returns an array of 7 Date objects for the week containing `date`.
 */
export function getWeekDates(date: Date, weekStartDay: number = 1): Date[] {
  const { start, end } = getWeekRange(date, weekStartDay)
  return eachDayOfInterval({ start, end })
}

/**
 * Returns the ISO week number for `date`.
 */
export function getWeekNumber(date: Date): number {
  return getISOWeek(date)
}

/**
 * Format a day name for column headers (e.g., "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")
 */
export function getDayHeader(date: Date): string {
  return capitalize(format(date, 'EEE', { locale: es }))
}

/**
 * Format a month + year header (e.g., "Junio 2026" or "Enero 2026")
 */
export function formatMonthYear(date: Date): string {
  return capitalize(format(date, "MMMM 'de' yyyy", { locale: es }))
}
