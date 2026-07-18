'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { enviarEmail } from '@/lib/brevo'
import type {
  TipoSocietario,
  PapelFamiliar,
  EstadoCivil,
  RegimeBens,
  TipoDireito,
  ClasseQuota,
  TipoBem,
  TipoClausula,
  StatusHolding,
  TipoEvento,
  StatusEvento,
  TipoDistribuicao,
  StatusDoacao,
  TipoDocumento,
  StatusRadar,
} from '@/lib/database.types'

export async function signout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function orNull(v: string): string | null {
  return v === '' ? null : v
}

// -------------------------- Famílias --------------------------
export async function createFamily(formData: FormData) {
  const name = s(formData, 'name')
  if (!name) {
    redirect('/app?error=' + encodeURIComponent('Informe o nome da família.'))
  }

  const supabase = createClient()
  const { error } = await supabase.from('families').insert({ name })
  if (error) redirect('/app?error=' + encodeURIComponent(error.message))

  revalidatePath('/app')
  redirect('/app')
}

// Assistente de nova família: cria família → sócios → holding → quotas de uma vez.
// Recebe um JSON em formData['payload']. Usa a sessão do usuário (RLS preenche
// accountant_id/organization_id). Insere sócios um a um para mapear índice → id.
type PayloadGuiado = {
  familia: { name: string; notes?: string }
  socios: { nome: string; cpf?: string; papel_familiar?: string }[]
  holding: { razao_social: string; nome_fantasia?: string; tipo_societario?: string; cnpj?: string } | null
  quotas: { socioIndex: number; percentual?: string; tipo_direito?: string }[]
}

