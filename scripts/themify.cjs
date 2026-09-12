// 一次性脚本：styles.css 颜色变量化（跑完可删）
const fs = require('fs')
let s = fs.readFileSync('src/styles.css', 'utf8')
const order = [
  ['--border: #e6e9ee', '__KEEP_BORDER__'],
  ['#f8fafb', 'var(--soft)'],
  ['#f1f3f6', 'var(--soft2)'],
  ['#eef0f4', 'var(--track)'],
  ['#fafbfc', 'var(--input-bg)'],
  ['#f3f4f6', 'var(--hover)'],
  ['#c6cdd5', 'var(--switch-off)'],
  ['#eceef3', 'var(--skel-a)'],
  ['#f6f7fa', 'var(--skel-b)'],
  ['#e4e8ec', 'var(--skel-a)'],
  ['#eef1f4', 'var(--skel-b)'],
  ['#d6dce2', 'var(--border)'],
  ['#e6e9ee', 'var(--border)'],
  ['__KEEP_BORDER__', '--border: #e6e9ee'],
  ['background: #fff;', 'background: var(--surface);'],
]
for (const [a, b] of order) s = s.split(a).join(b)
// 开关的球体保持白色
s = s.replace(
  /(\.switch::after \{[^}]*?)background: var\(--surface\);/,
  '$1background: #ffffff;',
)
fs.writeFileSync('src/styles.css', s)
console.log('switch knob kept white:', /\.switch::after \{[^}]*background: #ffffff;/s.test(s))
console.log('remaining raw #fff count:', (s.match(/#fff\b/g) || []).length)
