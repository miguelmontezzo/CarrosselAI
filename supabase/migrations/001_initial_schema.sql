-- ═══════════════════════════════════════════════════════════════
-- supabase/migrations/001_initial_schema.sql
-- Schema inicial do CarrosselAI
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard
-- ═══════════════════════════════════════════════════════════════

-- ─── Extensões necessárias ──────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tabela: style_models ───────────────────────────────────────
-- Armazena modelos de estilo visual extraídos via GPT-4 Vision
CREATE TABLE IF NOT EXISTS style_models (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT NOT NULL,
  style_json  JSONB NOT NULL,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Tabela: posts ──────────────────────────────────────────────
-- Post principal do carrossel
CREATE TABLE IF NOT EXISTS posts (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo              TEXT,
  link_fonte          TEXT,
  tema                TEXT,
  legenda             TEXT,
  handle              TEXT DEFAULT '@miguelito.ai',
  num_slides          INTEGER DEFAULT 7,
  status              TEXT DEFAULT 'gerando',
  progresso_imagens   TEXT,           -- Ex: "3/7" durante geração
  agendado_para       TIMESTAMP WITH TIME ZONE,
  instagram_post_id   TEXT,
  style_model_id      UUID REFERENCES style_models(id) ON DELETE SET NULL,
  erro_mensagem       TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_at           TIMESTAMP WITH TIME ZONE
);

-- ─── Tabela: slides ─────────────────────────────────────────────
-- Slides individuais do carrossel
CREATE TABLE IF NOT EXISTS slides (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id       UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  numero        INTEGER NOT NULL,
  headline      TEXT,
  body          TEXT,
  cta           TEXT,
  handle        TEXT,
  image_prompt  TEXT,
  image_url     TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garante unicidade de número por post
  UNIQUE (post_id, numero)
);

-- ─── Índices para performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_agendado_para ON posts(agendado_para) WHERE agendado_para IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slides_post_id ON slides(post_id);
CREATE INDEX IF NOT EXISTS idx_slides_numero ON slides(post_id, numero);

-- ─── Row Level Security (RLS) ───────────────────────────────────
-- Habilita RLS em todas as tabelas
ALTER TABLE style_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

-- Por padrão: permite tudo para usuários autenticados
-- Ajuste conforme necessidade de multi-tenant

CREATE POLICY "style_models_all" ON style_models
  FOR ALL USING (true);

CREATE POLICY "posts_all" ON posts
  FOR ALL USING (true);

CREATE POLICY "slides_all" ON slides
  FOR ALL USING (true);

-- ─── Supabase Storage: bucket para slides ───────────────────────
-- Execute separadamente no painel do Supabase ou via API

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('carrossel-slides', 'carrossel-slides', true);

-- CREATE POLICY "slides_storage_all" ON storage.objects
--   FOR ALL USING (bucket_id = 'carrossel-slides');

-- ─── Realtime: habilita para as tabelas necessárias ─────────────
-- Execute no painel: Database > Replication > Realtime
-- Ou via SQL:

ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE slides;

-- ─── Dados iniciais ─────────────────────────────────────────────
-- Estilo padrão (dark cinematográfico) para novos usuários
INSERT INTO style_models (nome, style_json, ativo)
VALUES (
  'Dark Cinematográfico (Padrão)',
  '{
    "layout": "Imagem ocupa os 55% superiores com fade suave para preto sólido nos 45% inferiores",
    "tipografia": {
      "titulo": "Bebas Neue bold, uppercase, centralizado, 40-50px",
      "corpo": "Inter regular, branco, centralizado, 14-16px",
      "destaque": "Inter medium, cinza claro, 12px"
    },
    "cores": {
      "fundo": "#000000",
      "texto_principal": "#ffffff",
      "texto_secundario": "#aaaaaa",
      "destaque": "#ff4500"
    },
    "posicao_elementos": {
      "imagem": "superior 55% com gradient fade para preto",
      "titulo": "centro-inferior, sobre fundo preto",
      "corpo": "abaixo do título, centralizado",
      "cta": "acima do handle, cinza pequeno",
      "handle": "inferior centralizado, cinza"
    },
    "descricao_geral": "Estilo dark cinematográfico com imagem no topo, gradiente suave para preto sólido, textos em branco centralizados sobre fundo preto. Visual dramático estilo breaking news."
  }',
  true
);
