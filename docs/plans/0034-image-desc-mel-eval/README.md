---
title: 图像字段说明、mel提速与五分钟截止真实评测
description: 用户批准的0033后续：字段说明、无损mel优化、三次固定六十题评测及path说明单变量实验。
type: report
status: complete
created: 2026-11-05T18:00:00Z
---

# 0034 图像字段说明、mel提速与真实评测

用户批准：(1) 给 `spectral_detail`/`frequency_range_hz`/`channel_view` 补"只作用于signal_image"说明；(2) 继续mel优化并本地检查6声道长片段；(3) 下一轮真实评测；(4) 后续实验自行安排。分支 `perf/0034-image-desc-mel-eval`，未合并、未推送，未更新3080/3187。

## 代码改动

| 提交 | 内容 |
|---|---|
| `9b7af70` | mel滤波器每次spectrum只校验一次，按非零权重区间求和；三个显示字段说明加 `signal_image only … Does not affect numeric features.`，校验不变 |
| `270b1ae` | `path` 说明加 `required on every call; the source is not remembered between calls.`（0035实验变量） |

### mel优化与无损证据

剖析48 kHz/6声道/10 s signal_image：39 s中24 s在 `validPower`（每帧对128个滤波器各展开一次数组校验），11 s在稠密 `reduce`；FFT仅0.15 s。改为一次校验+非零区间顺序求和。零权重项在有限非负功率下只加+0，求和顺序不变，结果逐位一致。

- 新测试 [mel-efficiency.test.mjs](../../../test/unit/mel-efficiency.test.mjs)：6种采样率×3种FFT×3种功率谱，稀疏与稠密 `Object.is` 逐位相等；48 kHz/6声道/2.007 s三种detail的evidence+PNG及旧preparePlot（含统计）SHA-256等于改动前基线。
- 0033的27组图像哈希仍相等。
- 本地合成 6声道/48 kHz/60 s `selectiveAnalysis(signal_image)`：transient 78.9→1.60 s，balanced 77.8→1.57 s，tonal 79.5→1.52 s，前后输出哈希相同。数值特征不经spectrum.mjs，各在0.07–0.25 s。这是单机合成输入，不含解码/worker启动；但远低于20 s组件上限。

门禁：`gate:feature` 302项，300通过，0失败，2跳过（真实ASR、可选计时），覆盖率通过；真实运行时系统测试13/13。注意 `DSH_RUNTIME_ROOT` 与 `DSH_LISTEN_EVENT_PYTHON/MODEL` 需设置，否则覆盖率门禁因跳过测试而失败（非代码问题）。

## 评测设置

均为固定 `mmau-fixed20-per-domain-v1` 60题、`deepseek-official/deepseek-flash`、并发10、每题300000 ms、无请求次数限制、新worker home离线安装、先盲态封存后评分、官方scorer（SHA256 `85480e1c…`）与本地一致。

| 批次 | 代码 | run |
|---|---|---|
| 0034a | `9b7af70` | `0034/prepared-v2/audio/runs/2026-11-05T17-17-47-319Z-0de4d122` |
| 0034b | 同上，同home，重复 | `0034/replicate-runs/2026-11-05T17-35-24-542Z-cc9fd537` |
| 0035 | `270b1ae`，新home | `0035/prepared-v2/audio/runs/…`（见 `0035/execution-v2.json`） |

0034首次正式启动因传 `--concurrency` 被冻结契约拒绝（`FROZEN_EXPERIMENT_OVERRIDE`），未开始任何session，去掉参数后重跑。预检：0034三题完成，2次漏path；0035两题完成、音乐题超时（与0034a同一长探索题），50次listen 0错误。

## 结果

| 批次 | 正确 | sound/speech/music | 完成/超时 | listen调用 | 模型step | 漏path | 中位/p95/最长 s | session耗时和 s |
|---|---:|---|---|---:|---:|---:|---|---:|
| 0032（600 s，参照） | 49 | 17/15/17 | 57/3 | 504 | 266 | 3 | 25.2/587.6/600.1 | 7655 |
| 0034a | 48 | 18/15/15 | 57/3 | 505 | 235 | 7 | 14.2/233.8/300.1 | 2781 |
| 0034b | 48 | 15/16/17 | 59/1 | 441 | 226 | 19 | 12.3/137.4/300.1 | 2155 |
| 0035 | 48 | 15/17/16 | 58/2 | 485 | 241 | 3 | 9.8/225.8/300.0 | 2609 |

- 三次300 s批次都是48/60（80%）。逐题：44题三次全对，7题三次全错，9题不稳定（sound 4、speech 3、music 2）。同代码两次（0034a/b）逐题一致54/60。单次±1–4题的域内波动是正常的采样噪声。
- 与0032的49/60相差1题，在重复波动内。0032用600 s截止，且0033曾估计按300 s切分上限44/60；实际300 s批次为48，说明Agent在较短时限内多数题能完成。不能把差异归因于单一改动。
- session耗时和下降约65–72%，最长被截在300 s；0032的2次signal_image组件TIMEOUT在三批中均为0。组件与截止两者同时变化，耗时下降不能只归因mel优化。
- 字段说明后，`PARAMETER_NOT_APPLICABLE` 三批均为0（0032为5，均来自一次回复）。
- 漏path：0034a 7次/5题，0034b 19次/7题（其中一题连续13次，多数是第一次调用成功后的第二次调用省略path）。0035加"每次都需要、不会记住"后3次/2题。同代码两次已在7与19之间波动，单次0035不足以证明说明有效，只是方向一致；不影响分数。
- 其余错误为零星参数类型错误（`from`/`to`/`dsp_band_hz` 非数字/数组）、1次未知特征、1次把 `chroma` 当参数名。

## 结论与未做

- mel优化无损，图像组件不再接近20 s上限。
- 300 s截止下成绩稳定在48/60，耗时约为0032的三分之一。
- 未改schema结构（exactly-one source仍由运行时校验），未做附件感知read_image（三批均无read_image调用），未改音乐长探索。音乐超时题（8ee655ce、40dd3406）在多批次中反复超时，若要进一步提升需要单独研究探索策略，但这会涉及工具外的行为，需用户决定。
- 证据保存在 `.work/evaluation/experiments/0034/`、`0035/`（compare.json、official-report.txt、formal-blind/、replicate-blind/）。
