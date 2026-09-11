-- ============================================================
-- 打工人小账本 · Supabase 建表脚本
-- 用法：Supabase 控制台 → SQL Editor → 新建查询 → 全文粘贴 → Run
-- ============================================================

-- ---------- 1. 流水表 ----------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('income', 'expense')),
  amount      numeric(12,2) not null check (amount > 0),
  category    text not null default '其他',
  note        text not null default '',
  occurred_at date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists transactions_user_time_idx
  on public.transactions (user_id, occurred_at desc, created_at desc);

-- ---------- 2. 个人设置表（时薪参数 / 自由基金目标 / 安全垫） ----------
create table if not exists public.user_settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  net_monthly    numeric(12,2) not null default 10000,   -- 到手月薪
  pay_months     numeric(4,1)  not null default 13,      -- 发薪月数（一年发几个月）
  monthly_cost   numeric(12,2) not null default 1500,    -- 月工作成本（通勤+午饭等）
  work_days      numeric(5,2)  not null default 21.75,   -- 每月工作日
  onsite_hours   numeric(4,1)  not null default 9,       -- 每日在场小时
  commute_min    numeric(4,0)  not null default 60,      -- 单程通勤分钟
  overtime_hours numeric(4,1)  not null default 2,       -- 每日加班小时
  freedom_target numeric(12,2) not null default 500000,  -- 自由基金目标
  safety_target  numeric(12,2) not null default 60000,   -- 安全垫金额
  updated_at     timestamptz not null default now()
);

-- ---------- 3. updated_at 自动维护 ----------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch
  before update on public.transactions
  for each row execute function public.touch_updated_at();

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch
  before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ---------- 4. 行级安全：每个人只能读写自己的数据 ----------
alter table public.transactions enable row level security;
alter table public.user_settings   enable row level security;

drop policy if exists "transactions_own_all" on public.transactions;
create policy "transactions_own_all" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_settings_own_all" on public.user_settings;
create policy "user_settings_own_all" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 5. 开启 Realtime（双向同步） ----------
alter table public.transactions replica identity full;
alter table public.user_settings   replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_settings;
exception when duplicate_object then null;
end $$;
