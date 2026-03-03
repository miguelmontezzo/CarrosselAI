-- ═══════════════════════════════════════════════════════════════
-- supabase/migrations/002_storage_setup.sql
-- Configuração do Supabase Storage para imagens dos slides
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Cria o bucket público para os slides (imagens geradas pela Nanobana)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'carrossel-slides',
  'carrossel-slides',
  true,                          -- Bucket público (necessário para Instagram API)
  10485760,                      -- 10MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer um pode ler (público)
CREATE POLICY "slides_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'carrossel-slides');

-- Política: apenas service_role pode fazer upload
CREATE POLICY "slides_service_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'carrossel-slides');

-- Política: apenas service_role pode deletar
CREATE POLICY "slides_service_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'carrossel-slides');
