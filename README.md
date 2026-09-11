# 打工人小账本 ⏱️

个人工作台：真实时薪计算器 + 10 秒记账 + 月度总结 + 自由基金/安全垫 + 原生 SVG 存款曲线 + 情景模拟。
数据存储在 Supabase 云端（PostgreSQL），邮箱+密码登录，换设备/换浏览器登录同一账号即可同步；开启 Realtime 后多窗口实时双向同步。

## 技术栈

- Vite + React（无其他运行时依赖，图表为手写原生 SVG）
- Supabase：认证（邮箱+密码）+ 数据库（两张表 + RLS）+ Realtime 订阅

## 首次启动（3 步）

### 1. 建表（只需一次）

打开 Supabase 控制台 → **SQL Editor** → New query，把 [`db/schema.sql`](db/schema.sql) 全文粘贴进去，点 **Run**。

脚本会创建：
- `transactions` 流水表（金额、类型、分类、备注、发生日期）
- `user_settings` 个人设置表（时薪参数、自由基金目标、安全垫）
- 行级安全（每人只能读写自己的数据）与 Realtime 同步配置

> 建议：Supabase 控制台 → Authentication → Sign In / Providers → Email，把 **Confirm email** 关掉，
> 注册后无需去邮箱点确认，个人使用更方便。

### 2. 配置密钥（已完成）

`.env` 里已写入：

```
VITE_SUPABASE_URL=https://hjcdzoxwkaxikfrbhgry.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### 3. 启动

```bash
npm install
npm run dev
```

打开 http://localhost:5173 ，注册一个账号登录即可。

## 功能说明

| 模块 | 说明 |
| --- | --- |
| 真实时薪计算器 | 真实时薪 =（到手月薪×发薪月数 − 月工作成本×12）÷（(在场+加班+往返通勤)×每月工作日×12），公式在卡片里逐步展开；保存后写入 `user_settings` 表 |
| 10 秒记账 | 金额/分类/备注，保存即写云端并乐观更新，立刻换算成「X 小时工作时间」 |
| 最近 4 笔 | 支持编辑（改金额/分类/备注）和删除，全部即时写回 |
| 月度总结 | 本月收入、固定支出（房租/水电煤/话费网费/订阅服务/保险）、弹性支出、结余 |
| 自由基金 & 安全垫 | 总结余对目标的进度条；安全垫月数 = 总结余 ÷ 月均支出 |
| 存款曲线 | 手写原生 SVG：按月累计结余折线 + 自由基金目标线 + 安全垫线 |
| 情景模拟 | 通勤/加班/涨薪三个滑块，实时看真实时薪变化和折合一年的金额 |

## 可靠性设计

- 页面先渲染骨架界面，再异步拉云端数据，不白屏
- 读取失败：页面顶部红色横幅 + 「重试」按钮
- 写入失败：底部黑色提示条显示原因 + 「重试」按钮，本地乐观更新自动回滚，不静默丢数据
- Realtime 订阅：任何设备上的增删改都会即时推送到其他打开的窗口

## 目录结构

```
db/schema.sql          建表 SQL（Supabase SQL Editor 执行）
src/App.jsx            认证、数据加载、Realtime、乐观更新
src/utils.js           时薪/统计/格式化纯函数
src/components/        各功能卡片组件
.env                   Supabase 连接配置
```
