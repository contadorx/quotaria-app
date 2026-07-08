// E-mail transacional via Brevo (servidor apenas).
// Ambiente:
//   BREVO_API_KEY   -> chave da API (sem ela, envio é PULADO com aviso no log)
//   EMAIL_FROM      -> remetente (ex.: quotaria@contadorx.com.br)
//   EMAIL_FROM_NAME -> nome do remetente (padrão: Quotaria)

export function emailConfigurado(): boolean {
  return !!process.env.BREVO_API_KEY && !!process.env.EMAIL_FROM
}

export async function enviarEmail(opts: {
  para: string
  assunto: string
  corpoTexto: string
  botao?: { texto: string; url: string }
}): Promise<{ ok: boolean; skipped?: boolean; erro?: string }> {
  const key = process.env.BREVO_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) {
    console.warn('[brevo] BREVO_API_KEY/EMAIL_FROM ausentes — envio pulado:', opts.assunto, '→', opts.para)
    return { ok: false, skipped: true }
  }

  const paragrafos = opts.corpoTexto
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
  const botao = opts.botao
    ? `<p style="margin:22px 0 6px"><a href="${opts.botao.url}" style="display:inline-block;background:#12284B;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:10px">${opts.botao.texto}</a></p>`
    : ''
  const html = `<!doctype html><html><body style="margin:0;background:#F7F3E9;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:#1B2430">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E7E1D2;border-radius:14px;padding:28px">
    <p style="margin:0 0 18px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#A8873F;font-weight:700">Quotaria</p>
    ${paragrafos}${botao}
    <p style="margin:26px 0 0;font-size:12px;color:#8A8FA0">Você recebe este e-mail por ter uma conta no Quotaria.</p>
  </div></body></html>`

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        sender: { email: from, name: process.env.EMAIL_FROM_NAME || 'Quotaria' },
        to: [{ email: opts.para }],
        subject: opts.assunto,
        htmlContent: html,
        textContent: opts.corpoTexto,
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return { ok: false, erro: `Brevo ${res.status}: ${t.slice(0, 180)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha no envio.' }
  }
}
