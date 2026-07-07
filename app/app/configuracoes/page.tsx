import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateOrganization, updateAssinaturaProvedor } from '../actions'
import { PageHeader, Card, Label, SubmitButton, fieldClass } from '@/components/ui'

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  const supabase = createClient()
  const { data: orgId } = await supabase.rpc('current_org')
  if (!orgId) redirect('/onboarding')

  const { data: org } = await supabase
    .from('organizations')
    .select('id, nome, cnpj, crc, email_contato, telefone, logo_url, cor_primaria, assinatura_provedor, assinatura_token')
    .eq('id', orgId)
    .single()
  if (!org) redirect('/onboarding')

  const { data: souAdmin } = await supabase.rpc('is_org_admin')

  return (
    <div>
      <PageHeader
        eyebrow="Escritório"
        title="Configurações"
        description="Os dados da sua contabilidade e a marca aplicada aos entregáveis white-label (relatório anual e extrato mensal)."
      />

      <div className="mb-6 flex gap-2 text-sm">
        <span className="rounded-lg bg-navy px-3 py-1.5 font-medium text-white">Dados e marca</span>
        <a href="/app/configuracoes/equipe" className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink-muted transition hover:bg-surface">Equipe</a>
      </div>

      {!souAdmin && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Apenas o dono ou administradores do escritório podem alterar as configurações.
        </p>
      )}

      <Card className="p-5">
        <form className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={org.id} />
          <div className="sm:col-span-2">
            <Label htmlFor="nome">Nome do escritório *</Label>
            <input id="nome" name="nome" required defaultValue={org.nome} className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ</Label>
            <input id="cnpj" name="cnpj" defaultValue={org.cnpj ?? ''} className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="crc">CRC</Label>
            <input id="crc" name="crc" defaultValue={org.crc ?? ''} className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="email_contato">E-mail de contato</Label>
            <input id="email_contato" name="email_contato" type="email" defaultValue={org.email_contato ?? ''} className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <input id="telefone" name="telefone" defaultValue={org.telefone ?? ''} className={fieldClass} />
          </div>

          <div className="sm:col-span-2 mt-2 border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Marca (white-label)</p>
            <p className="mt-1 text-xs text-ink-soft">
              Aplicada no cabeçalho e rodapé do relatório anual e do extrato mensal que a família recebe.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="logo_url">URL do logotipo (PNG/SVG hospedado)</Label>
            <input id="logo_url" name="logo_url" placeholder="https://seusite.com.br/logo.png" defaultValue={org.logo_url ?? ''} className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="cor_primaria">Cor primária (hex)</Label>
            <div className="mt-1 flex items-center gap-2">
              <input id="cor_primaria" name="cor_primaria" placeholder="#12284B" defaultValue={org.cor_primaria ?? ''} className={fieldClass + ' mt-0'} />
              {org.cor_primaria && (
                <span className="h-8 w-8 shrink-0 rounded-lg border border-line" style={{ backgroundColor: org.cor_primaria }} />
              )}
            </div>
          </div>

          {searchParams?.error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{searchParams.error}</p>}
          {searchParams?.message && <p className="text-sm font-medium text-emerald-600 sm:col-span-2">{searchParams.message}</p>}

          {souAdmin && (
            <div className="sm:col-span-2">
              <SubmitButton action={updateOrganization}>Salvar configurações</SubmitButton>
            </div>
          )}
        </form>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-bold text-navy">Assinatura das minutas</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Por padrão você gera a minuta, assina na ferramenta que já usa e arquiva no cofre. Se quiser
          enviar com um clique, conecte a sua conta ZapSign — o custo da assinatura fica na sua conta.
        </p>
        <form className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={org.id} />
          <div>
            <Label htmlFor="assinatura_provedor">Envio automático</Label>
            <select
              id="assinatura_provedor"
              name="assinatura_provedor"
              defaultValue={org.assinatura_provedor ?? 'nenhum'}
              disabled={!souAdmin}
              className={fieldClass}
            >
              <option value="nenhum">Manual (gero e assino onde eu quiser)</option>
              <option value="zapsign">ZapSign (envio direto pela minha conta)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="assinatura_token">Token da API ZapSign</Label>
            <input
              id="assinatura_token"
              name="assinatura_token"
              type="password"
              autoComplete="off"
              placeholder={org.assinatura_token ? '•••••••• (salvo — deixe em branco para manter)' : 'cole o token da sua conta'}
              disabled={!souAdmin}
              className={fieldClass}
            />
            <p className="mt-1 text-[11px] text-ink-soft">
              Em Configurações da conta no ZapSign → API. Para remover, digite <strong>REMOVER</strong>.
            </p>
          </div>
          {souAdmin && (
            <div className="sm:col-span-2">
              <SubmitButton action={updateAssinaturaProvedor}>Salvar assinatura</SubmitButton>
            </div>
          )}
        </form>
      </Card>
    </div>
  )
}
