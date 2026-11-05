---
title: 按需证据验证结果
description: 细粒度请求和选择性数值计算、schema描述及本地验证
type: report
status: complete
created: 2026-11-05T12:00:13Z
---

## 交付

- [特征表](../../../src/features.mjs)定义12个特征及对应描述；[请求校验](../../../src/request.mjs)要求聚合features非空不重复，旧signal/dsp拒绝。
- [工具](../../../src/tools.mjs)description描述各产物；schema标记features required，显示参数仅用于signal_image，dsp_band_hz仅用于band_energy且必填。拆分面audio_signal固定signal_image，audio_transcript/events固定各自特征，audio_dsp要求显式选择数值features。
- [Pipeline](../../../src/pipeline.mjs)按每项选择计算/缓存/返回，输出evidence只含所选key。移除重复requested_parameters，source/coverage保留在公共层。
- [选择性分析](../../../src/selective-analysis.mjs)分离图像/电平/能量/频谱/音高/节奏；image不计算describeSignal，onsets不计算tempo自相关，节奏不算音高，频谱不生成未选产品。pitch统计与pitch_frames逐帧结果独立。
- levels不再返回energy窗分位数与低能量占比，避免与energy重复。保留五位有效数字、声明过滤、完整本次请求产物；无summary/full。
- 旧低层signal/dsp数值入口只保留内部回归兼容，不再暴露为工具features。

## 验证

- 最终全特性门禁256项：255通过、0失败、1真实ASR跳过，源码覆盖率门禁通过。
- 实际安装运行时/本地传输8项通过；额外energy-only真实工具调用通过，图片仅signal_image产生。
- 独立审查指出band_energy缺失band可能报告空ready，补请求层BAND_REQUIRED及聚合/拆分负控；修复后请求层10/10通过。
- 首次门禁两个权限负控先因features缺失被拦，修正测试输入使其到达预期权限边界，不放松校验。
- 本机忽略日志 `.work/selective-features-gate-final.log`；无新依赖和主模型调用。

## 执行边界

每个缺失特征独立调worker并隔离失败/缓存；同时选择相关特征可能重复FFT或统计依赖，尚未做跨worker公共计算融合，不声称只扫描PCM一次。结果仍含算法产生的真实采样边界、方法参数和局部coverage，不是所有声音的语义识别。

旧prepared实验包冻结旧工具，不能直接作为新版本批次；未重建/执行。3187体验站仍旧安装副本，未更新/重启。未改写已冻结的历史契约，用户本轮明确批准的接口增量在本报告及使用说明维护。
