# 真实DSH headless三样本开发预检结果

仅用户批准的3个开发样本×3工具面，非封存/全量MMAU效果验收。主模型deepapi/gpt-6.1-sol，DSH自己解析既有凭据，Agent未读key；ASR已有MLX本地、events项目LiteRT本地。9任务均exit0、final合法；请求硬预算实际16/40，每任务音频调用≤3，无认证/配额失败。

| 面 | 正确/总题 | 最终完成率 | 工具调用 | 说明 |
|---|---|---|---|---|
| 无音频基线 | 2/3 | 3/3 | 0 | sound/speech各对1，music错1 |
| 聚合listen | 3/3 | 3/3 | 4 | music首次请求to20超10秒源长报INVALID_RANGE，Agent自行去除范围后成功 |
| 正交拆分 | 3/3 | 3/3 | 3 | sound/music选audio_events，speech选audio_transcript |

单域只有1题，sound/speech基线已对导致增益0；不能按总差33.3pp声称达到三域正向增益门槛，也不能认为两工具面已统计等价。聚合默认更多特征可能增加代价，分拆按任务选提取器；精确token/组件处理量和费用尚未系统对照，不能仅比较工具数宣布赢家。

## 轨迹与评分
执行时agent工作区不含keys，guard拒绝非音频旁路；输出固定后外部score-preview读取隔离keys计分，未将答案用于提取或模型提示。原始JSON流/预算在忽略工作区，不入库数据。聚合错误路径没有被隐藏，最终成功与工具首次成功率分开报告。

## 已有轨迹成本（无新增模型调用）
按step_end的inputTokens/outputTokens求和，不累加有时含历史累计值的totalTokens：aggregate7步/4工具/1错误，input56804/output143/cache-read26880；split6步/3工具/0错误，input32603/output91/cache-read27648；baseline3步，input26465/output150/cache-read0。cache读另列，不能按input总量直接推费用。headless JSON流的aggregate有2个tool_result被显示截断，不能从流片段推完整组件输出；需读结构化session结果或专门去敏组件计数，不能误当模型也必然被截断。
这些小样本显示聚合有较多输入开销，但不足以定型；协议请求计数16与step数合计16一致。本次不据token猜账单，也不虚构时延p95。

## 后续
这次授权≤9任务已用完，剩余请求额度不等于允许额外任务；不得自动复跑/扩量。正式970封存或1000全集需要先用户批准任务/费用/外发证据预算并固定最终工具面/分析。可以先修复错误反馈增强等工程问题，但不能看封存答案调参。Goal保持active，最终工程/效果未验收。
