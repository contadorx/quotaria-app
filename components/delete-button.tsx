'use client'

import { useFormStatus } from 'react-dom'
import { Trash2, Loader2 } from 'lucide-react'

function BotaoExcluir() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      title="Excluir"
      aria-label="Excluir"
      aria-busy={pending}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  )
}

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
      <BotaoExcluir />
    </form>
  )
}
