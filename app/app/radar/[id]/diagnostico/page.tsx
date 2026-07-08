import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/format'
import { PrintButton } from '@/components/print-button'
import { MarcaEscritorio, AssinaturaEscritorio } from '@/components/marca-escritorio'
import { LeituraIA } from '@/components/leitura-ia'
import {
  cenarioSucessorio, cenarioLocacao, achados, semaforo, recomendacoes,
  type ClienteDiagnostico,
} from '@/lib/diagnostico'

export const dynamic = 'force-dynamic'

const CORDOT: Record<string, string> = {
  verde: 'bg-emerald-500',
  amarelo: 'bg-gold',
  vermelho: 'bg-red-500',
}
const CORTXT: Record<string, string> = {
  alerta: 'text-red-700',
  atencao: 'text-gold-deep',
  ok: 'text-emerald-700',
}
const DOT: Record<string, string> = {
  alerta: 'bg-red-500',
  atencao: 'bg-gold',
  ok: 'bg-emerald-500',
}

function hoje() {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function DiagnosticoPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data } = await supabase.from('radar_clientes').select('*').eq('id', params.id).single()
  if (!data) notFound()

  const c = data as unknown as ClienteDiagnostico
  const { data: org } = await supabase
    .from('organizations')
    .select('nome, crc, logo_url, cor_primaria')
    .eq('id', (data as { organization_id: string }).organization_id)
    .maybeSingle()

  const suc = cenarioSucessorio(c)
  const loc = cenarioLocacao(c)
  const lista = achados(c)
  const sem = semaforo(lista)
  const recs = recomendacoes(c)

  return (
    <div className="mx-auto max-w-3xl">
      {/* barra de ações — some na impressão */}
      <div className="no-print mb-5 flex items-center justify-between">
        <Link
          href={`/app/radar/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} /> Voltar ao cliente
        </Link>
        <PrintButton />
      </div>

      <article className="print-page rounded-xl2 border border-line bg-white p-8 shadow-card print:border-0 print:shadow-none">
        <MarcaEscritorio
          nome={org?.nome ?? null}
          crc={org?.crc ?? null}
          logoUrl={org?.logo_url ?? null}
          corPrimaria={org?.cor_primaria ?? null}
          titulo="Diagnóstico Patrimonial e Sucessório"
          subtitulo={`${c.nome} — retrato da estrutura, dos riscos e dos cenários.`}
          meta={
            <>
              <span>UF de referência: {c.uf}</span>
              <span>Data: {hoje()}</span>
            </>
          }
        />

        {/* sumário / semáforo */}
        <section className="mt-6">
          <SecTitle>Sumário</SecTitle>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <span className={`h-3.5 w-3.5 rounded-full ${CORDOT[sem.cor]}`} />
            <span className="text-sm font-semibold text-ink">{sem.texto}</span>
          </div>
        </section>

        {/* 1. retrato */}
        <section className="mt-6">
          <SecTitle>Parte 1 — A estrutura hoje</SecTitle>
          <dl className="mt-2 divide-y divide-line rounded-xl border border-line">
            <Row k="Patrimônio (ordem de grandeza)" v={formatarMoeda(Number(c.patrimonio))} />
            <Row k="Composição" v={`${c.n_imoveis} imóvel(is)${c.socio_pj ? ' · sócio de PJ' : ''}`} />
            <Row k="Receita de locação" v={loc.renda > 0 ? `${formatarMoeda(loc.renda)}/ano` : '—'} />
            <Row k="Herdeiros" v={c.n_herdeiros > 0 ? String(c.n_herdeiros) : '—'} />
            <Row
              k="Holding"
              v={
                c.holding_existe
                  ? `Constituída${c.holding_ano ? ` em ${c.holding_ano}` : ''}${c.ata_em_dia ? ' · atas em dia' : ' · atas em aberto'}`
                  : 'Não constituída'
              }
            />
            <Row
              k="Sucessão em vida"
              v={c.doacao_iniciada ? 'Cronograma de doações iniciado' : 'Não iniciada'}
            />
          </dl>
        </section>

        {/* 2. pontos de atenção */}
        <section className="mt-6">
          <SecTitle>Parte 2 — Os pontos de atenção</SecTitle>
          <p className="mt-1 text-sm text-ink-muted">
            Uma holding protege enquanto é mantida. Os pontos abaixo são organizáveis; nenhum exige
            refazer a estrutura.
          </p>
          <div className="mt-3 space-y-2.5">
            {lista.length === 0 && (
              <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
                Sem pontos críticos com os dados atuais. Preencha holding, atas e doações no cliente do
                radar para um retrato mais fino.
              </p>
            )}
            {lista.map((a, i) => (
              <div key={i} className="rounded-xl border border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[a.nivel]}`} />
                  <h3 className={`text-sm font-bold ${CORTXT[a.nivel]}`}>{a.titulo}</h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink">{a.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. a conta — sucessório */}
        <section className="mt-6 break-inside-avoid">
          <SecTitle>Parte 3 — A conta</SecTitle>
          <p className="mt-1 text-sm font-semibold text-ink">Sucessão: dois caminhos, dois custos</p>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-line bg-navy px-3 py-2 text-left text-xs font-semibold text-white">
                  &nbsp;
                </th>
                <th className="border border-line bg-navy px-3 py-2 text-left text-xs font-semibold text-white">
                  Caminho A — Não agir (inventário)
                </th>
                <th className="border border-line bg-navy px-3 py-2 text-left text-xs font-semibold text-white">
                  Caminho B — Planejar em vida
                </th>
              </tr>
            </thead>
            <tbody>
              <TR
                k="Base de cálculo"
                a={`${formatarMoeda(suc.base)} — e crescente`}
                b="Mesma base, capturada hoje"
              />
              <TR
                k={`ITCMD estimado (${c.itcmd_pct}%)`}
                a={formatarMoeda(suc.itcmd)}
                b={`${formatarMoeda(suc.itcmdDoacaoB)} (doações fracionadas, base atual)`}
              />
              <TR
                k={`Custas + honorários (${c.inventario_pct}%)`}
                a={formatarMoeda(suc.custas)}
                b="Não há inventário"
              />
              <TR k="Tempo / disponibilidade" a="12 a 24 meses, bens bloqueados" b="Transferência gradual, sob controle" />
              <tr>
                <td className="border border-line bg-surface px-3 py-2 font-semibold text-navy">Ordem de grandeza</td>
                <td className="border border-line px-3 py-2 font-bold text-red-700">
                  {formatarMoeda(suc.totalA)} <span className="font-normal text-ink-soft">+ tempo + conflito</span>
                </td>
                <td className="border border-line px-3 py-2 font-bold text-emerald-700">{formatarMoeda(suc.totalB)}</td>
              </tr>
            </tbody>
          </table>
          {suc.economia > 0 && (
            <div className="mt-3 rounded-xl border-l-4 border-gold bg-cream px-4 py-3 text-sm text-navy">
              A diferença entre os caminhos — cerca de <strong>{formatarMoeda(suc.economia)}</strong>, além de
              um a dois anos de bens bloqueados — é o que o planejamento em vida preserva para a família.
              Essa economia só se realiza se as doações acontecerem no ritmo certo, documentadas e no prazo:
              é exatamente o que a manutenção recorrente organiza, lembra e prova.
            </div>
          )}
        </section>

        {/* 3b. a conta — locação */}
        {loc.renda > 0 && (
          <section className="mt-6 break-inside-avoid">
            <p className="text-sm font-semibold text-ink">A locação sob a Reforma (2026–2033)</p>
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-line bg-navy px-3 py-2 text-left text-xs font-semibold text-white">
                    Locação {formatarMoeda(loc.renda)}/ano
                  </th>
                  <th className="border border-line bg-navy px-3 py-2 text-left text-xs font-semibold text-white">
                    Na pessoa física
                  </th>
                  <th className="border border-line bg-navy px-3 py-2 text-left text-xs font-semibold text-white">
                    Na holding (IVA dual)
                  </th>
                </tr>
              </thead>
              <tbody>
                <TR
                  k="Tributo estimado hoje"
                  a={`${formatarMoeda(loc.pf)}/ano`}
                  b={`${formatarMoeda(loc.holding)}/ano`}
                />
                <tr>
                  <td className="border border-line bg-surface px-3 py-2 font-semibold text-navy">Economia anual</td>
                  <td className="border border-line px-3 py-2" colSpan={2}>
                    <span className="font-bold text-emerald-700">{formatarMoeda(loc.economia)}/ano</span>{' '}
                    <span className="text-ink-soft">a favor da holding bem enquadrada</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-ink-soft">
              No regime pleno (2033), a locação na holding tende a ~8,4% efetivos (redutor de 70%); na
              pessoa física, o titular exposto ao IVA pode chegar a ~35,9%. A janela 2027–2028 (~1,8% a
              1,9% efetivos) é o melhor momento para consolidar o desenho.
            </p>
          </section>
        )}

        {/* 4. recomendações */}
        <section className="mt-6 break-inside-avoid">
          <SecTitle>Parte 4 — O caminho</SecTitle>
          <ol className="mt-2 space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-ink">
                  <strong className="text-navy">{r.titulo}</strong> — {r.texto}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 5. leitura do consultor (IA) */}
        <section className="mt-7 no-print">
          <LeituraIA
            radarId={params.id}
            inicial={(data as { leitura_ia?: string | null }).leitura_ia ?? null}
            inicialEm={(data as { leitura_ia_em?: string | null }).leitura_ia_em ?? null}
          />
        </section>

        {/* fronteira / disclaimer */}
        <footer className="mt-7 rounded-xl border-l-4 border-gold bg-cream px-4 py-3">
          <p className="text-xs font-semibold text-navy">Fronteira de responsabilidade</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            Este diagnóstico é um trabalho contábil de organização, registro e cálculo de cenários. A
            redação e a interpretação de instrumentos jurídicos — contratos, doações, cláusulas
            societárias, pactos e alterações — são atribuição do advogado parceiro. Os valores são
            estimativas de cenário e variam conforme o estado (ITCMD), a data e o caso concreto; não
            constituem apuração definitiva de tributos. Honorários contábeis e advocatícios são cobrados
            à parte.
          </p>
        </footer>

        <AssinaturaEscritorio nome={org?.nome ?? null} crc={org?.crc ?? null} />
      </article>
    </div>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-gold pb-1 text-xs font-bold uppercase tracking-wider text-navy">
      {children}
    </h2>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2 text-sm">
      <dt className="font-medium text-ink-muted">{k}</dt>
      <dd className="text-right font-semibold text-ink">{v}</dd>
    </div>
  )
}

function TR({ k, a, b }: { k: string; a: string; b: string }) {
  return (
    <tr>
      <td className="border border-line bg-surface px-3 py-2 font-semibold text-navy">{k}</td>
      <td className="border border-line px-3 py-2 text-ink">{a}</td>
      <td className="border border-line px-3 py-2 text-ink">{b}</td>
    </tr>
  )
}
