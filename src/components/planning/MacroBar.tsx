interface MacroBarProps {
  label: string
  current: number
  goal: number
  color: string
  /** Optional unit suffix. Defaults to "g". Set to "" for calories. */
  unit?: string
  /** If true, show compact layout (smaller text and bar). */
  compact?: boolean
}

/**
 * Reusable horizontal progress bar for macronutrient display.
 *
 * Shows label, colored fill bar, and current/goal values.
 * Used in both NutritionPanel and WeeklyScorePanel.
 */
export default function MacroBar({
  label,
  current,
  goal,
  color,
  unit = 'g',
  compact = false,
}: MacroBarProps) {
  const percentage = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0

  const formatValue = (v: number): string => {
    const rounded = Math.round(v * 10) / 10
    if (unit === '') return `${rounded}`
    return `${rounded}${unit}`
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-16 text-[10px] font-medium text-stone-500">
          {label}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-14 text-right text-[10px] text-stone-400">
          {formatValue(current)}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-600">{label}</span>
        <span className="text-xs text-stone-400">
          {formatValue(current)}
          <span className="text-stone-300"> / {formatValue(goal)}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
