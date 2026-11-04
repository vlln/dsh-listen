# 薄批量适配器

职责只有：引用固定题单，启动DSH headless，逐题600000ms截止，落盘结果。工具/persona由原生audio-evaluation preset负责；推理循环、权限、上下文和会话持久化由DSH负责。外部脚本评分，不把答案传给Agent。

## 一次配置，多次引用

准备一个独立、已安装插件的DSH_HOME和原生preset运行overlay（模型/可选本地提取配置）。正常批次复用它，不每批重新安装一套profile或复制模型。每题仍为新DSH会话，历史旧run目录不动。共享home不要被多个批次并发写入；需要并发时显式选择独立home。

固定题单也只准备一次；后续直接引用已有selection manifest。两个历史prepare脚本只用于首次数据导入/抽样留档，不是每次运行前置。新建run只产生轻量manifest引用快照、run元数据、预算和输出，不复制音频/keys/profile。安装包或配置发生修改时明确记录版本，不以home共享掩盖变更。

```sh
# 创建运行目录，不安装、不调模型；显式批准的预算，不与题数绑定
node evaluation/create-run.mjs MANIFEST DSH_HOME OVERLAY MAX_MODEL_REQUESTS
# 执行创建的run；DSH原生加载preset和配置
node evaluation/run-batch.mjs RUN_DIRECTORY
# 外部汇总及官方评分分别运行
node evaluation/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH
```

run-batch不解析YAML，不检查工具名清单，不限制只能10/60题，不假定每题4个请求。任意非空固定题单与独立正整数请求预算均支持。输入hash仅用于确认复用资产未变，非另一套权限系统。

## 文件分工

- run-batch.mjs：顺序批量编排与结果落盘。
- run-session.mjs：单个受管子进程、10分钟截止、日志和DSH事件计数；不实现Agent循环。
- preset.patch.yml/headless-preset.mjs：原生工具和模式装配。
- request-budget.patch.yml/request-budget.mjs：由适配器传入本次budget路径和上限，只计模型请求，不干预工具。
- summarize-run.mjs：MMAU维度及工程指标；官方evaluation.py独立评同一原始回答。

仅保留必要的错误、重复输出拒绝和预算保护。不新增自动重试、任务队列、动态工具策略或安全隔离框架。只读共享输入与外部答案是实验数据组织，不冒称OS沙箱。
