---
title: 三轮实验准备
description: 固化矩阵配置元数据、本地fixture及分离盲态和配对分析
type: plan
status: done
created: 2026-11-05T11:26:42Z
---

## 授权

用户要求开始先前低成本准备；不启动真实模型评测、不下载模型、不外发音频、不修改3187体验站。

## 执行项

1. 三臂统一极简persona，summary/no-audio/full；固定60题、并发10、600000ms，不限制请求次数。
2. 准备器只复制题面和媒体，保存hash/配置快照、commit、模型/工具面；no-audio不复制媒体，无工具。
3. 本地loopback合成fixture验证实际persona/schema/默认输出和评分sentinel隔离；总截止不随进度延长。
4. 盲态轨迹与答案后配对成绩分开；保留未知值、失败和全量分母。
5. 独立审查、特性门禁、准备真实输入的未执行批次，记录结果，不生成新成绩。
