# CarrosselAI — Guia de Configuração

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [Upstash QStash](https://console.upstash.com/qstash)
- Chave da [OpenAI API](https://platform.openai.com)
- Chave da [Nanobana 2 API](https://nanobana.ai)
- Conta de Business no Instagram + Facebook App

---

## 1. Instalação

```bash
cd CarrosselAI
npm install
```

---

## 2. Variáveis de Ambiente

```bash
cp .env.local.example .env.local
```

Preencha todas as variáveis no `.env.local`:

| Variável | Onde encontrar |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API |
| `OPENAI_API_KEY` | platform.openai.com/api-keys |
| `NANOBANA_API_KEY` | nanobana.ai → Dashboard |
| `QSTASH_TOKEN` | console.upstash.com/qstash |
| `QSTASH_CURRENT_SIGNING_KEY` | console.upstash.com/qstash |
| `QSTASH_NEXT_SIGNING_KEY` | console.upstash.com/qstash |
| `INSTAGRAM_USER_ID` | Graph API Explorer |
| `INSTAGRAM_ACCESS_TOKEN` | Token de longa duração do Instagram |

---

## 3. Banco de Dados (Supabase)

Execute os scripts SQL no **Supabase SQL Editor**:

1. `supabase/migrations/001_initial_schema.sql` — Tabelas, índices e RLS
2. `supabase/migrations/002_storage_setup.sql` — Bucket para imagens

### Habilitar Realtime

No Supabase Dashboard:
1. Vá em **Database → Replication**
2. Habilite Realtime para as tabelas `posts` e `slides`

---

## 4. Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000



---

## Fluxo completo

```
Usuário                  Sistema
   │                        │
   ├─ POST /api/posts/criar ─►│
   │                        ├─ Cria post (status: gerando)
   │                        ├─ QStash → /api/processar
   │◄── { postId } ─────────┤
   │                        │
   │  [Realtime ao vivo]    │
   │◄─ status: extraindo ───┤
   │◄─ status: gerando_prompts
   │◄─ status: gerando_imagens (1/7)
   │◄─ status: aguardando_aprovacao
   │                        │
   ├─ Edita legenda         │
   ├─ POST /api/aprovar ────►│
   │                        ├─ QStash agenda para horário
   │◄─ status: agendado ────┤
   │                        │
   │  [No horário certo]    │
   │                        ├─ QStash → /api/postar
   │                        ├─ Instagram Graph API
   │◄─ status: postado ─────┤
```

---

## Instagram API — Configuração

1. Crie um app em [developers.facebook.com](https://developers.facebook.com)
2. Adicione o produto **Instagram Graph API**
3. Configure uma conta Business no Instagram
4. Gere um token de longa duração (60 dias)
5. Renove o token a cada 50 dias (automatize com cron)

### Permissões necessárias:
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`
