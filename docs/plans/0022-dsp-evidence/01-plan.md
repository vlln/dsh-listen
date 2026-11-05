---
title: 零新增依赖DSP证据
description: 通过现有FFT和受管worker补充问题无关数值特征
type: plan
status: done
created: 2026-11-05T06:25:00Z
---

## 范围

用户批准频谱峰/频带能量、音高/chroma、起音/节拍候选，运行时不增加依赖；可选librosa仅考虑参考，不安装。PTY由用户处理。说话人分段/语义音频问答、发布、真实benchmark不在范围。

## 实施与验证

1. 保持默认signal/transcript/events；新增显式dsp和数值band参数，复用授权、解码、缓存、受管worker。
2. 频谱最多300窗，音高最多200窗，保留原采样率与可审计声道聚合；输出真实方法、抽样覆盖与限制。
3. 用合成正弦、双音、click、相消、多声道、偏置、短片段及最大样本预算验证；独立审查数值误导和资源边界。
4. 公开缓存音频仅本地复放；已存在SciPy用于独立双音功率比例核对，未安装librosa。
5. 完整feature gate及文档/代码分别提交；不宣称效果增益。
