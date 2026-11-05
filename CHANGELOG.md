# Changelog

## Unreleased
- 实现问题无关音频证据插件：原采样率多声道信号/图像、授权读取、范围解码、组件缓存与可选本地/API ASR及事件候选。
- 补充ASR时间戳容错、显式无新依赖DSP及能量/稀疏音高/信号测量摘要。
- 增加summary/full呈现，保留canonical完整数据；评测音频persona默认无shell，不设请求次数上限。
- 固定60题开发评测、bash轨迹审计及禁bash单变量对照见[评测结果](./docs/evaluation/results.md)；非全量榜单或最终验收。
- 按用途物理重组docs/evaluation并迁移CLI、配置和共享实现，旧路径及历史重放边界见[迁移说明](./docs/guides/directory-layout.md)。
- 整理文档和评测导航，保留历史协议/实测记录并区分已废弃入口；工程/效果残余见[验收状态](./docs/project/engineering-acceptance-status.md)。
