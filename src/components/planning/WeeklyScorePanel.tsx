import type { WeeklyScore, MacroValues } from '../../lib/nutrition'

interface WeeklyScorePanelProps {
  score: WeeklyScore
  goals?: MacroValues
  specialDaysCount?: number
  loading?: boolean
  empty?: boolean
}

// ── Color & Label Constants ───────────────────────────

const SCORE_GRADE = [
  { min: 80, label: '¡Buena semana!', ringColor: 'stroke-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', barColor: 'bg-emerald-500' },
  { min: 50, label: 'Puedes mejorar', ringColor: 'stroke-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50', barColor: 'bg-amber-500' },
  { min: 0, label: 'Necesitas atención', ringColor: 'stroke-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50', barColor: 'bg-red-500' },
] as const

const CATEGORY_LABELS: Record<string, string> = {
  calories: 'Calorías',
  protein: 'Proteína',
  carbs: 'Carbohidratos',
  fat: 'Grasas',
  fiber: 'Fibra',
}

// ── SVG Ring ──────────────────────────────────────────

function ScoreRing({ score, size = 72, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
  const grade = SCORE_GRADE.find((g) => score >= g.min) ?? SCORE_GRADE[2]
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={grade.ringColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

// ── Single Category Row ──────────────────────────────

function CategoryRow({ label, score }: { label: string; score: number }) {
  const grade = SCORE_GRADE.find((g) => score >= g.min) ?? SCORE_GRADE[2]

  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-xs font-medium text-stone-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${grade.barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`w-8 text-right text-xs font-medium ${grade.textColor}`}>
        {score}
      </span>
    </div>
  )
}

// ── Loading State ─────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
      <div className="flex items-center gap-4">
        <div className="h-[72px] w-[72px] animate-pulse rounded-full bg-stone-200" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-stone-200" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────

function EmptyScoreState() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
      <p className="text-sm font-medium text-stone-500">
        Sin datos esta semana
      </p>
      <p className="mt-1 text-xs text-stone-400">
        Agrega comidas a tu plan semanal para ver tu puntuación
      </p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────

export default function WeeklyScorePanel({
  score,
  specialDaysCount = 0,
  loading = false,
  empty = false,
}: WeeklyScorePanelProps) {
  if (loading) return <SkeletonLoader />
  if (empty) return <EmptyScoreState />

  const grade = SCORE_GRADE.find((g) => score.overall >= g.min) ?? SCORE_GRADE[2]
  const categoryKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-stone-700">
        Puntaje semanal
      </h3>

      {/* Overall score row */}
      <div className="flex items-center gap-4">
        <div className="relative inline-flex items-center justify-center">
          <ScoreRing score={score.overall} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${grade.textColor}`}>
              {score.overall}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <p className={`text-sm font-semibold ${grade.textColor}`}>
            {grade.label}
          </p>
          <p className="text-xs text-stone-400">
            {score.daysTracked} de {score.daysInRange} días registrados
            {specialDaysCount > 0 &&
              ` · ${specialDaysCount} día${specialDaysCount !== 1 ? 's' : ''} fuera de dieta`}
          </p>
        </div>
      </div>

      {/* Per-category breakdown */}
      <div className="mt-4 space-y-2">
        {categoryKeys.map((key) => (
          <CategoryRow
            key={key}
            label={CATEGORY_LABELS[key]}
            score={score.categories[key]}
          />
        ))}
      </div>
    </div>
  )
}
