---
title: DSP证据实施与验证
description: 数值、worker、真实公开音频复放、覆盖门禁和限制
type: report
status: complete
created: 2026-11-05T06:39:00Z
---

## 结论

[计划](01-plan.md)范围已实现，零新增运行时依赖。listen显式dsp、split audio_dsp和dsp_band_hz已接入；默认行为不变。详见[DSP证据](../../dsp-evidence.md)。仅完成开发离线验证，不是全平台/部署/效果验收。

## 验证证据

- `npm run gate:feature`：实际安装版DSH runtime loader及已有本地event环境，222项，221通过、0失败、1个真实ASR跳过；source逐文件90%行/80%分支门禁通过。28源码文件，依赖673215字节未变，包37264字节。
- 合成单元：8..192kHz正弦峰值、80/20双音频带比例、A440音级、静音/DC、相消声道、部分窗/抽样覆盖；音高60边界、小AC+大DC、恒幅音不同频率相位、click120含半/倍速候选均验证。
- worker集成：DSP真实worker、默认signal worker、超Nyquist明确INVALID_BAND、授权后缓存、band独立key、主动取消和1ms组件截止、192kHz双声道60秒最大标量预算，数字输出<150KB。worker entry导出同一同步执行函数供数值/错误分支覆盖，实际worker契约仍单独验证。
- 独立参考：已有Python NumPy/SciPy periodogram的Hann双音频带比例为0.8，与实现及解析预期一致；librosa未安装，未新增下载，未进行全面librosa算法等价对照。
- 本地公开音频：既有sound单声道32k、speech六声道48k、music单声道44.1k各前10秒，decode→真实DSP worker均ready；worker耗时约72/153/81ms，JSON约13/16/29KB。证据保存在忽略目录.work/dsp-validation/replay.json，不使用答案、不调用主模型。
- 独立审查发现恒幅220Hz载波假起音/伪节拍、60Hz边界、DC归一化及选通道偏置、半/倍速假设分数混淆、band错误丢失；全部补修和回归。tempo实测kind=autocorrelation_peak，推测kind=metrical_alternative且score=null，不伪造相关性。
- 首轮门禁失败已分类：旧split工具数量断言、缺DSH runtime覆盖配置、event环境变量误写；修正后门禁通过，不降低覆盖阈值。

## 剩余限制

音高仅最高去DC能量通道单声部候选，频谱/chroma为抽样汇总，不是时间分辨音符/和弦识别；固定A440，无调音估计。起音为保守能量起音而非谱通量，软起音/复杂音乐可漏检，节拍并非拍号或beat grid；倍频歧义仍在。主线程PCM验证/worker副本复制阶段不是协作式可中断，沿用既有边界。未下载模型、未处理PTY、未部署、未运行新真实MMAU；不能据此声称75%成绩提高。
