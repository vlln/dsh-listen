---
title: 项目收敛与收官核对
description: HEAD全部门禁复测、四次真实评测汇总、证据索引与分支处置，以及仍然开放的验收门槛。
type: report
status: complete
created: 2026-11-06T04:30:00Z
---

# 0035 项目收敛与收官核对

用户指示收尾：跑全实验、出结果后汇总、收敛项目。按用户选择，收官批次**不重跑**，复用0035正式run（当前HEAD代码）；分支**保持不合并**，只收敛文档。未推送、未合并main、未打tag、未发布、未更新3080/3187。

## 收官代码与全部门禁

分支`perf/0034-image-desc-mel-eval`，HEAD `270b1ae`（+本记录提交）。2026-11-06 全量复测：

| 门禁 | 命令 | 结果 |
|---|---|---|
| 静态检查 | `npm run check` | 通过 |
| 单元+覆盖率（权威） | `npm run test:coverage`（含runtime loader） | 302项，300通过，0失败，2跳过（真实ASR、可选计时）；源覆盖率门禁通过 |
| 单元（无runtime） | `env -u DSH_RUNTIME_ROOT npm run test:unit` | 302项，295通过，0失败，7跳过 |
| 评测/基础设施 | `npm run test:infra` | 13/13通过 |
| 真实运行时系统测试 | `node --import ./test/helpers/register-runtime.mjs --test test/system/*.test.mjs` | 13/13通过 |

跳过的3个真实运行时用例只在同时设置`DSH_RUNTIME_ROOT`与loader时才执行；否则跳过。若只导出`DSH_RUNTIME_ROOT`而不加loader，这3个用例会失败——这是调用方式差异，不是代码缺陷，权威门禁是`test:coverage`。

### 体积预算（验收A项，本次复测）

`npm run check`输出：`{"source_files":33,"dependency_bytes":673215,"dependency_limit":5242880,"package_bytes":45107,"package_limit":1048576}`。

| 项 | 预算 | 实测 |
|---|---|---|
| 自有npm压缩包 | ≤1MiB（1,048,576） | 45,107字节（44KiB） |
| 默认依赖解包闭包 | ≤5MiB（5,242,880） | 673,215字节（657KiB）；主体是pngjs |

FFmpeg及可选ASR/events模型单列，默认不下载。

## 真实评测汇总

固定`mmau-fixed20-per-domain-v1`、`deepseek-official/deepseek-flash`、并发10、无请求次数上限、离线安装本地tarball、先盲态分析后评分；本地匹配与固定官方Python scorer一致。

| 批次 | 代码 | 截止 | 总体 | sound/speech/music | 完成/超时 |
|---|---|---:|---:|---|---|
| 0032 | `6db79c8` | 600s | 49/60 | 17/15/17 | 57/3 |
| 0034a | `9b7af70` | 300s | 48/60 | 18/15/15 | 57/3 |
| 0034b（同代码重复） | `9b7af70` | 300s | 48/60 | 15/16/17 | 59/1 |
| **0035（收官记录）** | `270b1ae` | 300s | **48/60** | 15/17/16 | 58/2 |

逐题：44题三次300s批次全对、7题全错、9题不稳定；同代码两次逐题一致54/60。详细解释与错误构成见[评测结果](../../evaluation/results.md#五分钟截止下的重复批次300000ms)与[0034报告](../0034-image-desc-mel-eval/README.md)。

## 证据索引

| 内容 | 位置 |
|---|---|
| 0032正式/预检/诊断 | `.work/evaluation/experiments/0032/` |
| 0034a与重复批次 | `.work/evaluation/experiments/0034/`（`compare.json`、`official-report.txt`、`formal-blind/`、`replicate-*`） |
| 0035正式/预检 | `.work/evaluation/experiments/0035/` |
| 复测日志 | `.work/final-{check,unit,infra,system,coverage}.log` |

`.work`是本机忽略证据，不随Git分发；可分发结论在本页与上述报告中，不依赖本机日志恢复事实。

## 分支处置

实验分支**保留、不合并**（符合项目gitflow与用户本次选择）：`spike/0032-audio-evaluation`、`perf/0033-path-image-deadline`、`perf/0034-image-desc-mel-eval`。`develop`仍在`eb8fb78`，`main`仍在初始化锚点；未推送远程。后续若要发布，需要人类明确批准合并与tag。

## 位置与归档判断

项目留在 `Workbench/20261103-dsh-listen`，不搬到 `Projects/`：冻结run记录的是绝对路径的worker home与冻结文件哈希，搬家会让已有证据无法重放；且本机数据集3.9G属于一次性评测资产，不随代码迁移。若将来归档，须连同证据一起移动并重新冻结新run，不改写历史记录。

> 2026-11-06 更新：用户批准迁移，项目已移到 `Projects/DshPlugins/dsh-listen`（含 `.work`）。代价如上述：既有冻结run的绝对路径记录指向旧位置，重放前需重建worker home；历史记录与分数不改写。

## 仍然开放的门槛

- **效果B未通过**：缺有效同模型无音频baseline。用户已取消no-audio对照，故路线内没有计划中的实验；48/60不是增益证明，也不恢复已取消条件。
- 强读取/网络/跨case隔离、任意后代进程回收、GUI手动安装验收、跨平台与完整RSS、供应链/模型许可专项：仍未完成，见[工程状态](../../project/engineering-acceptance-status.md)。
- 音乐长探索题（`8ee655ce`、`40dd3406`）在多个批次反复用满截止；若要改善需研究探索策略，超出工具面范围，待用户决定。

## 复现要点

`DSH_RUNTIME_ROOT`、`DSH_LISTEN_EVENT_PYTHON`、`DSH_LISTEN_EVENT_MODEL`指向本机既有资产；prepare/run-batch需`--import ./test/helpers/register-runtime.mjs`；冻结run不接受命令行`--concurrency`（会报`FROZEN_EXPERIMENT_OVERRIDE`）。
