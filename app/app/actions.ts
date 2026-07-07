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
