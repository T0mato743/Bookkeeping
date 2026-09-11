import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('缺少 Supabase 配置：请检查项目根目录的 .env 文件')
}

export const supabase = createClient(url, key)
