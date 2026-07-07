'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
