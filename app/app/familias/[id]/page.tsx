import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, AlertTriangle, CheckCircle2, CalendarDays, Coins, HandCoins, FolderOpen, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { faroisDaFamilia } from '@/lib/farois'
import { HoldingIdentidade } from '@/components/holding-identidade'
import { CampoDocumento } from '@/components/campo-documento'
import {
  formatarData,
  LABEL_TIPO_SOCIETARIO,
  LABEL_STATUS_HOLDING,
  LABEL_PAPEL_FAMILIAR,
  LABEL_ESTADO_CIVIL,
  LABEL_REGIME_BENS,
} from '@/lib/format'
import { createHolding, createSocio, deleteHolding, deleteSocio, updateFamily, updateSocio, createContato, deleteContato, convidarFamilia, revogarAcessoFamilia, convidarAdvogado, revogarAcessoAdvogado, criarSolicitacaoDocumento, excluirSolicitacaoDocumento, marcarEnvioLido } from '../../actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { CopyButton } from '@/components/copy-button'
import { molde, perfilValido } from '@/lib/perfil'
import { PageHeader, Card, ListCard, EmptyState, SectionTitle, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'
import { EditDialog } from '@/components/edit-dialog'

export default async function FamilyDetail({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string; message?: string }
}) {
  const supabase = createClient()

  const { data: family } = await supabase
    .from('families').select('id, name, notes, created_at').eq('id', params.id).single()
  const { data: solicitacoesDoc } = await supabase.from('familia_solicitacoes').select('id, descricao, status, created_at').eq('family_id', params.id).order('created_at', { ascending: false })
  const { data: enviosDoc } = await supabase.from('familia_envios').select('id, nome, observacao, storage_path, lido, created_at').eq('family_id', params.id).order('created_at', { ascending: false })
  const envioUrl = new Map<string, string>()
  if ((enviosDoc ?? []).length > 0) {
    const admin = createAdminClient()
    for (const e of enviosDoc ?? []) {
      if (!e.storage_path) continue
      const { data: signed } = await admin.storage.from('documentos').createSignedUrl(e.storage_path, 600)
      if (signed?.signedUrl) envioUrl.set(e.id, signed.signedUrl)
    }
  }  if (!family) notFound()

  const { data: socios } = await supabase
    .from('socios').select('id, nome, papel_familiar, regime_bens, cpf, estado_civil')
    .eq('family_id', params.id).order('nome')

  const { data: contatos } = await supabase
    .from('family_contacts')
    .select('id, nome, email, parentesco')
    .eq('family_id', params.id)
    .order('nome')

  const { data: acessos } = await supabase
    .from('family_access')
    .select('id, email, aceito_em, convite_token, created_at')
    .eq('family_id', params.id)
    .order('created_at')
  const { data: acessosAdv } = await supabase
    .from('advogado_access')
    .select('id, email, nivel, aceito_em, convite_token, created_at')
    .eq('family_id', params.id)
    .order('created_at')
  const { data: orgPerfilRow } = await supabase.from('organizations').select('perfil').limit(1).maybeSingle()
  const mp = molde(perfilValido(orgPerfilRow?.perfil))
  const h = headers()
  const base = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`

  const { data: holdings } = await supabase
    .from('holdings').select('id, razao_social, cnpj, tipo_societario, status, created_at')
    .eq('family_id', params.id).order('razao_social')

  const holdingIds = (holdings ?? []).map((h) => h.id)
  const farois = await faroisDaFamilia(supabase, params.id, holdingIds)
  const fam = `?fam=${params.id}`
  const atalhos = [
    { label: 'Calendário', href: `/app/calendario${fam}`, Icon: CalendarDays },
    { label: 'Mês da Holding', href: `/app/mes${fam}`, Icon: LayoutGrid },
    { label: 'Distribuições', href: `/app/distribuicoes${fam}`, Icon: Coins },
    { label: 'Doações', href: `/app/doacoes${fam}`, Icon: HandCoins },
    { label: 'Documentos', href: `/app/documentos${fam}`, Icon: FolderOpen },
  ]

  return (
    <div>
      <PageHeader
        back={{ href: '/app', label: 'Famílias' }}
        title={family.name}
        description={`Cadastrada em ${formatarData(family.created_at)}`}
        action={
          <EditDialog title="Editar família">
            <form className="space-y-4">
              <input type="hidden" name="id" value={family.id} />
              <div>
                <Label htmlFor="edit_name">Nome</Label>
                <input id="edit_name" name="name" defaultValue={family.name} required className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="edit_notes">Observações</Label>
                <textarea id="edit_notes" name="notes" defaultValue={family.notes ?? ''} rows={3} className={fieldClass} />
              </div>
              <div className="flex justify-end">
                <SubmitButton action={updateFamily}>Salvar</SubmitButton>
              </div>
            </form>
          </EditDialog>
        }
      />

      {searchParams?.error && <p className="mb-6 text-sm font-medium text-red-600">{searchParams.error}</p>}

      {/* COCKPIT — o que fazer nesta família */}
      <Card className="mb-4 p-5">
        <div className="flex items-center justify-between">
          <SectionTitle>O que fazer</SectionTitle>
        </div>
        {farois.length === 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={16} /> Tudo em dia nesta família — nenhuma pendência agora.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {farois.map((f) => (
              <li key={f.chave}>
                <Link
                  href={f.href}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition ${
                    f.estado === 'alerta' ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <AlertTriangle size={15} className={f.estado === 'alerta' ? 'text-red-600' : 'text-amber-600'} />
                    {f.label}
                  </span>
                  <ChevronRight size={16} className="text-ink-soft" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* atalhos para os módulos, já filtrados por esta família */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {atalhos.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-gold hover:text-navy"
            >
              <a.Icon size={14} /> {a.label}
            </Link>
          ))}
        </div>
      </Card>

      {/* SÓCIOS */}
      <SectionTitle>Sócios</SectionTitle>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="family_id" value={family.id} />
          <div>
            <Label htmlFor="nome">Nome</Label>
            <input id="nome" name="nome" required placeholder="Ex.: Roberto Andrade" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="cpf">CPF (opcional)</Label>
            <CampoDocumento id="cpf" name="cpf" />
          </div>
          <div>
            <Label htmlFor="papel_familiar">Papel na família</Label>
            <select id="papel_familiar" name="papel_familiar" className={fieldClass}>
              <option value="">—</option>
              {Object.entries(LABEL_PAPEL_FAMILIAR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="regime_bens">Regime de bens</Label>
            <select id="regime_bens" name="regime_bens" className={fieldClass}>
              <option value="">—</option>
              {Object.entries(LABEL_REGIME_BENS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton action={createSocio}>Adicionar sócio</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mt-4">
        {!socios || socios.length === 0 ? (
          <EmptyState>Nenhum sócio cadastrado ainda.</EmptyState>
        ) : (
          <ListCard>
            {socios.map((so) => (
              <div key={so.id} className="flex items-center gap-2 px-5 py-3">
                <span className="flex-1 font-medium text-ink">{so.nome}</span>
                <span className="flex items-center gap-2 text-xs text-ink-muted">
                  {so.papel_familiar && <Pill>{LABEL_PAPEL_FAMILIAR[so.papel_familiar]}</Pill>}
                  {so.regime_bens ? LABEL_REGIME_BENS[so.regime_bens] : ''}
                </span>
                <EditDialog title="Editar sócio" compact>
                  <form className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={so.id} />
                    <input type="hidden" name="family_id" value={family.id} />
                    <div>
                      <Label htmlFor={`es_nome_${so.id}`}>Nome</Label>
                      <input id={`es_nome_${so.id}`} name="nome" defaultValue={so.nome} required className={fieldClass} />
                    </div>
                    <div>
                      <Label htmlFor={`es_cpf_${so.id}`}>CPF</Label>
                      <CampoDocumento id={`es_cpf_${so.id}`} name="cpf" defaultValue={so.cpf ?? ''} />
                    </div>
                    <div>
                      <Label htmlFor={`es_papel_${so.id}`}>Papel na família</Label>
                      <select id={`es_papel_${so.id}`} name="papel_familiar" defaultValue={so.papel_familiar ?? ''} className={fieldClass}>
                        <option value="">—</option>
                        {Object.entries(LABEL_PAPEL_FAMILIAR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`es_civil_${so.id}`}>Estado civil</Label>
                      <select id={`es_civil_${so.id}`} name="estado_civil" defaultValue={so.estado_civil ?? ''} className={fieldClass}>
                        <option value="">—</option>
                        {Object.entries(LABEL_ESTADO_CIVIL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor={`es_regime_${so.id}`}>Regime de bens</Label>
                      <select id={`es_regime_${so.id}`} name="regime_bens" defaultValue={so.regime_bens ?? ''} className={fieldClass}>
                        <option value="">—</option>
                        {Object.entries(LABEL_REGIME_BENS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end sm:col-span-2">
                      <SubmitButton action={updateSocio}>Salvar</SubmitButton>
                    </div>
                  </form>
                </EditDialog>
                <DeleteButton action={deleteSocio} id={so.id} label={`o sócio "${so.nome}"`} extra={{ family_id: family.id }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>

      {/* CONTATOS DA FAMÍLIA */}
      <div className="mt-10"><SectionTitle>Contatos da família</SectionTitle></div>
      <p className="mt-1 text-xs text-ink-soft">
        Quem recebe o extrato mensal e o relatório anual — o botão de envio dos entregáveis já sai endereçado a eles.
      </p>
      <Card className="mt-3 p-5">
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input type="hidden" name="family_id" value={family.id} />
          <div>
            <Label htmlFor="contato_nome">Nome</Label>
            <input id="contato_nome" name="nome" required placeholder="Ex.: Roberto Andrade" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="contato_email">E-mail</Label>
            <input id="contato_email" name="email" type="email" placeholder="roberto@email.com" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="contato_parentesco">Vínculo</Label>
            <input id="contato_parentesco" name="parentesco" placeholder="Patriarca" className={fieldClass} />
          </div>
          <div className="self-end">
            <SubmitButton action={createContato}>Adicionar</SubmitButton>
          </div>
        </form>
      </Card>
      <div className="mt-4">
        {!contatos || contatos.length === 0 ? (
          <EmptyState>Nenhum contato cadastrado ainda.</EmptyState>
        ) : (
          <ListCard>
            {contatos.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1 font-medium text-ink">{c.nome}</span>
                {c.parentesco && <Pill>{c.parentesco}</Pill>}
                <span className="text-xs text-ink-muted">{c.email ?? 'sem e-mail'}</span>
                <DeleteButton action={deleteContato} id={c.id} label={`o contato ${c.nome}`} extra={{ family_id: family.id }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>

      {/* ACESSO DA FAMÍLIA (PORTAL) */}
      <div className="mt-10"><SectionTitle>Acesso da família (portal)</SectionTitle></div>
      <p className="mt-1 text-sm text-ink-muted">
        Convide um membro da família para acompanhar, em modo leitura, só a estrutura desta família — o que foi feito,
        a sucessão em andamento e o cofre. Ele nunca vê outras famílias, nem o seu radar ou financeiro.
      </p>
      <Card className="mt-3 p-5">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="family_id" value={family.id} />
          <div className="grow">
            <Label htmlFor="acesso_email">E-mail do membro da família</Label>
            <input id="acesso_email" name="email" type="email" placeholder="familiar@exemplo.com" className={fieldClass} />
          </div>
          <SubmitButton action={convidarFamilia}>Criar convite</SubmitButton>
        </form>
        {searchParams?.message && <p className="mt-3 text-sm font-medium text-emerald-600">{searchParams.message}</p>}
        {searchParams?.error && <p className="mt-3 text-sm font-medium text-red-600">{searchParams.error}</p>}
      </Card>
      <div className="mt-3">
        {!acessos || acessos.length === 0 ? (
          <EmptyState>Nenhum acesso criado. A família acompanha pelo portal quando você convida.</EmptyState>
        ) : (
          <ListCard>
            {acessos.map((a) => {
              const link = `${base}/portal/convite/${a.convite_token}`
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-[10rem] flex-1 font-medium text-ink">{a.email}</span>
                  {a.aceito_em ? (
                    <Pill>ativo</Pill>
                  ) : (
                    <>
                      <span className="rounded-md bg-cream px-2 py-0.5 text-[11px] font-medium text-navy">convite pendente</span>
                      <span className="max-w-[18rem] truncate text-xs text-ink-soft" title={link}>{link}</span>
                      <CopyButton text={link} />
                    </>
                  )}
                  <DeleteButton action={revogarAcessoFamilia} id={a.id} label={`o acesso de ${a.email}`} extra={{ family_id: family.id }} />
                </div>
              )
            })}
          </ListCard>
        )}
      </div>

      {/* HOLDINGS */}
      <div className="mt-10"><SectionTitle>Acesso do {mp.parceiro}</SectionTitle></div>
      <p className="mt-1 text-sm text-ink-muted">
        Convide o {mp.parceiro} parceiro para esta família específica. Em <strong>leitura</strong>, ele acompanha a estrutura;
        em <strong>contribuição</strong>, também registra {mp.parceiroContribui} nesta família. Ele nunca vê suas outras famílias.
      </p>
      <Card className="mt-3 p-5">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="family_id" value={family.id} />
          <div className="grow">
            <Label htmlFor="adv_email">E-mail do {mp.parceiro}</Label>
            <input id="adv_email" name="email" type="email" placeholder={mp.parceiro === 'contador' ? 'contador@escritorio.com.br' : 'advogado@escritorio.adv.br'} className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="adv_nivel">Nível</Label>
            <select id="adv_nivel" name="nivel" className={fieldClass} defaultValue="leitura">
              <option value="leitura">Somente leitura</option>
              <option value="contribuicao">Contribuição</option>
            </select>
          </div>
          <SubmitButton action={convidarAdvogado}>Criar convite</SubmitButton>
        </form>
      </Card>
      <div className="mt-3">
        {!acessosAdv || acessosAdv.length === 0 ? (
          <EmptyState>Nenhum {mp.parceiro} com acesso a esta família.</EmptyState>
        ) : (
          <ListCard>
            {acessosAdv.map((a) => {
              const link = `${base}/parceiro/convite/${a.convite_token}`
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-[10rem] flex-1 font-medium text-ink">{a.email}</span>
                  <Pill>{a.nivel === 'contribuicao' ? 'contribuição' : 'leitura'}</Pill>
                  {a.aceito_em ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">ativo</span>
                  ) : (
                    <>
                      <span className="rounded-md bg-cream px-2 py-0.5 text-[11px] font-medium text-navy">convite pendente</span>
                      <span className="max-w-[16rem] truncate text-xs text-ink-soft" title={link}>{link}</span>
                      <CopyButton text={link} />
                    </>
                  )}
                  <DeleteButton action={revogarAcessoAdvogado} id={a.id} label={`o acesso de ${a.email}`} extra={{ family_id: family.id }} />
                </div>
              )
            })}
          </ListCard>
        )}
      </div>

      {/* HOLDINGS */}
      <div className="mt-10"><SectionTitle>Holdings</SectionTitle></div>
      <Card className="mt-3 p-5">
        <form className="space-y-4">
          <input type="hidden" name="family_id" value={family.id} />
          <HoldingIdentidade />
          <div>
            <SubmitButton action={createHolding}>Adicionar holding</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mt-4">
        {!holdings || holdings.length === 0 ? (
          <EmptyState>Nenhuma holding nesta família ainda.</EmptyState>
        ) : (
          <ListCard>
            {holdings.map((h) => (
              <div key={h.id} className="flex items-center gap-2 px-5 py-4 transition hover:bg-surface">
                <Link href={`/app/holdings/${h.id}`} className="flex flex-1 items-center justify-between">
                  <span>
                    <span className="font-semibold text-ink">{h.razao_social}</span>
                    <span className="ml-2 text-xs text-ink-soft">
                      {LABEL_TIPO_SOCIETARIO[h.tipo_societario]}{h.cnpj ? ` · ${h.cnpj}` : ''}
                    </span>
                  </span>
                  <span className="mr-3 flex items-center gap-3 text-xs text-ink-soft">
                    {LABEL_STATUS_HOLDING[h.status]}
                    <ChevronRight size={16} />
                  </span>
                </Link>
                <DeleteButton action={deleteHolding} id={h.id} label={`a holding "${h.razao_social}" e seus dados`} extra={{ family_id: family.id }} />
              </div>
            ))}
          </ListCard>
        )}
      </div>
    </div>
  )
}
