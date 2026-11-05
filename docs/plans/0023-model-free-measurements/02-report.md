---
title: 无新模型测量实施报告
description: DSP测量摘要的数值边界审查与本地验证证据
type: report
status: complete
created: 2026-11-05T07:55:00Z
---

## 结果

完成[计划](./01-plan.md)。[摘要实现](../../../src/dsp-measurements.mjs)复用现有signal统计和temporal候选，新增energy/diagnostics/pitch摘要，接入显式dsp，缓存/结果版本dsp-v2。默认组件和split工具数量不变，无新依赖、模型下载、外发或部署。ASR派生统计延期。

signal与dsp仍独立worker/cache，同时请求会重复计算统计；这是有意保持组件隔离的权衡，不声称零开销。首候选偏好最短强周期，不保证真实F0；100ms能量bin不是VAD/停顿，方法见[说明](../../guides/dsp-evidence.md)。

## 测试证据

- 完整`npm run gate:feature`带现场DSH_RUNTIME_ROOT和已有event Python/model环境：231项，230通过、0失败、1真实ASR跳过；逐源文件90%行/80%分支门禁通过，新摘要行/分支/函数100%。
- 独立审查发现合法恒定0.001 RMS在bin累积舍入后被误判低能量；修为与signal一致的功率1e-6、相对1e-12容差，并补实际PCM阈值等值/上下两侧回归。
- 修正后仅重跑受影响层：`node --test --experimental-test-coverage test/unit/dsp-measurements.test.mjs test/unit/dsp-integration.test.mjs`，15通过、0失败；新摘要仍100%行/分支/函数，包含最大双通道192kHz/60秒预算、取消/超时及缓存回归。`git diff --check`通过。
- 重跑`npm run check`通过：依赖闭包673215字节，无变化；29源文件，包约39KB。最后仅扩写pitch候选排序的参数说明，未改数值逻辑。
- 子Agent曾误跑未带runtime环境的全门禁，226通过/5跳过但缺少源码覆盖而退出1；已由上述带环境门禁消除，不把那次失败隐去或计为通过。

## 已缓存公开音频复放

脚本与实际输出保留在本机忽略证据路径（相对项目根，不随Git分发）：`.work/dsp-validation/measurements-replay.mjs`、`.work/dsp-validation/measurements-replay.json`。不复制/修改音频，三条均取首10秒，本地FFmpeg解码至真实worker，无ASR调用。以下为阈值修正后的单次观测，不是严格性能基准；不含解码时间，也不代表增量耗时。

| case | 原采样率/通道 | worker毫秒 | 全DSP JSON字节 | 可用音高窗/总窗 |
|---|---|---:|---:|---:|
| a68348a7…（sound） | 32000/1 | 80.17 | 16362 | 0/156 |
| bb691833…（speech） | 48000/6 | 197.20 | 20911 | 20/156 |
| 4ae6c0d3…（music） | 44100/1 | 92.98 | 31983 | 97/156 |

sound无音高候选时正确返回null及原因；speech选择索引2声道，低能量bin占比约1%，不称语音停顿；music约2%，不推断音符/自然度。复放先于最后参数说明扩写，数值算法相同，JSON体积会因说明文字略增。

## 审查与未执行

独立只读审查除阈值问题外提示继承的dBFS floor；已在参数明确-240dBFS报告下限、零为null，原线性值保留。无其他必须修复项。无完整安装/GUI/主Agent效果对照、跨平台或MOS验证；没有MMAU增益结论。不推送、不合并develop/main、不发布。
