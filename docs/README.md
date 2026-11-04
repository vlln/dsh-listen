# 研究导航

当前阶段：DEVELOP（基建本地自证已获用户出口批准；远程CI未推送、完整系统/效果仍待验收）。[第一版基线](v1-baseline.md)不再发散；进展见[正式基建容器](plans/0002-test-infra/README.md)。
当前推进方向：[轻量 benchmark → 最小功能 → 一轮测评](direction.md)。此前多路线实验保留作储备，不是开发前置条件。
当前架构：无question的可调特征Pipeline，输出文本、图像/音频特征、统计，由主Agent多轮推理。数学参考见[特征配方](spec/0002-feature-recipe.md)，当前部署与参数以[ADR-0003](adr/0003-portable-configurable-pipeline.md)为准；ADR-0002不是默认安装方案。
当前交付：正式信号/解码/Pipeline/DSH适配/可选本地及API ASR/本地事件feature已合并develop，当前安装/lifecycle修复分支最后完整门禁144项通过，包28476字节/依赖673215；9任务真实headless开发预检已完成，后续效果扩量由用户暂停。续接见[当前状态](continuation.md)，工程判定见[验收矩阵](engineering-acceptance-status.md)。完整DSH系统、权限/附件、安装和benchmark效果尚未验收；spike代码未合并。[审查与开工前待核](feature-design-review.md)列出尚不能省略的核验。

## 阅读顺序
1. [愿景](vision.md)：目标、用户和非目标。
2. [待办](backlog.md)：范围内候选。
3. [Spec](spec/README.md)：能力草案。
4. [AC](ac/README.md)：验收草案。
5. [ADR](adr/README.md)：当前固定提取技术栈提案与历史路线比较。
6. [实验](experiments/README.md)：对照实验、语料与评估方法。
7. [接口](interface/README.md)：候选接口，不作为实现承诺。
8. [计划](plans/README.md)：后续执行容器与报告。

## 授权与门禁
- 已授权：按Goal推进实现、工程验证及公开benchmark评测准备；以[用户批准验收基线](acceptance.md)为准。
- 需另批：付费调用、音频外发、沙箱外安装；禁止读取凭据/私人录音及生产安装/发布。
- 技术方案须有真实音频验证才能形成已验证结论；未跑即写“未执行”。
- 人类批量确认前，不把 draft/proposed 升为 active/accepted。
