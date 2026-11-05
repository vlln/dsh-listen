---
title: 可复用批次结果汇总
description: 输入固定清单和逐题结果，离线生成MMAU维度正确率、工程指标和官方评分输入。
type: plan
status: done
created: 2026-11-04T10:00:00Z
---

## 范围

共享MMAU输入引用已有下载和标注，不重新下载、不在run中复制cases。布局见[批次约定](../../evaluation/batch-layout.md)。本执行单元只实现离线汇总，不生成十题数据、不启动模型、不重启手动实例；600000ms截止属于后续runner执行门禁，不因文档存在声称已实现。

## 实现与验证

1. 明确manifest/result数据字段，答案仅外部评分器读取。
2. 脚本统计总体micro accuracy、sound/speech/music、easy/medium/hard和sub-category正确率，失败/缺失/超时留分母；保留原始model_output，不映射编号或清洗解释。
3. 汇总完成率、状态、逐题正确性、时延、模型请求、工具错误和token，缺测区别于0；缓存token独立列出，不推导费用。
4. 输出summary JSON、可读报告及官方scorer输入；本地匹配明确非官方CLI运行结果，不把其一致性当正式榜单成绩。
5. 合成数据覆盖缺失/异常/重复ID/未知结果、晚到超时回答、缺测和命令行文件边界；不读取真实封存答案，不运行真实评测。
