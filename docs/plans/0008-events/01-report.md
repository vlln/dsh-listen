---
title: 固定词表事件证据与运行时体积核验
description: 正式事件结果4项TDD通过，候选运行时体积不适合默认依赖，模型尚未运行。
type: report
status: draft
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

# 当前判断
优先核实可选独立推理组件或已有本地服务；不为追求默认完整能力破坏用户轻安装约束。用户若批准可选运行时/模型需给明细和许可证；没有真实模型前events仍unavailable。MMAU及主Agent效果必须后测，Goal保持active。
