---
title: 实验准备验证报告
description: 三臂prepared批次、配置防漂移、合成传输与统一分析结果
type: report
status: complete
created: 2026-11-05T11:26:42Z
---

## 交付

代码提交`af6bc36`。正式步骤见[实验协议](../../evaluation/experiment-preparation.md)。

- [矩阵](../../../evaluation/config/experiment.mjs)：summary/no-audio/full，共用`You are an Agent`，同模型、截止、并发，无次数限额。
- [准备器](../../../evaluation/cli/prepare-experiment.mjs)：题面与媒体hash核验，只复制需要的输入；不读取keys。独立case/session及干净worker homes，不沿用历史受污染case环境。
- [执行器](../../../evaluation/cli/run-batch.mjs)：支持冻结preset，核验绑定配置、manifest、worker profile和安装包文件hash；禁止覆盖冻结并发/home。no-audio拒绝音频文件及音频路径。
- [分析](../../../evaluation/cli/analyze-experiment.mjs)：blind不读keys/scoring；paired只比较既有评分correct，不重解释回答。记录全量分母、改善/退化及双完成子集；新评分产物增加逐case域标记。
- 产品新增部署配置defaultEvidenceDetail，默认仍summary，实验full只改变省略参数时的render，不改变canonical计算/缓存。

## 本机待授权批次

准备根目录为本机忽略的 `.work/evaluation/experiments/0028-prepared`，三臂各60题。每臂424项文件hash已核验，状态均prepared，没有results目录。

| 条件 | 运行标识 |
|---|---|
| summary | 2026-11-05T11-39-08-634Z-d4bcdaff |
| no-audio | 2026-11-05T11-39-08-710Z-59ebd3c7 |
| full | 2026-11-05T11-39-08-768Z-2fc14cf9 |

10个全新私有home使用本地tarball离线安装，未下载模型/依赖。认证仅引用既有DSH凭据路径，未读取或复制凭据正文。现有本地ASR和events配置复用；这些路径/产物不随Git分发。

## 验证

- 最终特性门禁253项，252通过、0失败、1真实ASR跳过；源码覆盖率通过。静态/包大小门禁通过，无新依赖。
- 新三臂真实运行时loopback SSE及总截止测试4/4通过；既有preset测试2/2通过。新fixture首次发现标题生成辅助请求，按精确任务内容识别Agent请求，同时验证全部请求无答案sentinel，未通过筛掉persona/schema失败来取巧。
- 单元合成测试覆盖准备器的3×60个独立目录、无音频分支、禁止历史overlay、ASR/API及split配置拒绝、配置/路径漂移拒绝、分析未知测量/重复/截断/配对ID不匹配。
- 独立审查发现宽松model patch、未绑定配置路径、split及省略ASR模式问题，已收紧为规范model patch匹配、合同hash/所选文件绑定、aggregate和显式local校验。
- 忽略的本机日志：`.work/experiment-feature-final.log`、`.work/experiment-preparation.log`；不作为分发依赖。

## 边界

没有真实主模型推理、没有新成绩、未外发原音频，未更新或重启3187。无shell不是宿主强网络/读取隔离；合同hash防意外漂移，不是抵御恶意改写的签名。worker pool跨臂复用并非完全独立磁盘状态。答案后语义错误分析仍需真实运行完成后人工审查，不由工具状态自动判定。
