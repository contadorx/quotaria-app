// Validação e formatação de CPF/CNPJ. Validação por dígitos verificadores
// (portado do Financeiro Simples); máscara reconhece CPF (11) vs CNPJ (14).

function so(v: string): string {
  return (v || '').replace(/\D/g, '')
}

export function cpfValido(cpf: string): boolean {
  const c = so(cpf)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += Number(c[i]) * (10 - i)
  let d1 = 11 - (s % 11)
  if (d1 >= 10) d1 = 0
  if (d1 !== Number(c[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += Number(c[i]) * (11 - i)
  let d2 = 11 - (s % 11)
  if (d2 >= 10) d2 = 0
  return d2 === Number(c[10])
}

export function cnpjValido(cnpj: string): boolean {
  const c = so(cnpj)
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false
  const calc = (base: string): number => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let s = 0
    for (let i = 0; i < base.length; i++) s += Number(base[i]) * pesos[i]
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  if (calc(c.slice(0, 12)) !== Number(c[12])) return false
  return calc(c.slice(0, 13)) === Number(c[13])
}

/** Valida CPF (11) ou CNPJ (14) pelos dígitos verificadores. */
export function docValido(doc: string): boolean {
  const d = so(doc)
  if (d.length === 11) return cpfValido(d)
  if (d.length === 14) return cnpjValido(d)
  return false
}

export function apenasDigitos(v: string): string {
  return so(v)
}

/** Formata CPF: 000.000.000-00 */
export function formatarCpf(v: string): string {
  const c = so(v).slice(0, 11)
  return c
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

/** Formata CNPJ: 00.000.000/0000-00 */
export function formatarCnpj(v: string): string {
  const c = so(v).slice(0, 14)
  return c
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** Máscara automática: CPF até 11 dígitos, CNPJ a partir daí. */
export function mascaraDocumento(v: string): string {
  const c = so(v)
  return c.length <= 11 ? formatarCpf(c) : formatarCnpj(c)
}

export type TipoDocumento = 'cpf' | 'cnpj' | 'indefinido'
export function tipoDocumento(v: string): TipoDocumento {
  const c = so(v)
  if (c.length === 11) return 'cpf'
  if (c.length === 14) return 'cnpj'
  return 'indefinido'
}
