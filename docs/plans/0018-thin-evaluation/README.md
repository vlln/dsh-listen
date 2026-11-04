# 精简评测适配器

用户批准回归DSH+preset作为执行核心。分支refactor/0018-thin-evaluation；只重构/离线验证，不运行新模型、不变旧产物或3187。

## 删减

- run-batch删除手写YAML解析、工具装配检查、仅10/60题规则、题数×4预算公式及authorized_cases权威字段；任意非空固定题单和独立正整数请求上限。
- DSH统一加载preset、通用预算patch和可信model/listen overlay；适配器只传run计数路径/上限，不重复解析宿主配置。
- 原runSession抽到run-session模块，进程截止/日志不充当Agent循环；run-batch剩59行批量编排，兼容旧import转导出。
- create-run只引用既有共享题单、已安装DSH_HOME与配置，创建轻量run目录/预算。历史prepare脚本留作首次数据抽样导入，不再每批复制资产/安装profile。
- request-budget去240实现硬编码，显式正安全整数上限由人类批准的run配置决定；默认40保留兼容，非自动扩大任何真实批次预算。

## 验证

- batch-runner17/17合成回归：任意3/7题、独立请求上限、顺序启动、预算停止、输入hash、日志与截止。未调用真实模型。
- create-run/预算8/8通过：引用home不安装、不复制媒体、独立run目录、40/240及321等显式上限正确，非法数字拒绝。
- 实际安装版DSH+preset+通用预算patch本地确定性transport2/2：模型可见bash/listen/read_image、4次listen成功，5次模型请求计入传入的预算文件；无外部供应商请求。

只保留必要截止、计费保护、输入完整性和结果留档。未新增队列/自动重试/工具策略或另一套隔离框架。旧批次不改写，正式效果验收状态不变。使用说明见[薄适配器](../../../evaluation/thin-adapter.md)。
