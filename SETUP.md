# Quotaria — Sistema · Setup do zero (git → Supabase → Vercel)

Este é o **esqueleto** do SaaS: o pipeline (Next.js → GitHub → Vercel) + a conexão
com o Supabase, já buildando. **Não tem feature ainda** — as telas do produto (cadastro
multi-holding etc.) entram depois, uma por vez. O objetivo aqui é ter o "hello Quotaria"
no ar e o pipeline funcionando, pra quando você atacar as features (agosto) já estar tudo
plugado.

> Lembrete honesto: até meados de agosto o esforço principal é o **lançamento do curso**
> (carrinho 21/07). Isto aqui é fundação, sem pressa. Deixe rodando e volte pra features
> depois do carrinho.

Como você já roda **BPOx e Financeiro Simples** na mesma stack, boa parte das etapas 1–3
você provavelmente **já tem**. Marquei cada uma com `[JÁ DEVE TER]` ou `[NOVO p/ Quotaria]`.

---

## O que vem neste pacote

```
quotaria-app/
├─ app/                 # App Router (layout, home/status, css)
├─ components/          # brand (wordmark) + teste de conexão
├─ lib/supabase/        # client (browser) e server (cookies) — padrão @supabase/ssr
├─ package.json         # Next 14.2.35 + Supabase + Tailwind
├─ tailwind.config.ts   # tokens navy / gold / cream
├─ .env.local.example   # modelo das variáveis (copie para .env.local)
├─ .gitignore
└─ SETUP.md             # este arquivo
```

**Não vem** (de propósito): `node_modules/`, `.next/`, `.git/`, `.env.local`.
Você gera tudo isso localmente.

Sobre a versão do Next: fixei **14.2.35** (último patch do Next 14, já com correção de
segurança). Mantive o **major 14** de propósito, pra bater com BPOx/FS. Existem Next 15 e
16, mas migrar é decisão à parte — não agora.

---

## 1. Ferramentas locais `[JÁ DEVE TER]`

Confirme no terminal:

```bash
node -v     # precisa ser 18.18+ ; recomendado 20.x LTS
git --version
```

- **Node.js 20 LTS** — se `node -v` mostrar < 18.18, atualize (nodejs.org, versão LTS).
- **Git** — vem junto do GitHub Desktop; se `git --version` responder, está ok.
- **GitHub Desktop** — seu fluxo de publish.
- **Editor** — VS Code (recomendado).

Se tudo isso responde, pule pra etapa 2.

---

## 2. Repositório novo no GitHub `[NOVO p/ Quotaria]`

1. GitHub → **New repository**.
2. Nome: `quotaria-app` · visibilidade: **Private**.
3. **Não** marque "Add README / .gitignore / license" (o scaffold já traz o `.gitignore`).
4. Crie e, no GitHub Desktop: **Clone repository** → escolha `quotaria-app` → clone pra
   uma pasta local (ex.: `.../ContadorX/quotaria-app`).

---

## 3. Colocar o scaffold dentro do repo `[NOVO]`

1. Descompacte o `quotaria-app.zip`.
2. Copie **o conteúdo** da pasta `quotaria-app/` (app, components, lib, package.json, etc.)
   **para dentro** da pasta que o GitHub Desktop clonou.

> ⚠️ Cuidado com pasta dupla: os arquivos vão na **raiz** do repo. O correto é
> `quotaria-app/package.json` — **não** `quotaria-app/quotaria-app/package.json`.

3. No GitHub Desktop você já deve ver os arquivos aparecendo como mudanças. **Ainda não
   commite** — falta o `.env.local` e o build local (etapas 5–6).

---

## 4. Supabase — projeto **novo e dedicado** `[NOVO]`

**Recomendação: crie um projeto Supabase NOVO só pro Quotaria** — não reaproveite o do
BPOx. Motivo: isolamento de dados, de billing e de escala. Misturar tabelas de produtos
diferentes no mesmo projeto vira uma dor de cabeça difícil de desfazer depois. Se você
tiver um motivo forte pra compartilhar, me avise que a gente ajusta — mas o default é
separar.

1. Supabase → **New project**.
2. Organização: a sua · Nome: `quotaria` · **Database password**: gere uma forte e
   **guarde** (você vai precisar dela para migrations/conexão direta).
