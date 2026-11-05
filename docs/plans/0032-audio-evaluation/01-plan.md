---
title: 当前音频工具真实评测
description: 用户授权的三域三题工程预检与固定六十题单条件基线。
type: plan
status: done
created: 2026-11-05T12:56:00Z
---

# 执行范围

用户批准：冻结当前版本，三类各一题预检，通过后完整 60 题；不恢复 no-audio 或 summary/full 条件。依据[评测协议](../../evaluation/experiment-preparation.md)。

## 冻结项

- 产品代码基础 `6db79c8`；记录实际准备提交、tarball SHA256、已安装文件及配置哈希。
- 既定 `mmau-fixed20-per-domain-v1`，原顺序、原题面/音频；仅复制每题 task 与 audio 至新工作区。
- `deepseek-official/deepseek-flash`；persona 仅 `You are an Agent`；listen/read_image 与既定 compaction，无 shell。
- 正式并发 10、每 session 总截止 600000ms，无模型/工具请求次数限制。
- 使用十个新私有 worker home；凭据只引用既有服务，不读取本体。使用已有本地 ASR/events，离线安装，不下载模型，不外发原始音频。
- 本机产物独立保存于 `.work/evaluation/experiments/0032/`；不覆盖历史批次，不更新 3080/3187。

## 步骤与门禁

1. 打包、离线安装十份；冻结唯一 audio 正式条件。正式开始前不再修改安装包或配置。
2. 根据 exposure 域元数据，按题单顺序选每域第一题，独立预检 run；不读取 keys，不按正确性筛选。可用三个 worker 同时预检，正式池仍为十个。
3. 审查预检的 persona/schema/模型装配、工具实际返回、本地提取器和图片链路、完整落盘与无答案输入。未触发的可选路径明确标注，不能冒称实测。工程阻断则停止并留档，修复后新批次。
4. 通过后运行正式六十题；中途不改变代码、参数、题单，不补跑替换失败。
5. 封存盲态轨迹分析，然后使用外部 keys 离线评分。保留完整分母，分域、完成/超时/错误及 token/耗时/调用开销；人工错误归因与自动指标分开。
6. 记录结果和限制：本批为已接触开发子集的当前基线，不把历史成绩差异当因果改进，也不宣称完成官方全量验收。

## 证据

原始 events/result/stderr、冻结 run/experiment、盲态报告及评分均保存本机忽略目录；可分发报告保存配置摘要、运行标识、结果和证据定位。
