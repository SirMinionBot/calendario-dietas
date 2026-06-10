import { useMemo } from 'react'
import type { MacroValues } from '../../lib/nutrition'
import { DEFAULT_GOALS } from '../../lib/nutrition'
import MacroBar from '../planning/MacroBar'

interface NutritionPanelProps {
  macros: MacroValues
  goals?: MacroValues
  /** Compact variant for meal slots and dashboard widgets. */
  compact?: boolean
  /** Show goal values alongside current. True by default when not compact. */
  showGoals?: boolean
}

// ── Color constants ───────────────────────────────────

const BAR_COLORS: Record<string, string> = {
  protein: 'bg-blue-500',
  carbs: 'bg-amber-500',
  fat: 'bg-red-400',
  fiber: 'bg-emerald-500',
}

const RING_COLORS = {
  safe: 'stroke-emerald-500',
  warning: 'stroke-amber-500',
  danger: 'stroke-red-500',
}

// ── SVG Ring Component ────────────────────────────────

interface CalorieRingProps {
  current: number
  goal: number
  size?: number
  strokeWidth?: number
}

function CalorieRing({
  current,
  goal,
  size = 80,
  strokeWidth = 6,
}: CalorieRingProps) {
    const { percentage, ringColor } = useMemo(() => {
      const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
      const color =
        pct >= 100 ? RING_COLORS.danger : pct >= 80 ? RING_COLORS.warning : RING_COLORS.safe
      return { percentage: pct, ringColor: color }
    }, [current, goal])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-stone-900">
          {Math.round(current)}
        </span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────

export default function NutritionPanel({
  macros,
  goals,
  compact = false,
  showGoals = true,
}: NutritionPanelProps) {
  const effectiveGoals: MacroValues = goals ?? DEFAULT_GOALS

  // ── Compact variant: single-line horizontal ──
  if (compact) {
    // Show a mini calorie pill and condensed macro bars
    const calPct =
      effectiveGoals.calories > 0
        ? Math.round((macros.calories / effectiveGoals.calories) * 100)
        : 0
    const calColor =
      calPct >= 100
        ? 'bg-red-100 text-red-700'
        : calPct >= 80
          ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-700'

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${calColor}`}
        >
          {Math.round(macros.calories)} kcal
        </span>
        {showGoals && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
            P:{Math.round(macros.protein)}g C:{Math.round(macros.carbs)}g
          </span>
        )}
      </div>
    )
  }

  // ── Full variant: ring + bars ──
  const macroItems = [
    { key: 'protein', label: 'Proteína', current: macros.protein, goal: effectiveGoals.protein, color: BAR_COLORS.protein },
    { key: 'carbs', label: 'Carbohidratos', current: macros.carbs, goal: effectiveGoals.carbs, color: BAR_COLORS.carbs },
    { key: 'fat', label: 'Grasas', current: macros.fat, goal: effectiveGoals.fat, color: BAR_COLORS.fat },
    { key: 'fiber', label: 'Fibra', current: macros.fiber, goal: effectiveGoals.fiber, color: BAR_COLORS.fiber },
  ] as const

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-stone-700">
        Nutrición por ración
      </h3>

      <div className="flex items-start gap-6">
        {/* Calorie ring */}
        <div className="flex flex-col items-center gap-1">
          <CalorieRing
            current={macros.calories}
            goal={effectiveGoals.calories}
          />
          <span className="text-[10px] text-stone-400">
            de {Math.round(effectiveGoals.calories)} kcal
          </span>
        </div>

        {/* Macro bars */}
        <div className="flex-1 space-y-3">
          {macroItems.map((item) => (
            <MacroBar
              key={item.key}
              label={item.label}
              current={item.current}
              goal={item.goal}
              color={item.color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
