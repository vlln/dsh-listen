---
title: 建立正式轻量测试基建
description: 已批准契约下的依赖锁定、质量和安装预算负控及Node测试入口。
type: plan
status: pending
created: 2026-11-04T01:25:00Z
---

# Constraints
只改项目，不推送/发布/生产安装、不付费/外发音频。安装依赖用项目缓存和ignore-scripts；不合并spike代码。用户已批准基建开建，不代表基建自证已通过。

# 步骤
1. 创建最小manifest、锁依赖和MIT，基建Node测试入口。
2. 静态语法、文件行数、禁止prototype/.work引用、固定版本/无install脚本、≤5MiB依赖闭包门禁；负控必须失败。
3. 包≤1MiB门禁、覆盖输出判定及负控，离线fake服务和临时fixture助手。
4. 声明CI并本地等价运行，远程未授权推送则记录未验证；用户确认基建门禁后再进DEVELOP。

# Checkpoint
空src不能当业务测试/覆盖通过；测试文件不能抬高源码覆盖；打包小不能掩盖系统FFmpeg/可选模型总量。
