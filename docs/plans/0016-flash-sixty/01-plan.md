---
title: 固定60题Flash运行
description: 三域各20题固定哈希选样，修复listen和deepseek-flash，在240请求与逐题10分钟内完成并官方计分。
type: plan
status: pending
created: 2026-11-04T10:52:00Z
---

## 固定与预算

用户批准固定每类型20题。seed=mmau-fixed20-per-domain-v1，按sha256(seed:id)排序每域取20，共60。曝光3个既有开发题、其中1个曾真实预检；其余选中原封存题转为已见，后续不再当封存。选择只依赖ID/域，不根据答案或模型表现。共享音频按hash复用，题干原文/选项顺序/回答协议不改。

每会话600000ms、3音频工具、全批240模型请求，限额耗尽或认证/配额/清理失败立即停。使用deepseek-official/deepseek-flash（用户指定模型，路由可用性由首题实际验证，无额外付费smoke）；不读凭据本体，不静默换模型。当前clamp修复listen完整配置，数据和运行分开保存；3187不动。

## 执行

准备60题并全量检查媒体hash/ffprobe时长（最大30.95075秒），安装当前tarball到独立home，dump配置确认Flash和240预算；离线runner/budget测试完成后固定commit开始。先不读选中答案文本做分析，输出固定后外部summarize和官方CLI评分。总分、三域、难度、子类、完成/超时、调用/耗时/token及缺测回填报告。
