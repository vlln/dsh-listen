// Regenerates the two MMAU figures in docs/evaluation/.
//   mmau-leaderboard.svg —— test-mini 平均正确率，本项目 vs MMAU 论文结果表
//   mmau-domains.svg     —— 分域对比：本项目 / 人类上界 / 论文最佳其他系统
// 数字来源：论文 arXiv:2410.19168 结果表（论文版本数据）；本项目为 v05.15.25 test-mini 全量实测。
// 解释性文字与限制写在 README 与 docs/evaluation/results.md，图内只保留标签与数值。
import fs from 'node:fs/promises';

const OURS = {label: 'dsh-listen (deepseek-flash + tools)', value: 74.60, ours: true};
// 论文 Test-mini 列（Sound / Music / Speech / Avg）
const PAPER = [
  {label: 'Human', sound: 86.31, music: 78.22, speech: 82.17, avg: 82.23, human: true},
  {label: 'GPT-4o + strong captions', sound: 57.35, music: 49.70, speech: 64.86, avg: 57.30},
  {label: 'Gemini Pro v1.5', sound: 56.75, music: 49.40, speech: 58.55, avg: 54.90},
  {label: 'Llama-3-Ins. + strong captions', sound: 50.75, music: 50.29, speech: 55.25, avg: 52.10},
  {label: 'Qwen2-Audio-Instruct', sound: 54.95, music: 50.98, speech: 42.04, avg: 49.20},
  {label: 'GPT-4o + weak captions', sound: 39.33, music: 39.52, speech: 58.25, avg: 45.70},
  {label: 'Qwen-Audio-Chat', sound: 55.25, music: 44.00, speech: 30.03, avg: 43.10},
  {label: 'SALAMONN', sound: 41.00, music: 34.80, speech: 25.50, avg: 33.70},
  {label: 'MuLLaMa', sound: 40.84, music: 32.63, speech: 22.22, avg: 31.90},
  {label: 'GAMA-IT', sound: 43.24, music: 28.44, speech: 18.91, avg: 30.20},
  {label: 'Random guess', sound: 26.72, music: 24.55, speech: 26.72, avg: 26.00}
];
const OURS_DOMAINS = {sound: 72.97, speech: 82.58, music: 68.26};

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const INK = '#111827', MUTED = '#6b7280', GRID = '#e5e7eb', ACCENT = '#2563eb', HUMAN = '#94a3b8', OTHER = '#cbd5e1';

