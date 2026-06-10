import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/use-auth'
import type { Profile } from '../types/database'

const profileFormSchema = z.object({
  display_name: z.string().max(100).nullable().optional(),
  daily_calorie_goal: z.coerce
    .number()
    .int()
    .min(1, 'Must be at least 1 calorie'),
  week_start_day: z.coerce.number().int().min(1).max(7),
})

type ProfileForm = z.infer<typeof profileFormSchema>

const WEEK_DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
] as const

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      daily_calorie_goal: 2000,
      week_start_day: 1,
    },
  })

  // Load profile
  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        const p = data as Profile
        reset({
          display_name: p.display_name ?? '',
          daily_calorie_goal: p.daily_calorie_goal,
          week_start_day: p.week_start_day,
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [user, reset])

  const onSubmit = useCallback(
    async (data: ProfileForm) => {
      if (!user) return
      setSaving(true)
      setSaveMessage(null)

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name || null,
          daily_calorie_goal: data.daily_calorie_goal,
          week_start_day: data.week_start_day,
        } satisfies Record<string, unknown>)
        .eq('id', user.id)

      if (error) {
        setSaveMessage(`Error saving: ${error.message}`)
      } else {
        setSaveMessage('Profile saved!')
      }
      setSaving(false)
    },
    [user],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-stone-400">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Profile</h2>
        <p className="text-sm text-stone-500">
          Signed in as {user?.email}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Display Name */}
        <div>
          <label
            htmlFor="display_name"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Display Name
          </label>
          <input
            id="display_name"
            type="text"
            {...register('display_name')}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Your name"
          />
          {errors.display_name && (
            <p className="mt-1 text-xs text-red-600">
              {errors.display_name.message}
            </p>
          )}
        </div>

        {/* Daily Calorie Goal */}
        <div>
          <label
            htmlFor="daily_calorie_goal"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Daily Calorie Goal
          </label>
          <input
            id="daily_calorie_goal"
            type="number"
            min={1}
            {...register('daily_calorie_goal')}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          {errors.daily_calorie_goal && (
            <p className="mt-1 text-xs text-red-600">
              {errors.daily_calorie_goal.message}
            </p>
          )}
        </div>

        {/* Week Start Day */}
        <div>
          <label
            htmlFor="week_start_day"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Week Starts On
          </label>
          <select
            id="week_start_day"
            {...register('week_start_day')}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {WEEK_DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.week_start_day && (
            <p className="mt-1 text-xs text-red-600">
              {errors.week_start_day.message}
            </p>
          )}
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              saveMessage.startsWith('Error')
                ? 'bg-red-50 text-red-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {saveMessage}
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Sign Out */}
      <div className="border-t border-stone-200 pt-4">
        <button
          onClick={() => signOut()}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
