'use client'

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

/** Fecha o <dialog> ancestral quando a submissão termina (útil nos modais de edição). */
function useFecharDialogAoConcluir(
  ref: React.RefObject<HTMLButtonElement>,
  pending: boolean,
) {
  const estavaPendente = useRef(false)
  useEffect(() => {
    if (estavaPendente.current && !pending) {
      ref.current?.closest('dialog')?.close()
    }
    estavaPendente.current = pending
  }, [pending, ref])
}

export function SubmitButton({
  action,
  children,
  variant = 'primary',
}: {
  action: (formData: FormData) => void
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
}) {
  const { pending } = useFormStatus()
  const ref = useRef<HTMLButtonElement>(null)
  useFecharDialogAoConcluir(ref, pending)

  const cls =
    variant === 'primary'
      ? 'bg-navy text-white hover:bg-navy-soft'
      : 'border border-line text-ink hover:bg-surface'
  return (
    <button
      ref={ref}
      formAction={action}
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
    >
      {pending && <Loader2 size={14} className="animate-spin" />}
      {pending ? 'Salvando…' : children}
    </button>
  )
}

/**
 * Botão genérico para formulários de ação (concluir, mudar status, entrar…).
 * Usa o estilo passado em className; quando enviando, desabilita e mostra o spinner.
 * `action` (opcional) vira o formAction do botão.
 */
export function PendingButton({
  action,
  className = '',
  children,
}: {
  action?: (formData: FormData) => void
  className?: string
  children: React.ReactNode
}) {
  const { pending } = useFormStatus()
  const ref = useRef<HTMLButtonElement>(null)
  useFecharDialogAoConcluir(ref, pending)

  return (
    <button
      ref={ref}
      formAction={action}
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  )
}