// ---------- 图一：总分榜 ----------
function overallSvg() {
  const rows = [...PAPER.map(row => ({label: row.label, value: row.avg, human: row.human})), OURS].sort((a, b) => b.value - a.value);
  const width = 880, rowHeight = 32, top = 54, left = 268, right = 76, bottom = 26;
  const height = top + rows.length * rowHeight + bottom, plotWidth = width - left - right;
  const bar = value => Math.max(2, (value / 100) * plotWidth);
  const grid = [0, 20, 40, 60, 80, 100].map(value => {
    const x = left + bar(value);
    return `<line x1="${x}" y1="${top - 10}" x2="${x}" y2="${top + rows.length * rowHeight - 10}" stroke="${GRID}" stroke-width="1"/>`
      + `<text x="${x}" y="${top - 18}" font-size="11" fill="${MUTED}" text-anchor="middle">${value}</text>`;
  }).join('');
  const bars = rows.map((row, index) => {
    const y = top + index * rowHeight;
    const color = row.ours ? ACCENT : row.human ? HUMAN : OTHER;
    return `<text x="${left - 12}" y="${y + 14}" font-size="13" font-weight="${row.ours ? 700 : 400}" fill="${row.ours ? ACCENT : INK}" text-anchor="end">${escape(row.label)}</text>`
      + `<rect x="${left}" y="${y + 2}" width="${bar(row.value).toFixed(1)}" height="17" rx="3" fill="${color}"/>`
      + `<text x="${left + bar(row.value) + 8}" y="${y + 15}" font-size="12.5" font-weight="${row.ours ? 700 : 400}" fill="${row.ours ? ACCENT : INK}">${row.value.toFixed(2)}</text>`;
  }).join('');
  const humanRow = rows.find(row => row.human);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="MMAU test-mini average accuracy">
<rect width="${width}" height="${height}" fill="#ffffff"/>
${grid}
<line x1="${left + bar(humanRow.value)}" y1="${top - 10}" x2="${left + bar(humanRow.value)}" y2="${top + rows.length * rowHeight - 10}" stroke="${HUMAN}" stroke-width="1.5" stroke-dasharray="5 4"/>
${bars}
</svg>
`;
}

// ---------- 图二：分域 ----------
function domainsSvg() {
  const domains = [
    {key: 'sound', label: 'Sound'},
    {key: 'speech', label: 'Speech'},
    {key: 'music', label: 'Music'}
  ];
  const humanRow = PAPER.find(row => row.human);
  for (const domain of domains) {
    domain.best = PAPER.filter(row => !row.human).reduce((best, row) => (row[domain.key] > best.value ? {label: row.label, value: row[domain.key]} : best), {label: '', value: 0});
    domain.human = humanRow[domain.key];
    domain.ours = OURS_DOMAINS[domain.key];
  }
  const series = [
    {key: 'ours', label: 'dsh-listen', color: ACCENT},
    {key: 'human', label: 'Human', color: HUMAN},
    {key: 'best', label: 'best reported', color: OTHER}
  ];
  const width = 760, height = 336, top = 34, left = 56, right = 24, bottom = 66;
  const plotHeight = height - top - bottom, plotWidth = width - left - right;
  const toY = value => top + plotHeight - (value / 100) * plotHeight;
  const groupWidth = plotWidth / domains.length, barWidth = 46, gap = 10;
  const grid = [0, 20, 40, 60, 80, 100].map(value => `<line x1="${left}" y1="${toY(value)}" x2="${width - right}" y2="${toY(value)}" stroke="${GRID}" stroke-width="1"/>`
    + `<text x="${left - 10}" y="${toY(value) + 4}" font-size="11" fill="${MUTED}" text-anchor="end">${value}</text>`).join('');
  const groups = domains.map((domain, index) => {
    const base = left + index * groupWidth + groupWidth / 2 - (barWidth * 3 + gap * 2) / 2;
    const bars = series.map((item, order) => {
      const value = item.key === 'best' ? domain.best.value : domain[item.key];
      const x = base + order * (barWidth + gap);
      return `<rect x="${x.toFixed(1)}" y="${toY(value).toFixed(1)}" width="${barWidth}" height="${(top + plotHeight - toY(value)).toFixed(1)}" rx="3" fill="${item.color}"/>`
        + `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(toY(value) - 7).toFixed(1)}" font-size="12" font-weight="${item.key === 'ours' ? 700 : 400}" fill="${item.key === 'ours' ? ACCENT : INK}" text-anchor="middle">${value.toFixed(2)}</text>`;
    }).join('');
    return `${bars}<text x="${(left + index * groupWidth + groupWidth / 2).toFixed(1)}" y="${top + plotHeight + 24}" font-size="13.5" font-weight="600" fill="${INK}" text-anchor="middle">${domain.label}</text>`;
  }).join('');
  const legend = series.map((item, index) => {
    const x = left + index * 200;
    return `<rect x="${x}" y="${height - 26}" width="11" height="11" rx="2" fill="${item.color}"/>`
      + `<text x="${x + 17}" y="${height - 16}" font-size="12" fill="${MUTED}">${escape(item.label)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="MMAU test-mini accuracy by domain">
<rect width="${width}" height="${height}" fill="#ffffff"/>
${grid}
${groups}
${legend}
</svg>
`;
}

await fs.writeFile('docs/evaluation/mmau-leaderboard.svg', overallSvg());
await fs.writeFile('docs/evaluation/mmau-domains.svg', domainsSvg());
const best = {};
for (const domain of ['sound', 'speech', 'music']) best[domain] = PAPER.filter(row => !row.human).reduce((max, row) => Math.max(max, row[domain]), 0);
console.log(JSON.stringify({overall: 'docs/evaluation/mmau-leaderboard.svg', domains: 'docs/evaluation/mmau-domains.svg', paper_best: best, ours: OURS_DOMAINS}));
