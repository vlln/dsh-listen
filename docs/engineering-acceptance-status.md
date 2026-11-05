# 工程与效果验收状态

以[用户验收基线](acceptance.md)为准，**不整体PASS**。后续真实评测已按批获授权执行，不能继续沿用早期“只跑过3题/全面暂停”的状态，也不能把固定子集成绩当全部门槛完成。

| 项 | 状态 | 依据/残余 |
|---|---|---|
| 数值/参数/图像/解码/Pipeline | 已有实证 | 分支级本地门禁；多格式、多声道、范围/取消、缓存等，见[0022](plans/0022-dsp-evidence/02-report.md)及[0024](plans/0024-evidence-guidance/02-report.md) |
| 可选ASR/events | 已有实证 | 用户已有MLX/YAMNet本地验证；[ASR容错](plans/0021-asr-timestamp-tolerance/01-report-asr.md)，不是新模型强制下载 |
| 包与默认依赖 | 已有实证 | [0024报告](plans/0024-evidence-guidance/02-report.md)记录体积；可选模型/运行时不算入npm闭包 |
| 安装/工具生命周期/附件归属 | 已有实证 | [系统报告](plans/0009-system/01-report.md)、[安装报告](plans/0009-system/03-bundle-install.md)、[host兼容](plans/0011-host-compatibility/02-report.md)；不冒称全安全门槛 |
| 新persona/summary/full | 已有实证 | [0024](plans/0024-evidence-guidance/02-report.md)本地真实headless模拟传输，仅listen/read_image；canonical完整、呈现缓存独立 |
| 稳定授权读取/跨case与网络强隔离 | 未通过 | 宿主fs授权替代旧cwd边界，不等于TOCTOU/读取/网络强隔离；无shell关闭已观察下载路径，旧overlay仍可恢复shell |
| 任意后代进程回收 | 未通过 | 评测runner有进程组清理测试，不代表所有插件/extractor敌对daemon后代均已证明；不以局部门禁替代原要求 |
| GUI手动安装/图标/配置验收 | 未完成 | 历史CLI隔离安装/fixture不替代人工GUI验收 |
| 跨平台/完整RSS/许可证专项 | 未完成 | macOS本地证据，Linux/Windows未完整测；V8限制不是总RSS，供应链/模型许可须单列 |
| 固定60题开发评测 | 已执行 | [成绩及配对解释](evaluation-results.md)，包括有bash越界与禁bash对照限制 |
| 原效果B验收 | 未通过 | 仍缺有效同模型无音频baseline和受控增益证明；固定子集不是官方全榜 |
| 新persona/summary主模型效果 | 未执行 | 50/60是修复前2734c86禁bash对照，不是修复版本成绩 |

## 判定纪律

本页聚合结论，数值/命令/审查证据留在各报告，不以更新导航降低验收基线。门禁通过只证明其覆盖层；未推送远程CI、不宣称CI全绿。生产部署、发布、main合并及tag仍须人类明确批准。
