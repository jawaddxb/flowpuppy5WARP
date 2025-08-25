-- Enable pgvector and add basic embeddings tables
create extension if not exists vector;

-- Knowledge base for templates and help snippets
create table if not exists public.embedded_docs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id),
  scope text not null default 'global',
  title text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- Index for ANN search
create index if not exists embedded_docs_embedding_idx on public.embedded_docs using ivfflat (embedding vector_cosine_ops) with (lists = 100);



