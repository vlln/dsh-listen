---
title: 正式ASR API开发记录
description: 原生采样率PCM16序列化首单元通过，尚未请求真实后端。
type: report
status: draft
created: 2026-11-04T03:06:00Z
---

# 前置
DSH工具feature最终实际SDK gate106/106 PASS后合并develop；此分支只做ASR API。不装本地模型，不读key、不调用公网模型。

# WAV序列化
TDD三项通过：原生sr写WAV header、显式算术mono（无需假装重采样16k）、PCM16量化及对相消的限制、原通道超满量程拒绝而非clip/AGC。
Node内建Buffer无新增依赖。真实服务须支持所提交sr/PCM16/WAV，未验证不得标兼容。该测试不证明语音转写可用。

# 未完成
API endpoint/授权/限额/响应/offset/取消、用户配置接Plugin和真实能力验收仍待；Goal active。真实API外发与付费需要单独授权。
