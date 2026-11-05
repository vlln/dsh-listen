---
title: 目录迁移与引用验证报告
description: 物理分层、路径兼容及无模型工程验证
type: report
status: complete
created: 2026-11-05T10:07:00Z
---

## 结果

按[冻结映射](migration.json)实际移动69个跟踪文件：docs分project/guides/design/evaluation/archive，原plans编号层级保留；evaluation分cli/lib/config/datasets/mmau/fixtures/legacy。两个根的直接文件从12/39降为各1个README，不通过给旧路径全留壳假装减少散文件。各层README只索引直接子级。

10份移动文档的frontmatter与迁移前完全一致，未更改冻结状态。26份移动可执行/配置文件中16份字节不变、10份仅路径引用/帮助文本调整。产品src未改、npm依赖不变；执行代码仅因移动调整相对import/re-export/new URL与CLI帮助路径，测试fixture同步。文档链接/命令/根规则按旧owner和新owner分别重新解析，不能只替换字符串而漏掉移动文档中的相对链接。算法、协议、分数与工具面均不变。

## 验证

- feature gate：241项，240通过、0失败、1真实ASR skip；源覆盖门禁通过，30源文件、依赖673215字节。
- 真实headless本地HTTP模拟传输2/2：新config路径、相对headless plugin复制、仅read_image/listen schema、summary/full及多次listen可用。不访问付费模型。
- infra门禁13/13：fixture、负控、覆盖率报告与包依赖检查通过。
- 生产src/evaluation/scripts静态相对引用60处全部可解析；独立只读审查mjs/YAML、测试动态复制路径和cwd约定，没有发现现行迁移断链。
- 全部README完成后检查132份Markdown、448个本地链接，缺失目标/未解析标题锚点/仅本机目标均0；本机忽略证据不计为可分发链接，外部URL/动态路径不冒称验证。
- `git diff --check`通过，源码行为与历史分数未更改。无下载、评测、部署、推送或main合并。

## 历史兼容限制

不修改.work原始证据。审计发现7个历史execute脚本仍调用旧CLI，早期preview与两个旧批次overlay引用旧restrict-headless绝对路径；legacy/run-preview也依赖该历史配置，不能直接在新树重放。处理方式是按历史commit独立worktree精确复现，或在新配置副本按映射重建新run，见[迁移使用说明](../../guides/directory-layout.md)。

没有为每个旧路径留下兼容壳，也没有声称历史脚本在新布局无条件可运行；旧overlay完整plugins覆盖新默认的原限制依旧。未移动模型/数据/结果或读取凭据。