export async function criarFamiliaGuiada(formData: FormData) {
  let payload: PayloadGuiado
  try {
    payload = JSON.parse(s(formData, 'payload')) as PayloadGuiado
  } catch {
    redirect('/app?error=' + encodeURIComponent('Dados do assistente inválidos.'))
  }

  const nome = payload!.familia?.name?.trim()
  if (!nome) redirect('/app?error=' + encodeURIComponent('Informe o nome da família.'))

  const supabase = createClient()

  // 1) família
  const { data: fam, error: eFam } = await supabase
    .from('families')
    .insert({ name: nome, notes: payload!.familia.notes?.trim() || null })
    .select('id')
    .single()
  if (eFam || !fam) redirect('/app?error=' + encodeURIComponent(eFam?.message ?? 'Falha ao criar a família.'))
  const familyId = fam.id

  // 2) sócios (um a um → mapear índice para id)
  const socioIds: (string | null)[] = []
  for (const so of payload!.socios ?? []) {
    if (!so.nome?.trim()) { socioIds.push(null); continue }
    const { data, error } = await supabase
      .from('socios')
      .insert({
        family_id: familyId,
        nome: so.nome.trim(),
        cpf: so.cpf?.trim() || null,
        papel_familiar: (so.papel_familiar || null) as PapelFamiliar | null,
      })
      .select('id')
      .single()
    socioIds.push(error ? null : data!.id)
  }

  // 3) holding (opcional)
  let holdingId: string | null = null
  if (payload!.holding && payload!.holding.razao_social?.trim()) {
    const h = payload!.holding
    const { data, error } = await supabase
      .from('holdings')
      .insert({
        family_id: familyId,
        razao_social: h.razao_social.trim(),
        nome_fantasia: h.nome_fantasia?.trim() || null,
        tipo_societario: (h.tipo_societario || 'ltda') as TipoSocietario,
        cnpj: h.cnpj?.trim() || null,
      })
      .select('id')
      .single()
    if (!error && data) holdingId = data.id
  }

  // 4) quotas (só se houver holding + sócios mapeados)
  if (holdingId && (payload!.quotas ?? []).length > 0) {
    const linhas = (payload!.quotas ?? [])
      .map((q) => {
        const sid = socioIds[q.socioIndex]
        if (!sid) return null
        const pct = q.percentual && q.percentual !== '' ? Number(q.percentual) : null
        return {
          holding_id: holdingId!,
          socio_id: sid,
          quantidade: pct ?? 0,
          percentual: pct,
          tipo_direito: (q.tipo_direito || 'plena') as TipoDireito,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    if (linhas.length > 0) await supabase.from('quotas').insert(linhas)
  }

  revalidatePath('/app')
  redirect(`/app/familias/${familyId}`)
}

// -------------------------- Holdings --------------------------
export async function createHolding(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const razaoSocial = s(formData, 'razao_social')
  const tipoSocietario = s(formData, 'tipo_societario') as TipoSocietario
  const cnpj = orNull(s(formData, 'cnpj'))

  if (!familyId) redirect('/app')
  if (!razaoSocial) {
    redirect(
      `/app/familias/${familyId}?error=` +
        encodeURIComponent('Informe a razão social.'),
    )
  }

  const supabase = createClient()
  const { error } = await supabase.from('holdings').insert({
    family_id: familyId,
    razao_social: razaoSocial,
    tipo_societario: tipoSocietario,
    cnpj,
  })
  if (error) {
    redirect(`/app/familias/${familyId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}`)
}

// -------------------------- Sócios --------------------------
export async function createSocio(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const nome = s(formData, 'nome')
  if (!familyId) redirect('/app')
  if (!nome) {
    redirect(
      `/app/familias/${familyId}?error=` +
        encodeURIComponent('Informe o nome do sócio.'),
    )
  }

  const papel = orNull(s(formData, 'papel_familiar')) as PapelFamiliar | null
  const estadoCivil = orNull(s(formData, 'estado_civil')) as EstadoCivil | null
  const regime = orNull(s(formData, 'regime_bens')) as RegimeBens | null
  const cpf = orNull(s(formData, 'cpf'))

  const supabase = createClient()
  const { error } = await supabase.from('socios').insert({
    family_id: familyId,
    nome,
    cpf,
    papel_familiar: papel,
    estado_civil: estadoCivil,
    regime_bens: regime,
  })
  if (error) {
    redirect(`/app/familias/${familyId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}`)
}

// -------------------------- Quotas --------------------------
export async function createQuota(formData: FormData) {
  const holdingId = s(formData, 'holding_id')
  const socioId = s(formData, 'socio_id')
  if (!holdingId) redirect('/app')
  if (!socioId) {
    redirect(
      `/app/holdings/${holdingId}?error=` +
        encodeURIComponent('Selecione o sócio.'),
    )
  }

  const quantidadeRaw = s(formData, 'quantidade')
  const percentualRaw = s(formData, 'percentual')
  const tipoDireito = (s(formData, 'tipo_direito') || 'plena') as TipoDireito
  const classe = orNull(s(formData, 'classe')) as ClasseQuota | null

  const supabase = createClient()
  const { error } = await supabase.from('quotas').insert({
    holding_id: holdingId,
    socio_id: socioId,
    quantidade: quantidadeRaw === '' ? 0 : Number(quantidadeRaw),
    percentual: percentualRaw === '' ? null : Number(percentualRaw),
    tipo_direito: tipoDireito,
    classe,
  })
  if (error) {
    redirect(`/app/holdings/${holdingId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/app/holdings/${holdingId}`)
  redirect(`/app/holdings/${holdingId}`)
}

// -------------------------- Bens --------------------------
export async function createBem(formData: FormData) {
  const holdingId = s(formData, 'holding_id')
  const descricao = s(formData, 'descricao')
  if (!holdingId) redirect('/app')
  if (!descricao) {
    redirect(
      `/app/holdings/${holdingId}?error=` +
        encodeURIComponent('Informe a descrição do bem.'),
    )
  }

  const valorContabilRaw = s(formData, 'valor_contabil')
  const valorMercadoRaw = s(formData, 'valor_mercado')

  const supabase = createClient()
  const { error } = await supabase.from('bens').insert({
    holding_id: holdingId,
    tipo: (s(formData, 'tipo') || 'imovel') as TipoBem,
    descricao,
    valor_contabil: valorContabilRaw === '' ? null : Number(valorContabilRaw),
    valor_mercado: valorMercadoRaw === '' ? null : Number(valorMercadoRaw),
    matricula: orNull(s(formData, 'matricula')),
    municipio_uf: orNull(s(formData, 'municipio_uf')),
    data_aquisicao: orNull(s(formData, 'data_aquisicao')),
    gera_receita: formData.get('gera_receita') === 'on',
  })
  if (error) {
    redirect(`/app/holdings/${holdingId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/app/holdings/${holdingId}`)
  redirect(`/app/holdings/${holdingId}`)
}

// -------------------------- Cláusulas --------------------------
export async function createClausula(formData: FormData) {
  const holdingId = s(formData, 'holding_id')
  if (!holdingId) redirect('/app')

  const tipo = s(formData, 'tipo') as TipoClausula
  if (!tipo) {
    redirect(
      `/app/holdings/${holdingId}?error=` +
        encodeURIComponent('Selecione o tipo da cláusula.'),
    )
  }

  // Escopo codificado: "holding" | "quota:<id>" | "bem:<id>"
  const escopo = s(formData, 'escopo')
  let holding_id: string | null = null
  let quota_id: string | null = null
  let bem_id: string | null = null
  if (escopo === 'holding') holding_id = holdingId
  else if (escopo.startsWith('quota:')) quota_id = escopo.slice('quota:'.length)
  else if (escopo.startsWith('bem:')) bem_id = escopo.slice('bem:'.length)
  else {
    redirect(
      `/app/holdings/${holdingId}?error=` +
        encodeURIComponent('Selecione onde a cláusula se aplica.'),
    )
  }

  const supabase = createClient()
  const { error } = await supabase.from('clausulas').insert({
    tipo,
    holding_id,
    quota_id,
    bem_id,
    descricao: orNull(s(formData, 'descricao')),
    registrada_em: orNull(s(formData, 'registrada_em')),
    responsavel: orNull(s(formData, 'responsavel')),
  })
  if (error) {
    redirect(`/app/holdings/${holdingId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/app/holdings/${holdingId}`)
  redirect(`/app/holdings/${holdingId}`)
}

// -------------------------- Exclusões --------------------------
export async function deleteFamily(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app')
  const supabase = createClient()
  await supabase.from('families').delete().eq('id', id)
  revalidatePath('/app')
  redirect('/app')
}

export async function deleteHolding(formData: FormData) {
  const id = s(formData, 'id')
  const familyId = s(formData, 'family_id')
  const dest = familyId ? `/app/familias/${familyId}` : '/app'
  const supabase = createClient()
  await supabase.from('holdings').delete().eq('id', id)
  revalidatePath(dest)
  redirect(dest)
}

export async function deleteSocio(formData: FormData) {
  const id = s(formData, 'id')
  const familyId = s(formData, 'family_id')
  const dest = familyId ? `/app/familias/${familyId}` : '/app'
  const supabase = createClient()
  const { error } = await supabase.from('socios').delete().eq('id', id)
  if (error) {
    redirect(
      `${dest}?error=` +
        encodeURIComponent(
          'Não foi possível excluir: o sócio tem quotas vinculadas. Remova as quotas primeiro.',
        ),
    )
  }
  revalidatePath(dest)
  redirect(dest)
}

export async function deleteQuota(formData: FormData) {
  const id = s(formData, 'id')
  const holdingId = s(formData, 'holding_id')
  const dest = holdingId ? `/app/holdings/${holdingId}` : '/app'
  const supabase = createClient()
  await supabase.from('quotas').delete().eq('id', id)
  revalidatePath(dest)
  redirect(dest)
}

export async function deleteBem(formData: FormData) {
  const id = s(formData, 'id')
  const holdingId = s(formData, 'holding_id')
  const dest = holdingId ? `/app/holdings/${holdingId}` : '/app'
  const supabase = createClient()
  await supabase.from('bens').delete().eq('id', id)
  revalidatePath(dest)
  redirect(dest)
}

export async function deleteClausula(formData: FormData) {
  const id = s(formData, 'id')
  const holdingId = s(formData, 'holding_id')
  const dest = holdingId ? `/app/holdings/${holdingId}` : '/app'
  const supabase = createClient()
  await supabase.from('clausulas').delete().eq('id', id)
  revalidatePath(dest)
  redirect(dest)
}

// -------------------------- Edições --------------------------
export async function updateFamily(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app')
  const name = s(formData, 'name')
  if (!name) {
    redirect(`/app/familias/${id}?error=` + encodeURIComponent('Informe o nome da família.'))
  }
  const supabase = createClient()
  const { error } = await supabase
    .from('families')
    .update({ name, notes: orNull(s(formData, 'notes')) })
    .eq('id', id)
  if (error) redirect(`/app/familias/${id}?error=` + encodeURIComponent(error.message))
  revalidatePath(`/app/familias/${id}`)
  redirect(`/app/familias/${id}`)
}

export async function updateHolding(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app')
  const razaoSocial = s(formData, 'razao_social')
  if (!razaoSocial) {
    redirect(`/app/holdings/${id}?error=` + encodeURIComponent('Informe a razão social.'))
  }
  const capitalRaw = s(formData, 'capital_social')
  const supabase = createClient()
  const { error } = await supabase
    .from('holdings')
    .update({
      razao_social: razaoSocial,
      nome_fantasia: orNull(s(formData, 'nome_fantasia')),
      cnpj: orNull(s(formData, 'cnpj')),
      tipo_societario: s(formData, 'tipo_societario') as TipoSocietario,
      status: s(formData, 'status') as StatusHolding,
      data_constituicao: orNull(s(formData, 'data_constituicao')),
      capital_social: capitalRaw === '' ? null : Number(capitalRaw),
    })
    .eq('id', id)
  if (error) redirect(`/app/holdings/${id}?error=` + encodeURIComponent(error.message))
  revalidatePath(`/app/holdings/${id}`)
  redirect(`/app/holdings/${id}`)
}

// -------------------------- Calendário (eventos) --------------------------
export async function createEvento(formData: FormData) {
  const titulo = s(formData, 'titulo')
  const data = s(formData, 'data_prevista')
  if (!titulo || !data) {
    redirect('/app/calendario?error=' + encodeURIComponent('Informe título e data.'))
  }
  const supabase = createClient()
  const { error } = await supabase.from('eventos').insert({
    titulo,
    data_prevista: data,
    tipo: (s(formData, 'tipo') || 'outro') as TipoEvento,
    holding_id: orNull(s(formData, 'holding_id')),
    notes: orNull(s(formData, 'notes')),
  })
  if (error) redirect('/app/calendario?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/calendario')
  redirect('/app/calendario')
}

export async function toggleEvento(formData: FormData) {
  const id = s(formData, 'id')
  const to = s(formData, 'to') === 'concluido' ? 'concluido' : 'pendente'
  if (!id) redirect('/app/calendario')
  const supabase = createClient()
  await supabase
    .from('eventos')
    .update({
      status: to as StatusEvento,
      concluido_em: to === 'concluido' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)
  revalidatePath('/app/calendario')
  redirect('/app/calendario')
}

export async function deleteEvento(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/calendario')
  const supabase = createClient()
  await supabase.from('eventos').delete().eq('id', id)
  revalidatePath('/app/calendario')
  redirect('/app/calendario')
}

// Semeia os marcos datados da Reforma como eventos gerais (holding_id null).
export async function seedMarcosReforma() {
  const supabase = createClient()
  const { count } = await supabase
    .from('eventos')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'marco_reforma')
  if ((count ?? 0) > 0) redirect('/app/calendario') // já semeado

  const marcos = [
    { data_prevista: '2026-08-01', titulo: 'NFS-e passa a destacar CBS' },
    { data_prevista: '2026-12-31', titulo: 'Último ano do regime antigo — planejar doações pelo valor contábil' },
    { data_prevista: '2027-01-01', titulo: 'CBS efetiva · fim de PIS/COFINS' },
    { data_prevista: '2029-01-01', titulo: 'Início da transição do IBS (2029–2032)' },
    { data_prevista: '2033-01-01', titulo: 'IBS/CBS plenos · fim da transição' },
  ]
  await supabase.from('eventos').insert(
    marcos.map((m) => ({ ...m, tipo: 'marco_reforma' as TipoEvento })),
  )
  revalidatePath('/app/calendario')
  redirect('/app/calendario')
}

// -------------------------- Distribuições --------------------------
export async function createDistribuicao(formData: FormData) {
  const holdingId = s(formData, 'holding_id')
  const competencia = s(formData, 'competencia')
  if (!holdingId) {
    redirect('/app/distribuicoes?error=' + encodeURIComponent('Selecione a holding.'))
  }
  if (!competencia) {
    redirect('/app/distribuicoes?error=' + encodeURIComponent('Informe a competência.'))
  }
  const valorRaw = s(formData, 'valor_total')
  const supabase = createClient()
  const { error } = await supabase.from('distribuicoes').insert({
    holding_id: holdingId,
    competencia,
    valor_total: valorRaw === '' ? 0 : Number(valorRaw),
    tipo: (s(formData, 'tipo') || 'lucros') as TipoDistribuicao,
    proporcional: formData.get('proporcional') === 'on',
    deliberacao: orNull(s(formData, 'deliberacao')),
    data_deliberacao: orNull(s(formData, 'data_deliberacao')),
    notes: orNull(s(formData, 'notes')),
  })
  if (error) redirect('/app/distribuicoes?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/distribuicoes')
  redirect('/app/distribuicoes')
}

export async function deleteDistribuicao(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/distribuicoes')
  const supabase = createClient()
  await supabase.from('distribuicoes').delete().eq('id', id)
  revalidatePath('/app/distribuicoes')
  redirect('/app/distribuicoes')
}

// -------------------------- Doações (sucessão) --------------------------
export async function createDoacao(formData: FormData) {
  const holdingId = s(formData, 'holding_id')
  if (!holdingId) {
    redirect('/app/doacoes?error=' + encodeURIComponent('Selecione a holding.'))
  }
  const qtdRaw = s(formData, 'quantidade_quotas')
  const valorRaw = s(formData, 'valor_estimado')
  const itcmdRaw = s(formData, 'itcmd_estimado')

  const supabase = createClient()
  const { error } = await supabase.from('doacoes').insert({
    holding_id: holdingId,
    doador_id: orNull(s(formData, 'doador_id')),
    donatario_id: orNull(s(formData, 'donatario_id')),
    quantidade_quotas: qtdRaw === '' ? 0 : Number(qtdRaw),
    valor_estimado: valorRaw === '' ? null : Number(valorRaw),
    itcmd_estimado: itcmdRaw === '' ? null : Number(itcmdRaw),
    com_reserva_usufruto: formData.get('com_reserva_usufruto') === 'on',
    data_prevista: orNull(s(formData, 'data_prevista')),
    status: (s(formData, 'status') || 'planejada') as StatusDoacao,
    cartorio: orNull(s(formData, 'cartorio')),
    notes: orNull(s(formData, 'notes')),
  })
  if (error) redirect('/app/doacoes?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/doacoes')
  redirect('/app/doacoes')
}

export async function changeStatusDoacao(formData: FormData) {
  const id = s(formData, 'id')
  const to = s(formData, 'to') as StatusDoacao
  if (!id || !['planejada', 'em_cartorio', 'concluida'].includes(to)) {
    redirect('/app/doacoes')
  }
  const supabase = createClient()
  await supabase
    .from('doacoes')
    .update({
      status: to,
      data_conclusao: to === 'concluida' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)
  revalidatePath('/app/doacoes')
  redirect('/app/doacoes')
}

export async function deleteDoacao(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/doacoes')
  const supabase = createClient()
  await supabase.from('doacoes').delete().eq('id', id)
  revalidatePath('/app/doacoes')
  redirect('/app/doacoes')
}

// -------------------------- Cofre documental --------------------------
export async function registrarDocumento(dados: {
  nome: string
  tipo: string
  holding_id: string | null
  storage_path: string
  tamanho_bytes: number
  competencia: string | null
}): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('documentos').insert({
    nome: dados.nome,
    tipo: dados.tipo as TipoDocumento,
    holding_id: dados.holding_id,
    storage_path: dados.storage_path,
    tamanho_bytes: dados.tamanho_bytes,
    competencia: dados.competencia,
  })
  if (error) return { error: error.message }
  revalidatePath('/app/documentos')
  return { ok: true }
}

export async function deleteDocumento(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/documentos')
  const supabase = createClient()
  const { data: doc } = await supabase.from('documentos').select('storage_path').eq('id', id).single()
  if (doc?.storage_path) {
    await supabase.storage.from('documentos').remove([doc.storage_path])
  }
  await supabase.from('documentos').delete().eq('id', id)
  revalidatePath('/app/documentos')
  redirect('/app/documentos')
}

// -------------------------- O Mês da Holding (fechamento) --------------------------
export async function salvarFechamento(formData: FormData) {
  const holdingId = s(formData, 'holding_id')
  const competencia = s(formData, 'competencia') // YYYY-MM-01
  if (!holdingId || !competencia) redirect('/app/mes')

  const [ano, mes] = competencia.split('-')
  const supabase = createClient()
  const { error } = await supabase.from('fechamentos').upsert(
    {
      holding_id: holdingId,
      competencia,
      distribuicoes_ok: formData.get('distribuicoes_ok') === 'on',
      documentos_ok: formData.get('documentos_ok') === 'on',
      alertas_ok: formData.get('alertas_ok') === 'on',
      alugueis_ok: formData.get('alugueis_ok') === 'on',
      doacoes_ok: formData.get('doacoes_ok') === 'on',
      notes: orNull(s(formData, 'notes')),
    },
    { onConflict: 'holding_id,competencia' },
  )
  if (error) {
    redirect(`/app/mes?ano=${ano}&mes=${mes}&error=` + encodeURIComponent(error.message))
  }
  revalidatePath('/app/mes')
  redirect(`/app/mes?ano=${ano}&mes=${mes}`)
}

// Fecha o mês EM LOTE para todas as holdings ainda não iniciadas na competência,
// usando os sinais auto-detectados (não sobrescreve fechamentos já salvos).
export async function fecharMesEmLote(formData: FormData) {
  const competencia = s(formData, 'competencia')
  if (!competencia) redirect('/app/mes')
  const [ano, mes] = competencia.split('-')
  const prefixo = competencia.slice(0, 7)
  const supabase = createClient()

  const [{ data: holdings }, { data: fechs }, { data: distrib }, { data: docs }, { data: ev }, { data: doaPlan }] =
    await Promise.all([
      supabase.from('holdings').select('id'),
      supabase.from('fechamentos').select('holding_id').eq('competencia', competencia),
      supabase.from('distribuicoes').select('holding_id, competencia'),
      supabase.from('documentos').select('holding_id, competencia, created_at'),
      supabase.from('eventos').select('holding_id, data_prevista').eq('status', 'pendente'),
      supabase.from('doacoes').select('holding_id, data_prevista, adiada_em').eq('status', 'planejada'),
    ])

  const jaFechadas = new Set((fechs ?? []).map((f) => f.holding_id))
  const comDist = new Set((distrib ?? []).filter((d) => d.competencia?.slice(0, 7) === prefixo).map((d) => d.holding_id))
  const comDoc = new Set(
    (docs ?? []).filter((d) => (d.competencia?.slice(0, 7) ?? d.created_at.slice(0, 7)) === prefixo && d.holding_id).map((d) => d.holding_id),
  )
  const hoje = new Date().toISOString().slice(0, 10)
  const comVencido = new Set((ev ?? []).filter((e) => e.data_prevista < hoje && e.holding_id).map((e) => e.holding_id))
  const atrasadasDe = (hid: string) => (doaPlan ?? []).some((d) => d.holding_id === hid && d.data_prevista && d.data_prevista < hoje && !d.adiada_em)

  const novas = (holdings ?? [])
    .filter((h) => !jaFechadas.has(h.id))
    .map((h) => ({
      holding_id: h.id,
      competencia,
      distribuicoes_ok: comDist.has(h.id),
      documentos_ok: comDoc.has(h.id),
      alertas_ok: !comVencido.has(h.id),
      alugueis_ok: false,
      doacoes_ok: !atrasadasDe(h.id),
    }))

  if (novas.length > 0) {
    const { error } = await supabase.from('fechamentos').upsert(novas, { onConflict: 'holding_id,competencia' })
    if (error) redirect(`/app/mes?ano=${ano}&mes=${mes}&error=` + encodeURIComponent(error.message))
  }
  revalidatePath('/app/mes')
  redirect(`/app/mes?ano=${ano}&mes=${mes}`)
}

// -------------------------- Portal da família (acesso do cliente) --------------------------
export async function convidarFamilia(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const email = s(formData, 'email').trim().toLowerCase()
  if (!familyId) redirect('/app')
  if (!email || !email.includes('@')) {
    redirect(`/app/familias/${familyId}?error=` + encodeURIComponent('Informe um e-mail válido para o convite.'))
  }
  const supabase = createClient()
  const { data: novo, error } = await supabase.from('family_access').insert({ family_id: familyId, email }).select('convite_token').single()
  if (error) {
    const msg = error.message.includes('duplicate') ? 'Já existe um convite para esse e-mail nesta família.' : error.message
    redirect(`/app/familias/${familyId}?error=` + encodeURIComponent(msg))
  }
  const h = headers()
  const link = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}/portal/convite/${novo!.convite_token}`
  const env = await enviarEmail({
    para: email,
    assunto: 'Você foi convidado a acompanhar sua família no Quotaria',
    corpoTexto: 'Olá!\n\nSeu escritório de contabilidade preparou um portal para você acompanhar, em modo leitura, a estrutura da sua família — o que foi feito, a sucessão em andamento e os documentos guardados.\n\nToque no botão abaixo para criar seu acesso.',
    botao: { texto: 'Acessar o portal', url: link },
  })
  revalidatePath(`/app/familias/${familyId}`)
  const msg = env.ok ? 'Convite enviado por e-mail. O link também está na lista para copiar.' : 'Convite criado. Copie o link e envie para a família.'
  redirect(`/app/familias/${familyId}?message=` + encodeURIComponent(msg))
}

export async function revogarAcessoFamilia(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const id = s(formData, 'id')
  const supabase = createClient()
  await supabase.from('family_access').delete().eq('id', id)
  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}?message=` + encodeURIComponent('Acesso revogado.'))
}

// -------------------------- Acesso do advogado (parceiro) --------------------------
export async function convidarAdvogado(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const email = s(formData, 'email').trim().toLowerCase()
  const nivel = s(formData, 'nivel') === 'contribuicao' ? 'contribuicao' : 'leitura'
  if (!familyId) redirect('/app')
  if (!email || !email.includes('@')) {
    redirect(`/app/familias/${familyId}?error=` + encodeURIComponent('Informe um e-mail válido para o convite.'))
  }
  const supabase = createClient()
  const { data: novo, error } = await supabase.from('advogado_access').insert({ family_id: familyId, email, nivel }).select('convite_token').single()
  if (error) {
    const msg = error.message.includes('duplicate') ? 'Já existe um convite de advogado para esse e-mail nesta família.' : error.message
    redirect(`/app/familias/${familyId}?error=` + encodeURIComponent(msg))
  }
  const h = headers()
  const link = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}/parceiro/convite/${novo!.convite_token}`
  const env = await enviarEmail({
    para: email,
    assunto: 'Convite de acesso a uma família no Quotaria',
    corpoTexto: `Olá!\n\nVocê foi convidado como parceiro para acompanhar uma família específica no Quotaria, no nível "${nivel === 'contribuicao' ? 'contribuição' : 'leitura'}".\n\nToque no botão abaixo para criar seu acesso.`,
    botao: { texto: 'Acessar', url: link },
  })
  revalidatePath(`/app/familias/${familyId}`)
  const msg = env.ok ? 'Convite enviado por e-mail. O link também está na lista para copiar.' : 'Convite do parceiro criado. Copie o link e envie.'
  redirect(`/app/familias/${familyId}?message=` + encodeURIComponent(msg))
}

export async function revogarAcessoAdvogado(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const id = s(formData, 'id')
  const supabase = createClient()
  await supabase.from('advogado_access').delete().eq('id', id)
  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}?message=` + encodeURIComponent('Acesso do advogado revogado.'))
}

// -------------------------- Edições (entidades-filhas) --------------------------
export async function updateSocio(formData: FormData) {
  const id = s(formData, 'id')
  const familyId = s(formData, 'family_id')
  const dest = familyId ? `/app/familias/${familyId}` : '/app'
  if (!id) redirect(dest)
  const nome = s(formData, 'nome')
  if (!nome) redirect(`${dest}?error=` + encodeURIComponent('Informe o nome do sócio.'))
  const supabase = createClient()
  const { error } = await supabase.from('socios').update({
    nome,
    cpf: orNull(s(formData, 'cpf')),
    papel_familiar: orNull(s(formData, 'papel_familiar')) as PapelFamiliar | null,
    estado_civil: orNull(s(formData, 'estado_civil')) as EstadoCivil | null,
    regime_bens: orNull(s(formData, 'regime_bens')) as RegimeBens | null,
    email: orNull(s(formData, 'email')),
    telefone: orNull(s(formData, 'telefone')),
  }).eq('id', id)
  if (error) redirect(`${dest}?error=` + encodeURIComponent(error.message))
  revalidatePath(dest)
  redirect(dest)
}

export async function updateQuota(formData: FormData) {
  const id = s(formData, 'id')
  const holdingId = s(formData, 'holding_id')
  const dest = holdingId ? `/app/holdings/${holdingId}` : '/app'
  if (!id) redirect(dest)
  const qtdRaw = s(formData, 'quantidade')
  const pctRaw = s(formData, 'percentual')
  const supabase = createClient()
  const { error } = await supabase.from('quotas').update({
    socio_id: s(formData, 'socio_id'),
    quantidade: qtdRaw === '' ? 0 : Number(qtdRaw),
    percentual: pctRaw === '' ? null : Number(pctRaw),
    tipo_direito: (s(formData, 'tipo_direito') || 'plena') as TipoDireito,
  }).eq('id', id)
  if (error) redirect(`${dest}?error=` + encodeURIComponent(error.message))
  revalidatePath(dest)
  redirect(dest)
}

export async function updateBem(formData: FormData) {
  const id = s(formData, 'id')
  const holdingId = s(formData, 'holding_id')
  const dest = holdingId ? `/app/holdings/${holdingId}` : '/app'
  if (!id) redirect(dest)
  const descricao = s(formData, 'descricao')
  if (!descricao) redirect(`${dest}?error=` + encodeURIComponent('Informe a descrição.'))
  const vcRaw = s(formData, 'valor_contabil')
  const vmRaw = s(formData, 'valor_mercado')
  const supabase = createClient()
  const { error } = await supabase.from('bens').update({
    tipo: (s(formData, 'tipo') || 'imovel') as TipoBem,
    descricao,
    valor_contabil: vcRaw === '' ? null : Number(vcRaw),
    valor_mercado: vmRaw === '' ? null : Number(vmRaw),
    matricula: orNull(s(formData, 'matricula')),
    municipio_uf: orNull(s(formData, 'municipio_uf')),
    data_aquisicao: orNull(s(formData, 'data_aquisicao')),
    gera_receita: formData.get('gera_receita') === 'on',
  }).eq('id', id)
  if (error) redirect(`${dest}?error=` + encodeURIComponent(error.message))
  revalidatePath(dest)
  redirect(dest)
}

export async function updateClausula(formData: FormData) {
  const id = s(formData, 'id')
  const holdingId = s(formData, 'holding_id')
  const dest = holdingId ? `/app/holdings/${holdingId}` : '/app'
  if (!id) redirect(dest)
  const tipo = s(formData, 'tipo') as TipoClausula
  if (!tipo) redirect(`${dest}?error=` + encodeURIComponent('Selecione o tipo.'))
  const supabase = createClient()
  const { error } = await supabase.from('clausulas').update({
    tipo,
    descricao: orNull(s(formData, 'descricao')),
    registrada_em: orNull(s(formData, 'registrada_em')),
    responsavel: orNull(s(formData, 'responsavel')),
  }).eq('id', id)
  if (error) redirect(`${dest}?error=` + encodeURIComponent(error.message))
  revalidatePath(dest)
  redirect(dest)
}

// -------------------------- Conformidade da Reforma (locadora) --------------------------
export async function salvarConformidade(formData: FormData) {
  const holdingId = s(formData, 'holding_id')
  if (!holdingId) redirect('/app')
  const dest = `/app/holdings/${holdingId}`
  const supabase = createClient()
  const { error } = await supabase.from('conformidade_reforma').upsert(
    {
      holding_id: holdingId,
      nfse_cbs: formData.get('nfse_cbs') === 'on',
      clausula_repasse: formData.get('clausula_repasse') === 'on',
      credito_locatario: formData.get('credito_locatario') === 'on',
      redutor_social: formData.get('redutor_social') === 'on',
      regime_caixa: formData.get('regime_caixa') === 'on',
      notes: orNull(s(formData, 'notes')),
    },
    { onConflict: 'holding_id' },
  )
  if (error) redirect(`${dest}?error=` + encodeURIComponent(error.message))
  revalidatePath(dest)
  redirect(dest)
}

// -------------------------- Escritório (configurações) --------------------------
export async function updateOrganization(formData: FormData) {
  const id = s(formData, 'id')
  const nome = s(formData, 'nome')
  if (!id) redirect('/app/configuracoes')
  if (!nome) redirect('/app/configuracoes?error=' + encodeURIComponent('Informe o nome do escritório.'))
  const supabase = createClient()
  const { error } = await supabase.from('organizations').update({
    nome,
    perfil: s(formData, 'perfil') === 'juridico' ? 'juridico' : 'contabil',
    cnpj: orNull(s(formData, 'cnpj')),
    crc: orNull(s(formData, 'crc')),
    email_contato: orNull(s(formData, 'email_contato')),
    telefone: orNull(s(formData, 'telefone')),
    logo_url: orNull(s(formData, 'logo_url')),
    cor_primaria: orNull(s(formData, 'cor_primaria')),
  }).eq('id', id)
  if (error) redirect('/app/configuracoes?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/configuracoes')
  redirect('/app/configuracoes?message=' + encodeURIComponent('Configurações salvas.'))
}

// -------------------------- Assinatura de minutas (Modelo B — ZapSign BYOK) --------------------------
export async function updateAssinaturaProvedor(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/configuracoes')
  const provedor = s(formData, 'assinatura_provedor') === 'zapsign' ? 'zapsign' : 'nenhum'
  const tokenNovo = s(formData, 'assinatura_token')

  const supabase = createClient()
  const payload: { assinatura_provedor: string; assinatura_token?: string | null } = {
    assinatura_provedor: provedor,
  }
  // token: só atualiza quando o campo é enviado com valor; 'REMOVER' limpa
  if (tokenNovo === 'REMOVER') payload.assinatura_token = null
  else if (tokenNovo) payload.assinatura_token = tokenNovo
  if (provedor === 'nenhum') payload.assinatura_token = null

  const { error } = await supabase.from('organizations').update(payload).eq('id', id)
  if (error) redirect('/app/configuracoes?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/configuracoes')
  redirect('/app/configuracoes?message=' + encodeURIComponent('Assinatura atualizada.'))
}

// -------------------------- Equipe (membros e convites) --------------------------
export async function convidarMembro(formData: FormData) {
  const email = s(formData, 'email').toLowerCase()
  const role = s(formData, 'role') === 'admin' ? 'admin' : 'colaborador'
  if (!email) redirect('/app/configuracoes/equipe?error=' + encodeURIComponent('Informe o e-mail.'))
  const supabase = createClient()
  const { data: orgId } = await supabase.rpc('current_org')
  if (!orgId) redirect('/onboarding')
  const { error } = await supabase.from('organization_invites').insert({
    organization_id: orgId,
    email,
    role,
  })
  if (error) redirect('/app/configuracoes/equipe?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/configuracoes/equipe')
  redirect('/app/configuracoes/equipe')
}

export async function removerConvite(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/configuracoes/equipe')
  const supabase = createClient()
  await supabase.from('organization_invites').delete().eq('id', id)
  revalidatePath('/app/configuracoes/equipe')
  redirect('/app/configuracoes/equipe')
}

export async function removerMembro(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/configuracoes/equipe')
  const supabase = createClient()
  const { error } = await supabase.from('organization_members').delete().eq('id', id)
  if (error) redirect('/app/configuracoes/equipe?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/configuracoes/equipe')
  redirect('/app/configuracoes/equipe')
}

// -------------------------- Contatos da família --------------------------
export async function createContato(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const nome = s(formData, 'nome')
  const dest = familyId ? `/app/familias/${familyId}` : '/app'
  if (!familyId) redirect('/app')
  if (!nome) redirect(`${dest}?error=` + encodeURIComponent('Informe o nome do contato.'))
  const supabase = createClient()
  const { error } = await supabase.from('family_contacts').insert({
    family_id: familyId,
    nome,
    email: orNull(s(formData, 'email')),
    parentesco: orNull(s(formData, 'parentesco')),
  })
  if (error) redirect(`${dest}?error=` + encodeURIComponent(error.message))
  revalidatePath(dest)
  redirect(dest)
}

export async function deleteContato(formData: FormData) {
  const id = s(formData, 'id')
  const familyId = s(formData, 'family_id')
  const dest = familyId ? `/app/familias/${familyId}` : '/app'
  if (!id) redirect(dest)
  const supabase = createClient()
  await supabase.from('family_contacts').delete().eq('id', id)
  revalidatePath(dest)
  redirect(dest)
}

// -------------------------- Radar de Oportunidades --------------------------
export async function createRadarCliente(formData: FormData) {
  const nome = s(formData, 'nome')
  if (!nome) redirect('/app/radar?error=' + encodeURIComponent('Informe o nome do cliente.'))
  const num = (k: string) => {
    const v = s(formData, k)
    return v === '' ? 0 : Number(v)
  }
  const supabase = createClient()
  const { data, error } = await supabase.from('radar_clientes').insert({
    nome,
    uf: s(formData, 'uf') || 'SP',
    n_imoveis: Math.round(num('n_imoveis')),
    patrimonio: num('patrimonio'),
    renda_aluguel_anual: num('renda_aluguel_anual'),
    socio_pj: formData.get('socio_pj') === 'on',
    recebe_dividendos: formData.get('recebe_dividendos') === 'on',
    n_herdeiros: Math.round(num('n_herdeiros')),
  }).select('id').single()
  if (error) redirect('/app/radar?error=' + encodeURIComponent(error.message))
  revalidatePath('/app/radar')
  redirect(`/app/radar/${data.id}`)
}

export async function updateRadarSinais(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/radar')
  const num = (k: string) => {
    const v = s(formData, k)
    return v === '' ? 0 : Number(v)
  }
  const lgpd = formData.get('lgpd') === 'on'
  const supabase = createClient()
  const payload: {
    n_imoveis: number
    patrimonio: number
    renda_aluguel_anual: number
    socio_pj: boolean
    recebe_dividendos: boolean
    n_herdeiros: number
    uf?: string
    itcmd_pct?: number
    inventario_pct?: number
    notes?: string
    lgpd_confirmado_em?: string
    holding_existe?: boolean
    holding_ano?: number | null
    ata_em_dia?: boolean
    doacao_iniciada?: boolean
  } = {
    n_imoveis: Math.round(num('n_imoveis')),
    patrimonio: num('patrimonio'),
    renda_aluguel_anual: num('renda_aluguel_anual'),
    socio_pj: formData.get('socio_pj') === 'on',
    recebe_dividendos: formData.get('recebe_dividendos') === 'on',
    n_herdeiros: Math.round(num('n_herdeiros')),
  }
  // campos do diagnóstico: só quando o formulário os envia (o import da DIRPF não envia)
  if (formData.has('holding_existe') || formData.has('diag_marker')) {
    payload.holding_existe = formData.get('holding_existe') === 'on'
    payload.ata_em_dia = formData.get('ata_em_dia') === 'on'
    payload.doacao_iniciada = formData.get('doacao_iniciada') === 'on'
    const ano = s(formData, 'holding_ano')
    payload.holding_ano = ano ? Math.round(Number(ano)) : null
  }
  // uf/premissas: só quando o formulário as envia (o import da DIRPF não envia — preserva o que já está salvo)
  if (formData.has('uf')) payload.uf = s(formData, 'uf') || 'SP'
  if (formData.has('itcmd_pct')) payload.itcmd_pct = num('itcmd_pct') || 4
  if (formData.has('inventario_pct')) payload.inventario_pct = num('inventario_pct') || 12
  const notas = s(formData, 'notes')
  if (notas) payload.notes = notas
  if (lgpd) payload.lgpd_confirmado_em = new Date().toISOString()
  const { error } = await supabase.from('radar_clientes').update(payload).eq('id', id)
  if (error) redirect(`/app/radar/${id}?error=` + encodeURIComponent(error.message))
  revalidatePath(`/app/radar/${id}`)
  redirect(`/app/radar/${id}`)
}

export async function updateRadarStatus(formData: FormData) {
  const id = s(formData, 'id')
  const to = s(formData, 'to') as StatusRadar
  if (!id) redirect('/app/radar')
  const supabase = createClient()
  await supabase.from('radar_clientes').update({ status: to }).eq('id', id)

  // Pipeline ativo: ao entrar num estágio, se não houver atividade em aberto,
  // o sistema já sugere a próxima ação (gera a atividade com prazo).
  const proxima: Record<string, { tipo: string; descricao: string; dias: number }> = {
    abordado: { tipo: 'reuniao', descricao: 'Agendar o diagnóstico patrimonial', dias: 2 },
    diagnostico: { tipo: 'email', descricao: 'Enviar o diagnóstico e marcar a devolutiva', dias: 1 },
    proposta: { tipo: 'followup', descricao: 'Follow-up da proposta enviada', dias: 2 },
  }
  const sug = proxima[to]
  if (sug) {
    const { count } = await supabase
      .from('radar_atividades').select('*', { count: 'exact', head: true })
      .eq('radar_id', id).is('concluida_em', null)
    if (!count) {
      const venc = new Date(); venc.setDate(venc.getDate() + sug.dias)
      await supabase.from('radar_atividades').insert({
        radar_id: id, tipo: sug.tipo, descricao: sug.descricao, vence_em: venc.toISOString().slice(0, 10),
      })
    }
  }
  revalidatePath(`/app/radar/${id}`)
  redirect(`/app/radar/${id}`)
}

export async function criarAtividadeRadar(formData: FormData) {
  const radarId = s(formData, 'radar_id')
  if (!radarId) redirect('/app/radar')
  const supabase = createClient()
  await supabase.from('radar_atividades').insert({
    radar_id: radarId,
    tipo: s(formData, 'tipo') || 'followup',
    descricao: orNull(s(formData, 'descricao')),
    vence_em: orNull(s(formData, 'vence_em')),
  })
  revalidatePath(`/app/radar/${radarId}`)
  redirect(`/app/radar/${radarId}`)
}

export async function concluirAtividadeRadar(formData: FormData) {
  const radarId = s(formData, 'radar_id')
  const id = s(formData, 'id')
  const supabase = createClient()
  await supabase.from('radar_atividades').update({ concluida_em: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/app/radar/${radarId}`)
  redirect(`/app/radar/${radarId}`)
}

export async function reabrirAtividadeRadar(formData: FormData) {
  const radarId = s(formData, 'radar_id')
  const id = s(formData, 'id')
  const supabase = createClient()
  await supabase.from('radar_atividades').update({ concluida_em: null }).eq('id', id)
  revalidatePath(`/app/radar/${radarId}`)
  redirect(`/app/radar/${radarId}`)
}

export async function excluirAtividadeRadar(formData: FormData) {
  const radarId = s(formData, 'radar_id')
  const id = s(formData, 'id')
  const supabase = createClient()
  await supabase.from('radar_atividades').delete().eq('id', id)
  revalidatePath(`/app/radar/${radarId}`)
  redirect(`/app/radar/${radarId}`)
}

export async function deleteRadarCliente(formData: FormData) {
  const id = s(formData, 'id')
  if (!id) redirect('/app/radar')
  const supabase = createClient()
  await supabase.from('radar_clientes').delete().eq('id', id)
  revalidatePath('/app/radar')
  redirect('/app/radar')
}

// -------------------------- Doações — execução, cláusulas e usufruto --------------------------
export async function updateDoacaoExecucao(formData: FormData) {
  const id = s(formData, 'id')
  const voltar = s(formData, 'voltar') || '/app/doacoes'
  if (!id) redirect(voltar)
  const on = (k: string) => formData.get(k) === 'on'
  const supabase = createClient()
  const { error } = await supabase.from('doacoes').update({
    minuta_solicitada: on('minuta_solicitada'),
    guia_itcmd_paga: on('guia_itcmd_paga'),
    escritura_lavrada: on('escritura_lavrada'),
    registro_concluido: on('registro_concluido'),
    clausula_incomunicabilidade: on('clausula_incomunicabilidade'),
    clausula_impenhorabilidade: on('clausula_impenhorabilidade'),
    clausula_inalienabilidade: on('clausula_inalienabilidade'),
    clausula_reversao: on('clausula_reversao'),
    usufruto_extinto_em: orNull(s(formData, 'usufruto_extinto_em')),
    usufruto_extinto_motivo: orNull(s(formData, 'usufruto_extinto_motivo')),
    consolidacao_registrada: on('consolidacao_registrada'),
  }).eq('id', id)
  if (error) redirect(`${voltar}?error=` + encodeURIComponent(error.message))
  revalidatePath(voltar)
  redirect(voltar)
}

// -------------------------- Doações — cronograma (reagendar / adiar por decisão) --------------------------
export async function updateDoacaoCronograma(formData: FormData) {
  const id = s(formData, 'id')
  const voltar = s(formData, 'voltar') || '/app/doacoes'
  if (!id) redirect(voltar)
  const novaData = s(formData, 'nova_data')
  const adiar = formData.get('adiar') === 'on'
  const supabase = createClient()
  const payload: { data_prevista?: string; adiada_em?: string | null; adiada_motivo?: string | null } = {}
  if (novaData) {
    payload.data_prevista = novaData
    payload.adiada_em = null
    payload.adiada_motivo = null
  } else if (adiar) {
    payload.adiada_em = new Date().toISOString().slice(0, 10)
    payload.adiada_motivo = orNull(s(formData, 'adiada_motivo'))
  } else {
    redirect(voltar)
  }
  const { error } = await supabase.from('doacoes').update(payload).eq('id', id)
  if (error) redirect(`${voltar}?error=` + encodeURIComponent(error.message))
  revalidatePath(voltar)
  redirect(voltar)
}

// -------------------------- Documentos da família (solicitação + recebimento) --------------------------
export async function criarSolicitacaoDocumento(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const descricao = s(formData, 'descricao')
  if (!familyId || !descricao) redirect(`/app/familias/${familyId}`)
  const supabase = createClient()
  await supabase.from('familia_solicitacoes').insert({ family_id: familyId, descricao })
  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}?message=` + encodeURIComponent('Solicitação criada.'))
}

export async function excluirSolicitacaoDocumento(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const supabase = createClient()
  await supabase.from('familia_solicitacoes').delete().eq('id', s(formData, 'id'))
  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}`)
}

export async function marcarEnvioLido(formData: FormData) {
  const familyId = s(formData, 'family_id')
  const supabase = createClient()
  await supabase.from('familia_envios').update({ lido: true }).eq('id', s(formData, 'id'))
  revalidatePath(`/app/familias/${familyId}`)
  redirect(`/app/familias/${familyId}`)
}
