import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatarData } from '@/lib/format'
import { convidarMembro, removerConvite, removerMembro } from '../../actions'
import { PageHeader, Card, ListCard, EmptyState, SectionTitle, Label, SubmitButton, Pill, fieldClass } from '@/components/ui'
import { DeleteButton } from '@/components/delete-button'
import { CopyButton } from '@/components/copy-button'

const LABEL_PAPEL: Record<string, string> = { dono: 'Dono', admin: 'Admin', colaborador: 'Colaborador' }

export default async function EquipePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data: orgId } = await supabase.rpc('current_org')
  if (!orgId) redirect('/onboarding')
  const { data: souAdmin } = await supabase.rpc('is_org_admin')

  const { data: membros } = await supabase
    .from('organization_members')
    .select('id, email, role, created_at')
    .order('created_at')

  const { data: convites } = await supabase
    .from('organization_invites')
    .select('id, email, role, token, expires_at, accepted_at')
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return (
    <div>
      <PageHeader
        eyebrow="Escritório"
        title="Equipe"
        description="Quem trabalha neste escritório. Colaboradores compartilham a mesma carteira de famílias, holdings e documentos."
      />

      <div className="mb-6 flex gap-2 text-sm">
        <Link href="/app/configuracoes" className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink-muted transition hover:bg-surface">Dados e marca</Link>
        <span className="rounded-lg bg-navy px-3 py-1.5 font-medium text-white">Equipe</span>
      </div>

      {searchParams?.error && <p className="mb-4 text-sm font-medium text-red-600">{searchParams.error}</p>}

      <SectionTitle>Membros</SectionTitle>
      <div className="mt-3">
        <ListCard>
          {(membros ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="flex-1 font-medium text-ink">{m.email ?? '—'}</span>
              <Pill>{LABEL_PAPEL[m.role]}</Pill>
              <span className="text-xs text-ink-soft">desde {formatarData(m.created_at)}</span>
              {souAdmin && m.role !== 'dono' && (
                <DeleteButton action={removerMembro} id={m.id} label={`o membro ${m.email ?? ''} do escritório`} />
              )}
            </div>
          ))}
        </ListCard>
      </div>

      {souAdmin ? (
        <>
          <div className="mt-10"><SectionTitle>Convidar colaborador</SectionTitle></div>
          <Card className="mt-3 p-5">
            <form className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <Label htmlFor="email">E-mail do colaborador</Label>
                <input id="email" name="email" type="email" required placeholder="colega@escritorio.com.br" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="role">Papel</Label>
                <select id="role" name="role" className={fieldClass}>
                  <option value="colaborador">Colaborador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="self-end">
                <SubmitButton action={convidarMembro}>Gerar convite</SubmitButton>
              </div>
            </form>
            <p className="mt-3 text-xs text-ink-soft">
              O convite vira um link (válido por 14 dias) — copie e envie por WhatsApp ou e-mail. A pessoa cria a conta, abre o link e entra direto no seu escritório.
            </p>
          </Card>

          <div className="mt-6">
            {!convites || convites.length === 0 ? (
              <EmptyState>Nenhum convite pendente.</EmptyState>
            ) : (
              <ListCard>
                {convites.map((c) => {
                  const link = `${proto}://${host}/convite/${c.token}`
                  const expirado = new Date(c.expires_at) < new Date()
                  return (
                    <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                      <span className="flex-1 font-medium text-ink">{c.email}</span>
                      <Pill>{LABEL_PAPEL[c.role]}</Pill>
                      {expirado ? (
                        <span className="text-xs font-medium text-red-700">expirado</span>
                      ) : (
                        <CopyButton text={link} />
                      )}
                      <DeleteButton action={removerConvite} id={c.id} label={`o convite para ${c.email}`} />
                    </div>
                  )
                })}
              </ListCard>
            )}
          </div>
        </>
      ) : (
        <p className="mt-8 text-sm text-ink-soft">Apenas o dono ou administradores convidam e removem membros.</p>
      )}
    </div>
  )
}