3. **Region: South America (São Paulo)** — menor latência pra base BR.
4. Aguarde o provisionamento (~2 min).
5. **Settings → API**. Copie duas coisas:
   - **Project URL** → vai em `NEXT_PUBLIC_SUPABASE_URL`.
   - **Chave pública / anon** (a chave pra client — dependendo da versão do painel pode
     estar rotulada como *anon public* ou *publishable*; é a pública, não a secreta) →
     vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - A **service_role / secret** (chave privilegiada) você **não** usa agora e **nunca**
     coloca no client. Só entra quando alguma feature precisar de acesso admin no servidor.

---

## 5. Variáveis de ambiente locais (`.env.local`) `[NOVO]`

1. Na raiz do projeto, copie o modelo:

```bash
cp .env.local.example .env.local
```

2. Abra o `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

> O `.env.local` está no `.gitignore` — ele **nunca** vai pro GitHub nem pra mim. As
> chaves ficam só com você. Eu construo/testo aqui com valores fake.

---

## 6. Rodar local e testar a conexão `[NOVO]`

Na raiz do projeto:

```bash
npm install
npm run dev
```

Abra **http://localhost:3000**. Você deve ver a página *Quotaria — Fundação*:
- "Supabase configurado (.env.local)": **✓ sim** (se você preencheu o `.env.local`).
- Clique em **Testar conexão** → deve responder **✓ Conexão com o Supabase respondeu sem
  erros**. (Esse teste faz uma chamada real de sessão ao seu Supabase — se as chaves
  estiverem erradas, ele mostra o erro exato.)

Confirme também o build de produção (é o que a Vercel roda):

```bash
npm run build
```

Tem que terminar sem erro (aqui rodou limpo com Next 14.2.35).

---

## 7. Publicar no GitHub `[NOVO]`

No **GitHub Desktop**:
1. Confira que `node_modules/`, `.next/` e `.env.local` **não** aparecem na lista de
   mudanças (o `.gitignore` cuida disso — se aparecerem, pare e me avise).
2. Summary do commit: `chore: scaffold inicial (Next 14 + Supabase + Tailwind)`.
3. **Commit to main** → **Push origin**.

---

## 8. Deploy na Vercel `[NOVO p/ Quotaria]`

1. Vercel → **Add New → Project** → **Import** o repositório `quotaria-app` do GitHub.
2. Framework: **Next.js** (detecta sozinho). Build/Output: deixe o padrão.
3. **Environment Variables** — adicione as mesmas do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   (Marque para **Production** — e Preview/Development se quiser testar branches.)
4. (Opcional, você está no Pro) **Settings → Functions → Region**: `São Paulo (gru1)` pra
   latência menor no Brasil. **Settings → Node.js Version**: `20.x`.
5. **Deploy**. Ao terminar, abra a URL `*.vercel.app` — a mesma página de status deve
   aparecer, e o **Testar conexão** deve funcionar (porque as env vars estão na Vercel).

> Domínio: por ora não precisa apontar `quotaria.com.br` pra cá — o site institucional
> vai pro HostGator (decisão do doc mestre). O sistema pode viver num subdomínio depois
> (ex.: `app.quotaria.com.br`) quando as features existirem. Não é pra agora.

---

## 9. Confirmar o pipeline (o teste que importa)

Faça uma mudança boba (ex.: troque uma palavra na home), commit + push no GitHub Desktop.
A Vercel deve **buildar e publicar sozinha** em ~1 min. Se isso acontecer:
**git → Vercel está funcionando** e a fundação está pronta.

---

## 10. Segurança — o que **nunca** versionar

- `.env.local` (chaves) — já no `.gitignore`.
- `SUPABASE_SERVICE_ROLE_KEY` — nunca no client, nunca no Git; só em env da Vercel/servidor
  **quando** alguma feature exigir, e mesmo assim com cuidado.
- Guarde a **database password** do Supabase num cofre (você vai precisar pra migrations).

---

## 11. Próximo passo (só depois do carrinho / agosto)

**Feature 1 — Cadastro multi-holding** (a fundação do produto: holdings, sócios, quotas,
bens, cláusulas). É aí que entram: schema no Supabase (migration `.sql`), RLS por usuário,
autenticação (login), e o middleware de sessão do `@supabase/ssr`. A gente faz **1 feature
por vez, com build entre cada** — do jeito BPOx/FS.

Quando chegar a hora, é só dizer "bora a feature 1" que eu já parto do schema + a primeira
tela.
