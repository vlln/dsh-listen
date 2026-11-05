---
title: 离线批次汇总验证
description: 合成数据验证MMAU指标维度、失败分母、缺测和命令行产物，不代表真实成绩。
type: report
status: complete
created: 2026-11-04T10:10:00Z
---

## 实现

[汇总脚本](../../../evaluation/cli/summarize-run.mjs)读取显式run目录和共享外部keys，不读音频、不调模型、不访问网络。统计MMAU总体micro、领域、难度、sub-category正确率；输出correct/total和fraction，同时留存逐题正确性。完成覆盖、失败/超时/未运行/缺结果分开；耗时median/p95、请求、工具name/status和token都有缺测计数，不把null填成0，不把cache token重复加总。

输出scoring/summary.json、summary.md、predictions.json、official-input.json，独占创建scoring以拒绝覆盖，失败保留原始证据。带答案的official-input只外部评分使用。本地匹配标记official=false、official_scorer_executed=false，不冒称官方CLI已执行；固定版本官方函数有限合成对照不等于全数据兼容性证明。

## 验证与边界

合成回归覆盖完整分母、缺失与晚到timeout回答、原文不转换、metadata/duplicate/unknown拒绝、缺测与显式0、CLI外部标注和路径、产物拒绝覆盖。未读取真实keys或封存答案，无真实请求/下载/旧产物改写，无GUI重启。本单元是评测准备，runner十分钟取消与共享数据迁移仍未实现，不能直接宣布10题批次已启动或跑完。测试命令与计数以最终提交交接为准。
