# MMAU 评测入口

当前执行入口是[薄批量适配器](thin-adapter.md)，产物布局与截止见[批次约定](batch-layout.md)，原生装配见[preset 使用说明](preset-usage.md)。这里只整理运行方法，不授权新增模型调用、下载、安装或数据外发。

## 当前配置与成绩边界

- 主模型选择为 `deepseek-official/deepseek-flash`，见[模型 patch](model.patch.yml)；认证由 DSH 服务处理，不读取凭据正文，不静默回退。创建 run 不会自动合并该 patch，需在实际 runtime overlay 显式固定同一路由。
- `audio-evaluation` 默认是音频证据 persona、原生 compaction、read_image 和 listen，**没有通用 shell/read/write/edit**。安装版 minimal 含 bash/read_image，但不是当前评测默认。规范来源为[preset.patch.yml](preset.patch.yml)；[evaluationPlugins helper](preset.mjs)从该 YAML 生成完整列表，不从 minimal 重建。
- 旧 runtime overlay 的完整 plugins 列表可能覆盖新默认；新批次必须核对实际装配，不直接复用旧 overlay。历史 run 与 `.work` 配置不迁移、不改写、不自动复跑。
- 模型请求和音频调用均无次数上限；每题总截止固定 `600000ms`。不加载历史请求预算/工具拦截，旧 3/40/240 限额不是当前语义。
- listen 默认 `evidence_detail: "summary"`，可按需用 `"full"` 取更细证据；这是模型可见证据呈现，不是[离线运行汇总](summary-format.md)。persona/summary 后续变更尚无效果评测，不能沿用旧成绩。

已完成批次的权威成绩、代码/配置条件与未评测边界见[评测结果](../docs/evaluation-results.md)。历史预检和早期 Flash 批次不等于当前默认已验收，不以私有 `.work` 路径作为唯一可分发成绩入口。

## 题面、执行与评分

[protocol.mjs](protocol.mjs)固定分层 dev/test、隔离题干/答案，把所有预定题（含失败）纳入分母。Agent 输入仅 id/audio_id/question/choices；task/answer/difficulty/sub-category 仅供外部评分器，工具提取不读问题或选项。keys 和评分导出不得放入 Agent 工作区。

[headless-adapter.mjs](headless-adapter.mjs)保持官方 question/choices 的原文和顺序，不加零基索引或 JSON 回答要求，只要求最终返回完整选项文本。headless `final.text` 原样记为 `model_output`；不反解字母/数字/JSON，不清洗解释或矛盾内容。此指令是项目适配，不是官方唯一推理 prompt。

每题独立 DSH 会话，复用已安装的隔离 DSH_HOME 和固定题单，不另建主模型服务。baseline/aggregate/split 对照须显式保持同模型、设置和截止，并记录工具轨迹。runner 在启动前核验全部题面的 plain-text 协议及 task/audio SHA256；旧 manifest 或变动资产会拒绝执行。不能把旧 JSON 协议轨迹与当前协议混算。

[离线汇总 CLI](summarize-run.mjs)只读已落盘 run 与外部 keys，不发起模型请求：

```sh
node evaluation/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH
```

汇总覆盖总体、域、难度、子类及完成/超时/失败/缺失、时延、观测请求数、工具、token；保留测量缺失，不伪造零。详见[汇总格式](summary-format.md)。所有预定 ID 均导出给官方 scorer，失败回答为空串；本地字符串匹配与官方 CLI 输出分开标记。

## 历史资料索引（非当前命令/授权）

- [headless 装配提案](headless-plan.md)：早期认证与隔离设计。
- [媒体准入](dataset-admission.md)、[获取记录](acquisition-status.md)、[输入准备](preparation-report.md)：来源、hash 与版本差异证据。
- [preview 授权](preview-authorization.md)、[前置记录](preview-setup-report.md)、[三样本结果](preview-results.md)、[阶段选择](next-stage.md)：原 9 任务预检及当时授权，不据余额追加任务。
- [早期 Flash60 报告](../docs/plans/0016-flash-sixty/02-report.md)：旧拦截配置的留档，不是修复后 preset 或新 persona/summary 的效果证据。

这些文件保留原分数与历史实测，不搬动或删除；其中的“本轮/下一轮/当前”和命令按其历史上下文理解。

## 文档核对记录

2026-11-05 整理时先读完本目录全部13份Markdown，核对其中52个本地Markdown链接目标与6处Node命令脚本路径，未发现目标缺失；仅核文件存在，不代表外部URL可达或锚点/私有产物在其他机器可用。命令参数按create-run/run-batch/summarize-run源码核对，未执行runner、下载或模型请求。发现并澄清：create-run不自动合并模型patch、不自动保存overlay/dirty/包版本快照；旧prepare脚本仍含历史预算及runtime路径；旧overlay可能覆盖新preset。上述实现限制保留，不以文档整理冒称已修复。

## 外部评分与官方依据

固定官方源码：[Sakshi113/MMAU@110127f54c0dfba3faa5ec9feee4a7e4148679c5](https://github.com/Sakshi113/MMAU/tree/110127f54c0dfba3faa5ec9feee4a7e4148679c5)。

- [官方 README](https://github.com/Sakshi113/MMAU/blob/110127f54c0dfba3faa5ec9feee4a7e4148679c5/README.md)：“additional key named 'model_prediction'”。
- [实际 scorer](https://github.com/Sakshi113/MMAU/blob/110127f54c0dfba3faa5ec9feee4a7e4148679c5/evaluation.py#L55)：“output_key = 'model_output'”；按可执行字段，要求 answer/task/difficulty/choices，可选 sub-category，缺少 model_output 会跳题。
- [官方媒体](https://huggingface.co/datasets/gamma-lab-umd/MMAU-test-mini)：媒体按 id 对应，题干与选项以已核 GitHub 标注为准，不按物理行序混用版本。

[score-preview.mjs](score-preview.mjs)是历史 preview 的外部导出器，新批次用上述 summarize-run CLI。不宣称本地匹配已在全数据、Unicode/tokenization 全边界与官方完全等价；官方榜单、媒体版本等价性及开发污染仍须单独核验，970 封存子集不是官方 1000 题榜。
