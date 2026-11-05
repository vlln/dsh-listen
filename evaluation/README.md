# 评测代码入口

从项目根运行命令；本目录只保存代码/配置，操作与成绩见[评测文档](../docs/evaluation/README.md)。迁移与历史重放见[目录说明](../docs/guides/directory-layout.md)。此入口不授权新增真实模型调用或下载。

| 直接子目录 | 用途 |
|---|---|
| [cli](cli/README.md) | 创建run、批量执行、离线评分与审计 |
| [lib](lib/README.md) | 协议、任务适配、会话执行与指标共享实现 |
| [config](config/README.md) | 模型路由、音频persona与原生preset |
| [datasets](datasets/README.md) | 数据集获取/检查/准备工具 |
| [fixtures](fixtures/README.md) | 无付费模型的本地传输验证 |
| [legacy](legacy/README.md) | 历史preview、准备器与预算兼容，不是默认入口 |

默认无shell，listen统一返回请求范围内证据；新run每题300000ms总截止（历史run按其记录的600000ms重放），不设模型/音频调用次数上限。旧完整plugins overlay仍可覆盖新默认，新run须核对实际装配；无shell不是宿主网络/跨case读取强隔离。历史run与.work不改写、不自动复跑。
