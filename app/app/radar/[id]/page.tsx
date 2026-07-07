import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Flame, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/format'
import {
  calcularScore, classificar, leadQuenteReforma,
  irpfAnualAluguel, tributoHoldingAluguel, economiaAnualAluguel,
  custoNaoPlanejar, frasePronta, LABEL_STATUS_RADAR,
} from '@/lib/radar'
import { updateRadarSinais, updateRadarStatus, deleteRadarCliente } from '../../actions'
import { PageHeader, Card, SectionTitle, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { EditDialog } from '@/components/edit-dialog'
import { DeleteButton } from '@/components/delete-button'
import { CopyButton } from '@/components/copy-button'
import { PendingButton } from '@/components/submit-button'
import { ImportarDirpf } from '@/components/importar-dirpf'

const FLUXO: Record<string, string[]> = {
  novo: ['abordado', 'descartado'],
  abordado: ['diagnostico', 'descartado'],
  diagnostico: ['proposta', 'descartado'],
  proposta: ['fechado', 'descartado'],
  fechado: ['novo'],
  descartado: ['novo'],
}

export default async function RadarClientePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data: c } = await supabase.from('radar_clientes').select('*').eq('id', params.id).single()
  if (!c) notFound()

  const score = calcularScore(c)
  const classe = classificar(score)
  const quente = leadQuenteReforma(c)
  const irpf = irpfAnualAluguel(Number(c.renda_aluguel_anual))
  const holding = tributoHoldingAluguel(Number(c.renda_aluguel_anual))
  const economia = economiaAnualAluguel(Number(c.renda_aluguel_anual))
  const custo = custoNaoPlanejar(Number(c.patrimonio), Number(c.itcmd_pct), Number(c.inventario_pct))
  const frase = frasePronta(c.nome, c, Number(c.itcmd_pct), Number(c.inventario_pct))

  return (
    <div>
      <PageHeader
        back={{ href: '/app/radar', label: 'Radar' }}
        title={c.nome}
        description={`Score ${score}/100 · prioridade ${classe} · ${LABEL_STATUS_RADAR[c.status]}`}
        action={
          <div className="flex items-center gap-2">
          <Link
            href={`/app/radar/${c.id}/diagnostico`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft"
          >
            <FileText size={15} /> Gerar diagnóstico
          </Link>
          <EditDialog title="Editar sinais e premissas">
            <form className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={c.id} />
              <div>
                <Label htmlFor="e_imoveis">Nº de imóveis</Label>
                <input id="e_imoveis" name="n_imoveis" type="number" min="0" defaultValue={c.n_imoveis} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="e_herdeiros">Nº de herdeiros</Label>
                <input id="e_herdeiros" name="n_herdeiros" type="number" min="0" defaultValue={c.n_herdeiros} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="e_patrimonio">Patrimônio (R$)</Label>
                <input id="e_patrimonio" name="patrimonio" type="number" step="0.01" min="0" defaultValue={c.patrimonio} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="e_aluguel">Aluguéis/ano (R$)</Label>
                <input id="e_aluguel" name="renda_aluguel_anual" type="number" step="0.01" min="0" defaultValue={c.renda_aluguel_anual} className={fieldClass} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="socio_pj" defaultChecked={c.socio_pj} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                Sócio de PJ
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="recebe_dividendos" defaultChecked={c.recebe_dividendos} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                Recebe dividendos
              </label>
              <div>
                <Label htmlFor="e_uf">UF</Label>
                <input id="e_uf" name="uf" maxLength={2} defaultValue={c.uf} className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="e_itcmd">ITCMD %</Label>
                  <input id="e_itcmd" name="itcmd_pct" type="number" step="0.1" min="0" max="8" defaultValue={c.itcmd_pct} className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="e_inv">Inventário %</Label>
                  <input id="e_inv" name="inventario_pct" type="number" step="0.5" min="0" max="20" defaultValue={c.inventario_pct} className={fieldClass} />
                </div>
              </div>

              <div className="sm:col-span-2 border-t border-line pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Para o diagnóstico</p>
                <input type="hidden" name="diag_marker" value="1" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="holding_existe" defaultChecked={c.holding_existe} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                    Já tem holding constituída
                  </label>
                  <div>
                    <Label htmlFor="e_hano">Ano da holding</Label>
                    <input id="e_hano" name="holding_ano" type="number" min="1990" max="2100" defaultValue={c.holding_ano ?? ''} placeholder="ex.: 2023" className={fieldClass} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="ata_em_dia" defaultChecked={c.ata_em_dia} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                    Atas em dia
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="doacao_iniciada" defaultChecked={c.doacao_iniciada} className="h-4 w-4 rounded border-line text-navy focus:ring-gold" />
                    Doação de quotas iniciada
                  </label>
                </div>
              </div>

              <div className="flex justify-end sm:col-span-2">
                <SubmitButton action={updateRadarSinais}>Salvar</SubmitButton>
              </div>
            </form>
          </EditDialog>
          </div>
        }
      />

      {searchParams?.error && <p className="mb-4 text-sm font-medium text-red-600">{searchParams.error}</p>}

      {quente && (
        <div className="mb-6 flex items-center gap-2 rounded-xl2 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <Flame size={16} />
          Lead quente da Reforma: locação acima de R$ 240 mil/ano com mais de 3 imóveis — a PF vira
          contribuinte do IVA. Este cliente tem urgência datada.
        </div>
      )}

      {/* ARGUMENTÁRIO */}
      <SectionTitle>O argumentário</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Big rotulo="IR na PF hoje (aluguéis)" valor={`${formatarMoeda(irpf)}/ano`} />
        <Big rotulo="Na holding (presumido)" valor={`${formatarMoeda(holding)}/ano`} />
        <Big rotulo="Economia anual estimada" valor={`${formatarMoeda(economia)}/ano`} destaque />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Big
          rotulo={`Custo de não planejar (ITCMD ${c.itcmd_pct}% + inventário ${c.inventario_pct}%)`}
          valor={formatarMoeda(custo)}
          destaque
        />
        <Card className="p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Sinais</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            <Pill>{c.n_imoveis} imóveis</Pill>
            <Pill>{formatarMoeda(Number(c.patrimonio))}</Pill>
            <Pill>aluguéis {formatarMoeda(Number(c.renda_aluguel_anual))}/ano</Pill>
            {c.socio_pj && <Pill>sócio PJ</Pill>}
            {c.recebe_dividendos && <Pill>dividendos</Pill>}
            <Pill>{c.n_herdeiros} herdeiro(s)</Pill>
          </div>
          {c.lgpd_confirmado_em && (
            <p className="mt-2 text-[11px] text-emerald-700">✓ Tratamento sob contrato do titular registrado (LGPD)</p>
          )}
        </Card>
      </div>

      <Card className="mt-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Frase pronta para a abordagem</div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{frase}</p>
          </div>
          <CopyButton text={frase} />
        </div>
      </Card>

      {/* PIPELINE */}
      <div className="mt-8"><SectionTitle>Pipeline</SectionTitle></div>
      <Card className="mt-3 flex flex-wrap items-center gap-3 p-5">
        <Pill>{LABEL_STATUS_RADAR[c.status]}</Pill>
        {FLUXO[c.status].map((to) => (
          <form key={to} action={updateRadarStatus}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="to" value={to} />
            <PendingButton className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink">
              → {LABEL_STATUS_RADAR[to]}
            </PendingButton>
          </form>
        ))}
        <div className="ml-auto">
          <DeleteButton action={deleteRadarCliente} id={c.id} label={`o cliente "${c.nome}" do radar`} />
        </div>
      </Card>

      {/* IMPORT DIRPF */}
      <div className="mt-8"><SectionTitle>Importar da DIRPF</SectionTitle></div>
      <div className="mt-3">
        <ImportarDirpf radarId={c.id} action={updateRadarSinais} />
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Estimativas de cenário (tabela IRPF 2025 sem o redutor da Lei 15.270 — conservador; presumido
        com adicional de IRPJ quando cabível). ITCMD e custos variam por estado e caso; o cálculo
        definitivo é do contador e os instrumentos jurídicos, do advogado parceiro.
      </p>
    </div>
  )
}

function Big({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{rotulo}</div>
      <div className={`num mt-1 text-xl font-bold ${destaque ? 'text-navy' : 'text-ink'}`}>{valor}</div>
    </Card>
  )
}
