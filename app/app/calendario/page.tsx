import { createClient } from '@/lib/supabase/server'
import { formatarDataISO, LABEL_TIPO_EVENTO } from '@/lib/format'
import { createEvento, toggleEvento, deleteEvento, seedMarcosReforma } from '../actions'
import { PageHeader, Card, EmptyState, SectionTitle, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'
import { PendingButton } from '@/components/submit-button'
import { FiltroFamiliaChip } from '@/components/filtro-familia-chip'

type Evento = {
  id: string
  holding_id: string | null
  titulo: string
  tipo: string
  data_prevista: string
  status: string
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { error?: string; fam?: string }
}) {
  const supabase = createClient()

  const { data: holdings } = await supabase
    .from('holdings')
    .select('id, razao_social, family_id')
    .order('razao_social')

  // filtro por família (?fam=)
  const famId = searchParams?.fam
  const familia = famId ? (holdings ?? []).find((h) => h.family_id === famId) : null
  const { data: famRow } = famId
    ? await supabase.from('families').select('name').eq('id', famId).maybeSingle()
    : { data: null }
  const holdingsFam = famId ? (holdings ?? []).filter((h) => h.family_id === famId) : (holdings ?? [])
  const idsFam = new Set(holdingsFam.map((h) => h.id))

  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, holding_id, titulo, tipo, data_prevista, status')
    .order('data_prevista')

  const nomePorHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))

  const hoje = new Date().toISOString().slice(0, 10)
  const hoje30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  const lista = ((eventos ?? []) as Evento[]).filter((e) => !famId || (e.holding_id && idsFam.has(e.holding_id)))
  const pendentes = lista.filter((e) => e.status !== 'concluido')
  const atrasados = pendentes.filter((e) => e.data_prevista < hoje)
  const proximos = pendentes.filter((e) => e.data_prevista >= hoje && e.data_prevista <= hoje30)
  const futuros = pendentes.filter((e) => e.data_prevista > hoje30)
  const concluidos = lista.filter((e) => e.status === 'concluido')

  const vazio = lista.length === 0

  return (
    <div>
      <PageHeader
        eyebrow="Agenda"
        title="Calendário"
        description="Prazos societários e marcos da Reforma. Vermelho vence, dourado está chegando."
        action={
          <form action={seedMarcosReforma}>
            <SubmitButton action={seedMarcosReforma} variant="ghost">
              Adicionar marcos da Reforma
            </SubmitButton>
          </form>
        }
      />

      {famId && <FiltroFamiliaChip nome={famRow?.name ?? 'Família'} base="/app/calendario" />}

      <Card className="p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label htmlFor="titulo">Evento</Label>
            <input id="titulo" name="titulo" required placeholder="Ex.: Ata anual de aprovação de contas" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="data_prevista">Data</Label>
            <input id="data_prevista" name="data_prevista" type="date" required className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <select id="tipo" name="tipo" className={fieldClass}>
              {Object.entries(LABEL_TIPO_EVENTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="holding_id">Holding (opcional)</Label>
            <select id="holding_id" name="holding_id" className={fieldClass}>
              <option value="">Carteira (geral)</option>
              {(holdings ?? []).map((h) => <option key={h.id} value={h.id}>{h.razao_social}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <input id="notes" name="notes" placeholder="Ex.: prazo legal até abril" className={fieldClass} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <SubmitButton action={createEvento}>Adicionar ao calendário</SubmitButton>
          </div>
        </form>
        {searchParams?.error && (
          <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>
        )}
      </Card>

      {vazio ? (
        <div className="mt-6">
          <EmptyState>
            Nenhum evento ainda. Adicione um prazo acima, ou clique em{' '}
            <strong className="font-semibold text-ink">Adicionar marcos da Reforma</strong> para
            popular a esteira 2026-2033.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <Grupo titulo="Atrasados" cor="red" eventos={atrasados} nomePorHolding={nomePorHolding} />
          <Grupo titulo="Próximos 30 dias" cor="gold" eventos={proximos} nomePorHolding={nomePorHolding} />
          <Grupo titulo="Adiante" cor="soft" eventos={futuros} nomePorHolding={nomePorHolding} />
          <Grupo titulo="Concluídos" cor="emerald" eventos={concluidos} nomePorHolding={nomePorHolding} />
        </div>
      )}
    </div>
  )
}

const DOT: Record<string, string> = {
  red: 'bg-red-500',
  gold: 'bg-gold',
  soft: 'bg-ink-soft/50',
  emerald: 'bg-emerald-500',
}

function Grupo({
  titulo,
  cor,
  eventos,
  nomePorHolding,
}: {
  titulo: string
  cor: string
  eventos: Evento[]
  nomePorHolding: Map<string, string>
}) {
  if (eventos.length === 0) return null
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${DOT[cor]}`} />
        <SectionTitle>
          {titulo} <span className="text-ink-soft">({eventos.length})</span>
        </SectionTitle>
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        {eventos.map((e) => {
          const concluido = e.status === 'concluido'
          return (
            <div key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className={`w-20 shrink-0 tabular-nums ${cor === 'red' ? 'font-semibold text-red-700' : 'text-ink-muted'}`}>
                {formatarDataISO(e.data_prevista)}
              </span>
              <span className={`flex-1 ${concluido ? 'text-ink-soft line-through' : 'font-medium text-ink'}`}>
                {e.titulo}
                <span className="ml-2 text-xs font-normal text-ink-soft">
                  {e.holding_id ? nomePorHolding.get(e.holding_id) ?? 'holding' : 'carteira'}
                </span>
              </span>
              <Pill>{LABEL_TIPO_EVENTO[e.tipo]}</Pill>
              <form action={toggleEvento}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="to" value={concluido ? 'pendente' : 'concluido'} />
                <PendingButton className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink">
                  {concluido ? 'Reabrir' : 'Concluir'}
                </PendingButton>
              </form>
              <DeleteButton action={deleteEvento} id={e.id} label={`o evento "${e.titulo}"`} />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
