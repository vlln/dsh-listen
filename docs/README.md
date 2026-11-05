# 文档导航

阶段：**DEVELOP**。插件已有实现与本地工程证据；完整工程/效果验收未闭环，未发布。入口以本页和[续接说明](continuation.md)为准，历史计划/实验中的“当前”只代表各自记录时点。

## 当前实现与证据

| 入口 | 用途 |
|---|---|
| [用户说明](../README.md) | 安装、安全、listen参数与summary/full |
| [工程验收状态](engineering-acceptance-status.md) | 通过范围、未完成门槛，不冒称整体PASS |
| [评测结果](evaluation-results.md) | 固定60题各版本、禁bash配对结论及局限 |
| [评测入口](../evaluation/README.md) | 准备、执行、评分、无shell默认与历史命令区分 |
| [DSP方法](dsp-evidence.md) | 数值、稀疏采样、单位及不可推断结论 |
| [待办](backlog.md) | 已完成增量、未验收与待授权事项 |

架构仍为问题无关特征Pipeline：保留原采样率/声道，主Agent解读文本、图像与数值。默认signal/transcript/events，dsp显式选择；summary/full是呈现选项，不是新模型。评测默认使用音频persona、listen/read_image，无bash；不设请求次数上限。模型与评测协议不等同于插件能力。

## 直接子目录

| 目录 | 状态 | 说明 |
|---|---|---|
| [Spec](spec/README.md) | 历史契约 | 设计基线与实现差异入口 |
| [AC](ac/README.md) | 验收基线 | 不因整理而降低验收标准 |
| [ADR](adr/README.md) | 决策记录 | 保留历史提案与固定状态 |
| [Interface](interface/README.md) | 接口记录 | 设计文本与可执行工具入口 |
| [Experiments](experiments/README.md) | 实验记录 | 历史协议、来源与对照设计 |
| [Plans](plans/README.md) | 执行索引 | 各增量计划及报告 |

[愿景](vision.md)、[第一版基线](v1-baseline.md)、[早期方向](direction.md)、[设计审查](feature-design-review.md)保留为设计与历史依据，不替代实现参数或最新一次运行记录。

## 授权与边界

- [验收基线](acceptance.md)不变；设计文档未因此promote，系统阶段未自动推进到RELEASE。
- 真实评测仅按用户逐批授权；历史已授权60题不构成持续调用额度。评分离线，答案不进入Agent工作区。
- 禁止读取凭据/私人录音，禁止擅自下载模型、外发音频或付费/生产安装发布。无shell关闭已观察的HF下载路径，但不是宿主全局禁网/跨case强隔离。
- `.work`是本机忽略证据，不随Git分发；本页关联的可分发报告包含结论，不能只靠本机日志恢复事实。不得整理时删除/搬动历史证据或已有模型。
