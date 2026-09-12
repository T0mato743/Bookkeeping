-- ============================================================
-- 打工人小账本 · v2 升级脚本
-- 新增：周期自动记账（规则表 + 自动补账函数）、月度预算字段
-- 用法：Supabase 控制台 → SQL Editor → 粘贴全文 → Run
-- ============================================================

-- ---------- 1. 周期记账规则表 ----------
create table if not exists public.recurring_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('income', 'expense')),
  amount        numeric(12,2) not null check (amount > 0),
  category      text not null default '其他',
  note          text not null default '',
  day_of_month  int not null check (day_of_month between 1 and 28),
  start_date    date not null default current_date,
  active        boolean not null default true,
  last_generated date,
  created_at    timestamptz not null default now()
);

create index if not exists recurring_rules_user_idx
  on public.recurring_rules (user_id);

alter table public.recurring_rules enable row level security;

drop policy if exists "recurring_own_all" on public.recurring_rules;
create policy "recurring_own_all" on public.recurring_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 2. 流水表加 rule_id 来源标记 ----------
alter table public.transactions
  add column if not exists rule_id uuid references public.recurring_rules (id) on delete set null;

create index if not exists transactions_rule_idx
  on public.transactions (rule_id);

-- ---------- 3. 设置表加月度预算字段 ----------
alter table public.user_settings
  add column if not exists budget_monthly numeric(12,2) not null default 0;

-- ---------- 4. 自动补账函数（幂等，防多设备重复生成） ----------
-- 每个设备打开应用时调用一次：为所有启用中的规则补齐从上次生成点到本月的流水
create or replace function public.run_recurring(p_user uuid)
returns integer
language plpgsql
as $$
declare
  r record;
  m date;
  target date;
  total int := 0;
begin
  for r in
    select * from recurring_rules
    where user_id = p_user and active
  loop
    m := date_trunc('month',
      coalesce(r.last_generated, (r.start_date - interval '1 month')::date)
      + interval '1 month')::date;

    loop
      exit when m > date_trunc('month', current_date)::date;

      -- 当月应记日：day_of_month，大月溢出时取当月最后一天
      target := m + least(r.day_of_month,
        extract(day from (m + interval '1 month' - interval '1 day'))::int) - 1;

      if target <= current_date then
        if not exists (
          select 1 from transactions where rule_id = r.id and occurred_at = target
        ) then
          insert into transactions (user_id, kind, amount, category, note, occurred_at, rule_id)
          values (p_user, r.kind, r.amount, r.category, r.note, target, r.id);
          total := total + 1;
        end if;
        update recurring_rules set last_generated = target where id = r.id;
      end if;

      m := (m + interval '1 month')::date;
    end loop;
  end loop;

  return total;
end $$;
