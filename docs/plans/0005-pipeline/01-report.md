---
title: Pipeline参数与缓存开发记录
description: 正式请求规格与有界LRU首轮通过，编排尚未接通。
type: report
status: complete
created: 2026-11-04T02:35:00Z
---

# 首单元
先红（模块不存在）再实现normalizeRequest/EvidenceCache/evidenceKey。聚合/拆分共享参数；source二选一、时间/60秒、feature枚举/不重复、显示不适用和未知question/provider/授权字段均拒绝。
缓存key包括owner/hash/range/component/version/排序参数；LRU按entry+JSON字节双限、读写不泄漏调用者修改、超大证据不入缓存。
`npm run gate:feature`76/76 PASS；request/cache line100%、branch98.25%/96.97%，包15309字节、依赖不变。新增测试9项，其余为此前feature回归。独立review发现显式null被??静默变默认，可能扩大features/范围，已拒绝非nullable参数null并加回归；最终gate77/77 PASS，request branch98.53%，包15357字节。缓存仅接收内部规范JSON参数，owner隔离与快照语义未发现确定问题。

# 正式编排
TDD实现createPipeline：先宿主注入authorize再decode验证source hash，随后按owner/hash/range/组件/有效参数查缓存；signal worker和可选provider共用状态/失败隔离，缺配置unavailable，缓存PNG以base64内部存储但不泄漏到可见evidence。参数改图不影响transcript cache。`npm run gate:feature`83/83 PASS，pipeline line100%、branch92.11%，包16394字节。该组以注入fake验证调用序列，不替代真实端到端/宿主授权；独立review发现provider缺version会在组件catch外终止整个Pipeline，以及不同自定义analyzer共cache时版本串用；已构造时校验provider/version/extract并增加analyzeVersion（用户部署身份，不是Agent参数），gate84/84 PASS，pipeline branch93.33%，包16518字节。不同实现必须配置不同版本，不能仅名字相同当等价。

# 真实组件开发集成
新增pipeline-real3/3 PASS，使用真实FFmpeg/worker/PNG，不依赖fake信号提取：默认partial缺ASR/events、重复相同参数cache命中但authorization/decode仍重查、调transient不命中、源内容改变hash失效、访问拒绝不查旧证据、scratch清空。另加不同analyzeVersion共享cache不串用回归，pipeline mock组8/8 PASS。未把本地authorize回调当DSH权限适配。

# 尚未完成
本feature已按计划接decode/worker/可选provider状态，测试/独立review修正可合并。缓存本身不含权限能力，每次Pipeline必须先调宿主authorize；DSH适配下一feature实现，owner不能来自Agent参数。真实ASR/events和效果仍未验收，Goal保持active。
