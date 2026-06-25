-- Eco-Clean Financiero PRO
-- Copia y pega todo este bloque en Supabase > SQL Editor > Run.
-- La app guarda TODO en un solo estado JSON para que sea fácil mantenerla sin programar.

create table if not exists public.finance_app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists finance_app_state_updated_at_idx
on public.finance_app_state (updated_at desc);

comment on table public.finance_app_state is 'Estado principal de Eco-Clean Financiero. La app escribe desde Next.js usando la service role key guardada en Vercel.';

-- No actives permisos públicos ni pegues la service_role key dentro del código.
