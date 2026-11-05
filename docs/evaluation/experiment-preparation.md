# 音频实验准备与执行边界

本协议不授权真实模型调用。准备与本地合成fixture不启动付费模型；运行前逐批确认。历史实验实现/证据见[0028](../plans/0028-experiment-preparation/README.md)，不作为新配置执行依据。

## 固定条件

| 条件 | 音频 | Agent工具 | 输出 |
|---|---|---|---|
| audio | 有 | listen / read_image | 统一完整请求证据，过滤免责声明并紧凑表示数字 |

共同条件：persona仅`You are an Agent`，deepseek-official/deepseek-flash，固定60题（每域20），并发10，每会话600000ms总截止，无请求次数上限。工具不再提供`evidence_detail`，配置没有`defaultEvidenceDetail`；不再有summary/full两种呈现。请求signal时，统一输出保留energy数组等完整证据，不用摘要替代。

用户已取消no-audio对照及旧三臂矩阵。历史已准备矩阵视为取消，不得执行、改名、重标条件或改写其`.work`产物；必须使用新输出目录重新prepare唯一audio条件。本文及准备命令都不自动授权或启动执行。题目/选项原文、顺序与回答协议不改；新的极简persona和统一输出不能归功于历史50/60。

## 准备

```sh
node evaluation/cli/prepare-experiment.mjs MANIFEST NEW_OUTPUT_DIRECTORY LOCAL_SETTINGS_JSON
```

本机settings包含`workerHomes`（10个互异私有home）、`modelPatchPath`（规范model patch）、`audioConfig`（aggregate及已批准本地extractor路径）。凭据仅由既有DSH服务引用，不读取、复制或写入settings。无新增下载，使用离线本地包安装。

生成唯一audio条件的独立case目录与prepared run；仅复制题面和对应音频，不复制源目录的环境、脚本、答案。保存题面/媒体hash、配置快照、模型patch hash、代码commit、工具白名单及worker清单。冻结preset/helper/overlay/manifest、worker profile及已安装插件文件hash，执行前拒绝改变；不允许运行参数覆盖并发/home。校验用于防止意外漂移，不是防恶意改写run元数据的安全签名，也不是宿主网络/读取强隔离。

各case/session独立；worker pool可复用，缓存/宿主磁盘不是完全独立。原始数据及历史运行不改写。固定60是开发子集，不是未见测试集。

## 盲态与答案后分析分开

```sh
node evaluation/cli/analyze-experiment.mjs blind RUN_DIRECTORY NEW_BLIND_OUTPUT
# 批次结束且盲态报告封存后：
node evaluation/cli/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH
# 仅对另行批准、条件可比的已评分批次：
node evaluation/cli/analyze-experiment.mjs paired SUMMARY_A SUMMARY_B NEW_PAIRED_OUTPUT
```

盲态分析不读取keys或scoring，统计状态/错误、同工具同参数重复调用、请求与实际返回组件、投影截断、耗时和分列token；未知测量为null。重复调用不直接等同无价值；截断投影不证明模型上下文被截断。

评分沿用原始完整选项文本匹配，不清洗回答、不补跑替换失败。官方Python scorer仍单独执行。配对分析读取已评分correct布尔值，不再次解释回答；全题分母及双完成子集分开，后者有选择偏差。三域依据评分后case domain，不进入Agent配置；保留配对分析能力不恢复已取消矩阵。

看答案后的错误语义分类须单独留档（证据缺失/候选误导/推理失误等是人工审查，不由工具状态自动推断）。批次中途不改代码、提示词、题单或评分协议；发现基建错误停止，另建批次，不覆盖原记录。

## 本地门禁

真实安装运行时+loopback SSE合成fixture验证唯一audio条件的实际persona、精确工具白名单、实际schema无detail参数、统一输出保留energy数组及答案sentinel不外泄；独立deadline fixture验证持续进度不能重置总截止。准备测试验证固定60、源题面/音频hash及冻结配置/契约拒绝漂移。没有主模型计费调用。外部模型和数据授权仍单独确认。
