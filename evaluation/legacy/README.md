# 历史工具（非默认入口）

本目录保留历史实现，不授权执行、下载或推理。新run使用[CLI](../cli/README.md)。旧生成overlay/execute脚本可能含已迁移绝对路径及旧工具面；复现方法见[迁移说明](../../docs/guides/directory-layout.md)，不就地改写历史产物。

| 文件 | 历史职责 |
|---|---|
| [prepare-fixed-sixty.mjs](prepare-fixed-sixty.mjs) | 固定60题与旧配置准备，仍含历史runtime/预算元数据 |
| [prepare-reference-batch.mjs](prepare-reference-batch.mjs) | 旧十题准备，非日常create-run替代 |
| [prepare-headless-workspaces.mjs](prepare-headless-workspaces.mjs) | preview工作区生成 |
| [extract-preview.mjs](extract-preview.mjs) | preview媒体提取 |
| [run-preview.mjs](run-preview.mjs) | 原9任务预检执行，依赖本机历史patch |
| [score-preview.mjs](score-preview.mjs) | preview外部评分导出 |
| [request-budget.mjs](request-budget.mjs) | 无操作兼容，不执行请求上限 |
| [request-budget.patch.yml](request-budget.patch.yml) | 历史预算patch入口 |
| [restrict-headless.mjs](restrict-headless.mjs) | 旧工具拦截名称的无操作兼容 |

原始记录见[历史评测文档](../../docs/archive/evaluation/README.md)。旧3/40/240限制不成为当前默认，不自动重用旧准备器生成新配置。
