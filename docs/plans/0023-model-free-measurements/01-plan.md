---
title: 无新模型测量摘要
description: 复用signal统计及稀疏pitch窗口补能量低能量区间和信号诊断
type: plan
status: pending
created: 2026-11-05T07:30:00Z
---

## 授权及范围

用户批准先做无额外模型下载的可选测量。沿用显式`dsp`，默认signal/transcript/events不变；无新增运行依赖、模型、外发、付费、部署或主模型评测，不处理PTY。

## 审计结论及契约

现有[signal](../../../src/signal.mjs)已有25ms/10ms能量统计、100ms展示bins、DC/近满刻度/立体声关系；[temporal](../../../src/dsp-temporal.mjs)已有稀疏64ms音高候选。因此不重复实现PCM算法，不新增prosody工具或模型调用。

- worker计算现有signal统计，无绘图；用纯摘要函数产出`measurements`，复用算法不复制PCM统计实现。signal与dsp仍为独立缓存组件，同时请求会各算一次统计，不新增跨worker传输和耦合。DSP缓存版本升级，防止旧证据缺少新字段。
- energy用既有100ms展示bins汇总分位数、p90/p10相对dB范围、阈值-60dBFS的低能量区间。区间bin级近似，不称VAD/语音停顿，最多100条，完整总量不因截断改变。
- diagnostics复用channel levels及stereo；近满刻度不等于削波，不输出MOS/自然度总分。
- pitch摘要使用每采样窗首候选，汇总Hz分位数及半音跨度；可用窗比例不是有声占比/概率，不称连续语调。
- 静音/无音高/零分母明确null与原因；保留绝对源时间、单位、方法和限制。ASR派生统计本轮延期，不隐式触发ASR。

## 验证

1. 合成静音、固定/变化音高、增益、DC、反相、低能量区间与截断边界；有限JSON、最大PCM、取消/超时和默认接口回归。
2. 跑既有feature gate，不降低逐文件覆盖率门槛。
3. 已缓存公开三域音频首10秒本地重放，记录实际字段、worker耗时和体积；不是效果评测。
4. 独立审查语义和数值边界；代码/文档分别提交。不推送、不合并main、不发布。
