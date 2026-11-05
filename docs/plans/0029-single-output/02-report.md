---
title: 单一输出验证报告
description: 删除呈现模式参数、摘要层及关联实验条件，统一返回证据
type: report
status: complete
created: 2026-11-05T12:00:00Z
---

## 实施

- [工具](../../../src/tools.mjs)删除evidence_detail和默认呈现切换；[请求校验](../../../src/request.mjs)拒绝旧参数；[插件配置](../../../src/index.mjs)删除defaultEvidenceDetail。
- 移除摘要模块及对应摘要测试，不保留summary预算、文本1200字预览、数组二次裁剪、fields_omitted或presentation模式标识。
- 统一返回本次请求的组件报告，包括转写全文及提取器实际生成的逐帧/逐窗口数据。保留提取算法已有采样/候选数量边界及真实截断状态，不将其伪装成无限完整音频理解。
- 保留[呈现模块](../../../src/evidence-presentation.mjs)的固定声明过滤、5位有效数字与科学计数；原计算/缓存精度和图片不变。
- [实验矩阵](../../../evaluation/config/experiment.mjs)仅audio条件；no-audio及summary/full已取消。执行器拒绝旧条件；0028本机prepared矩阵原样保留为历史记录，不重命名、不改写、不执行。后续新准备必须用新目录，不自动生成或调用模型。
- 当前使用说明同步；历史0024/0027/0028报告保留发生时事实，旧摘要模块链接改为历史提交说明。

## 验证

- 最终特性门禁246项：245通过、0失败、1真实ASR跳过，源码覆盖率通过。
- 单条件真实运行时合成传输及deadline2项通过；独立准备器单元2项通过。既有preset/多次调用合成传输2项通过。
- 验证实际模型请求schema无evidence_detail、persona最小、工具仅listen/read_image；返回energy数组、无presentation/fields_omitted/固定限制声明。
- 负控验证旧呈现参数及旧实验条件被拒绝；canonical不变、附件保留、短数字保持。
- 无真实主模型调用、下载、部署或体验站重启。3187安装副本仍是本轮变更前版本，不能声称已生效。
