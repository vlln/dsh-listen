# 研究导航

当前阶段：DESIGN（草拟；INIT 的形态确认待人类决定）。
当前推进方向：[轻量 benchmark → 最小功能 → 一轮测评](direction.md)。此前多路线实验保留作储备，不是开发前置条件。
当前架构：无question的固定证据提取，输出文本、图像/音频特征、统计，由主Agent推理。具体参数见[特征配方](spec/0002-feature-recipe.md)，候选实现栈见[ADR-0002](adr/0002-extraction-stack.md)。
本轮交付：逐特征技术设计；无实现/安装/实验执行、无性能结论、无设计冻结。[审查与开工前待核](feature-design-review.md)列出尚不能省略的核验。

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
- 已授权：建项目、路线分析、实验设计。
- 未授权：实验下载与执行、付费调用、录音外发、模型权重下载、插件开发/安装/发布。
- 技术方案须有真实音频验证才能形成已验证结论；未跑即写“未执行”。
- 人类批量确认前，不把 draft/proposed 升为 active/accepted。
