---
title: 当前音频版本评测记录
description: 冻结配置审计、预检故障与真实批次证据。
type: report
status: complete
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

预检三题全部complete，无timeout/failed，104次listen均completed。sound/speech耗时16501/16395ms，各2轮、1次listen；music耗时377818ms、19轮、102次listen。该成本现象不构成工程阻断，不加限制/策略。可见返回证实本地transcript/events、数值证据及图像报告；实现通过tool image blocks返回图像，但投影不含图像内容，不能仅凭image-ready元数据证明实际视觉传输/感知；未观察到单独read_image调用，不冒称该工具路径已实测。9条事件投影截断，未知组件不算缺失。无keys访问或预检评分。

预检结果与正式结果分开。事件投影会截断大工具结果，不据此断言模型侧证据被截断。共享scratch/cache和无shell不构成宿主网络/跨题强读隔离。

## 正式批次

正式run `2026-11-05T13-02-37-134Z-585dab05`，新prepared-v2冻结配置通过后启动；本机持久任务名 `audio0032-formal`，日志 `formal.log`。调度退出0，完整60份result/events均已落盘；57 complete、3 timeout、0 failed/not_run。先封存 `formal-blind/` 再读取外部keys评分，无补跑。

## 正式结果

| 域 | 正确 / 固定分母 | 完成 / 超时 | 工具调用 | 模型step | session耗时总和 |
|---|---:|---:|---:|---:|---:|
| sound | 17/20 | 19/1 | 122 | 78 | 1480.964s |
| speech | 15/20 | 19/1 | 112 | 74 | 2275.768s |
| music | 17/20 | 19/1 | 272 | 114 | 3898.305s |
| 全部 | **49/60 (81.67%)** | **57/3** | **506** | **266** | **7655.037s** |

已完成子集49/57仅作诊断，不能替代固定分母。单题中位24.998s、均值127.584s、p95 587.646s，最长600.059s；session时长求和不是并发墙钟时间。音乐占53.8%工具调用、50.9%session耗时，单题最多75次工具调用。

单独执行缓存官方Python scorer（SHA256 `85480e1c0dfe8ee1406e9c6e598eff0dca9e0216701f076faf69081c6aab1558`），输出与本地匹配一致：81.67%，三域85/75/85%。原始输出 `official-report.txt`；不修改本地summary的official=false元数据，也不将开发子集分数称官方榜单。

## 工具与可观测性

- 504次listen：493 completed、11 error；read_image两次：1 completed、1 error。语义错误与工具状态分开。
- listen错误：2次错用file_path/path、3次漏source、1次未知waveform特征、5次将signal_image专属显示参数用于未选图像的请求。无需放宽验证即可在轨迹中看到后续有效请求；不按结果临时改工具。
- 另有同一case两次signal_image组件TIMEOUT；外层工具调用completed不等于全部特征ready。该题最终complete。一个read_image尝试读取不存在的附件对象路径。
- 主要特征请求次数（包括无效请求、一次多特征可重叠）：chroma184、spectral_peaks183、signal_image131、transcript90、pitch_frames67、events63、onsets49、band_energy49、energy48、pitch46、levels41、tempo35；另有一次非法waveform。
- 同工具同参数**精确重复0次**，不代表没有重复探索：相邻/重叠区间和不同特征可能反复查证同一语义问题。
- 64条工具结果事件投影截断；77条结果的完整组件观测未知（包括错误/非listen返回）。投影文本UTF-8累计1592606 bytes，仅为日志下界，不是完整模型证据/图像字节或token估计。
- 54/60题有完整可加总token字段：input672203、output348454、cache-read3420160，分列、不互加、不估计货币费用；另外6题因缺step usage未推断为零，因此不是全批完整费用。

八个已完成错题均为不同选项，不是回答格式差异；三个超时均有大量成功工具调用但未交最终答案。人工归因仅是假设，完整逐题锚点见[看答案后审阅](./03-error-review.md)。

## 解释边界与后续

- 首次真实运行已同时改变persona、证据结构、特征选择和计算实现；49/60与历史50/60不能归因单一改动，未做重复seed或显著性证明。
- 工程链路可用，但尚有参数调用错误、图像组件超时/附件路径失败及长尾探索；需要据错题轨迹决定下一项单变量研究，不恢复已取消对照、不自动启动新模型批次。
- 图像传输/感知不能仅凭投影元数据认定；后续若诊断此项，应读取本次完整宿主session/tool artifact或用本地合成传输fixture，不补跑改分。
- 本批关闭的是已授权当前版本基线，不关闭原验收中的受控增益与全量工程/官方数据门槛；no-audio实验仍取消。
