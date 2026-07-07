// -----------------------------------------------------------------------------
// Tipos do banco — espelham a migration 0001_cadastro_multi_holding.sql.
// A fonte da verdade é o schema no Supabase. Para regenerar automaticamente:
//   supabase gen types typescript --project-id SEU_ID > lib/database.types.ts
// -----------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Domínios (campos text + CHECK no banco, tipados aqui para autocomplete)
export type TipoSocietario = 'ltda' | 'sa'
export type StatusHolding = 'ativa' | 'em_constituicao' | 'inativa'
export type PapelFamiliar =
  | 'patriarca'
  | 'matriarca'
  | 'conjuge'
  | 'filho'
  | 'neto'
  | 'outro'
export type EstadoCivil =
  | 'solteiro'
  | 'casado'
  | 'uniao_estavel'
  | 'divorciado'
  | 'viuvo'
export type RegimeBens =
  | 'comunhao_parcial'
  | 'comunhao_universal'
  | 'separacao_total'
  | 'participacao_final'
  | 'nao_aplicavel'
export type TipoDireito = 'plena' | 'nua_propriedade' | 'usufruto'
export type ClasseQuota = 'ordinaria' | 'preferencial'
export type TipoBem = 'imovel' | 'participacao' | 'veiculo' | 'aplicacao' | 'outro'
export type TipoClausula =
  | 'incomunicabilidade'
  | 'impenhorabilidade'
  | 'inalienabilidade'
  | 'reversao'
  | 'usufruto_vitalicio'
  | 'outra'

export type TipoEvento =
  | 'ata_anual'
  | 'revisao'
  | 'distribuicao'
  | 'doacao'
  | 'marco_reforma'
  | 'outro'
export type StatusEvento = 'pendente' | 'concluido'

export type TipoDistribuicao = 'lucros' | 'jcp' | 'outro'

export type StatusDoacao = 'planejada' | 'em_cartorio' | 'concluida'

export type StatusRadar = 'novo' | 'abordado' | 'diagnostico' | 'proposta' | 'fechado' | 'descartado'

export type PapelMembro = 'dono' | 'admin' | 'colaborador'

