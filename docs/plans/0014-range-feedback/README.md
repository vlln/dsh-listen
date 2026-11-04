# 范围反馈修复与后续模型切换

分支 `fix/0014-range-feedback`，用户要求先修复两次INVALID_RANGE，后续用deepseek-flash。本轮不运行新评测、不修改旧批次或3187实例。

## 诊断与修复

旧批次两个音乐case均10秒，Agent分别猜to20/to25，解码器按已批准契约拒绝越界，并非FFmpeg错算时长。缺陷是首次参数指导不足、错误只有裸INVALID_RANGE，没有时长/恢复信息。保留严格范围语义，不静默截断、不增加metadata工具或重复预检调用。

工具说明明确首次≤60秒概览省略from/to，不猜to；后续按返回source.duration_seconds/coverage选范围。解码阶段范围错误保留INVALID_RANGE，并包含requested from/to、probe duration_seconds、60秒上限和省略to/合法区间提示；附code/details便于以后结构化消费。参数级非法数字仍在normalizeRequest前置拒绝，不为错误输入先读音频。

## TDD与验证

新增真实FFmpeg范围诊断测试先失败（裸错误不含duration），修改后针对decode/tools14/14通过。最终完整feature gate171项170通过、0失败、1可选真实ASR跳过，覆盖门禁通过；decode行100%/分支91.07%，包29174字节/默认依赖673215字节。没有通过新模型实跑证明“未来绝不再猜错”，仅验证指导和恢复信息。

## 模型

后续模型选择固定[model.patch.yml](../../../evaluation/model.patch.yml)内置deepseek-official/deepseek-flash；prepare-reference-batch默认元数据同步。不改历史gpt-6.1-sol运行/overlay，不将跨主模型分差归因于工具。不读取凭据，不测试真实flash请求；首次新批次需核验路由认证，不静默回退。
