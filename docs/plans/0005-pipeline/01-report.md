---
title: Pipeline参数与缓存开发记录
description: 正式请求规格与有界LRU首轮通过，编排尚未接通。
type: report
status: draft
created: 2026-11-04T02:35:00Z
---

# 首单元
先红（模块不存在）再实现normalizeRequest/EvidenceCache/evidenceKey。聚合/拆分共享参数；source二选一、时间/60秒、feature枚举/不重复、显示不适用和未知question/provider/授权字段均拒绝。
缓存key包括owner/hash/range/component/version/排序参数；LRU按entry+JSON字节双限、读写不泄漏调用者修改、超大证据不入缓存。
`npm run gate:feature`76/76 PASS；request/cache line100%、branch98.25%/96.97%，包15309字节、依赖不变。新增测试9项，其余为此前feature回归。独立review发现显式null被??静默变默认，可能扩大features/范围，已拒绝非nullable参数null并加回归；最终gate77/77 PASS，request branch98.53%，包15357字节。缓存仅接收内部规范JSON参数，owner隔离与快照语义未发现确定问题。

# 尚未完成
该缓存没有权限检查能力，必须每次由Pipeline在cache lookup前调授权；owner不能来自Agent参数。尚未接decode/worker/后端，只有参数和cache不是可用工具，不宣称ASR/events能力或效果验收。Goal保持active。
