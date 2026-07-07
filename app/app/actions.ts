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
