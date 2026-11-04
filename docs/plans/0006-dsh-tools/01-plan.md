---
title: DSH工具适配与隔离集成
description: 共用工具面、规范输出/图像引用、调用者和宿主授权适配。
type: plan
status: pending
created: 2026-11-04T02:45:00Z
---

# 范围
feat/0004-dsh-tools。从已验证Pipeline构造聚合/拆分面；使用宿主SDK不声明官方依赖闭包；不生产安装。
先测试工具工厂的参数/JSON渲染/图像引用/缺调用者拒绝，再接真实宿主fs/workingDirectory/附件授权；只能用本项目合成音频与独立DSH_HOME。mock或defineTool单元不替代严格注入/装载验收。
