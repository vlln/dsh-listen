---
title: ASR 时间戳局部降级报告
description: 共享解析器保留全文并按段裁剪/丢弃时间，17 项相关离线测试通过。
type: report
status: complete
created: 2026-11-05T06:09:19Z
---

## 结论与关联 Commit

代码提交：`83969ae`（`fix(asr): retain transcripts with invalid optional timestamps`）。分支 `fix/0021-asr-timestamp-tolerance` 从干净的 `refactor/0020-remove-request-limits` 创建；未合并、推送或部署。

[共享解析器](../../../src/asr.mjs)保留完整 `data.text`，不再因坏的可选段丢弃全文。有限且有序、与 `[0,duration]` 有正重叠的段先裁剪，再加源 `coverage.from`；有效段文本不改写、输出顺序不变，仍为 estimated。非有限、逆序、零时长、完全区间外/仅触边，以及 null/原始值/数组/缺失或非字符串文本的段只丢弃该段。不合成时间、不由段文本拼接全文；无有效段为 unavailable。

新增 `timing_adjustments`，其中 `adjusted_segments` 是保留且裁剪的段数（非端点数），`discarded_segments` 是丢弃的可选段数。二者不重叠，未变化时为零。发生任一种降级才追加 limitation：时间被裁剪或丢弃，全文保留但分段对齐可能不完整。API 与本地 provider 均使用此解析器。

## 验收与离线证据

[回归用例](../../../test/unit/asr.test.mjs)先添加再修复：`node --test test/unit/asr.test.mjs` 修复前退出 1，13 项中 8 通过、5 失败；失败分别钉住原有越界异常/null 崩溃及缺失计数。修复后执行：

- `node --test test/unit/asr.test.mjs test/unit/local-asr.test.mjs`：退出 0，17 通过、0 失败、0 跳过。
- `npm run check`：退出 0，26 source files，依赖 673215 bytes（上限 5242880），包 30955 bytes（上限 1048576）。
- `git diff --check`：退出 0。

审查结论：通过本次限定回归。依据是具体断言短音频多种 overshoot/负起点裁剪、源绝对 offset、16 类坏段与有效段共存、无有效时间全文保留、正常路径原值及 baseline limitations 不变，而非仅断言不抛错。

## 安全边界与未执行项

顶层合法 `text` 仍必需，长度上限 100000；显式 `segments:null` 或其他非数组容器仍拒绝，数组上限 10000，不属于局部坏段降级。回归同时验证边界值可通过、超界仍拒绝。此前没有独立单段文本长度上限；网络响应/本地进程输出字节上限保持不变。JSON/HTTP/跳转/授权/超时/取消原测试仍通过。

未执行完整 feature/coverage 门禁、真实本地模型、外部 ASR、PTY、真实 benchmark 或部署，不以这些离线结果声称整体系统或识别效果已验收。测试只使用合成数据和 loopback；运行出现已有 Node EnvHttpProxyAgent experimental warning，不影响退出码。

裁剪只保证段在覆盖范围内，不证明转录/时间准确；严重 overshoot 也按用户要求保留其正重叠部分并告警。保持 provider identity 不变，已有成功缓存不会自动重解析，历史 benchmark 结果不改写。
