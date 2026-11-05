---
title: 项目文档整理报告
description: 当前导航与历史分层、评测入口及内部引用核对
type: report
status: complete
created: 2026-11-05T09:36:00Z
---

## 完成范围

- 根AGENTS/CONTRIBUTING/README/CHANGELOG去除尚无代码/单元测试/无MMAU成绩等失实现状，规则与实现入口分工明确。
- 重建[docs导航](../../README.md)、[续接](../../continuation.md)、[工程矩阵](../../engineering-acceptance-status.md)、[待办](../../backlog.md)。不保存动态Goal/进程状态，不promote设计或宣称发布。
- 新建[成绩摘要](../../evaluation-results.md)：保留45/41/50及禁bash配对，明确同一46题41/39、新persona/summary未评测及历史外援越界，不仅引用忽略目录日志。
- [执行索引](../README.md)按实际目录补0001–0025，0010缺号不虚构；7个已有目录缺README已补，0001早期单元/0009无Plan按实际记，不造证据。
- 设计/ADR/接口/AC及旧实验加历史语境/实现指针，保持frontmatter、冻结语义、原成绩不变。
- [evaluation入口](../../../evaluation/README.md)及相关文档区分当前无shell规范、summary/full、600000ms、无限制请求，与历史preview/预算shim/旧准备器。核对实际CLI，不把create-run规划快照/命名当实现事实。

## 引用与断链检查

本轮不搬/删文件。对跟踪和新增Markdown扫描inline本地目标/标题锚点（跳过代码围栏），最终记录115份文档387个链接：missing=0、未解析标题锚点=0、仅本机目标链接=0，包含本报告与完成状态。

发现13条历史报告链接指向忽略.work，本机存在但干净clone不可达。已改为明确“本机忽略证据路径、不随Git分发”的路径记录，并以可分发报告保存结论；原文件未删。区分可点击分发引用和仅本机出处，而非以当前机器存在冒充可移植。

生产src/evaluation/scripts的静态相对module/new URL引用：56文件60处，目标均存在。首次将test字符串fixture一起扫描得到3个假阳性，读对应infra测试确认是运行时生成example.mjs与故意非法导入负控，不是代码断链；未改测试。

脚本/CLI路径在evaluation文档内逐项对源码存在性和参数核对；不运行真实runner/模型/下载。Markdown扫描不验证外网可达、所有引用定义形式/动态路径及GitHub全部slug边界，不能冒称互联网链接全绿。`git diff --check`通过；未改任何执行源码或YAML，因此不重复跑业务门禁。

## 保留的实现限制

create-run不自动冻结overlay/package/dirty状态或合并model patch；历史prepare脚本仍生成过时runtime/预算参数，新批次不用它们复建默认。旧overlay可覆盖无shell/preset；无shell不是宿主网络/读取强隔离。上述只澄清，不在文档整理中暗改行为。未合并develop/main、推送、部署或删除模型/历史记录。
