---
title: 可调证据Pipeline服务
description: 参数验证、有界调用方缓存、解码分析编排与可选能力状态。
type: plan
status: done
created: 2026-11-04T02:30:00Z
---

# Constraints
feat/0003-pipeline-service；不引入question、自动下载或外发。调用方身份/授权由宿主提供，业务请求不可伪造；未配置ASR/events明确unavailable。仅项目合成fixture。

# 步骤
1. 聚合/拆分共用参数规格，未知/不适用字段拒绝。
2. 有界缓存key包括调用方、源hash、范围、有效组件参数与版本；失效/淘汰可测试，每次读取仍重新授权。
3. 编排本地解码与worker，返回完整/部分/失败与实际配置；不假造可选后端能力。
4. TDD/coverage/独立review，满足feature门禁后合并。
