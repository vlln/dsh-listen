---
title: ASR 时间戳局部降级
description: 保留合法全文，裁剪重叠时间段，丢弃不可用的可选段并报告计数。
type: plan
status: done
created: 2026-11-05T06:09:19Z
---

## Context

共享 ASR 解析器遇到越界或损坏的可选 segment 会拒绝完整转录。用户要求对短裁剪音频的模型时间戳误差做局部降级。

## Request / Output Format

保留 `data.text`；有限、有序且与音频有正重叠的段裁剪至相对 `[0,duration]`，再转换为源绝对偏移。无效对象/文本/时间或无正重叠的段丢弃，不编造时间；报告 `timing_adjustments.adjusted_segments` / `discarded_segments` 以及条件性 limitation。有效段仍标 estimated，无有效段仍标 unavailable。

## Constraints / Checkpoint

保留顶层文本、段数组数量及网络/子进程响应大小限制；不改变已冻结权威文档，不执行 PTY、生产部署或真实 benchmark，不读取凭据/私人录音。计数为段数而非端点数。超过大小限制或顶层 schema 错误依然拒绝。

## Steps

1. 先写短音频 overshoot、负起点、坏段/null、无可用时间、绝对 offset、正常路径与安全边界回归，记录修复前失败。
2. 实现共享解析器局部容错；不改 provider 传输边界。
3. 执行相关离线测试及静态/diff 检查；代码与文档分别提交，Report 写实测与未执行项。
