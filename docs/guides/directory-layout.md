# 目录布局与路径迁移

本次是物理目录重组，不改变算法、题面、评分、预算或产品工具面。完整旧→新规则保存在[迁移映射](../plans/0026-directory-layout/migration.json)，执行与验证见[迁移报告](../plans/0026-directory-layout/README.md)。

## 如何找文件

- [docs入口](../README.md)：project（目标/验收/状态）、guides（使用与方法）、design（Spec/AC/ADR/接口）、evaluation（协议/成绩）、plans（编号执行记录）、archive（历史阶段材料）。
- [evaluation入口](../../evaluation/README.md)：cli（日常命令）、lib（共享实现）、config（模型/preset）、datasets（数据来源/准备）、fixtures（本地传输）、legacy（历史准备/preview/预算兼容）。
- 项目根仍是命令cwd；移动脚本不改变`.work`数据/运行目录。不要在cli目录内直接运行脚本后误将相对数据路径变成该子目录。

## 常用命令路径

```sh
node evaluation/cli/create-run.mjs MANIFEST DSH_HOME OVERLAY
node evaluation/cli/run-batch.mjs RUN_DIRECTORY
node evaluation/cli/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH
node evaluation/cli/audit-run-tools.mjs RUN_DIRECTORY
```

参数和授权见[评测操作](../evaluation/thin-adapter.md)。这里只展示入口，不自动启动模型。配置helper改从`evaluation/config/preset.mjs`导入；preset/model patch归config。相对插件入口已随YAML迁移更新。

## 历史运行与兼容边界

历史`.work`原始运行、配置、日志、媒体和模型不改写、不搬删。其execute脚本、绝对module路径、旧插件patch可能指向迁移前位置；旧目录不批量保留转发空壳，防止平铺重新生长或误把legacy当新默认。

- **精确重现历史版本**：按该run记录的commit在独立worktree检出，使用当时入口；保留旧工作目录/资产位置与版本依赖条件。不要在历史results目录重跑覆盖。
- **用当前代码做新批次**：只复用经hash校验的题单/媒体，使用新CLI与新config helper构造独立overlay/run，人工确认实际模型/工具面，不直接执行历史execute脚本。
- **需要搬迁旧overlay时**：创建新配置副本，按映射调整模块路径并核对工具面/模型，记录来源；不要就地改旧run。路径迁移不代表旧完整plugins自动获得新persona/无shell政策。
- 已知早期preview与两个旧固定批次的patch曾引用旧restrict-headless绝对路径；这类记录只在旧commit可直接解析。legacy命令非默认支持路径，其本机历史依赖不因迁移自动复建。

## 引用维护

移动后同时调整Markdown相对链接、root命令路径、模块import/re-export、`new URL()`、测试fixture复制路径与YAML相对插件入口。历史报告中的命令可更新为等价新位置便于发现，但原始run文件保持当时内容；成绩不重算。

本机忽略证据不是可分发链接，出处明确标注；运行时生成路径、外部网址与历史绝对路径不冒称由静态链接扫描完全保证。新增资料按用途落在现有层级，不再把说明/脚本直接堆在两个根目录。
