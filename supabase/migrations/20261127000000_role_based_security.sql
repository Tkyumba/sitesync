-- SiteSync: replace the open "Allow all" rules with role-based access.
--
-- Who can do what after this:
--   owner            everything, plus the owner-only project_financials table
--   vp / manager     projects, phases, sub assignments, photos, activity; manage sub accounts
--   sub (logged in)  their own record, phases assigned to them, photos on those phases
--   not logged in    nothing. Sub job links go through the app's server, which checks the link.
--
-- Apply only after the app version that routes job links through /api/job/* is live.

begin;

-- Helpers. SECURITY DEFINER so rules on "users" can look up roles without recursion.
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('owner', 'vp', 'manager'), false)
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'owner', false)
$$;

revoke all on function public.app_role(), public.is_staff(), public.is_owner() from public, anon;
grant execute on function public.app_role(), public.is_staff(), public.is_owner() to authenticated;

-- Remove every existing rule on the app's tables, then add the new ones.
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('users','projects','phases','phase_subs','phase_photos','activity_log',
                        'job_tokens','issues','notifications_log')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.users             enable row level security;
alter table public.projects          enable row level security;
alter table public.phases            enable row level security;
alter table public.phase_subs        enable row level security;
alter table public.phase_photos      enable row level security;
alter table public.activity_log      enable row level security;
alter table public.job_tokens        enable row level security;
alter table public.issues            enable row level security;
alter table public.notifications_log enable row level security;

-- users: everyone sees their own record; staff see everyone.
-- Staff can edit sub accounts (trade, deactivate) but can't make anyone a manager or owner.
-- New accounts are created by the server only.
create policy "users: read own or staff" on public.users
  for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "users: owner edits anyone" on public.users
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "users: staff edit subs" on public.users
  for update to authenticated
  using (public.is_staff() and role in ('sub', 'inactive'))
  with check (public.is_staff() and role in ('sub', 'inactive'));

-- projects
create policy "projects: staff read" on public.projects
  for select to authenticated using (public.is_staff());
create policy "projects: sub reads projects they work on" on public.projects
  for select to authenticated using (
    exists (select 1 from public.phases ph where ph.project_id = projects.id and ph.sub_id = auth.uid())
  );
create policy "projects: staff create" on public.projects
  for insert to authenticated with check (public.is_staff());
create policy "projects: staff update" on public.projects
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "projects: owner delete" on public.projects
  for delete to authenticated using (public.is_owner());

-- phases
create policy "phases: staff read" on public.phases
  for select to authenticated using (public.is_staff());
create policy "phases: sub reads own" on public.phases
  for select to authenticated using (sub_id = auth.uid());
create policy "phases: staff create" on public.phases
  for insert to authenticated with check (public.is_staff());
create policy "phases: staff update" on public.phases
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "phases: sub updates own" on public.phases
  for update to authenticated using (sub_id = auth.uid()) with check (sub_id = auth.uid());
create policy "phases: owner delete" on public.phases
  for delete to authenticated using (public.is_owner());

-- phase_subs (subs added to a phase by name/email/phone)
create policy "phase_subs: staff all" on public.phase_subs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- phase_photos
create policy "phase_photos: staff read" on public.phase_photos
  for select to authenticated using (public.is_staff());
create policy "phase_photos: staff add" on public.phase_photos
  for insert to authenticated with check (public.is_staff());
create policy "phase_photos: owner delete" on public.phase_photos
  for delete to authenticated using (public.is_owner());
create policy "phase_photos: sub reads own phases" on public.phase_photos
  for select to authenticated using (
    exists (select 1 from public.phases ph where ph.id = phase_photos.phase_id and ph.sub_id = auth.uid())
  );
create policy "phase_photos: sub adds to own phases" on public.phase_photos
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.phases ph where ph.id = phase_photos.phase_id and ph.sub_id = auth.uid())
  );

-- activity_log
create policy "activity_log: staff read" on public.activity_log
  for select to authenticated using (public.is_staff());
create policy "activity_log: staff add" on public.activity_log
  for insert to authenticated with check (public.is_staff());

-- issues / notifications_log: staff only
create policy "issues: staff all" on public.issues
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "notifications_log: staff read" on public.notifications_log
  for select to authenticated using (public.is_staff());

-- job_tokens: no rules on purpose. Only the app's server (service role) reads or writes them.

-- Owner-only money table: the "John view".
create table if not exists public.project_financials (
  project_id     uuid primary key references public.projects(id) on delete cascade,
  contract_price numeric(12,2),
  budget         numeric(12,2),
  cost_to_date   numeric(12,2),
  notes          text,
  updated_at     timestamptz not null default now()
);
alter table public.project_financials enable row level security;
create policy "project_financials: owner only" on public.project_financials
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- Storage: photo files are served by public link; nobody needs to list the bucket.
-- Logged-out uploads go through one-time signed upload slots from the server.
drop policy if exists "Job links can upload photos" on storage.objects;
drop policy if exists "Public can view photos" on storage.objects;
drop policy if exists "Authenticated users can upload photos" on storage.objects;
create policy "phase-photos: staff and subs upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'phase-photos' and public.app_role() in ('owner', 'vp', 'manager', 'sub'));

commit;
