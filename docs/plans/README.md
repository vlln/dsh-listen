# 执行容器

本页只索引已存在的容器；项目阶段、授权和验收状态见[文档导航](../README.md)。各容器保留其执行时条件和结果，不把历史预算、工具面或未完成项自动当作当前规则。规范接口见[执行契约](../design/interface/0002-executable-v1.md)，实现增量由对应报告说明。

## 容器索引

状态描述归属于所链接证据，不等同于整个项目验收通过；README内嵌报告的容器不另造Plan/Report或虚构状态。

| 编号 / 容器 | 记录状态 | 一行说明 |
|---|---|---|
| [0001 执行契约收敛](./0001-runtime-contracts/README.md) | complete | 执行契约与基建准备报告 |
| [0002 正式测试基建](./0002-test-infra/README.md) | done / complete | 本地基建自证与出口记录 |
| [0003 正式信号核心](./0003-signal-core/README.md) | done / complete | 信号、频谱、图像与worker |
| [0004 本地解码](./0004-local-decode/README.md) | complete | 进程、快照与格式开发验证 |
| [0005 Pipeline](./0005-pipeline/README.md) | complete | 参数、状态与组件缓存 |
| [0006 DSH工具适配](./0006-dsh-tools/README.md) | complete | 工具面、宿主桥与Cordis |
| [0007 ASR](./0007-asr-api/README.md) | complete | API及可选本地转写 |
| [0008 事件标签](./0008-events/README.md) | complete | 运行时准入与真实分类器 |
| [0009 系统验证](./0009-system/README.md) | draft / 专项记录 | 安装、headless及安全残余 |
| 0010 | 缺号 | 仓库中未发现对应容器，不创建占位证据 |
| [0011 宿主兼容](./0011-host-compatibility/README.md) | complete | 宿主读取、附件ID与评测协议 |
| [0012 批次汇总](./0012-run-summary/README.md) | complete | 离线指标及共享资产 |
| [0013 首批十题](./0013-reference-batch/README.md) | complete | 固定批次条件与官方评分 |
| [0014 范围反馈](./0014-range-feedback/README.md) | 内嵌记录 | 严格范围阶段诊断与模型切换 |
| [0015 结尾截取](./0015-clamp-audio-range/README.md) | 内嵌记录 | 用户修订范围裁剪语义 |
| [0016 Flash六十题](./0016-flash-sixty/README.md) | complete | 固定三域子集及历史预算结果 |
| [0017 原生评测preset](./0017-evaluation-preset/README.md) | complete | 多声道及取消工具调用限额 |
| [0018 薄评测适配器](./0018-thin-evaluation/README.md) | 内嵌记录 | 由DSH+preset承担执行 |
| [0019 固定并发](./0019-evaluation-concurrency/README.md) | 内嵌记录 | 独立home及并发调度 |
| [0020 删除请求限额](./0020-remove-request-limits/README.md) | 内嵌记录 | 请求次数只观测、不作上限 |
| [0021 ASR时间戳容错](./0021-asr-timestamp-tolerance/README.md) | done / complete | 坏段局部降级并保留全文 |
| [0022 DSP证据](./0022-dsp-evidence/README.md) | done / complete | 频谱、音高及节奏候选 |
| [0023 无新模型测量](./0023-model-free-measurements/README.md) | done / complete | 能量、诊断及音高摘要 |
| [0024 证据输出与引导](./0024-evidence-guidance/README.md) | done / complete | 无bash对照及summary/full投影 |
| [0025 项目文档整理](./0025-docs-consolidation/README.md) | 执行记录 | 当前入口、历史语境与引用完整性 |

| [0026 目录结构重组](./0026-directory-layout/README.md) | 执行记录 | 物理迁移与引用/运行验证 |

| [0027 工具输出精简](./0027-tool-presentation/README.md) | done / complete | 删除固定限制声明与短数字呈现 |

本索引不改写历史试验结果、不提升任何权威文档状态。
