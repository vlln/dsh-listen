# 日常CLI

从项目根执行，不以本目录为cwd。参数、授权与产物规范见[操作指南](../../docs/evaluation/thin-adapter.md)。

| 文件 | 用途 |
|---|---|
| [create-run.mjs](create-run.mjs) | 引用既有manifest/home/overlay创建独立run，不安装或推理 |
| [run-batch.mjs](run-batch.mjs) | 校验输入后按固定worker pool执行，每题600000ms截止 |
| [summarize-run.mjs](summarize-run.mjs) | 仅读结果及外部keys，导出本地汇总与官方评分输入 |
| [audit-run-tools.mjs](audit-run-tools.mjs) | 离线工具错误与投影截断审计 |
| [prepare-experiment.mjs](prepare-experiment.mjs) | 单一音频条件及配置/工作区冻结，不执行模型 |
| [analyze-experiment.mjs](analyze-experiment.mjs) | 盲态轨迹与评分后配对分析，分离输入 |
| [measure-evidence.mjs](measure-evidence.mjs) | 本地合成PCM证据字节分解，不调用模型或估算token |

create-run不自动合并模型patch，也不冻结overlay/包/dirty状态；旧run不覆盖不续跑。官方Python scorer另行调用，不能将本地匹配输出标为官方执行。
