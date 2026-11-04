# 薄批量适配器

职责只有：引用固定题单，启动DSH headless，逐题600000ms截止，落盘结果。工具/persona由原生audio-evaluation preset负责；推理循环、权限、上下文和会话持久化由DSH负责。外部脚本评分，不把答案传给Agent。

## 一次配置，多次引用

准备一个独立、已安装插件的DSH_HOME和原生preset运行overlay（模型/可选本地提取配置）。正常批次复用它，不每批重新安装一套profile或复制模型。每题仍为新DSH会话，历史旧run目录不动。共享home不要被多个进程并发写入；并发时显式传入每个worker各自已安装的独立home，适配器不自动安装或复制profile。

固定题单也只准备一次；后续直接引用已有selection manifest。两个历史prepare脚本只用于首次数据导入/抽样留档，不是每次运行前置。新建run只产生轻量manifest引用快照、run元数据、预算和输出，不复制音频/keys/profile。安装包或配置发生修改时明确记录版本，不以home共享掩盖变更。

```sh
# 创建运行目录，不安装、不调模型；显式批准的预算，不与题数绑定
node evaluation/create-run.mjs MANIFEST DSH_HOME OVERLAY MAX_MODEL_REQUESTS
# 执行创建的run；DSH原生加载preset和配置
node evaluation/run-batch.mjs RUN_DIRECTORY
# 两路并发：显式给出两个预先配置好的独立home；也可在create-run传相同参数保存
node evaluation/run-batch.mjs RUN_DIRECTORY --concurrency 2 \
  --worker-home /path/to/worker-1 --worker-home /path/to/worker-2
# 外部汇总及官方评分分别运行
node evaluation/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH
```

run-batch不解析YAML，不检查工具名清单，不限制只能10/60题，不假定每题4个请求。任意非空固定题单与独立正整数请求预算均支持。输入hash仅用于确认复用资产未变，非另一套权限系统。

## 文件分工

- run-batch.mjs：固定并发批量编排与结果落盘，默认1路。
- run-session.mjs：单个受管子进程、10分钟截止、日志和DSH事件计数；不实现Agent循环。
- preset.patch.yml/headless-preset.mjs：原生工具和模式装配。
- request-budget.patch.yml/request-budget.mjs：由适配器传入本次budget路径和上限，只计模型请求，不干预工具。
- summarize-run.mjs：MMAU维度及工程指标；官方evaluation.py独立评同一原始回答。

并发数为正安全整数，参数优先于run配置；实际并发数和worker home落盘。每个worker顺序处理题目，结果仍按id独立保存，评分按原题单顺序；600000ms从该题启动算起。所有worker共享一个显式总请求预算（不是每worker一份），模型请求前锁内预留、原子更新；另存每题计数，不以全局前后差归因。锁竞争最多等待5秒，超时失败，不擅自删除锁。全局/每题两个文件不构成崩溃原子事务，异常时可能保守消耗预算，不能超发。总预算或致命错误触发后不派新题，已执行题继续受各自截止和请求预算约束；没有自动重试。不同home不能保证本地模型无资源争抢，真实吞吐/限流需另行授权实测。

仅保留必要的错误、重复输出拒绝和预算保护。不新增自动重试、持久任务队列、动态工具策略或安全隔离框架。只读共享输入与外部答案是实验数据组织，不冒称OS沙箱。
