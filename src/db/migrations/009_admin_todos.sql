-- Admin todos: feature ideas and planning items for the developer
create table admin_todos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null default '',
  status text not null default 'idea' check (status in ('idea', 'planned', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  plan_prompt text,  -- stores the generated prompt (optional, for reference)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Only service_role can access (admin API routes use createAdminClient)
alter table admin_todos enable row level security;
