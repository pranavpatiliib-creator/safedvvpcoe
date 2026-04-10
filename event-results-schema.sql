create table if not exists public.event_results (
    event_id bigint primary key references public.events(id) on delete cascade,
    gallery_enabled boolean not null default false,
    winners jsonb not null default '[]'::jsonb,
    gallery_images jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.event_results
add column if not exists gallery_images jsonb not null default '[]'::jsonb;

create or replace function public.set_event_results_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_event_results_updated_at on public.event_results;

create trigger trg_event_results_updated_at
before update on public.event_results
for each row
execute function public.set_event_results_updated_at();
