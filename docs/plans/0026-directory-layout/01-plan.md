---
title: 文档与评测目录结构重组
description: 按职责物理移动并修复所有现行引用不改变算法协议
type: plan
status: done
created: 2026-11-05T10:01:00Z
---

## 授权与边界

用户指出上轮仅导航校正没有减少散文件，明确批准实际重组。分支refactor/0026-directory-layout基于d1a372b，因包含未合并增量保留依赖链，不隐式合并develop/main。

仅移动和必要路径引用修正；不改题面/协议/分数/工具面，不安装下载/真实评测/部署。不动历史.work/凭据/模型。提交按代码与文档分开。

## 步骤

1. 盘点相对/根命令/插件路径，执行前冻结[映射](migration.json)，按绝对目标校验无覆盖后move。
2. docs按project/guides/design/evaluation/archive/plans组织；evaluation按cli/lib/config/datasets/fixtures/legacy组织。各根只留入口README，不给所有旧文件做转发壳。
3. 重写Markdown链接、代码import/re-export/new URL、YAML相对路径、测试fixture复制/字符串、命令帮助文本与文档。历史run原文不修改，新增[兼容说明](../../guides/directory-layout.md)。
4. 完整feature gate/infra门禁、真实headless本地transport验证迁移后功能，静态链接/引用扫描，独立只读审计动态路径和历史兼容残余。
5. 报告目录减少与验证范围，保留无模型/未验收边界，不凭“移动成功”宣称无断链。
