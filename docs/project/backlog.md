# 候选与增量需求

执行与历史记录见[计划索引](../plans/README.md)，未验收项见[工程矩阵](./engineering-acceptance-status.md)。`done`仅指条目范围已交付，不等于整体工程/效果验收或已发布。

| 编号 | 状态 | 范围 | 依据 |
|---|---|---|---|
| BL-0001 | done | 研究音乐/人声/环境声问题无关证据路线 | [愿景](./vision.md)、[ADR索引](../design/adr/README.md) |
| BL-0002 | done | 选择轻量benchmark、核对数据与评分 | MMAU固定开发子集；[评测入口](../../evaluation/README.md) |
| BL-0003 | done | 最小声音证据功能与DSH接入 | [实现执行记录](../plans/README.md)；安全残余另列 |
| BL-0004 | done | 批量评测与分域/工具轨迹分析 | [评测结果](../evaluation/results.md)；不是效果验收PASS |
| BL-0005 | deferred | 多模型/多路线/预处理大规模消融 | 需另行选择与授权，不作开发前置 |
| BL-0006 | done | ASR时间戳容错 | [0021](../plans/0021-asr-timestamp-tolerance/README.md) |
| BL-0007 | done | 零新依赖DSP与测量摘要 | [0022](../plans/0022-dsp-evidence/README.md)、[0023](../plans/0023-model-free-measurements/README.md) |
| BL-0008 | done | 禁bash对照、persona/HF路径/summary引导修复 | [0024](../plans/0024-evidence-guidance/README.md) |
| BL-0009 | cancelled | 有效同模型无音频baseline及受控增益验收 | 用户已取消no-audio对照；效果B因此在本路线内不闭合，[验收基线](./acceptance.md)不变 |
| BL-0010 | done | 极简persona/统一工具返回的主模型效果验证 | [0035收敛记录](../plans/0035-project-closure/README.md)、[0037官方千题](../plans/0037-full-mini-evaluation/README.md)、[评测结果](../evaluation/results.md)；74.60%=官方千题自跑，不代表B通过 |
| BL-0011 | candidate | 强读取/网络隔离、资源/进程/GUI/许可门槛 | [工程矩阵](./engineering-acceptance-status.md) |
| BL-0012 | deferred | ASR派生语速/对齐和模型质量评分 | 不下载新模型；不把现有稀疏F0称自然度/语速 |
| BL-0013 | candidate | 音乐长探索题的探索成本与超时收敛 | `8ee655ce`、`40dd3406`多批次反复用满截止；属行为策略而非工具面，[0035记录](../plans/0035-project-closure/README.md) |

新真实评测、下载、外发、付费和部署不因条目存在自动授权。主模型选择是评测设置，不是插件默认模型；验收门槛不随单次分数调整。
