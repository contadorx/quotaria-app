// Cliente da API ZapSign — Modelo B (BYOK: token da conta do PRÓPRIO contador).
// Servidor apenas. O token vem de organizations.assinatura_token.
// Doc oficial: https://docs.zapsign.com.br  (endpoint /api/v1/docs/)

const BASE = 'https://api.zapsign.com.br/api/v1'

export type ZapSigner = { name: string; email?: string | null; phone?: string | null }

export type ZapDocResult = {
  token: string
  signers: { name: string; sign_url: string; token: string }[]
}

export async function criarDocumentoZapSign(
  apiToken: string,
  opts: { nome: string; pdfBase64: string; signatarios: ZapSigner[] },
): Promise<ZapDocResult> {
  if (!apiToken) throw new Error('Token do ZapSign não configurado.')

  const signers = opts.signatarios.map((s) => {
    const base: Record<string, unknown> = { name: s.name }
    if (s.email) {
      base.email = s.email
      base.auth_mode = 'assinaturaTela-email'
      base.send_automatic_email = true
    } else {
      // sem e-mail: gera link de assinatura que o contador envia manualmente
      base.auth_mode = 'assinaturaTela'
      base.send_automatic_email = false
    }
    return base
  })

  const res = await fetch(`${BASE}/docs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
    body: JSON.stringify({
      name: opts.nome,
      base64_pdf: opts.pdfBase64,
      signers,
      lang: 'pt-br',
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    token?: string
    signers?: { name?: string; sign_url?: string; token?: string }[]
    message?: string
    detail?: string
    error?: string
  }
  if (!res.ok) {
    const msg = data.message || data.detail || data.error || `ZapSign retornou ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : 'Falha ao criar documento no ZapSign.')
  }
  return {
    token: data.token ?? '',
    signers: (data.signers ?? []).map((s) => ({
      name: s.name ?? '',
      sign_url: s.sign_url ?? '',
      token: s.token ?? '',
    })),
  }
}
