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

# 本轮补齐
实际npm pack dry-run包2183字节（仅骨架，不是最终插件体积），已挂gate。npm12返回keyed object而非旧版array，初次解析失败后添加双形态身份校验和回归。
覆盖reporter通过真实Node子进程正/负fixture验证；nested NODE_TEST_CONTEXT会改变子进程行为，测试隔离该内部变量后正确拒绝缺分支、接受全覆盖。静态负控拒绝无coverage事件、缺目标源码/外部src、低覆盖/坏指标；正式reporter从目标src列清单，不拿测试文件抬分。
独立审查指出上述无事件/源码遗漏与副作用import绕门禁，已修并在npm run gate中10/10 PASS。远程CI仍未运行。

# 尚未通过
fake服务fixture助手、包实际临时安装烟测、基建出口确认及合并未齐；不标ADR accepted、不推进DEVELOP。源码/插件为空，工程验收/效果验收均未完成。
