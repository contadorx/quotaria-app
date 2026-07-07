'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type State = 'idle' | 'loading' | 'ok' | 'error'

export function ConnectionTest({ configured }: { configured: boolean }) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function runTest() {
    setState('loading')
    setMessage('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.getSession()
      if (error) throw error
      setState('ok')
      setMessage('Conexão com o Supabase respondeu sem erros.')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Falha ao conectar.')
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={runTest}
        disabled={!configured || state === 'loading'}
        className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === 'loading' ? 'Testando…' : 'Testar conexão'}
      </button>

      {!configured && (
        <p className="text-sm text-ink-muted">
          Preencha o <code className="rounded bg-surface px-1 py-0.5 text-xs">.env.local</code> para habilitar o teste.
        </p>
      )}
      {state === 'ok' && <p className="text-sm font-medium text-emerald-600">✓ {message}</p>}
      {state === 'error' && <p className="text-sm font-medium text-red-600">✕ {message}</p>}
    </div>
  )
}
