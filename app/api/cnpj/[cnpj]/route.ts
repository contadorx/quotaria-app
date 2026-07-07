import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Consulta dados públicos do CNPJ com cadeia de fontes (resiliência).
// A base pública da Receita é instável; tentamos em ordem e usamos a primeira
// que responder com dados. Portado do Financeiro Simples.

type Saida = {
  razaoSocial: string
  nomeFantasia: string
  uf: string
  municipio: string
  situacao: string
}

async function buscar(url: string, ms = 7000): Promise<{ status: number; data: Record<string, unknown> | null } | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal, headers: { Accept: 'application/json' } })
    let data: Record<string, unknown> | null = null
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      data = null
    }
    return { status: res.status, data }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// BrasilAPI e minhareceita.org compartilham os nomes de campo.
function normMinhaReceita(d: Record<string, unknown>): Saida | null {
  const razao = (d.razao_social as string) ?? ''
  const fantasia = (d.nome_fantasia as string) ?? ''
  if (!razao && !fantasia) return null
  return {
    razaoSocial: razao,
    nomeFantasia: fantasia,
    uf: (d.uf as string) ?? '',
    municipio: (d.municipio as string) ?? '',
    situacao: (d.descricao_situacao_cadastral as string) ?? (d.situacao_cadastral as string) ?? '',
  }
}

function normReceitaWS(d: Record<string, unknown>): Saida | null {
  if (d.status === 'ERROR') return null
  const nome = (d.nome as string) ?? ''
  if (!nome) return null
  return {
    razaoSocial: nome,
    nomeFantasia: (d.fantasia as string) ?? '',
    uf: (d.uf as string) ?? '',
    municipio: (d.municipio as string) ?? '',
    situacao: (d.situacao as string) ?? '',
  }
}

export async function GET(_req: Request, { params }: { params: { cnpj: string } }) {
  const cnpj = (params.cnpj || '').replace(/\D/g, '')
  if (cnpj.length !== 14) {
    return NextResponse.json({ erro: 'CNPJ deve ter 14 dígitos.' }, { status: 400 })
  }

  const fontes: { url: string; norm: (d: Record<string, unknown>) => Saida | null }[] = [
    { url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, norm: normMinhaReceita },
    { url: `https://minhareceita.org/${cnpj}`, norm: normMinhaReceita },
    { url: `https://receitaws.com.br/v1/cnpj/${cnpj}`, norm: normReceitaWS },
  ]

  let naoEncontrado = false
  for (const f of fontes) {
    const r = await buscar(f.url)
    if (!r) continue
    if (r.status === 404) {
      naoEncontrado = true
      continue
    }
    if (r.status === 200 && r.data) {
      const saida = f.norm(r.data)
      if (saida) return NextResponse.json(saida)
    }
  }

  if (naoEncontrado) {
    return NextResponse.json({ erro: 'CNPJ não encontrado na base da Receita.' }, { status: 404 })
  }
  return NextResponse.json(
    { erro: 'As bases públicas da Receita estão instáveis agora. Tente de novo em instantes ou preencha manualmente.' },
    { status: 502 },
  )
}
