import { useState, useEffect } from 'react'
import { useUpdateMealEntry, useDeleteMealEntry } from '../../hooks/use-meal-entries'
import type { MealEntryWithRecipe } from '../../hooks/use-meal-entries'
import type { MealEntryType } from '../../types/database'
import ConfirmDialog from '../shared/ConfirmDialog'

const TYPE_OPTIONS: { value: MealEntryType; label: string; color: string }[] = [
  { value: 'normal', label: 'Normal', color: 'text-stone-700' },
  { value: 'fuera', label: 'Fuera de dieta', color: 'text-orange-600' },
  { value: 'cheat', label: 'Cheat meal', color: 'text-red-600' },
  { value: 'evento', label: 'Evento especial', color: 'text-purple-600' },
]

interface MealDetailDrawerProps {
  entry: MealEntryWithRecipe | null
  open: boolean
  onClose: () => void
  onChangeRecipe: (entry: MealEntryWithRecipe) => void
}

export default function MealDetailDrawer({
  entry,
  open,
  onClose,
  onChangeRecipe,
}: MealDetailDrawerProps) {
  const updateMealEntry = useUpdateMealEntry()
  const deleteMealEntry = useDeleteMealEntry()

  const [servings, setServings] = useState(entry?.servings ?? 1)
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [mealEntryType, setMealEntryType] = useState<MealEntryType>(
    entry?.meal_entry_type ?? 'normal',
  )
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync local state when entry changes (new entry selected)
  useEffect(() => {
    if (entry) {
      setServings(entry.servings)
      setNotes(entry.notes ?? '')
      setMealEntryType(entry.meal_entry_type)
    }
  }, [entry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!entry) return
    setIsSaving(true)

    try {
      await updateMealEntry.mutateAsync({
        id: entry.id,
        servings,
        notes: notes || null,
        meal_entry_type: mealEntryType,
      })
      onClose()
    } catch (err) {
      console.error('Failed to update meal entry:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!entry) return
    try {
      await deleteMealEntry.mutateAsync(entry.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (err) {
      console.error('Failed to delete meal entry:', err)
    }
  }

  if (!open || !entry) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-4 pb-8 pt-4 shadow-xl">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-300" />

        <div className="max-h-[70dvh] overflow-y-auto">
          {/* Recipe name + change button */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                {entry.recipe.name}
              </h3>
              <p className="mt-0.5 text-sm text-stone-500">
                {entry.meal_slot === 'desayuno'
                  ? 'Desayuno'
                  : entry.meal_slot === 'comida'
                    ? 'Comida'
                    : 'Cena'}
                {' — '}
                {entry.date}
              </p>
            </div>
            <button
              onClick={() => onChangeRecipe(entry)}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
            >
              Cambiar receta
            </button>
          </div>

          {/* Servings */}
          <div className="mt-4">
            <label className="text-sm font-medium text-stone-700">
              Porciones
            </label>
            <div className="mt-1 flex items-center gap-3">
              <button
                onClick={() => setServings((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                −
              </button>
              <input
                type="number"
                value={servings}
                min={0.01}
                max={100}
                step={0.25}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val >= 0.01 && val <= 100) {
                    setServings(val)
                  }
                }}
                className="w-16 rounded-lg border border-stone-200 px-2 py-1.5 text-center text-sm"
              />
              <button
                onClick={() => setServings((s) => Math.min(100, +(s + 0.25).toFixed(2)))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Meal entry type */}
          <div className="mt-4">
            <label className="text-sm font-medium text-stone-700">
              Tipo de comida
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMealEntryType(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    mealEntryType === opt.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="text-sm font-medium text-stone-700">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: agregar limón extra"
              rows={2}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar comida"
        message={`¿Eliminar "${entry.recipe.name}" de ${entry.date}?`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
