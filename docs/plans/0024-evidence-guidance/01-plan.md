---
title: 证据输出及评测引导修复
description: 用户批准先单变量禁bash60题，再修persona下载路径及摘要展示
type: plan
status: done
created: 2026-11-05T09:04:00Z
---

## 授权与执行顺序

用户批准五项修复，并确认先冻结2734c86只移除shell组跑固定60题；结束前没有改源/preset。随后用户明确同意未来评测默认禁bash，以切断shell修改HF离线、装库下载的路径；不以命令黑名单或环境变量冒充强隔离。

## 契约

- 音频证据persona代替软件工程身份，先listen、按判别需求选特征/范围、不可安装下载/外部剧本/读其他题/修改离线策略。没有请求数量限制。
- 默认评测无通用shell，保留read_image/listen；宿主现有sandbox不提供网络隔离，不声称整机禁网或敌对读取强隔离。MLX已有显式离线且本地权重检查，继续使用现有缓存，不下载新模型。不删除历史模型缓存。
- 新增`evidence_detail: summary|full`，默认summary，只改变模型可见渲染，不变canonical report/算法/cache身份。summary有界并优先转写/事件/测量，明确省略数量和取回方法；full用多行JSON，长数据仍可能被原生spill，需选feature和缩短范围。无新持久检索工具。
- split及聚合共用summary逻辑。完整执行值保留，ASR全文和完整帧不被重写/round；默认presentation变化明确记文档。每次请求仍鉴权解码，不称full取回零成本。

## 验证与边界

1. 既有无bash60题官方评分、配对结果与工具轨迹无shell核对；不重复调用补分。
2. summary最坏输入字节上限、计数、错误/零/null、无副作用与完整full恢复测试；detail enum及缓存等价性。
3. persona/helper静态契约及真实SDK/工具输出开发集成fixture；无付费推理，feature gate不降低覆盖门槛。
4. 独立审查，代码/文档分别提交，不推送、不合并main、不部署、不下载模型。

禁bash干预成绩不当成新persona/summary修复的效果证明；后者未跑主模型。一般插件host路径授权语义不改，不把评测规则硬编码进通用工具。
