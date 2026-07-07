'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { AbrirFaturaButton } from '@/components/abrir-fatura-button'

export function AcessoBanner({
  titulo,
  mensagem,
  cta,
}: {
  titulo: string
  mensagem: string
  cta?: 'assinar' | 'fatura'
}) {
  const [fechado, setFechado] = useState(false)
  if (fechado) return null

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">{titulo}</p>
        <p className="mt-0.5 text-amber-800">{mensagem}</p>
        <div className="mt-2">
          {cta === 'fatura' ? (
            <AbrirFaturaButton variant="link" />
          ) : (
            <Link href="/app/configuracoes/assinatura" className="font-semibold underline-offset-2 hover:underline">
              escolher plano →
            </Link>
          )}
        </div>
      </div>
      <button type="button" onClick={() => setFechado(true)} aria-label="Fechar" className="shrink-0 text-amber-700 hover:text-amber-900">
        <X size={16} />
      </button>
    </div>
  )
}
