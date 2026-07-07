'use client'

import { useRef } from 'react'
import { Pencil, X } from 'lucide-react'

export function EditDialog({
  title,
  label = 'Editar',
  children,
}: {
  title: string
  label?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        title={title}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface"
      >
        <Pencil size={14} />
        {label}
      </button>

      <dialog
        ref={ref}
        className="w-full max-w-lg rounded-xl2 border border-line bg-white p-0 shadow-card backdrop:bg-navy/30 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="text-ink-soft transition hover:text-ink"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto p-5">{children}</div>
      </dialog>
    </>
  )
}
