---
title: 正式信号核心首单元报告
description: 电平/能量/声道源码TDD8项通过，源码coverage100/97.30，feature尚未结束。
type: report
status: draft
created: 2026-11-04T01:45:00Z
---

# 实现与证据
先写test/unit/signal.test.mjs，运行因src/signal.mjs不存在失败（红）；随后独立正式实现src/signal.mjs，不import/.work或spike。

命令：
```sh
node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./scripts/coverage.mjs --test-reporter-destination=stdout test/unit/signal.test.mjs
npm run check
```
8/8 PASS，signal.mjs line100%、branch97.30%、func100%，正式coverage reporter核对src目标清单并通过。静态check源码1文件、依赖673215字节、包4279字节，均在门槛内；不等于全产品体积或系统验收。

已实现PCM/采样率/范围有限输入校验、RMS/峰值/DC/near-full-scale、0值null-dB、25ms/10ms真实尾帧与100ms功率桶、低能量等值容差、逐声道/联合统计、Pearson反相风险和静音声道缺失语义、源offset/单位/限制。

# 未完成
同feature尚需频谱/mel数据和正式制图/worker等按计划推进、独立review。没有解码/权限/ASR/events/插件，未跑完整系统或MMAU。Goal保持active，不提前合并或标Plan done。