export type TipoDocumento =
  | 'ata'
  | 'contrato_social'
  | 'acordo_quotistas'
  | 'doacao'
  | 'laudo'
  | 'matricula'
  | 'outro'

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          name: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          name: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          name?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          family_id: string
          razao_social: string
          nome_fantasia: string | null
          cnpj: string | null
          tipo_societario: TipoSocietario
          data_constituicao: string | null
          capital_social: number | null
          status: StatusHolding
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          family_id: string
          razao_social: string
          nome_fantasia?: string | null
          cnpj?: string | null
          tipo_societario?: TipoSocietario
          data_constituicao?: string | null
          capital_social?: number | null
          status?: StatusHolding
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          family_id?: string
          razao_social?: string
          nome_fantasia?: string | null
          cnpj?: string | null
          tipo_societario?: TipoSocietario
          data_constituicao?: string | null
          capital_social?: number | null
          status?: StatusHolding
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      socios: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          family_id: string
          nome: string
          cpf: string | null
          data_nascimento: string | null
          papel_familiar: PapelFamiliar | null
          estado_civil: EstadoCivil | null
          regime_bens: RegimeBens | null
          email: string | null
          telefone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          family_id: string
          nome: string
          cpf?: string | null
          data_nascimento?: string | null
          papel_familiar?: PapelFamiliar | null
          estado_civil?: EstadoCivil | null
          regime_bens?: RegimeBens | null
          email?: string | null
          telefone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          family_id?: string
          nome?: string
          cpf?: string | null
          data_nascimento?: string | null
          papel_familiar?: PapelFamiliar | null
          estado_civil?: EstadoCivil | null
          regime_bens?: RegimeBens | null
          email?: string | null
          telefone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotas: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string
          socio_id: string
          quantidade: number
          percentual: number | null
          valor_nominal: number | null
          tipo_direito: TipoDireito
          classe: ClasseQuota | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id: string
          socio_id: string
          quantidade?: number
          percentual?: number | null
          valor_nominal?: number | null
          tipo_direito?: TipoDireito
          classe?: ClasseQuota | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string
          socio_id?: string
          quantidade?: number
          percentual?: number | null
          valor_nominal?: number | null
          tipo_direito?: TipoDireito
          classe?: ClasseQuota | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bens: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string
          tipo: TipoBem
          descricao: string
          valor_contabil: number | null
          valor_mercado: number | null
          matricula: string | null
          municipio_uf: string | null
          data_aquisicao: string | null
          gera_receita: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id: string
          tipo?: TipoBem
          descricao: string
          valor_contabil?: number | null
          valor_mercado?: number | null
          matricula?: string | null
          municipio_uf?: string | null
          data_aquisicao?: string | null
          gera_receita?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string
          tipo?: TipoBem
          descricao?: string
          valor_contabil?: number | null
          valor_mercado?: number | null
          matricula?: string | null
          municipio_uf?: string | null
          data_aquisicao?: string | null
          gera_receita?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clausulas: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          tipo: TipoClausula
          holding_id: string | null
          quota_id: string | null
          bem_id: string | null
          descricao: string | null
          registrada_em: string | null
          responsavel: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          tipo: TipoClausula
          holding_id?: string | null
          quota_id?: string | null
          bem_id?: string | null
          descricao?: string | null
          registrada_em?: string | null
          responsavel?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          tipo?: TipoClausula
          holding_id?: string | null
          quota_id?: string | null
          bem_id?: string | null
          descricao?: string | null
          registrada_em?: string | null
          responsavel?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string | null
          titulo: string
          tipo: TipoEvento
          data_prevista: string
          status: StatusEvento
          concluido_em: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string | null
          titulo: string
          tipo?: TipoEvento
          data_prevista: string
          status?: StatusEvento
          concluido_em?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string | null
          titulo?: string
          tipo?: TipoEvento
          data_prevista?: string
          status?: StatusEvento
          concluido_em?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      distribuicoes: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string
          competencia: string
          valor_total: number
          tipo: TipoDistribuicao
          proporcional: boolean
          deliberacao: string | null
          data_deliberacao: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id: string
          competencia: string
          valor_total?: number
          tipo?: TipoDistribuicao
          proporcional?: boolean
          deliberacao?: string | null
          data_deliberacao?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string
          competencia?: string
          valor_total?: number
          tipo?: TipoDistribuicao
          proporcional?: boolean
          deliberacao?: string | null
          data_deliberacao?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      doacoes: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string
          doador_id: string | null
          donatario_id: string | null
          quantidade_quotas: number
          valor_estimado: number | null
          itcmd_estimado: number | null
          com_reserva_usufruto: boolean
          data_prevista: string | null
          status: StatusDoacao
          data_conclusao: string | null
          cartorio: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id: string
          doador_id?: string | null
          donatario_id?: string | null
          quantidade_quotas?: number
          valor_estimado?: number | null
          itcmd_estimado?: number | null
          com_reserva_usufruto?: boolean
          data_prevista?: string | null
          status?: StatusDoacao
          data_conclusao?: string | null
          cartorio?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string
          doador_id?: string | null
          donatario_id?: string | null
          quantidade_quotas?: number
          valor_estimado?: number | null
          itcmd_estimado?: number | null
          com_reserva_usufruto?: boolean
          data_prevista?: string | null
          status?: StatusDoacao
          data_conclusao?: string | null
          cartorio?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string | null
          nome: string
          tipo: TipoDocumento
          storage_path: string
          tamanho_bytes: number | null
          competencia: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string | null
          nome: string
          tipo?: TipoDocumento
          storage_path: string
          tamanho_bytes?: number | null
          competencia?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string | null
          nome?: string
          tipo?: TipoDocumento
          storage_path?: string
          tamanho_bytes?: number | null
          competencia?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fechamentos: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string
          competencia: string
          distribuicoes_ok: boolean
          documentos_ok: boolean
          alertas_ok: boolean
          alugueis_ok: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id: string
          competencia: string
          distribuicoes_ok?: boolean
          documentos_ok?: boolean
          alertas_ok?: boolean
          alugueis_ok?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string
          competencia?: string
          distribuicoes_ok?: boolean
          documentos_ok?: boolean
          alertas_ok?: boolean
          alugueis_ok?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      conformidade_reforma: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          holding_id: string
          nfse_cbs: boolean
          clausula_repasse: boolean
          credito_locatario: boolean
          redutor_social: boolean
          regime_caixa: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id: string
          nfse_cbs?: boolean
          clausula_repasse?: boolean
          credito_locatario?: boolean
          redutor_social?: boolean
          regime_caixa?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          holding_id?: string
          nfse_cbs?: boolean
          clausula_repasse?: boolean
          credito_locatario?: boolean
          redutor_social?: boolean
          regime_caixa?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_contacts: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          family_id: string
          nome: string
          email: string | null
          parentesco: string | null
          receber_relatorio: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          family_id: string
          nome: string
          email?: string | null
          parentesco?: string | null
          receber_relatorio?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          family_id?: string
          nome?: string
          email?: string | null
          parentesco?: string | null
          receber_relatorio?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      radar_clientes: {
        Row: {
          id: string
          accountant_id: string
          organization_id: string
          nome: string
          uf: string
          n_imoveis: number
          patrimonio: number
          renda_aluguel_anual: number
          socio_pj: boolean
          recebe_dividendos: boolean
          n_herdeiros: number
          itcmd_pct: number
          inventario_pct: number
          status: StatusRadar
          lgpd_confirmado_em: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          accountant_id?: string
          organization_id?: string
          nome: string
          uf?: string
          n_imoveis?: number
          patrimonio?: number
          renda_aluguel_anual?: number
          socio_pj?: boolean
          recebe_dividendos?: boolean
          n_herdeiros?: number
          itcmd_pct?: number
          inventario_pct?: number
          status?: StatusRadar
          lgpd_confirmado_em?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          accountant_id?: string
          organization_id?: string
          nome?: string
          uf?: string
          n_imoveis?: number
          patrimonio?: number
          renda_aluguel_anual?: number
          socio_pj?: boolean
          recebe_dividendos?: boolean
          n_herdeiros?: number
          itcmd_pct?: number
          inventario_pct?: number
          status?: StatusRadar
          lgpd_confirmado_em?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          crc: string | null
          email_contato: string | null
          telefone: string | null
          logo_url: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          crc?: string | null
          email_contato?: string | null
          telefone?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string | null
          crc?: string | null
          email_contato?: string | null
          telefone?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          email: string | null
          role: PapelMembro
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          email?: string | null
          role?: PapelMembro
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          email?: string | null
          role?: PapelMembro
          created_at?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: PapelMembro
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          email: string
          role?: PapelMembro
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: PapelMembro
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      is_org_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      criar_escritorio: {
        Args: { p_nome: string; p_cnpj?: string | null; p_crc?: string | null }
        Returns: string
      }
      ver_convite: {
        Args: { p_token: string }
        Returns: { organizacao: string; email: string; papel: string; invalido: boolean }[]
      }
      aceitar_convite: {
        Args: { p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
