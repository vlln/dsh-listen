---
title: 轻量测试基础设施提案
description: Node内置测试与覆盖、外部依赖隔离、打包及正式门禁计划。
type: adr
status: accepted
created: 2026-11-03T14:30:00Z
---

# 提案

> 冻结状态以frontmatter的accepted为准；正文proposed和初建状态保留为批准/自证过程记录，不是状态回退。项目入口见[文档导航](../../README.md)，实施证据见[基建报告](../../plans/0002-test-infra/01-report.md)，门禁实现见[覆盖检查](../../../scripts/coverage.mjs)；本次仅补导航，不调整预算、测试归属或历史结果。

用户已在集中确认中批准体积预算及按本方案搭建正式基建。当前保持proposed：须基建搭建和自证完成后再通过相应门禁，不把开建批准等同accepted。
基于[执行契约](../interface/0002-executable-v1.md)，初版采用Node内置node:test/assert，无测试框架npm依赖，覆盖使用Node --experimental-test-coverage。正式基建在ci/0001-test-infra分支搭建，不在spike安装一套生产系统。

## 测试层与门禁
| 层 | 唯一执行点 | 内容 |
|---|---|---|
| 单元/开发集成/契约 | DEVELOP每feature MR | DSP解析值、纯参数/分桶、权限/缓存/后端响应，coverage门槛 |
| 全链路/安全/视觉/包安装 | SYSTEM_TEST | CLI/DSH独立新HOME、权限和取消、包install、图像实际送达；不重复单元 |
| 干净制品冒烟 | RELEASE/staging | npm pack/dry-run→临时目录安装→核心命令；生产publish/真实profile/tag另需批准 |
| benchmark/付费验证 | 功能冻结后手动一次 | 官方评分全集分母、工具面A/B、无音频基线、预算；不进CI |

Mock：本地loopback HTTP fake ASR与固定事件矩阵，默认测试禁公网；不能把mock当真实能力验收。无key测试，不从真实环境加载secret。子进程使用真实合成WAV及有限可控fixture，不读取私人音频。

CI：GitHub Actions声明Node22/Linux/macOS合成信号与契约检查；远程触发仅推送后才可证明，本项目不获推送授权则诚实报告未远程验证。Windows未实证不列支持。
质量门禁：node --check、模块边界静态检查、文件≤400行、函数需人工审查复杂度（未来自动化指标不得假称已装），禁止依赖spike/.work、禁止生产读process.env任意key、禁止供应商自动fallback；正式MR gate须故意破坏负控验证失败。
覆盖目标：纯DSP/参数/评分模块lines≥90%、branches≥80%；外部进程/宿主适配单列覆盖，不用排除难测失败路径粉饰总覆盖。具体Node输出解析在基建阶段自证。
安装体积预算提案：自有npm压缩包≤1MiB、默认npm依赖解包闭包≤5MiB（不含已有Node/用户FFmpeg，必须单列FFmpeg下载量），零模型/运行时自动下载、零install脚本。数字为基于registry轻依赖的预算，须人类确认，不是实际测量。

## 执行约束
依赖锁版本/完整性，npm安装禁lifecycle脚本、缓存位于工作区。新DSH_HOME隔离、随机端口仅为验证所需且须遵守不替换用户GUI的约束；boot成功之外必须实际工具调用，先负控。工具面工厂可共用，但真实注入/权限/附件不能用mock ctx替代。

## 验证状态
正式ci分支已搭：Node测试入口、依赖锁、静态/体积门禁、coverage源码清单/真实事件正负控、自清理loopback/WAV fixture、真实pack与隔离目录安装；实证见[基建报告](../../plans/0002-test-infra/01-report.md)。远程CI未推送，DSH独立实例属后续系统验收。用户出口确认前仍proposed；不能把骨架包安装当功能通过。
