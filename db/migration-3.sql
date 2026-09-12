-- ============================================================
-- 打工人小账本 · v3 小升级
-- 周期记账日期放开到 1~31：当月没有该日时记在当月最后一天
-- （如 2 月的 29 号 → 2/28 记账，云端补账函数已按此逻辑处理）
-- 用法：Supabase 控制台 → SQL Editor → 粘贴全文 → Run
-- ============================================================

alter table public.recurring_rules
  drop constraint if exists recurring_rules_day_of_month_check;

alter table public.recurring_rules
  add constraint recurring_rules_day_of_month_check check (day_of_month between 1 and 31);
