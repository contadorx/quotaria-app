import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { montarSystemVendas } from '@/lib/vendas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Origens do site autorizadas a chamar o chat de vendas.
const ORIGENS = new Set([
  'https://quotaria.com.br',
  'https://www.quotaria.com.br',
])

function cors(origin: string | null) {
  const permitido = origin && ORIGENS.has(origin) ? origin : 'https://quotaria.com.br'
  return {
    'Access-Control-Allow-Origin': permitido,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get('origin')) })
}

type Msg = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const headers = cors(req.headers.get('origin'))
  try {
    const body = (await req.json().catch(() => ({}))) as { messages?: Msg[] }
    let messages = Array.isArray(body.messages) ? body.messages : []
    // limites anti-abuso: nº de mensagens e tamanho de cada uma
    messages = messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-14)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ erro: 'Mensagem inválida.' }, { status: 400, headers })
    }

    const admin = createAdminClient()
    const { data: cfg } = await admin.from('vendas_config').select('system_prompt, modelo, ativo').eq('id', 1).maybeSingle()
    if (cfg && cfg.ativo === false) {
      return NextResponse.json(
        { reply: 'No momento o atendimento por aqui está pausado. Você pode criar sua conta em app.quotaria.com.br/login ou conhecer a Formação em /formacao.' },
        { headers },
      )
    }

    const system = montarSystemVendas(cfg?.system_prompt)
    const reply = await anthropic(messages, system, 500, cfg?.modelo ?? undefined)
    return NextResponse.json({ reply }, { headers })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha no atendimento.'
    const amigavel = msg.includes('ANTHROPIC_API_KEY')
      ? 'O atendimento por IA ainda não está ativo. Fale com a gente pelo WhatsApp ou crie sua conta em app.quotaria.com.br/login.'
      : 'Tive um problema para responder agora. Tente de novo em instantes — ou crie sua conta em app.quotaria.com.br/login.'
    return NextResponse.json({ reply: amigavel }, { headers })
  }
}
