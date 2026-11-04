---
title: 可选固定词表事件提取
description: 轻运行时/模型制品核实与规范事件证据，不模拟真实标签能力。
type: plan
status: done
created: 2026-11-04T03:45:00Z
---

# Constraints
feat/0006-events；不安装TensorFlow/Torch进默认包，不自动模型下载，不以音频LLM问答替代事件分类。模型/运行时下载须给来源/许可/大小后明确授权；当前本地只核复用ASR环境是否已有运行时，未搜私人文件。

# 步骤
1. 固定事件输出schema/ranking/window/score语义；纯合成矩阵验证。
2. 核实可分发轻运行时/分类权重或用户已有本地服务；不编造unknown能力。
3. 用户批准后真实模型载入/自有音频测试，配置与Pipeline准入，版本/标签hash入cache身份。
4. 门禁/独立review后合并；未获制品则明确missing，不宣称三域效果已过。
