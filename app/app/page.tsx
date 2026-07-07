export default function AppHome() {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
        Cadastro
      </div>
      <h1 className="mt-1 font-serif text-3xl text-navy">Suas holdings</h1>
      <p className="mt-3 max-w-lg text-navy/60">
        Autenticação no ar e rotas protegidas. O cadastro multi-holding (famílias,
        holdings, sócios, quotas, bens e cláusulas) entra na próxima etapa — já
        isolado por contador via RLS.
      </p>

      <div className="mt-8 rounded-lg border border-dashed border-navy/20 p-8 text-center text-sm text-navy/50">
        Nenhuma holding cadastrada ainda.
      </div>
    </div>
  )
}
