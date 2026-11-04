# MMAU 评测适配器（本轮未真实跑分）

`protocol.mjs` 固定分层 dev/test、隔离题干/答案，并把所有预定题（含失败）纳入分母。Agent 输入仅 id/audio_id/question/choices；task/answer/difficulty/sub-category 仅在外部评分器，工具提取不读题目或选项。keys 及评分导出不得放入 Agent 工作区。

## 题目与批处理

`headless-adapter.mjs` 保持官方 question 和 choices 的原文与顺序，不添加零基索引，不要求模型返回 JSON。要求最终回答为完整选项文本；从 headless `final.text` 原样记录为 `model_output`，不把字母/数字/JSON 反解为答案，不清洗解释或矛盾内容。工具上限仍为每题 3 次，音频/任务按题隔离。该回答指令是本项目适配，并非官方发布的唯一推理 prompt。

用户指定入口为隔离 DSH headless profile/preset，复用 DSH 既有模型路由；不另建主模型服务。baseline/aggregate/split 使用相同模型、设置和预算，记录 JSON 工具轨迹。执行仍须已有批次授权及请求硬预算，不因协议修改追加任何真实调用。本轮没有运行准备脚本、runner、数据下载或真实模型；旧开发运行使用旧 JSON 协议，不与新协议混用，也不自动重用首个历史运行。改动不刷新已生成的本地工作区或 keys；后续获准运行前需重建准备产物（旧 keys 未保留 difficulty）。

## 外部评分与官方依据

缓存官方源码对应 [Sakshi113/MMAU@110127f54c0dfba3faa5ec9feee4a7e4148679c5](https://github.com/Sakshi113/MMAU/tree/110127f54c0dfba3faa5ec9feee4a7e4148679c5)。已读官方 README、scorer 与缓存 schema；未展开封存题目/答案。

- [官方 README](https://github.com/Sakshi113/MMAU/blob/110127f54c0dfba3faa5ec9feee4a7e4148679c5/README.md)：“additional key named 'model_prediction'”。
- [实际 scorer](https://github.com/Sakshi113/MMAU/blob/110127f54c0dfba3faa5ec9feee4a7e4148679c5/evaluation.py#L55)：“output_key = 'model_output'”；以可执行脚本字段为准。脚本要求 answer/task/difficulty/choices，可选 sub-category；缺少 model_output 会跳过该题。
- [官方媒体来源](https://huggingface.co/datasets/gamma-lab-umd/MMAU-test-mini)：已缓存 schema 有 instruction/choices/answer/other_attributes；准备阶段维持官方 GitHub question/choices，并按 id 核对媒体。未追加下载。

`score-preview.mjs` 向工作区外的受限文件导出每个 mode 的 scorer 行，保留评分必需元数据，每道预定题都写 model_output；失败/缺失为 `''`，防止官方脚本跳过失败。JS 匹配仅为本地摘要；离线合成用例可与缓存 Python string_match 对照，不 vendor 官方文件、不引入 Python 依赖。

不宣称官方完全等价：目前仅有限合成用例，未在全数据上对照官方 CLI、Unicode/tokenization 全边界或官方榜单；原始标注的其他非评分字段未完整保留。完整榜单/正式效果、不同媒体版本等价性及既有开发污染仍须单独核验；970 封存子集不冒称官方 1000 题榜。
