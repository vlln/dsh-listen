---
title: 当前音频版本评测记录
description: 冻结配置审计、预检故障与真实批次证据。
type: report
status: draft
created: 2026-11-05T13:05:00Z
---

# 冻结与环境

- 代码基础 `6db79c8`，计划提交 `882eb51`；tarball SHA256 `4f285f7dee3be6d6beb63eb9b83db2dd875df666fd0d0155502198e0347181e0`。
- 模型 `deepseek-official/deepseek-flash`；persona 恰为 `You are an Agent`；listen/read_image 与既定 compaction，无 shell。
- 固定60题（每域20），并发10，每 session 600000ms，无请求次数限额。
- 十个新私有 home，离线安装本地 tarball 与缓存依赖；已有本地 ASR/events 资产。未改3080/3187，未读取凭据本体或外发原始音频。
- 证据根：项目本机 `.work/evaluation/experiments/0032/`；原始日志/配置/测量不随Git分发。

## 静态独立审计

替代正式run `2026-11-05T13-02-37-134Z-585dab05`：444个冻结文件哈希及契约哈希全部匹配；十份安装共420文件与checkout一致；60个case均只有题面与音频，120内容哈希匹配；十home realpath互异。工具schema必填12项features，无detail/question/旧捆绑参数。审计只读、未读取keys；不是实际出站模型请求抓包，不能冒充live persona/schema捕获。

## 首次预检故障（保留，不评分）

`2026-11-05T13-00-40-784Z-caa90865` 三session均报 `MISSING_CREDENTIAL`，在获得模型响应/工具调用前失败。新home的服务引用缺显式启用项，已补齐credentials/authorization/deepseek-account的 `disabled:false`，不读取或复制凭据。由于冻结home配置改变，原正式run `2026-11-05T13-00-40-703Z-a8286b89` 已废弃，未执行；另建替代正式及预检run，未改写原始结果。

CLI进程退出0仅表示调度器结束，不代表session成功；本次依据result/events判失败。首次盲态报告保存在 `preflight-initial-blind/`。

## 替代预检

`2026-11-05T13-02-37-178Z-670109dd`，按 exposure 域元数据选题单中每域第一题，无keys访问，不按正确性筛选：

| 域 | case |
|---|---|
| sound | a68348a7-68ea-4c79-800c-7c870eb15f0a |
| speech | f430c276-05dc-4ff1-8227-c44cc4ce429e |
| music | 8ee655ce-b0c7-4def-856c-68ec352ea175 |

预检三题全部complete，无timeout/failed，104次listen均completed。sound/speech耗时16501/16395ms，各2轮、1次listen；music耗时377818ms、19轮、102次listen。该成本现象不构成工程阻断，不加限制/策略。可见返回证实本地transcript/events、数值证据及图像报告；图像通过tool image blocks返回，未观察到单独read_image调用，不冒称该工具路径已实测。9条事件投影截断，未知组件不算缺失。无keys访问或预检评分。

预检结果与正式结果分开。事件投影会截断大工具结果，不据此断言模型侧证据被截断。共享scratch/cache和无shell不构成宿主网络/跨题强读隔离。

## 正式批次

正式run `2026-11-05T13-02-37-134Z-585dab05`，新prepared-v2冻结配置通过后启动；本机持久任务名 `audio0032-formal`，日志 `formal.log`。任务调度退出码不能代替session完成状态，结果以完整result/events与离线分析为准。
