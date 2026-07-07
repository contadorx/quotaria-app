'use client'

import { Trash2 } from 'lucide-react'

export function DeleteButton({
  action,
  id,
  label,
  extra,
}: {
  action: (formData: FormData) => void
  id: string
  label: string
  extra?: Record<string, string>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <button
        type="submit"
        title="Excluir"
        aria-label="Excluir"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>
    </form>
  )
}
