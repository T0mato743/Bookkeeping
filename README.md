# 打工人小账本 ⏱️

个人工作台：真实时薪计算器 + 10 秒记账 + 月度总结 + 自由基金/安全垫 + 原生 SVG 存款曲线 + 情景模拟。
数据存储在 Supabase 云端（PostgreSQL），邮箱+密码登录，换设备/换浏览器登录同一账号即可同步；开启 Realtime 后多窗口实时双向同步。

## 技术栈

- Vite + React（无其他运行时依赖，图表为手写原生 SVG）
- Supabase：认证（邮箱+密码）+ 数据库（两张表 + RLS）+ Realtime 订阅

## 首次启动（3 步）

### 1. 建表（只需一次）

打开 Supabase 控制台 → **SQL Editor** → New query，把 [`db/schema.sql`](db/schema.sql) 全文粘贴进去，点 **Run**。

如果已经跑过第一版建表，再执行一次 [`db/migration-2.sql`](db/migration-2.sql)（周期自动记账 + 月度预算的升级脚本，包含规则表、流水来源标记、预算字段和幂等的自动补账函数）。

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
| 周期自动记账 | 添加房租/工资等每月固定收支规则，打开应用时云端函数自动补账（幂等，多设备不重复），可停用/删除 |
| 月度预算 | 设置月度预算上限，月度总结卡显示进度，80% 预警、超支红色提醒 |
| 分类饼图 | 本月支出分类环形占比图（原生 SVG） |
| 趋势周报 | 最近 8 周支出柱状图 + 本周对比上周/花销大头/近四周均值 |
| 搜索与筛选 | 记录列表支持按分类/备注搜索、按月和收支类型筛选，显示筛选结果笔数与净额 |
| CSV 导出 | 一键导出全部流水的 CSV 备份（UTF-8 BOM，Excel 直接打开不乱码） |

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
tests/                 回归测试（单元 + 小程序逻辑 + 云端 E2E）
miniprogram/           微信小程序版（与网页共用 Supabase 数据）
deploy/                腾讯云 Windows Server 部署脚本（IIS）
.env                   Supabase 连接配置
```

## 测试

```bash
npm test                # 单元测试（时薪/统计公式）+ 小程序逻辑测试（模拟 wx API）
node tests/e2e.supabase.mjs   # 云端端到端：注册→设置→增删改查→RLS 匿名隔离
```

> E2E 会真实注册一个测试账号，受 Supabase 邮件频控限制（约每小时 2 次），失败请隔一小时再跑。

## 微信小程序版

`miniprogram/` 目录是原生微信小程序，**与网页版共用同一个 Supabase 项目和账号体系**：
网页注册的账号可以直接在小程序登录，两端的记账和设置实时共享同一份数据。

本地运行：

1. 用微信开发者工具「导入项目」选择 `miniprogram/` 目录（AppID 选「测试号」即可）
2. 详情 → 本地设置 → 勾选「不校验合法域名」（开发阶段）
3. 正式发布前，在微信公众平台 → 开发管理 → 服务器域名，把
   `https://hjcdzoxwkaxikfrbhgry.supabase.co` 加入 **request 合法域名**，并注册自己的 AppID

## 服务器部署（腾讯云 Windows Server + IIS）

站点根目录为 `C:\www\workbuddy`，更新版本：

```bash
npm run build
scp -r -i %USERPROFILE%\.ssh\tencent_deploy dist\* Administrator@203.195.191.187:C:/www/workbuddy/
```
