---
title: 安装系统验证首轮记录
description: 实际制品npm及官方CLI隔离安装、schema解析成功，尚未boot/工具实际调用。
type: report
status: draft
created: 2026-11-04T04:16:00Z
---

# 证据
在develop对完整当前制品执行npm pack，隔离npm prefix install --ignore-scripts成功3包；实际包entry可通过已安装SDK解析导入，两个可选Python runner/icon/locale均存在。
独立DSH_HOME位于项目.work，用官方dsh headless --dump-config初始化，再官方dsh plugin --profile headless add tarball --ignore-scripts成功3包。CLI警告plain dependency/no bundle，已作为纯Cordis路线在隔离patch插入一行及显式scratch/localExecution，不改用户真实profile。
`dsh --profile headless --dump-config-schema` exit0，输出确含dsh-listen、scratch、eventsEnabled及config条目。这证明真实profile解析/SDK依赖解析，不是实际boot或工具执行成功。

# 约束与欠账
无模型请求/付费/外发；没有启动替代GUI或生产部署。当前SYSTEM_TEST准备阶段，真实boot负控/工具调用/真实附件持久化/图像送达、权限/sandbox、手动用户测试以及MMAU效果仍待。纯Cordis包安装后需显式启用的体验应在README如实说明或后续改bundle后再验证，不把依赖安装当已启用。
