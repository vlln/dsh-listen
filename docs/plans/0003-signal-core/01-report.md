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

# 独立审查修正
发现并修正3项：常量双声道浮点残差可伪造相关→显式常量检测；极端Float64有限幅值可平方溢出→明确限制为解码float32可表示非零幅度范围（不把此范围外当静音）；公开quantile容器/元素增加有限数值验证。回归新增后`npm run gate:feature`10/10 PASS，source line100%、branch97.75%。package4586字节，依赖不变。新增幅度域是技术输入限制，非clip，后续契约须明确传达。

# 正式频谱单元
先红（缺模块）再实现src/spectrum.mjs：未归一rFFT/Hann、不乘单边倍数、三预设、源时间/尾pad、功率权重centroid/rolloff/flatness、Slaney128 mel、共享参考相对dB、时间拥有区线性功率聚合。`npm run gate:feature`19/19 PASS，spectrum line100%、branch93.33%；包6573字节、依赖673215不变。独立审查进行中，不能以覆盖率代替数学评审。

# 未完成
同feature尚需正式制图/worker等按计划推进及review修正。没有解码/权限/ASR/events/插件，未跑完整系统或MMAU。Goal保持active，不提前合并或标Plan done。
