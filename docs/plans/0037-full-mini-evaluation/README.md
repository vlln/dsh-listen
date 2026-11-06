---
title: 官方 MMAU-test-mini 1000 题全量运行
description: 官方千题官方scorer自跑 74.60%，分域/难度/技能分解与可比较边界。
type: report
status: complete
created: 2026-11-06T07:40:00Z
---

# 0037 官方 MMAU-test-mini 1000 题

用户问“能否跑一个完全可比的 1000 题”，随后批准执行（先 3 题预检，再全量，5 分钟截止）。本批是**官方测试集全量**加上**官方 Python scorer**，不是固定开发子集。分支 `feat/0036-installable-plugin`（含本记录），未推送、未合并 main。

## 数据与来源

| 项 | 值 |
|---|---|
| 媒体 | MMAU-test-mini `test_mini.parquet`，1,213,407,227 字节，SHA256 = 官方 LFS `54b76f44…6fde86`（本地复算一致） |
| 题量 | parquet 1000 行；按行解出 1000 条音频，904 个唯一文件（96 条共享同一音频） |
| 题面/选项/答案 | 已有已核 GitHub 标注（`mmau-annotations-api.json`）；题面与标注逐条比对通过 |
| 音频时长 | 唯一文件 ≤34.5 s（中位 10 s，p90 28 s，>30 s 只有 17 条）→ 60 秒区间上限在本批**从未生效**，每题都能一次听完整段 |
| 版本 | 该 HF revision 属于 `MMAU-v05.15.25`（2025-08）修订版；不是论文早期版本 |

新增 `evaluation/datasets/mmau/prepare-mini-full.mjs`：解 1000 题（媒体按 SHA256 校验、题面用已核标注、`task.txt` 与音频哈希写入 selection）。`prepare-experiment.mjs` 的题量守卫从硬编码 60 改为显式 `expectedSamples`（默认 60），本次传 1000。

## 运行条件

与 0032–0035 相同：persona 仅 `You are an Agent`，`deepseek-official/deepseek-flash`，并发 10，每题 300000 ms，无模型/工具请求次数上限，无 shell，只用 `listen`/`read_image`，10 个新 worker home 离线安装 `dsh-listen` 0.1.0（已安装 `src` 与 checkout 逐文件哈希一致）。

- 预检：3 题（每域首题）全部 complete、9 次 `listen`、0 工具错误。
- 正式：1000 个 session，981 complete / 18 timeout / 1 failed。
- 唯一 failed 是 provider 侧 `MALFORMED_RESPONSE: tool input is invalid JSON`，不是插件缺陷；按规则保留在分母。
- 先盲态分析轨迹（`formal-blind/`）再评分，未补跑、未改题。

## 结果

官方 scorer（SHA256 `85480e1c…`）与本地匹配完全一致：**746/1000 = 74.60%**，无缺失预测。

| 视图 | 正确 / 总数 | 正确率 |
|---|---:|---:|
| 全量 | 746/1000 | **74.60%** |
| 排除30道开发题（970封存子集） | 725/970 | 74.74% |
| 排除全部60道曾用于开发的题 | 700/940 | 74.47% |

三个子集几乎相同 → **对已接触题目没有明显过拟合迹象**。

| 域 | 正确 | 正确率 |
|---|---:|---:|
| sound | 243/333 | 72.97% |
| speech | 275/333 | 82.58% |
| music | 228/334 | 68.26% |

| 难度 | 正确 | 正确率 |
|---|---:|---:|
| easy | 169/224 | 75.45% |
| medium | 411/540 | 76.11% |
| hard | 166/236 | 70.34% |

技能极值：`Key highlight Extraction` 21/21、`Multi Speaker Role Mapping` 27/27、`Conversational Fact Retrieval` 21/22、`Phonological Sequence Decoding` 46/49 最好；`Temporal Reasoning` 19/56（33.9%）、`Emotion Flip Detection` 9/20（45%）、`Melodic Structure Interpretation` 16/33（48.5%）最差。

