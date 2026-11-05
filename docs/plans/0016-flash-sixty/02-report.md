---
title: Flash固定60题运行报告
description: 三域各20固定样本的主模型Flash完整listen参考配置，官方评分和工程审计。
type: report
status: complete
created: 2026-11-04T11:00:00Z
---

## 固定条件与证明

执行commit0a2af54，插件clamp修复后的完整listen，deepseek-official/deepseek-flash。seed=mmau-fixed20-per-domain-v1，按sha256(seed:id)排序每域取20，实际60题含3个旧开发题/1个旧真实预检题，曝光单列。新选原封存题已使用后不得再算封存。题干原文/顺序不改，case只读共享，媒体hash复用，不按run复制。

每会话600000ms，每题3音频调用，全批240请求；新runner/budget/restriction22/22合成回归通过（含10/60授权配对、240/241硬限额、实际overlay解析、凭据/模型错误停止、session ID留档）。60题ffprobe均≤60秒，最大30.95075；当前插件包和官方scorer指纹、提取器标识留run config。首题实际Flash成功后继续，不额外调用smoke。

本批独立home、DSH自己读取已批准store，代理未读取凭据本体；未修改3187。原始音频仅本地提取，文本/图像证据发主模型。批次结果冻结后才外部计分；旧gpt模型70%不作为同模型增益基线。

## 运行中观察（不改条件）

Flash部分会话在工具限制拒绝后反复调用bash/read_image或超出3次listen配额，导致单题模型请求超过4（全批240仍硬限制）。不在批中修改提示词、隐藏工具列表或额外给预算；失败请求纳入成本。当前模型可见工具schema但pre-execute拒绝非listen，故这属于宿主评测配置的体验局限，也可能影响结果，不将拒绝次数等同音频提取器计算失败。

新增只读格式审计发现60题中4个speech样本为48kHz/6声道，超出现实现mono/stereo支持范围；准备前只检查了时长，未把声道数纳入准入，是准备器遗漏。原始输入/题单不替换、不偷偷downmix，保留unsupported失败及请求代价。完整题单仍为分母，最终需区分“会话有回答”与“成功取得音频证据”。

## 结果

到240请求硬限额停止，44题启动、43complete、1failed、16not_run、0timeout。43/60（71.67%）是会话完成覆盖；40/60（66.67%）成功取得至少一次listen证据（sound20、speech16、music4），四个speech会话仅基于题面等回答，不能视为听懂。官方CLI实际exit0，与本地摘要一致31/60（51.67%）；sound16/20（80%）、speech13/20（65%）、music2/20（10%）。音乐实际仅4启动/3完成，16未运行由领域顺序和全局预算造成，不可用10%判断音乐能力。已完成条件正确率31/43（72.09%）仅辅助，不替代全计划分母。

耗时44会话累计2088.310秒，均值47.462秒、中位28.661秒、P95152.788秒、最大222.983秒（均未达600秒）。请求240，工具尝试222：listen148次（77completed/71error），非listen74次全部拒绝。错误码：TOOL_NOT_ALLOWED74、TOOL_LIMIT52、PARAMETER_NOT_APPLICABLE6、UNSUPPORTED_AUDIO12、INVALID_SOURCE1。无INVALID_RANGE，clamp修复未再出现原错误。listen失败包含限额/参数/格式，不全是计算故障。

token累计：input804892、output256609、cache_read4059520，43/60会话有完整相关计数，其余17缺测；来源为DSH step_end计数，不推账单，不额外加cache到input。63个工具结果在JSON展示截断，不据此推模型上下文截断。

## 证据与结论

以下为本机忽略证据路径（相对项目根，不随Git分发），不是干净克隆可访问的文档链接：

- 运行清单：`.work/evaluation/runs/2026-11-04T10-55-37-135Z-flash-reference60-9ebfa91e/manifest.json`
- 官方评分原文：`.work/evaluation/runs/2026-11-04T10-55-37-135Z-flash-reference60-9ebfa91e/scoring/official-report.txt`
- 结构化汇总：`.work/evaluation/runs/2026-11-04T10-55-37-135Z-flash-reference60-9ebfa91e/scoring/summary.json`
- 工具审计：`.work/evaluation/runs/2026-11-04T10-55-37-135Z-flash-reference60-9ebfa91e/scoring/tool-audit.json`
- 音频证据覆盖审计：`.work/evaluation/runs/2026-11-04T10-55-37-135Z-flash-reference60-9ebfa91e/scoring/coverage-audit.json`

本次按预设预算执行并停止，但未完成用户期望的全60题实答。禁止自动追加16题或重跑1题，需用户明确授权新的预算。后续优先隐藏不可用工具schema、明确3调用预算及停止策略、处理6声道输入，并用分域轮转避免预算耗尽只伤最后领域；这些改变不得追溯修改本次成绩。没有与同题同模型无工具对照，不证明增益或整体验收达标。
