# MMAU 评测适配器（本轮未真实跑分）

`protocol.mjs` 固定分层 dev/test、隔离题干/答案，并把所有预定题（含失败）纳入分母。Agent 输入仅 id/audio_id/question/choices；task/answer/difficulty/sub-category 仅在外部评分器，工具提取不读题目或选项。keys 及评分导出不得放入 Agent 工作区。

新批次的项目内目录、逐题10分钟总截止与失败留档见[批次约定](batch-layout.md)；旧preview runner不作为新10题批次入口。

## 后续主模型

用户指定后续使用 `deepseek-flash`。模型选择覆盖见[model.patch.yml](model.patch.yml)，使用宿主内置 `deepseek-official/deepseek-flash`；认证仍由DSH服务处理，首次真实运行前核验可用性，不静默回退其他模型。旧gpt-6.1-sol批次和配置不改写；切换主模型后需要重新建立参考结果，不与旧模型分数直接归因为工具差异。当前只固定配置，未发起flash请求。

## 题目与批处理

`headless-adapter.mjs` 保持官方 question 和 choices 的原文与顺序，不添加零基索引，不要求模型返回 JSON。要求最终回答为完整选项文本；从 headless `final.text` 原样记录为 `model_output`，不把字母/数字/JSON 反解为答案，不清洗解释或矛盾内容。题面仅含问题、选项、音频路径与完整选项文本回答指令；工具上限仍由运行时执行（每题 3 次），不混入题面，音频/任务按题隔离。该回答指令是本项目适配，并非官方发布的唯一推理 prompt。

用户指定入口为隔离 DSH headless profile/preset，复用 DSH 既有模型路由；不另建主模型服务。baseline/aggregate/split 使用相同模型、设置和预算，记录 JSON 工具轨迹。执行仍须已有批次授权及请求硬预算，不因协议修改追加任何真实调用。本轮没有运行准备脚本、runner、数据下载或真实模型；旧开发运行使用旧 JSON 协议，不与新协议混用，也不自动重用首个历史运行。准备产物记录 plain-text 协议版本和 task SHA256；runner 在任何配置写入或调用前核验全部题面，旧 manifest 或被改动题面直接拒绝。改动不刷新已生成的本地工作区或 keys；后续获准运行前需重建准备产物（旧 keys 未保留 difficulty）。

## 每次运行的汇总

入口：[summarize-run.mjs](summarize-run.mjs)，字段和命令见[汇总格式](summary-format.md)。命令：`node evaluation/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH`。它只读取已落盘结果和外部标注，不发起模型请求。

离线汇总以固定manifest为分母，读取run内逐题result和共享数据集外部keys；不依赖模型，不修改原始回答。MMAU维度包括总体micro accuracy、sound/music/speech、easy/medium/hard及sub-category，均同时报告correct/total；没有样本的组不写伪0%成绩。工程指标包括完成/超时/失败/未运行、耗时分布、模型请求、工具调用及token，并报告缺测覆盖。官方scorer输入始终包含每个预定ID，失败model_output为空串。本地摘要与官方CLI输出分开标记。

## 外部评分与官方依据

缓存官方源码对应 [Sakshi113/MMAU@110127f54c0dfba3faa5ec9feee4a7e4148679c5](https://github.com/Sakshi113/MMAU/tree/110127f54c0dfba3faa5ec9feee4a7e4148679c5)。已读官方 README、scorer 与缓存 schema；未展开封存题目/答案。

- [官方 README](https://github.com/Sakshi113/MMAU/blob/110127f54c0dfba3faa5ec9feee4a7e4148679c5/README.md)：“additional key named 'model_prediction'”。
- [实际 scorer](https://github.com/Sakshi113/MMAU/blob/110127f54c0dfba3faa5ec9feee4a7e4148679c5/evaluation.py#L55)：“output_key = 'model_output'”；以可执行脚本字段为准。脚本要求 answer/task/difficulty/choices，可选 sub-category；缺少 model_output 会跳过该题。
- [官方媒体来源](https://huggingface.co/datasets/gamma-lab-umd/MMAU-test-mini)：已缓存 schema 有 instruction/choices/answer/other_attributes；准备阶段维持官方 GitHub question/choices，并按 id 核对媒体。未追加下载。

`score-preview.mjs` 向工作区外的受限文件导出每个 mode 的 scorer 行，保留评分必需元数据，每道预定题都写 model_output；失败/缺失为 `''`，防止官方脚本跳过失败。JS 匹配仅为本地摘要；离线合成用例可与缓存 Python string_match 对照，不 vendor 官方文件、不引入 Python 依赖。

不宣称官方完全等价：目前仅有限合成用例，未在全数据上对照官方 CLI、Unicode/tokenization 全边界或官方榜单；原始标注的其他非评分字段未完整保留。完整榜单/正式效果、不同媒体版本等价性及既有开发污染仍须单独核验；970 封存子集不冒称官方 1000 题榜。
