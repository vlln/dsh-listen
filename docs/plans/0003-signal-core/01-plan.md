---
title: 正式信号数值核心
description: 参数/PCM验证、电平与声道统计，随后频谱/制图和worker。
type: plan
status: done
created: 2026-11-04T01:42:00Z
---

# Constraints
按已批准执行契约和特征数学规格，不依赖spike/.work；不读凭据/私人音频、不调用公网/付费；源模块≤400行，纯核心覆盖line≥90/branch≥80。

# 步骤
1. 写参数和PCM校验/电平/声道合成测试，先红再实现。
2. 加频谱/mel和功率图像数据计算，不引入新依赖。
3. 结果带单位/方法/参数/范围；缺失与数字零不同。
4. 每次改动运行对应单元/契约，feature结束执行MR门禁及独立审查，再合并develop；系统/视觉测试留SYSTEM_TEST。

# Checkpoint
不能把源码空/分母少的coverage当通过；验证纯值不推断身份/情绪/场景；FFmpeg/权限/ASR接口后续独立feature，不把本单元当完整工具。