## 成本与运行状态

| 指标 | 值 |
|---|---|
| 完成率 | 98.1%（981/1000），高于验收的 95% 门槛 |
| 工具调用 | 7,047 次 `listen` 等调用；70 次错误（1.0%） |
| 错误构成 | `INVALID_SOURCE` 36（漏 source）、`UNKNOWN_TOOL_ERROR` 20、`INVALID_FEATURES` 5、`PARAMETER_NOT_APPLICABLE` 4、`INVALID_RANGE` 1、`EMPTY_RANGE` 2、`BAND_REQUIRED` 1、`UNKNOWN_PARAMETER` 1 |
| 单题耗时 | 中位 8.6 s、p90 132.9 s、p95 186.2 s、最长 300.1 s；session 时间总和 40,769 s |
| 墙钟 | 约 70 分钟（并发 10） |
| token（999 题有完整用量） | input 12,723,022 / output 5,378,242 / cache-read 52,330,496；分列不互加 |
| 超时题 | 18 题，中位 51 次工具调用 → 长探索，与 60 题批次的失败模式一致 |

## 榜单图（README 首屏）

两张图都由 `docs/evaluation/mmau-leaderboard.mjs` 生成（`node docs/evaluation/mmau-leaderboard.mjs`），图内只放标签与数值，解释文字在 README 正文：

- `mmau-leaderboard.svg`：总分榜。参照行取自 MMAU 论文（arXiv:2410.19168）结果表 **Test-mini 平均正确率**列：Human 82.23、GPT-4o + strong captions 57.30、Gemini Pro v1.5 54.90、Llama-3-Ins + strong captions 52.10、Qwen2-Audio-Instruct 49.20、GPT-4o + weak captions 45.70、Qwen-Audio-Chat 43.10、SALAMONN 33.70、MuLLaMa 31.90、GAMA-IT 30.20、Random 26.00；本项目 74.60% 高亮。
- `mmau-domains.svg`：分域三组柱，每组为 本项目 / 人类上界 / 论文最佳其他系统。论文最佳其他系统（Sound 57.35 / Speech 64.86 / Music 50.98）由脚本在论文行中取最大值，不手填。
- 选 Test-mini 而非 Test 列的原因：我们跑的是 test-mini 分片；BenchLM 等聚合站跟踪 9000 题 test 分片（答案不公开），两者不能并排。
- 版本与形态差异写在 README 正文与[评测结果](../../evaluation/results.md)，不在图内堆文字。

## 可比较边界

- **可以比**：这是官方 1000 题、官方题面/选项、官方 1000 条音频、官方 scorer。和固定 60 题开发子集不同，它是官方测试集全量成绩。
- **不能直接与榜单数字并排**：榜单是对音频大模型的端到端评测，本批是“文本模型 + 工具 + Agent 循环”。同一 benchmark 上不同系统形态不能当同条件。
- **版本差异**：论文时代的参考数字（README 引用 Gemini 1.5 Pro 66.15%、Qwen2-Audio 55.4%）取自早期版本，当前数据是 `MMAU-v05.15.25`（约 25% 问答、5% 音频被修订）；官方榜单表格在页面上是前端渲染，抓取不到数值，因此不做逐名次对比。
- **不是官方提交**：本批是本地自跑，没有提交到 MMAU Eval 空间；不宣称官方名次。
- **没有无音频基线**：不能从 74.60% 推出“工具带来多少增益”；效果 B 门槛仍未关闭。

## 证据

`.work/evaluation/experiments/0037/`：`execution.json`、`preflight-gate.json`、`formal.log`、`formal-blind/`、`prepared-v1/audio/runs/2026-11-06T06-10-07-483Z-71b80f4e/`（含 `scoring/`）、`official-report.txt`、`report.json`（脚本 `report.mjs`）。`.work` 不随 Git 分发，可分发结论在本页与[评测结果](../../evaluation/results.md)。
