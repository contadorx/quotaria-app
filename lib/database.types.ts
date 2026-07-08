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
          minuta_solicitada: boolean
          guia_itcmd_paga: boolean
          escritura_lavrada: boolean
          registro_concluido: boolean
          clausula_incomunicabilidade: boolean
          clausula_impenhorabilidade: boolean
          clausula_inalienabilidade: boolean
          clausula_reversao: boolean
          usufruto_extinto_em: string | null
          usufruto_extinto_motivo: string | null
          consolidacao_registrada: boolean
          adiada_em: string | null
          adiada_motivo: string | null
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
          minuta_solicitada?: boolean
          guia_itcmd_paga?: boolean
          escritura_lavrada?: boolean
          registro_concluido?: boolean
          clausula_incomunicabilidade?: boolean
          clausula_impenhorabilidade?: boolean
          clausula_inalienabilidade?: boolean
          clausula_reversao?: boolean
          usufruto_extinto_em?: string | null
          usufruto_extinto_motivo?: string | null
          consolidacao_registrada?: boolean
          adiada_em?: string | null
          adiada_motivo?: string | null
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
          minuta_solicitada?: boolean
          guia_itcmd_paga?: boolean
          escritura_lavrada?: boolean
          registro_concluido?: boolean
          clausula_incomunicabilidade?: boolean
          clausula_impenhorabilidade?: boolean
          clausula_inalienabilidade?: boolean
          clausula_reversao?: boolean
          usufruto_extinto_em?: string | null
          usufruto_extinto_motivo?: string | null
          consolidacao_registrada?: boolean
          adiada_em?: string | null
          adiada_motivo?: string | null
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
          doacoes_ok: boolean
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
          doacoes_ok?: boolean
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
          doacoes_ok?: boolean
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
      family_access: {
        Row: {
          id: string
          organization_id: string
          family_id: string
          user_id: string | null
          email: string
          convite_token: string | null
          aceito_em: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          family_id: string
          user_id?: string | null
          email: string
          convite_token?: string | null
          aceito_em?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          family_id?: string
          user_id?: string | null
          email?: string
          convite_token?: string | null
          aceito_em?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      advogado_access: {
        Row: {
          id: string
          organization_id: string
          family_id: string
          user_id: string | null
          email: string
          nivel: string
          convite_token: string | null
          aceito_em: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          family_id: string
          user_id?: string | null
          email: string
          nivel?: string
          convite_token?: string | null
          aceito_em?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          family_id?: string
          user_id?: string | null
          email?: string
          nivel?: string
          convite_token?: string | null
          aceito_em?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      parceiros: {
        Row: { id: string; ref: string; nome: string; email: string | null; documento: string | null; chave_pix: string | null; ativo: boolean; observacoes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; ref: string; nome: string; email?: string | null; documento?: string | null; chave_pix?: string | null; ativo?: boolean; observacoes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; ref?: string; nome?: string; email?: string | null; documento?: string | null; chave_pix?: string | null; ativo?: boolean; observacoes?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      comissao_mensagens: {
        Row: { chave: string; assunto: string; corpo: string; updated_at: string }
        Insert: { chave: string; assunto: string; corpo: string; updated_at?: string }
        Update: { chave?: string; assunto?: string; corpo?: string; updated_at?: string }
        Relationships: []
      }
      comissao_faturas: {
        Row: { id: string; parceiro_ref: string; competencia: string; valor: number; status: string; nf_numero: string | null; nf_link: string | null; solicitada_em: string | null; recebida_em: string | null; paga_em: string | null; observacoes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; parceiro_ref: string; competencia: string; valor?: number; status?: string; nf_numero?: string | null; nf_link?: string | null; solicitada_em?: string | null; recebida_em?: string | null; paga_em?: string | null; observacoes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; parceiro_ref?: string; competencia?: string; valor?: number; status?: string; nf_numero?: string | null; nf_link?: string | null; solicitada_em?: string | null; recebida_em?: string | null; paga_em?: string | null; observacoes?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      radar_atividades: {
        Row: { id: string; accountant_id: string; organization_id: string; radar_id: string; tipo: string; descricao: string | null; vence_em: string | null; concluida_em: string | null; created_at: string }
        Insert: { id?: string; accountant_id?: string; organization_id?: string; radar_id: string; tipo?: string; descricao?: string | null; vence_em?: string | null; concluida_em?: string | null; created_at?: string }
        Update: { id?: string; accountant_id?: string; organization_id?: string; radar_id?: string; tipo?: string; descricao?: string | null; vence_em?: string | null; concluida_em?: string | null; created_at?: string }
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
          holding_existe: boolean
          holding_ano: number | null
          ata_em_dia: boolean
          doacao_iniciada: boolean
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
          holding_existe?: boolean
          holding_ano?: number | null
          ata_em_dia?: boolean
          doacao_iniciada?: boolean
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
          holding_existe?: boolean
          holding_ano?: number | null
          ata_em_dia?: boolean
          doacao_iniciada?: boolean
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
          assinatura_status: string
          plano: string
          valor_mensal: number
          ciclo_cobranca: string
          trial_ate: string | null
          bonus_ate: string | null
          proximo_vencimento: string | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          fatura_url: string | null
          fatura_valor: number | null
          fatura_vencimento: string | null
          is_teste: boolean
          parceiro_ref: string | null
          obs_admin: string | null
          ativada_em: string | null
          assinatura_provedor: string
          assinatura_token: string | null
          perfil: string
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
          assinatura_status?: string
          plano?: string
          valor_mensal?: number
          ciclo_cobranca?: string
          trial_ate?: string | null
          bonus_ate?: string | null
          proximo_vencimento?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          fatura_url?: string | null
          fatura_valor?: number | null
          fatura_vencimento?: string | null
          is_teste?: boolean
          parceiro_ref?: string | null
          obs_admin?: string | null
          ativada_em?: string | null
          assinatura_provedor?: string
          assinatura_token?: string | null
          perfil?: string
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
          assinatura_status?: string
          plano?: string
          valor_mensal?: number
          ciclo_cobranca?: string
          trial_ate?: string | null
          bonus_ate?: string | null
          proximo_vencimento?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          fatura_url?: string | null
          fatura_valor?: number | null
          fatura_vencimento?: string | null
          is_teste?: boolean
          parceiro_ref?: string | null
          obs_admin?: string | null
          ativada_em?: string | null
          assinatura_provedor?: string
          assinatura_token?: string | null
          perfil?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cobranca_config: {
        Row: { id: number; ativa: boolean; atualizado_em: string }
        Insert: { id?: number; ativa?: boolean; atualizado_em?: string }
        Update: { id?: number; ativa?: boolean; atualizado_em?: string }
        Relationships: []
      }
      cobranca_passos: {
        Row: {
          id: string
          quando: number
          assunto: string
          corpo: string
          botao_texto: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          quando: number
          assunto: string
          corpo: string
          botao_texto?: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          quando?: number
          assunto?: string
          corpo?: string
          botao_texto?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      cobranca_envios: {
        Row: {
          id: string
          organization_id: string
          vencimento: string
          quando: number
          criado_em: string
        }
        Insert: {
          id?: string
          organization_id: string
          vencimento: string
          quando: number
          criado_em?: string
        }
        Update: {
          id?: string
          organization_id?: string
          vencimento?: string
          quando?: number
          criado_em?: string
        }
        Relationships: []
      }
      comunicacao_config: {
        Row: { id: number; ativa: boolean; atualizado_em: string }
        Insert: { id?: number; ativa?: boolean; atualizado_em?: string }
        Update: { id?: number; ativa?: boolean; atualizado_em?: string }
        Relationships: []
      }
      comunicacao_passos: {
        Row: {
          id: string
          momento: string
          quando: number
          assunto: string
          corpo: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          momento: string
          quando: number
          assunto: string
          corpo: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          momento?: string
          quando?: number
          assunto?: string
          corpo?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      comunicacao_envios: {
        Row: {
          id: string
          organization_id: string
          momento: string
          quando: number
          criado_em: string
        }
        Insert: {
          id?: string
          organization_id: string
          momento: string
          quando: number
          criado_em?: string
        }
        Update: {
          id?: string
          organization_id?: string
          momento?: string
          quando?: number
          criado_em?: string
        }
        Relationships: []
      }
      faq: {
        Row: {
          id: string
          categoria: string
          pergunta: string
          resposta: string
          video_url: string | null
          destaque: boolean
          publicado: boolean
          ordem: number
          criado_em: string
        }
        Insert: {
          id?: string
          categoria?: string
          pergunta: string
          resposta: string
          destaque?: boolean
          publicado?: boolean
          ordem?: number
          criado_em?: string
        }
        Update: {
          id?: string
          categoria?: string
          pergunta?: string
          resposta?: string
          video_url?: string | null
          destaque?: boolean
          publicado?: boolean
          ordem?: number
          criado_em?: string
        }
        Relationships: []
      }
      suporte_conversas: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          assunto: string
          escalada: boolean
          status: string
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          assunto?: string
          escalada?: boolean
          status?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          assunto?: string
          escalada?: boolean
          status?: string
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      suporte_mensagens: {
        Row: {
          id: string
          conversa_id: string
          autor: string
          texto: string
          criado_em: string
        }
        Insert: {
          id?: string
          conversa_id: string
          autor: string
          texto: string
          criado_em?: string
        }
        Update: {
          id?: string
          conversa_id?: string
          autor?: string
          texto?: string
          criado_em?: string
        }
        Relationships: []
      }
      assistente_config: {
        Row: {
          id: number
          system_prompt: string | null
          modelo: string | null
          atualizado_em: string
        }
        Insert: {
          id?: number
          system_prompt?: string | null
          modelo?: string | null
          atualizado_em?: string
        }
        Update: {
          id?: number
          system_prompt?: string | null
          modelo?: string | null
          atualizado_em?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          texto: string
          criado_em: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          texto: string
          criado_em?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          texto?: string
          criado_em?: string
        }
        Relationships: []
      }
      ia_uso: {
        Row: {
          id: string
          organization_id: string | null
          contexto: string
          ok: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          contexto?: string
          ok?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          contexto?: string
          ok?: boolean
          criado_em?: string
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
          super_admin: boolean
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
        Args: { p_nome: string; p_cnpj?: string | null; p_crc?: string | null; p_ref?: string | null }
        Returns: string
      }
      admin_comissoes_parceiros: {
        Args: Record<PropertyKey, never>
        Returns: { parceiro_ref: string; organization_id: string; nome: string; plano: string; status: string; valor: number; comissao: number }[]
      }
      aceitar_convite_familia: {
        Args: { p_token: string }
        Returns: string
      }
      aceitar_convite_advogado: {
        Args: { p_token: string }
        Returns: string
      }
      advogado_clausula_criar: {
        Args: { p_holding_id: string; p_tipo: string; p_descricao?: string | null; p_responsavel?: string | null }
        Returns: string
      }
      advogado_clausula_excluir: {
        Args: { p_id: string }
        Returns: undefined
      }
      advogado_documento_criar: {
        Args: { p_holding_id: string; p_nome: string; p_tipo: string; p_storage_path: string; p_competencia?: string | null }
        Returns: string
      }
      parceiro_distribuicao_criar: {
        Args: { p_holding_id: string; p_competencia: string; p_valor: number; p_tipo?: string; p_deliberacao?: string | null }
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
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      painel_negocio: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_atualizar_assinatura: {
        Args: {
          p_org: string
          p_status: string
          p_plano: string
          p_valor: number
          p_ciclo: string
          p_trial_ate: string | null
          p_bonus_ate: string | null
          p_proximo_vencimento: string | null
          p_is_teste: boolean
          p_parceiro_ref: string | null
          p_obs: string | null
          p_asaas_customer: string | null
          p_asaas_subscription: string | null
        }
        Returns: undefined
      }
      admin_reguas: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_regua_config: {
        Args: { p_tipo: string; p_ativa: boolean }
        Returns: undefined
      }
      admin_regua_passo_salvar: {
        Args: {
          p_tipo: string
          p_id: string | null
          p_quando: number
          p_momento: string | null
          p_assunto: string
          p_corpo: string
          p_botao: string | null
          p_ativo: boolean
        }
        Returns: undefined
      }
      admin_regua_passo_excluir: {
        Args: { p_tipo: string; p_id: string }
        Returns: undefined
      }
      registrar_ia_uso: {
        Args: { p_contexto: string; p_ok: boolean }
        Returns: undefined
      }
      registrar_assinatura_selecionada: {
        Args: {
          p_asaas_customer: string
          p_asaas_subscription: string
          p_plano: string
          p_valor: number
          p_ciclo: string
        }
        Returns: undefined
      }
      admin_suporte: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_suporte_responder: {
        Args: { p_conversa: string; p_texto: string }
        Returns: undefined
      }
      admin_suporte_status: {
        Args: { p_conversa: string; p_status: string }
        Returns: undefined
      }
      admin_faq_salvar: {
        Args: {
          p_id: string | null
          p_categoria: string | null
          p_pergunta: string
          p_resposta: string
          p_destaque: boolean
          p_publicado: boolean
          p_ordem: number
          p_video_url?: string | null
        }
        Returns: undefined
      }
      admin_faq_excluir: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_assistente_salvar: {
        Args: { p_prompt: string | null; p_modelo: string | null }
        Returns: undefined
      }
      admin_assistente: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_feedbacks: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
