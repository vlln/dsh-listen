# 续接入口

先读[文档导航](../README.md)、[工程状态](./engineering-acceptance-status.md)与[评测结果](../evaluation/results.md)。本页不保存动态Goal状态、后台任务/服务状态；续接时用运行时工具与Git现场核对，不能从历史文档推断。

## 代码与分支

- 已有正式插件：信号/图像、原采样率多声道解码、Pipeline/缓存、DSH适配、可选ASR/events、显式数值DSP及测量摘要。
- 增量证据以[执行索引](../plans/README.md)为入口；0021修ASR时间戳容错，0022–0023加无模型数值证据，0024修persona/默认无shell和summary/full。
- 0024代码`447890e`、文档`8a792df`为整理前锚点；此后增量链为`perf/0031-lossless-evidence`→`spike/0032-audio-evaluation`→`perf/0033-path-image-deadline`→`perf/0034-image-desc-mel-eval`（含0035收敛文档）→`feat/0036-installable-plugin`；用户批准后 fast-forward 合入`develop`，随后 `main` 同步到同一提交并推送。2026-11-06 迁移到`Projects/DshPlugins/dsh-listen`，公开仓库 `github.com/vlln/dsh-listen`（默认分支`main`）；用户安装走 `dsh plugin --profile web add github:vlln/dsh-listen`。运行`git status`/`git log`核实，不直接merge到main，不将spike一并带入。

## 已证实与未证实

- 工程门禁及本地真实headless合成传输见[0024报告](../plans/0024-evidence-guidance/02-report.md)；不是主模型效果复跑。
- 固定60题对照只有去bash是单变量：保留2734c86旧persona/输出时得50/60。极简persona+按需证据版本：0032(600s)49/60、三次300s批次均48/60；官方MMAU-test-mini 1000题全量74.60%（官方scorer，非榜单提交）。
- HF问题修复指默认移除Agent任意shell下载路径，不是解除离线限制；通用宿主无网络/跨case读取强隔离，旧overlay可覆盖新preset。

## 续接策略

1. 文档/代码工作复用现有依赖与测试，不下载新模型；当前任务不自动授权追加评测。
2. 新批次从[评测入口](../../evaluation/README.md)与新helper配置开始，不能复用旧完整plugins覆盖无shell/persona；manifest与媒体hash先验后跑。
3. 效果验收仍缺有效同模型无音频证据baseline和受控增益证明；用户已取消no-audio对照，该门槛在本路线内无计划实验。固定子集开发成绩不替代验收。
4. GUI/跨平台/进程与资源/依赖许可等欠账见[工程矩阵](./engineering-acceptance-status.md)，不因文档整理降低要求。

历史9题预检及暂停记录仍保留在[evaluation历史说明](../archive/evaluation/preview-results.md)中，其授权、预算和模型不是后续批次默认配置。PTY由用户处理；不调整主GUI/部署，不删除历史模型或评测目录。
