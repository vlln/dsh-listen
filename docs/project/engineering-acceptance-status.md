# 工程与效果验收状态

以[用户验收基线](./acceptance.md)为准，**不整体PASS**。后续真实评测已按批获授权执行，不能继续沿用早期“只跑过3题/全面暂停”的状态，也不能把固定子集成绩当全部门槛完成。

| 项 | 状态 | 依据/残余 |
|---|---|---|
| 数值/参数/图像/解码/Pipeline | 已有实证 | 分支级本地门禁；多格式、多声道、范围/取消、缓存等，见[0022](../plans/0022-dsp-evidence/02-report.md)及[0024](../plans/0024-evidence-guidance/02-report.md) |
| 可选ASR/events | 已有实证 | 用户已有MLX/YAMNet本地验证；[ASR容错](../plans/0021-asr-timestamp-tolerance/01-report-asr.md)，不是新模型强制下载 |
| 包与默认依赖 | 已有实证 | [0024报告](../plans/0024-evidence-guidance/02-report.md)记录体积；2026-11-06复测：tarball 46,327字节、依赖闭包673,215字节，均在1MiB/5MiB预算内；`checkBundle`门禁固化bundle/图标/locale/exports契约，见[0036记录](../plans/0036-installable-plugin/README.md) |
| 安装/工具生命周期/附件归属 | 已有实证 | [安装报告](../plans/0009-system/03-bundle-install.md)、[host兼容](../plans/0011-host-compatibility/02-report.md)；2026-11-06新增真实tarball安装冒烟（stock/preset两种装配）+结构负控，见[0036记录](../plans/0036-installable-plugin/README.md)；不冒称全安全门槛 |
| 极简persona/统一证据返回 | 已有实证 | [0029](../plans/0029-single-output/02-report.md)本地真实headless模拟传输，仅listen/read_image；无呈现模式参数 |
| 稳定授权读取/跨case与网络强隔离 | 未通过 | 宿主fs授权替代旧cwd边界，不等于TOCTOU/读取/网络强隔离；无shell关闭已观察下载路径，旧overlay仍可恢复shell |
| 任意后代进程回收 | 未通过 | 评测runner有进程组清理测试，不代表所有插件/extractor敌对daemon后代均已证明；不以局部门禁替代原要求 |
| GUI手动安装/图标/配置验收 | 未完成 | 图标已过运行时元数据机械验证并人工查看渲染图；Plugins页实际展示与GUI安装仍待用户点验，见[0036记录](../plans/0036-installable-plugin/README.md) |
| 跨平台/完整RSS/许可证专项 | 未完成 | macOS本地证据，Linux/Windows未完整测；V8限制不是总RSS，供应链/模型许可须单列 |
| 固定60题开发评测 | 已执行 | [成绩及配对解释](../evaluation/results.md)：含0032(600s,49/60)与三次300s批次(均48/60)；包括有bash越界与禁bash对照限制 |
| 原效果B验收 | 未通过 | 仍缺有效同模型无音频baseline和受控增益证明；用户已取消no-audio对照，路线内无计划实验；固定子集不是官方全榜 |
| 当前统一输出主模型效果 | 已执行 | 极简persona+按需证据版本：0032 49/60(600s)、三次300s批次均48/60；收官记录见[0035](../plans/0035-project-closure/README.md)。历史50/60属修复前2734c86禁bash对照，不并入 |

## 判定纪律

本页聚合结论，数值/命令/审查证据留在各报告，不以更新导航降低验收基线。门禁通过只证明其覆盖层；未推送远程CI、不宣称CI全绿。生产部署、发布、main合并及tag仍须人类明确批准。
