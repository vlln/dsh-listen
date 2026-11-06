// Regenerates docs/evaluation/mmau-leaderboard.svg.
// Reference numbers: MMAU paper (arXiv:2410.19168) results table, "Test-mini" column, paper-era data.
// Project number: docs/plans/0037-full-mini-evaluation (official MMAU-v05.15.25 test-mini, official scorer).
// The two groups are not the same dataset revision or system class; the chart says so on its face.
import fs from 'node:fs/promises';

const OURS = {
  label: 'dsh-listen：deepseek-flash + 音频工具',
  value: 74.60,
  note: '本项目 · MMAU-v05.15.25 test-mini · 官方 scorer',
  ours: true
};
// Source: arXiv:2410.19168 results table, Test-mini average column.
const REFERENCE = [
  {label: 'Human (test-mini)', value: 82.23, note: '人类上界，论文报告', human: true},
  {label: 'GPT-4o + strong captions', value: 57.30, note: '纯文本 LLM + 强字幕'},
  {label: 'Gemini Pro v1.5', value: 54.90, note: '音频大模型'},
  {label: 'Llama-3-Ins. + strong captions', value: 52.10, note: '纯文本 LLM + 强字幕'},
  {label: 'Qwen2-Audio-Instruct', value: 49.20, note: '音频大模型 8.4B'},
  {label: 'GPT-4o + weak captions', value: 45.70, note: '纯文本 LLM + 弱字幕'},
  {label: 'Qwen-Audio-Chat', value: 43.10, note: '音频大模型 8.4B'},
  {label: 'SALAMONN', value: 33.70, note: '音频大模型 13B'},
  {label: 'MuLLaMa', value: 31.90, note: '音乐专用 7B'},
  {label: 'GAMA-IT', value: 30.20, note: '音频大模型 7B'},
  {label: 'Random guess', value: 26.00, note: '随机基线'}
];

const rows = [...REFERENCE, OURS].sort((a, b) => b.value - a.value);
const width = 900, rowHeight = 34, top = 96, left = 268, right = 92, bottom = 96;
const height = top + rows.length * rowHeight + bottom;
const plotWidth = width - left - right;
const max = 100;
const bar = value => Math.max(2, (value / max) * plotWidth);
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const accent = '#2563eb', accentSoft = '#dbeafe', ink = '#111827', muted = '#6b7280', line = '#d1d5db', humanLine = '#9ca3af';

const grid = [0, 20, 40, 60, 80, 100].map(value => {
  const x = left + bar(value);
  return `<line x1="${x}" y1="${top - 8}" x2="${x}" y2="${top + rows.length * rowHeight - 6}" stroke="${line}" stroke-width="1" stroke-dasharray="${value === 0 ? '0' : '3 4'}"/>`
    + `<text x="${x}" y="${top - 16}" font-size="12" fill="${muted}" text-anchor="middle">${value}</text>`;
}).join('');

const bars = rows.map((row, index) => {
  const y = top + index * rowHeight;
  const color = row.ours ? accent : row.human ? '#e5e7eb' : '#cbd5e1';
  const labelColor = row.ours ? accent : ink;
  const weight = row.ours ? 700 : 400;
  const barColor = row.ours ? accent : row.human ? accentSoft : color;
  return `<g>`
    + `<text x="${left - 14}" y="${y + 15}" font-size="13.5" font-weight="${weight}" fill="${labelColor}" text-anchor="end">${escape(row.label)}</text>`
    + `<rect x="${left}" y="${y + 2}" width="${bar(row.value).toFixed(1)}" height="18" rx="4" fill="${barColor}"/>`
    + `<text x="${left + bar(row.value) + 10}" y="${y + 16}" font-size="13" font-weight="${weight}" fill="${labelColor}">${row.value.toFixed(2)}</text>`
    + (row.ours ? `<text x="${left + 12}" y="${y + 16}" font-size="11.5" font-weight="600" fill="#ffffff">本项目</text>` : '')
    + `</g>`;
}).join('');

const humanRow = rows.find(row => row.human);
const humanMarker = humanRow
  ? `<line x1="${left + bar(humanRow.value)}" y1="${top - 4}" x2="${left + bar(humanRow.value)}" y2="${top + rows.length * rowHeight - 6}" stroke="${humanLine}" stroke-width="1.5" stroke-dasharray="6 4"/>`
  : '';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="MMAU test-mini 平均正确率对比">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="28" y="36" font-size="19" font-weight="700" fill="${ink}">MMAU test-mini 平均正确率（1000 题）</text>
  <text x="28" y="58" font-size="12.5" fill="${muted}">高亮行为本项目实测；其余为 MMAU 论文结果表 Test-mini 列。两组数据版本与系统形态不同，仅作量级参照。</text>
  ${grid}
  ${humanMarker}
  ${bars}
  <text x="28" y="${height - 56}" font-size="11.5" fill="${muted}">本项目：MMAU-v05.15.25 test-mini 全量 1000 题 · 官方 Python scorer · 74.60%（746/1000）</text>
  <text x="28" y="${height - 38}" font-size="11.5" fill="${muted}">配置：deepseek-flash 主模型 + dsh-listen 工具 · 无 shell · 每题 5 分钟 · 本地自跑，非榜单提交</text>
  <text x="28" y="${height - 20}" font-size="11.5" fill="${muted}">论文数字：arXiv:2410.19168 结果表；论文版本数据、音频模型端到端；题目版本约 25% 不同，不作名次比较</text>
</svg>
`;

await fs.writeFile('docs/evaluation/mmau-leaderboard.svg', svg);
console.log(JSON.stringify({svg: 'docs/evaluation/mmau-leaderboard.svg', rows: rows.length, bytes: svg.length}));
