---
title: 可配置ASR API提取器
description: 有界multipart转写、PCM WAV编码、时间映射和外发准入。
type: plan
status: pending
created: 2026-11-04T03:02:00Z
---

# 范围
feat/0005-asr-api，Node内建fetch/FormData无新依赖；不收question/prompt，不读取真实key。先loopback契约TDD，真实ASR/费用/公开音频外发必须另外明确授权和配置。

# 步骤
1. 独立mono WAV编码，保持无AGC，不直接把native音频伪装16k；API支持原sr或显式可验证重采样另定。
2. endpoint/外发/redirect/请求响应限额/超时取消/数据schema检查。
3. provider版本/可用状态接Pipeline，配置不全不假称支持。
4. 独立review及feature门禁后合并，真实能力验收后续单独留证。
