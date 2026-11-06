# 文档导航

阶段：**DEVELOP**。插件实现与本地工程门禁已在`feat/0036`链闭环（2026-11-06复测，见[0035收敛记录](./plans/0035-project-closure/README.md)），固定60题效果记录为300s截止下三次48/60，官方MMAU-test-mini 1000题全量为74.60%（[0037](./plans/0037-full-mini-evaluation/README.md)）；已打包成可安装 bundle `0.1.0` 并通过真实安装冒烟（[0036](./plans/0036-installable-plugin/README.md)），但未发布到 npm/GitHub、未合并 main；效果B因用户取消no-audio对照而不闭合。历史记录中的“当前”只代表各自记录时点，不替代本页阶段或新增授权。

## 直接子目录

| 目录 | 状态 | 说明 |
|---|---|---|
| [project](./project/README.md) | 项目入口 | 验收边界、工程状态、续接与待办。 |
| [guides](./guides/README.md) | 使用指南 | 方法解释与目录迁移说明。 |
| [design](./design/README.md) | 设计基线 | 契约、接口与决策记录，不因整理自动冻结。 |
| [evaluation](./evaluation/README.md) | 评测文档 | 成绩条件、运行方法与实验协议。 |
| [plans](./plans/README.md) | 执行索引 | 各增量计划与报告。 |
| [archive](./archive/README.md) | 历史记录 | 早期方向、基线与历史授权，不作为新默认。 |

## 授权与证据边界

- 验收与续接先读 [project](./project/README.md)，整理不降低验收标准，不自动推进到 RELEASE，不 promote 设计文档。
- 真实评测须逐批授权；历史已授权题目不构成持续调用额度。评分离线，答案不进入 Agent 工作区。
- 禁止读取凭据/私人录音，禁止擅自下载模型、外发音频或付费/生产安装发布。无 shell 不代表宿主全局禁网或跨 case 强隔离，具体边界去评测文档读取。
- `.work` 是本机忽略证据，不随 Git 分发；结论须保存在可分发报告中，不能只靠本机日志恢复事实。不因目录整理搬动/删除历史证据或已有模型。

插件安装、实现参数与工具呈现见[用户说明](../README.md)；执行脚本导航见[评测入口](../evaluation/README.md)。
