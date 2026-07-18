import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import {
  cenarioSucessorio, cenarioLocacao, achados, semaforo, recomendacoes,
  type ClienteDiagnostico,
} from '@/lib/diagnostico'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM = `Você é um consultor sênior de planejamento patrimonial conversando com o CONTADOR do escritório (não com o cliente final). Você recebe um diagnóstico patrimonial JÁ CALCULADO pelo sistema e faz a "leitura do consultor" — a interpretação prática que ajuda o contador a conduzir a conversa com a família.

REGRAS INEGOCIÁVEIS:
- Use SOMENTE os números fornecidos. NUNCA invente valores, alíquotas, prazos ou datas.
- Todos os valores são ESTIMATIVAS DE CENÁRIO que variam por estado (ITCMD), data e caso concreto — trate-os sempre como estimativas, nunca como garantias.
- NUNCA dê conselho jurídico ou tributário definitivo. A redação de instrumentos (contratos, cláusulas, doações) é do ADVOGADO; o cálculo fiscal definitivo é do CONTADOR. O sistema apenas organiza e estima.
- NUNCA use a palavra "blindagem". Use proteção, organização, governança.
- Não prometa resultados. Não afirme economia como certa — diga "estimada".

FORMATO (português do Brasil, tom de consultor experiente, direto e curto):
1. Leitura da situação — o que os números dizem sobre esta família, em 2–3 frases.
2. Prioridades — o que atacar primeiro e por quê (liste 2 a 4 itens objetivos).
3. Para a reunião — 2 ou 3 pontos de conversa que o contador pode levar à família.
Interprete os números; não os repita como tabela.`

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export async function POST(req: Request) {
  try {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string }
    if (!id) return NextResponse.json({ erro: 'Lead não informado.' }, { status: 400 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

    const { data: cRow } = await supabase.from('radar_clientes').select('*').eq('id', id).maybeSingle()
    if (!cRow) return NextResponse.json({ erro: 'Lead não encontrado.' }, { status: 404 })
    const c = cRow as unknown as ClienteDiagnostico & {
      nome: string; n_imoveis: number; patrimonio: number; renda_aluguel_anual: number
      n_herdeiros: number; socio_pj: boolean; recebe_dividendos: boolean; uf: string; itcmd_pct: number
    }

    const suc = cenarioSucessorio(c)
    const loc = cenarioLocacao(c)
    const ach = achados(c)
    const sem = semaforo(ach)
    const recs = recomendacoes(c)

    const dados = `Cliente: ${c.nome}
Perfil: ${c.n_imoveis} imóveis; patrimônio ${brl(Number(c.patrimonio))}; aluguéis ${brl(Number(c.renda_aluguel_anual))}/ano; ${c.n_herdeiros} herdeiros; sócio de PJ: ${c.socio_pj ? 'sim' : 'não'}; recebe dividendos: ${c.recebe_dividendos ? 'sim' : 'não'}; UF ${c.uf}; ITCMD estimado ${c.itcmd_pct}%.
Semáforo de saúde: ${sem.cor} — ${sem.texto}.
Cenário sucessório (estimativa): inventário = ITCMD ${brl(suc.itcmd)} + custas ${brl(suc.custas)} = ${brl(suc.totalA)}; doação em vida ≈ ${brl(suc.totalB)}; economia bruta estimada ${brl(suc.economia)}.${suc.temImovel && suc.custoMontagem > 0 ? ` Custo de montar a estrutura (estimativa): ITBI ${brl(suc.itbi)} + escritura/registro ${brl(suc.escritura)} = ${brl(suc.custoMontagem)} (ITBI pode ser imune na integralização — Tema 796 STF, conforme a atividade da holding); economia LÍQUIDA estimada ${brl(suc.economiaLiquida)}.` : ''}
Cenário de locação (estimativa anual): pessoa física ${brl(loc.pf)}; holding ${brl(loc.holding)}; economia ${brl(loc.economia)}/ano; lead quente da Reforma: ${loc.quente ? 'sim' : 'não'}.
Pontos de atenção: ${ach.length ? ach.map((a) => `[${a.nivel}] ${a.titulo} — ${a.texto}`).join(' | ') : 'nenhum relevante'}.
Recomendações do sistema: ${recs.map((r) => `${r.titulo}: ${r.texto}`).join(' | ')}.`

    const texto = await anthropic(
      [{ role: 'user', content: `Faça a leitura do consultor sobre este diagnóstico:\n\n${dados}` }],
      SYSTEM,
      900,
    )
    const agora = new Date().toISOString()
    await supabase.from('radar_clientes').update({ leitura_ia: texto, leitura_ia_em: agora }).eq('id', id)
    return NextResponse.json({ ok: true, texto, em: agora })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao gerar a leitura.'
    const amigavel = msg.includes('ANTHROPIC_API_KEY')
      ? 'A IA ainda não está configurada. Defina ANTHROPIC_API_KEY na Vercel para ligar a leitura do consultor.'
      : msg
    return NextResponse.json({ erro: amigavel }, { status: 500 })
  }
}
