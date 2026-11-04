---
title: 正式基建首轮结果
description: 两个固定依赖、673215字节闭包、三项负控通过，业务与远程CI尚未验证。
type: report
status: draft
created: 2026-11-04T01:25:00Z
---

# 已完成
从develop创建ci/0001-test-infra；只cherry-pick用户批准文档，不带入spike脚本。Node22内置测试无额外测试框架。
固定fft.js4.0.4/pngjs7.0.0和锁完整性，npm install使用项目缓存/ignore-scripts；安装2包exit0。
`npm run gate`本地通过：依赖闭包文件总量673215字节，小于5MiB；src尚空，source_files=0必须如实报告。

3/3 infra测试PASS且负控覆盖：install脚本/官方SDK重依赖/unpinned版本拒绝，>400行/引用.work原型源码拒绝，包与依赖超预算拒绝。正常fixture通过，坏fixture不能靠不触发路径假绿。
CI yaml声明ubuntu/macos Node22同样入口，未推送、未验证远程，不能声称远程CI已过。

# 尚未通过
覆盖门禁解析与负控、真实npm pack大小检查挂入gate、fake服务fixture助手、基建独立审查和出口门禁未齐；不合并develop、不标ADR accepted、不推进DEVELOP。源码/插件为空，工程验收/效果验收均未完成。
