---
title: 移除双模式设计
description: 用户要求删除summary/full，统一工具结果并撤销关联实验条件
type: plan
status: done
created: 2026-11-05T12:00:00Z
---

1. 删除evidence_detail、defaultEvidenceDetail、摘要投影实现，不保留隐式双模式。
2. 返回当前请求实际产生的证据，保留短数字及固定声明过滤；计算/缓存/图像不变。
3. 撤销summary/full/no-audio实验条件，准备器只支持audio；旧prepared矩阵不改写，不执行。
4. 更新测试及使用文档，保留历史报告语境；不调用真实主模型、不下载、不改体验站。
