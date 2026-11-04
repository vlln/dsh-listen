---
title: 固定词表事件证据与运行时体积核验
description: 正式事件结果4项TDD通过，候选运行时体积不适合默认依赖，模型尚未运行。
type: report
status: complete
created: 2026-11-04T03:50:00Z
---

# 证据格式
先红再实现eventEvidence，4/4测试PASS：固定词表及hash、窗口source offset、稳定top-k/raw score语义、全零不声称静音/检测成功、非法shape/时间/分数拒绝、显示截断与提取覆盖区分。纯合成矩阵，不是真实分类器。

# 运行时公开元数据（未安装）
2026-11-03实取registry.npmjs.org对应/latest JSON：
- onnxruntime-node1.31.1，registry标MIT，单包unpacked307626018字节，含postinstall脚本和多个依赖。
- onnxruntime-web1.31.1，标MIT，unpacked150622959字节，仍有传递依赖。
- @tensorflow/tfjs4.22.0，标Apache-2.0，unpacked147474474字节且多个TF子依赖。
这些是单包registry元数据，不是平台定向精简制品/实际安装闭包。不能因为WASM/JS名字就称轻量；三个都不放默认5MiB闭包，不自动安装或执行脚本。

# 官方轻量制品独立核实
独立研究者取得[MediaPipe官方模型页](https://ai.google.dev/edge/mediapipe/solutions/audio/audio_classifier)，推荐YAMNet并链接[固定v1 TFLite](https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite)。仅HEAD200，Content-Length4126810字节、ETag d02e1b838813107817b755d09d6b56b3；未下载权重。页面给输入1×15600/float32；TF官方README确认16k mono、521类。完整TF export输出不能直接冒充MediaPipe专用制品实检结果。代码Apache-2.0已读，但具体权重许可、最小arm64运行时、输出tensor/SHA256尚未核实；不据HEAD认定可安装/可分发。

# Feature最终门禁
用户批准≤50MB隔离下载实际23588056字节，真实模型/运行时和重采样已验证，详见03/04报告。最后完整SDK+本地ASR+events gate138/138 PASS，events/local-events line100%、branch93.94%/85.19%，包25180字节，默认闭包仍673215。曾137项过但local-events branch79.17被拦，补真正模型限额拒绝分支而非降阈值后通过。可合并feature，不等于系统/效果验收。

# 当前判断
优先核实可选独立推理组件或已有本地服务；不为追求默认完整能力破坏用户轻安装约束。用户若批准可选运行时/模型需给明细和许可证；没有真实模型前events仍unavailable。MMAU及主Agent效果必须后测，Goal保持active。
