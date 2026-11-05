# 贡献与实验规范

## 工作边界
用户已授权按Goal实施验证，以[验收基线](docs/acceptance.md)为准。正式基建与产品代码在独立分支；spike不合并，不把原型通过当产品验收。

## 分支与提交
- main：初始化锚点及未来正式发布；develop：文档/实现集成。
- docs/*：文档工作；spike/*：经授权的技术验证，保留不合并；未来 feat/test/ci 从 develop 创建。
- 文档和代码分别提交；阶段推进用 docs(state):，计划用 docs(plan):。
- 不推送、不发版、不打 tag，不覆盖用户改动。

## 文档
- 先读后改，目标与约束只保留一个权威位置；引用用相对链接。
- Vision/Spec/AC/ADR/Interface/Plan/Report 使用 devloop frontmatter；设计未审用 draft。
- 结论分为官方声明、假设、实测；官方文档支持不等于代理端点可用。
- 设计因果链按 vision → Spec → AC/ADR → 验证 → Interface 审查，未验证不冻结。

## 实验
- 执行前冻结语料、问题、正确答案、评分规则和预算；实验之后不得按结果修改测试集。
- 音频携带 hash、来源、许可、时长、采样率、声道、参考标签；原始资源不可改写。
- 保留失败/拒答/超时，分开计算理解质量与链路成功率；不只报告成功样例。
- 不用同一个模型作为唯一裁判；人工盲评争议项，标注参考答案也可能不确定。
- 权重/依赖/音频下载、外发、付费都必须另获授权；secret 不能进入请求日志、git、报告。

## 测试与评估基础设施
- Node22内置node:test/assert；`npm run gate`运行静态/依赖检查及test/infra负控，不替代业务验证。
- `npm run gate:feature`运行check与单元/开发集成覆盖门禁；`npm run test:unit`为定向入口。真实DSH/可选本地extractor验证需已有运行时路径，配置及实际命令见[0024验证报告](docs/plans/0024-evidence-guidance/02-report.md)；未配置造成skip不能冒称实跑。
- `npm ci --ignore-scripts --no-audit --no-fund`复现依赖，不运行install脚本。
- CI声明Linux/macOS Node22；没有推送/远程运行证据前不称CI已绿。
- 各层测试不重复计数；正式全链路/安装/DSH隔离验证在SYSTEM_TEST，付费benchmark不进CI。
