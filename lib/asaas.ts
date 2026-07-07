// Helper de acesso à API do Asaas (servidor apenas).
// Ambiente:
//   ASAAS_API_KEY -> chave da API (produção ou sandbox)
//   ASAAS_API_URL -> base. Produção: https://api.asaas.com/v3
//                          Sandbox:  https://api-sandbox.asaas.com/v3

const BASE = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3'

export type Ciclo = 'mensal' | 'semestral' | 'anual'

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function cicloAsaas(ciclo: Ciclo): 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' {
  if (ciclo === 'anual') return 'YEARLY'
  if (ciclo === 'semestral') return 'SEMIANNUALLY'
  return 'MONTHLY'
}

export function proximoVencimento(base: string, ciclo: Ciclo): string {
  const d = new Date(base + 'T12:00:00Z')
  if (ciclo === 'anual') d.setUTCFullYear(d.getUTCFullYear() + 1)
  else if (ciclo === 'semestral') d.setUTCMonth(d.getUTCMonth() + 6)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export async function asaasFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.ASAAS_API_KEY
  if (!key) throw new Error('ASAAS_API_KEY não configurada no ambiente.')
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: key,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const text = await res.text()
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    const d = data as { errors?: { description?: string }[]; message?: string }
    const msg = d?.errors?.[0]?.description || d?.message || `Asaas retornou ${res.status}`
    throw new Error(msg)
  }
  return data as T
}
