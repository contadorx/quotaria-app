import { createClient } from '@/lib/supabase/server'
import { formatarDataISO, formatarTamanho, LABEL_TIPO_DOCUMENTO } from '@/lib/format'
import { deleteDocumento } from '../actions'
import { PageHeader, ListCard, EmptyState, Pill } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'
import { UploadDocumento } from '@/components/upload-documento'
import { DownloadButton } from '@/components/download-button'

export default async function DocumentosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: orgId } = await supabase.rpc('current_org')

  const { data: holdings } = await supabase.from('holdings').select('id, razao_social').order('razao_social')
  const { data: documentos } = await supabase
    .from('documentos')
    .select('id, holding_id, nome, tipo, storage_path, tamanho_bytes, competencia, created_at')
    .order('created_at', { ascending: false })

  const nomePorHolding = new Map((holdings ?? []).map((h) => [h.id, h.razao_social]))

  return (
    <div>
      <PageHeader
        eyebrow="Cofre"
        title="Documentos"
        description="O dossiê auditável — atas, contratos, laudos e matrículas guardados por holding. A prova física da promessa, no dia em que o Fisco questiona ou o herdeiro pergunta."
      />

      <UploadDocumento pastaId={orgId ?? user?.id ?? ''} holdings={holdings ?? []} />

      <div className="mt-6">
        {!documentos || documentos.length === 0 ? (
          <EmptyState>Nenhum documento no cofre ainda. Envie o primeiro acima.</EmptyState>
        ) : (
          <ListCard>
            {documentos.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                <div className="flex-1">
                  <div className="font-medium text-ink">{d.nome}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <Pill>{LABEL_TIPO_DOCUMENTO[d.tipo]}</Pill>
                    <span>{d.holding_id ? nomePorHolding.get(d.holding_id) ?? 'holding' : 'carteira (geral)'}</span>
                    {d.competencia ? <span>· {formatarDataISO(d.competencia)}</span> : null}
                    <span>· {formatarTamanho(d.tamanho_bytes)}</span>
                  </div>
                </div>
                <DownloadButton path={d.storage_path} />
                <DeleteButton action={deleteDocumento} id={d.id} label={`o documento "${d.nome}"`} />
              </div>
            ))}
          </ListCard>
        )}
      </div>
    </div>
  )
}
