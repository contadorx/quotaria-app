'use client'

import { useState } from 'react'
import { fieldClass } from '@/components/ui'
import { mascaraDocumento, docValido, apenasDigitos } from '@/lib/documento'

// Campo mascarado de CPF (ou CPF/CNPJ). Mostra aviso brando se inválido,
// mas não bloqueia o envio (o campo é opcional no cadastro).
export function CampoDocumento({
  name = 'cpf',
  id,
  defaultValue = '',
  placeholder = '000.000.000-00',
  label,
}: {
  name?: string
  id?: string
  defaultValue?: string
  placeholder?: string
  label?: string
}) {
  const [valor, setValor] = useState(defaultValue ? mascaraDocumento(defaultValue) : '')
  const digitos = apenasDigitos(valor)
  const invalido = digitos.length > 0 && (digitos.length === 11 || digitos.length === 14) && !docValido(digitos)

  return (
    <div>
      {label && <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>}
      <input
        id={id}
        name={name}
        value={valor}
        onChange={(e) => setValor(mascaraDocumento(e.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        className={fieldClass}
      />
      {invalido && <p className="mt-1 text-xs text-amber-700">Dígitos verificadores não conferem — confira o número.</p>}
    </div>
  )
}
