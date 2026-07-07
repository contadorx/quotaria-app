import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/print-button'
import { EnviarZapSign } from '@/components/enviar-zapsign'
import { fieldClass, Label } from '@/components/ui'
import {
  ataAprovacaoContas, ataDistribuicao, type MinutaTipo, type SocioQuota, type Minuta,
} from '@/lib/minutas'

export const dynamic = 'force-dynamic'

const TIPOS: MinutaTipo[] = ['aprovacao-contas', 'distribuicao']

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export default async function MinutaGeradaPage({
  params,
  searchParams,
}: {
  params: { id: string; tipo: string }
  searchParams: { exercicio?: string; competencia?: string; valor?: string; data?: string; proporcional?: string }
}) {
  const tipo = params.tipo as MinutaTipo
  if (!TIPOS.includes(tipo)) notFound()

  const supabase = createClient()
  const { data: holding } = await supabase
    .from('holdings').select('razao_social, cnpj, family_id, organization_id').eq('id', params.id).single()
  if (!holding) notFound()

  const { data: quotas } = await supabase
    .from('quotas').select('socio_id, quantidade, percentual').eq('holding_id', params.id)
  const socioIds = Array.from(new Set((quotas ?? []).map((q) => q.socio_id)))
  const { data: socios } = socioIds.length
    ? await supabase.from('socios').select('id, nome').in('id', socioIds)
    : { data: [] as { id: string; nome: string }[] }
  const socioMap = new Map((socios ?? []).map((s) => [s.id, s.nome]))
  const linhas: SocioQuota[] = (quotas ?? []).map((q) => ({
    nome: socioMap.get(q.socio_id) ?? 'sócio',
    percentual: q.percentual,
    quantidade: Number(q.quantidade),
  }))

  const { data: org } = await supabase
    .from('organizations').select('assinatura_provedor').eq('id', holding.organization_id).maybeSingle()
  const zapAtivo = org?.assinatura_provedor === 'zapsign'

  // parâmetros variáveis (com defaults)
  const anoPassado = new Date().getFullYear() - 1
  const exercicio = Number(searchParams?.exercicio) || anoPassado
  const competencia = searchParams?.competencia || hojeISO()
  const valor = Number(searchParams?.valor) || 0
  const dataReuniao = searchParams?.data || hojeISO()
  const proporcional = searchParams?.proporcional !== 'nao'

  const minuta: Minuta =
    tipo === 'aprovacao-contas'
      ? ataAprovacaoContas(holding, linhas, { exercicio, dataReuniao })
      : ataDistribuicao(holding, linhas, { competencia, valorTotal: valor, dataReuniao, proporcional })

  const semSocios = linhas.length === 0

  return (
    <div className="mx-auto max-w-3xl">
      {/* barra de ações — some na impressão */}
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href={`/app/holdings/${params.id}/minutas`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Minutas
        </Link>
        <PrintButton />
      </div>

      {/* parâmetros variáveis — form GET, some na impressão */}
      <form className="no-print mb-5 grid gap-3 rounded-xl2 border border-line bg-white p-4 shadow-card sm:grid-cols-3">
        <div className="sm:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Dados da ata</p>
        </div>
        {tipo === 'aprovacao-contas' ? (
          <div>
            <Label htmlFor="exercicio">Exercício</Label>
            <input id="exercicio" name="exercicio" type="number" defaultValue={exercicio} className={fieldClass} />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="competencia">Competência</Label>
              <input id="competencia" name="competencia" type="date" defaultValue={competencia} className={fieldClass} />
            </div>
            <div>
              <Label htmlFor="valor">Valor distribuído (R$)</Label>
              <input id="valor" name="valor" type="number" step="0.01" min="0" defaultValue={valor || ''} className={fieldClass} />
            </div>
            <div>
              <Label htmlFor="proporcional">Proporção</Label>
              <select id="proporcional" name="proporcional" defaultValue={proporcional ? 'sim' : 'nao'} className={fieldClass}>
                <option value="sim">Proporcional às quotas</option>
                <option value="nao">Desproporcional (deliberada)</option>
              </select>
            </div>
          </>
        )}
        <div>
          <Label htmlFor="data">Data da reunião</Label>
          <input id="data" name="data" type="date" defaultValue={dataReuniao} className={fieldClass} />
        </div>
        <div className="flex items-end">
          <button type="submit" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface">
            Atualizar
          </button>
        </div>
      </form>

      {/* a minuta */}
      <article className="print-page rounded-xl2 border border-line bg-white p-8 shadow-card print:border-0 print:shadow-none">
        {semSocios ? (
          <p className="text-sm text-amber-700">
            Cadastre os sócios e as quotas desta holding para gerar a minuta com o quadro de participação.
          </p>
        ) : (
          <>
            <header className="border-b border-navy pb-3 text-center">
              {minuta.cabecalho.map((h, i) => (
                <p key={i} className={i === 0 ? 'text-sm font-bold text-navy' : 'mt-1 text-xs font-semibold uppercase tracking-wide text-ink'}>{h}</p>
              ))}
            </header>

            <div className="mt-5 space-y-3 text-sm leading-relaxed text-ink">
              {minuta.paragrafos.map((p, i) => <p key={i} className="text-justify">{p}</p>)}
            </div>

            <p className="mt-4 text-sm font-semibold text-navy">Deliberações</p>
            <ol className="mt-1 space-y-1.5 text-sm text-ink">
              {minuta.deliberacoes.map((d, i) => (
                <li key={i} className="flex gap-2"><span className="font-semibold text-gold-deep">{i + 1}.</span><span className="text-justify">{d}</span></li>
              ))}
            </ol>

            <p className="mt-5 text-sm text-ink">Nada mais havendo a tratar, lavrou-se a presente ata, que segue assinada pelos sócios.</p>

            <div className="mt-8 space-y-6">
              {minuta.assinantes.map((a, i) => (
                <div key={i}>
                  <div className="border-t border-ink pt-1 text-sm text-ink" style={{ maxWidth: 320 }}>{a}</div>
                </div>
              ))}
            </div>

            <p className="mt-8 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-soft">{minuta.nota}</p>
          </>
        )}
      </article>

      {/* fluxo pós-geração — some na impressão */}
      {!semSocios && (
        <div className="no-print mt-5 space-y-4">
          {zapAtivo && (
            <div className="rounded-xl2 border border-line bg-white p-5 shadow-card">
              <p className="text-sm font-semibold text-ink">Enviar com um clique</p>
              <p className="mb-3 mt-0.5 text-xs text-ink-muted">
                Gera o PDF e envia pela sua conta ZapSign. Sócios com e-mail cadastrado recebem o convite; para os demais, você recebe o link.
              </p>
              <EnviarZapSign
                params={{
                  holdingId: params.id,
                  tipo,
                  exercicio,
                  competencia,
                  valorTotal: valor,
                  dataReuniao,
                  proporcional,
                }}
              />
            </div>
          )}

          <div className="rounded-xl2 border border-line bg-white p-5 shadow-card">
            <p className="text-sm font-semibold text-ink">Arquivar a versão assinada</p>
            <p className="mb-3 mt-0.5 text-xs text-ink-muted">
              Depois de assinada, guarde a ata no cofre desta holding — é a prova auditável que entra no dossiê.
            </p>
            <Link
              href={`/app/holdings/${params.id}?tab=documentos`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              <Upload size={15} /> Ir para o cofre
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
